"use client"

import type { ReactNode } from "react"
import { CartProvider } from "@/components/ui/cart-context"
import CartDrawer from "@/components/ui/CartDrawer"

type ProvidersProps = {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <CartProvider>
      <CartDrawer />
      {children}
    </CartProvider>
  )
}
