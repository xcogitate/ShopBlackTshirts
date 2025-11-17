"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Copy, Facebook, Leaf, Twitter } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import { Button } from "@/components/ui/button"
import CartButton from "@/components/ui/CartButton"
import UserMenuButton from "@/components/ui/UserMenuButton"
import ProductDisclaimer from "@/components/ui/ProductDisclaimer"
import SiteLogo from "@/components/ui/SiteLogo"
import { useCart } from "@/components/ui/cart-context"
import { startCheckout } from "@/lib/checkout-client"
import type { Product } from "@/lib/products"

type Props = {
  product: Product
  relatedProducts: Product[]
}

function linkForProduct(product: Product) {
  return `/p/${encodeURIComponent(product.slug)}`
}

export default function ProductDetailBasic({ product, relatedProducts }: Props) {
  const gallery = product.images?.length ? product.images : [product.image]
  const [active, setActive] = useState(0)
  const [size, setSize] = useState<Product["sizes"][number] | undefined>(product.sizes?.[0])
  const { addItem } = useCart()
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [shareHref, setShareHref] = useState("")

  const discount =
    product.originalPrice > product.price
      ? Math.max(0, Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100))
      : 0

  const handleAddToCart = () => {
    const sizeSuffix = size ? `-${size}` : ""
    addItem({
      id: `${product.slug}${sizeSuffix}`,
      name: size ? `${product.name} (${size})` : product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: gallery[active] ?? product.image,
      slug: product.slug,
    })
  }

  const handleBuyNow = async () => {
    if (buying) return
    setBuying(true)
    setBuyError(null)

    const sizeSuffix = size ? `-${size}` : ""
    const productName = size ? `${product.name} (${size})` : product.name
    const image = gallery[active] ?? product.image

    const { error } = await startCheckout([
      {
        id: `${product.slug}${sizeSuffix}`,
        name: productName,
        price: product.price,
        quantity: 1,
        image,
      },
    ])

    if (error) {
      setBuyError(error)
      setBuying(false)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareHref(`${window.location.origin}${linkForProduct(product)}`)
    }
  }, [product])

  const shareTo = (platform: "twitter" | "facebook") => {
    if (!shareHref) return
    const text = encodeURIComponent(`${product.name} by ShopBlackTShirts`)
    const url = encodeURIComponent(shareHref)
    const shareUrl =
      platform === "twitter"
        ? `https://twitter.com/intent/tweet?url=${url}&text=${text}`
        : `https://www.facebook.com/sharer/sharer.php?u=${url}`
    window.open(shareUrl, "_blank", "noopener,noreferrer")
  }

  const copyLink = async () => {
    if (!shareHref) return
    try {
      await navigator.clipboard.writeText(shareHref)
    } catch (error) {
      console.warn("Failed to copy share link", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ScrollBanner />
      <header className="border-b border-gray-200 bg-white px-6 py-1 text-black sm:py-2 lg:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SiteLogo size="lg" />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/" className="transition hover:text-gray-600">
              Home
            </Link>
            <Link href="/shop" className="text-[#F5A623] transition hover:text-[#E09612]">
              Shop
            </Link>
            <UserMenuButton className="border border-black/10 bg-white text-black hover:bg-black hover:text-white" />
            <CartButton />
          </nav>
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-gradient-to-b from-[#0f0f0f] to-black">
              <img
                src={gallery[active]}
                alt={`${product.name} ${active + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {gallery.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    aria-label={`Show image ${index + 1}`}
                    onClick={() => setActive(index)}
                    className={`overflow-hidden rounded-lg border bg-[#1f1f1f] ${
                      active === index ? "border-[#F5A623]" : "border-transparent hover:border-gray-600"
                    }`}
                  >
                    <img src={image} alt="" className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <header className="space-y-3">
              <h1 className="text-3xl font-extrabold md:text-4xl">{product.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white">${product.price.toFixed(2)}</span>
                {product.originalPrice > product.price && (
                  <span className="text-lg text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-[#F5A623]/20 px-3 py-1 text-xs font-bold text-[#F5A623]">
                    {discount}% OFF
                  </span>
                )}
              </div>
              <p className="text-base text-gray-300">{product.description}</p>
            </header>

            {product.features?.length ? (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Features</h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-300">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="space-y-1 text-sm text-gray-400">
              <p>• 100% cotton • Machine wash cold • True to size</p>
              <p>After payment is confirmed, please allow 2-4 days for production before shipment. Free returns within 30 days.</p>
            </div>

            <div className="rounded-xl border border-[#1f1f1f] bg-gradient-to-br from-[#111] to-black p-4">
              <div className="flex items-start gap-3">
                <Leaf className="mt-1 h-5 w-5 text-[#62f0a5]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-white">Carbon Removal Commitment</p>
                  <p className="text-sm text-gray-300">
                    A fraction of every sale funds permanent carbon removal — your style makes an impact.
                  </p>
                </div>
              </div>
            </div>

            {product.sizes?.length ? (
              <section className="mt-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Select Size</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((current) => (
                    <button
                      key={current}
                      type="button"
                      onClick={() => setSize(current)}
                      className={`rounded-lg px-6 py-3 text-sm font-semibold transition ${
                        size === current
                          ? "bg-[#F5A623] text-black"
                          : "border border-gray-700 text-white hover:border-[#F5A623]"
                      }`}
                    >
                      {current}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-transparent text-sm font-semibold text-[#F5A623] ring-1 ring-[#F5A623] transition hover:bg-[#F5A623] hover:text-black"
              >
                Add to Cart
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={buying}
                className="flex-1 bg-[#F5A623] text-sm font-semibold text-black transition hover:bg-[#E09612] disabled:cursor-not-allowed"
              >
                {buying ? "Redirecting..." : "Buy Now"}
              </Button>
            </div>
            {buyError && <p className="text-sm font-medium text-red-400">{buyError}</p>}

            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Share</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => shareTo("twitter")}
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Tweet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => shareTo("facebook")}
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={copyLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>

            <ProductDisclaimer className="mt-6" />
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <h2 className="text-2xl font-semibold text-white">Related products</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={linkForProduct(related)}
                  className="rounded-2xl border border-[#1f1f1f] bg-gradient-to-b from-[#111] to-black p-5 transition hover:border-[#F5A623]"
                >
                  <div className="mb-4 overflow-hidden rounded-xl bg-[#1f1f1f]">
                    <img src={related.image} alt={related.name} className="h-56 w-full object-cover" />
                  </div>
                  <h3 className="text-sm font-semibold">{related.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-lg font-bold text-white">${related.price.toFixed(2)}</span>
                    {related.originalPrice > related.price && (
                      <span className="line-through">${related.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
