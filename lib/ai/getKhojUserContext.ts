import { getAdminDb } from '@/lib/firebase/admin'

export interface KhojUserContext {
  name: string
  role: string
  xp: number | null
  rank: number | null
  completedRoadmapItems: string[]
  inProgressRoadmapItems: string[]
  startupRooms: string[]
  portfolioItems: string[]
  opportunitiesApplied: string[]
  skills: string[]
  preferences: {
    goals: string[]
    interests: string[]
    preferredLanguage?: string
  }
}

const EMPTY_USER_CONTEXT: KhojUserContext = {
  name: 'KHOJ user',
  role: 'user',
  xp: null,
  rank: null,
  completedRoadmapItems: [],
  inProgressRoadmapItems: [],
  startupRooms: [],
  portfolioItems: [],
  opportunitiesApplied: [],
  skills: [],
  preferences: {
    goals: [],
    interests: [],
  },
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

function asNumber(input: unknown): number | null {
  return typeof input === 'number' && Number.isFinite(input) ? input : null
}

function asString(input: unknown): string {
  return String(input ?? '').trim()
}

function compactUnique(values: string[], limit = 20): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function getEnrollmentLabel(data: Record<string, unknown>, fallbackId: string): string {
  return asString(data.title) || asString(data.trackTitle) || asString(data.name) || fallbackId
}

export async function getKhojUserContext(userId: string): Promise<KhojUserContext> {
  if (!userId?.trim()) {
    return EMPTY_USER_CONTEXT
  }

  const db = getAdminDb()

  try {
    const userRef = db.collection('users').doc(userId)
    const startupProfileRef = db.collection('startupProfiles').doc(userId)
    const membershipsRef = db.collection('users').doc(userId).collection('roomMemberships')
    const enrollmentsRef = db.collection('users').doc(userId).collection('trackEnrollments')
    const badgesRef = db.collection('users').doc(userId).collection('badges')

    const [userSnap, startupProfileSnap, membershipsSnap, enrollmentsSnap, badgesSnap] = await Promise.all([
      userRef.get(),
      startupProfileRef.get(),
      membershipsRef.limit(10).get(),
      enrollmentsRef.limit(20).get(),
      badgesRef.limit(20).get(),
    ])

    const userData = userSnap.exists ? userSnap.data() ?? {} : {}
    const startupProfile = startupProfileSnap.exists ? startupProfileSnap.data() ?? {} : {}

    const inferredCompletedRoadmapItems = Number((startupProfile as { proofSignals?: { tracksCompleted?: number } }).proofSignals?.tracksCompleted ?? 0)
    const completedRoadmapItemsFromDoc = asStringArray((userData as { completedTracks?: unknown }).completedTracks)
    const completedEnrollments = enrollmentsSnap.docs
      .filter((doc) => {
        const data = doc.data()
        return data.status === 'completed' || Number(data.progressPercent ?? 0) >= 100
      })
      .map((doc) => getEnrollmentLabel(doc.data(), doc.id))
    const badgeRoadmapItems = badgesSnap.docs.map((doc) => getEnrollmentLabel(doc.data(), doc.id))
    const completedRoadmapItems = compactUnique([
      ...completedRoadmapItemsFromDoc,
      ...completedEnrollments,
      ...badgeRoadmapItems,
      ...(completedRoadmapItemsFromDoc.length === 0 && completedEnrollments.length === 0 && badgeRoadmapItems.length === 0 && inferredCompletedRoadmapItems > 0
        ? [`${inferredCompletedRoadmapItems} roadmap milestones completed`]
        : []),
    ])

    const inProgressRoadmapItems = enrollmentsSnap.docs
      .filter((doc) => {
        const data = doc.data()
        const progress = Number(data.progressPercent ?? 0)
        return data.status !== 'completed' && progress > 0 && progress < 100
      })
      .map((doc) => {
        const data = doc.data()
        const label = getEnrollmentLabel(data, doc.id)
        const progress = Number(data.progressPercent ?? 0)
        return progress > 0 ? `${label} (${progress}% complete)` : label
      })
      .slice(0, 10)

    const startupRooms = membershipsSnap.docs
      .map((doc) => {
        const data = doc.data() as { roomTitle?: unknown; title?: unknown }
        return asString(data.title) || asString(data.roomTitle) || doc.id
      })
      .filter(Boolean)
      .slice(0, 10)

    const profileGoals = asStringArray((userData as { goals?: unknown }).goals)
    const startupGoals = asStringArray((startupProfile as { stageInterests?: unknown }).stageInterests)
    const profileInterests = [
      ...asStringArray((userData as { interests?: unknown }).interests),
      ...asStringArray((startupProfile as { industryTags?: unknown }).industryTags),
      ...asStringArray((startupProfile as { roleCategories?: unknown }).roleCategories),
    ]
    const preferredLanguage = asString((userData as { preferredLanguage?: unknown }).preferredLanguage)

    // Return only prompt-safe product context. Emails, auth IDs, photos, social URLs,
    // and other direct identifiers are intentionally excluded.
    return {
      name: asString((userData as { name?: unknown }).name) || 'KHOJ user',
      role: asString((userData as { role?: unknown }).role) || 'user',
      xp: asNumber((userData as { xp?: unknown }).xp),
      rank: asNumber((userData as { rank?: unknown }).rank),
      completedRoadmapItems,
      inProgressRoadmapItems,
      startupRooms,
      portfolioItems: asStringArray((userData as { portfolioItems?: unknown }).portfolioItems),
      opportunitiesApplied: asStringArray((userData as { opportunitiesApplied?: unknown }).opportunitiesApplied),
      skills: compactUnique([
        ...asStringArray((userData as { skills?: unknown }).skills),
        ...asStringArray((startupProfile as { skills?: unknown }).skills),
      ]),
      preferences: {
        goals: compactUnique([...profileGoals, ...startupGoals], 10),
        interests: compactUnique(profileInterests, 10),
        ...(preferredLanguage ? { preferredLanguage } : {}),
      },
    }
  } catch (err) {
    console.error('[KHOJ AI] Failed to fetch user context:', err instanceof Error ? err.message : 'unknown')

    return EMPTY_USER_CONTEXT
  }
}
