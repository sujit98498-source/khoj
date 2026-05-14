// packages/firebase/src/collections.ts
// Firestore collection name constants shared across web and mobile.
// Mirrors lib/firebase/collections.ts on the web side.

export const COLLECTIONS = {
  USERS: 'users',
  TOURNAMENTS: 'tournaments',
  MATCHES: 'matches',
  ROOMS: 'rooms',
  ANNOUNCEMENTS: 'announcements',
  COMMUNITY_POSTS: 'communityPosts',
  COMMENTS: 'comments',
  NOTIFICATIONS: 'notifications',
  RESULTS: 'results',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
