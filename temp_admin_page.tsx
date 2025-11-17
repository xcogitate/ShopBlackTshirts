"use client"

import { useMemo, useState } from "react"
import type { ComponentType, FormEventHandler } from "react"
import {
  LayoutDashboard,
  Package2,
  ShoppingBag,
  BarChart3,
  LogOut,
  Sparkles,
  Layers3,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { products as catalogProducts, type Product } from "@/lib/products"

type SectionKey = "dashboard" | "store" | "orders" | "analytics" | "logout"

type StoreKey =
  | "limited-drop"
  | "new-arrival"
  | "you-matter"
  | "purpose-faith"
  | "street-icon"

type DraftProduct = Product & { createdAt: string }

const storeCollections: {
  key: StoreKey
  label: string
  description: string
  helper?: string
}[] = [
  {
    key: "limited-drop",
    label: "Limited Drop",
    description: "Time-bound exclusive products to build urgency.",
    helper: "Toggle Limited item when adding a product.",
  },
  {
    key: "new-arrival",
    label: "New Arrival Collection",
    description: "Freshly added pieces highlighted across the site.",
  },
  {
    key: "you-matter",
    label: "You Matter Collection",
    description: "Core message-driven designs championing positivity.",
  },
  {
    key: "purpose-faith",
    label: "Purpose + Faith Collection",
    description: "Faith-led statement tees for daily inspiration.",
  },
  {
    key: "street-icon",
    label: "Street Icon Collection",
    description: "Urban staples designed for everyday legends.",
  },
]

const navItems: { key: SectionKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "store", label: "Store", icon: Package2 },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "logout", label: "Logout", icon: LogOut },
]

