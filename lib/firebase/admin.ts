// lib/firebase/admin.ts
// Server-only Firebase Admin SDK
// Used in API routes and server actions for privileged operations
// NEVER import this in client components

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App | null = null

const REQUIRED_ADMIN_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const

function getAdminConfig() {
  const missingVars = REQUIRED_ADMIN_ENV_VARS.filter((name) => !process.env[name]?.trim())

  if (missingVars.length > 0) {
    throw new Error(
      'Firebase Admin SDK is not configured. Missing environment variables: ' +
        missingVars.join(', ') +
        '. Add them to the server environment and restart the server.'
    )
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!.trim(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.trim(),
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }
}

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  const { projectId, clientEmail, privateKey } = getAdminConfig()

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })

  return adminApp
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}
