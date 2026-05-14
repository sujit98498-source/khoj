// apps/mobile/lib/firebase.ts
// Initialises the Firebase JS SDK for Expo React Native.
// The same Firebase project as the web app — reads from EXPO_PUBLIC_ env vars.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '',
}

// Prevent re-initialisation during Expo hot-reloads
let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

if (getApps().length === 0) {
  app     = initializeApp(firebaseConfig)
  // Use AsyncStorage persistence so sessions survive app restarts
  auth    = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
  db      = getFirestore(app)
  storage = getStorage(app)
} else {
  app     = getApp()
  const { getAuth } = require('firebase/auth') as typeof import('firebase/auth')
  auth    = getAuth(app)
  db      = getFirestore(app)
  storage = getStorage(app)
}

export { app, auth, db, storage }

// ── Firestore collection names (mirrors packages/firebase) ──────────────────
export const COLLECTIONS = {
  USERS:            'users',
  TOURNAMENTS:      'tournaments',
  MATCHES:          'matches',
  ROOMS:            'rooms',
  ANNOUNCEMENTS:    'announcements',
  COMMUNITY_POSTS:  'communityPosts',
  COMMENTS:         'comments',
  NOTIFICATIONS:    'notifications',
  CONVERSATIONS:    'conversations',
  CALL_SESSIONS:    'callSessions',
} as const
