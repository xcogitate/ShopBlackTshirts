import { NextResponse } from "next/server"

import { adminAuth } from "@/lib/server/firebase-admin"
import { listSupportTickets, type SupportTicketStatus } from "@/lib/server/support-store"

function parseAuthorizationHeader(header: string | null): string | null {
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
      return NextResponse.json(
        { error: "Missing admin authentication. Sign in again." },
        { status: 401 },
      )
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error("[/api/admin/support] invalid token", error)
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as SupportTicketStatus | null
    const limitParam = Number(searchParams.get("limit") ?? "50")

    const tickets = await listSupportTickets({
      limit:
        Number.isFinite(limitParam) && limitParam > 0
          ? Math.min(Math.floor(limitParam), 200)
          : 50,
      status: status ?? undefined,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("[/api/admin/support] error", error)
    return NextResponse.json(
      { error: "Unable to load support tickets." },
      { status: 500 },
    )
  }
}
