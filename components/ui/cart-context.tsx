// components/ui/cart-context.tsx
"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/** ---------- Types ---------- */
export type CartItem = {
  id: string
  name: string
  price: number
  originalPrice?: number
  limited?: boolean
  image?: string | null
  slug: string
  qty: number
  // You can optionally store variants like size/color:
  // size?: string; color?: string;
}

export type CartState = {
  items: CartItem[]
  subtotal: number
  originalSubtotal: number
  count: number
  discountRate: number
  discountAmount: number
  discountedSubtotal: number
  discountMode: "rate" | "label" | null
  siteDiscounts: { nonLimitedRate: number; limitedActive: boolean }
}

export interface CartContextValue extends CartState {
  // item actions
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void
  removeItem: (id: string) => void
  increment: (id: string, step?: number) => void
  decrement: (id: string, step?: number) => void
  setQty: (id: string, qty: number) => void
  clearCart: () => void
  getItem: (id: string) => CartItem | undefined
  isInCart: (id: string) => boolean
  activateDiscount: (rate: number, meta?: { source?: string; mode?: "rate" | "label" }) => void
  clearDiscount: () => void
  isDiscountActive: boolean
  discountMode: "rate" | "label" | null
  // UI actions for a mini-cart/drawer
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  siteDiscounts: { nonLimitedRate: number; limitedActive: boolean }
}

/** ---------- Context ---------- */
const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = "sbt_cart_v1"
const DISCOUNT_STORAGE_KEY = "sbt_discount_v1"
const SIGNUP_DISCOUNT_FALLBACK = 0.15

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) as T } catch { return fallback }
}

