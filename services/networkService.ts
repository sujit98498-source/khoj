// services/networkService.ts
// Professional KHOJ network graph: Connections, Followers, Following.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Friendship, KhojUser, PortfolioUser } from '@/lib/types'
import { getFullPortfolioData } from '@/services/portfolioService'
import { createNotification } from '@/services/notificationService'
import { areFriends, getFriends } from '@/services/friendRequestService'

export type NetworkTab = 'connections' | 'followers' | 'following'

export interface NetworkUserSnapshot {
  uid: string
  name: string
  username?: string
  avatarUrl?: string
  headline?: string
  role?: string
  bio?: string
  xp?: number
  rank?: number
  connectedAt?: string
  followedAt?: string
}

export interface NetworkCounts {
  connections: number
  followers: number
  following: number
}

export interface NetworkActor {
  uid: string
  name: string
  username?: string
  avatarUrl?: string
  headline?: string
  role?: string
  bio?: string
  xp?: number
  rank?: number
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return undefined
}

function toNetworkUser(id: string, data: Record<string, unknown>): NetworkUserSnapshot {
  return {
    uid: String(data.uid ?? data.userId ?? id),
    name: String(data.name ?? data.userName ?? 'KHOJ User'),
    username: data.username ? String(data.username) : undefined,
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : data.userPhoto ? String(data.userPhoto) : undefined,
    headline: data.headline ? String(data.headline) : undefined,
    role: data.role ? String(data.role) : undefined,
    bio: data.bio ? String(data.bio) : undefined,
    xp: typeof data.xp === 'number' ? data.xp : undefined,
    rank: typeof data.rank === 'number' ? data.rank : undefined,
    connectedAt: toIso(data.connectedAt),
    followedAt: toIso(data.followedAt),
  }
}

function legacyFriendshipToNetworkUser(friendship: Friendship, userId: string): NetworkUserSnapshot {
  const otherId = friendship.userIds.find((id) => id !== userId) ?? ''
  return {
    uid: otherId,
    name: friendship.userNames[otherId] ?? 'KHOJ User',
    username: friendship.userUsernames[otherId] || undefined,
    avatarUrl: friendship.userAvatars[otherId] || undefined,
    connectedAt: friendship.createdAt,
  }
}

function docToLegacyFriendship(id: string, data: Record<string, unknown>): Friendship {
  return {
    id,
    userIds: Array.isArray(data.userIds) ? data.userIds.map(String) : [],
    userNames: (data.userNames ?? {}) as Record<string, string>,
    userAvatars: (data.userAvatars ?? {}) as Record<string, string>,
    userUsernames: (data.userUsernames ?? {}) as Record<string, string>,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
  }
}

function mergeNetworkUsers(
  primary: NetworkUserSnapshot[],
  secondary: NetworkUserSnapshot[]
): NetworkUserSnapshot[] {
  const merged = new Map<string, NetworkUserSnapshot>()
  primary.forEach((user) => {
    if (user.uid) merged.set(user.uid, user)
  })
  secondary.forEach((user) => {
    if (user.uid) merged.set(user.uid, { ...merged.get(user.uid), ...user })
  })
  return Array.from(merged.values())
}

function fromActor(actor: NetworkActor): Record<string, unknown> {
  return {
    uid: actor.uid,
    name: actor.name,
    username: actor.username ?? '',
    avatarUrl: actor.avatarUrl ?? '',
    headline: actor.headline ?? '',
    role: actor.role ?? '',
    bio: actor.bio ?? '',
    xp: actor.xp ?? 0,
    rank: actor.rank ?? 0,
  }
}

export function actorFromKhojUser(user: KhojUser): NetworkActor {
  return {
    uid: user.uid,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    xp: user.xp,
    rank: user.rank,
  }
}

export function actorFromPortfolioUser(user: PortfolioUser): NetworkActor {
  return {
    uid: user.uid,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    headline: user.headline,
    role: user.field,
    bio: user.bio,
    xp: user.xp,
    rank: user.rank,
  }
}

export async function getNetworkUserSnapshot(userId: string): Promise<NetworkUserSnapshot | null> {
  const portfolio = await getFullPortfolioData(userId).catch(() => null)
  if (portfolio?.user) return actorFromPortfolioUser(portfolio.user)

  const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId)).catch(() => null)
  if (!snap?.exists()) return null
  const data = snap.data() as KhojUser
  return actorFromKhojUser({ ...data, uid: data.uid ?? snap.id })
}

export function subscribeNetworkCounts(userId: string, onUpdate: (counts: NetworkCounts) => void): Unsubscribe {
  const counts: NetworkCounts = { connections: 0, followers: 0, following: 0 }
  let mirroredConnectionIds = new Set<string>()
  let legacyConnectionIds = new Set<string>()
  const emit = () => onUpdate({ ...counts })
  const updateConnectionCount = () => {
    counts.connections = new Set(Array.from(mirroredConnectionIds).concat(Array.from(legacyConnectionIds))).size
    emit()
  }

  const unsubs = [
    onSnapshot(collection(db, 'users', userId, 'connections'), (snap) => {
      mirroredConnectionIds = new Set(snap.docs.map((item) => item.id))
      updateConnectionCount()
    }),
    onSnapshot(query(collection(db, COLLECTIONS.FRIENDS), where('userIds', 'array-contains', userId)), (snap) => {
      legacyConnectionIds = new Set(snap.docs.map((friendshipDoc) => {
        const friendship = docToLegacyFriendship(friendshipDoc.id, friendshipDoc.data() as Record<string, unknown>)
        return friendship.userIds.find((id) => id !== userId) ?? ''
      }).filter(Boolean))
      updateConnectionCount()
    }),
    onSnapshot(collection(db, 'users', userId, 'followers'), (snap) => {
      counts.followers = snap.size
      emit()
    }),
    onSnapshot(collection(db, 'users', userId, 'following'), (snap) => {
      counts.following = snap.size
      emit()
    }),
  ]

  return () => unsubs.forEach((unsub) => unsub())
}

