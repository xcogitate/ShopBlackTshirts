import { NextResponse } from "next/server"
import Stripe from "stripe"
import { FieldValue } from "firebase-admin/firestore"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { upsertOrderFromSession } from "@/lib/server/order-store"
import {
  buildOrderEmailPayload,
  sendShipmentConfirmationEmail,
} from "@/lib/server/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.")
}
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

export async function POST(request: Request) {
  try {
    const { sessionId } = (await request.json()) as { sessionId?: string }
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price.product"],
    })

    const lineItems = session.line_items?.data as Stripe.LineItem[] | undefined
    const result = await upsertOrderFromSession(session, lineItems)

    if (result.created || result.reason === "exists") {
      return NextResponse.json({
        success: true,
        created: result.created,
        alreadyExists: result.reason === "exists",
      })
    }

    if (result.reason === "not_paid") {
      return NextResponse.json(
        { error: "Checkout session is not marked as paid." },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: "Unable to record order for this session." },
      { status: 400 },
    )
  } catch (error) {
    console.error("[/api/orders] error:", error)

    const message =
      error instanceof Error ? error.message : "Unable to record order. Please try again later."

    if (
      message.includes("Firebase admin credentials are not configured") ||
      message.includes("default credentials") ||
      message.includes("UNAUTHENTICATED")
    ) {
      return NextResponse.json(
        {
          error:
            "Server cannot reach Firestore. Verify your Firebase Admin env vars and restart the dev server.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type OrderAction = "accept" | "ship" | "cancel" | "delete"

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

export async function PATCH(request: Request) {
  try {
    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json(
        { error: "Missing admin authentication. Please sign in again." },
        { status: 401 },
      )
    }

    let adminUser: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
    try {
      adminUser = await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[orders] Failed to verify admin token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | { orderId?: string; action?: OrderAction }
      | null

    if (!body?.orderId) {
      return NextResponse.json({ error: "Order id is required." }, { status: 400 })
    }

    const action = body.action
    if (!action || !["accept", "ship", "cancel", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid or missing action. Use 'accept' or 'ship'." },
        { status: 400 },
      )
    }

    const orderRef = adminDb.doc(`orders/${body.orderId}`)
    const snapshot = await orderRef.get()
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const data = snapshot.data() ?? {}
    const currentStatus = typeof data.status === "string" ? data.status.toLowerCase() : "unknown"
    const timestamp = FieldValue.serverTimestamp()
    const adminContext = {
      uid: adminUser.uid ?? null,
      email: adminUser.email ?? null,
      name: adminUser.name ?? null,
    }

    if (action === "accept") {
      if (currentStatus !== "paid") {
        return NextResponse.json(
          { error: "Order must be in 'paid' status before it can be accepted." },
          { status: 409 },
        )
      }

      await orderRef.update({
        status: "processing",
        acceptedAt: timestamp,
        acceptedBy: adminContext,
        updatedAt: timestamp,
      })
    } else if (action === "ship") {
      if (currentStatus !== "processing") {
        return NextResponse.json(
          { error: "Only orders marked as processing can be shipped." },
          { status: 409 },
        )
      }

      await orderRef.update({
        status: "shipped",
        shippedAt: timestamp,
        shippedBy: adminContext,
        updatedAt: timestamp,
      })

      const shippedSnapshot = await orderRef.get()
      const shippedData = shippedSnapshot.data() ?? {}
      await sendShipmentConfirmationEmail(
        buildOrderEmailPayload(orderRef.id, {
          orderNumber: shippedData.orderNumber,
          customerName: shippedData.customerName,
          customerEmail: shippedData.customerEmail,
          shipping: shippedData.shipping ?? null,
          lineItems: shippedData.lineItems ?? [],
          amountTotal: shippedData.amountTotal ?? 0,
          shippingTotal: shippedData.shippingTotal ?? 0,
          taxTotal: shippedData.taxTotal ?? 0,
          currency: shippedData.currency ?? "usd",
          createdAt:
            typeof shippedData.createdAt === "string"
              ? shippedData.createdAt
              : shippedData.checkoutCompletedAt ?? null,
          shippedAt:
            typeof shippedData.shippedAt === "string"
              ? shippedData.shippedAt
              : typeof shippedData.shippedAt?.toDate === "function"
                ? shippedData.shippedAt.toDate().toISOString()
                : null,
          trackingUrl: shippedData.trackingUrl ?? null,
          trackingNumber: shippedData.trackingNumber ?? null,
        }),
      )
    } else if (action === "cancel") {
      if (currentStatus === "shipped") {
        return NextResponse.json(
          { error: "Shipped orders cannot be canceled." },
          { status: 409 },
        )
      }

      await orderRef.update({
        status: "canceled",
        canceledAt: timestamp,
        canceledBy: adminContext,
        updatedAt: timestamp,
      })
    } else if (action === "delete") {
      await orderRef.delete()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Orders action API error", error)
    return NextResponse.json(
      { error: "Unable to update order. Please try again later." },
      { status: 500 },
    )
  }
}



