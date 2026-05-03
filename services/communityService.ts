// services/communityService.ts
// All Firestore operations for community posts, comments, and reactions.
// Mock seed data is provided so the UI renders immediately without Firebase data.

import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  increment,
  Unsubscribe,
  setDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { requireFirestoreDb, requireFirebaseStorage } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import {
  CommunityPost,
  CommunityComment,
  CommunityPostReport,
  CommunityReportReason,
  CommunityReportStatus,
  PostType,
  ReactionType,
  CircleId,
} from '@/lib/types'

// ── MOCK SEED DATA ────────────────────────────────────────────────────────────
// Realistic data so the Community page looks alive from day one.

export const MOCK_POSTS: CommunityPost[] = [
  {
    id: 'mock-1',
    authorId: 'user-arjun',
    authorName: 'Arjun Mehta',
    authorXP: 2340,
    authorSkills: ['React', 'Node.js', 'TypeScript'],
    type: 'Achievement',
    circle: 'coding',
    content:
      'Just won my first KHOJ tournament — Web Dev Championship Season 2! 🔥 6 months ago I couldn\'t write a proper API. Today I built a full-stack app under 4 hours of pressure. This community pushed me to actually ship, not just learn. Thank you KHOJ.',
    reactions: { like: 142, fire: 88, clap: 64, insightful: 12, support: 8 },
    commentCount: 3,
    saveCount: 27,
    shareCount: 19,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pinned: true,
  },
  {
    id: 'mock-2',
    authorId: 'user-priya',
    authorName: 'Priya Sharma',
    authorXP: 1890,
    authorSkills: ['UI/UX', 'Figma', 'Design Systems'],
    type: 'Story',
    circle: 'design',
    content:
      'My journey from rejected freelancer to KHOJ Rank #7 in Design. 18 months. 3 failed projects. 12 tournaments. And finally — a recruiter DM from a Series B startup. Proof that visible skill beats a polished resume every time. Thread 🧵',
    reactions: { like: 98, fire: 71, clap: 55, insightful: 43, support: 22 },
    commentCount: 2,
    saveCount: 61,
    shareCount: 33,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    authorId: 'user-karan',
    authorName: 'Karan Bhatia',
    authorXP: 780,
    authorSkills: ['Python', 'ML', 'FastAPI'],
    type: 'Team-Up',
    circle: 'team-search',
    content:
      'Looking for 2 teammates for the upcoming AI/ML championship. I\'ll handle the backend + model training. Need:\n\n→ Frontend dev (React preferred)\n→ Data engineer or analyst\n\nCommit: 8–10 hrs/week for 3 weeks. First-time tournament? Perfect — let\'s grind together. Drop a comment or DM.',
    reactions: { like: 44, fire: 18, clap: 9, insightful: 5, support: 31 },
    commentCount: 2,
    saveCount: 8,
    shareCount: 12,
    createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-4',
    authorId: 'user-sara',
    authorName: 'Sara Qureshi',
    authorXP: 3100,
    authorSkills: ['Go', 'Kubernetes', 'AWS'],
    type: 'Showcase',
    circle: 'coding',
    content:
      'Built a real-time leaderboard system that handles 10k concurrent users using Go + Redis + WebSockets. Open sourced it as part of my KHOJ portfolio. Zero downtime deploys, p99 latency under 12ms. Infra nerds — lmk what you think. GitHub link in comments.',
    imageUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80',
    reactions: { like: 203, fire: 166, clap: 94, insightful: 87, support: 14 },
    commentCount: 1,
    saveCount: 118,
    shareCount: 44,
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-5',
    authorId: 'user-rishi',
    authorName: 'Rishikesh Nair',
    authorXP: 560,
    authorSkills: ['JavaScript', 'Vue', 'PostgreSQL'],
    type: 'Discussion',
    circle: 'career',
    content:
      'Hot take: Competitive platforms like KHOJ are the new resume. In 2025, showing up and building in public consistently matters more than what your college was. A 2000 XP profile with tournament wins is worth more than a certificate from a brand-name bootcamp. Agree or disagree?',
    reactions: { like: 77, fire: 42, clap: 29, insightful: 68, support: 6 },
    commentCount: 2,
    saveCount: 22,
    shareCount: 38,
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-6',
    authorId: 'user-meena',
    authorName: 'Meena Krishnan',
    authorXP: 1440,
    authorSkills: ['React Native', 'Firebase', 'UX Research'],
    type: 'Story',
    circle: 'coding',
    content:
      'I almost quit KHOJ after my first tournament loss. Got zero points. Felt stupid. But I came back the next week, and the week after. Month 3: won my first solo challenge. Month 5: ranked in the top 50. If you\'re reading this after a loss — one more round. Always one more round.',
    reactions: { like: 289, fire: 134, clap: 201, insightful: 44, support: 178 },
    commentCount: 2,
    saveCount: 93,
    shareCount: 87,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
]

export const MOCK_COMMENTS: CommunityComment[] = [
  {
    id: 'c1',
    postId: 'mock-1',
    authorId: 'user-priya',
    authorName: 'Priya Sharma',
    authorXP: 1890,
    content: 'This is incredible. You were in my bracket in Round 2. You absolutely deserved this win. 🔥',
    createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    postId: 'mock-1',
    authorId: 'user-karan',
    authorName: 'Karan Bhatia',
    authorXP: 780,
    content: 'What was your stack for the final round? Would love to learn from it.',
    createdAt: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c3',
    postId: 'mock-1',
    authorId: 'user-meena',
    authorName: 'Meena Krishnan',
    authorXP: 1440,
    content: 'This post made my morning. Congratulations, champion!',
    createdAt: new Date(Date.now() - 0.8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c4',
    postId: 'mock-2',
    authorId: 'user-arjun',
    authorName: 'Arjun Mehta',
    authorXP: 2340,
    content: 'That recruiter DM arc is elite. Please post the full thread.',
    createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c5',
    postId: 'mock-2',
    authorId: 'user-sara',
    authorName: 'Sara Qureshi',
    authorXP: 3100,
    content: 'Visible work wins. This is exactly why KHOJ matters.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c6',
    postId: 'mock-3',
    authorId: 'user-rishi',
    authorName: 'Rishikesh Nair',
    authorXP: 560,
    content: 'I can help on frontend. Mostly React and Postgres on my side.',
    createdAt: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c7',
    postId: 'mock-3',
    authorId: 'user-meena',
    authorName: 'Meena Krishnan',
    authorXP: 1440,
    content: 'Love the clarity here. Hope you find the right team quickly.',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c8',
    postId: 'mock-4',
    authorId: 'user-priya',
    authorName: 'Priya Sharma',
    authorXP: 1890,
    content: 'This architecture looks clean. Would read a full breakdown.',
    createdAt: new Date(Date.now() - 13.2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c9',
    postId: 'mock-5',
    authorId: 'user-karan',
    authorName: 'Karan Bhatia',
    authorXP: 780,
    content: 'Agree. Real output is becoming the new signal.',
    createdAt: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c10',
    postId: 'mock-5',
    authorId: 'user-priya',
    authorName: 'Priya Sharma',
    authorXP: 1890,
    content: 'It still depends on the role, but platforms like this definitely help.',
    createdAt: new Date(Date.now() - 20.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c11',
    postId: 'mock-6',
    authorId: 'user-arjun',
    authorName: 'Arjun Mehta',
    authorXP: 2340,
    content: 'Needed this reminder today. Respect for staying in the arena.',
    createdAt: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c12',
    postId: 'mock-6',
    authorId: 'user-sara',
    authorName: 'Sara Qureshi',
    authorXP: 3100,
    content: 'One more round is exactly the mindset. Great post.',
    createdAt: new Date(Date.now() - 28.3 * 60 * 60 * 1000).toISOString(),
  },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export { timeAgo }

let localMockComments: CommunityComment[] = [...MOCK_COMMENTS]

function getFallbackComments(postId: string): CommunityComment[] {
  return localMockComments
    .filter((comment) => comment.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function getDisplayCommentCount(post: CommunityPost): number {
  const fallbackCount = getFallbackComments(post.id).length
  return post.id.startsWith('mock-') ? fallbackCount : Math.max(post.commentCount ?? 0, fallbackCount)
}

function getSavedPostsStorageKey(userId: string) {
  return `khoj-community-saved:${userId}`
}

function readSavedPostIds(userId: string): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getSavedPostsStorageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeSavedPostIds(userId: string, postIds: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getSavedPostsStorageKey(userId), JSON.stringify(postIds))
}

const LOCAL_REPORTS_KEY = 'khoj-community-reports'
const LOCAL_DELETED_POSTS_KEY = 'khoj-community-deleted-posts'
const COMMUNITY_LOCAL_CHANGE_EVENT = 'khoj-community-local-change'

function emitCommunityLocalChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COMMUNITY_LOCAL_CHANGE_EVENT))
  }
}

function readDeletedPostIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_DELETED_POSTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeDeletedPostIds(postIds: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_DELETED_POSTS_KEY, JSON.stringify(postIds))
  emitCommunityLocalChange()
}

function filterDeletedPosts(posts: CommunityPost[]): CommunityPost[] {
  const deletedPostIds = new Set(readDeletedPostIds())
  return posts.filter((post) => !deletedPostIds.has(post.id))
}

function readLocalReports(): CommunityPostReport[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(LOCAL_REPORTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? (parsed as CommunityPostReport[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      : []
  } catch {
    return []
  }
}

function writeLocalReports(reports: CommunityPostReport[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports))
  emitCommunityLocalChange()
}

function mergeReports(reports: CommunityPostReport[]): CommunityPostReport[] {
  const map = new Map<string, CommunityPostReport>()

  reports.forEach((report) => {
    if (report?.reportId) {
      map.set(report.reportId, report)
    }
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ── POSTS ─────────────────────────────────────────────────────────────────────

export interface CreatePostInput {
  authorId: string
  authorName: string
  authorXP: number
  authorSkills: string[]
  type: PostType
  circle: CircleId
  content: string
  imageUrl?: string
}

export async function uploadCommunityImage(file: File, userId: string): Promise<string> {
  if (!file) {
    throw new Error('No image file selected.')
  }

  const supportedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!supportedTypes.includes(file.type)) {
    throw new Error('Only PNG, JPG, JPEG, and WEBP images are supported.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `community/${userId}/${Date.now()}-${safeName}`
  const storageRef = ref(requireFirebaseStorage(), path)

  try {
    await uploadBytes(storageRef, file)
    return await getDownloadURL(storageRef)
  } catch (error) {
    console.error('Community image upload failed:', error)
    throw new Error('Image upload failed. Please check Firebase Storage configuration and permissions.')
  }
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS), {
    ...input,
    reactions: { like: 0, fire: 0, clap: 0, insightful: 0, support: 0 },
    commentCount: 0,
    saveCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

export async function getPosts(circleFilter?: CircleId, count = 20): Promise<CommunityPost[]> {
  try {
    let q = query(
      collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS),
      orderBy('createdAt', 'desc'),
      limit(count)
    )
    if (circleFilter) {
      q = query(
        collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS),
        where('circle', '==', circleFilter),
        orderBy('createdAt', 'desc'),
        limit(count)
      )
    }
    const snap = await getDocs(q)
    if (snap.empty) return filterDeletedPosts(MOCK_POSTS)
    return filterDeletedPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost)))
  } catch {
    // Return mock data if Firestore not set up yet
    return filterDeletedPosts(MOCK_POSTS)
  }
}

export function subscribeToFeed(
  onUpdate: (posts: CommunityPost[]) => void,
  circleFilter?: CircleId,
  count = 20
): Unsubscribe {
  const bindLocalListeners = (baseUnsubscribe?: Unsubscribe): Unsubscribe => {
    if (typeof window === 'undefined') {
      return baseUnsubscribe ?? (() => {})
    }

    const refreshFeed = () => {
      void getPosts(circleFilter, count).then(onUpdate)
    }

    window.addEventListener(COMMUNITY_LOCAL_CHANGE_EVENT, refreshFeed)
    window.addEventListener('storage', refreshFeed)

    return () => {
      baseUnsubscribe?.()
      window.removeEventListener(COMMUNITY_LOCAL_CHANGE_EVENT, refreshFeed)
      window.removeEventListener('storage', refreshFeed)
    }
  }

  try {
    const q = circleFilter
      ? query(
          collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS),
          where('circle', '==', circleFilter),
          orderBy('createdAt', 'desc'),
          limit(count)
        )
      : query(
          collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS),
          orderBy('createdAt', 'desc'),
          limit(count)
        )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          onUpdate(filterDeletedPosts(MOCK_POSTS))
          return
        }
        onUpdate(filterDeletedPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost))))
      },
      () => onUpdate(filterDeletedPosts(MOCK_POSTS))
    )

    return bindLocalListeners(unsubscribe)
  } catch {
    onUpdate(filterDeletedPosts(MOCK_POSTS))
    return bindLocalListeners()
  }
}

