'use client'

import { collection, getDocs, limit, query } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { NetworkUserSnapshot } from '@/services/networkService'

export interface PeopleSearchResult extends NetworkUserSnapshot {
  matchScore: number
}

const MAX_SEARCH_POOL = 350
const MAX_RESULTS = 40

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function normalize(value: string): string {
  return value.toLowerCase().trim()
}

function userFromDoc(id: string, data: Record<string, unknown>): NetworkUserSnapshot {
  const name = asString(data.displayName) || asString(data.name) || asString(data.userName) || 'KHOJ User'

  return {
    uid: asString(data.uid) || id,
    name,
    email: asString(data.email) || undefined,
    username: asString(data.username) || undefined,
    avatarUrl: asString(data.avatarUrl) || asString(data.photoURL) || undefined,
    headline: asString(data.headline) || undefined,
    role: asString(data.role) || asString(data.field) || undefined,
    bio: asString(data.bio) || undefined,
    skills: asStringArray(data.skills),
    location: asString(data.location) || asString(data.country) || undefined,
    xp: typeof data.xp === 'number' ? data.xp : undefined,
    rank: typeof data.rank === 'number' ? data.rank : undefined,
  }
}

function searchableFields(user: NetworkUserSnapshot): string[] {
  return [
    user.name,
    user.username ?? '',
    user.email ?? '',
    user.headline ?? '',
    user.role ?? '',
    user.location ?? '',
    ...(user.skills ?? []),
  ].filter(Boolean)
}

function scoreUser(user: NetworkUserSnapshot, terms: string[]): number {
  const fields = searchableFields(user).map(normalize)
  const haystack = fields.join(' ')
  let score = 0

  for (const term of terms) {
    if (!term) continue
    if (!haystack.includes(term)) return 0

    fields.forEach((field, index) => {
      if (field === term) score += index <= 2 ? 12 : 8
      else if (field.startsWith(term)) score += index <= 2 ? 8 : 5
      else if (field.includes(term)) score += index <= 2 ? 5 : 3
    })
  }

  if (typeof user.rank === 'number' && user.rank > 0) score += Math.max(0, 5 - Math.min(user.rank, 500) / 100)
  if (typeof user.xp === 'number') score += Math.min(5, user.xp / 1000)
  if ((user.skills?.length ?? 0) > 0) score += 2
  if (user.headline) score += 1

  return score
}

export async function searchPeople(rawQuery: string): Promise<PeopleSearchResult[]> {
  const terms = normalize(rawQuery).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const snap = await getDocs(query(collection(requireFirestoreDb(), COLLECTIONS.USERS), limit(MAX_SEARCH_POOL)))
  return snap.docs
    .map((docSnap) => userFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
    .map((user) => ({ ...user, matchScore: scoreUser(user, terms) }))
    .filter((user) => user.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || (a.name ?? '').localeCompare(b.name ?? ''))
    .slice(0, MAX_RESULTS)
}
