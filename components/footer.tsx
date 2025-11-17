import Image from "next/image"
import { Facebook, Instagram } from "lucide-react"
import Link from "next/link"

const paymentMethods = [
  { name: "Discover", src: "/payments/discover.svg" },
  { name: "Google Pay", src: "/payments/google-pay.svg" },
  { name: "Apple Pay", src: "/payments/apple-pay.svg" },
  { name: "Diners Club", src: "/payments/diners-club.svg" },
  { name: "Mastercard", src: "/payments/mastercard.svg" },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {/* Brand */}
          <div className="flex flex-col space-y-2 text-left">
            <Link
              href="/"
              className="inline-flex items-center self-start rounded-lg bg-black py-2 shadow-lg shadow-black/40"
            >
              <Image
                src="/shopblacktshirts-logo.png"
                alt="Shopblacktshirts logo"
                width={768}
                height={768}
                className="h-14 w-auto object-contain md:h-18"
              />
            </Link>
            <p className="-mt-1 text-sm font-semibold text-gray-300">Luxury Meet Street</p>
            <p className="text-sm font-normal text-gray-400">
              Premium quality black t-shirts for the modern individual.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="mb-4 text-sm uppercase text-white"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}
            >
              Contact
            </h3>
            <ul className="space-y-2 text-sm font-normal text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-[#F5A623]">
                  info@shopblacktshirts.com
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3
              className="mb-4 text-sm uppercase text-white"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}
            >
              Policies
            </h3>
            <ul className="space-y-2 text-sm font-normal text-gray-400">
              <li>
                <Link href="/shipping" className="hover:text-[#F5A623]">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-[#F5A623]">
                  Return Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#F5A623]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#F5A623]">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3
              className="mb-4 text-sm uppercase text-white"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}
            >
              Follow Us
            </h3>
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-800 text-white transition-colors hover:border-[#F5A623] hover:text-[#F5A623]"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-800 text-white transition-colors hover:border-[#F5A623] hover:text-[#F5A623]"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-800 text-white transition-colors hover:border-[#F5A623] hover:text-[#F5A623]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
            <div className="mt-6 flex items-center gap-1">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="flex h-8 w-14 items-center justify-center rounded-md border border-gray-800 bg-white/5 p-1"
                >
                  <Image
                    src={method.src}
                    alt={`${method.name} logo`}
                    width={56}
                    height={32}
                    className="h-6 w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-800 pt-6 text-center text-xs font-normal text-gray-400 md:mt-8 md:pt-8 md:text-sm">
          <p>&copy; {new Date().getFullYear()} Shopblacktshirts. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
