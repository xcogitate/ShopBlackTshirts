// lib/server/firebase-admin.ts
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"

type ServiceAccountKey =
  | {
      projectId: string
      clientEmail: string
      privateKey: string
    }
  | null

function getServiceAccountKey(): ServiceAccountKey {
  // Option 1: Full JSON in FIREBASE_SERVICE_ACCOUNT_KEY
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        project_id: string
        client_email: string
        private_key: string
      }
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          // IMPORTANT: normalize line breaks from env to real newlines
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        }
      }
    } catch (error) {
      console.warn("[firebase-admin] Unable to parse FIREBASE_SERVICE_ACCOUNT_KEY", error)
    }
  }

  // Option 2: Individual env vars
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? null
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? null

  if (projectId && clientEmail && rawPrivateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
    }
  }

  return null
}

const resolveBucketName = (projectId?: string | null) => {
  const explicit =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null
  if (explicit) {
    return explicit.trim().length ? explicit.trim() : null
  }
  if (projectId) {
    return `${projectId}.appspot.com`
  }
  return null
}

function initializeFirebaseAdmin(): App {
  const existing = getApps()[0]
  if (existing) return existing

  const serviceAccount = getServiceAccountKey()

  if (serviceAccount) {
    const bucket = resolveBucketName(serviceAccount.projectId)
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
      projectId: serviceAccount.projectId,
      storageBucket: bucket ?? undefined,
    })
  }

  // Fallback for running on GCP where ADC is available
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? undefined

  try {
    const bucket = resolveBucketName(projectId ?? null)
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: bucket ?? undefined,
    })
  } catch (error) {
    console.error(
      "[firebase-admin] Failed to initialize with application default credentials.",
      error,
    )
    throw new Error(
      "Firebase admin credentials are not configured. Provide FIREBASE_SERVICE_ACCOUNT_KEY JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY environment variables.",
    )
  }
}

const adminApp = initializeFirebaseAdmin()

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
export const adminStorage = getStorage(adminApp)
export const storageBucketName =
  adminApp.options?.storageBucket ??
  resolveBucketName(process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null) ??
  null
