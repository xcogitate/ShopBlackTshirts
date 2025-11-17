import { NextResponse } from "next/server"
import Stripe from "stripe"

import { adminAuth } from "@/lib/server/firebase-admin"

type CheckoutItem = {
  id: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.")
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
})

const MAX_PRODUCT_NAME_LENGTH = 127

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: CheckoutItem[] }
    const items = Array.isArray(body.items) ? body.items : []

    if (!items.length) {
      return NextResponse.json({ error: "No items provided for checkout." }, { status: 400 })
    }

    const origin =
      request.headers.get("origin") ?? request.headers.get("referer") ?? new URL(request.url).origin

    const lineItems = items.map((item) => {
      const quantity =
        typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
          ? Math.round(item.quantity)
          : 1

      const amount = Math.round(item.price * 100)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid price for item "${item.name ?? item.id}".`)
      }

      let imageUrl: string | undefined
      if (item.image) {
        imageUrl = item.image.startsWith("http")
          ? item.image
          : new URL(item.image, origin).toString()
      }

      return {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: (item.name || "Shopblacktshirts product").slice(0, MAX_PRODUCT_NAME_LENGTH),
            images: imageUrl ? [imageUrl] : undefined,
            metadata: {
              productId: item.id,
            },
          },
        },
        quantity,
      }
    })

    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    let firebaseContext: { uid?: string; email?: string } = {}
    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token)
        firebaseContext = {
          uid: decoded.uid,
          email: decoded.email ?? undefined,
        }
      } catch (error) {
        console.warn("[checkout] unable to verify auth token", error)
      }
    }

    const metadata: Record<string, string> = {}
    if (firebaseContext.uid) {
      metadata.firebaseUid = firebaseContext.uid
    }
    if (firebaseContext.email) {
      metadata.firebaseEmail = firebaseContext.email
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/canceled`,
      customer_email: firebaseContext.email,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    })

    if (!session.url) {
      return NextResponse.json({ error: "Unable to create checkout session." }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe checkout error", error)
    return NextResponse.json(
      { error: "We were unable to start checkout. Please try again." },
      { status: 500 },
    )
  }
}
