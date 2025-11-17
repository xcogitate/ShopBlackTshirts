// /lib/products.ts
export type Product = {
  id: string
  slug: string
  name: string
  price: number
  originalPrice: number
  image: string            // primary image
  images: string[]         // gallery
  description: string
  sizes: ("S" | "M" | "L" | "XL" | "2XL")[]
  available: boolean
  categories: string[]     // e.g., ["new-arrival", "you-matter"]
  /**
   * Limited-order items (true) use the urgency/counter page at /product/[slug].
   * Regular items (false or undefined) use the basic page at /p/[slug].
   */
  limited?: boolean
  soldOut?: boolean
  features?: string[]
}

export const products: Product[] = [
  {
    id: "1",
    slug: "man-pearl-white-cotton-cloth",
    name: "Man Pearl white cotton cloth",
    price: 99.0,
    originalPrice: 110.0,
    image: "/man-in-orange-t-shirt-smiling-with-arms-crossed.jpg",
    images: [
      "/man-in-orange-t-shirt-smiling-with-arms-crossed.jpg",
      "/man-in-black-graphic-tshirt.jpg",
      "/man-black-tshirt.png",
    ],
    description:
      "Ultra-soft 100% cotton tee with a clean, everyday fit. Breathable, durable, and ready for street layering.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["new-arrival", "street-icon"],
    limited: false,
  },
  {
    id: "2",
    slug: "man-yellow-hoodies-cotton-cloth-1",
    name: "Man Yellow Hoodies cotton cloth",
    price: 99.0,
    originalPrice: 110.0,
    image: "/excited-man-with-headphones-pointing-at-phone.jpg",
    images: [
      "/excited-man-with-headphones-pointing-at-phone.jpg",
      "/man-in-black-graphic-tshirt.jpg",
      "/man-in-black-polo.jpg",
    ],
    description:
      "Premium cotton fleece with a modern hood silhouette. Cozy interior, reinforced seams, built for daily wear.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["new-arrival", "street-icon"],
    limited: false,
  },
  {
    id: "3",
    slug: "man-yellow-hoodies-cotton-cloth-2",
    name: "Man Yellow Hoodies cotton cloth",
    price: 99.0,
    originalPrice: 110.0,
    image: "/happy-man-in-yellow-hoodie.jpg",
    images: [
      "/happy-man-in-yellow-hoodie.jpg",
      "/man-in-black-graphic-tshirt.jpg",
      "/man-black-tshirt.png",
    ],
    description:
      "Soft-hand feel with heavyweight cotton. Street-ready hood and rib trims for structure.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["new-arrival"],
    limited: false,
  },
  {
    id: "4",
    slug: "man-orange-hoodies-cotton-cloth",
    name: "Man Orange Hoodies cotton cloth",
    price: 99.0,
    originalPrice: 210.0,
    image: "/smiling-man-in-orange-hoodie.jpg",
    images: [
      "/smiling-man-in-orange-hoodie.jpg",
      "/man-in-black-graphic-tshirt.jpg",
      "/man-in-black-polo.jpg",
    ],
    description:
      "Statement color, classic hoodie form. Plush interior and double-needle stitching for longevity.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["new-arrival", "street-icon"],
    limited: false,
  },
  {
    id: "5",
    slug: "man-yellow-sweater-bow-tie",
    name: "Man Yellow Hoodies cotton cloth",
    price: 99.0,
    originalPrice: 110.0,
    image: "/cheerful-man-in-yellow-sweater-with-bow-tie.jpg",
    images: [
      "/cheerful-man-in-yellow-sweater-with-bow-tie.jpg",
      "/man-in-black-graphic-tshirt.jpg",
      "/man-black-tshirt.png",
    ],
    description:
      "Elevated knit with a minimalist vibe. Smooth hand and tailored drape for smart-casual looks.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["new-arrival"],
    limited: false,
  },
  {
    id: "6",
    slug: "you-matter-premium-black-tee",
    name: "You Matter – Premium Black Tee",
    price: 79.0,
    originalPrice: 95.0,
    image: "/man-black-tshirt.png",
    images: ["/man-black-tshirt.png", "/man-in-black-graphic-tshirt.jpg"],
    description:
      "Signature Shopblacktshirts message print on 100% ring-spun cotton. Soft, durable, and made to uplift.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["you-matter", "all"],
    limited: false,
  },
  {
    id: "7",
    slug: "faith-over-fear-black-polo",
    name: "Faith Over Fear – Black Polo",
    price: 129.0,
    originalPrice: 150.0,
    image: "/man-in-black-polo.jpg",
    images: ["/man-in-black-polo.jpg", "/man-in-black-graphic-tshirt.jpg"],
    description:
      "Refined pique polo with ‘Faith Over Fear’ chest mark. Clean collar line and premium cotton blend.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["purpose-faith", "all"],
    limited: false,
  },
  {
    id: "8",
    slug: "purpose-driven-graphic-tee",
    name: "Purpose Driven – Graphic Tee",
    price: 89.0,
    originalPrice: 105.0,
    image: "/man-in-black-graphic-tshirt.jpg",
    images: ["/man-in-black-graphic-tshirt.jpg", "/man-black-tshirt.png"],
    description:
      "Bold front graphic with a clean street profile. Soft-touch print on heavyweight cotton.",
    sizes: ["S", "M", "L", "XL", "2XL"],
    available: true,
    categories: ["purpose-faith", "street-icon", "all"],
    limited: false,
  },
]

// --- Helpers ---
export function getAllProducts() {
  return products
}

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getRelatedProducts(slug: string, limit = 4) {
  const current = getProductBySlug(slug)
  if (!current) return []
  const pool = products.filter(
    (p) => p.slug !== slug && p.categories.some((c) => current.categories.includes(c))
  )
  return pool.slice(0, limit)
}
