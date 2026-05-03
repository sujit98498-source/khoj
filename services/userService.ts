// services/userService.ts
// All Firestore operations related to users
// Called from client components and API routes

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { KhojUser, MatchHistoryEntry } from '@/lib/types'

/**
 * Create a new user document in Firestore after signup
 */
export async function createUserDocument(
  uid: string,
  name: string,
  email: string
): Promise<void> {
  const userRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, uid)
  const now = new Date().toISOString()

  await setDoc(userRef, {
    uid,
    name,
    email,
    role: 'user',
    xp: 0,
    rank: 0,
    wins: 0,
    matchesPlayed: 0,
    skills: [],
    createdAt: now,
    lastActive: now,
  } satisfies KhojUser)
}

/**
 * Fetch a single user by uid
 */
export async function getUserById(uid: string): Promise<KhojUser | null> {
  const userRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return null

  return {
    role: 'user',
    ...(snap.data() as KhojUser),
  }
}

/**
 * Update a user's skills array
 */
export async function updateUserSkills(uid: string, skills: string[]): Promise<void> {
  const userRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, uid)
  await updateDoc(userRef, { skills, lastActive: new Date().toISOString() })
}

/**
 * Fetch top N users ordered by XP for leaderboard
 */
export async function getLeaderboard(topN: number = 50): Promise<KhojUser[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.USERS),
    orderBy('xp', 'desc'),
    limit(topN)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    role: 'user',
    ...(d.data() as KhojUser),
  }))
}

/**
 * Get a user's match history subcollection
 */
export async function getMatchHistory(uid: string): Promise<MatchHistoryEntry[]> {
  const historyRef = collection(requireFirestoreDb(), COLLECTIONS.USERS, uid, 'matchHistory')
  const q = query(historyRef, orderBy('date', 'desc'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as MatchHistoryEntry)
}

/**
 * Add a match history entry to a user's subcollection
 */
export async function addMatchHistoryEntry(
  uid: string,
  entry: MatchHistoryEntry
): Promise<void> {
  const historyRef = doc(
    collection(requireFirestoreDb(), COLLECTIONS.USERS, uid, 'matchHistory'),
    entry.matchId
  )
  await setDoc(historyRef, entry)
}

/**
 * Recalculate and update all user ranks (call after XP changes)
 * This is O(n) — fine for MVP, replace with Cloud Function for scale
 */
export async function recalculateRanks(): Promise<void> {
  const allUsersSnap = await getDocs(
    query(collection(requireFirestoreDb(), COLLECTIONS.USERS), orderBy('xp', 'desc'))
  )
  const batch: Promise<void>[] = []
  allUsersSnap.docs.forEach((snap, index) => {
    const userRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, snap.id)
    batch.push(updateDoc(userRef, { rank: index + 1 }))
  })
  await Promise.all(batch)
}
