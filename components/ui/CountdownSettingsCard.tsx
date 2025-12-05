"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { getFreshIdToken } from "@/lib/auth-client"

type CountdownFormState = {
  enabled: boolean
  label: string
  endsAtLocal: string
}

const FALLBACK_LABEL = "Limited Drop"

const formatInputValue = (iso: string | null | undefined) => {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const inputToIso = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export default function CountdownSettingsCard() {
  const { toast } = useToast()
  const [form, setForm] = useState<CountdownFormState>({
    enabled: false,
    label: FALLBACK_LABEL,
    endsAtLocal: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) {
        setError("Sign in to manage limited drop settings.")
        return
      }
      const response = await fetch("/api/admin/site-settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
        const data = (await response.json().catch(() => null)) as {
          countdown?: { enabled?: boolean; label?: string | null; endsAt?: string | null }
          error?: string
        } | null
        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to load countdown settings.")
        }
        const countdown = data?.countdown ?? {}
        setForm({
          enabled: Boolean(countdown.enabled),
          label: countdown.label ?? FALLBACK_LABEL,
          endsAtLocal: countdown.enabled ? formatInputValue(countdown.endsAt) : "",
        })
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unable to load countdown settings."
        setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (form.enabled && !form.endsAtLocal) {
      setError("Pick a future end date while the countdown is enabled.")
      return
    }

    const endsAtIso = form.enabled ? (form.endsAtLocal ? inputToIso(form.endsAtLocal) : null) : null
    if (form.enabled && !endsAtIso) {
      setError("Provide a valid date/time for when the countdown ends.")
      return
    }

    try {
      setSaving(true)
      const token = await getFreshIdToken()
      if (!token) {
        throw new Error("Sign in to save countdown changes.")
      }
      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          countdown: {
            enabled: form.enabled,
            label: form.label || FALLBACK_LABEL,
            endsAt: endsAtIso,
          },
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        countdown?: { enabled?: boolean; label?: string | null; endsAt?: string | null }
        error?: string
      } | null
      if (!response.ok || !data?.countdown) {
        throw new Error(data?.error ?? "Unable to save countdown settings.")
      }
      setForm({
        enabled: Boolean(data.countdown.enabled),
        label: data.countdown.label ?? FALLBACK_LABEL,
        endsAtLocal: formatInputValue(data.countdown.endsAt),
      })
      toast({
        title: "Countdown updated",
        description: "Hero timer will reflect the new schedule momentarily.",
      })
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save countdown settings."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950">
      <form className="space-y-5 p-6" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">Limited Drop Countdown</p>
            <p className="text-sm text-gray-400">
              Control the hero counter headline and deadline without redeploying the site.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{form.enabled ? "Enabled" : "Disabled"}</span>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              disabled={loading || saving}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="countdown-label">Label</Label>
          <Input
            id="countdown-label"
            value={form.label}
            maxLength={120}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            disabled={loading || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="countdown-ends-at">Countdown ends</Label>
          <Input
            id="countdown-ends-at"
            type="datetime-local"
            value={form.endsAtLocal}
            onChange={(event) => setForm((prev) => ({ ...prev, endsAtLocal: event.target.value }))}
            disabled={loading || saving}
          />
          <p className="text-xs text-muted-foreground">
            Times use your current timezone and are saved to UTC.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving || loading}>
            {saving ? "Saving..." : "Save countdown"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || saving}
            onClick={() => loadSettings()}
          >
            Refresh
          </Button>
        </div>
      </form>
    </div>
  )
}
