'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  ensureAuthTokenListener,
  getAuthErrorMessage,
  requestPasswordReset,
  signInUser,
  signOutUser,
  signUpUser,
  syncUserProfile,
} from '@/lib/auth-client'

type SignInButtonProps = {
  className?: string
  children?: ReactNode
  onOpen?: () => void
}

export default function SignInButton({
  className,
  children = 'Sign In',
  onOpen,
}: SignInButtonProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    ensureAuthTokenListener()
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpen?.()
    } else {
      setEmail('')
      setPassword('')
      setRememberMe(true)
      setConfirmPassword('')
      setError(null)
      setIsSubmitting(false)
      setIsSendingReset(false)
      setMode('sign-in')
    }
    setOpen(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Enter your email address and password to continue.')
      return
    }

    if (mode === 'sign-up' && trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (mode === 'sign-up' && trimmedPassword !== confirmPassword.trim()) {
      setError('Passwords do not match. Please confirm your password.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      if (mode === 'sign-up') {
        await signUpUser(trimmedEmail, trimmedPassword)
        await syncUserProfile(
          {
            displayName: trimmedEmail.split('@')[0],
          },
          { allowCreate: true },
        ).catch((profileError) => {
          console.warn('[auth] failed to sync profile', profileError)
        })
        toast({
          title: 'Account created!',
          description: `You're all set. Signed in as ${trimmedEmail}.`,
        })
      } else {
        await signInUser(trimmedEmail, trimmedPassword, { remember: rememberMe })
        try {
          await syncUserProfile(undefined, { allowCreate: false })
          toast({
            title: 'Welcome back!',
            description: `Signed in successfully as ${trimmedEmail}.`,
          })
        } catch (profileError) {
          await signOutUser().catch(() => {})
          const message =
            profileError instanceof Error
              ? profileError.message
              : 'Account not found. Please sign up before signing in.'
          setError(message)
          setIsSubmitting(false)
          return
        }
      }

      setIsSubmitting(false)
      handleOpenChange(false)
    } catch (authError) {
      setError(getAuthErrorMessage(authError, mode))
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    if (mode === 'sign-up' || isSendingReset) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email so we can send a reset link.')
      return
    }
    setError(null)
    setIsSendingReset(true)
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

  const isSignUp = mode === 'sign-up'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-sm font-normal text-black transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F5A623]',
            className,
          )}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignUp ? 'Create your account' : 'Sign in to your account'}</DialogTitle>
          <DialogDescription>
            {isSignUp
              ? 'Create an account to track orders, save your cart, and access exclusive drops.'
              : 'Access your saved carts, track orders, and unlock members-only drops.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signin-password">Password</Label>
              {!isSignUp && (
                <button
                  type="button"
                  className="text-xs font-semibold text-[#F5A623] transition-colors hover:text-[#E09612]"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? 'Sending reset...' : 'Forgot password?'}
                </button>
              )}
            </div>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </div>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="signin-password-confirm">Confirm password</Label>
              <Input
                id="signin-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Retype your password"
                required
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                id="signin-remember"
                checked={rememberMe}
                onCheckedChange={(value) => setRememberMe(value === true)}
                disabled={isSignUp}
              />
              Remember me
            </label>
            <button
              type="button"
              className="text-xs font-semibold text-[#F5A623] transition-colors hover:text-[#E09612]"
              onClick={() => {
                setMode(isSignUp ? 'sign-in' : 'sign-up')
                setError(null)
                setIsSubmitting(false)
                if (isSignUp) {
                  setConfirmPassword('')
                }
              }}
            >
              {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
