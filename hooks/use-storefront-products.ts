"use client"

import { useEffect, useState } from "react"
import { products as fallbackProducts, type Product } from "@/lib/products"

type FetchState = "idle" | "loading" | "success" | "error"

export function useStorefrontProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadProducts() {
      setStatus("loading")
      setError(null)
      try {
        const response = await fetch("/api/products", { signal: controller.signal })
        if (!response.ok) {
          throw new Error("Unable to fetch live products.")
        }
        const data = (await response.json().catch(() => null)) as { items?: Product[] } | null
        if (isMounted && Array.isArray(data?.items) && data.items.length) {
          setProducts(data.items)
        } else if (isMounted && status !== "loading") {
          // if no items returned, keep empty and mark success
          setProducts([])
        }
        if (isMounted) setStatus("success")
      } catch (fetchError) {
        if (controller.signal.aborted) return
        if (isMounted) {
          setStatus("error")
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load products.")
          // As a last resort on error, show static fallback to avoid empty screens
          setProducts(fallbackProducts)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  return { products, status, error }
}