export async function deletePost(postId: string): Promise<void> {
  localMockComments = localMockComments.filter((comment) => comment.postId !== postId)

  const deletedPostIds = new Set(readDeletedPostIds())
  deletedPostIds.add(postId)
  writeDeletedPostIds(Array.from(deletedPostIds))

  try {
    await deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId))
  } catch {
    // Mock posts or local-only content may not exist in Firestore.
  }
}

export interface SubmitPostReportInput {
  post: CommunityPost
  reporterUserId: string
  reporterName?: string
  reason: CommunityReportReason
  details?: string
}

export async function submitPostReport(input: SubmitPostReportInput): Promise<CommunityPostReport> {
  const createdAt = new Date().toISOString()
  const report: CommunityPostReport = {
    reportId: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId: input.post.id,
    reporterUserId: input.reporterUserId,
    reporterName: input.reporterName,
    postOwnerUserId: input.post.authorId,
    postOwnerName: input.post.authorName,
    postPreview: input.post.content.slice(0, 220),
    reason: input.reason,
    details: input.details?.trim() ?? '',
    status: 'pending',
    createdAt,
  }

  writeLocalReports(mergeReports([report, ...readLocalReports()]))

  try {
    await setDoc(doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_REPORTS, report.reportId), report)
  } catch {
    // Preserve local fallback so the review flow still works during setup.
  }

  return report
}

