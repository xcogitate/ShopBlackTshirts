"use client"

export type CookieConsentSelection = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export type CookieConsentPreferences = CookieConsentSelection & {
  updatedAt: number
}

export const COOKIE_CONSENT_EVENT = "sbts:cookie-consent"
const COOKIE_CONSENT_STORAGE_KEY = "sbts_cookie_consent"

export const defaultCookieConsent: CookieConsentSelection = {
  necessary: true,
  analytics: false,
  marketing: false,
}

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as CookieConsentPreferences
    if (
      typeof parsed?.necessary === "boolean" &&
      typeof parsed?.analytics === "boolean" &&
      typeof parsed?.marketing === "boolean"
    ) {
      return {
        ...parsed,
        necessary: true,
        updatedAt: parsed?.updatedAt ?? Date.now(),
      }
    }
  } catch {
    // If parsing fails we treat it as no consent stored yet.
  }

  return null
}

export function writeCookieConsent(
  selection: CookieConsentSelection,
): CookieConsentPreferences | null {
  if (typeof window === "undefined") {
    return null
  }

  const payload: CookieConsentPreferences = {
    ...selection,
    necessary: true,
    updatedAt: Date.now(),
  }

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(payload),
  )

  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, { detail: payload }),
  )

  return payload
}

export function hasConsentFor(
  category: keyof CookieConsentSelection,
): boolean {
  if (category === "necessary") {
    return true
  }

  const prefs = readCookieConsent()
  if (!prefs) {
    return false
  }

  return Boolean(prefs[category])
}
