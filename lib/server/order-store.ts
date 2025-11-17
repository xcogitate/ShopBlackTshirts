import Stripe from "stripe"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/lib/server/firebase-admin"
import {
  buildOrderEmailPayload,
  sendOrderConfirmationEmail,
} from "@/lib/server/email"

function generateOrderNumber() {
  const letters = Array.from({ length: 2 })
    .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
    .join("")
  const digits = Math.floor(Math.random() * 1_0000_0000)
    .toString()
    .padStart(8, "0")
  return `${letters}${digits}`
}

function normalizeLineItems(
  lineItems: Stripe.LineItem[],
  sessionCurrency: string,
): Array<{
  id?: string
  description: string
  quantity: number
  amountTotal: number
  amountSubtotal: number
  currency: string
  priceId: string | null
  productId: string | null
}> {
  return lineItems.map((item) => {
    const priceProduct = item.price?.product
    const productName =
      item.description ||
      (typeof priceProduct === "object" && priceProduct && "name" in priceProduct
        ? (priceProduct as Stripe.Product).name
        : item.price?.nickname ?? "Item")

    return {
      id: item.id ?? undefined,
      description: productName,
      quantity: item.quantity ?? 1,
      amountTotal: item.amount_total ?? 0,
      amountSubtotal: item.amount_subtotal ?? item.amount_total ?? 0,
      currency: item.currency ?? sessionCurrency,
      priceId: item.price?.id ?? null,
      productId:
        typeof priceProduct === "object" && priceProduct && "id" in priceProduct
          ? (priceProduct as Stripe.Product).id
          : typeof priceProduct === "string"
            ? priceProduct
            : null,
    }
  })
}

async function resolveUserUidByEmail(email: string | null): Promise<string | null> {
  if (!email) return null
  try {
    const snapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get()
    if (snapshot.empty) {
      return null
    }
    return snapshot.docs[0]?.id ?? null
  } catch (error) {
    console.warn("[order-store] Unable to resolve user by email", { email, error })
    return null
  }
}

export async function upsertOrderFromSession(
  session: Stripe.Checkout.Session,
  lineItemsParam?: Stripe.LineItem[],
) {
  if (!session.id) {
    throw new Error("Checkout session missing id.")
  }

  if (session.payment_status !== "paid") {
    return { created: false, reason: "not_paid" as const }
  }

  const orderRef = adminDb.doc(`orders/${session.id}`)
  const existing = await orderRef.get()
  if (existing.exists) {
    return { created: false, reason: "exists" as const }
  }

  const lineItems =
    lineItemsParam ??
    (((session.line_items?.data ?? []) as unknown as Stripe.LineItem[]) || [])

  const currency = session.currency ?? "usd"
  const billingDetails = session.customer_details ?? null
  const billingAddress = billingDetails?.address ?? null
  const shippingDetails = session.shipping_details ?? null
  const shippingAddress = shippingDetails?.address ?? null

  const customerEmail = session.customer_details?.email ?? null
  const metadataUid =
    typeof session.metadata?.firebaseUid === "string" ? session.metadata.firebaseUid : null
  const resolvedUid = metadataUid ?? (await resolveUserUidByEmail(customerEmail))

  const orderNumber =
    typeof session.metadata?.orderNumber === "string" ? session.metadata.orderNumber : generateOrderNumber()

  const lineItemPayload = normalizeLineItems(lineItems, currency)
  const checkoutCompletedAt = session.created ? new Date(session.created * 1000).toISOString() : null

  await orderRef.set(
    {
      orderNumber,
      sessionId: session.id,
      status: session.payment_status ?? "paid",
      amountTotal: session.amount_total ?? 0,
      shippingTotal: session.total_details?.amount_shipping ?? 0,
      taxTotal: session.total_details?.amount_tax ?? 0,
      currency,
      customerEmail,
      customerUid: resolvedUid ?? null,
      customerName: session.customer_details?.name ?? null,
      billing: billingDetails
        ? {
            name: billingDetails.name ?? null,
            email: billingDetails.email ?? session.customer_details?.email ?? null,
            phone: billingDetails.phone ?? null,
            address: billingAddress
              ? {
                  line1: billingAddress.line1 ?? null,
                  line2: billingAddress.line2 ?? null,
                  city: billingAddress.city ?? null,
                  state: billingAddress.state ?? null,
                  postalCode: billingAddress.postal_code ?? null,
                  country: billingAddress.country ?? null,
                }
              : null,
          }
        : null,
      shipping: shippingDetails
        ? {
            name: shippingDetails.name ?? null,
            phone: shippingDetails.phone ?? null,
            address: shippingAddress
              ? {
                  line1: shippingAddress.line1 ?? null,
                  line2: shippingAddress.line2 ?? null,
                  city: shippingAddress.city ?? null,
                  state: shippingAddress.state ?? null,
                  postalCode: shippingAddress.postal_code ?? null,
                  country: shippingAddress.country ?? null,
                }
              : null,
          }
        : null,
      lineItems: lineItemPayload,
      checkoutCompletedAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      acceptedAt: null,
      shippedAt: null,
      acceptedBy: null,
      shippedBy: null,
    },
    { merge: true },
  )

  if (resolvedUid) {
    const userRef = adminDb.doc(`users/${resolvedUid}`)
    await userRef.set(
      {
        lastOrderAt: FieldValue.serverTimestamp(),
        totalOrders: FieldValue.increment(1),
        lifetimeValue: FieldValue.increment((session.amount_total ?? 0) / 100),
      },
      { merge: true },
    )
  }

  await sendOrderConfirmationEmail(
    buildOrderEmailPayload(orderRef.id, {
      orderNumber,
      customerName: session.customer_details?.name ?? null,
      customerEmail,
      shipping: shippingDetails
        ? {
            name: shippingDetails.name ?? null,
            address: shippingAddress
              ? {
                  line1: shippingAddress.line1 ?? null,
                  line2: shippingAddress.line2 ?? null,
                  city: shippingAddress.city ?? null,
                  state: shippingAddress.state ?? null,
                  postalCode: shippingAddress.postal_code ?? null,
                  country: shippingAddress.country ?? null,
                }
              : null,
          }
        : null,
      lineItems: lineItemPayload,
      amountTotal: session.amount_total ?? 0,
      shippingTotal: session.total_details?.amount_shipping ?? 0,
      taxTotal: session.total_details?.amount_tax ?? 0,
      currency,
      createdAt: checkoutCompletedAt,
    }),
  )

  return { created: true as const }
}
