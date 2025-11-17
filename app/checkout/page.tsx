// app/checkout/page.tsx
"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Lock, Sparkles, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCart } from "@/components/ui/cart-context"
import { startCheckout } from "@/lib/checkout-client"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

const fieldClasses =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition placeholder:text-gray-500 focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    originalSubtotal,
    discountedSubtotal,
    discountAmount,
    discountRate,
    discountMode,
    isDiscountActive,
    count,
    increment,
    decrement,
    setQty,
    removeItem,
    clearCart,
  } = useCart()

  const qualifiesForFreeShipping = subtotal >= 75
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard")
  const shipping =
    shippingMethod === "standard"
      ? qualifiesForFreeShipping
        ? 0
        : 8
      : 14
  const tax = useMemo(
    () => Math.round(Math.max(0, discountedSubtotal) * 0.07 * 100) / 100,
    [discountedSubtotal],
  )
  const total = Math.max(0, discountedSubtotal) + shipping + tax
  const hasMemberDiscount = isDiscountActive && discountAmount > 0
  const subtotalDisplay = hasMemberDiscount && discountMode === "label" ? originalSubtotal : subtotal
  const memberDiscountPercent = Math.round(discountRate * 100)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const shippingOptions: Array<{
    id: "standard" | "express"
    title: string
    description: string
    price: number
  }> = [
    {
      id: "standard",
      title: "Standard Delivery",
      description: qualifiesForFreeShipping
        ? "3-5 business days - tracked - free on orders $75+"
        : `3-5 business days - tracked (${formatCurrency(8)})`,
      price: qualifiesForFreeShipping ? 0 : 8,
    },
    {
      id: "express",
      title: "Express Delivery",
      description: `1-2 business days - priority handling (${formatCurrency(14)}) - US only`,
      price: 14,
    },
  ]

  const usStates = [
    { value: "", label: "Select state" },
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
    { value: "DC", label: "Washington, D.C." },
  ]

  const handleCheckout = async () => {
    if (checkoutPending) return
    setCheckoutPending(true)
    setCheckoutError(null)

    const lineItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      image: item.image,
    }))

    const { error } = await startCheckout(lineItems)
    if (error) {
      setCheckoutError(error)
      setCheckoutPending(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center text-white">
        <Sparkles className="mx-auto h-10 w-10 text-[#F5A623]" />
        <h1 className="mt-6 text-3xl font-semibold">Your cart is feeling light</h1>
        <p className="mt-2 text-sm text-gray-400">Browse the latest drops and add something to see it here.</p>
        <div className="mt-6">
          <Link href="/shop">
            <Button className="h-12 bg-[#F5A623] px-6 text-sm font-semibold text-black transition hover:bg-[#E09612]">
              Explore the Shop
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-[#050505] to-[#0c0c0c] pb-20 text-white">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(245,166,35,0.25),_transparent_65%)]" />

      <div className="relative mx-auto max-w-7xl px-6 pt-16">
        <Link href="/" className="text-sm font-semibold text-[#F5A623] transition hover:text-[#F8B944]">
          Back to shopping
        </Link>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">Checkout</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">Secure your tees</h1>
            <p className="mt-2 text-sm text-gray-400">
              {count} {count === 1 ? "product" : "products"} in your bag. Finish your order below.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
            <Lock className="h-3.5 w-3.5 text-[#F5A623]" />
            Secure Checkout
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-50px_rgba(245,166,35,0.6)]">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold">Contact Details</h2>
                <p className="text-sm text-gray-400">We'll send order updates and delivery notifications.</p>
              </header>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <input className={fieldClasses} placeholder="First name" autoComplete="given-name" />
                <input className={fieldClasses} placeholder="Last name" autoComplete="family-name" />
                <input className={fieldClasses} placeholder="Email address" type="email" autoComplete="email" />
                <input className={fieldClasses} placeholder="Phone number" type="tel" autoComplete="tel" />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold">Shipping Address</h2>
                <p className="text-sm text-gray-400">Double-check your details to ensure smooth delivery.</p>
              </header>
              <div className="mt-6 grid grid-cols-1 gap-4">
                <input className={fieldClasses} placeholder="Street address" autoComplete="address-line1" />
                <input className={fieldClasses} placeholder="Apartment, suite, etc. (optional)" autoComplete="address-line2" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <input className={fieldClasses} placeholder="City" autoComplete="address-level2" />
                  <select
                    className={`${fieldClasses} cursor-pointer text-black dark:text-white dark:bg-white/5`}
                    defaultValue=""
                    aria-label="State"
                    autoComplete="address-level1"
                  >
                    {usStates.map((state) => (
                      <option
                        key={state.value || "placeholder"}
                        value={state.value}
                        disabled={state.value === ""}
                        hidden={state.value === ""}
                      >
                        {state.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={fieldClasses}
                    placeholder="ZIP code"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500">Shipping is currently available within the United States only.</p>
                <textarea
                  className={`${fieldClasses} min-h-[90px] resize-none`}
                  placeholder="Delivery notes (optional)"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold">Shipping Method</h2>
                <p className="text-sm text-gray-400">Choose how quickly you want your new fits to arrive.</p>
              </header>

              <div className="mt-6 space-y-3">
                {shippingOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 transition hover:border-[#F5A623] ${
                      shippingMethod === option.id
                        ? "border-[#F5A623] bg-[#F5A623]/5"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className="mt-1 block text-xs text-gray-400">{option.description}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {option.price === 0 ? "Free" : formatCurrency(option.price)}
                      </span>
                      <input
                        type="radio"
                        name="shipping"
                        className="h-4 w-4 accent-[#F5A623]"
                        checked={shippingMethod === option.id}
                        onChange={() => setShippingMethod(option.id)}
                        aria-label={option.title}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </section>

          </div>

          <aside className="flex h-fit flex-col rounded-3xl border border-[#1F1F1F] bg-black/80 p-6 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)] backdrop-blur-lg">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => {
                const lineTotal = item.price * item.qty
                const slug = (item as unknown as { slug?: string }).slug
                const href = slug ? `/p/${encodeURIComponent(slug)}` : undefined
                return (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="h-16 w-16 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {href ? (
                            <Link href={href} className="text-sm font-semibold text-white hover:text-[#F5A623]">
                              {item.name}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">Unit | {formatCurrency(item.price)}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500 hover:text-[#F5A623]"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <button
                            onClick={() => (item.qty > 1 ? decrement(item.id, 1) : removeItem(item.id))}
                            className="h-7 w-7 rounded-full text-sm text-white transition hover:bg-white/10"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                          -
                          </button>
                          <input
                            value={item.qty}
                            onChange={(event) => {
                              const next = Number(event.target.value)
                              if (Number.isFinite(next) && next >= 1) {
                                setQty(item.id, next)
                              }
                            }}
                            type="number"
                            min={1}
                            className="mx-2 h-7 w-12 rounded-md border border-white/10 bg-transparent text-center text-sm outline-none"
                            aria-label={`${item.name} quantity`}
                          />
                          <button
                            onClick={() => increment(item.id, 1)}
                            className="h-7 w-7 rounded-full text-sm text-white transition hover:bg-white/10"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-white">{formatCurrency(lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>{hasMemberDiscount ? "Subtotal (before discount)" : "Subtotal"}</span>
                <span className="text-white">{formatCurrency(subtotalDisplay)}</span>
              </div>
              {hasMemberDiscount && (
                <div className="flex justify-between text-sm font-medium text-[#F5A623]">
                  <span>
                    Member Discount{" "}
                    <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                      ({memberDiscountPercent}% off)
                    </span>
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {hasMemberDiscount && (
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal after discount</span>
                  <span className="text-white">{formatCurrency(Math.max(0, discountedSubtotal))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-gray-400">
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#F5A623]" />
                  Shipping
                </span>
                <span className="text-white">{shipping ? formatCurrency(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Estimated Tax</span>
                <span className="text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
              You&apos;ll enter your payment details on Stripe&apos;s secure checkout page.
            </p>

            <Button
              className="mt-6 h-12 w-full bg-[#F5A623] text-sm font-semibold text-black transition hover:bg-[#E09612] disabled:cursor-not-allowed"
              onClick={handleCheckout}
              disabled={checkoutPending}
            >
              {checkoutPending ? "Redirecting to Stripe..." : "Place Order Securely"}
            </Button>
            {checkoutError && (
              <p className="mt-3 text-center text-sm font-medium text-red-400">{checkoutError}</p>
            )}
            <button
              onClick={clearCart}
              disabled={checkoutPending}
              className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Cart
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">
              By placing your order you agree to our Terms of Service & Privacy Policy.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
