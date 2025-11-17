'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { LogOut, UserRound } from 'lucide-react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { ensureAuthTokenListener, signOutUser } from '@/lib/auth-client'
import SignInButton from '@/components/ui/SignInButton'

type UserMenuButtonProps = {
  className?: string
  onSignInOpen?: () => void
}

const fallbackInitial = (value?: string | null) => {
  if (!value) return 'U'
  const letter = value.trim().charAt(0)
  return letter ? letter.toUpperCase() : 'U'
}

export default function UserMenuButton({ className, onSignInOpen }: UserMenuButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    ensureAuthTokenListener()
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
    })
    return () => unsubscribe()
  }, [])

  const initials = useMemo(() => fallbackInitial(user?.displayName ?? user?.email), [user])

  if (!user) {
    return (
      <SignInButton className={className} onOpen={onSignInOpen}>
        Sign In
      </SignInButton>
    )
  }

  const handleAccountNavigate = () => {
    router.push('/account')
  }

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await signOutUser()
      toast({
        title: 'Signed out',
        description: 'Come back anytime to keep shopping.',
      })
    } catch (error) {
      toast({
        title: 'Failed to sign out',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F5A623]',
            className,
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            {initials}
          </span>
          <span className="hidden sm:inline">Account</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-white">{user.displayName ?? 'Member'}</span>
          <span className="text-xs text-gray-400">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            handleAccountNavigate()
          }}
        >
          <UserRound className="mr-2 h-4 w-4" />
          View account
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            handleSignOut()
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            router.push('/shop')
          }}
        >
          Browse shop
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
