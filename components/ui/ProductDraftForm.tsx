"use client"

import { FormEvent, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import ImageUploadField from "@/components/ui/ImageUploadField"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getFreshIdToken } from "@/lib/auth-client"
import type { Product } from "@/lib/products"

export type AdminProduct = {
  id: string
  name: string | null
  slug: string | null
  price: number | null
  originalPrice: number | null
  image: string | null
  images: string[]
  description: string | null
  sizes: Product["sizes"]
  available: boolean
  categories: string[]
  limited: boolean
  soldOut: boolean
  published: boolean
  createdAt: string | null
  updatedAt: string | null
}

type DraftFormProps = {
  token?: string | null
  onSuccess?: (product: AdminProduct) => void
}

const sizeOptions: Product["sizes"] = ["S", "M", "L", "XL", "2XL"]

const collectionOptions = [
  { value: "limited-drop", label: "Limited Drop" },
  { value: "new-arrival", label: "New Arrival" },
  { value: "street-icon", label: "Street Icon" },
  { value: "you-matter", label: "You Matter" },
  { value: "purpose-faith", label: "Purpose + Faith" },
]

const initialState = {
  name: "",
  slug: "",
  price: "",
  originalPrice: "",
  image: "",
  gallery: [] as string[],
  description: "",
  collections: new Set<string>(["new-arrival"]),
  limited: false,
  soldOut: false,
  sizes: new Set<Product["sizes"][number]>(sizeOptions),
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export default function ProductDraftForm({ token, onSuccess }: DraftFormProps) {
  const { toast } = useToast()
  const [state, setState] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  const selectedCollections = useMemo(() => Array.from(state.collections), [state.collections])
  const selectedSizes = useMemo(() => Array.from(state.sizes), [state.sizes])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedName = state.name.trim()
    const trimmedSlug = (state.slug || slugify(state.name)).trim()
    const trimmedImage = state.image.trim()
    const priceValue = Number(state.price)
    const originalValue = Number(state.originalPrice || state.price)

    if (!trimmedName || !trimmedSlug || !trimmedImage || !state.description.trim()) {
      setError("Name, slug, hero image, and description are required.")
      return
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Enter a valid price greater than zero.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const authToken = token ?? (await getFreshIdToken())
      if (!authToken) {
        throw new Error("Sign in required to create products.")
      }

      const payload = {
        name: trimmedName,
        slug: trimmedSlug,
        price: priceValue,
        originalPrice: Number.isFinite(originalValue) && originalValue > 0 ? originalValue : priceValue,
        image: trimmedImage,
        images: state.gallery.length ? state.gallery : [trimmedImage],
        description: state.description.trim(),
        categories: selectedCollections.filter((item) => item !== "limited-drop"),
        limited: state.limited || state.collections.has("limited-drop"),
        soldOut: state.soldOut,
        available: !state.soldOut,
        published: true,
        sizes: selectedSizes.length ? selectedSizes : sizeOptions,
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => null)) as { error?: string; item?: AdminProduct } | null
      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "Unable to save product.")
      }

      setState(initialState)
      setSlugTouched(false)
      toast({
        title: "Product saved",
        description: `${data.item.name ?? "Product"} will now appear on the storefront.`,
      })
      onSuccess?.(data.item)
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to save product currently."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCollection = (value: string) => {
    setState((prev) => {
      const next = new Set(prev.collections)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return { ...prev, collections: next }
    })
  }

  const toggleSize = (value: Product["sizes"][number]) => {
    setState((prev) => {
      const next = new Set(prev.sizes)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return { ...prev, sizes: next }
    })
  }

  const handleNameChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }))
  }

  return (
    <Card className="border-neutral-800 bg-neutral-950 text-white">
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={state.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Limited Edition Graphic Tee"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input
                id="product-slug"
                value={state.slug}
                onFocus={() => setSlugTouched(true)}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                }
                placeholder="limited-edition-graphic-tee"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-price">Price (USD)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={state.price}
                onChange={(event) => setState((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="89.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-original">Original price</Label>
              <Input
                id="product-original"
                type="number"
                min="0"
                step="0.01"
                value={state.originalPrice}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, originalPrice: event.target.value }))
                }
                placeholder="105.00"
              />
            </div>
          </div>

          <ImageUploadField
            label="Hero image"
            description="Upload the primary image that appears in cards, hero banners, and product detail pages."
            value={state.image}
            onChange={(url) => setState((prev) => ({ ...prev, image: url }))}
          />
          <ImageUploadField
            mode="multiple"
            label="Gallery images"
            description="Upload supporting images or alternate angles. The first image becomes the default gallery photo."
            value={state.gallery}
            onChange={(urls) => setState((prev) => ({ ...prev, gallery: urls }))}
          />

          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              rows={4}
              value={state.description}
              onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Premium cotton tee with limited-run graphic."
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-neutral-800 p-4">
              <p className="text-sm font-semibold text-white">Collections</p>
              <div className="grid gap-2">
                {collectionOptions.map((collection) => (
                  <label key={collection.value} className="flex items-center gap-3 text-sm text-gray-300">
                    <Checkbox
                      id={`collection-${collection.value}`}
                      checked={state.collections.has(collection.value)}
                      onCheckedChange={() => toggleCollection(collection.value)}
                    />
                    {collection.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-neutral-800 p-4">
              <p className="text-sm font-semibold text-white">Sizes</p>
              <div className="flex flex-wrap gap-3">
                {sizeOptions.map((size) => (
                  <label key={size} className="flex items-center gap-2 text-sm text-gray-300">
                    <Checkbox
                      id={`size-${size}`}
                      checked={state.sizes.has(size)}
                      onCheckedChange={() => toggleSize(size)}
                    />
                    {size}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <Checkbox
                id="limited-flag"
                checked={state.limited}
                onCheckedChange={(value) => setState((prev) => ({ ...prev, limited: value === true }))}
              />
              Flag as limited drop
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <Checkbox
                id="sold-out-flag"
                checked={state.soldOut}
                onCheckedChange={(value) => setState((prev) => ({ ...prev, soldOut: value === true }))}
              />
              Mark as sold out
            </label>
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

