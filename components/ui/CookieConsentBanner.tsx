"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  CookieConsentSelection,
  CookieConsentPreferences,
  defaultCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent"
import { cn } from "@/lib/utils"

const OPTIONAL_COOKIE_CATEGORIES = [
  {
    key: "analytics",
    label: "Analytics cookies",
    description:
      "Help us understand traffic and improve the experience through aggregated metrics.",
  },
  {
    key: "marketing",
    label: "Marketing cookies",
    description:
      "Allow personalized offers and measure the performance of campaigns off-site.",
  },
] as const

type OptionalCategoryKey =
  (typeof OPTIONAL_COOKIE_CATEGORIES)[number]["key"]

function toSelection(
  prefs?: CookieConsentPreferences | null,
): CookieConsentSelection {
  if (!prefs) {
    return defaultCookieConsent
  }

  return {
    necessary: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
  }
}

export function CookieConsentBanner() {
  const [checkingConsent, setCheckingConsent] = React.useState(true)
  const [showBanner, setShowBanner] = React.useState(false)
  const [selection, setSelection] = React.useState<CookieConsentSelection>(
    defaultCookieConsent,
  )
  const [customSelection, setCustomSelection] =
    React.useState<CookieConsentSelection>(defaultCookieConsent)
  const [isCustomizing, setIsCustomizing] = React.useState(false)

  React.useEffect(() => {
    const stored = readCookieConsent()
    const nextSelection = toSelection(stored)

    setSelection(nextSelection)
    setShowBanner(!stored)
    setCheckingConsent(false)
  }, [])

  const persistSelection = React.useCallback(
    (next: CookieConsentSelection) => {
      const persisted = writeCookieConsent({
        ...next,
        necessary: true,
      })

      setSelection(persisted ? toSelection(persisted) : next)
      setShowBanner(false)
    },
    [],
  )

  const handleAcceptAll = () => {
    persistSelection({
      necessary: true,
      analytics: true,
      marketing: true,
    })
  }

  const handleRejectAll = () => {
    persistSelection({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  }

  const handleOpenCustomize = () => {
    setCustomSelection(selection)
    setIsCustomizing(true)
  }

  const handleSaveCustom = () => {
    persistSelection(customSelection)
    setIsCustomizing(false)
  }

  if (checkingConsent) {
    return null
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 sm:pb-6 transition-all duration-300",
          showBanner ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!showBanner}
      >
        <div
          className={cn(
            "w-full max-w-3xl rounded-2xl border border-white/10 bg-white/95 p-5 text-sm text-slate-900 shadow-2xl backdrop-blur dark:bg-neutral-900/95 dark:text-white",
            "transition-all duration-300",
            showBanner
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0",
          )}
          role="dialog"
          aria-label="Cookie consent banner"
        >
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-base font-semibold">
                We use cookies to power this experience
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                ShopBlackTShirts uses essential cookies to keep the store
                working and optional cookies to measure performance and deliver
                personalized offers. Choose what works for you.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAcceptAll}
              >
                Accept all
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handleOpenCustomize}
              >
                Accept some
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="flex-1 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
                onClick={handleRejectAll}
              >
                Reject all
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Necessary cookies always stay on so the cart, checkout, and
              account features keep working.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review our{" "}
              <Link
                href="/privacy"
                className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                Terms of Service
              </Link>{" "}
              for full details before choosing.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
        <DialogContent className="bg-white text-slate-900 dark:bg-neutral-950 dark:text-white">
          <DialogHeader>
            <DialogTitle>Customize cookie preferences</DialogTitle>
            <DialogDescription>
              Enable the optional categories you are comfortable with. Your
              choices will be saved for future visits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {OPTIONAL_COOKIE_CATEGORIES.map((category) => (
              <div
                key={category.key}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-200/70 p-4 dark:border-white/10"
              >
                <div>
                  <p className="font-medium">{category.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {category.description}
                  </p>
                </div>
                <Switch
                  checked={customSelection[category.key]}
                  onCheckedChange={(checked) =>
                    handleToggle(category.key, checked)
                  }
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCustomizing(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCustom}>
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  function handleToggle(category: OptionalCategoryKey, value: boolean) {
    setCustomSelection((prev) => ({
      ...prev,
      [category]: value,
    }))
  }
}
