 "use client"

import { Fragment, useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import { onAuthStateChanged } from "firebase/auth"
import {
  BarChart3,
  ChevronDown,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package2,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Truck,
  Users,
} from "lucide-react"

import AdminSignInForm from "@/components/ui/AdminSignInForm"
import AbandonedCartsSection from "@/components/admin/AbandonedCarts"
import ProductDraftForm, { type AdminProduct } from "@/components/ui/ProductDraftForm"
import ProductPreviewList from "@/components/ui/ProductPreviewList"
import CountdownSettingsCard from "@/components/ui/CountdownSettingsCard"
import SalesByLocation from "@/components/ui/SalesByLocation"
import TopProductsTable from "@/components/ui/TopProductsTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useToast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase"
import { ensureAuthTokenListener, getFreshIdToken, signOutUser } from "@/lib/auth-client"
import type { SupportTicketRecord, SupportTicketStatus } from "@/lib/server/support-store"
type AdminAddress = {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  postal_code?: string | null
  country?: string | null
}

type AdminLineItem = {
  id?: string
  description?: string | null
  quantity?: number | null
  amountTotal?: number | null
  amountSubtotal?: number | null
  currency?: string | null
}

type AdminOrder = {
  id: string
  orderNumber: string | null
  status: string
  amountTotal: number | null
  shippingTotal: number | null
  taxTotal: number | null
  currency: string | null
  customerName: string | null
  customerEmail: string | null
  shipping?: {
    name?: string | null
    phone?: string | null
    address?: AdminAddress | null
  } | null
  lineItems?: AdminLineItem[]
  checkoutCompletedAt?: string | null
  shippedAt?: string | null
  createdAt: string | null
  updatedAt: string | null
}

type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  segment?: string | null
  totalOrders: number | null
  lifetimeValue: number | null
  createdAt: string | null
  lastOrderAt: string | null
}

type SectionKey =
  | "dashboard"
  | "store"
  | "orders"
  | "customers"
  | "shipped"
  | "returns"
  | "analytics"
  | "coupons"
  | "support"
  | "abandoned"

type StoreTab = "limited-drop" | "new-arrival" | "you-matter" | "purpose-faith" | "street-icon"
type OrderAction = "accept" | "ship" | "cancel" | "delete"
type RangePreset = "7d" | "30d" | "90d"

const navItems: Array<{ key: SectionKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "store", label: "Store", icon: Package2 },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "customers", label: "Customers", icon: Users },
  { key: "shipped", label: "Shipped Items", icon: Truck },
  { key: "returns", label: "Return Items", icon: RotateCcw },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "coupons", label: "Coupon Generation", icon: TicketPercent },
  { key: "support", label: "Support Inbox", icon: LifeBuoy },
  { key: "abandoned", label: "Abandoned Carts", icon: Layers3 },
]

const storeCollections: { key: StoreTab; label: string; description: string }[] = [
  {
    key: "limited-drop",
    label: "Limited Drop",
    description: "Time-bound exclusive products to build urgency.",
  },
  {
    key: "new-arrival",
    label: "New Arrival",
    description: "Freshly added pieces highlighted across the site.",
  },
  {
    key: "you-matter",
    label: "You Matter",
    description: "Core message-driven designs championing positivity.",
  },
  {
    key: "purpose-faith",
    label: "Purpose + Faith",
    description: "Faith-led statement tees for daily inspiration.",
  },
  {
    key: "street-icon",
    label: "Street Icon",
    description: "Urban staples designed for everyday legends.",
  },
]

const formatMoney = (value: number | null | undefined, currency = "USD") => {
  if (!Number.isFinite(value ?? NaN)) return "--"
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((value ?? 0) / 100)
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return "--"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return "--"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  })
}

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10)

const getWeekStart = (date: Date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  start.setDate(start.getDate() - day)
  return start
}

const resolveOrderDate = (order: AdminOrder) => {
  const raw = order.createdAt ?? order.checkoutCompletedAt ?? order.updatedAt
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.valueOf())) return null
  return parsed
}

