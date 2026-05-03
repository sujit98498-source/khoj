// app/profile/[id]/page.tsx
// Public portfolio page — accessible without authentication.
// Linked from community post author avatars, story cards, leaderboard rows, etc.
//
// Data flow:
//   1. getFullPortfolioData(uid) → tries mock/DB first, falls back to KhojUser
//   2. All sections receive typed props and handle their own empty states
//   3. To connect a real database: update services/portfolioService.ts only

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ProfileHeader } from '@/components/portfolio/ProfileHeader'
import { StatsCards } from '@/components/portfolio/StatsCards'
import { SkillsSection } from '@/components/portfolio/SkillsSection'
import { AchievementsSection } from '@/components/portfolio/AchievementsSection'
import { ProjectsSection } from '@/components/portfolio/ProjectsSection'
import { CompetitionsSection } from '@/components/portfolio/CompetitionsSection'
import { UserPostsSection } from '@/components/portfolio/UserPostsSection'
import { MatchHistorySection } from '@/components/portfolio/MatchHistorySection'
import { getFullPortfolioData, FullPortfolioData } from '@/services/portfolioService'
import { ProfileScoreBadge } from '@/components/portfolio/ProfileScoreBadge'
import { buildConversationId, getOrCreateConversation } from '@/services/messageService'
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '@/services/friendRequestService'
import { useFriendStatus } from '@/hooks/useFriendRequests'
import { useFollowStatus, useNetworkCounts } from '@/hooks/useNetwork'
import { actorFromKhojUser, actorFromPortfolioUser, followUser, unfollowUser } from '@/services/networkService'
import { NetworkStatsRow } from '@/components/profile/NetworkStatsRow'
import { InviteModal } from '@/components/jobs/InviteModal'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { MediaDoc, formatDuration, formatViews, timeAgo } from '@/services/mediaService'
import toast from 'react-hot-toast'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { khojUser } = useAuth()

  const uid =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : ''

  const [data, setData] = useState<FullPortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [connectBusy, setConnectBusy] = useState(false)
  const [messageBusy, setMessageBusy] = useState(false)

  const isOwner = khojUser?.uid === uid

  // Follow state
  const [followBusy, setFollowBusy] = useState(false)
  const { following } = useFollowStatus(khojUser?.uid ?? null, uid || null)
  const { counts: networkCounts, loading: networkCountsLoading } = useNetworkCounts(uid || null)

  async function handleFollow() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (!data) return
    if (followBusy) return
    setFollowBusy(true)
    try {
      if (following) {
        await unfollowUser(khojUser.uid, uid)
        toast('Unfollowed')
      } else {
        await followUser(actorFromKhojUser(khojUser), actorFromPortfolioUser(data.user))
        toast.success('Following')
      }
    } catch (err) {
      console.error('[KHOJ] Follow action failed:', err)
      toast.error('Could not update follow')
    } finally {
      setFollowBusy(false)
    }
  }

  // Real-time friend status between current viewer and this profile
  const {
    status: friendStatus,
    requestId,
    loading: statusLoading,
    setStatus: setFriendStatus,
    setRequestId: setFriendRequestId,
  } = useFriendStatus(khojUser?.uid ?? null, uid || null)

  async function handleMessage() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (messageBusy) return
    setMessageBusy(true)
    try {
      // Pre-create conversation with full PortfolioUser display info
      await getOrCreateConversation(
        {
          uid: khojUser.uid,
          name: khojUser.name,
          avatarUrl: khojUser.avatarUrl,
          username: khojUser.username,
        },
        {
          uid,
          name: data?.user.name ?? 'User',
          avatarUrl: data?.user.avatarUrl,
          username: data?.user.username,
        }
      )
    } catch {
      // Proceed anyway — conversation page will handle creation
    } finally {
      setMessageBusy(false)
    }
    const convoId = buildConversationId(khojUser.uid, uid)
    router.push(`/messages/${convoId}`)
  }

  async function handleConnect() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (!data) return
    setConnectBusy(true)
    try {
      if (friendStatus === 'none') {
        const newId = await sendFriendRequest(
          { uid: khojUser.uid, name: khojUser.name },
          { uid: data.user.uid, name: data.user.name, avatar: data.user.avatarUrl, username: data.user.username }
        )
        setFriendStatus('pending_sent')
        setFriendRequestId(newId)
        toast.success('Connection request sent!')
      } else if (friendStatus === 'pending_sent' && requestId) {
        await cancelFriendRequest(requestId)
        setFriendStatus('none')
        setFriendRequestId(null)
        toast('Request cancelled')
      } else if (friendStatus === 'pending_received' && requestId) {
        await acceptFriendRequest(requestId, khojUser.uid)
        setFriendStatus('friends')
        setFriendRequestId(null)
        toast.success('Connected!')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        console.error('[KHOJ] Connect action permission error:', e)
        toast.error('Could not send request right now. Please try again.')
      } else if (msg) {
        toast.error(msg)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setConnectBusy(false)
    }
  }

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    setNotFound(false)

    getFullPortfolioData(uid)
      .then((result) => {
        if (!result) setNotFound(true)
        else setData(result)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) return <PageLoader />

  if (notFound || !data) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <span className="text-5xl">◈</span>
          <p className="text-khoj-subtle font-body text-sm text-center max-w-xs">
            This profile does not exist or has been removed.
          </p>
          <Link
            href="/community"
            className="text-xs text-khoj-accent hover:underline font-body uppercase tracking-wider"
          >
            ← Back to Community
          </Link>
        </div>
      </AppShell>
    )
  }

  const { user, posts, matchHistory } = data

  return (
    <AppShell>
      {/* Back navigation */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs text-khoj-subtle hover:text-khoj-text font-body uppercase tracking-wider transition-colors duration-150"
        >
          ← Back
        </button>
      </div>

      <div className="space-y-6">
        {/* ── Hero: avatar, name, bio, social links ── */}
        <ProfileHeader user={user} isOwner={isOwner} />

        <NetworkStatsRow
          userId={uid}
          counts={networkCounts}
          loading={networkCountsLoading}
        />

        {/* ── Message + Connect + Follow buttons (non-owner) ── */}
        {!isOwner && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleMessage}
              disabled={messageBusy}
              className="flex items-center gap-2 text-sm font-body font-semibold bg-khoj-accent text-white px-4 py-2.5 rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              <span>✉</span> {messageBusy ? 'Opening…' : 'Message'}
            </button>

            {/* Follow / Unfollow */}
            {khojUser && (
              <button
                type="button"
                onClick={handleFollow}
                disabled={followBusy}
                className={`flex items-center gap-2 text-sm font-body font-semibold px-4 py-2.5 rounded-sm transition-colors disabled:opacity-50 ${
                  following
                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-red-400/40 hover:text-red-400'
                    : 'border border-[#ff5a00]/50 text-[#ff5a00] hover:bg-[#ff5a00]/10'
                }`}
              >
                {followBusy ? '…' : following ? '✓ Following' : '+ Follow'}
              </button>
            )}

            {/* Connect button — renders based on friendship status */}
            {!statusLoading && (
              <>
                {friendStatus === 'none' && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectBusy}
                    className="flex items-center gap-2 text-sm font-body font-semibold border border-khoj-accent/50 text-khoj-accent px-4 py-2.5 rounded-sm hover:bg-khoj-accent/10 transition-colors disabled:opacity-50"
                  >
                    + Connect
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectBusy}
                    className="flex items-center gap-2 text-sm font-body font-semibold border border-khoj-border text-khoj-muted px-4 py-2.5 rounded-sm hover:border-red-400/40 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Click to cancel request"
                  >
                    ◷ Pending
                  </button>
                )}
                {friendStatus === 'pending_received' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connectBusy}
                      className="flex items-center gap-2 text-sm font-body font-semibold bg-khoj-accent text-white px-4 py-2.5 rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-50"
                    >
                      ✓ Accept
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!requestId) return
                        setConnectBusy(true)
                        try {
                          await declineFriendRequest(requestId)
                          setFriendStatus('none')
                          setFriendRequestId(null)
                          toast('Request declined')
                        } finally {
                          setConnectBusy(false)
                        }
                      }}
                      disabled={connectBusy}
                      className="flex items-center gap-2 text-sm font-body font-semibold border border-khoj-border text-khoj-subtle px-4 py-2.5 rounded-sm hover:border-red-400/40 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
                {friendStatus === 'friends' && (
                  <span className="flex items-center gap-2 text-sm font-body font-semibold border border-khoj-accent/30 text-khoj-accent px-4 py-2.5 rounded-sm">
                    ✓ Connected
                  </span>
                )}
              </>
            )}

            {khojUser && khojUser.uid !== uid && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 text-sm font-body font-semibold border border-khoj-border text-khoj-subtle px-4 py-2.5 rounded-sm hover:border-khoj-accent/40 hover:text-khoj-accent transition-colors"
              >
                <span>◈</span> Invite to Apply
              </button>
            )}
          </div>
        )}

        {/* Invite modal */}
        {showInvite && data && (
          <InviteModal
            recipient={{ uid: user.uid, name: user.name, username: user.username, avatarUrl: user.avatarUrl }}
            onClose={() => setShowInvite(false)}
          />
        )}

        {/* ── Profile strength badge ── */}
        <ProfileScoreBadge user={user} expanded />

        {/* ── Core stats grid ── */}
        <StatsCards user={user} />

        {/* ── Two-column layout on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            <SkillsSection skills={user.skills} />
            <AchievementsSection achievements={user.achievements} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            <ProjectsSection projects={user.projects} />
            <CompetitionsSection competitions={user.competitions} />
            <UserPostsSection posts={posts} />
            <MatchHistorySection matchHistory={matchHistory} />
          </div>
        </div>

        {/* ── Creator media (videos + clips) ── */}
        <CreatorMediaSection uid={uid} />
      </div>
    </AppShell>
  )
}

