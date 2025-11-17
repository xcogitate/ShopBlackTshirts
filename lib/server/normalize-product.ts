import type { FirebaseFirestore } from "firebase-admin/firestore"

import type { Product } from "@/lib/products"

export const safeString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length ? value.trim() : fallback

export const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export const normalizeProductDoc = (doc: FirebaseFirestore.DocumentSnapshot): Product => {
  const data = doc.data() ?? {}
  const price = parseNumber(data.price, 0)
  const originalPrice = parseNumber(data.originalPrice ?? data.original_price, price)
  const soldOut = Boolean(data.soldOut)
  const available = soldOut ? false : data.available !== false

  return {
    id: doc.id,
    slug: safeString(data.slug, doc.id),
    name: safeString(data.name, "Untitled product"),
    price,
    originalPrice: originalPrice || price,
    image: safeString(data.image, "/placeholder.svg"),
    images: Array.isArray(data.images) ? data.images : [],
    description: safeString(data.description, "Product description coming soon."),
    sizes:
      Array.isArray(data.sizes) && data.sizes.length
        ? (data.sizes as Product["sizes"])
        : ["S", "M", "L", "XL", "2XL"],
    available,
    categories: Array.isArray(data.categories) ? data.categories : [],
    limited: Boolean(data.limited),
    soldOut,
    features: Array.isArray(data.features) ? (data.features as string[]) : undefined,
  }
}