export function subscribeNetworkList(
  userId: string,
  tab: NetworkTab,
  onUpdate: (users: NetworkUserSnapshot[]) => void
): Unsubscribe {
  if (tab !== 'connections') {
    return onSnapshot(collection(db, 'users', userId, tab), (snap) => {
      onUpdate(snap.docs.map((item) => toNetworkUser(item.id, item.data() as Record<string, unknown>)))
    })
  }

  let mirroredUsers: NetworkUserSnapshot[] = []
  let legacyUsers: NetworkUserSnapshot[] = []
  const emit = () => {
    onUpdate(mergeNetworkUsers(legacyUsers, mirroredUsers))
  }

  const unsubMirrored = onSnapshot(collection(db, 'users', userId, 'connections'), (snap) => {
    mirroredUsers = snap.docs.map((item) => toNetworkUser(item.id, item.data() as Record<string, unknown>))
    emit()
  })

  const unsubLegacy = onSnapshot(query(collection(db, COLLECTIONS.FRIENDS), where('userIds', 'array-contains', userId)), (snap) => {
    legacyUsers = snap.docs.map((friendshipDoc) => {
      const friendship = docToLegacyFriendship(friendshipDoc.id, friendshipDoc.data() as Record<string, unknown>)
      return legacyFriendshipToNetworkUser(friendship, userId)
    })
    emit()
  })

  return () => {
    unsubMirrored()
    unsubLegacy()
  }
}

export async function getNetworkList(userId: string, tab: NetworkTab): Promise<NetworkUserSnapshot[]> {
  const snap = await getDocs(collection(db, 'users', userId, tab))
  const users = snap.docs.map((item) => toNetworkUser(item.id, item.data() as Record<string, unknown>))

  if (tab !== 'connections') return users

  const friendships = await getFriends(userId).catch(() => [] as Friendship[])
  return mergeNetworkUsers(
    friendships.map((friendship) => legacyFriendshipToNetworkUser(friendship, userId)),
    users
  )
}

export async function mirrorConnection(
  userA: NetworkActor,
  userB: NetworkActor
): Promise<void> {
  const now = serverTimestamp()
  await Promise.all([
    setDoc(doc(db, 'users', userA.uid, 'connections', userB.uid), {
      ...fromActor(userB),
      connectedAt: now,
    }),
    setDoc(doc(db, 'users', userB.uid, 'connections', userA.uid), {
      ...fromActor(userA),
      connectedAt: now,
    }),
  ])
}

export async function removeConnectionMirror(uid1: string, uid2: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'users', uid1, 'connections', uid2)),
    deleteDoc(doc(db, 'users', uid2, 'connections', uid1)),
  ])
}

export async function followUser(currentUser: NetworkActor, targetUser: NetworkActor): Promise<void> {
  if (currentUser.uid === targetUser.uid) throw new Error('You cannot follow yourself')

  const now = serverTimestamp()
  await Promise.all([
    setDoc(doc(db, 'users', currentUser.uid, 'following', targetUser.uid), {
      ...fromActor(targetUser),
      followedAt: now,
    }),
    setDoc(doc(db, 'users', targetUser.uid, 'followers', currentUser.uid), {
      ...fromActor(currentUser),
      followedAt: now,
    }),
  ])

  await createNotification({
    userId: targetUser.uid,
    type: 'new_follower',
    title: `${currentUser.name} followed you`,
    message: `${currentUser.name} is now following your KHOJ profile.`,
    actionUrl: `/profile/${currentUser.uid}`,
    metadata: { followerId: currentUser.uid },
  }).catch(() => undefined)
}

export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId)),
    deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId)),
  ])
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', currentUserId, 'following', targetUserId))
  return snap.exists()
}

export function subscribeFollowStatus(
  currentUserId: string,
  targetUserId: string,
  onUpdate: (following: boolean) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'users', currentUserId, 'following', targetUserId), (snap) => {
    onUpdate(snap.exists())
  })
}

export async function getConnectionStatus(
  currentUserId: string,
  targetUserId: string
): Promise<'none' | 'pending_sent' | 'pending_received' | 'connected'> {
  if (await areFriends(currentUserId, targetUserId)) return 'connected'

  const sent = await getDocs(query(
    collection(db, COLLECTIONS.FRIEND_REQUESTS),
    where('fromUserId', '==', currentUserId),
    where('toUserId', '==', targetUserId),
    where('status', '==', 'pending'),
    limit(1)
  ))
  if (!sent.empty) return 'pending_sent'

  const received = await getDocs(query(
    collection(db, COLLECTIONS.FRIEND_REQUESTS),
    where('fromUserId', '==', targetUserId),
    where('toUserId', '==', currentUserId),
    where('status', '==', 'pending'),
    limit(1)
  ))
  if (!received.empty) return 'pending_received'

  return 'none'
}