// ── Creator media section ─────────────────────────────────────────────────────

function CreatorMediaSection({ uid }: { uid: string }) {
  const [media, setMedia]     = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'all' | 'video' | 'clip'>('all')

  useEffect(() => {
    if (!uid) return
    getDocs(
      query(collection(requireFirestoreDb(), 'media'),
        where('creatorId', '==', uid),
        where('status', '==', 'published'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(18)
      )
    )
      .then((snap) => setMedia(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaDoc))))
      .catch(console.warn)
      .finally(() => setLoading(false))
  }, [uid])

  if (!loading && media.length === 0) return null

  const filtered = media.filter((m) => tab === 'all' || m.type === tab)

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {([['all', 'All'], ['video', 'Videos'], ['clip', 'Clips']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === id ? 'bg-[#ff5a00] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href={`/arena`} className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400 transition-colors">
          Browse Arena →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-600 text-sm py-4">No {tab === 'all' ? 'content' : tab + 's'} yet.</p>
      ) : (
        <div className={`grid gap-3 ${filtered[0]?.type === 'clip' && tab === 'clip' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-3'}`}>
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/arena/media/${item.id}`}
              className={`group relative block bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all`}
            >
              <div className={item.type === 'clip' ? 'aspect-[9/16]' : 'aspect-video'}>
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-zinc-700" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/0 group-hover:bg-white/20 border border-white/0 group-hover:border-white/30 flex items-center justify-center transition-all">
                    <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 ml-0.5 transition-opacity" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                {/* Duration */}
                {item.duration > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] font-mono px-1 py-0.5 rounded">
                    {formatDuration(item.duration)}
                  </span>
                )}
              </div>
              <div className="p-2 space-y-0.5">
                <p className="text-white text-[11px] font-semibold truncate">{item.title}</p>
                <p className="text-zinc-600 text-[10px]">{formatViews(item.views)} views · {timeAgo(item.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
