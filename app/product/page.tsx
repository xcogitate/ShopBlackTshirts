"use client"

import Head from "next/head"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronLeft, Copy, Facebook, Leaf, Twitter } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import { Button } from "@/components/ui/button"
import CartButton from "@/components/ui/CartButton"
import UserMenuButton from "@/components/ui/UserMenuButton"
import ProductDisclaimer from "@/components/ui/ProductDisclaimer"
import SiteLogo from "@/components/ui/SiteLogo"
import { useCart } from "@/components/ui/cart-context"
import { startCheckout } from "@/lib/checkout-client"
import { useStorefrontProducts } from "@/hooks/use-storefront-products"
import type { Product } from "@/lib/products"

const siteDomain = process.env.NEXT_PUBLIC_DOMAIN ?? "https://www.shopblacktshirts.com"

type LimitedProduct = Product & { features?: string[] }

const fallbackLimitedCatalog: LimitedProduct[] = [
  {
    id: "1",
    slug: "limited-edition-graphic-tee",
    name: "Limited Edition Graphic Tee",
    description:
      "Premium black t-shirt featuring our exclusive LIMITED EDITION graphic. Made from 100% premium cotton with a comfortable fit. This limited drop combines luxury fabrics with bold street graphics for a timeless edge.",
    price: 20.0,
    originalPrice: 30.0,
    image: "/limited-edition-model.png",
    images: ["/limited-edition-model.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["100% Premium Cotton", "Limited to 100 pieces", "Exclusive Design", "Comfortable Fit"],
  },
  {
    id: "2",
    slug: "not-bitter-just-better-limited",
    name: "Not Bitter, Just Better",
    description:
      "Bold statement tee with motivational message. Crafted from premium cotton blend for ultimate comfort and durability. Perfect for those who choose positivity and growth.",
    price: 99.0,
    originalPrice: 110.0,
    image: "/not-bitter-model.png",
    images: ["/not-bitter-model.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["Premium Cotton Blend", "Bold Typography", "Soft & Breathable", "Durable Print"],
  },
  {
    id: "3",
    slug: "not-perfect-just-forgiven-limited",
    name: "Not Perfect Just Forgiven",
    description:
      "Faith-inspired design with elegant typography mixing script and block letters. High-quality fabric ensures long-lasting wear and comfort.",
    price: 99.0,
    originalPrice: 110.0,
    image: "/not-perfect-model.png",
    images: ["/not-perfect-model.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["Faith-Inspired Design", "Mixed Typography", "Premium Fabric", "Comfortable Fit"],
  },
  {
    id: "4",
    slug: "she-is-strong-limited",
    name: "She Is Strong - Proverbs 31:26",
    description:
      "Empowering message with biblical reference. Features elegant script and bold lettering on premium quality fabric. Perfect for strong, confident women.",
    price: 99.0,
    originalPrice: 110.0,
    image: "/she-is-strong-model.png",
    images: ["/she-is-strong-model.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["Empowering Message", "Biblical Reference", "Elegant Design", "Premium Quality"],
  },
  {
    id: "5",
    slug: "entrepreneur-mentality-limited",
    name: "Entrepreneur Mentality",
    description:
      "For the hustlers and dreamers. Bold design combining boxed and script typography. Made for those with an entrepreneurial spirit and mindset.",
    price: 99.0,
    originalPrice: 210.0,
    image: "/entrepreneur-model.png",
    images: ["/entrepreneur-model.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["Bold Statement", "Mixed Typography", "Premium Cotton", "Entrepreneur Spirit"],
  },
  {
    id: "6",
    slug: "know-your-worth-limited",
    name: "Know Your Worth Then Add Tax",
    description:
      "Confidence-boosting message on a premium speckled black tee. Unique fabric texture with bold white graphics. Stand out and know your value.",
    price: 99.0,
    originalPrice: 110.0,
    image: "/know-your-worth.png",
    images: ["/know-your-worth.png"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["limited-drop"],
    limited: true,
    features: ["Speckled Fabric", "Confidence Message", "Unique Texture", "Bold Graphics"],
  },
]


const productGallery: Record<string, string[]> = {
  "limited-edition-graphic-tee": [
    "/limited-edition-model.png",
    "/know-your-worth.png",
    "/entrepreneur-model.png",
    "/not-perfect-model.png",
  ],
  "entrepreneur-mentality-limited": [
    "/entrepreneur-model.png",
    "/limited-edition-model.png",
    "/know-your-worth.png",
    "/not-bitter-model.png",
  ],
  "know-your-worth-limited": [
    "/know-your-worth.png",
    "/entrepreneur-model.png",
    "/limited-edition-model.png",
    "/not-perfect-model.png",
  ],
  "not-bitter-just-better-limited": [
    "/not-bitter-model.png",
    "/limited-edition-model.png",
    "/entrepreneur-model.png",
    "/know-your-worth.png",
  ],
  "not-perfect-just-forgiven-limited": [
    "/not-perfect-model.png",
    "/limited-edition-model.png",
    "/entrepreneur-model.png",
    "/know-your-worth.png",
  ],
  "she-is-strong-limited": [
    "/she-is-strong-model.png",
    "/limited-edition-model.png",
    "/entrepreneur-model.png",
    "/know-your-worth.png",
  ],
}

const defaultFeatureList = [
  "Premium cotton build",
  "Limited-run studio drop",
  "Exclusive Shopblacktshirts graphic",
  "Ships in 2-4 days",
]

function buildGalleryImages(product: LimitedProduct | undefined, catalog: LimitedProduct[]) {
  if (!product) return ["/placeholder.svg"]
  if (Array.isArray(product.images) && product.images.length) return product.images
  if (productGallery[product.slug]?.length) return productGallery[product.slug]
  const alternates = catalog.filter((item) => item.slug !== product.slug).map((item) => item.image)
  return [product.image, ...alternates]
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export default function ProductDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const slugParam = searchParams.get("slug") ?? null
  const { addItem } = useCart()
  const { products: storefrontProducts } = useStorefrontProducts()
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [shareHref, setShareHref] = useState("")

  const limitedProducts = useMemo<LimitedProduct[]>(() => {
    const limited = storefrontProducts.filter((p) => p.limited) as LimitedProduct[]
    return limited.length ? limited : fallbackLimitedCatalog
  }, [storefrontProducts])

  const initialSlug = useMemo(() => {
    if (slugParam && limitedProducts.some((p) => p.slug === slugParam)) return slugParam
    return limitedProducts[0]?.slug ?? fallbackLimitedCatalog[0]?.slug ?? ""
  }, [slugParam, limitedProducts])

  const [selectedSlug, setSelectedSlug] = useState(initialSlug)

  useEffect(() => {
    if (!limitedProducts.length) return
    const fallbackSlug = limitedProducts[0]?.slug ?? ""
    const nextSlug =
      slugParam && limitedProducts.some((p) => p.slug === slugParam) ? slugParam : fallbackSlug
    if (nextSlug && nextSlug !== selectedSlug) setSelectedSlug(nextSlug)
  }, [slugParam, limitedProducts, selectedSlug])

  const selectedProduct = useMemo(
    () =>
      (limitedProducts.find((p) => p.slug === selectedSlug) ??
        limitedProducts[0] ??
        fallbackLimitedCatalog[0])!,
    [limitedProducts, selectedSlug],
  )

  const galleryImages = useMemo(
    () => buildGalleryImages(selectedProduct, limitedProducts),
    [selectedProduct, limitedProducts],
  )

  const [activeImage, setActiveImage] = useState(() => galleryImages[0] ?? "/placeholder.svg")
  const [selectedSize, setSelectedSize] = useState<Product["sizes"][number]>(selectedProduct.sizes[0] ?? "M")

  useEffect(() => {
    setSelectedSize(selectedProduct.sizes[0] ?? "M")
  }, [selectedProduct])

  useEffect(() => {
    if (!galleryImages.length) return
    setActiveImage(galleryImages[0])
  }, [galleryImages])

  useEffect(() => {
    if (!selectedProduct?.slug) return
    const slug = selectedProduct.slug
    if (typeof window !== "undefined" && window.location?.origin) {
      setShareHref(`${window.location.origin}/p/${slug}`)
      return
    }
    setShareHref(`${siteDomain}/p/${slug}`)
  }, [selectedProduct])

  const shareTo = (platform: "twitter" | "facebook") => {
    if (!shareHref || !selectedProduct) return
    const text = encodeURIComponent(`${selectedProduct.name} by ShopBlackTShirts`)
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
      console.warn("Failed to copy link", error)
    }
  }

  const thumbnailImages = (() => {
    const secondary = galleryImages.slice(1, 4)
    if (secondary.length) return secondary
    return limitedProducts
      .filter((p) => p.slug !== selectedProduct.slug)
      .map((p) => p.image)
      .slice(0, 3)
  })()
  while (thumbnailImages.length < 3) {
    thumbnailImages.push(galleryImages[0] ?? selectedProduct.image)
  }

  const discount =
    selectedProduct.originalPrice > selectedProduct.price
      ? Math.max(
          0,
          Math.round(((selectedProduct.originalPrice - selectedProduct.price) / selectedProduct.originalPrice) * 100),
        )
      : 0

  const featureList = selectedProduct.features?.length ? selectedProduct.features : defaultFeatureList

  const handleSelectProduct = (slug: string) => {
    setSelectedSlug(slug)
    if (!pathname) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("slug", slug)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleAddToCart = () => {
    const sizeSuffix = selectedSize ? `-${selectedSize}` : ""
    const productName = selectedSize ? `${selectedProduct.name} (${selectedSize})` : selectedProduct.name
    addItem({
      id: `${selectedProduct.slug}${sizeSuffix}`,
      name: productName,
      price: selectedProduct.price,
      originalPrice: selectedProduct.originalPrice,
      image: activeImage,
      slug: selectedProduct.slug,
    })
  }

  const handleBuyNow = async () => {
    if (buying) return
    setBuying(true)
    setBuyError(null)
    const sizeSuffix = selectedSize ? `-${selectedSize}` : ""
    const productName = selectedSize ? `${selectedProduct.name} (${selectedSize})` : selectedProduct.name

    const { error } = await startCheckout([
      { id: `${selectedProduct.slug}${sizeSuffix}`, name: productName, price: selectedProduct.price, quantity: 1, image: activeImage },
    ])

    if (error) {
      setBuyError(error)
      setBuying(false)
    }
  }

  const canonicalUrl = selectedProduct
    ? `${siteDomain}/p/${selectedProduct.slug}`
    : `${siteDomain}/product`

  return (
    <>
      <Head>
        <title>{selectedProduct?.name ?? "Limited Drop"} | ShopBlackTShirts</title>
        <meta
          name="description"
          content={
            selectedProduct?.description ??
            "Secure the latest ShopBlackTShirts limited drop crafted with premium cotton, bold typography, and member perks."
          }
        />
        <meta
          name="keywords"
          content="limited drop black tee, countdown release, luxury streetwear, ShopBlackTShirts limited edition"
        />
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <div className="min-h-screen bg-black text-white">
      <ScrollBanner />
      <header className="border-b border-gray-200 bg-white px-6 py-1 text-black sm:py-2 lg:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SiteLogo size="lg" />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/" className="transition hover:text-gray-600">
              Home
            </Link>
            <Link href="/shop" className="transition hover:text-gray-600">
              Shop
            </Link>
            <UserMenuButton className="border border-black/10 bg-white text-black hover:bg-black hover:text-white" />
            <CartButton />
          </nav>
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5A623] transition hover:text-[#E09612]">
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="space-y-6 lg:sticky lg:top-28 lg:h-[calc(100vh-140px)] lg:overflow-hidden">
              <div className="flex h-full flex-col gap-6">
                <div className="flex-1 overflow-hidden rounded-3xl border border-[#181818] bg-gradient-to-b from-[#0f0f0f] to-black shadow-xl">
                  <img src={activeImage} alt={selectedProduct.name} className="h-full w-full object-contain" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {thumbnailImages.map((image, index) => (
                    <button
                      key={`${selectedProduct.slug}-preview-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      aria-pressed={activeImage === image}
                      className={`overflow-hidden rounded-2xl border transition ${
                        activeImage === image ? "border-[#F5A623]" : "border-transparent hover:border-gray-700"
                      }`}
                    >
                      <img src={image} alt="" className="h-28 w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6 rounded-3xl border border-[#181818] bg-gradient-to-b from-[#111] to-black p-8 shadow-xl">
                <header className="space-y-3">
                  <h1 className="text-3xl font-extrabold leading-tight text-white md:text-4xl lg:text-5xl">
                    {selectedProduct.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-3xl font-bold text-white">{formatCurrency(selectedProduct.price)}</span>
                    <span className="text-xl text-gray-400 line-through">
                      {formatCurrency(selectedProduct.originalPrice)}
                    </span>
                    {discount > 0 && (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">{discount}% OFF</span>
                    )}
                  </div>
                  <p className="text-gray-300">{selectedProduct.description}</p>
                </header>

                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-400">Features</h2>
                  <ul className="mt-4 space-y-2 text-sm text-gray-300">
                    {featureList.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="mt-4 space-y-1 text-sm text-gray-400">
                  <p>• 100% cotton • Machine wash cold • True to size</p>
                  <p>After payment is confirmed, please allow 2-4 days for production before shipment. Free returns within 30 days.</p>
                </div>

                <div className="rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#111] to-black p-5">
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

                <section className="mt-6 space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-400">Select Size</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
                          selectedSize === size ? "bg-[#F5A623] text-black" : "border border-gray-700 text-white hover:border-[#F5A623]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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

                <section className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">More Designs:</h2>
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Limited Drops</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {limitedProducts.map((product) => {
                      const isActive = product.slug === selectedProduct.slug
                      return (
                        <button
                          key={product.slug}
                          type="button"
                          onClick={() => handleSelectProduct(product.slug)}
                          aria-pressed={isActive}
                          className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5A623] ${
                            isActive
                              ? "border-[#F5A623] bg-gradient-to-br from-[#F5A6231A] via-[#F5A6230F] to-transparent shadow-[0_24px_48px_-30px_rgba(245,166,35,0.75)]"
                              : "border-[#1F1F1F] bg-[#0F0F0F] shadow-[0_22px_46px_-36px_rgba(0,0,0,0.9)] hover:border-[#F5A623]/70 hover:shadow-[0_24px_52px_-32px_rgba(245,166,35,0.55)]"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#F5A623]/25 via-[#F5A623]/10 to-transparent transition-opacity duration-300 ${
                              isActive ? "opacity-90" : "opacity-0 group-hover:opacity-60"
                            }`}
                          />
                          <img
                            src={product.image}
                            alt={product.name}
                            className="relative z-[0] h-36 w-full object-cover object-center transition duration-500 group-hover:scale-105"
                          />
                          {isActive && (
                            <span className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 items-center justify-center rounded-full bg-[#F5A623] p-2 text-black shadow-[0_12px_24px_-12px_rgba(245,166,35,0.9)]">
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>

              <ProductDisclaimer />
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  )
}
