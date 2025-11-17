import { NextResponse } from "next/server"

import { createSupportTicket } from "@/lib/server/support-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          name?: string
          email?: string
          subject?: string
          topic?: string
          orderNumber?: string
          message?: string
        }
      | null

    if (!body?.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 },
      )
    }

    const ticket = await createSupportTicket({
      name: body.name.trim(),
      email: body.email.trim(),
      subject: body.subject?.trim(),
      topic: body.topic ?? "general",
      orderNumber: body.orderNumber?.trim() || null,
      message: body.message.trim(),
    })

    return NextResponse.json({ success: true, ticketId: ticket.id })
  } catch (error) {
    console.error("[/api/support] unable to create ticket", error)
    return NextResponse.json(
      { error: "Unable to submit request. Please try again later." },
      { status: 500 },
    )
  }
}
