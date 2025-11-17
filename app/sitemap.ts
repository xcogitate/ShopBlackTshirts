import type { MetadataRoute } from "next"

import { adminDb } from "@/lib/server/firebase-admin"
import { normalizeProductDoc } from "@/lib/server/normalize-product"
import { products as fallbackProducts } from "@/lib/products"

type ProductEntry = {
  slug: string
  lastModified?: Date
}

const DEFAULT_BASE_URL = "https://www.shopblacktshirts.com"

const resolveBaseUrl = () => {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (explicit?.trim()) return explicit.replace(/\/$/, "")

  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelUrl?.trim()) {
    const normalized = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`
    return normalized.replace(/\/$/, "")
  }

  return DEFAULT_BASE_URL
}

const buildStaticEntries = (baseUrl: string): MetadataRoute.Sitemap => {
  const now = new Date()
  const paths = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/shop", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/product", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/collections", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/shipping", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/returns", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ]

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}

const fetchProductEntries = async (): Promise<ProductEntry[]> => {
  try {
    const snapshot = await adminDb.collection("products").where("published", "==", true).get()
    if (snapshot.empty) {
      return fallbackProducts.map((product) => ({ slug: product.slug }))
    }

    return snapshot.docs.map((doc) => ({
      slug: normalizeProductDoc(doc).slug,
      lastModified: doc.updateTime?.toDate() ?? doc.createTime?.toDate(),
    }))
  } catch (error) {
    console.error("[sitemap] failed to load live products", error)
    return fallbackProducts.map((product) => ({ slug: product.slug }))
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveBaseUrl()
  const [staticEntries, productEntries] = await Promise.all([
    buildStaticEntries(baseUrl),
    fetchProductEntries(),
  ])

  const productRoutes: MetadataRoute.Sitemap = productEntries.map(({ slug, lastModified }) => ({
    url: `${baseUrl}/p/${slug}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }))

  return [...staticEntries, ...productRoutes]
}
