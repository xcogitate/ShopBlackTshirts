"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import SignInButton from "@/components/ui/SignInButton"
import { useCart } from "@/components/ui/cart-context"

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart()
  const searchParams = useSearchParams()

  useEffect(() => {
    const clearFlag = sessionStorage.getItem("sbt:clear-cart-after-checkout")
    if (clearFlag) {
      clearCart()
      sessionStorage.removeItem("sbt:clear-cart-after-checkout")
    }
  }, [clearCart])

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (!sessionId) return

    const storageKey = `sbt:order-recorded-${sessionId}`
    if (sessionStorage.getItem(storageKey)) return

    const recordOrder = async () => {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
        if (response.ok) {
          sessionStorage.setItem(storageKey, "true")
        } else {
          console.error("Failed to record order", await response.text())
        }
      } catch (error) {
        console.error("Order record error", error)
      }
    }

    void recordOrder()
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">
          Payment confirmed
        </p>
        <h1 className="text-4xl font-bold md:text-5xl">Thank you for your order</h1>
        <p className="mx-auto max-w-xl text-sm text-gray-300">
          Your payment was successful. We&apos;ll email updates as soon as your limited drop ships.
          Screenshot this page for your records or jump back into the store to keep browsing.
        </p>
        <p className="mx-auto max-w-xl text-xs text-gray-400">
          Want to track the process from accepted to shipped? Create an account below and you&apos;ll be able to check
          status updates anytime plus save your shipping preferences for future drops.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center justify-center rounded-md bg-[#F5A623] px-6 text-sm font-semibold text-black transition hover:bg-[#E09612]"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-[#F5A623] hover:text-[#F5A623]"
        >
          Return home
        </Link>
      </div>
      <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#F5A623]">Get more from your drop</p>
        <h2 className="mt-2 text-xl font-bold">Create an account to track this order</h2>
        <p className="mt-2 text-sm text-gray-300">
          Signing up lets you view shipping updates, save delivery addresses, and unlock members-only drops faster.
        </p>
        <div className="mt-4">
          <SignInButton className="text-white">
            Sign up or sign in
          </SignInButton>
        </div>
      </div>
    </div>
  )
}
