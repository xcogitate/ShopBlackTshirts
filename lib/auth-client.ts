"use client"

import { FirebaseError } from "firebase/app"
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"

import { auth } from "@/lib/firebase"

const ADMIN_TOKEN_KEY = "sbt_admin_token"

type AuthContext = "sign-in" | "sign-up" | "reset"

const isBrowser = () => typeof window !== "undefined"

async function persistToken(user: User | null, forceRefresh = false) {
  if (!isBrowser()) return null
  if (!user) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
    return null
  }

  const token = await user.getIdToken(forceRefresh)
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  return token
}

let hasAttachedListener = false

export function ensureAuthTokenListener() {
  if (!isBrowser() || hasAttachedListener) return
  onIdTokenChanged(auth, async (user) => {
    try {
      await persistToken(user)
    } catch (error) {
      console.warn("[auth] failed to persist refreshed token", error)
    }
  })
  hasAttachedListener = true
}

export async function signUpUser(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await persistToken(credential.user)
  return credential
}

export async function signInUser(
  email: string,
  password: string,
  options?: { remember?: boolean },
) {
  const remember = options?.remember ?? true
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
  const credential = await signInWithEmailAndPassword(auth, email, password)
  await persistToken(credential.user)
  return credential
}

export async function signOutUser() {
  await signOut(auth)
  await persistToken(null)
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export async function syncUserProfile(
  profile?: {
    displayName?: string | null
    marketingOptIn?: boolean
    segment?: string | null
  },
  options?: { allowCreate?: boolean },
) {
  const token = await getFreshIdToken()
  if (!token) {
    throw new Error("Missing authentication token.")
  }
  const allowCreate = options?.allowCreate ?? true

  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(profile ?? {}),
      allowCreate,
    }),
  })

  const data = (await response.json().catch(() => null)) as { error?: string; user?: unknown } | null
  if (!response.ok) {
    throw new Error(data?.error ?? "Unable to save your profile.")
  }

  return data?.user ?? null
}

export async function getFreshIdToken(forceRefresh = false) {
  if (!auth.currentUser) {
    return isBrowser() ? window.localStorage.getItem(ADMIN_TOKEN_KEY) : null
  }

  const token = await auth.currentUser.getIdToken(forceRefresh)
  if (isBrowser()) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
  return token
}

export function getStoredIdToken() {
  if (!isBrowser()) return null
  return window.localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function getAuthErrorMessage(error: unknown, context: AuthContext) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Enter a valid email address to continue."
      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Email or password is incorrect. Please try again."
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again."
      case "auth/email-already-in-use":
        return "An account with this email already exists. Sign in instead."
      case "auth/weak-password":
        return "Choose a stronger password with at least 8 characters."
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again."
      case "auth/operation-not-allowed":
        return "Email/password sign-in is disabled for this project."
    }
  }

  if (context === "reset") {
    return "We couldn't send the reset email. Please try again."
  }

  if (context === "sign-in") {
    return "Unable to sign in. Please verify your details and try again."
  }

  return "Unable to create your account right now. Please try again."
}
