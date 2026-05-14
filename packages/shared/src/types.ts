// packages/shared/src/types.ts
// Shared Firestore document types — used by both the Next.js web app and the Expo mobile app.
// Keep in sync with lib/types.ts in the web app.

export interface KhojUser {
  uid: string
  name: string
  email: string
  role?: 'admin' | 'founder' | 'ceo' | 'user'
  isAdmin?: boolean
  avatarUrl?: string
  username?: string
  xp: number
  rank: number
  wins: number
  matchesPlayed: number
  skills: string[]
  createdAt: string
  lastActive: string
  /** Gaming-specific fields */
  gamerTag?: string
  bio?: string
  games?: string[]
  followersCount?: number
  followingCount?: number
  clipsCount?: number
}

export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type TournamentPlacement = 'first' | 'second' | 'third'

export interface TournamentResults {
  first: string
  second: string
  third: string
}

export interface Tournament {
  id: string
  title: string
  name?: string
  description: string
  category: string
  maxPlayers: number
  currentPlayers: number
  entryFee?: number
  prizeXP: number
  prizeMoney?: number
  startDate: string
  endDate: string
  status: TournamentStatus
  results?: TournamentResults
  participants: string[]
  createdBy: string
  createdAt: string
  game?: string
  bannerUrl?: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  createdAt: string
  createdBy: string
}

export interface Match {
  id: string
  tournamentId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  winnerId: string | null
  status: 'pending' | 'room_created' | 'active' | 'under_review' | 'completed'
  xpAwarded: boolean
  createdAt: string
  completedAt: string | null
}

export interface Room {
  id: string
  name: string
  description?: string
  game: string
  hostId: string
  hostName: string
  hostAvatarUrl?: string
  maxPlayers: number
  currentPlayers: number
  status: 'open' | 'in_game' | 'closed'
  isPrivate: boolean
  tags: string[]
  createdAt: string
}

export interface CommunityPost {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  authorUsername?: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'clip'
  likes: number
  comments: number
  likedBy: string[]
  tags: string[]
  game?: string
  createdAt: string
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  content: string
  createdAt: string
}

export interface MatchHistoryEntry {
  matchId: string
  opponentName: string
  result: 'win' | 'loss' | 'draw'
  xpEarned: number
  date: string
  tournamentTitle: string
}

export type XpTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'
  | 'Champion'

export function getXpTier(xp: number): XpTier {
  if (xp < 500) return 'Bronze'
  if (xp < 1500) return 'Silver'
  if (xp < 3000) return 'Gold'
  if (xp < 6000) return 'Platinum'
  if (xp < 10000) return 'Diamond'
  if (xp < 20000) return 'Master'
  if (xp < 40000) return 'Grandmaster'
  return 'Champion'
}

export function getXpTierColor(tier: XpTier): string {
  const colors: Record<XpTier, string> = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
    Diamond: '#B9F2FF',
    Master: '#9B59B6',
    Grandmaster: '#E74C3C',
    Champion: '#F39C12',
  }
  return colors[tier]
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K XP`
  return `${xp} XP`
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
