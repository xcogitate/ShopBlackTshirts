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

export default function PrivacyPolicyPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>Privacy Policy | ShopBlackTShirts</title>
        <meta
          name="description"
          content="See how ShopBlackTShirts collects, uses, and protects your customer data for shipping and support."
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/privacy" />
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
          <h1 className="text-4xl font-semibold">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Your information stays private and is only used to fulfill your order.</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-white">Information we collect</h2>
            <p>
              We collect your name, shipping address, and optional phone number solely to deliver your order and resolve
              support inquiries. If you create an account, we store your email and encrypted password plus your order
              history for tracking purposes.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Payment data</h2>
            <p>
              Payments are processed securely by our partners (like Stripe). Card details never touch ShopBlackTshirts
              servers.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Emails & marketing</h2>
            <p>
              We send transactional email confirmations automatically. Marketing emails are opt-in, and every message
              includes an unsubscribe link.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Data sharing</h2>
            <p>
              We don&apos;t sell or rent personal data. We share limited information with service providers (shipping
              carriers, payment processors) strictly to complete your purchase, and they&apos;re required to safeguard
              it.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cookies & tracking preferences</h2>
            <p>
              ShopBlackTShirts uses essential cookies to keep your cart, checkout, and account sessions working. We also
              offer optional analytics and marketing cookies that help us measure performance and improve future drops.
              When the cookie banner appears you can choose Accept all, Accept some, or Reject all. Your selection stays
              stored in your browser so we only activate the categories you allowed.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Data requests</h2>
            <p>
              Contact{" "}
              <a href="mailto:privacy@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
                privacy@shopblacktshirts.com
              </a>{" "}
              to request, update, or delete the information we hold about you. We respond within a reasonable timeframe.
            </p>
          </div>
        </section>

        <footer className="text-sm text-gray-400">
          Questions about privacy? Email{" "}
          <a href="mailto:privacy@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
            privacy@shopblacktshirts.com
          </a>{" "}
          or{" "}
          <Link href="/" className="text-[#F5A623] hover:text-[#E09612]">
            head back to the shop
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
