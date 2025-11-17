"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getFreshIdToken } from "@/lib/auth-client"
import type { AdminProduct } from "@/components/ui/ProductDraftForm"

type CollectionFilter = "limited-drop" | "new-arrival" | "you-matter" | "purpose-faith" | "street-icon"

type ProductPreviewListProps = {
  token?: string | null
  products?: AdminProduct[]
  onMutate?: () => void
  filterKey?: CollectionFilter | null
}

const statusCopy = {
  published: { label: "Published", className: "bg-emerald-500/15 text-emerald-300" },
  draft: { label: "Draft", className: "bg-yellow-500/15 text-yellow-300" },
  hidden: { label: "Hidden", className: "bg-gray-500/10 text-gray-300" },
  soldOut: { label: "Sold out", className: "bg-red-500/20 text-red-300" },
}

const formatCurrency = (value: number | null | undefined, currency = "USD") => {
  if (!Number.isFinite(value ?? NaN)) return "--"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value))
}

export default function ProductPreviewList({ token, products, onMutate, filterKey }: ProductPreviewListProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<AdminProduct[]>(products ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [editState, setEditState] = useState({
    name: "",
    slug: "",
    price: "",
    originalPrice: "",
    description: "",
  })

  useEffect(() => {
    if (products) {
      setItems(products)
    }
  }, [products])

  const loadProducts = useCallback(
    async (authToken?: string | null) => {
      if (products) return
      const resolvedToken = authToken ?? token ?? (await getFreshIdToken())
      if (!resolvedToken) {
        setError("Sign in to view products.")
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/admin/products", {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        })
        const data = (await response.json().catch(() => null)) as { items?: AdminProduct[]; error?: string } | null
        if (!response.ok) {
          throw new Error(data?.error ?? "Unable to load products.")
        }
        setItems(Array.isArray(data?.items) ? data.items : [])
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unable to load products currently."
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [products, token],
  )

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const resolveToken = useCallback(async () => {
    const fresh = token ?? (await getFreshIdToken())
    if (!fresh) {
      throw new Error("Sign in required for this action.")
    }
    return fresh
  }, [token])

  const mutateProduct = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const authToken = await resolveToken()
      const response = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id, ...patch }),
      })
      const data = (await response.json().catch(() => null)) as { item?: AdminProduct; error?: string } | null
      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "Unable to update product.")
      }
      setItems((prev) => prev.map((item) => (item.id === id ? data.item! : item)))
      onMutate?.()
    },
    [resolveToken, onMutate],
  )

  const deleteProduct = useCallback(
    async (id: string) => {
      const authToken = await resolveToken()
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to delete product.")
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
      onMutate?.()
    },
    [resolveToken, onMutate],
  )

  const handleTogglePublished = async (product: AdminProduct) => {
    if (!product.id) return
    setBusyId(product.id)
    try {
      await mutateProduct(product.id, { published: !product.published })
      toast({
        title: product.published ? "Unpublished" : "Published",
        description: `${product.name ?? "Product"} visibility updated.`,
      })
    } catch (actionError) {
      toast({
        title: "Unable to update product",
        description:
          actionError instanceof Error ? actionError.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleEdit = (product: AdminProduct) => {
    setEditing(product)
    setEditState({
      name: product.name ?? "",
      slug: product.slug ?? "",
      price: product.price?.toString() ?? "",
      originalPrice: product.originalPrice?.toString() ?? "",
      description: product.description ?? "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editing?.id) return
    setBusyId(editing.id)
    try {
        await mutateProduct(editing.id, {
          name: editState.name.trim(),
          slug: editState.slug.trim() || editing.slug,
          price: Number(editState.price) || 0,
          originalPrice: Number(editState.originalPrice) || Number(editState.price) || 0,
          description: editState.description.trim(),
        })
      toast({
        title: "Product updated",
        description: `${editState.name || editing.slug} has been updated.`,
      })
      setEditing(null)
    } catch (actionError) {
      toast({
        title: "Unable to update product",
        description:
          actionError instanceof Error ? actionError.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleSoldOut = async (product: AdminProduct) => {
    if (!product.id) return
    setBusyId(product.id)
    try {
      await mutateProduct(product.id, { soldOut: !product.soldOut, available: product.soldOut })
      toast({
        title: product.soldOut ? "Marked in stock" : "Marked sold out",
        description: `${product.name ?? "Product"} inventory badge updated.`,
      })
    } catch (actionError) {
      toast({
        title: "Unable to update product",
        description:
          actionError instanceof Error ? actionError.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (product: AdminProduct) => {
    if (!product.id) return
    if (!window.confirm("Delete this product? This action cannot be undone.")) return
    setBusyId(product.id)
    try {
      await deleteProduct(product.id)
      toast({
        title: "Product deleted",
        description: `${product.name ?? "Product"} has been removed.`,
      })
    } catch (actionError) {
      toast({
        title: "Unable to delete product",
        description:
          actionError instanceof Error ? actionError.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const displayItems = useMemo(() => {
    if (!filterKey) return items
    return items.filter((product) => {
      if (!product) return false
      if (filterKey === "limited-drop") return product.limited
      const normalized = product.categories ?? []
      return normalized.includes(filterKey)
    })
  }, [items, filterKey])

  if (loading && !displayItems.length) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950/60 p-8 text-sm text-gray-400">
        Loading products...
      </div>
    )
  }

  if (error && !displayItems.length) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (!displayItems.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center">
        <div className="text-sm font-semibold text-white">No products yet</div>
        <div className="text-sm text-gray-500">Create a product to manage it here.</div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {displayItems.map((product) => {
        const status =
          product.soldOut && statusCopy.soldOut
            ? statusCopy.soldOut
            : product.published
              ? statusCopy.published
              : statusCopy.hidden

        return (
          <Card key={product.id} className="border-neutral-800 bg-neutral-950/70">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image ?? "/placeholder.svg"}
                    alt={product.name ?? "Product image"}
                    className="h-16 w-16 rounded-xl border border-neutral-800 object-cover"
                  />
                  <div>
                    <p className="text-base font-semibold text-white">{product.name ?? "Untitled product"}</p>
                    <p className="text-xs text-gray-500">{product.slug}</p>
                  </div>
                </div>
                <Badge className={status.className}>{status.label}</Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>Price</span>
                <span className="text-white">
                  {formatCurrency(product.price)}
                  {product.originalPrice && product.originalPrice > (product.price ?? 0) && (
                    <span className="ml-2 text-xs text-gray-500 line-through">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.categories?.length ? (
                  product.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="bg-neutral-900 text-gray-300">
                      {category.replace("-", " ")}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-gray-400">
                    Uncategorized
                  </Badge>
                )}
                {product.limited && <Badge className="bg-[#F5A623]/15 text-[#F5A623]">Limited</Badge>}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-700 text-gray-200 hover:bg-neutral-800"
                  disabled={busyId === product.id}
                  onClick={() => handleTogglePublished(product)}
                >
                  {product.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  className={
                    product.soldOut
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-red-500 text-white hover:bg-red-400"
                  }
                  disabled={busyId === product.id}
                  onClick={() => handleToggleSoldOut(product)}
                >
                  {product.soldOut ? "Mark In Stock" : "Mark Sold Out"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === product.id}
                  onClick={() => handleDelete(product)}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === product.id}
                  onClick={() => handleEdit(product)}
                >
                  Edit
                </Button>
              </div>

              {product.description && (
                <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
      {editing && (
        <Card className="border-neutral-800 bg-black/30">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Edit {editing.name ?? editing.slug}</p>
                <p className="text-xs text-gray-400">Update core product details without leaving the preview.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
            <Input
              placeholder="Name"
              value={editState.name}
              onChange={(event) => setEditState((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Slug"
              value={editState.slug}
              onChange={(event) => setEditState((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
                value={editState.price}
                onChange={(event) => setEditState((prev) => ({ ...prev, price: event.target.value }))}
              />
              <Input
                placeholder="Original price"
                type="number"
                min="0"
                step="0.01"
                value={editState.originalPrice}
                onChange={(event) =>
                  setEditState((prev) => ({ ...prev, originalPrice: event.target.value }))
                }
              />
            </div>
            <Textarea
              placeholder="Description"
              rows={3}
              value={editState.description}
              onChange={(event) =>
                setEditState((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={busyId === editing.id}>
                {busyId === editing.id ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

