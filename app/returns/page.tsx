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

export default function ReturnPolicyPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <Head>
        <title>Return Policy | ShopBlackTShirts</title>
        <meta
          name="description"
          content="Understand ShopBlackTShirts’ 30-day return process, condition requirements, and refund timelines."
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/returns" />
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
          <h1 className="text-4xl font-semibold">Return Policy</h1>
          <p className="text-sm text-gray-400">Thirty-day returns built for hassle-free exchanges.</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-white">Return window</h2>
            <p>
              Items may be returned within <strong>30 days of delivery</strong>. Request a return authorization number
              before shipping anything back.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Condition requirements</h2>
            <p>
              Products must be unworn, unwashed, and in their original packaging with all tags attached. We reserve the
              right to refuse items that show signs of wear.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Return shipping costs</h2>
            <p>
              If your order qualified for free outbound shipping, you&apos;re responsible for the return shipping cost.
              We can deduct a prepaid-label fee from your refund or you may use your own carrier.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Non-returnable items</h2>
            <p>Gift cards, digital products, and items marked “Final Sale” cannot be returned or exchanged.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">How to start a return</h2>
            <p>
              Email{" "}
              <a href="mailto:returns@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
                returns@shopblacktshirts.com
              </a>{" "}
              with your order number, the item(s) you want to send back, and the reason for the return. We&apos;ll reply
              with next steps and a label if requested.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Refund timing</h2>
            <p>
              Approved returns are processed within <strong>5 business days</strong> of arrival. Funds go back to the
              original payment method, minus any return shipping fees.
            </p>
          </div>
        </section>

        <footer className="text-sm text-gray-400">
          Need help? Email{" "}
          <a href="mailto:returns@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
            returns@shopblacktshirts.com
          </a>{" "}
          or{" "}
          <Link href="/" className="text-[#F5A623] hover:text-[#E09612]">
            continue shopping
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
