import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/lib/server/firebase-admin"

const DEFAULT_COUNTDOWN_LABEL = "Limited Drop"

export type CountdownSettings = {
  enabled: boolean
  endsAt: string | null
  label: string
}

export type SiteSettings = {
  countdown: CountdownSettings
}

const SITE_SETTINGS_DOC = "site_settings/global"

const fallbackCountdown: CountdownSettings = {
  enabled: false,
  endsAt: null,
  label: DEFAULT_COUNTDOWN_LABEL,
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

export async function getSiteSettings(): Promise<SiteSettings> {
  const snapshot = await adminDb.doc(SITE_SETTINGS_DOC).get()
  if (!snapshot.exists) {
    return { countdown: fallbackCountdown }
  }

  const data = snapshot.data() ?? {}
  const countdownData = (data.countdown ?? {}) as Record<string, unknown>

  return {
    countdown: {
      enabled: Boolean(countdownData.enabled),
      endsAt: toISOString(countdownData.endsAt),
      label: sanitizeLabel(countdownData.label),
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

export const defaultCountdownSettings = fallbackCountdown
