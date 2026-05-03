// services/portfolioService.ts
// Data access layer for public portfolio pages.
//
// HOW TO CONNECT A REAL DATABASE:
//   1. Replace the mock lookup below with a Firestore/Supabase/API call.
//   2. The function signatures stay the same — no changes needed in components.
//   3. Example Firestore swap:
//        const snap = await getDoc(doc(db, 'portfolios', uid))
//        return snap.exists() ? (snap.data() as PortfolioUser) : null
//
// The mock falls back to KhojUser data if a portfolio document doesn't exist yet,
// so the page always shows *something* for every registered user.

import { getUserById, getMatchHistory } from '@/services/userService'
import { getUserPosts } from '@/services/communityService'
import { getMockPortfolioUser } from '@/lib/portfolio/mockPortfolioData'
import { PortfolioUser, CommunityPost, MatchHistoryEntry } from '@/lib/types'

export interface FullPortfolioData {
  user: PortfolioUser
  posts: CommunityPost[]
  matchHistory: MatchHistoryEntry[]
}

/**
 * Fetch everything needed to render a public portfolio page.
 * Priority: mock data (rich) → live KhojUser (basic fields only) → null
 */
export async function getFullPortfolioData(uid: string): Promise<FullPortfolioData | null> {
  // 1. Try rich mock / future DB portfolio document
  const mockUser = getMockPortfolioUser(uid)

  if (mockUser) {
    const [posts, matchHistory] = await Promise.all([
      getUserPosts(uid).catch(() => [] as CommunityPost[]),
      getMatchHistory(uid).catch(() => [] as MatchHistoryEntry[]),
    ])
    return { user: mockUser, posts, matchHistory }
  }

  // 2. Fallback: build minimal PortfolioUser from KhojUser document
  const [khojUser, posts, matchHistory] = await Promise.all([
    getUserById(uid).catch(() => null),
    getUserPosts(uid).catch(() => [] as CommunityPost[]),
    getMatchHistory(uid).catch(() => [] as MatchHistoryEntry[]),
  ])

  if (!khojUser) return null

  const fallbackUser: PortfolioUser = {
    uid: khojUser.uid,
    name: khojUser.name,
    xp: khojUser.xp,
    rank: khojUser.rank,
    wins: khojUser.wins,
    matchesPlayed: khojUser.matchesPlayed,
    skills: khojUser.skills,
    createdAt: khojUser.createdAt,
    achievements: [],
    projects: [],
    competitions: [],
    socialLinks: {},
  }

  return { user: fallbackUser, posts, matchHistory }
}
