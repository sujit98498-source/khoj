// services/portfolioService.ts
// Data access layer for public portfolio pages.
//
// Private beta source of truth:
//   users/{uid} stores both auth/account fields and extended public profile fields.
// Mock portfolio data remains only as a demo fallback for seeded sample users.

import { getUserById, getMatchHistory } from '@/services/userService'
import { getUserPosts } from '@/services/communityService'
import { getMockPortfolioUser } from '@/lib/portfolio/mockPortfolioData'
import { PortfolioUser, CommunityPost, MatchHistoryEntry, KhojUser } from '@/lib/types'

export interface FullPortfolioData {
  user: PortfolioUser
  posts: CommunityPost[]
  matchHistory: MatchHistoryEntry[]
}

type UserProfileDoc = KhojUser & Partial<PortfolioUser>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asObject<T extends object>(value: unknown, fallback: T): T {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : fallback
}

function buildPortfolioUser(user: UserProfileDoc): PortfolioUser {
  return {
    uid: user.uid,
    name: user.name,
    username: user.username,
    headline: user.headline,
    bio: user.bio,
    field: user.field,
    avatarUrl: user.avatarUrl,
    availableForOpportunities: user.availableForOpportunities ?? false,
    contactVisible: user.contactVisible ?? false,
    contactEmail: user.contactEmail,
    location: user.location,
    country: user.country,
    verifiedChampion: user.verifiedChampion,
    xp: Number(user.xp ?? 0),
    rank: Number(user.rank ?? 0),
    wins: Number(user.wins ?? 0),
    matchesPlayed: Number(user.matchesPlayed ?? 0),
    skills: asArray<string>(user.skills),
    createdAt: user.createdAt,
    achievements: asArray(user.achievements),
    projects: asArray(user.projects),
    competitions: asArray(user.competitions),
    socialLinks: asObject(user.socialLinks, {}),
    education: asArray(user.education),
    experience: asArray(user.experience),
  }
}

/**
 * Fetch everything needed to render a public portfolio page.
 * Priority: live users/{uid} profile → seeded mock profile → null.
 */
export async function getFullPortfolioData(uid: string): Promise<FullPortfolioData | null> {
  const [khojUser, posts, matchHistory] = await Promise.all([
    getUserById(uid).catch(() => null),
    getUserPosts(uid).catch(() => [] as CommunityPost[]),
    getMatchHistory(uid).catch(() => [] as MatchHistoryEntry[]),
  ])

  if (khojUser) {
    return { user: buildPortfolioUser(khojUser as UserProfileDoc), posts, matchHistory }
  }

  const mockUser = getMockPortfolioUser(uid)
  if (!mockUser) return null

  return { user: mockUser, posts, matchHistory }
}
