import { NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

const toISOString = (value: unknown) => {
  if (!value) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return null
}

export async function GET(request: Request) {
  try {
    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Missing authentication token." }, { status: 401 })
    }

    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/account/orders] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const email = decoded.email ?? null
    const uid = decoded.uid ?? null

    let snapshot = uid
      ? await adminDb.collection("orders").where("customerUid", "==", uid).get()
      : null

    if (!snapshot || snapshot.empty) {
      if (!email) {
        return NextResponse.json({ orders: [] })
      }
      snapshot = await adminDb.collection("orders").where("customerEmail", "==", email).get()
    }

    const orders = snapshot.docs.map((doc) => {
      const data = doc.data() ?? {}
      return {
        id: doc.id,
        status: typeof data.status === "string" ? data.status : "paid",
        orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : null,
        amountTotal: data.amountTotal ?? 0,
        currency: data.currency ?? "usd",
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
        acceptedAt: toISOString(data.acceptedAt),
        shippedAt: toISOString(data.shippedAt),
        canceledAt: toISOString(data.canceledAt),
        shipping: data.shipping ?? null,
        lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
      }
    })
    orders.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })

    const limitedOrders = orders.slice(0, 50)

    return NextResponse.json({ orders: limitedOrders })
  } catch (error) {
    console.error("[/api/account/orders] error", error)
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 })
  }
}
