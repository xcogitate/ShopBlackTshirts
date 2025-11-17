// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { upsertOrderFromSession } from "@/lib/server/order-store"

// Ensure Node.js runtime (Firebase Admin won't run on Edge)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// --- Environment Variables ---
// Validate first so we can safely cast to non-null strings.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.")
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.")
}

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET: string = process.env.STRIPE_WEBHOOK_SECRET

// --- Stripe Init ---
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })

// --- Webhook Handler ---
export async function POST(request: Request) {
  // In the App Router, request.text() gives us the raw body Stripe needs for signature verification.
  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error("[stripe:webhook] Signature verification failed:", error)
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Retrieve the full session with line items + products
        const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items", "line_items.data.price.product"],
        })

        // Sanitize line items to undefined (not null) to satisfy TS signatures
        type UpsertLI = {
          description?: string
          quantity?: number
          price?: { unit_amount?: number }
        }

        const rawItems = expandedSession.line_items?.data as Stripe.LineItem[] | undefined
        const safeLineItems: UpsertLI[] | undefined = rawItems?.map((li) => ({
          description: li.description ?? undefined,
          quantity: (li.quantity ?? undefined) as number | undefined,
          price: { unit_amount: li.price?.unit_amount ?? undefined },
        }))

        // Persist in Firestore
        const result = await upsertOrderFromSession(expandedSession, safeLineItems)

        if (!result.created && result.reason !== "exists") {
          console.error("[stripe:webhook] Failed to persist checkout session", {
            sessionId: session.id,
            reason: result.reason,
          })
        } else {
          console.log("[stripe:webhook] Order persisted", {
            sessionId: session.id,
            created: result.created,
            alreadyExists: result.reason === "exists",
          })
        }
        break
      }

      default:
        // Unhandled events acknowledged
        break
    }

    // Always acknowledge receipt to Stripe
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[stripe:webhook] Handler error:", error?.message || error)
    // Acknowledge to avoid retry storms; switch to 500 if you prefer Stripe to retry.
    return NextResponse.json({ received: true, warning: "handler-error" })
  }
}
