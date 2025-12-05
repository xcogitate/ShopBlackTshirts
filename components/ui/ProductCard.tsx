"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/products"
import { useCart } from "@/components/ui/cart-context"
import { startCheckout } from "@/lib/checkout-client"

function hrefForProduct(product: Product) {
  return `/p/${encodeURIComponent(product.slug)}`
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, siteDiscounts } = useCart()
  const href = hrefForProduct(product)

  const id = (product as unknown as { id?: number | string }).id ?? product.slug
  const image = (product as unknown as { image?: string }).image ?? "/placeholder.svg"
  const basePrice = Number((product as unknown as { price?: number }).price ?? 0)
  const baseOriginal = Number((product as unknown as { originalPrice?: number }).originalPrice ?? basePrice)
  const limited = Boolean((product as unknown as { limited?: boolean }).limited)
  const available = (product as unknown as { available?: boolean }).available !== false
  const soldOut = Boolean((product as unknown as { soldOut?: boolean }).soldOut)
  const isOutOfStock = soldOut || !available
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)

  const appliedRate = !limited ? siteDiscounts.nonLimitedRate : 0
  const limitedActive = limited && siteDiscounts.limitedActive
  const displayBase = limited
    ? limitedActive && basePrice > 0
      ? basePrice
      : baseOriginal > 0
        ? baseOriginal
        : basePrice
    : basePrice
  const effectivePrice =
    !limited && appliedRate > 0
      ? Math.max(0, Math.round(displayBase * (1 - appliedRate) * 100) / 100)
      : displayBase
  const originalPrice = baseOriginal
  const discountPercentage =
    !limited && appliedRate > 0 && originalPrice > 0
      ? Math.max(0, Math.round(((originalPrice - effectivePrice) / originalPrice) * 100))
      : limitedActive && originalPrice > 0
        ? Math.max(0, Math.round(((originalPrice - effectivePrice) / originalPrice) * 100))
        : 0
  const isDiscounted = discountPercentage > 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem(
      {
        id: String(id),
        name: product.name,
        price: displayBase,
        originalPrice: baseOriginal,
        image,
        slug: product.slug,
        limited,
      },
      1,
    )
  }

  const handleBuyNow = async () => {
    if (isOutOfStock || buying) return
    setBuying(true)
    setBuyError(null)

    const { error } = await startCheckout([
      {
        id: String(id),
        name: product.name,
        price,
        quantity: 1,
        image,
      },
    ])

    if (error) {
      setBuyError(error)
      setBuying(false)
    }
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-[#1F1F1F] bg-[#0B0B0B] transition-colors duration-300 hover:border-[#F5A623]/70 hover:bg-[#131313] focus-within:border-[#F5A623]">
      <Link
        href={href}
        className="relative block aspect-[3/4] overflow-hidden bg-gradient-to-b from-[#141414] via-[#101010] to-black"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {isOutOfStock && (
          <span className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center rounded-full border border-white/20 bg-black/85 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white">
            Sold Out
          </span>
        )}
        {limited && (
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-[#F5A623] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-black shadow-[0_10px_25px_-18px_rgba(245,166,35,0.9)]">
            Limited
          </span>
        )}
        {isDiscounted && (
          <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white">
            {discountPercentage}% Off
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <div className="space-y-3">
          <Link href={href} className="block text-lg font-semibold text-white transition hover:text-[#F5A623]">
            {product.name}
          </Link>
          <div className="flex flex-wrap items-baseline gap-3 text-white">
            <span className="text-2xl font-bold">${effectivePrice.toFixed(2)}</span>
            {isDiscounted && <span className="text-sm text-gray-500 line-through">${originalPrice.toFixed(2)}</span>}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Button
            onClick={handleAddToCart}
            className="h-11 w-full bg-transparent text-sm font-semibold text-[#F5A623] ring-1 ring-[#F5A623] transition hover:bg-[#F5A623] hover:text-black"
            disabled={isOutOfStock}
          >
            {isOutOfStock ? "Sold Out" : "Add to Cart"}
          </Button>
          <Button
            onClick={handleBuyNow}
            variant="secondary"
            disabled={isOutOfStock || buying}
            className="h-11 w-full border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:border-[#F5A623]/60 hover:bg-[#F5A623]/10 disabled:cursor-not-allowed"
          >
            {isOutOfStock ? "Sold Out" : buying ? "Redirecting..." : "Buy Now"}
          </Button>
          <Link
            href={href}
            className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 transition hover:text-[#F5A623]"
          >
            View Details
          </Link>
          {buyError && <p className="text-xs font-medium text-red-400">{buyError}</p>}
        </div>
      </div>
    </div>
  )
}