export async function getReportedPosts(): Promise<CommunityPostReport[]> {
  const localReports = readLocalReports()

  try {
    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_REPORTS),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      return localReports
    }

    const firestoreReports = snap.docs.map((item) => item.data() as CommunityPostReport)
    return mergeReports([...localReports, ...firestoreReports])
  } catch {
    return localReports
  }
}

export function subscribeToReportedPosts(
  onUpdate: (reports: CommunityPostReport[]) => void
): Unsubscribe {
  const bindLocalListeners = (baseUnsubscribe?: Unsubscribe): Unsubscribe => {
    if (typeof window === 'undefined') {
      return baseUnsubscribe ?? (() => {})
    }

    const refreshReports = () => {
      void getReportedPosts().then(onUpdate)
    }

    window.addEventListener(COMMUNITY_LOCAL_CHANGE_EVENT, refreshReports)
    window.addEventListener('storage', refreshReports)

    return () => {
      baseUnsubscribe?.()
      window.removeEventListener(COMMUNITY_LOCAL_CHANGE_EVENT, refreshReports)
      window.removeEventListener('storage', refreshReports)
    }
  }

  try {
    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_REPORTS),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const firestoreReports = snap.docs.map((item) => item.data() as CommunityPostReport)
        onUpdate(mergeReports([...readLocalReports(), ...firestoreReports]))
      },
      () => {
        onUpdate(readLocalReports())
      }
    )

    return bindLocalListeners(unsubscribe)
  } catch {
    onUpdate(readLocalReports())
    return bindLocalListeners()
  }
}

