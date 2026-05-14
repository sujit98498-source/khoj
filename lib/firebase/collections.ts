// lib/firebase/collections.ts
// Centralized Firestore collection path constants
// Prevents typos and makes refactoring easy

export const COLLECTIONS = {
  USERS: 'users',
  TOURNAMENTS: 'tournaments',
  MATCHES: 'matches',
  ANNOUNCEMENTS: 'announcements',
  RESULTS: 'results',
  NOTIFICATIONS: 'notifications',
  COMMUNITY_POSTS: 'communityPosts',
  COMMUNITY_COMMENTS: 'communityComments',
  COMMUNITY_REPORTS: 'communityReports',
  ROOM_MESSAGES: 'roomMessages',
  JOBS: 'jobs',
  SERVICES: 'services',
  PROJECTS: 'projects',
  PROPOSALS: 'proposals',
  SAVED_JOBS: 'savedJobs',
  OPPORTUNITIES: 'opportunities',
  PAYMENTS: 'payments',
  PAYOUTS: 'payouts',
  // Social
  FRIEND_REQUESTS: 'friendRequests',
  FRIENDS: 'friends',
  CONVERSATIONS: 'conversations',
  CALLS: 'calls',
  // AI
  STARTUP_EVALUATIONS: 'startupEvaluations',
  GROWTH_CONTENT_IDEAS: 'growthContentIdeas',
} as const

// Subcollection helpers
export const subCollections = {
  matchHistory: (userId: string) => `users/${userId}/matchHistory`,
  participants: (tournamentId: string) => `tournaments/${tournamentId}/participants`,
  messages: (conversationId: string) => `conversations/${conversationId}/messages`,
}
