'use client'

import { usePathname } from "next/navigation"

const messages = [
  "Free shipping on U.S. orders over $75",
  "Limited drop live now",
  "Premium black tees. New arrivals weekly",
]

export default function ScrollBanner() {
  const pathname = usePathname()
  if (pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <div className="bg-[#F5A623] text-black">
      <div className="relative overflow-hidden border-b border-black/10">
        <div className="scroll-banner-track">
          {[...messages, ...messages].map((message, index) => (
            <span
              key={`${message}-${index}`}
              className="px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] whitespace-nowrap md:px-10 md:text-sm"
            >
              {message}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
