import { NextResponse } from "next/server"
import type { FirebaseFirestore } from "firebase-admin/firestore"

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
      return NextResponse.json(
        { error: "Missing admin authentication. Please sign in again." },
        { status: 401 },
      )
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/admin/orders] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get("limit") ?? "100")
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 200) : 100

    let query: FirebaseFirestore.Query = adminDb.collection("orders").orderBy("createdAt", "desc")
    if (limit > 0) {
      query = query.limit(limit)
    }

    const snapshot = await query.get()
    const orders = snapshot.docs.map((doc) => {
      const data = doc.data() ?? {}
      return {
        id: doc.id,
        status: typeof data.status === "string" ? data.status : "paid",
        orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : null,
        amountTotal: data.amountTotal ?? 0,
        shippingTotal: data.shippingTotal ?? 0,
        taxTotal: data.taxTotal ?? 0,
        currency: data.currency ?? "usd",
        customerName: data.customerName ?? data.shipping?.name ?? "Shopper",
        customerEmail: data.customerEmail ?? null,
        shipping: data.shipping ?? null,
        lineItems: Array.isArray(data.lineItems) ? data.lineItems : [],
        createdAt: toISOString(data.createdAt) ?? toISOString(data.checkoutCompletedAt) ?? null,
        updatedAt: toISOString(data.updatedAt),
        acceptedAt: toISOString(data.acceptedAt),
        shippedAt: toISOString(data.shippedAt),
        canceledAt: toISOString(data.canceledAt),
        notes: data.notes ?? null,
      }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("[/api/admin/orders] error", error)
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 })
  }
}
