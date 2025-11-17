"use client"

import { getFreshIdToken } from "@/lib/auth-client"

export type CheckoutItem = {
  id: string
  name: string
  price: number
  quantity: number
  image?: string | null
}

type CheckoutResponse =
  | {
      error: string
    }
  | {
      error?: undefined
    }

export async function startCheckout(items: CheckoutItem[]): Promise<CheckoutResponse> {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Your cart is empty." }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    const token = await getFreshIdToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      return { error: data?.error ?? "Unable to start checkout. Please try again." }
    }

    const data = (await response.json()) as { url?: string }
    if (data?.url) {
      sessionStorage.setItem("sbt:clear-cart-after-checkout", "true")
      window.location.href = data.url
      return {}
    }

    return { error: "Unexpected response from checkout. Please try again." }
  } catch (error) {
    console.error("startCheckout error", error)
    return { error: "We couldn't start checkout. Check your connection and try again." }
  }
}
