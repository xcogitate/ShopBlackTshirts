import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/lib/server/firebase-admin"

const DEFAULT_COUNTDOWN_LABEL = "Limited Drop"

export type CountdownSettings = {
  enabled: boolean
  endsAt: string | null
  label: string
}

export type CouponSettings = {
  code: string | null
  discountPercent: number
  notes?: string | null
  enableForNonLimited: boolean
}

export type SiteSettings = {
  countdown: CountdownSettings
  coupon: CouponSettings
}

const SITE_SETTINGS_DOC = "site_settings/global"

const fallbackCountdown: CountdownSettings = {
  enabled: false,
  endsAt: null,
  label: DEFAULT_COUNTDOWN_LABEL,
}

const fallbackCoupon: CouponSettings = {
  code: null,
  discountPercent: 0,
  notes: null,
  enableForNonLimited: false,
}

function toISOString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return null
}

function sanitizeLabel(label: unknown) {
  if (typeof label !== "string") return DEFAULT_COUNTDOWN_LABEL
  const trimmed = label.trim()
  return trimmed.length ? trimmed : DEFAULT_COUNTDOWN_LABEL
}

function sanitizePercent(value: unknown, max = 100) {
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  return Math.min(Math.max(Math.round(num * 100) / 100, 0), max)
}

function sanitizeCode(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim().toUpperCase()
  return trimmed.length ? trimmed : null
}

function sanitizeNotes(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const snapshot = await adminDb.doc(SITE_SETTINGS_DOC).get()
  if (!snapshot.exists) {
    return { countdown: fallbackCountdown, coupon: fallbackCoupon }
  }

  const data = snapshot.data() ?? {}
  const countdownData = (data.countdown ?? {}) as Record<string, unknown>
  const couponData = (data.coupon ?? {}) as Record<string, unknown>

  return {
    countdown: {
      enabled: Boolean(countdownData.enabled),
      endsAt: toISOString(countdownData.endsAt),
      label: sanitizeLabel(countdownData.label),
    },
    coupon: {
      code: sanitizeCode(couponData.code),
      discountPercent: sanitizePercent(couponData.discountPercent),
      notes: sanitizeNotes(couponData.notes),
      enableForNonLimited: Boolean(couponData.enableForNonLimited),
    },
  }
}

export async function updateCountdownSettings(input: {
  enabled: boolean
  label?: string
  endsAt: string | null
}) {
  const label = sanitizeLabel(input.label)
  const payload: Record<string, unknown> = {
    countdown: {
      enabled: Boolean(input.enabled),
      label,
      endsAt: input.endsAt ? Timestamp.fromDate(new Date(input.endsAt)) : null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.doc(SITE_SETTINGS_DOC).set(payload, { merge: true })
  const fresh = await getSiteSettings()
  return fresh.countdown
}

export async function updateCouponSettings(input: {
  code?: string | null
  discountPercent?: number
  notes?: string | null
  enableForNonLimited?: boolean
}) {
  const code = sanitizeCode(input.code)
  const discountPercent = sanitizePercent(input.discountPercent)
  const notes = sanitizeNotes(input.notes)
  const payload: Record<string, unknown> = {
    coupon: {
      code,
      discountPercent,
      notes,
      enableForNonLimited: Boolean(input.enableForNonLimited),
    },
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.doc(SITE_SETTINGS_DOC).set(payload, { merge: true })
  const fresh = await getSiteSettings()
  return fresh.coupon
}

export const defaultCountdownSettings = fallbackCountdown
export const defaultCouponSettings = fallbackCoupon
