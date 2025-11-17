"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function CheckoutCanceledPage() {
  useEffect(() => {
    sessionStorage.removeItem("sbt:clear-cart-after-checkout")
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center text-white">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">
          Checkout canceled
        </p>
        <h1 className="text-4xl font-bold md:text-5xl">No worries, your cart is safe</h1>
        <p className="mx-auto max-w-xl text-sm text-gray-300">
          Your payment wasn&apos;t completed, but your items are still waiting in the cart. You can
          retry checkout anytime or keep browsing the latest drops.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/checkout"
          className="inline-flex h-12 items-center justify-center rounded-md bg-[#F5A623] px-6 text-sm font-semibold text-black transition hover:bg-[#E09612]"
        >
          Return to checkout
        </Link>
        <Link
          href="/shop"
          className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-[#F5A623] hover:text-[#F5A623]"
        >
          Keep shopping
        </Link>
      </div>
    </div>
  )
}
