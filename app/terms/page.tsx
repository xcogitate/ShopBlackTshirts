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

export default function TermsOfServicePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>Terms of Service | ShopBlackTShirts</title>
        <meta
          name="description"
          content="Review the ShopBlackTShirts terms governing product purchases, account use, and intellectual property."
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/terms" />
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
          <h1 className="text-4xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-gray-400">Rules that govern your use of ShopBlackTshirts and its products.</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-white">1. Acceptance of terms</h2>
            <p>
              By accessing shopblacktshirts.com or completing a purchase, you agree to these Terms of Service and any
              future updates posted here.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">2. Products & pricing</h2>
            <p>
              We do our best to keep product info accurate. We may correct errors, limit quantities, or cancel orders
              (with a full refund) if inventory or pricing issues arise.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">3. Order acceptance</h2>
            <p>
              Orders aren&apos;t final until shipped. We reserve the right to decline or refund orders suspected of fraud
              or outside our shipping zones.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">4. Accounts & security</h2>
            <p>You&apos;re responsible for safeguarding your account credentials and for all activity under your login.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">5. Intellectual property</h2>
            <p>
              All logos, graphics, copy, and designs belong to ShopBlackTshirts and can&apos;t be used without written
              permission.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">6. Limitation of liability</h2>
            <p>
              ShopBlackTshirts isn&apos;t liable for indirect or consequential damages arising from your use of the site or
              our products. Our total liability is limited to the amount you paid for the item in question.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">7. Changes to terms</h2>
            <p>
              We may update these terms at any time. Continued use of the site after changes are posted constitutes
              acceptance of the updated terms.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">8. Cookies & tracking</h2>
            <p>
              We use essential cookies to operate the store plus optional analytics and marketing cookies that you can
              enable or disable through the on-site consent banner. By selecting Accept all, Accept some, or Reject all
              you control which categories are active, and we honor that preference until you change it or clear your
              browser storage. Optional services only run after you have provided consent.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">9. Governing law</h2>
            <p>
              These terms are governed by the laws of the United States and the State of New York, without regard to
              conflict-of-law rules.
            </p>
          </div>
        </section>

        <footer className="text-sm text-gray-400">
          For questions about these terms, email{" "}
          <a href="mailto:support@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
            support@shopblacktshirts.com
          </a>
          .
        </footer>
      </div>
      </main>

      <Footer />
      </div>
    </>
  )
}
