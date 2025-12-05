import { NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/server/firebase-admin"
import { requireAdmin } from "@/lib/server/require-admin"

type FirestoreDateLike =
  | string
  | Date
  | { toDate?: () => Date }
  | null
  | undefined

const toISOString = (value: FirestoreDateLike) => {
  if (!value) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  return null
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")?.toLowerCase() ?? ""
    const minSubtotalParam = Number(searchParams.get("minSubtotal") ?? "0")
    const minSubtotal = Number.isFinite(minSubtotalParam) ? minSubtotalParam : 0
    const hasEmail = (searchParams.get("hasEmail") ?? "").toLowerCase() === "true"
    const limitParam = Number(searchParams.get("limit") ?? "200")
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.floor(limitParam), 1), 500)
      : 200

    // Fetch a slice of carts, then filter in memory to avoid Firestore index requirements
    const snapshot = await adminDb.collection("carts").limit(limit).get()

    const carts = snapshot.docs
      .map((doc) => {
        const data = doc.data() ?? {}
        return {
          id: doc.id,
          status: typeof data.status === "string" ? data.status : "active",
          email: typeof data.email === "string" ? data.email : null,
          userId: typeof data.userId === "string" ? data.userId : null,
          items: Array.isArray(data.items) ? data.items : [],
          subtotal: typeof data.subtotal === "number" ? data.subtotal : 0,
          lastActivityAt: toISOString(data.lastActivityAt),
          abandonedAt: toISOString(data.abandonedAt),
          nextReminderAt: toISOString(data.nextReminderAt),
          reminderStep: typeof data.reminderStep === "number" ? data.reminderStep : 0,
          optedOut: Boolean(data.optedOut),
          bounced: Boolean(data.bounced),
        }
      })
      .filter((cart) => {
        if (statusFilter && cart.status !== statusFilter) return false
        if (hasEmail && !cart.email) return false
        if (minSubtotal > 0 && (cart.subtotal ?? 0) < minSubtotal) return false
        return true
      })

    return NextResponse.json({ carts })
  } catch (error) {
    // requireAdmin throws Response; surface it directly
    if (error instanceof Response) {
      return error
    }
    console.error("[/api/admin/carts] error", error)
    return NextResponse.json({ error: "Unable to load carts." }, { status: 500 })
  }
}
