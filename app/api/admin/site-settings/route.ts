import { NextResponse } from "next/server"
import { z } from "zod"

import { defaultCountdownSettings, getSiteSettings, updateCountdownSettings } from "@/lib/server/site-settings"
import { requireAdmin } from "@/lib/server/require-admin"

const countdownSchema = z.object({
  enabled: z.boolean(),
  label: z
    .string()
    .max(120, "Use 120 characters or fewer.")
    .optional(),
  endsAt: z.string().datetime().nullable(),
})

const payloadSchema = z.object({
  countdown: countdownSchema,
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const settings = await getSiteSettings()
    return NextResponse.json({ countdown: settings.countdown ?? defaultCountdownSettings })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/site-settings] GET error", error)
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request)
    const body = (await request.json().catch(() => null)) as unknown
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      )
    }

    const { enabled, label, endsAt } = parsed.data.countdown
    let resolvedEndsAt: string | null = null

    if (enabled) {
      if (!endsAt) {
        return NextResponse.json(
          { error: "Provide an end date/time while the countdown is enabled." },
          { status: 400 },
        )
      }
      const target = new Date(endsAt)
      if (Number.isNaN(target.getTime())) {
        return NextResponse.json({ error: "Invalid countdown end date." }, { status: 400 })
      }
      if (target.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "Countdown end must be set in the future." },
          { status: 400 },
        )
      }
      resolvedEndsAt = target.toISOString()
    }

    const countdown = await updateCountdownSettings({
      enabled,
      label,
      endsAt: resolvedEndsAt,
    })

    return NextResponse.json({ countdown })
  } catch (error) {
    if (error instanceof Response) return error
    console.error("[/api/admin/site-settings] PUT error", error)
    return NextResponse.json({ error: "Unable to save settings." }, { status: 500 })
  }
}
