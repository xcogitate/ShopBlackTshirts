import { adminDb } from "@/lib/server/firebase-admin"
import { normalizeProductDoc, safeString } from "@/lib/server/normalize-product"
import { getProductBySlug, products as fallbackProducts, type Product } from "@/lib/products"

export async function getStorefrontProduct(slug: string): Promise<Product | null> {
  const normalizedSlug = safeString(slug, "")
  if (!normalizedSlug) return null

  try {
    const snapshot = await adminDb.collection("products").where("slug", "==", normalizedSlug).limit(1).get()
    if (!snapshot.empty) {
      return normalizeProductDoc(snapshot.docs[0])
    }
  } catch (error) {
    console.error("[getStorefrontProduct] error", error)
  }

  return getProductBySlug(normalizedSlug) ?? null
}

export async function getStorefrontProducts(limit = 12): Promise<Product[]> {
  try {
    let query = adminDb.collection("products").where("published", "==", true)
    if (Number.isFinite(limit) && limit > 0) {
      query = query.limit(limit)
    }
    const snapshot = await query.get()
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => normalizeProductDoc(doc))
    }
  } catch (error) {
    console.error("[getStorefrontProducts] error", error)
  }
  return fallbackProducts.slice(0, limit)
}
