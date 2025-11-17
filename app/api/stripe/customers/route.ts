import { NextResponse } from "next/server"
import Stripe from "stripe"

import { adminAuth } from "@/lib/server/firebase-admin"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })

const parseAuthorizationHeader = (header: string | null): string | null => {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

export async function GET(request: Request) {
  try {
    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json({ error: "Missing admin authentication." }, { status: 401 })
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/stripe/customers] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const customers = await stripe.customers.list({ limit: 100 })
    const formatted = customers.data.map((customer) => ({
      id: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      phone: customer.phone ?? null,
      shipping: customer.shipping ?? null,
      created: customer.created ? new Date(customer.created * 1000).toISOString() : null,
      orders: customer.metadata?.orders ? Number(customer.metadata.orders) : undefined,
    }))

    return NextResponse.json({ customers: formatted })
  } catch (error) {
    console.error("[/api/stripe/customers] error", error)
    return NextResponse.json({ error: "Unable to load Stripe customers." }, { status: 500 })
  }
}
