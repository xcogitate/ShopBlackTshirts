"use client"

import Head from "next/head"
import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import CartButton from "@/components/ui/CartButton"
import SiteLogo from "@/components/ui/SiteLogo"
import UserMenuButton from "@/components/ui/UserMenuButton"

export default function ShippingPolicyPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>Shipping Policy | ShopBlackTShirts</title>
        <meta
          name="description"
          content="Learn how ShopBlackTShirts processes US-only orders, timelines, carriers, and lost package handling."
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/shipping" />
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
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
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
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Policies</p>
          <h1 className="text-4xl font-semibold">Shipping Policy</h1>
          <p className="text-sm text-gray-400">How we process, handle, and deliver every ShopBlackTshirts order.</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-white">Processing & fulfillment</h2>
            <p>
              Orders are processed within <strong>3–5 business days</strong> after payment confirmation. Limited drops or
              peak launches can add 1 extra business day. You&apos;ll receive a confirmation email once your order is
              queued for fulfillment.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Shipping destinations</h2>
            <p>
              We currently ship <strong>within the United States only</strong>. International delivery is not available
              yet—join our email list to be notified when that changes.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Carriers & tracking</h2>
            <p>
              Packages ship via USPS, UPS, or FedEx depending on your location. A tracking link is sent as soon as the
              label is created so you can monitor the delivery timeline in real time.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Address updates</h2>
            <p>
              Need to tweak your shipping info? Email{" "}
              <a href="mailto:support@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
                support@shopblacktshirts.com
              </a>{" "}
              before the order ships. Once a tracking number is issued we can&apos;t reroute the package.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Lost or damaged shipments</h2>
            <p>
              If your tracking page shows a problem, notify us within <strong>7 days</strong> of the scheduled delivery
              date. We&apos;ll investigate with the carrier and determine whether a replacement or refund is appropriate.
            </p>
          </div>
        </section>

        <footer className="text-sm text-gray-400">
          Questions about shipping? Email{" "}
          <a href="mailto:support@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
            support@shopblacktshirts.com
          </a>{" "}
          or head back to{" "}
          <Link href="/" className="text-[#F5A623] hover:text-[#E09612]">
            the storefront
          </Link>
          .
        </footer>
      </div>
      </main>

      <Footer />
      </div>
    </>
  )
}
