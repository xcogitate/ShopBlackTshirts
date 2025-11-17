import { NextResponse } from "next/server"
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"

type DecodedToken = Awaited<ReturnType<typeof adminAuth.verifyIdToken>>

type ShippingAddress = {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
} | null

type UserPayload = {
  displayName?: string | null
  marketingOptIn?: boolean
  segment?: string | null
  shippingAddress?: ShippingAddress
  allowCreate?: boolean
}

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

async function requireFirebaseUser(request: Request): Promise<DecodedToken> {
  const token = parseAuthorizationHeader(request.headers.get("authorization"))
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing authentication token." }), {
      status: 401,
    })
  }

  try {
    return await adminAuth.verifyIdToken(token)
  } catch (error) {
    console.error("[/api/users] invalid token", error)
    throw new Response(JSON.stringify({ error: "Invalid or expired session." }), {
      status: 401,
    })
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

const serializeUserDoc = (doc: DocumentSnapshot) => {
  const data = doc.data() ?? {}
  return {
    id: doc.id,
    uid: data.uid ?? doc.id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    marketingOptIn: Boolean(data.marketingOptIn),
    lastLoginAt: toISOString(data.lastLoginAt),
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
    segment: data.segment ?? null,
    totalOrders: data.totalOrders ?? 0,
    lifetimeValue: data.lifetimeValue ?? 0,
    location: data.location ?? null,
    lastOrderAt: toISOString(data.lastOrderAt),
    shippingAddress: data.shippingAddress ?? null,
  }
}

const adminEmailList = (
  process.env.ADMIN_EMAILS ??
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  process.env.ADMIN_CUSTOMERS_EXCLUDE ??
  ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const adminEmailSet = new Set(adminEmailList)

export async function POST(request: Request) {
  try {
    const decoded = await requireFirebaseUser(request)
    const rawPayload = ((await request.json().catch(() => ({}))) ?? {}) as UserPayload
    const { allowCreate = true, shippingAddress, ...payload } = rawPayload

    const now = FieldValue.serverTimestamp()
    const docRef = adminDb.doc(`users/${decoded.uid}`)
    const snapshot = await docRef.get()

    if (!snapshot.exists && !allowCreate) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 })
    }

    const update: DocumentData = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName:
        (typeof payload.displayName === "string" && payload.displayName.trim().length
          ? payload.displayName.trim()
          : null) ?? decoded.name ?? decoded.email ?? null,
      marketingOptIn: payload.marketingOptIn ?? false,
      segment: payload.segment ?? null,
      lastLoginAt: now,
      updatedAt: now,
    }

    const normalizedShipping = normalizeShippingAddress(shippingAddress)
    if ("shippingAddress" in rawPayload) {
      update.shippingAddress = normalizedShipping
    }

    if (!snapshot.exists) {
      update.createdAt = now
      update.totalOrders = 0
      update.lifetimeValue = 0
    }

    await docRef.set(update, { merge: true })
    const freshSnapshot = await docRef.get()

    return NextResponse.json({ success: true, user: serializeUserDoc(freshSnapshot) })
  } catch (response) {
    if (response instanceof Response) return response
    console.error("[/api/users] POST error", response)
    return NextResponse.json({ error: "Unable to save profile." }, { status: 500 })
  }
}

function normalizeShippingAddress(address: ShippingAddress): ShippingAddress {
  if (!address) return null
  const sanitize = (value?: string | null) => {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }

  const normalized = {
    line1: sanitize(address.line1),
    line2: sanitize(address.line2),
    city: sanitize(address.city),
    state: sanitize(address.state),
    postalCode: sanitize(address.postalCode),
    country: sanitize(address.country),
  }

  const hasValue = Object.values(normalized).some((value) => Boolean(value))
  return hasValue ? normalized : null
}

export async function GET(request: Request) {
  try {
    const decoded = await requireFirebaseUser(request)
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")

    if (scope === "self") {
      const docRef = adminDb.doc(`users/${decoded.uid}`)
      const snapshot = await docRef.get()

      if (!snapshot.exists) {
        return NextResponse.json({ error: "User profile not found." }, { status: 404 })
      }

      return NextResponse.json({ user: serializeUserDoc(snapshot) })
    }

    const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").limit(200).get()
    const adminRequestEmail = decoded.email?.toLowerCase() ?? null
    const users = snapshot.docs
      .filter((doc) => {
        const data = doc.data() ?? {}
        const email = typeof data.email === "string" ? data.email.toLowerCase() : ""
        const segment = typeof data.segment === "string" ? data.segment.toLowerCase() : ""
        if (segment === "admin") return false
        if (email && adminEmailSet.has(email)) return false
        if (adminRequestEmail && email === adminRequestEmail) return false
        return true
      })
      .map(serializeUserDoc)

    return NextResponse.json({ users })
  } catch (response) {
    if (response instanceof Response) return response
    console.error("[/api/users] GET error", response)
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const decoded = await requireFirebaseUser(request)
    const adminEmail = decoded.email?.toLowerCase() ?? null
    if (!adminEmail || !adminEmailSet.has(adminEmail)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")
    if (!userId) {
      return NextResponse.json({ error: "User id is required." }, { status: 400 })
    }

    const docRef = adminDb.doc(`users/${userId}`)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    await docRef.delete()
    return NextResponse.json({ ok: true })
  } catch (response) {
    if (response instanceof Response) return response
    console.error("[/api/users] DELETE error", response)
    return NextResponse.json({ error: "Unable to delete user." }, { status: 500 })
  }
}