export async function updateReportStatus(
  reportId: string,
  status: CommunityReportStatus,
  reviewedBy?: string
): Promise<CommunityPostReport | null> {
  const reviewedAt = new Date().toISOString()
  const localReports = readLocalReports()
  const existing = localReports.find((report) => report.reportId === reportId) ?? null

  const updatedReport = existing
    ? {
        ...existing,
        status,
        reviewedBy: reviewedBy ?? existing.reviewedBy,
        reviewedAt,
      }
    : null

  if (updatedReport) {
    writeLocalReports(
      localReports.map((report) => (report.reportId === reportId ? updatedReport : report))
    )
  }

  try {
    await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_REPORTS, reportId), {
      status,
      reviewedBy: reviewedBy ?? null,
      reviewedAt,
    })
  } catch {
    // Local state is already updated for fallback behavior.
  }

  return updatedReport
}

export async function deleteReportedPost(
  postId: string,
  reportId: string,
  reviewedBy?: string
): Promise<void> {
  await deletePost(postId)
  await updateReportStatus(reportId, 'action_taken', reviewedBy)
}

// ── REACTIONS ─────────────────────────────────────────────────────────────────

// User's reaction is stored in a subcollection: communityPosts/{postId}/userReactions/{userId}
export async function reactToPost(
  postId: string,
  userId: string,
  reaction: ReactionType
): Promise<void> {
  const userReactionRef = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId, 'userReactions', userId)
  const existing = await getDoc(userReactionRef)

  const postRef = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId)

  if (existing.exists()) {
    const prev = existing.data().reaction as ReactionType
    if (prev === reaction) {
      // Toggle off — remove reaction
      await deleteDoc(userReactionRef)
      await updateDoc(postRef, { [`reactions.${reaction}`]: increment(-1) })
    } else {
      // Switch reaction
      await setDoc(userReactionRef, { reaction, userId })
      await updateDoc(postRef, {
        [`reactions.${prev}`]: increment(-1),
        [`reactions.${reaction}`]: increment(1),
      })
    }
  } else {
    // New reaction
    await setDoc(userReactionRef, { reaction, userId })
    await updateDoc(postRef, { [`reactions.${reaction}`]: increment(1) })
  }
}

