"use client"

import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/components/ui/cart-context"
import { useToast } from "@/components/ui/use-toast"
import {
  ensureAuthTokenListener,
  getAuthErrorMessage,
  signUpUser,
  syncUserProfile,
} from "@/lib/auth-client"

type SignupDiscountModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  discountRate?: number
  onSkip?: () => void
}

export default function SignupDiscountModal({
  open,
  onOpenChange,
  onSuccess,
  discountRate = 0.15,
  onSkip,
}: SignupDiscountModalProps) {
  const { activateDiscount, isDiscountActive, discountRate: activeRate } = useCart()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    ensureAuthTokenListener()
  }, [])

  useEffect(() => {
    if (!open) {
      setEmail("")
      setPassword("")
      setConfirm(true)
      setError(null)
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail) {
      setError("Enter your email so we can create your account.")
      return
    }
    if (!trimmedPassword || trimmedPassword.length < 8) {
      setError("Choose a password that's at least 8 characters.")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await signUpUser(trimmedEmail, trimmedPassword)
      await syncUserProfile(
        {
          displayName: trimmedEmail.split("@")[0],
          marketingOptIn: confirm,
        },
        { allowCreate: true },
      ).catch((profileError) => {
        console.warn("[signup-modal] failed to sync profile", profileError)
      })
      activateDiscount(discountRate, { source: "hero-signup", mode: "rate" })
      setIsSubmitting(false)
      onOpenChange(false)
      toast({
        title: "Welcome to the collective!",
        description:
          "Your member discount is locked in and will be applied automatically at checkout.",
      })
      onSuccess?.()
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "sign-up"))
      setIsSubmitting(false)
    }
  }

  const effectiveRate = Math.round((isDiscountActive ? activeRate : discountRate) * 100)

  const handleSkip = () => {
    onOpenChange(false)
    onSkip?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock your drop discount</DialogTitle>
          <DialogDescription>
            Sign up in seconds to apply an instant {effectiveRate}% member discount on your entire order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Create password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Make it memorable"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <Checkbox id="signup-opt-in" checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
              Email me about new drops and exclusives.
            </label>
            {!confirm && (
              <p className="text-xs text-gray-500">
                You can still create an account without updates—toggle the box above if you change your mind.
              </p>
            )}
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Maybe later
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Activating your access..." : "Create account & apply discount"}
              </Button>
            </DialogFooter>
          </form>
          <p className="text-center text-xs text-gray-500">
            Already registered?{" "}
            <Link href="/account" className="font-semibold text-[#F5A623] underline-offset-2 hover:underline">
              Sign in to apply your discount.
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
