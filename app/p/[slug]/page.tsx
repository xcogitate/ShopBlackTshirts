import { notFound } from "next/navigation"
import type { Metadata } from "next"

import ProductDetailBasic from "@/components/ui/ProductDetailBasic"
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/server/get-storefront-product"
import { products as catalogProducts } from "@/lib/products"

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getStorefrontProduct(slug)
  if (!product) {
    return {
      title: "Product not found | ShopBlackTShirts",
      robots: { index: false, follow: false },
    }
  }

  const url = `https://www.shopblacktshirts.com/p/${product.slug}`
  const description = product.description ?? "Premium black tee from ShopBlackTShirts."
  return {
    title: `${product.name} | ShopBlackTShirts`,
    description,
    keywords: [
      product.name,
      "ShopBlackTShirts",
      "black t-shirt",
      "premium streetwear",
      ...(product.categories ?? []),
    ],
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} | ShopBlackTShirts`,
      description,
      url,
      images: product.images?.length ? product.images.map((image) => ({ url: image })) : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ShopBlackTShirts`,
      description,
      images: product.images?.length ? product.images : undefined,
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const product = await getStorefrontProduct(slug)
  if (!product) return notFound()

  const liveProducts = await getStorefrontProducts(16)
  const liveRelated = liveProducts.filter((p) => p.slug !== product.slug)
  const existingSlugs = new Set(liveRelated.map((p) => p.slug))
  const fallbackRelated = catalogProducts.filter(
    (p) => p.slug !== product.slug && !existingSlugs.has(p.slug),
  )
  const relatedProducts = [...liveRelated, ...fallbackRelated].slice(0, 4)
  return <ProductDetailBasic product={product} relatedProducts={relatedProducts} />
}
