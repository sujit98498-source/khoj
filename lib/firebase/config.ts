// lib/firebase/config.ts
// Client-side Firebase SDK initialization
// Used in browser components for Auth + Firestore real-time.

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const REQUIRED_FIREBASE_ENV = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const

type FirebaseEnvName = (typeof REQUIRED_FIREBASE_ENV)[number]

function readPublicEnv(name: FirebaseEnvName): string {
  const value = process.env[name]?.trim() ?? ''
  const normalized = value.toLowerCase()

  if (
    !value ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized.includes('your-') ||
    normalized.includes('your_') ||
    normalized.includes('replace-me')
  ) {
    return ''
  }

  return value
}

const firebaseEnv = Object.fromEntries(
  REQUIRED_FIREBASE_ENV.map((name) => [name, readPublicEnv(name)])
) as Record<FirebaseEnvName, string>

const missingFirebaseEnv = REQUIRED_FIREBASE_ENV.filter((name) => !firebaseEnv[name])

export const firebaseConfigReady = missingFirebaseEnv.length === 0
export const firebaseAuthDomainReady = Boolean(firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function warnFirebaseConfigMissing(detail?: string) {
  const suffix = detail ? ` ${detail}` : ''
  console.warn(`Firebase config missing. Check Vercel environment variables.${suffix}`)
}

function createFirebaseConfigError(): Error & { code: string } {
  const error = new Error('Firebase is not configured.') as Error & { code: string }
  error.code = 'firebase/not-configured'
  return error
}

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null

if (!firebaseConfigReady) {
  warnFirebaseConfigMissing(
    missingFirebaseEnv.length > 0 ? `Missing: ${missingFirebaseEnv.join(', ')}.` : undefined
  )
} else {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    authInstance = getAuth(app)
    dbInstance = getFirestore(app)
    storageInstance = getStorage(app)
  } catch (error) {
    app = null
    authInstance = null
    dbInstance = null
    storageInstance = null
    warnFirebaseConfigMissing(error instanceof Error ? `Firebase SDK error: ${error.message}` : undefined)
  }
}

if (process.env.NODE_ENV === 'development') {
  console.info('Firebase config ready:', firebaseConfigReady)
  console.info('Firebase auth domain exists:', firebaseAuthDomainReady)
}

export const auth = authInstance
export const db = dbInstance
export const storage = storageInstance

export function requireFirebaseAuth(): Auth {
  if (!authInstance) {
    throw createFirebaseConfigError()
  }

  return authInstance
}

export function requireFirestoreDb(): Firestore {
  if (!dbInstance) {
    throw createFirebaseConfigError()
  }

  return dbInstance
}

export function requireFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    throw createFirebaseConfigError()
  }

  return storageInstance
}

export default app
