"use client"

import Head from "next/head"
import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import CartButton from "@/components/ui/CartButton"
import UserMenuButton from "@/components/ui/UserMenuButton"
import ProductCard from "@/components/ui/ProductCard"
import SiteLogo from "@/components/ui/SiteLogo"
import { useStorefrontProducts } from "@/hooks/use-storefront-products"
import type { Product } from "@/lib/products"

const collections: { key: Product["categories"][number]; title: string }[] = [
  { key: "new-arrival", title: "New Arrival Collections" },
  { key: "street-icon", title: "Street Icon Collection" },
  { key: "you-matter", title: "You Matter Collection" },
  { key: "purpose-faith", title: "Purpose + Faith Collection" },
]

export default function ShopPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({})
  const { products, status } = useStorefrontProducts()
  const hasProducts = products.length > 0
  const isLoading = status === "loading"

  const toggleCollection = (key: string) => {
    setExpandedCollections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      <Head>
        <title>Shop All Black T-Shirts & Collections | ShopBlackTShirts</title>
        <meta
          name="description"
          content="Browse every ShopBlackTShirts collection: New Arrivals, Street Icon, Purpose + Faith, You Matter, and more limited black tees."
        />
        <meta
          name="keywords"
          content="shop black t-shirts, street icon collection, faith apparel, premium tees, ShopBlackTShirts products"
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/shop" />
        <meta property="og:title" content="Shop Collections | ShopBlackTShirts" />
        <meta
          property="og:description"
          content="Explore all ShopBlackTShirts collections, stacked with premium cotton tees, bold typography, and statement fits."
        />
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
            <Link href="/shop" className="text-[#F5A623] transition hover:text-[#E09612]">
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
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="mx-auto max-w-7xl space-y-16">
          {isLoading && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading &&
            collections.map(({ key, title }) => {
              const matchingProducts = products.filter((product) => product.categories.includes(key))
              if (!matchingProducts.length) return null

              const isExpanded = Boolean(expandedCollections[key])
              const visibleProducts = isExpanded ? matchingProducts : matchingProducts.slice(0, 4)
              const showToggle = matchingProducts.length > 4

              return (
                <section key={key} className="space-y-8">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-2xl font-semibold">{title}</h2>
                    {showToggle && (
                      <button
                        type="button"
                        onClick={() => toggleCollection(key)}
                        className="text-sm font-semibold text-[#F5A623] transition hover:text-[#E09612]"
                        aria-expanded={isExpanded}
                        aria-controls={`collection-${key}`}
                      >
                        {isExpanded ? "Show less" : "View collection"}
                      </button>
                    )}
                  </div>
                  <div
                    id={`collection-${key}`}
                    className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {visibleProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })}

          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">All Designs</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            ) : hasProducts ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-gray-400">
                {status === "loading" ? "Loading latest products..." : "No products available yet. Check back soon."}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
      </div>
    </>
  )
}