const initialFormState = {
  name: "",
  slug: "",
  price: "",
  originalPrice: "",
  image: "",
  gallery: "",
  description: "",
  categories: [] as StoreKey[],
  limited: false,
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard")
  const [activeStoreTab, setActiveStoreTab] = useState<StoreKey>("new-arrival")
  const [formState, setFormState] = useState(initialFormState)
  const [products, setProducts] = useState<DraftProduct[]>(
    () =>
      catalogProducts.map((item) => ({
        ...item,
        createdAt: new Date().toISOString(),
      })) as DraftProduct[],
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const total = products.length
    const byCollection = {
      limited: products.filter((p) => p.limited).length,
      newArrival: products.filter((p) => p.categories.includes("new-arrival")).length,
      youMatter: products.filter((p) => p.categories.includes("you-matter")).length,
      purposeFaith: products.filter((p) => p.categories.includes("purpose-faith")).length,
      streetIcon: products.filter((p) => p.categories.includes("street-icon")).length,
    }

    return { total, ...byCollection }
  }, [products])

  const filteredProducts = useMemo(() => {
    switch (activeStoreTab) {
      case "limited-drop":
        return products.filter((p) => p.limited)
      case "new-arrival":
        return products.filter((p) => p.categories.includes("new-arrival"))
      case "you-matter":
        return products.filter((p) => p.categories.includes("you-matter"))
      case "purpose-faith":
        return products.filter((p) => p.categories.includes("purpose-faith"))
      case "street-icon":
        return products.filter((p) => p.categories.includes("street-icon"))
      default:
        return products
    }
  }, [activeStoreTab, products])

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const toggleCategory = (key: StoreKey) => {
    setFormState((prev) => {
      const exists = prev.categories.includes(key)
      const categories = exists ? prev.categories.filter((c) => c !== key) : [...prev.categories, key]
      return { ...prev, categories }
    })
  }

  const mapStoreKeyToCatalogKey = (key: StoreKey) => {
    switch (key) {
      case "limited-drop":
        return "limited"
      case "new-arrival":
        return "new-arrival"
      case "you-matter":
        return "you-matter"
      case "purpose-faith":
        return "purpose-faith"
      case "street-icon":
        return "street-icon"
    }
  }

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!formState.name.trim()) {
      setFormError("Product name is required.")
      return
    }
    if (!formState.slug.trim()) {
      setFormError("Slug is required so the storefront can link to the product.")
      return
    }
    if (!formState.price || Number.isNaN(Number(formState.price))) {
      setFormError("Enter a valid numeric price.")
      return
    }
    if (!formState.image.trim()) {
      setFormError("Primary image URL is required.")
      return
    }

    const nextProduct: DraftProduct = {
      id: Date.now(),
      name: formState.name.trim(),
      slug: formState.slug.trim(),
      price: Number(formState.price),
      originalPrice: formState.originalPrice ? Number(formState.originalPrice) : Number(formState.price),
      image: formState.image.trim(),
      images: formState.gallery
        .split(",")
        .map((img) => img.trim())
        .filter(Boolean),
      description: formState.description.trim() || "Product description coming soon.",
      sizes: ["S", "M", "L", "XL", "2XL"],
      available: true,
      categories: formState.categories
        .filter((key) => key !== "limited-drop")
        .map((key) => mapStoreKeyToCatalogKey(key)!),
      limited: formState.limited,
      createdAt: new Date().toISOString(),
    }

    setProducts((prev) => [nextProduct, ...prev])
    setFormState(initialFormState)
    setFormSuccess("Product drafted successfully. Sync with your backend to publish storefront updates.")
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-400">
          Monitor product health, track launches, and manage storefront content from one control panel.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
            <CardDescription>Live + drafted items available across collections.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Limited Drops</CardTitle>
            <CardDescription>Ready for urgency campaign rollouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 text-4xl font-bold text-white">
              {metrics.limited}
              <Badge variant="secondary" className="bg-[#F5A623]/10 text-[#F5A623]">
                {metrics.limited > 0 ? "Active" : "Plan Next"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>New Arrival Collection</CardTitle>
            <CardDescription>Products boosting first-impression conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.newArrival}</div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Street Icon Designs</CardTitle>
            <CardDescription>Statement pieces fueling repeat engagement.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{metrics.streetIcon}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Launch Checklist</CardTitle>
            <CardDescription>Keep upcoming drops aligned with marketing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
              <Sparkles className="mt-1 h-4 w-4 text-[#F5A623]" />
              <div>
                <p className="font-semibold text-white">Prep product storytelling</p>
                <p>Align copy, visuals, and landing experience before publishing a limited drop.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
              <Layers3 className="mt-1 h-4 w-4 text-[#F5A623]" />
              <div>
                <p className="font-semibold text-white">Verify size inventory</p>
                <p>Cross-check SKU quantities with fulfillment before toggling availability.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
              <ShoppingBag className="mt-1 h-4 w-4 text-[#F5A623]" />
              <div>
                <p className="font-semibold text-white">Update marketing calendar</p>
                <p>Schedule email, SMS, and social updates in sync with new arrivals.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Latest Activity</CardTitle>
            <CardDescription>Automatic log of recent admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-300">
            {products.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="flex items-start justify-between rounded-lg border border-neutral-800 bg-neutral-950/70 p-4"
              >
                <div>
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="text-xs text-gray-500">/{product.slug}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(product.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderStore = () => (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Store Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Draft new products, organize collections, and preview storefront visibility in one workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SidebarTrigger className="lg:hidden" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Create Product Draft</CardTitle>
            <CardDescription>
              Complete the form and hand-off to your headless backend or CMS sync workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Purpose Driven Premium Tee"
                  value={formState.name}
                  onChange={(event) => handleFormChange("name", event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  placeholder="purpose-driven-premium-tee"
                  value={formState.slug}
                  onChange={(event) => handleFormChange("slug", event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-3">
                  <Label htmlFor="product-price">Price</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="79"
                    value={formState.price}
                    onChange={(event) => handleFormChange("price", event.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="product-original-price">Compare at Price</Label>
                  <Input
                    id="product-original-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="95"
                    value={formState.originalPrice}
                    onChange={(event) => handleFormChange("originalPrice", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="product-image">Primary Image URL</Label>
                <Input
                  id="product-image"
                  placeholder="/uploads/purpose-driven-tee.png"
                  value={formState.image}
                  onChange={(event) => handleFormChange("image", event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="product-gallery">Gallery Images (comma separated)</Label>
                <Textarea
                  id="product-gallery"
                  placeholder="/gallery/frame-1.png, /gallery/frame-2.png"
                  value={formState.gallery}
                  onChange={(event) => handleFormChange("gallery", event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="product-description">Short Description</Label>
                <Textarea
                  id="product-description"
                  rows={4}
                  placeholder="Tell the story behind this design and call out key fabric details."
                  value={formState.description}
                  onChange={(event) => handleFormChange("description", event.target.value)}
                />
              </div>
              <div className="grid gap-4">
                <Label>Assign to Collections</Label>
                <div className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-gray-300">
                  {storeCollections.map((collection) => (
                    <label
                      key={collection.key}
                      className="flex items-start gap-3 rounded-lg border border-transparent p-3 hover:border-neutral-800 hover:bg-neutral-900/60"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border border-neutral-700 bg-neutral-800 text-[#F5A623] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5A623]"
                        checked={formState.categories.includes(collection.key)}
                        onChange={() => toggleCategory(collection.key)}
                      />
                      <div>
                        <p className="font-semibold text-white">{collection.label}</p>
                        <p className="text-xs text-gray-500">{collection.description}</p>
                      </div>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 rounded-lg border border-neutral-800/60 bg-neutral-900/60 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-neutral-700 bg-neutral-800 text-[#F5A623] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5A623]"
                      checked={formState.limited}
                      onChange={(event) => handleFormChange("limited", event.target.checked)}
                    />
                    <div>
                      <p className="font-semibold text-white">Mark as Limited Drop</p>
                      <p className="text-xs text-gray-500">
                        Limited products surface in scarce drop experiences across the site.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {formError && <p className="text-sm font-medium text-red-400">{formError}</p>}
              {formSuccess && <p className="text-sm font-medium text-emerald-400">{formSuccess}</p>}

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFormState(initialFormState)
                    setFormError(null)
                    setFormSuccess(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Reset
                </Button>
                <Button type="submit" className="bg-[#F5A623] text-black hover:bg-[#E09612]">
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Collection Preview</CardTitle>
                <CardDescription>
                  Switch between collections to audit what the storefront will surface.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {storeCollections.map((collection) => (
                  <Button
                    key={collection.key}
                    type="button"
                    variant={collection.key === activeStoreTab ? "default" : "ghost"}
                    className={
                      collection.key === activeStoreTab
                        ? "bg-[#F5A623] text-black hover:bg-[#E09612]"
                        : "text-gray-400 hover:text-white"
                    }
                    onClick={() => {
                      setActiveStoreTab(collection.key)
                      setActiveSection("store")
                    }}
                  >
                    {collection.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center">
                  <Package2 className="h-8 w-8 text-gray-600" />
                  <div>
                    <p className="text-sm font-semibold text-white">No products in this collection yet</p>
                    <p className="text-sm text-gray-500">
                      Add items on the left, then link this form to your CMS or database sync.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col">
                          <h3 className="text-base font-semibold text-white">{product.name}</h3>
                          <p className="text-xs text-gray-500">/{product.slug}</p>
                        </div>
                        {product.limited && (
                          <Badge className="bg-[#F5A623]/10 text-[#F5A623]">Limited</Badge>
                        )}
                      </div>
                      <Separator className="my-3 border-neutral-800" />
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Price</span>
                          <span className="text-white">${product.price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {product.categories.map((category) => (
                            <Badge key={category} variant="secondary" className="bg-neutral-800/80 text-gray-200">
                              {category.replace("-", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderOrders = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Orders</h1>
        <p className="mt-2 text-sm text-gray-400">
          Integrate your commerce provider to populate this view with live transaction data.
        </p>
      </div>
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
          <CardDescription>Standing in until your checkout pipeline is connected.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-12 text-center">
            <ShoppingBag className="h-8 w-8 text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-white">No orders synced yet</p>
              <p className="text-sm text-gray-500">
                Connect Shopify, Stripe, or your transactional API to hydrate this dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Analytics</h1>
        <p className="mt-2 text-sm text-gray-400">
          Sync your analytics provider to monitor traffic, conversion, and average order trends.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Projected Monthly Revenue</CardTitle>
            <CardDescription>Estimate based on current product mix and average order value.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">$9.4k</div>
            <p className="mt-2 text-sm text-emerald-400">+12% vs. last 30 days</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Returning Customer Rate</CardTitle>
            <CardDescription>Measure loyalty across drops and collections.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">38%</div>
            <p className="mt-2 text-sm text-gray-400">Target 40%+ for sustained growth.</p>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle>Top Performing Collection</CardTitle>
            <CardDescription>Based on conversion rate and sell-through velocity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">Purpose + Faith</div>
            <p className="mt-2 text-sm text-gray-400">
              Align fresh designs and storytelling to expand this momentum.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Plug in GA4, Postscript, or your BI warehouse for live tracking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-300">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
            <p className="font-semibold text-white">1. Connect your analytics source</p>
            <p className="text-gray-500">Expose a metrics API or drop CSV exports for quick ingestion.</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
            <p className="font-semibold text-white">2. Define tracking goals</p>
            <p className="text-gray-500">
              Map product launch cadences to campaign KPIs so you can compare drops.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
            <p className="font-semibold text-white">3. Automate reporting</p>
            <p className="text-gray-500">
              Schedule weekly snapshots delivered to your ops team and founders.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderLogout = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Logout</h1>
        <p className="mt-2 text-sm text-gray-400">
          Connect this action to your authentication layer to invalidate sessions or tokens.
        </p>
      </div>
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle>Sign out of Admin</CardTitle>
          <CardDescription>Protect sensitive product and order information on shared devices.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full bg-neutral-800 text-sm font-semibold text-white hover:bg-neutral-700 md:w-60"
            type="button"
          >
            Logout (wire this to your auth)
          </Button>
          <p className="text-xs text-gray-500">
            Tip: Pair this view with Clerk, Auth0, or Supabase auth to manage role-based access.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard()
      case "store":
        return renderStore()
      case "orders":
        return renderOrders()
      case "analytics":
        return renderAnalytics()
      case "logout":
        return renderLogout()
      default:
        return null
    }
  }

  return (
    <SidebarProvider>
      <div className="bg-black text-white">
        <Sidebar className="bg-neutral-950">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Shopblacktshirts
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeSection === item.key}
                          onClick={() => {
                            if (item.key === "store") {
                              setActiveStoreTab("new-arrival")
                            }
                            setActiveSection(item.key)
                          }}
                        >
                          <button className="flex w-full items-center gap-3 text-sm text-gray-300">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        </SidebarMenuButton>
                        {item.key === "store" && activeSection === "store" && (
                          <SidebarMenuSub>
                            {storeCollections.map((collection) => (
                              <SidebarMenuSubItem key={collection.key}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={activeStoreTab === collection.key}
                                  onClick={() => {
                                    setActiveSection("store")
                                    setActiveStoreTab(collection.key)
                                  }}
                                >
                                  <button className="flex w-full items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
                                    <span>{collection.label}</span>
                                  </button>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-neutral-900 px-4 py-6 text-xs text-gray-500">
            Last sync TBD — hook into your CMS or API deployment pipeline.
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-neutral-900 bg-black/80 px-6 backdrop-blur">
            <SidebarTrigger className="text-gray-400 hover:text-white lg:hidden" />
            <div className="text-sm uppercase tracking-[0.3em] text-gray-500">Admin Portal</div>
          </header>
          <main className="px-6 py-8">{renderActiveSection()}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}



