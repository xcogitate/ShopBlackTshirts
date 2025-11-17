import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import { Inter } from "next/font/google"

import CartDrawer from "@/components/ui/CartDrawer"
import { CookieConsentBanner } from "@/components/ui/CookieConsentBanner"
import { CartProvider } from "@/components/ui/cart-context"

const inter = Inter({ subsets: ["latin"] })

const siteUrl = "https://www.shopblacktshirts.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ShopBlackTShirts | Luxury Meets Street",
    template: "%s | ShopBlackTShirts",
  },
  description:
    "ShopBlackTShirts delivers limited-edition black tees and premium streetwear essentials inspired by purpose, faith, and culture.",
  keywords: [
    "black t-shirts",
    "luxury streetwear",
    "limited edition tees",
    "ShopBlackTShirts",
    "urban apparel",
    "faith inspired fashion",
    "premium cotton shirts",
    "street fashion drops",
  ],
  authors: [{ name: "ShopBlackTShirts" }],
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.ico" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "ShopBlackTShirts | Luxury Meets Street",
    description:
      "Discover limited drops of premium black t-shirts that blend luxury craftsmanship with bold street energy.",
    url: siteUrl,
    siteName: "ShopBlackTShirts",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ShopBlackTShirts hero" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopBlackTShirts | Luxury Meets Street",
    description: "Limited black tees, premium fabrics, and daily-wear statements from ShopBlackTShirts.",
    images: ["/og-image.jpg"],
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ShopBlackTShirts",
  url: siteUrl,
  logo: `${siteUrl}/shopblacktshirts-logo.png`,
  sameAs: [
    "https://www.instagram.com/shopblacktshirts",
    "https://www.facebook.com/shopblacktshirts",
    "https://www.tiktok.com/@shopblacktshirts",
  ],
  description:
    "ShopBlackTShirts creates limited edition black t-shirts and streetwear inspired by culture, purpose, and faith.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <CartProvider>
          {children}
          <CartDrawer />
          <CookieConsentBanner />
        </CartProvider>
        <Script
          id="ld-json-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </body>
    </html>
  )
}
