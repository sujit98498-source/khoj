'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useFriendStatus } from '@/hooks/useFriendRequests'
import { useFollowStatus } from '@/hooks/useNetwork'
import { acceptFriendRequest, cancelFriendRequest, sendFriendRequest } from '@/services/friendRequestService'
import { buildConversationId, getOrCreateConversation } from '@/services/messageService'
import {
  actorFromKhojUser,
  followUser,
  unfollowUser,
  type NetworkActor,
  type NetworkUserSnapshot,
} from '@/services/networkService'

interface NetworkUserCardProps {
  user: NetworkUserSnapshot
  viewerUserId?: string
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'K'
}

function targetActor(user: NetworkUserSnapshot): NetworkActor {
  return {
    uid: user.uid,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    headline: user.headline,
    role: user.role,
    bio: user.bio,
    xp: user.xp,
    rank: user.rank,
  }
}

export function NetworkUserCard({ user }: NetworkUserCardProps) {
  const router = useRouter()
  const { khojUser } = useAuth()
  const currentUserId = khojUser?.uid ?? null
  const isSelf = currentUserId === user.uid
  const [messageBusy, setMessageBusy] = useState(false)
  const [connectBusy, setConnectBusy] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const {
    status: connectionStatus,
    requestId,
    loading: connectionLoading,
    setStatus: setConnectionStatus,
    setRequestId,
  } = useFriendStatus(currentUserId, user.uid)
  const { following } = useFollowStatus(currentUserId, user.uid)

  async function handleMessage() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (messageBusy) return
    setMessageBusy(true)
    try {
      await getOrCreateConversation(
        {
          uid: khojUser.uid,
          name: khojUser.name,
          avatarUrl: khojUser.avatarUrl,
          username: khojUser.username,
        },
        {
          uid: user.uid,
          name: user.name,
          avatarUrl: user.avatarUrl,
          username: user.username,
        }
      )
    } catch {
      // Conversation route can still recover.
    } finally {
      setMessageBusy(false)
    }
    router.push(`/messages/${buildConversationId(khojUser.uid, user.uid)}`)
  }

  async function handleConnect() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (connectBusy || isSelf) return
    setConnectBusy(true)
    try {
      if (connectionStatus === 'none') {
        const id = await sendFriendRequest(
          {
            uid: khojUser.uid,
            name: khojUser.name,
            avatar: khojUser.avatarUrl,
            username: khojUser.username,
          },
          {
            uid: user.uid,
            name: user.name,
            avatar: user.avatarUrl,
            username: user.username,
          }
        )
        setConnectionStatus('pending_sent')
        setRequestId(id)
        toast.success('Connection request sent')
      } else if (connectionStatus === 'pending_sent' && requestId) {
        await cancelFriendRequest(requestId)
        setConnectionStatus('none')
        setRequestId(null)
        toast('Connection request cancelled')
      } else if (connectionStatus === 'pending_received' && requestId) {
        await acceptFriendRequest(requestId, khojUser.uid)
        setConnectionStatus('friends')
        setRequestId(null)
        toast.success('Connected')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update connection')
    } finally {
      setConnectBusy(false)
    }
  }

  async function handleFollow() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (followBusy || isSelf) return
    setFollowBusy(true)
    try {
      if (following) {
        await unfollowUser(khojUser.uid, user.uid)
        toast('Unfollowed')
      } else {
        await followUser(actorFromKhojUser(khojUser), targetActor(user))
        toast.success('Following')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update follow')
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-khoj-border bg-khoj-card p-4 transition-colors hover:border-khoj-accent/30 sm:flex-row sm:items-center">
      <Link href={`/profile/${user.uid}`} className="flex items-center gap-4 min-w-0 flex-1">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 flex-shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm border border-khoj-accent/30 bg-khoj-accent/15 text-lg font-display font-bold text-khoj-accent">
            {initials(user.name)}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-display font-semibold text-khoj-text hover:text-khoj-accent">
              {user.name}
            </p>
            {user.username && (
              <span className="truncate text-xs text-khoj-subtle">@{user.username}</span>
            )}
            {typeof user.xp === 'number' && (
              <span className="rounded-sm border border-khoj-border px-1.5 py-0.5 text-[10px] font-mono text-khoj-subtle">
                {user.xp.toLocaleString()} XP
              </span>
            )}
            {typeof user.rank === 'number' && user.rank > 0 && (
              <span className="rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-khoj-accent">
                Rank #{user.rank}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-khoj-subtle">
            {user.headline || user.role || user.location || 'KHOJ builder'}
          </p>
          {user.bio && <p className="mt-1 line-clamp-1 text-xs text-khoj-muted">{user.bio}</p>}
          {(user.skills?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.skills!.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="rounded-sm border border-khoj-teal/25 bg-khoj-teal/10 px-2 py-0.5 text-[10px] font-semibold text-khoj-teal"
                >
                  {skill}
                </span>
              ))}
              {user.skills!.length > 5 && (
                <span className="px-1 py-0.5 text-[10px] text-khoj-subtle">
                  +{user.skills!.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:justify-end">
        <Link
          href={`/profile/${user.uid}`}
          className="rounded-sm border border-khoj-border px-3 py-2 text-xs font-semibold text-khoj-subtle transition-colors hover:border-khoj-accent/40 hover:text-khoj-accent"
        >
          View Profile
        </Link>

        {!isSelf && (
          <>
            <button
              type="button"
              onClick={handleMessage}
              disabled={messageBusy}
              className="rounded-sm bg-khoj-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-50"
            >
              {messageBusy ? 'Opening...' : 'Message'}
            </button>

            {!connectionLoading && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connectBusy || connectionStatus === 'friends'}
                className={[
                  'rounded-sm border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-80',
                  connectionStatus === 'friends'
                    ? 'border-khoj-accent/30 text-khoj-accent'
                    : connectionStatus === 'pending_sent'
                      ? 'border-khoj-border text-khoj-subtle hover:border-red-400/40 hover:text-red-400'
                      : 'border-khoj-accent/40 text-khoj-accent hover:bg-khoj-accent/10',
                ].join(' ')}
              >
                {connectBusy
                  ? '...'
                  : connectionStatus === 'friends'
                    ? 'Connected'
                    : connectionStatus === 'pending_sent'
                      ? 'Requested'
                      : connectionStatus === 'pending_received'
                        ? 'Accept'
                        : 'Connect'}
              </button>
            )}

            <button
              type="button"
              onClick={handleFollow}
              disabled={followBusy}
              className={[
                'rounded-sm border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                following
                  ? 'border-khoj-border text-khoj-subtle hover:border-red-400/40 hover:text-red-400'
                  : 'border-khoj-border text-khoj-text hover:border-khoj-accent/40 hover:text-khoj-accent',
              ].join(' ')}
            >
              {followBusy ? '...' : following ? 'Following' : 'Follow'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
