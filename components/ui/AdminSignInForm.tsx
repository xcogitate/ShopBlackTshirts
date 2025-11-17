'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import {
  ensureAuthTokenListener,
  getAuthErrorMessage,
  requestPasswordReset,
  signInUser,
  syncUserProfile,
} from '@/lib/auth-client'

export default function AdminSignInForm() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  useEffect(() => {
    ensureAuthTokenListener()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Enter your email address and password to continue.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await signInUser(trimmedEmail, trimmedPassword, { remember: rememberMe })
      await syncUserProfile(undefined, { allowCreate: true }).catch((profileError) => {
        console.warn('[admin-auth] failed to sync profile', profileError)
      })
      toast({
        title: 'Welcome back',
        description: `Signed in as ${trimmedEmail}.`,
      })
      setIsSubmitting(false)
    } catch (authError) {
      setIsSubmitting(false)
      setError(getAuthErrorMessage(authError, 'sign-in'))
    }
  }

  const handleForgotPassword = async () => {
    if (isSendingReset) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email so we can send reset instructions.')
      return
    }
    setIsSendingReset(true)
    setError(null)
    try {
      await requestPasswordReset(trimmedEmail)
      toast({
        title: 'Reset link sent',
        description: `Check ${trimmedEmail} for instructions to reset your password.`,
      })
    } catch (authError) {
      setError(getAuthErrorMessage(authError, 'reset'))
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-neutral-800 bg-neutral-950 text-white">
      <CardHeader>
        <CardTitle>Admin Sign In</CardTitle>
        <CardDescription className="text-gray-400">
          Authenticate to manage storefront products, orders, and customer data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@shopblacktshirts.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-password">Password</Label>
              <button
                type="button"
                className="text-xs font-semibold text-[#F5A623] transition-colors hover:text-[#E09612]"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
              >
                {isSendingReset ? 'Sending reset...' : 'Forgot password?'}
              </button>
            </div>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              id="admin-remember"
              checked={rememberMe}
              onCheckedChange={(value) => setRememberMe(value === true)}
            />
            Remember me on this device
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
