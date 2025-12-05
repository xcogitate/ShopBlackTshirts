"use client"

import Head from "next/head"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Menu, ShoppingCart, X } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import ProductCard from "@/components/ui/ProductCard"
import SiteLogo from "@/components/ui/SiteLogo"
import { Button } from "@/components/ui/button"
import CartButton from "@/components/ui/CartButton"
import UserMenuButton from "@/components/ui/UserMenuButton"
import { useCart } from "@/components/ui/cart-context"
import { useStorefrontProducts } from "@/hooks/use-storefront-products"
import type { Product } from "@/lib/products"

type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const FALLBACK_COUNTDOWN_LABEL = "Limited Drop"
const zeroCountdown: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 }
const initialCountdown: Countdown = { days: 2, hours: 15, minutes: 30, seconds: 45 }

const countdownFromMilliseconds = (ms: number): Countdown => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return { ...zeroCountdown }
  }
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

const heroDescriptionFallback =
  "Premium fabrics. Bold graphics. Timeless street edge. Each piece crafted for those who value detail and distinction."

const getProductHref = (product?: Product | null) => {
  if (!product) return "/shop"
  return `/p/${encodeURIComponent(product.slug)}`
}

export default function HomePage() {
  const { addItem, siteDiscounts } = useCart()
  const router = useRouter()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentHeroImage, setCurrentHeroImage] = useState(0)
  const [timeLeft, setTimeLeft] = useState<Countdown>(initialCountdown)
  const [countdownLabel, setCountdownLabel] = useState(FALLBACK_COUNTDOWN_LABEL)
  const [countdownActive, setCountdownActive] = useState(true)
  const { products: storefrontProducts, status: productsStatus } = useStorefrontProducts()

  // Build hero product set
  const limitedProducts = useMemo(() => {
    const limited = storefrontProducts.filter((product) => product.limited)
    if (limited.length) return limited
    // Only use empty when loading/success-no-data; no hardcoded flash
    return []
  }, [storefrontProducts])
  const isFallbackHero = false

  useEffect(() => {
    if (currentHeroImage >= limitedProducts.length) setCurrentHeroImage(0)
  }, [limitedProducts.length, currentHeroImage])

  const heroImages = useMemo(
    () => limitedProducts.map((p) => p.image || "/limited-edition-model.png"),
    [limitedProducts],
  )
  const featuredProduct = limitedProducts[currentHeroImage] ?? limitedProducts[0] ?? null
  const heroHref = featuredProduct ? getProductHref(featuredProduct) : "/shop"
  const heroTitle = featuredProduct?.name ?? "Limited Drop Highlights"
  const heroDescription = featuredProduct?.description ?? heroDescriptionFallback
  const heroSoldOut = Boolean(featuredProduct?.soldOut || featuredProduct?.available === false)
  const canAddFeaturedProduct = Boolean(featuredProduct && !heroSoldOut)
  const heroPricing = useMemo(() => {
    if (!featuredProduct) return null
    const baseOriginal = Number(featuredProduct.originalPrice ?? featuredProduct.price ?? 0)
    const basePrice = Number(featuredProduct.price ?? baseOriginal)
    const limitedActive = featuredProduct.limited && siteDiscounts.limitedActive
    const rate = featuredProduct.limited ? 0 : siteDiscounts.nonLimitedRate
    const displayBase =
      featuredProduct.limited && !limitedActive && baseOriginal > 0 ? baseOriginal : basePrice
    const effective =
      !featuredProduct.limited && rate > 0
        ? Math.max(0, Math.round(displayBase * (1 - rate) * 100) / 100)
        : displayBase
    const percent =
      ((!featuredProduct.limited && rate > 0 && baseOriginal > 0) || (limitedActive && baseOriginal > 0))
        ? Math.max(0, Math.round(((baseOriginal - effective) / baseOriginal) * 100))
        : 0
    return { effective, original: baseOriginal, percent }
  }, [featuredProduct, siteDiscounts])

  useEffect(() => {
    let mounted = true
    const loadCountdownSettings = async () => {
      try {
        const response = await fetch("/api/site-settings")
        const data = (await response.json().catch(() => null)) as {
          countdown?: { enabled?: boolean; endsAt?: string | null; label?: string | null }
        } | null
        if (!data?.countdown || !mounted) return
        const label =
          typeof data.countdown.label === "string" && data.countdown.label.trim().length
            ? data.countdown.label.trim()
            : FALLBACK_COUNTDOWN_LABEL
        setCountdownLabel(label)
        const enabled = Boolean(data.countdown.enabled && data.countdown.endsAt)
        setCountdownActive(enabled)
        if (!enabled || !data.countdown.endsAt) {
          setTimeLeft(initialCountdown)
          return
        }
        const target = new Date(data.countdown.endsAt)
        if (Number.isNaN(target.getTime()) || !mounted) return
        setTimeLeft(countdownFromMilliseconds(target.getTime() - Date.now()))
      } catch (error) {
        console.warn("[homepage] countdown settings unavailable", error)
      }
    }
    loadCountdownSettings()
    return () => {
      mounted = false
    }
  }, [])

  const handleHeroCta = () => {
    router.push(heroHref)
  }

  const HeroImageCarousel = ({ className = "" }: { className?: string }) => {
    if (!heroImages.length) {
      return (
        <div
          className={`relative aspect-[3/4] w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-[#141414] via-[#101010] to-black ${className}`.trim()}
        >
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500">
            Limited drop coming soon
          </div>
        </div>
      )
    }
    return (
      <div
        className={`relative aspect-[3/4] w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-[#141414] via-[#101010] to-black ${className}`.trim()}
      >
        {heroImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentHeroImage === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={src} alt="Limited drop model" className="h-full w-full object-cover" />
          </div>
        ))}
        {/* Spacer to preserve layout */}
        <img src={heroImages[0]} alt="" className="h-full w-full object-cover opacity-0" />
        {heroPricing?.percent !== undefined && heroPricing.percent > 0 && !heroSoldOut && (
          <div className="absolute right-6 top-6 flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-center font-bold text-white shadow-lg sm:h-32 sm:w-32">
            <div>
              <div className="text-3xl">{heroPricing.percent}%</div>
              <div className="text-sm uppercase tracking-widest">Off</div>
            </div>
          </div>
        )}
        {heroSoldOut && (
          <div className="absolute left-6 top-6 inline-flex items-center rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-black shadow-lg">
            Sold Out
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setCurrentHeroImage(index)}
              className={`h-2 rounded-full transition-all ${
                currentHeroImage === index ? "w-6 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  // Auto-advance
  useEffect(() => {
    if (heroImages.length <= 1) return
    const timer = window.setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [heroImages.length])

  // Countdown
  useEffect(() => {
    if (!countdownActive) return
    const countdown = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 }
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 }
        return prev
      })
    }, 1000)
    return () => window.clearInterval(countdown)
  }, [countdownActive])

  const handleAdd = (product: {
    slug: string
    name: string
    price: number
    originalPrice?: number
    image: string
  }) => {
    if (!canAddFeaturedProduct) return
    addItem(
      {
        id: product.slug,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice ?? product.price,
        image: product.image,
        slug: product.slug,
        limited: (product as { limited?: boolean }).limited ?? false,
      },
      1,
    )
  }

  return (
    <>
      <Head>
        <title>Limited Black T-Shirts & Drops | ShopBlackTShirts</title>
        <meta
          name="description"
          content="ShopBlackTShirts curates luxury-quality black tees, limited drops, and message-driven streetwear made for everyday legends."
        />
        <meta
          name="keywords"
          content="black t-shirts, limited drop tees, premium streetwear, ShopBlackTShirts, luxury streetwear, new black shirt releases"
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/" />
        <meta property="og:title" content="ShopBlackTShirts | Luxury Meets Street" />
        <meta
          property="og:description"
          content="Discover premium black t-shirts, limited drops, and bold statements from ShopBlackTShirts."
        />
        <meta property="og:url" content="https://www.shopblacktshirts.com/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="ShopBlackTShirts" />
        <meta
          name="twitter:description"
          content="Luxury-grade black t-shirts with streetwear edge. Explore drops handmade for the culture."
        />
      </Head>
      <div className="min-h-screen bg-black text-white">
      <ScrollBanner />
      <header className="border-b border-gray-200 bg-white px-6 py-0.5 text-black sm:py-1.5 lg:py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SiteLogo priority size="lg" />
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
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <div
          className={
            "mx-auto mt-4 max-w-7xl space-y-3 border-t border-gray-200 pt-4 text-sm font-medium " +
            (mobileMenuOpen ? "" : "hidden")
          }
        >
          <Link href="/" className="block text-black transition hover:text-gray-600" onClick={() => setMobileMenuOpen(false)}>
            Home
          </Link>
            <Link
              href="/shop"
              className="block text-black transition hover:text-gray-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Shop
          </Link>
          <UserMenuButton
            className="block w-full justify-start text-black transition hover:text-gray-600"
            onSignInOpen={() => setMobileMenuOpen(false)}
          />
            <button
              type="button"
              className={`flex items-center gap-2 text-black transition hover:text-gray-600 ${
                canAddFeaturedProduct ? "" : "cursor-not-allowed opacity-40"
              }`}
              disabled={!canAddFeaturedProduct}
              onClick={() => {
                if (!canAddFeaturedProduct) return
                setMobileMenuOpen(false)
                if (featuredProduct) {
                  handleAdd({
                    slug: featuredProduct.slug,
                    name: featuredProduct.name,
                    price: featuredProduct.price,
                    originalPrice: featuredProduct.originalPrice,
                    image: featuredProduct.image,
                  })
                }
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Quick Add Featured
            </button>
          </div>
      </header>

      <main>
        <section className="border-b border-gray-900 px-6 pb-12 pt-1.5 md:pt-3">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:items-center">
            <div className="flex w-full flex-col gap-6 lg:w-[45%]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#F5A623]">
                  {countdownLabel}
                </p>
                <h1 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">{heroTitle}</h1>
              </div>

              <p className="text-lg text-gray-200">{heroDescription}</p>

              <HeroImageCarousel className="lg:hidden" />

              {countdownActive && (
                <div className="w-full lg:max-w-[280px]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Counter</p>
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    {(["days", "hours", "minutes", "seconds"] as const).map((segment) => (
                      <div
                        key={segment}
                        className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-white text-black"
                      >
                        <span className="text-2xl font-bold">{timeLeft[segment]}</span>
                        <span className="text-[10px] font-semibold uppercase text-gray-500">{segment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="h-12 w-full bg-[#F5A623] text-base font-semibold text-black hover:bg-[#E09612] lg:max-w-[280px]"
                onClick={handleHeroCta}
              >
                {heroSoldOut ? "View Details" : "Shop Now"}
              </Button>
            </div>

            <HeroImageCarousel className="hidden lg:block" />
          </div>
        </section>

        <section className="px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">New Arrival Collections</h2>
              <Link href="/shop" className="text-sm font-semibold text-[#F5A623] hover:text-[#E09612]">
                See more
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {storefrontProducts
                .filter((product) => product.categories.includes("new-arrival"))
                .map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </>
  )
}


