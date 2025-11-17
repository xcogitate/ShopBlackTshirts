import { NextResponse } from "next/server"
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

async function requireAdmin(request: Request) {
  const token = parseAuthorizationHeader(request.headers.get("authorization"))
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing admin authentication." }), { status: 401 })
  }

  try {
    await adminAuth.verifyIdToken(token)
  } catch (error) {
    console.error("[/api/admin/products] invalid token", error)
    throw new Response(JSON.stringify({ error: "Invalid or expired session." }), { status: 401 })
  }
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

const serializeProduct = (doc: DocumentSnapshot<DocumentData>) => {
  const data = doc.data() ?? {}
  return {
    id: doc.id,
    name: data.name ?? null,
    slug: data.slug ?? null,
    price: typeof data.price === "number" ? data.price : null,
    originalPrice: typeof data.originalPrice === "number" ? data.originalPrice : null,
    image: data.image ?? null,
    images: Array.isArray(data.images) ? data.images : [],
    description: data.description ?? null,
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    available: typeof data.available === "boolean" ? data.available : true,
    categories: Array.isArray(data.categories) ? data.categories : [],
    limited: Boolean(data.limited),
    soldOut: Boolean(data.soldOut),
    published: data.published !== false,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request)
    const payload = (await request.json().catch(() => null)) as Record<string, any> | null
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
    }

    const id =
      typeof payload.id === "string" && payload.id.trim()
        ? payload.id.trim()
        : adminDb.collection("products").doc().id

    const docRef = adminDb.doc(`products/${id}`)
    const now = FieldValue.serverTimestamp()
    await docRef.set(
      {
        ...payload,
        createdAt: payload.createdAt ?? now,
        updatedAt: now,
      },
      { merge: true },
    )

    const snapshot = await docRef.get()
    return NextResponse.json({ ok: true, item: serializeProduct(snapshot) })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/products] POST error", error)
    return NextResponse.json({ error: "Unable to save product." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request)
    const payload = (await request.json().catch(() => null)) as Record<string, any> | null
    if (!payload?.id || typeof payload.id !== "string") {
      return NextResponse.json({ error: "Product id is required." }, { status: 400 })
    }

    const { id, ...updates } = payload
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No fields provided to update." }, { status: 400 })
    }

    const docRef = adminDb.doc(`products/${id}`)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 })
    }

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    const freshSnapshot = await docRef.get()
    return NextResponse.json({ ok: true, item: serializeProduct(freshSnapshot) })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/products] PATCH error", error)
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Product id is required." }, { status: 400 })
    }

    const docRef = adminDb.doc(`products/${id}`)
    await docRef.delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/products] DELETE error", error)
    return NextResponse.json({ error: "Unable to delete product." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const snapshot = await adminDb.collection("products").orderBy("createdAt", "desc").get()
    const products = snapshot.docs.map(serializeProduct)
    return NextResponse.json({ ok: true, items: products })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/products] GET error", error)
    return NextResponse.json({ error: "Unable to load products." }, { status: 500 })
  }
}
