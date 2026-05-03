// lib/firebase/config.ts
// Client-side Firebase SDK initialization
// Used in browser components for Auth + Firestore real-time

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Guard: do not initialize Firebase with missing/empty credentials.
// This prevents build-time crashes on Vercel when env vars are not yet set.
const isFirebaseConfigured =
  typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 0 &&
  typeof firebaseConfig.projectId === 'string' && firebaseConfig.projectId.length > 0

if (!isFirebaseConfigured) {
  console.warn(
    '[Firebase] Missing required environment variables. Firebase will not initialize.\n' +
    'Add the following to your Vercel project environment variables:\n' +
    '  NEXT_PUBLIC_FIREBASE_API_KEY\n' +
    '  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
    '  NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' +
    '  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
    '  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
    '  NEXT_PUBLIC_FIREBASE_APP_ID'
  )
}

// Prevent duplicate app initialization in hot-reload dev.
// Only initialize when config is valid.
let app: FirebaseApp | null = null
if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
} else if (getApps().length > 0) {
  app = getApp()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: Auth = app ? getAuth(app) : (null as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: Firestore = app ? getFirestore(app) : (null as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storage: FirebaseStorage = app ? getStorage(app) : (null as any)
export default app