export default function AdminPage() {
  const { toast } = useToast()
  const [status, setStatus] = useState<"checking" | "signed-in" | "signed-out">("checking")
  const [token, setToken] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard")
  const [activeStoreTab, setActiveStoreTab] = useState<StoreTab>("limited-drop")
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [customers, setCustomers] = useState<AdminUser[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>([])
  const [supportReply, setSupportReply] = useState("")
  const [supportActionState, setSupportActionState] = useState<string | null>(null)
  const [customerActionId, setCustomerActionId] = useState<string | null>(null)
  const [expandedShippedOrders, setExpandedShippedOrders] = useState<Set<string>>(new Set())
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [salesView, setSalesView] = useState<"daily" | "weekly" | "monthly">("daily")
  const [rangePreset, setRangePreset] = useState<RangePreset | null>("30d")
  const [rangeStart, setRangeStart] = useState(() => {
    const initial = new Date()
    initial.setDate(initial.getDate() - 29)
    return formatDateInput(initial)
  })
  const [rangeEnd, setRangeEnd] = useState(() => formatDateInput(new Date()))
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedTraffic, setSelectedTraffic] = useState<string | null>(null)
  const [orderSearch, setOrderSearch] = useState("")
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountPercent: "0",
    notes: "",
    enableForNonLimited: false,
  })
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSaving, setCouponSaving] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const handlePresetChange = useCallback(
    (preset: RangePreset) => {
      const end = new Date()
      const start = new Date(end)
      if (preset === "7d") {
        start.setDate(end.getDate() - 6)
      } else if (preset === "30d") {
        start.setDate(end.getDate() - 29)
      } else {
        start.setDate(end.getDate() - 89)
      }
      setRangePreset(preset)
      setRangeStart(formatDateInput(start))
      setRangeEnd(formatDateInput(end))
    },
    [],
  )

  const loadCouponSettings = useCallback(async () => {
    setCouponLoading(true)
    setCouponError(null)
    try {
      const authToken = await getFreshIdToken()
      if (!authToken) {
        throw new Error("Sign in to load coupon settings.")
      }
      const response = await fetch("/api/admin/site-settings", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = (await response.json().catch(() => null)) as {
        coupon?: { code?: string | null; discountPercent?: number; notes?: string | null; enableForNonLimited?: boolean }
        error?: string
      } | null
      if (!response.ok || !data) {
        throw new Error(data?.error ?? "Unable to load coupon settings.")
      }
      const coupon = data.coupon ?? {}
      setCouponForm({
        code: coupon.code ?? "",
        discountPercent:
          typeof coupon.discountPercent === "number"
            ? String(Math.max(0, Math.min(100, coupon.discountPercent)))
            : "0",
        notes: coupon.notes ?? "",
        enableForNonLimited: Boolean(coupon.enableForNonLimited),
      })
    } catch (couponLoadError) {
      const message =
        couponLoadError instanceof Error
          ? couponLoadError.message
          : "Unable to load coupon settings."
      setCouponError(message)
    } finally {
      setCouponLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCouponSettings()
  }, [loadCouponSettings])

  const rangeBounds = useMemo(() => {
    let startDate = rangeStart ? new Date(`${rangeStart}T00:00:00`) : null
    let endDate = rangeEnd ? new Date(`${rangeEnd}T23:59:59.999`) : null

    if (!startDate && !endDate) {
      endDate = new Date()
      startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 29)
    } else if (!startDate && endDate) {
      startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 29)
    } else if (startDate && !endDate) {
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 29)
    }

    if (startDate && endDate && startDate > endDate) {
      const temp = startDate
      startDate = endDate
      endDate = temp
    }

    startDate?.setHours(0, 0, 0, 0)
    endDate?.setHours(23, 59, 59, 999)

    return {
      start: startDate ?? new Date(),
      end: endDate ?? new Date(),
    }
  }, [rangeStart, rangeEnd])

  const handleSaveCoupon = async () => {
    setCouponError(null)
    const discountValue = Number(couponForm.discountPercent)
    if (Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      setCouponError("Enter a discount between 0 and 100.")
      return
    }
    try {
      setCouponSaving(true)
      const authToken = await getFreshIdToken()
      if (!authToken) {
        throw new Error("Sign in to save coupon settings.")
      }
      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          coupon: {
            code: couponForm.code.trim() || null,
            discountPercent: discountValue,
            notes: couponForm.notes.trim() || null,
            enableForNonLimited: couponForm.enableForNonLimited,
          },
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        coupon?: { code?: string | null; discountPercent?: number; notes?: string | null; enableForNonLimited?: boolean }
        error?: string
      } | null
      if (!response.ok || !data?.coupon) {
        throw new Error(data?.error ?? "Unable to save coupon settings.")
      }
      setCouponForm({
        code: data.coupon.code ?? "",
        discountPercent:
          typeof data.coupon.discountPercent === "number"
            ? String(Math.max(0, Math.min(100, data.coupon.discountPercent)))
            : "0",
        notes: data.coupon.notes ?? "",
        enableForNonLimited: Boolean(data.coupon.enableForNonLimited),
      })
      toast({
        title: "Coupon saved",
        description: "Automatic discounts will apply based on your selections.",
      })
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save coupon settings."
      setCouponError(message)
    } finally {
      setCouponSaving(false)
    }
  }

  const analyticsOrders = useMemo(() => {
    const { start, end } = rangeBounds
    return orders.filter((order) => {
      const date = resolveOrderDate(order)
      if (!date) return false
      return date >= start && date <= end
    })
  }, [orders, rangeBounds])

  const rangeSummaryLabel = useMemo(() => {
    const startLabel = rangeBounds.start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    const endLabel = rangeBounds.end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return `${startLabel} – ${endLabel}`
  }, [rangeBounds])

  useEffect(() => {
    ensureAuthTokenListener()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const freshToken = await user.getIdToken()
        setToken(freshToken)
        setAdminEmail(user.email ?? null)
        setStatus("signed-in")
      } else {
        setToken(null)
        setAdminEmail(null)
        setStatus("signed-out")
      }
    })
    return () => unsubscribe()
  }, [])

  const resolveToken = useCallback(async () => {
    const active = token ?? (await getFreshIdToken())
    if (!active) throw new Error("Sign in to continue.")
    return active
  }, [token])

  const loadOrders = useCallback(
    async (authToken?: string | null) => {
      const active = authToken ?? (await resolveToken())
      const response = await fetch("/api/admin/orders?limit=120", {
        headers: { Authorization: `Bearer ${active}` },
      })
      const data = (await response.json().catch(() => null)) as { orders?: AdminOrder[]; error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to load orders.")
      setOrders(Array.isArray(data?.orders) ? data!.orders : [])
    },
    [resolveToken],
  )

  const loadProducts = useCallback(
    async (authToken?: string | null) => {
      const active = authToken ?? (await resolveToken())
      const response = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${active}` },
      })
      const data = (await response.json().catch(() => null)) as { items?: AdminProduct[]; error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to load products.")
      setProducts(Array.isArray(data?.items) ? data!.items : [])
    },
    [resolveToken],
  )

  const loadCustomers = useCallback(
    async (authToken?: string | null) => {
      const active = authToken ?? (await resolveToken())
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${active}` },
      })
      const data = (await response.json().catch(() => null)) as { users?: AdminUser[]; error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to load customers.")
      setCustomers(Array.isArray(data?.users) ? data!.users : [])
    },
    [resolveToken],
  )

  const loadSupportTickets = useCallback(
    async (authToken?: string | null) => {
      const active = authToken ?? (await resolveToken())
      const response = await fetch("/api/admin/support?limit=100", {
        headers: { Authorization: `Bearer ${active}` },
      })
      const data = (await response.json().catch(() => null)) as
        | { tickets?: SupportTicketRecord[]; error?: string }
        | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to load support tickets.")
      const tickets = Array.isArray(data?.tickets) ? data!.tickets : []
      setSupportTickets(tickets)
      setActiveTicketId((previous) => previous ?? tickets[0]?.id ?? null)
    },
    [resolveToken],
  )

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activeToken = await resolveToken()
      await Promise.all([
        loadOrders(activeToken),
        loadProducts(activeToken),
        loadCustomers(activeToken),
        loadSupportTickets(activeToken),
      ])
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : "Unable to load admin data right now."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [loadCustomers, loadOrders, loadProducts, loadSupportTickets, resolveToken])

  useEffect(() => {
    if (status === "signed-in") {
      refreshAll()
    }
  }, [status, refreshAll])

  const revenueCents = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.amountTotal ?? 0), 0),
    [orders],
  )

  const openOrders = useMemo(
    () => orders.filter((order) => (order.status ?? "").toLowerCase() !== "shipped"),
    [orders],
  )

  const shippedOrders = useMemo(
    () => orders.filter((order) => (order.status ?? "").toLowerCase() === "shipped"),
    [orders],
  )

  const returnedOrders = useMemo(
    () => orders.filter((order) => (order.status ?? "").toLowerCase() === "canceled"),
    [orders],
  )

  const dailySales = useMemo(() => {
    const buckets: { key: string; label: string; total: number; shipped: number }[] = []
    const cursor = new Date(rangeBounds.start)
    while (cursor <= rangeBounds.end) {
      const key = cursor.toISOString().slice(0, 10)
      const label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      buckets.push({ key, label, total: 0, shipped: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    const map = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    analyticsOrders.forEach((order) => {
      const date = resolveOrderDate(order)
      if (!date) return
      const key = date.toISOString().slice(0, 10)
      const bucket = map.get(key)
      if (!bucket) return
      const amount = Number(order.amountTotal ?? 0)
      bucket.total += amount
      if ((order.status ?? "").toLowerCase() === "shipped") {
        bucket.shipped += amount
      }
    })
    return buckets
  }, [analyticsOrders, rangeBounds])

  const weeklySales = useMemo(() => {
    const buckets: { key: string; label: string; total: number; shipped: number }[] = []
    const cursor = getWeekStart(new Date(rangeBounds.start))
    while (cursor <= rangeBounds.end) {
      const start = new Date(cursor)
      const end = new Date(cursor)
      end.setDate(end.getDate() + 6)
      const key = start.toISOString().slice(0, 10)
      const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      buckets.push({ key, label, total: 0, shipped: 0 })
      cursor.setDate(cursor.getDate() + 7)
    }
    const map = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    analyticsOrders.forEach((order) => {
      const date = resolveOrderDate(order)
      if (!date) return
      const start = getWeekStart(date)
      const key = start.toISOString().slice(0, 10)
      const bucket = map.get(key)
      if (!bucket) return
      const amount = Number(order.amountTotal ?? 0)
      bucket.total += amount
      if ((order.status ?? "").toLowerCase() === "shipped") {
        bucket.shipped += amount
      }
    })
    return buckets
  }, [analyticsOrders, rangeBounds])

  const monthlySales = useMemo(() => {
    const buckets: { key: string; label: string; total: number; shipped: number }[] = []
    const cursor = new Date(rangeBounds.start.getFullYear(), rangeBounds.start.getMonth(), 1)
    while (cursor <= rangeBounds.end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
      const label = cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      buckets.push({ key, label, total: 0, shipped: 0 })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    const map = new Map(buckets.map((bucket) => [bucket.key, bucket]))
    analyticsOrders.forEach((order) => {
      const date = resolveOrderDate(order)
      if (!date) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const bucket = map.get(key)
      if (!bucket) return
      const amount = Number(order.amountTotal ?? 0)
      bucket.total += amount
      if ((order.status ?? "").toLowerCase() === "shipped") {
        bucket.shipped += amount
      }
    })
    return buckets
  }, [analyticsOrders, rangeBounds])

  const salesChartData =
    salesView === "daily" ? dailySales : salesView === "weekly" ? weeklySales : monthlySales
  const maxChartValue = Math.max(...salesChartData.map((point) => point.total), 1)

  const salesByRegion = useMemo(() => {
    const totals = new Map<
      string,
      {
        total: number
        orders: AdminOrder[]
      }
    >()
    analyticsOrders.forEach((order) => {
      const address = order.shipping?.address ?? null
      const region = address?.state || address?.country || "Unknown"
      const amount = Number(order.amountTotal ?? 0) / 100
      const entry = totals.get(region) ?? { total: 0, orders: [] }
      entry.total += amount
      entry.orders.push(order)
      totals.set(region, entry)
    })
    return Array.from(totals.entries())
      .map(([label, entry]) => ({
        label,
        value: entry.total,
        details: `${entry.orders.length} orders`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [analyticsOrders])

  const trafficSources = useMemo(() => {
    const totals = new Map<
      string,
      {
        count: number
        orders: AdminOrder[]
      }
    >()
    analyticsOrders.forEach((order) => {
      const country = order.shipping?.address?.country || "Unknown"
      const entry = totals.get(country) ?? { count: 0, orders: [] }
      entry.count += 1
      entry.orders.push(order)
      totals.set(country, entry)
    })
    return Array.from(totals.entries())
      .map(([label, entry]) => ({
        label,
        value: entry.count,
        details: `${entry.orders.length} orders`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [analyticsOrders])

  const topProducts = useMemo(() => {
    const totals = new Map<
      string,
      {
        quantity: number
        revenue: number
      }
    >()
    analyticsOrders.forEach((order) => {
      const lineItems = Array.isArray(order.lineItems) ? order.lineItems : []
      lineItems.forEach((item) => {
        const name = item.description ?? "Product"
        const quantity = Number(item.quantity ?? 1)
        const revenue = Number(item.amountTotal ?? item.amountSubtotal ?? 0) / 100
        const current = totals.get(name) ?? { quantity: 0, revenue: 0 }
        current.quantity += quantity
        current.revenue += revenue
        totals.set(name, current)
      })
    })
    return Array.from(totals.entries())
      .map(([name, stats]) => ({ name, quantity: stats.quantity, revenue: stats.revenue }))
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 8)
  }, [analyticsOrders])

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()
    if (!query) return openOrders
    return openOrders.filter((order) => {
      const orderNumber = (order.orderNumber ?? order.id).toLowerCase()
      const name = (order.customerName ?? order.customerEmail ?? "").toLowerCase()
      return orderNumber.includes(query) || name.includes(query)
    })
  }, [orderSearch, openOrders])

  const filteredCustomers = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => {
      const name = (customer.displayName ?? customer.email ?? "").toLowerCase()
      return name.includes(query)
    })
  }, [customers, orderSearch])

  const handleOrderAction = async (orderId: string, action: OrderAction) => {
    try {
      const activeToken = await resolveToken()
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ orderId, action }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to update order.")
      await loadOrders(activeToken)
      toast({
        title: "Order updated",
        description: `Order ${orderId} marked as ${action}.`,
      })
    } catch (actionError) {
      toast({
        title: "Order update failed",
        description:
          actionError instanceof Error ? actionError.message : "Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm("Delete this customer record? This action cannot be undone.")) return
    setCustomerActionId(customerId)
    try {
      const activeToken = await resolveToken()
      const response = await fetch(`/api/users?id=${encodeURIComponent(customerId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to delete customer.")
      await loadCustomers(activeToken)
      toast({
        title: "Customer removed",
        description: "Profile deleted from the admin list.",
      })
    } catch (actionError) {
      toast({
        title: "Delete failed",
        description: actionError instanceof Error ? actionError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCustomerActionId(null)
    }
  }

  const handleSupportReply = async (ticketId: string) => {
    if (!supportReply.trim()) return
    setSupportActionState(ticketId)
    try {
      const activeToken = await resolveToken()
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ message: supportReply.trim() }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to send reply.")
      setSupportReply("")
      await loadSupportTickets(activeToken)
      toast({
        title: "Reply sent",
        description: "Customer has been notified.",
      })
    } catch (replyError) {
      toast({
        title: "Reply failed",
        description: replyError instanceof Error ? replyError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSupportActionState(null)
    }
  }

  const handleSupportStatusChange = async (ticketId: string, status: SupportTicketStatus) => {
    setSupportActionState(ticketId)
    try {
      const activeToken = await resolveToken()
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ status }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error ?? "Unable to update ticket.")
      await loadSupportTickets(activeToken)
      toast({
        title: "Ticket updated",
        description: `Ticket marked as ${status.replace("_", " ")}`,
      })
    } catch (statusError) {
      toast({
        title: "Update failed",
        description: statusError instanceof Error ? statusError.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setSupportActionState(null)
    }
  }

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const toggleShippedExpansion = (orderId: string) => {
    setExpandedShippedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">
            Monitor product health, track launches, and manage storefront content from one control panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300">Total revenue</CardTitle>
            <Layers3 className="h-5 w-5 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatMoney(revenueCents)}</div>
            <p className="text-xs text-gray-500">{orders.length} total orders</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300">Open orders</CardTitle>
            <ShoppingBag className="h-5 w-5 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{openOrders.length}</div>
            <p className="text-xs text-gray-500">
              {orders.filter((order) => order.status === "processing").length} processing •{" "}
              {shippedOrders.length} shipped
            </p>
          </CardContent>
        </Card>
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300">Customers</CardTitle>
            <Users className="h-5 w-5 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{customers.length}</div>
            <p className="text-xs text-gray-500">{adminEmail}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300">Support</CardTitle>
            <LifeBuoy className="h-5 w-5 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{supportTickets.length}</div>
            <p className="text-xs text-gray-500">
              {supportTickets.filter((ticket) => ticket.status !== "closed").length} open cases
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-neutral-500" />
              Launch checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-400">
            <div className="rounded-xl border border-neutral-900 bg-black/40 p-4">
              <p className="font-semibold text-white">Prep product storytelling</p>
              <p>Align copy, visuals, and landing experience before publishing a limited drop.</p>
            </div>
            <div className="rounded-xl border border-neutral-900 bg-black/40 p-4">
              <p className="font-semibold text-white">Verify SKU inventory</p>
              <p>Cross-check fulfillment counts before toggling availability.</p>
            </div>
            <div className="rounded-xl border border-neutral-900 bg-black/40 p-4">
              <p className="font-semibold text-white">Update marketing calendar</p>
              <p>Schedule email, SMS, and social updates in sync with new arrivals.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle>Latest activity</CardTitle>
            <CardDescription>Automatic log of recent admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-300">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-start justify-between rounded-lg border border-neutral-900 bg-black/40 px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-white">
                    {order.customerName ?? order.customerEmail ?? "Shopper"}
                  </p>
                  <p className="text-xs text-gray-500">#{order.orderNumber ?? order.id.slice(0, 8)}</p>
                </div>
                <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
              </div>
            ))}
            {!orders.length && <p className="text-xs text-gray-500">No activity recorded yet.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  )

  const renderStore = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Store Management</h1>
          <p className="text-sm text-gray-400">
            Draft, organize, and preview storefront products in one workspace.
          </p>
        </div>
        <SidebarTrigger className="lg:hidden" />
      </div>
      <CountdownSettingsCard />
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Create product draft</CardTitle>
          <CardDescription>Complete the form and hand-off to your backend sync workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductDraftForm onSuccess={() => loadProducts()} />
        </CardContent>
      </Card>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Product preview</CardTitle>
          <CardDescription>Use this to audit what the storefront will surface.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductPreviewList />
        </CardContent>
      </Card>
    </div>
  )

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Orders</h1>
          <p className="mt-2 text-sm text-gray-400">Track incoming purchases and prep them for fulfillment.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Input
            placeholder="Search orders"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            className="w-full bg-neutral-950 text-sm text-white placeholder:text-gray-500 sm:w-64"
          />
          <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Order queue</CardTitle>
          <CardDescription>Only orders not marked as shipped.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-neutral-900 text-xs uppercase tracking-[0.2em] text-gray-500">
                  <th className="py-3 pr-3"></th>
                  <th className="py-3 pr-3 font-semibold">Order #</th>
                  <th className="py-3 pr-3 font-semibold">Customer</th>
                  <th className="py-3 pr-3 font-semibold">Address</th>
                  <th className="py-3 pr-3 font-semibold">State</th>
                  <th className="py-3 pr-3 font-semibold">Zip</th>
                  <th className="py-3 pr-3 font-semibold">Total</th>
                  <th className="py-3 pr-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredOrders.map((order) => {
                  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : []
                  const isExpanded = expandedOrders.has(order.id)
                  const address = order.shipping?.address ?? {}
                  const addressLine = [address.line1, address.line2, address.city].filter(Boolean).join(", ")
                  const stateValue = address.state ?? ""
                  const postalRaw = address.postalCode ?? address.postal_code
                  const postal = typeof postalRaw === "number" ? String(postalRaw) : postalRaw ?? ""
                  const status = (order.status ?? "").toLowerCase()
                  const canAccept = status === "paid"
                  const canShip = status === "processing"
                  const canCancel = status === "paid" || status === "processing"
                  return (
                    <Fragment key={order.id}>
                      <tr className="align-top text-sm">
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
                            aria-label={isExpanded ? "Hide order items" : "Show order items"}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-white">
                          #{order.orderNumber ?? order.id.slice(0, 8)}
                          <span className="ml-2 text-xs font-normal text-gray-500">{formatDate(order.createdAt)}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-white">
                            {order.customerName ?? order.customerEmail ?? "Shopper"}
                          </p>
                          <p className="text-xs text-gray-500">{order.customerEmail ?? "—"}</p>
                        </td>
                        <td className="py-3 pr-3">{addressLine || "—"}</td>
                        <td className="py-3 pr-3">{stateValue || "—"}</td>
                        <td className="py-3 pr-3">{postal || "—"}</td>
                        <td className="py-3 pr-3 text-white">{formatMoney(order.amountTotal)}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-2">
                            {canAccept && (
                              <Button size="sm" variant="outline" onClick={() => handleOrderAction(order.id, "accept")}>
                                Accept
                              </Button>
                            )}
                            {canShip && (
                              <Button size="sm" variant="outline" onClick={() => handleOrderAction(order.id, "ship")}>
                                Mark shipped
                              </Button>
                            )}
                            {canCancel && (
                              <Button size="sm" variant="ghost" onClick={() => handleOrderAction(order.id, "cancel")}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-black/30 px-4 py-4">
                            <div className="space-y-3 rounded-lg border border-neutral-900/70 p-4 text-gray-300">
                              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500">
                                <span>Items in order</span>
                                <Badge variant="secondary" className="bg-neutral-800 text-gray-200">
                                  {(order.status ?? "").toLowerCase() || "paid"}
                                </Badge>
                              </div>
                              {lineItems.length ? (
                                <div className="space-y-3">
                                  {lineItems.map((item, index) => {
                                    const quantity = Number(item.quantity ?? 1)
                                    const amount = Number(item.amountTotal ?? item.amountSubtotal ?? 0)
                                    return (
                                      <div
                                        key={item.id ?? `${order.id}-${index}`}
                                        className="flex items-start justify-between text-sm"
                                      >
                                        <div>
                                          <p className="font-semibold text-white">
                                            {item.description ?? `Line item ${index + 1}`}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Qty {Number.isFinite(quantity) ? quantity : 1}
                                          </p>
                                        </div>
                                        <div className="text-right text-white">{formatMoney(amount)}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No item details synced for this order yet.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {!filteredOrders.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                      No orders awaiting fulfillment. Connect your commerce provider to sync live data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Customers</h1>
          <p className="mt-2 text-sm text-gray-400">
            Connect this dataset to your CRM or identity layer to keep records live.
          </p>
        </div>
        <Input
          placeholder="Search customers"
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          className="w-full bg-neutral-950 text-sm text-white placeholder:text-gray-500 sm:w-64"
        />
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>Sorted by total orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-neutral-900 text-xs uppercase tracking-[0.2em] text-gray-500">
                  <th className="py-3 pr-3 font-semibold">Name</th>
                  <th className="py-3 pr-3 font-semibold">Registered email</th>
                  <th className="py-3 pr-3 font-semibold">Date registered</th>
                  <th className="py-3 pr-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-3 pr-3 font-semibold text-white">
                      {customer.displayName ?? customer.email ?? "Shopper"}
                    </td>
                    <td className="py-3 pr-3 text-gray-400">{customer.email ?? "—"}</td>
                    <td className="py-3 pr-3">{formatDate(customer.createdAt)}</td>
                    <td className="py-3 pr-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={customerActionId === customer.id}
                        onClick={() => handleDeleteCustomer(customer.id)}
                      >
                        {customerActionId === customer.id ? "Deleting..." : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredCustomers.length && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                      No customers yet. Sync your CRM or checkout provider to populate this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderShipped = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Shipped items</h1>
        <p className="text-sm text-gray-400">Orders marked as fulfilled.</p>
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Shipped orders</CardTitle>
          <CardDescription>Total of {shippedOrders.length} shipments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-neutral-900 text-xs uppercase tracking-[0.2em] text-gray-500">
                  <th className="py-3 pr-3"></th>
                  <th className="py-3 pr-3 font-semibold">Order #</th>
                  <th className="py-3 pr-3 font-semibold">Customer</th>
                  <th className="py-3 pr-3 font-semibold">Address</th>
                  <th className="py-3 pr-3 font-semibold">State</th>
                  <th className="py-3 pr-3 font-semibold">Zip</th>
                  <th className="py-3 pr-3 font-semibold">Total</th>
                  <th className="py-3 pr-3 font-semibold">Shipped on</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {shippedOrders.map((order) => {
                  const address = order.shipping?.address ?? {}
                  const addressLine = [address.line1, address.line2, address.city].filter(Boolean).join(", ")
                  const stateValue = address.state ?? ""
                  const postalRaw = address.postalCode ?? address.postal_code
                  const postal = typeof postalRaw === "number" ? String(postalRaw) : postalRaw ?? ""
                  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : []
                  const isExpanded = expandedShippedOrders.has(order.id)
                  return (
                    <Fragment key={order.id}>
                      <tr>
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => toggleShippedExpansion(order.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-white/40"
                            aria-label={isExpanded ? "Hide shipped items" : "Show shipped items"}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-white">
                          #{order.orderNumber ?? order.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-white">
                            {order.customerName ?? order.customerEmail ?? "Shopper"}
                          </p>
                          <p className="text-xs text-gray-500">{order.customerEmail ?? "—"}</p>
                        </td>
                        <td className="py-3 pr-3">{addressLine || "—"}</td>
                        <td className="py-3 pr-3">{stateValue || "—"}</td>
                        <td className="py-3 pr-3">{postal || "—"}</td>
                      <td className="py-3 pr-3 text-white">{formatMoney(order.amountTotal)}</td>
                      <td className="py-3 pr-3">{formatDateTime(order.shippedAt)}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-black/30 px-4 py-4">
                            <div className="space-y-3 rounded-lg border border-neutral-900/70 p-4 text-gray-300">
                              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500">
                                <span>Items shipped</span>
                                <Badge variant="secondary" className="bg-neutral-800 text-gray-200">
                                  {formatDateTime(order.shippedAt)}
                                </Badge>
                              </div>
                              {lineItems.length ? (
                                <div className="space-y-3">
                                  {lineItems.map((item, index) => {
                                    const quantity = Number(item.quantity ?? 1)
                                    const amount = Number(item.amountTotal ?? item.amountSubtotal ?? 0)
                                    return (
                                      <div
                                        key={item.id ?? `${order.id}-shipped-${index}`}
                                        className="flex items-start justify-between text-sm"
                                      >
                                        <div>
                                          <p className="font-semibold text-white">
                                            {item.description ?? `Line item ${index + 1}`}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Qty {Number.isFinite(quantity) ? quantity : 1}
                                          </p>
                                        </div>
                                        <div className="text-right text-white">{formatMoney(amount)}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No line items recorded for this shipment.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {!shippedOrders.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                      No shipments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderReturns = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Return items</h1>
        <p className="text-sm text-gray-400">Orders canceled or awaiting refund.</p>
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Pending returns</CardTitle>
          <CardDescription>Refund queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {returnedOrders.map((order) => (
            <div key={order.id} className="rounded-lg bg-black/40 px-3 py-2 text-sm text-gray-300">
              <p className="font-semibold text-white">{order.customerName ?? order.customerEmail}</p>
              <p className="text-xs text-gray-500">#{order.orderNumber ?? order.id.slice(0, 8)}</p>
              <p>Refund {formatMoney(order.amountTotal)}</p>
            </div>
          ))}
          {!returnedOrders.length && <p className="text-sm text-gray-500">No return requests.</p>}
        </CardContent>
      </Card>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Track revenue trends for the selected date range.</p>
        </div>
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>Sales performance</CardTitle>
            <CardDescription>Revenue from {rangeSummaryLabel}</CardDescription>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "7d", label: "Last 7 days" },
                  { key: "30d", label: "Last 30 days" },
                  { key: "90d", label: "Last 90 days" },
                ].map((preset) => (
                  <Button
                    key={preset.key}
                    size="sm"
                    variant={rangePreset === preset.key ? "default" : "outline"}
                    onClick={() => handlePresetChange(preset.key as RangePreset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
              <div className="flex flex-col text-xs text-gray-400">
                <Label htmlFor="analytics-range-start">Start date</Label>
                <Input
                  id="analytics-range-start"
                  type="date"
                  value={rangeStart}
                  onChange={(event) => {
                    setRangePreset(null)
                    setRangeStart(event.target.value)
                  }}
                  className="bg-neutral-900 text-white"
                />
              </div>
              <div className="flex flex-col text-xs text-gray-400">
                <Label htmlFor="analytics-range-end">End date</Label>
                <Input
                  id="analytics-range-end"
                  type="date"
                  value={rangeEnd}
                  onChange={(event) => {
                    setRangePreset(null)
                    setRangeEnd(event.target.value)
                  }}
                  className="bg-neutral-900 text-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">Interval</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={salesView === "daily" ? "default" : "outline"}
                    onClick={() => setSalesView("daily")}
                  >
                    Daily
                  </Button>
                  <Button
                    size="sm"
                    variant={salesView === "weekly" ? "default" : "outline"}
                    onClick={() => setSalesView("weekly")}
                  >
                    Weekly
                  </Button>
                  <Button
                    size="sm"
                    variant={salesView === "monthly" ? "default" : "outline"}
                    onClick={() => setSalesView("monthly")}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No sales recorded for this range.</p>
          ) : (
            (() => {
              const chartHeight = 280
              const barSlot = 72
              const innerWidth = Math.max(salesChartData.length * barSlot, 320)
              const yAxisPadding = 56
              const rightPadding = 32
              const innerHeight = chartHeight - 48
              const chartWidth = innerWidth + yAxisPadding + rightPadding
              const barWidth = Math.min(40, barSlot - 20)
              const yTickCount = 4
              const yTickValues = Array.from({ length: yTickCount + 1 }, (_, index) =>
                Math.round((maxChartValue / yTickCount) * index),
              )

              return (
                <div className="overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="h-72 w-full min-w-[560px] text-xs text-gray-400"
                  >
                    <line
                      x1={yAxisPadding}
                      x2={yAxisPadding}
                      y1={8}
                      y2={innerHeight}
                      stroke="#2d2d2d"
                      strokeWidth={1}
                    />
                    <line
                      x1={yAxisPadding}
                      x2={chartWidth - rightPadding}
                      y1={innerHeight}
                      y2={innerHeight}
                      stroke="#2d2d2d"
                      strokeWidth={1}
                    />
                    {yTickValues.map((value, index) => {
                      const ratio = maxChartValue === 0 ? 0 : value / maxChartValue
                      const y = innerHeight - ratio * (innerHeight - 16)
                      return (
                        <g key={`tick-${index}`}>
                          <line
                            x1={yAxisPadding}
                            x2={chartWidth - rightPadding}
                            y1={y}
                            y2={y}
                            stroke="#1a1a1a"
                            strokeWidth={0.5}
                          />
                          <text x={yAxisPadding - 8} y={y + 4} textAnchor="end" fill="#9ca3af">
                            {formatMoney(value)}
                          </text>
                        </g>
                      )
                    })}
                    {salesChartData.map((point, index) => {
                      const slotOffset = index * barSlot
                      const barX = yAxisPadding + slotOffset + (barSlot - barWidth) / 2
                      const totalHeight =
                        maxChartValue === 0 ? 0 : (point.total / maxChartValue) * (innerHeight - 16)
                      const shippedHeight =
                        maxChartValue === 0 ? 0 : (point.shipped / maxChartValue) * (innerHeight - 16)
                      const pendingHeight = Math.max(totalHeight - shippedHeight, 0)
                      const pendingValue = Math.max(point.total - point.shipped, 0)
                      return (
                        <g key={point.key}>
                          {pendingHeight > 0 && (
                            <rect
                              x={barX}
                              width={barWidth}
                              y={innerHeight - totalHeight}
                              height={Math.max(pendingHeight, 2)}
                              fill="#F5A62380"
                            >
                              <title>{`Pending ${formatMoney(pendingValue)}`}</title>
                            </rect>
                          )}
                          {shippedHeight > 0 && (
                            <rect
                              x={barX}
                              width={barWidth}
                              y={innerHeight - shippedHeight}
                              height={Math.max(shippedHeight, 2)}
                              fill="#F5A623"
                            >
                              <title>{`Shipped ${formatMoney(point.shipped)}`}</title>
                            </rect>
                          )}
                          {pendingHeight === 0 && shippedHeight === 0 && (
                            <rect
                              x={barX}
                              width={barWidth}
                              y={innerHeight - 4}
                              height={2}
                              fill="#F5A62340"
                            >
                              <title>No revenue</title>
                            </rect>
                          )}
                          <text
                            x={barX + barWidth / 2}
                            y={innerHeight + 18}
                            textAnchor="middle"
                            fill="#9ca3af"
                          >
                            {point.label}
                          </text>
                          <text
                            x={barX + barWidth / 2}
                            y={innerHeight - totalHeight - 8}
                            textAnchor="middle"
                            fill="#f3f4f6"
                            fontSize={11}
                          >
                            {formatMoney(point.total)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              )
            })()
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle>Sales by location</CardTitle>
            <CardDescription>Top regions based on gross revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesByLocation
              data={salesByRegion}
              onSelect={(item) => setSelectedRegion(item.label === selectedRegion ? null : item.label)}
              selectedLabel={selectedRegion}
            />
            {selectedRegion && (
              <p className="mt-3 text-xs text-gray-500">
                {selectedRegion} contributes{" "}
                {formatMoney(
                  salesByRegion.find((entry) => entry.label === selectedRegion)?.value ?? 0,
                )}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-neutral-900 bg-neutral-950">
          <CardHeader>
            <CardTitle>Traffic sources</CardTitle>
            <CardDescription>Countries generating the most orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesByLocation
              data={trafficSources}
              valueFormatter={(value) => `${value} orders`}
              onSelect={(item) => setSelectedTraffic(item.label === selectedTraffic ? null : item.label)}
              selectedLabel={selectedTraffic}
              emptyLabel="No orders recorded yet."
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Top selling products</CardTitle>
          <CardDescription>Highest performing products by units sold.</CardDescription>
        </CardHeader>
        <CardContent>
          <TopProductsTable products={topProducts} />
        </CardContent>
      </Card>
    </div>
  )

  const renderCoupons = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Coupon generation</h1>
        <p className="text-sm text-gray-400">
          Save a site-wide coupon for non-limited products. Limited drops stay controlled by the countdown.
        </p>
      </div>
      <Card className="border-neutral-900 bg-neutral-950">
        <CardHeader>
          <CardTitle>Generate coupon</CardTitle>
          <CardDescription>Automatically applied to all non-limited products when enabled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <label className="text-sm font-medium text-gray-300">Code</label>
            <Input
              placeholder="BLACK-FRIDAY-25"
              className="bg-neutral-900"
              value={couponForm.code}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value }))}
              disabled={couponSaving || couponLoading}
            />
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-gray-300">Discount (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="25"
              className="bg-neutral-900"
              value={couponForm.discountPercent}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, discountPercent: event.target.value }))
              }
              disabled={couponSaving || couponLoading}
            />
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-gray-300">Notes</label>
            <Textarea
              rows={3}
              placeholder="Internal notes for this campaign."
              value={couponForm.notes}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, notes: event.target.value }))}
              disabled={couponSaving || couponLoading}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-neutral-900 text-[#F5A623]"
              checked={couponForm.enableForNonLimited}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, enableForNonLimited: event.target.checked }))
              }
              disabled={couponSaving || couponLoading}
            />
            Enable coupon for non-limited collections
          </label>
          {couponError && <p className="text-sm text-red-400">{couponError}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-[#F5A623] text-black hover:bg-[#E09612]"
              onClick={handleSaveCoupon}
              disabled={couponSaving}
            >
              {couponSaving ? "Saving..." : "Save coupon"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={couponSaving}
              onClick={() => loadCouponSettings()}
            >
              Refresh
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Coupons apply automatically to all non-limited products. Limited drops stay controlled by the countdown and
            its discount setting.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const renderSupport = () => {
    const activeTicket = supportTickets.find((ticket) => ticket.id === activeTicketId) ?? null

    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.35em] text-gray-500">Tickets</h2>
            <Button variant="ghost" size="icon-sm" onClick={refreshAll} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {supportTickets.length === 0 && (
              <p className="text-sm text-gray-500">No support tickets yet.</p>
            )}
            {supportTickets.map((ticket) => {
              const isActive = ticket.id === activeTicket?.id
              const badgeClass =
                ticket.status === "open"
                  ? "bg-amber-500/15 text-amber-300"
                  : ticket.status === "waiting_admin"
                    ? "bg-blue-500/15 text-blue-300"
                    : ticket.status === "waiting_customer"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-gray-500/15 text-gray-300"
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => {
                    setActiveTicketId(ticket.id)
                    setSupportReply("")
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-white/30 bg-white/5"
                      : "border-white/10 bg-black/20 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {ticket.subject ?? "Support request"}
                    </p>
                    <Badge className={badgeClass}>{ticket.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {ticket.customerName ?? ticket.customerEmail}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-xl shadow-black/40">
          {!activeTicket ? (
            <p className="text-sm text-gray-500">Select a ticket to view the conversation.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify_between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Ticket</p>
                  <h3 className="text-2xl font-semibold text-white">
                    {activeTicket.subject ?? `Ticket ${activeTicket.id}`}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {activeTicket.customerName ?? activeTicket.customerEmail} ·{" "}
                    {activeTicket.orderNumber ? `Order ${activeTicket.orderNumber}` : "No order #"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["open", "waiting_admin", "waiting_customer"] as SupportTicketStatus[])
                    .filter((status) => status !== activeTicket.status)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSupportStatusChange(activeTicket.id, status)}
                        disabled={supportActionState === activeTicket.id}
                      >
                        Mark {status.replace("_", " ")}
                      </Button>
                    ))}
                  {activeTicket.status !== "closed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSupportStatusChange(activeTicket.id, "closed")}
                      disabled={supportActionState === activeTicket.id}
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-4">
                {activeTicket.messages.map((message) => (
                  <div key={message.id} className="space-y-1 rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-semibold text-white">
                        {message.authorName ?? message.authorType.toUpperCase()}
                      </span>
                      <span>
                        {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-gray-200">{message.body}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Reply</label>
                <Textarea
                  value={supportReply}
                  onChange={(event) => setSupportReply(event.target.value)}
                  rows={4}
                  placeholder="Type your response..."
                  disabled={!activeTicket}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Replies email the customer and stay synced with this ticket.
                  </p>
                  <Button
                    onClick={() => handleSupportReply(activeTicket.id)}
                    disabled={!supportReply.trim() || supportActionState === activeTicket.id}
                  >
                    {supportActionState === activeTicket.id ? "Sending..." : "Send reply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard()
      case "store":
        return renderStore()
      case "orders":
        return renderOrders()
      case "customers":
        return renderCustomers()
      case "shipped":
        return renderShipped()
      case "returns":
        return renderReturns()
      case "analytics":
        return renderAnalytics()
      case "coupons":
        return renderCoupons()
      case "support":
        return renderSupport()
      case "abandoned":
        return <AbandonedCartsSection />
      default:
        return null
    }
  }

  const sectionLabel = navItems.find((item) => item.key === activeSection)?.label ?? "Dashboard"

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Preparing admin portal...
      </div>
    )
  }

  if (status === "signed-out") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
        <div className="w-full max-w-md space-y-6 text-white">
          <div className="space-y-1 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Shopblacktshirts</p>
            <h1 className="text-2xl font-semibold">Admin Portal</h1>
            <p className="text-sm text-gray-400">
              Sign in with your studio credentials to manage storefront data.
            </p>
          </div>
          <AdminSignInForm />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar className="bg-neutral-950">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Shopblacktshirts
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={activeSection === item.key}
                        onClick={() => setActiveSection(item.key)}
                      >
                        <button className="flex w-full items-center gap-3 text-sm text-gray-300">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-neutral-900 px-4 py-4 text-xs text-gray-500">
            <p>Sync TBD — hook into your CMS or API deployment pipeline.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start text-red-400 hover:text-red-300"
              onClick={signOutUser}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-neutral-900 bg-black/80 px-6 backdrop-blur">
            <SidebarTrigger className="text-gray-400 hover:text-white lg:hidden" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Admin Portal</p>
              <h1 className="text-lg font-semibold">{sectionLabel}</h1>
            </div>
          </header>
          <main className="space-y-6 px-6 py-8">{renderSection()}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
