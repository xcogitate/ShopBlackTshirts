// components/ui/CartDrawer.tsx
"use client"

import Link from "next/link"
import { ArrowRight, ShoppingBag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "./cart-context"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export default function CartDrawer() {
  const { isOpen, close, items, setQty, removeItem, subtotal, clearCart, count } = useCart()
  const isEmpty = items.length === 0

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-gradient-to-b from-[#060606] via-[#0a0a0a] to-black text-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">Cart</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight">Your Selection</h2>
            <p className="text-sm text-gray-400">{count} {count === 1 ? "item" : "items"} ready to go</p>
          </div>
          <button
            onClick={close}
            aria-label="Close cart"
            className="rounded-full border border-white/10 p-2 text-gray-400 transition hover:border-white/30 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-[#F5A623]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Your cart is currently empty</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Explore the collection and add your favorite designs to see them here.
                </p>
              </div>
              <Button
                asChild
                className="bg-white text-black hover:bg-white/90"
                onClick={close}
              >
                <Link href="/shop">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const maybeSize = (item as unknown as { size?: string }).size
                const imgSrc = item.image || "/placeholder.svg"
                const lineTotal = item.price * item.qty
                const slug = (item as unknown as { slug?: string }).slug
                const href = slug ? `/p/${encodeURIComponent(slug)}` : "/shop"
                return (
                  <li
                    key={item.id}
                    className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-[0_18px_45px_-30px_rgba(245,166,35,0.6)] backdrop-blur-sm transition hover:border-[#F5A623]/60 hover:bg-[#0f0f0f]"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-black/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {href ? (
                              <Link
                                href={href}
                                className="text-sm font-semibold text-white transition hover:text-[#F5A623]"
                                onClick={close}
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <p className="text-sm font-semibold text-white">{item.name}</p>
                            )}
                            {maybeSize ? (
                              <p className="mt-1 text-xs text-gray-400 uppercase">Size: {maybeSize}</p>
                            ) : null}
                          </div>
                          <button
                            className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 transition hover:text-[#F5A623]"
                            onClick={() => removeItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1">
                            <button
                              className="h-8 w-8 rounded-full text-lg text-white transition hover:bg-white/10"
                              onClick={() => setQty(item.id, Math.max(1, item.qty - 1))}
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              -
                            </button>
                            <span className="mx-3 min-w-[2rem] text-center text-sm font-semibold">{item.qty}</span>
                            <button
                              className="h-8 w-8 rounded-full text-lg text-white transition hover:bg-white/10"
                              onClick={() => setQty(item.id, item.qty + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{formatCurrency(lineTotal)}</p>
                            {item.qty > 1 && (
                              <p className="text-xs text-gray-500">({formatCurrency(item.price)} each)</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 bg-black/30 px-6 py-5">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span className="text-lg font-semibold text-white">{formatCurrency(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Shipping and taxes calculated during checkout.</p>

          <div className="mt-5 flex flex-col gap-3">
            <Button
              className="h-12 w-full bg-[#F5A623] text-sm font-semibold text-black transition hover:bg-[#E09612]"
              disabled={isEmpty}
              onClick={close}
              asChild
            >
              <Link href="/checkout" className="flex items-center justify-center gap-2">
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="secondary"
              className="h-12 w-full border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={clearCart}
              disabled={isEmpty}
            >
              Clear Cart
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full text-sm font-semibold text-gray-400 hover:text-white"
              onClick={close}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}



