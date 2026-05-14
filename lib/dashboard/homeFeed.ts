// lib/dashboard/homeFeed.ts
// KHOJ Home Feed — type definitions and placeholder data.
// Each block is clearly marked with the real Firebase collection to connect later.

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedItemType = 'Startup' | 'Progress' | 'Opportunity' | 'Achievement' | 'Arena' | 'Project'

export interface FeedItem {
  id: string
  type: FeedItemType
  authorId: string
  authorName: string
  authorRole: string
  /** Optional avatar URL — falls back to letter avatar */
  authorPhoto?: string
  content: string
  /** ISO datetime string */
  timestamp: string
  /** Human-readable name for the related resource */
  relatedTitle?: string
  /** Next.js route for the CTA button */
  relatedUrl?: string
  /** Optional card image */
  thumbnailUrl?: string
  likes: number
  comments: number
}

// ── Placeholder Feed ──────────────────────────────────────────────────────────
// Shown immediately. Replace each section comment with a real Firestore query.
//
// Firebase collection map:
//   Startup     → lib/collaboration/roomQueries  (startup rooms & co-founder requests)
//   Progress    → growth roadmap progress signals
//   Opportunity → services/jobService + services/tournamentService
//   Achievement → services/tournamentService (publishTournamentResult), leaderboard
//   Arena       → services/mediaService          (uploaded videos)
//   Project     → services/communityService      (type = 'Showcase')

export const PLACEHOLDER_FEED: FeedItem[] = [
  // ── Startup (connect: COLLECTIONS.COLLAB_ROOMS) ───────────────────────────
  {
    id: 'feed-1',
    type: 'Startup',
    authorId: 'user-rishabh',
    authorName: 'Rishabh Tiwari',
    authorRole: 'Founder · AI',
    content:
      'AI Study Buddy is looking for a Technical Co-founder. We have 200 beta users and seed-stage interest. Stack: Next.js, Python, LangChain. If you can ship fast and think in systems — let\'s talk.',
    relatedTitle: 'AI Study Buddy',
    relatedUrl: '/rooms',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    likes: 34,
    comments: 12,
  },
  // ── Achievement (connect: COLLECTIONS.RESULTS + leaderboard) ─────────────
  {
    id: 'feed-2',
    type: 'Achievement',
    authorId: 'user-bigbos',
    authorName: 'Bigbos Dev',
    authorRole: 'Full-Stack Developer',
    content:
      'Reached Top 10 in the KHOJ Weekly Leaderboard for the second week in a row. Consistency beats intensity — showing up every day is the edge.',
    relatedTitle: 'Weekly Leaderboard',
    relatedUrl: '/leaderboard',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 87,
    comments: 23,
  },
  // ── Progress ─────────────────────────────────────────────────────────────
  {
    id: 'feed-3',
    type: 'Progress',
    authorId: 'user-sujit',
    authorName: 'Sujit Karki',
    authorRole: 'Frontend Developer',
    content:
      'Just completed a Frontend Developer growth roadmap milestone — 12 lessons, 4 projects, 3 months of consistent effort. Next: building my public portfolio with every project from this roadmap.',
    relatedTitle: 'Frontend Developer Roadmap',
    relatedUrl: '/khoj-ai',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    likes: 62,
    comments: 18,
  },
  // ── Opportunity (connect: COLLECTIONS.TOURNAMENTS) ────────────────────────
  {
    id: 'feed-4',
    type: 'Opportunity',
    authorId: 'platform',
    authorName: 'KHOJ Platform',
    authorRole: 'Official',
    content:
      'New Web Dev Challenge starts tomorrow. 48-hour hackathon format. Top 3 win XP prizes and recruiter visibility badges. Registration closes tonight.',
    relatedTitle: 'Web Dev Challenge',
    relatedUrl: '/tournaments',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likes: 118,
    comments: 41,
  },
  // ── Arena (connect: services/mediaService — uploaded videos) ─────────────
  {
    id: 'feed-5',
    type: 'Arena',
    authorId: 'user-rahul',
    authorName: 'Rahul Verma',
    authorRole: 'React Developer',
    content:
      'Uploaded a full React + TypeScript portfolio dashboard demo — dark mode, real-time updates, and smooth animations. Check it out in the Arena.',
    relatedTitle: 'React Portfolio Demo',
    relatedUrl: '/arena',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600&q=70',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    likes: 203,
    comments: 57,
  },
  // ── Startup ───────────────────────────────────────────────────────────────
  {
    id: 'feed-6',
    type: 'Startup',
    authorId: 'user-ananya',
    authorName: 'Ananya Singh',
    authorRole: 'Founder · EdTech',
    content:
      'PeerLearn just crossed 500 beta signups in week one. Looking for a mobile developer (React Native preferred) to join as co-founder. Equity split, pre-revenue. Let\'s build something real.',
    relatedTitle: 'PeerLearn Startup Room',
    relatedUrl: '/rooms',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    likes: 45,
    comments: 19,
  },
  // ── Project (connect: COLLECTIONS.COMMUNITY_POSTS type=Showcase) ─────────
  {
    id: 'feed-7',
    type: 'Project',
    authorId: 'user-dev-k',
    authorName: 'Dev Khatri',
    authorRole: 'Backend Engineer',
    content:
      'Open-sourced my real-time collaboration tool built during the KHOJ DevOps Track. Uses Redis pub/sub + WebSockets. 0 → 10k concurrent users in 6 hours of a stress test. Link in comments.',
    relatedTitle: 'Collab Engine',
    relatedUrl: '/community',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    likes: 175,
    comments: 44,
  },
  // ── Progress ─────────────────────────────────────────────────────────────
  {
    id: 'feed-8',
    type: 'Progress',
    authorId: 'user-meera',
    authorName: 'Meera Pillai',
    authorRole: 'UI/UX Designer',
    content:
      'Started a Design Systems growth roadmap today. Already on lesson 3. The breakdown of component architecture in Figma + token setup is exactly what I was missing.',
    relatedTitle: 'Design Systems Roadmap',
    relatedUrl: '/khoj-ai',
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    likes: 31,
    comments: 9,
  },
  // ── Opportunity (connect: COLLECTIONS.JOBS) ───────────────────────────────
  {
    id: 'feed-9',
    type: 'Opportunity',
    authorId: 'user-zepto',
    authorName: 'Zepto Engineering',
    authorRole: 'Recruiter',
    content:
      'Hiring mid-level backend engineers (Go / Node.js) in Bangalore. No degree requirement — KHOJ profile + proven project work is all we need. Apply through Jobs.',
    relatedTitle: 'Backend Engineer @ Zepto',
    relatedUrl: '/jobs',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    likes: 267,
    comments: 88,
  },
  // ── Achievement ───────────────────────────────────────────────────────────
  {
    id: 'feed-10',
    type: 'Achievement',
    authorId: 'user-preethi',
    authorName: 'Preethi Rajan',
    authorRole: 'DSA Specialist',
    content:
      'Won the DSA Championship — solved all 5 problems in under 90 minutes. Six months ago I was struggling with arrays. KHOJ practice milestones + daily challenges made the difference.',
    relatedTitle: 'DSA Championship',
    relatedUrl: '/tournaments',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    likes: 312,
    comments: 76,
  },
]

// Placeholder set of "followed" author IDs.
// Replace with a real Firestore query: users/{uid}/following collection.
export const PLACEHOLDER_FOLLOWING_IDS = ['user-rishabh', 'user-bigbos', 'user-rahul']
