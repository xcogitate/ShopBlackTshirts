"use client"

import { ShoppingCart } from "lucide-react"

import { useCart } from "@/components/ui/cart-context"

export default function CartButton() {
  const { count, toggle } = useCart()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Open cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  )
}