/** ---------- Provider ---------- */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useRef(false)
  const [items, setItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState<{ rate: number; source?: string | null; mode?: "rate" | "label" } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [siteDiscount, setSiteDiscount] = useState<{ nonLimitedRate: number; limitedActive: boolean }>({
    nonLimitedRate: 0,
    limitedActive: false,
  })

  // hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const cached = safeParse<CartItem[]>(localStorage.getItem(STORAGE_KEY), [])
    setItems(cached)
    const storedDiscountRaw = safeParse<{ rate: number; source?: string | null; mode?: "rate" | "label" } | null>(
      localStorage.getItem(DISCOUNT_STORAGE_KEY),
      null,
    )
    if (storedDiscountRaw) {
      let nextDiscount = storedDiscountRaw

      if (storedDiscountRaw.mode === "label" && storedDiscountRaw.source === "hero-signup") {
        const fallbackRate =
          typeof storedDiscountRaw.rate === "number" && storedDiscountRaw.rate > 0 && storedDiscountRaw.rate < 1
            ? storedDiscountRaw.rate
            : SIGNUP_DISCOUNT_FALLBACK

        nextDiscount = {
          rate: fallbackRate,
          source: storedDiscountRaw.source ?? "hero-signup",
          mode: "rate",
        }
      }

      if (
        nextDiscount.mode === "label" ||
        (typeof nextDiscount.rate === "number" && nextDiscount.rate > 0)
      ) {
        setDiscount(nextDiscount)
      }
    }
    isHydrated.current = true
  }, [])

  // load site-wide discounts (coupon + limited drop)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/site-settings")
        const data = (await response.json().catch(() => null)) as {
          coupon?: { discountPercent?: number; enableForNonLimited?: boolean | null }
          countdown?: { enabled?: boolean; endsAt?: string | null }
        } | null
        if (!data) return
        const nonLimitedRate =
          data.coupon && data.coupon.enableForNonLimited && typeof data.coupon.discountPercent === "number"
            ? Math.max(0, Math.min(1, data.coupon.discountPercent / 100))
            : 0
        const limitedActive = Boolean(data.countdown && data.countdown.enabled && data.countdown.endsAt)
        setSiteDiscount({ nonLimitedRate, limitedActive })
      } catch (err) {
        console.warn("[cart] unable to load site discount settings", err)
      }
    }
    loadSettings().catch(() => null)
  }, [])

  // derived totals
  const state: CartState = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const originalSubtotal = items.reduce(
      (sum, i) => sum + (i.originalPrice ?? i.price) * i.qty,
      0,
    )
    const count = items.reduce((sum, i) => sum + i.qty, 0)

    const nonLimitedSubtotal = items
      .filter((i) => !i.limited)
      .reduce((sum, i) => sum + i.price * i.qty, 0)
    const limitedSubtotal = items
      .filter((i) => i.limited)
      .reduce((sum, i) => sum + i.price * i.qty, 0)

    let discountAmount = 0
    let discountRate = 0

    // Site-wide automatic discounts
    const siteAmount =
      Math.round(nonLimitedSubtotal * siteDiscount.nonLimitedRate * 100) / 100
    discountAmount += siteAmount

    let workingSubtotal = Math.max(0, subtotal - siteAmount)

    // User-triggered discounts (e.g., signup)
    let manualAmount = 0
    if (discount) {
      if (discount.mode === "label") {
        const labelAmount = Math.max(0, originalSubtotal - subtotal)
        if (labelAmount > 0) {
          manualAmount = Math.round(labelAmount * 100) / 100
        }
      } else {
        const normalizedRate = Math.max(0, Math.min(discount.rate ?? 0, 1))
        if (normalizedRate > 0) {
          manualAmount = Math.round(workingSubtotal * normalizedRate * 100) / 100
        }
      }
    }

    discountAmount += manualAmount
    const discountedSubtotal = Math.max(0, workingSubtotal - manualAmount)
    discountRate = subtotal > 0 ? discountAmount / subtotal : 0

    return {
      items,
      subtotal,
      originalSubtotal,
      count,
      discountRate,
      discountAmount,
      discountedSubtotal,
      discountMode: discount?.mode ?? null,
      siteDiscounts: siteDiscount,
    }
  }, [items, discount, siteDiscount])

  // persist to localStorage
  useEffect(() => {
    if (!isHydrated.current) return
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (!isHydrated.current) return
    if (typeof window === "undefined") return
    if (discount && (discount.mode === "label" || discount.rate > 0)) {
      localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(discount))
    } else {
      localStorage.removeItem(DISCOUNT_STORAGE_KEY)
    }
  }, [discount])

  // cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(safeParse<CartItem[]>(e.newValue, []))
      }
      if (e.key === DISCOUNT_STORAGE_KEY) {
        const next = safeParse<{ rate: number; source?: string | null; mode?: "rate" | "label" } | null>(e.newValue, null)
        setDiscount(
          next && (next.mode === "label" || (typeof next.rate === "number" && next.rate > 0)) ? next : null,
        )
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // item actions
  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === item.id)
      if (idx > -1) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          qty: next[idx].qty + qty,
          price: item.price,
          originalPrice: item.originalPrice ?? next[idx].originalPrice ?? item.price,
          image: item.image ?? next[idx].image,
          name: item.name ?? next[idx].name,
          slug: item.slug ?? next[idx].slug,
          limited: item.limited ?? next[idx].limited,
        }
        return next
      }
      return [
        ...prev,
        {
          ...item,
          limited: item.limited ?? false,
          originalPrice: item.originalPrice ?? item.price,
          qty,
        },
      ]
    })
    setIsOpen(true)
  }

  const removeItem: CartContextValue["removeItem"] = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const increment: CartContextValue["increment"] = (id, step = 1) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, qty: i.qty + step } : i)))
  }

  const decrement: CartContextValue["decrement"] = (id, step = 1) => {
    setItems(prev =>
      prev
        .map(i => (i.id === id ? { ...i, qty: Math.max(0, i.qty - step) } : i))
        .filter(i => i.qty > 0)
    )
  }

  const setQty: CartContextValue["setQty"] = (id, qty) => {
    setItems(prev =>
      prev
        .map(i => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i))
        .filter(i => i.qty > 0)
    )
  }

  const clearCart: CartContextValue["clearCart"] = () => setItems([])

  const getItem: CartContextValue["getItem"] = (id) => items.find(i => i.id === id)
  const isInCart: CartContextValue["isInCart"] = (id) => items.some(i => i.id === id)

  const activateDiscount: CartContextValue["activateDiscount"] = (rate, meta) => {
    const mode = meta?.mode ?? "rate"
    const normalized = Math.max(0, Math.min(rate, 1))
    if (mode !== "label" && normalized === 0) return
    setDiscount({
      rate: mode === "label" ? normalized || 1 : normalized,
      source: meta?.source ?? null,
      mode,
    })
  }

  const clearDiscount: CartContextValue["clearDiscount"] = () => {
    setDiscount(null)
  }

  // UI actions
  const open: CartContextValue["open"] = () => setIsOpen(true)
  const close: CartContextValue["close"] = () => setIsOpen(false)
  const toggle: CartContextValue["toggle"] = () => setIsOpen(prev => !prev)

  const value: CartContextValue = {
    ...state,
    addItem,
    removeItem,
    increment,
    decrement,
    setQty,
    clearCart,
    getItem,
    isInCart,
    activateDiscount,
    clearDiscount,
    isDiscountActive: state.discountAmount > 0,
    isOpen,
    open,
    close,
    toggle,
    siteDiscounts: state.siteDiscounts,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

/** ---------- Hook ---------- */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
