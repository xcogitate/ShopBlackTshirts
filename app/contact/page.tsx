"use client"

import Head from "next/head"
import { FormEvent, useState } from "react"
import Link from "next/link"
import { Info, Menu, X } from "lucide-react"

import Footer from "@/components/footer"
import ScrollBanner from "@/components/scroll-banner"
import CartButton from "@/components/ui/CartButton"
import SiteLogo from "@/components/ui/SiteLogo"
import UserMenuButton from "@/components/ui/UserMenuButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ContactPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    order: "",
    topic: "general",
    message: "",
  })

  const handleChange =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setFormStatus(null)
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          topic: form.topic,
          orderNumber: form.order,
          message: form.message,
        }),
      })
      const data = (await response.json().catch(() => null)) as
        | { ticketId?: string; error?: string }
        | null
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to send your message right now.")
      }
      setFormStatus({
        type: "success",
        message: `Thanks for reaching out. Ticket ${data?.ticketId ?? ""} has been created.`,
      })
      setForm({
        name: "",
        email: "",
        order: "",
        topic: "general",
        message: "",
      })
    } catch (error) {
      setFormStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to send your message right now.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Contact ShopBlackTShirts | Support & Order Help</title>
        <meta
          name="description"
          content="Connect with ShopBlackTShirts support for general questions, shipping updates, refunds, or payment issues."
        />
        <meta
          name="keywords"
          content="contact ShopBlackTShirts, order issue support, shipping help, black t-shirt customer service"
        />
        <link rel="canonical" href="https://www.shopblacktshirts.com/contact" />
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
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Contact</p>
            <h1 className="text-4xl font-semibold">Get in touch</h1>
            <p className="text-sm text-gray-400">
              Drop us a line about orders, collaborations, or general questions. We reply within 1–2 business days.
            </p>
          </header>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/40">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-sm font-semibold text-white">
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={handleChange("name")}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-sm font-semibold text-white">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-topic" className="text-sm font-semibold text-white">
                    Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={form.topic}
                    onChange={handleChange("topic")}
                    className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                  >
                    <option value="general">General</option>
                    <option value="order">Order issue</option>
                    <option value="payment">Payment issue</option>
                    <option value="shipping">Shipping question</option>
                    <option value="refund">Refund issue</option>
                  </select>
                </div>
              </div>
                <div className="space-y-2">
                  <label htmlFor="contact-order" className="flex items-center gap-2 text-sm font-semibold text-white">
                    Order number
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Info className="h-3 w-3" />
                      Required unless topic is General
                    </span>
                  </label>
                  <Input
                    id="contact-order"
                    value={form.order}
                    onChange={handleChange("order")}
                    placeholder="SBT-12345"
                    required={form.topic !== "general"}
                  />
                </div>
              <div className="space-y-2">
                <label htmlFor="contact-message" className="text-sm font-semibold text-white">
                  Message
                </label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={handleChange("message")}
                  rows={6}
                  placeholder="Let us know how we can help..."
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send message"}
              </Button>
              {formStatus && (
                <p
                  className={`text-center text-sm ${
                    formStatus.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formStatus.message}
                </p>
              )}
              <p className="text-center text-xs text-gray-500">
                We only collect your contact info to respond to this request. Need immediate help? Email{" "}
                <a href="mailto:info@shopblacktshirts.com" className="text-[#F5A623] hover:text-[#E09612]">
                  info@shopblacktshirts.com
                </a>
                .
              </p>
            </form>
          </section>
        </div>
      </main>

      <Footer />
      </div>
    </>
  )
}
