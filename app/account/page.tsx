"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { LogOut, PackageCheck, ShoppingBag, TicketPercent } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SignInButton from "@/components/ui/SignInButton"
import { useCart } from "@/components/ui/cart-context"
import { auth } from "@/lib/firebase"
import { getFreshIdToken, signOutUser } from "@/lib/auth-client"

type ShippingAddress = {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
} | null

type AccountProfile = {
  id: string
  email: string | null
  displayName: string | null
  marketingOptIn: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
  shippingAddress?: ShippingAddress
}

type AccountOrder = {
  id: string
  orderNumber?: string | null
  status: "paid" | "processing" | "shipped" | "canceled" | string
  amountTotal: number
  currency: string
  createdAt: string | null
  updatedAt: string | null
  acceptedAt: string | null
  shippedAt: string | null
  canceledAt: string | null
  lineItems: Array<{ description?: string; quantity?: number }>
}

const formatDate = (input?: string | null) =>
  input ? new Date(input).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"

const formatCurrency = (value: number, currency?: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(value / 100)

const statusMeta: Record<
  string,
  {
    label: string
    hint: string
    classes: string
  }
> = {
  paid: {
    label: "Paid",
    hint: "Awaiting review",
    classes: "bg-indigo-500/15 text-indigo-200 border border-indigo-500/40",
  },
  processing: {
    label: "Processing",
    hint: "Order Accepted",
    classes: "bg-amber-500/15 text-amber-200 border border-amber-500/40",
  },
  shipped: {
    label: "Shipped",
    hint: "On the way",
    classes: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40",
  },
  canceled: {
    label: "Canceled",
    hint: "Order removed",
    classes: "bg-red-500/15 text-red-200 border border-red-500/40",
  },
}

const emptyProfileForm = {
  displayName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
}

const mapProfileToFormState = (account?: AccountProfile | null) => ({
  displayName: account?.displayName ?? "",
  line1: account?.shippingAddress?.line1 ?? "",
  line2: account?.shippingAddress?.line2 ?? "",
  city: account?.shippingAddress?.city ?? "",
  state: account?.shippingAddress?.state ?? "",
  postalCode: account?.shippingAddress?.postalCode ?? "",
  country: account?.shippingAddress?.country ?? "",
})

export default function AccountPage() {
  const { discountAmount, isDiscountActive, discountRate, count } = useCart()
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileForm, setProfileForm] = useState(mapProfileToFormState(null))
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  useEffect(() => {
    setProfileForm(mapProfileToFormState(profile))
    setProfileSaveMessage(null)
    setProfileSaveError(null)
    setIsEditingProfile(false)
  }, [profile])

  const isProfileDirty = useMemo(() => {
    const baseline = mapProfileToFormState(profile)
    return (Object.keys(baseline) as Array<keyof typeof baseline>).some(
      (key) => baseline[key] !== profileForm[key],
    )
  }, [profile, profileForm])
  const canSaveProfile = isProfileDirty && isEditingProfile && !isSavingProfile && !isLoadingProfile

  const handleProfileInputChange =
    (field: keyof typeof profileForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setProfileForm((previous) => ({
        ...previous,
        [field]: value,
      }))
    }

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSavingProfile || !firebaseUser || !isEditingProfile) {
      return
    }
    setProfileSaveMessage(null)
    setProfileSaveError(null)
    setIsSavingProfile(true)

    try {
      const token = await getFreshIdToken(true)
      if (!token) {
        throw new Error("Sign in to update your profile.")
      }

      const displayName = profileForm.displayName.trim()
      const shippingPayload = {
        line1: profileForm.line1.trim() || null,
        line2: profileForm.line2.trim() || null,
        city: profileForm.city.trim() || null,
        state: profileForm.state.trim() || null,
        postalCode: profileForm.postalCode.trim() || null,
        country: profileForm.country.trim() || null,
      }
      const hasShipping = Object.values(shippingPayload).some((value) => Boolean(value))

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName || null,
          shippingAddress: hasShipping ? shippingPayload : null,
        }),
      })

      const data = (await response.json().catch(() => null)) as { user?: AccountProfile; error?: string } | null
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to save your profile.")
      }

      if (data?.user) {
        setProfile(data.user)
      }
      setProfileSaveMessage("Profile updated.")
      setIsEditingProfile(false)
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to update your info right now. Please try again."
      setProfileSaveError(message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleProfileCancel = () => {
    setProfileForm(mapProfileToFormState(profile))
    setProfileSaveMessage(null)
    setProfileSaveError(null)
    setIsEditingProfile(false)
  }

  const beginEditingProfile = () => {
    setIsEditingProfile(true)
    setProfileSaveMessage(null)
    setProfileSaveError(null)
  }

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!isMounted) return
      setFirebaseUser(nextUser)
      setProfile(null)
      setOrders([])
      setProfileError(null)
      setOrdersError(null)

      if (!nextUser) {
        setIsLoadingProfile(false)
        setIsLoadingOrders(false)
        return
      }

      setIsLoadingProfile(true)
      setIsLoadingOrders(true)

      ;(async () => {
        let token: string | null = null
        try {
          token = await getFreshIdToken(true)
        } catch (tokenError) {
          if (!isMounted) return
          const message =
            tokenError instanceof Error ? tokenError.message : "Unable to authenticate your session. Please sign in again."
          setProfileError(message)
          setOrdersError(message)
          setIsLoadingProfile(false)
          setIsLoadingOrders(false)
          return
        }

        if (!token || !isMounted) return

        // Profile fetch
        try {
          const response = await fetch("/api/users?scope=self", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = (await response.json().catch(() => null)) as { user?: AccountProfile; error?: string } | null
          if (!response.ok) {
            throw new Error(data?.error ?? "Unable to load your profile.")
          }
          if (isMounted) {
            setProfile(data?.user ?? null)
          }
        } catch (error) {
          if (isMounted) {
            setProfileError(error instanceof Error ? error.message : "Unable to load your profile.")
          }
        } finally {
          if (isMounted) {
            setIsLoadingProfile(false)
          }
        }

        // Orders fetch
        try {
          const response = await fetch("/api/account/orders", {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = (await response.json().catch(() => null)) as { orders?: AccountOrder[]; error?: string } | null
          if (!response.ok) {
            throw new Error(data?.error ?? "Unable to load your orders.")
          }
          if (isMounted) {
            setOrders(data?.orders ?? [])
          }
        } catch (error) {
          if (isMounted) {
            setOrdersError(error instanceof Error ? error.message : "Unable to load your orders.")
          }
        } finally {
          if (isMounted) {
            setIsLoadingOrders(false)
          }
        }
      })()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOutUser()
    } finally {
      setIsSigningOut(false)
    }
  }

  const discountLabel = isDiscountActive
    ? `Active ${Math.round(discountRate * 100)}% discount`
    : "Unlock an exclusive discount by opting in on the homepage modal."

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-4xl font-semibold">Your Shopping Portal</h1>
          <p className="mt-4 text-base text-gray-300">
            Sign in to track your orders, apply member discounts, and save your cart across devices.
          </p>
          <div className="mt-8">
            <SignInButton className="text-base font-semibold">Sign In</SignInButton>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            Don&apos;t have an account yet? Use the &quot;Need an account?&quot; toggle in the sign-in modal to join the
            collective.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Member Hub</p>
          <h1 className="text-4xl font-semibold">Hey, {profile?.displayName ?? firebaseUser.email}</h1>
          <p className="text-sm text-gray-400">
            Manage your perks, track drop activity, and keep your cart synced on every device.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-neutral-800 bg-neutral-950/80">
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
              <CardDescription>Your membership details straight from Firebase Auth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-gray-300">
              <form className="space-y-4" onSubmit={handleProfileSave}>
                <div className="space-y-2">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={firebaseUser?.email ?? ""}
                    disabled
                    className="bg-black/40 text-white"
                  />
                  <p className="text-xs text-gray-500">Email can&apos;t be changed because it unlocks your account.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Name</Label>
                  <Input
                    id="account-name"
                    value={profileForm.displayName}
                    onChange={handleProfileInputChange("displayName")}
                    placeholder="Your preferred name"
                    disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-address-line1">Address line 1</Label>
                  <Input
                    id="account-address-line1"
                    value={profileForm.line1}
                    onChange={handleProfileInputChange("line1")}
                    placeholder="Street address"
                    disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-address-line2">Address line 2</Label>
                  <Input
                    id="account-address-line2"
                    value={profileForm.line2}
                    onChange={handleProfileInputChange("line2")}
                    placeholder="Apartment, suite, etc. (optional)"
                    disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-city">City</Label>
                    <Input
                      id="account-city"
                      value={profileForm.city}
                      onChange={handleProfileInputChange("city")}
                      disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-state">State / Region</Label>
                    <Input
                      id="account-state"
                      value={profileForm.state}
                      onChange={handleProfileInputChange("state")}
                      disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-postal">Postal code</Label>
                    <Input
                      id="account-postal"
                      value={profileForm.postalCode}
                      onChange={handleProfileInputChange("postalCode")}
                      disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-country">Country</Label>
                    <Input
                      id="account-country"
                      value={profileForm.country}
                      onChange={handleProfileInputChange("country")}
                      disabled={!isEditingProfile || isLoadingProfile || isSavingProfile}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {isEditingProfile ? (
                    <div className="flex flex-col gap-2">
                      <Button type="submit" className="w-full" disabled={!canSaveProfile}>
                        {isSavingProfile ? "Saving..." : "Save profile"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-neutral-700 text-white hover:bg-white/10"
                        onClick={handleProfileCancel}
                        disabled={isSavingProfile}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      variant="secondary"
                      onClick={beginEditingProfile}
                      disabled={isLoadingProfile}
                    >
                      Edit profile
                    </Button>
                  )}
                  {profileSaveMessage && <p className="text-xs text-emerald-400">{profileSaveMessage}</p>}
                  {profileSaveError && <p className="text-xs text-red-400">{profileSaveError}</p>}
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Joined</span>
                  <span className="text-white">{isLoadingProfile ? "Loading..." : formatDate(profile?.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last login</span>
                  <span className="text-white">
                    {isLoadingProfile ? "Loading..." : formatDate(profile?.lastLoginAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marketing opt-in</span>
                  <span className="text-white">{profile?.marketingOptIn ? "Yes" : "No"}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-neutral-700 text-white hover:bg-white/10"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </Button>
                {profileError && <p className="text-xs text-red-400">{profileError}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950/80">
            <CardHeader>
              <CardTitle>Cart &amp; Activity</CardTitle>
              <CardDescription>Keep tabs on what&apos;s waiting in your bag.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-300">
              <div className="flex items-center gap-3 rounded-lg border border-neutral-800 px-3 py-2">
                <ShoppingBag className="h-4 w-4 text-[#F5A623]" />
                <div>
                  <p className="text-white">
                    {count > 0 ? `${count} item${count === 1 ? "" : "s"} in cart` : "Cart is empty"}
                  </p>
                  <p className="text-xs text-gray-500">Cart syncs automatically after you sign in.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-neutral-800 px-3 py-2">
                <TicketPercent className="mt-0.5 h-4 w-4 text-[#F5A623]" />
                <div>
                  <p className="text-white">{discountLabel}</p>
                  {discountAmount > 0 && (
                    <p className="text-xs text-gray-500">
                      Currently taking {Math.round(discountRate * 100)}% off eligible items in your cart.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/shop" className="w-full">
                  <Button className="w-full bg-white text-black hover:bg-white/90">Shop the latest drop</Button>
                </Link>
                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full border-neutral-700 text-white hover:bg-white/10">
                    Continue browsing
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-950/80">
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Unlock more of the experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-300">
              <div className="rounded-lg border border-neutral-800 p-3">
                <p className="text-white">Track orders</p>
                <p className="text-xs text-gray-500">Live statuses now pull directly from the studio dashboard.</p>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <p className="text-white">Save your favorites</p>
                <p className="text-xs text-gray-500">Wishlist integration is coming soon for this portal.</p>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <p className="text-white">Need help?</p>
                <p className="text-xs text-gray-500">
                  Email{" "}
                  <a href="mailto:support@shopblacktshirts.com" className="text-[#F5A623] underline">
                    support@shopblacktshirts.com
                  </a>{" "}
                  for personalized updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6">
          <Card className="border-neutral-800 bg-neutral-950/80">
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Orders &amp; Status</CardTitle>
                <CardDescription>Follow every step from payment to delivery.</CardDescription>
              </div>
              <PackageCheck className="hidden h-10 w-10 text-[#F5A623] sm:block" />
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-300">
              {ordersError && <p className="text-xs text-red-400">{ordersError}</p>}
              {isLoadingOrders ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={`order-skeleton-${index}`} className="animate-pulse rounded-xl border border-neutral-800 p-4">
                    <div className="mb-2 h-4 w-1/4 rounded bg-neutral-800" />
                    <div className="h-3 w-1/3 rounded bg-neutral-900" />
                  </div>
                ))
              ) : orders.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 p-4 text-center text-sm text-gray-400">
                  No orders yet. Once you complete checkout, your activity will show up here with live status updates.
                </div>
              ) : (
                orders.map((order) => {
                  const normalizedStatus = (order.status ?? "paid").toLowerCase()
                  const meta = statusMeta[normalizedStatus] ?? statusMeta.paid
                  const latestUpdate =
                    normalizedStatus === "shipped"
                      ? order.shippedAt
                      : normalizedStatus === "processing"
                        ? order.acceptedAt ?? order.updatedAt
                        : normalizedStatus === "canceled"
                          ? order.canceledAt ?? order.updatedAt
                          : order.updatedAt
                  const itemsLabel =
                    order.lineItems?.length > 0
                      ? order.lineItems
                          .map((item) => `${item.quantity ?? 1}x ${item.description ?? "Item"}`)
                          .slice(0, 2)
                          .join(", ")
                      : "—"

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-sm text-gray-300"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Order {order.orderNumber ?? order.id}
                          </p>
                          <p className="text-xs text-gray-500">Placed on {formatDate(order.createdAt)}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${meta.classes}`}>
                          {meta.label} · {meta.hint}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-1 text-xs text-gray-400 sm:grid-cols-2">
                        <span>
                          Order total:{" "}
                          <span className="text-white">{formatCurrency(order.amountTotal, order.currency)}</span>
                        </span>
                        <span>
                          Last update: <span className="text-white">{formatDate(latestUpdate)}</span>
                        </span>
                        <span className="sm:col-span-2">
                          Items: <span className="text-white">{itemsLabel}</span>
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