export async function getUserReaction(postId: string, userId: string): Promise<ReactionType | null> {
  try {
    const ref = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId, 'userReactions', userId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data().reaction as ReactionType
  } catch {
    return null
  }
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────

export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  authorXP: number,
  content: string
): Promise<CommunityComment> {
  const createdAt = new Date().toISOString()

  try {
    const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_COMMENTS), {
      postId,
      authorId,
      authorName,
      authorXP,
      content,
      createdAt,
    })

    const createdComment: CommunityComment = {
      id: ref.id,
      postId,
      authorId,
      authorName,
      authorXP,
      content,
      createdAt,
    }

    localMockComments = [...localMockComments, createdComment]

    try {
      await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId), {
        commentCount: increment(1),
      })
    } catch {
      // Keep the comment visible even if the parent post counter cannot be updated.
    }

    return createdComment
  } catch {
    const fallbackComment: CommunityComment = {
      id: `local-${Date.now()}`,
      postId,
      authorId,
      authorName,
      authorXP,
      content,
      createdAt,
    }

    localMockComments = [...localMockComments, fallbackComment]
    return fallbackComment
  }
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  try {
    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc'),
      limit(50)
    )
    const snap = await getDocs(q)
    if (snap.empty) return getFallbackComments(postId)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityComment))
  } catch {
    return getFallbackComments(postId)
  }
}

export function subscribeToComments(
  postId: string,
  onUpdate: (comments: CommunityComment[]) => void
): Unsubscribe {
  try {
    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.COMMUNITY_COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          onUpdate(getFallbackComments(postId))
          return
        }
        onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityComment)))
      },
      () => onUpdate(getFallbackComments(postId))
    )
  } catch {
    onUpdate(getFallbackComments(postId))
    return () => {}
  }
}

// ── SAVES ─────────────────────────────────────────────────────────────────────

export async function isPostSaved(postId: string, userId: string): Promise<boolean> {
  const locallySaved = readSavedPostIds(userId).includes(postId)

  try {
    const ref = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId, 'saves', userId)
    const snap = await getDoc(ref)
    return snap.exists() || locallySaved
  } catch {
    return locallySaved
  }
}

export async function savePost(postId: string, userId: string): Promise<boolean> {
  const savedIds = new Set(readSavedPostIds(userId))
  const willBeSaved = !savedIds.has(postId)

  if (willBeSaved) {
    savedIds.add(postId)
  } else {
    savedIds.delete(postId)
  }

  writeSavedPostIds(userId, Array.from(savedIds))

  try {
    const ref = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId, 'saves', userId)
    const existing = await getDoc(ref)
    const postRef = doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId)

    if (existing.exists()) {
      await deleteDoc(ref)
      await updateDoc(postRef, { saveCount: increment(-1) })
      return false
    }

    await setDoc(ref, { userId, postId, savedAt: new Date().toISOString() })

    try {
      await updateDoc(postRef, { saveCount: increment(1) })
    } catch {
      // Mock posts may not exist in Firestore; local saved state is still preserved.
    }

    return true
  } catch {
    return willBeSaved
  }
}

export async function getSavedPosts(userId: string): Promise<CommunityPost[]> {
  const savedIds = new Set(readSavedPostIds(userId))

  try {
    const savesQuery = query(collectionGroup(requireFirestoreDb(), 'saves'), where('userId', '==', userId))
    const snap = await getDocs(savesQuery)

    snap.docs.forEach((savedDoc) => {
      const parentPostId = savedDoc.ref.parent.parent?.id
      if (parentPostId) {
        savedIds.add(parentPostId)
      }
    })
  } catch {
    // Fall back to locally persisted saved posts.
  }

  const savedPosts = await Promise.all(
    Array.from(savedIds).map(async (postId) => {
      const mockPost = MOCK_POSTS.find((post) => post.id === postId)
      if (mockPost) return mockPost

      try {
        const snap = await getDoc(doc(requireFirestoreDb(), COLLECTIONS.COMMUNITY_POSTS, postId))
        if (!snap.exists()) return null
        return { id: snap.id, ...snap.data() } as CommunityPost
      } catch {
        return null
      }
    })
  )

  return filterDeletedPosts(savedPosts.filter((post): post is CommunityPost => Boolean(post)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getUserPosts(userId: string): Promise<CommunityPost[]> {
  const allPosts = await getPosts(undefined, 100)

  return allPosts
    .filter((post) => post.authorId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
