import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import {
  buildOrderEmailPayload,
  sendShipmentConfirmationEmail,
} from "@/lib/server/email"

type RouteContext = {
  params: {
    orderId: string
  }
}

type OrderAction = "accept" | "ship"

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

export async function PATCH(request: Request, context: RouteContext) {
  console.log("[orders] PATCH context", context, "url", request.url)
  const orderId = context.params?.orderId
  if (!orderId) {
    return NextResponse.json({ error: "Order id is required." }, { status: 400 })
  }

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

  let payload: { action?: string } | null = null
  try {
    payload = (await request.json()) as { action?: string }
  } catch {
    // ignore body parse errors; handled below
  }

  const action = payload?.action as OrderAction | undefined
  if (!action || !["accept", "ship"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid or missing action. Use 'accept' or 'ship'." },
      { status: 400 },
    )
  }

  const orderRef = adminDb.doc(`orders/${orderId}`)
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

  try {
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
    }
  } catch (error) {
    console.error("[orders] Failed to update order status", { orderId, action, error })
    return NextResponse.json(
      { error: "Unable to update order status. Please try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
