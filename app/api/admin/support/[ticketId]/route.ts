import { NextResponse } from "next/server"

import { adminAuth } from "@/lib/server/firebase-admin"
import {
  addAdminReplyToTicket,
  getSupportTicket,
  updateSupportTicketStatus,
  type SupportTicketStatus,
} from "@/lib/server/support-store"

type RouteContext =
  | {
      params:
        | {
            ticketId: string
          }
        | Promise<{
            ticketId: string
          }>
    }
  | Promise<{
      params:
        | {
            ticketId: string
          }
        | Promise<{
            ticketId: string
          }>
    }>

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== "bearer") return null
  return token.trim()
}

export async function GET(request: Request, contextPromise: RouteContext) {
  try {
    const context = await contextPromise
    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json(
        { error: "Missing admin authentication. Sign in again." },
        { status: 401 },
      )
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/admin/support/:ticketId] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const params = await context.params
    const ticket = await getSupportTicket(params.ticketId)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[/api/admin/support/:ticketId] error", error)
    return NextResponse.json({ error: "Unable to load ticket." }, { status: 500 })
  }
}

export async function PATCH(request: Request, contextPromise: RouteContext) {
  try {
    const context = await contextPromise
    const token = parseAuthorizationHeader(request.headers.get("authorization"))
    if (!token) {
      return NextResponse.json(
        { error: "Missing admin authentication. Sign in again." },
        { status: 401 },
      )
    }

    let adminUser: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
    try {
      adminUser = await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/admin/support/:ticketId] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | { message?: string; status?: SupportTicketStatus }
      | null

    if (!body?.message && !body?.status) {
      return NextResponse.json(
        { error: "Provide a reply message or status change." },
        { status: 400 },
      )
    }

    const params = await context.params
    const ticketId = params.ticketId
    let ticket = null

    if (body?.message) {
      ticket = await addAdminReplyToTicket({
        ticketId,
        body: body.message,
        admin: {
          uid: adminUser.uid ?? null,
          email: adminUser.email ?? null,
          name: adminUser.name ?? null,
        },
        status: body.status,
      })
    } else if (body.status) {
      ticket = await updateSupportTicketStatus(ticketId, body.status)
    }

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error("[/api/admin/support/:ticketId] update error", error)
    return NextResponse.json(
      { error: "Unable to update ticket. Try again later." },
      { status: 500 },
    )
  }
}
