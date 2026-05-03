// app/streams/[streamId]/page.tsx
// Individual live stream room page.
// - Host: video controls, End Stream, Join Request panel, manage guests
// - Viewer: watch, Request to Join, see their request status
// - Guest: in-stream video tile, Leave button
// - All: live chat

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { LivePlayer } from '@/components/streams/LivePlayer'
import { LiveChat } from '@/components/streams/LiveChat'
import { JoinRequestPanel } from '@/components/streams/JoinRequestPanel'
import { GuestLayout } from '@/components/streams/GuestLayout'
import { KeyFeaturesPanel } from '@/components/streams/KeyFeaturesPanel'
import { StreamCard } from '@/components/streams/StreamCard'
import {
  subscribeStream,
  endStream,
  incrementViewerCount,
  decrementViewerCount,
  sendJoinRequest,
  subscribeMyJoinRequest,
  subscribeParticipants,
  ensureHostParticipant,
  leaveAsGuest,
  removeGuest,
  toggleLike,
  subscribeUserLike,
  toggleFollow,
  subscribeFollowing,
  subscribeLiveStreams,
} from '@/services/streamService'
import { Stream, JoinRequest, StreamParticipant } from '@/lib/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StreamRoomPage() {
  const params = useParams()
  const streamId = params?.streamId as string
  const router = useRouter()
  const { firebaseUser, khojUser, loading } = useAuth()

  const [stream, setStream] = useState<Stream | null>(null)
  const [streamLoading, setStreamLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  // Viewer count tracking — ref avoids a re-render on first increment
  const viewerTracked = useRef(false)

  // Join request state (viewer perspective)
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null)
  const [requesting, setRequesting] = useState(false)

  // Participants (host + guests in split-screen)
  const [participants, setParticipants] = useState<StreamParticipant[]>([])

  // Track previous request status to fire toasts on transitions only
  const prevRequestStatus = useRef<string | null>(null)

  // Like state
  const [liked, setLiked] = useState(false)
  const [likePending, setLikePending] = useState(false)

  // Follow states for all visible participants (host + guests)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followPending, setFollowPending] = useState<Set<string>>(new Set())

  // Browse other live streams for the footer section
  const [browseStreams, setBrowseStreams] = useState<Stream[]>([])

  // Auth guard
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/auth/login')
    }
  }, [loading, firebaseUser, router])

  // Subscribe to stream doc
  useEffect(() => {
    if (!streamId) return
    const unsub = subscribeStream(streamId, (s) => {
      setStream(s)
      setStreamLoading(false)
    })
    return () => unsub()
  }, [streamId])

  const stageParticipants = participants.filter(
    (p) => p.role === 'host' || p.role === 'guest'
  )

  const isHost = !!firebaseUser && stream?.hostId === firebaseUser.uid
  const isGuest = stageParticipants.some(
    (p) => p.userId === firebaseUser?.uid && p.role === 'guest'
  )

  // Ensure host is listed in participants sub-collection
  useEffect(() => {
    if (!stream || !firebaseUser || !isHost || stream.status !== 'live') return
    ensureHostParticipant(streamId, {
      userId: firebaseUser.uid,
      userName: khojUser?.name ?? firebaseUser.displayName ?? 'Host',
      userPhoto: khojUser?.avatarUrl ?? firebaseUser.photoURL ?? '',
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.status, isHost])

  // Subscribe to participants
  useEffect(() => {
    if (!streamId) return
    const unsub = subscribeParticipants(streamId, setParticipants)
    return () => unsub()
  }, [streamId])

  // Subscribe to viewer's own join request
  useEffect(() => {
    if (!streamId || !firebaseUser || isHost) return
    const unsub = subscribeMyJoinRequest(streamId, firebaseUser.uid, (req) => {
      setMyRequest(req)
      const newStatus = req?.status ?? null
      if (newStatus !== prevRequestStatus.current) {
        if (newStatus === 'accepted') {
          toast.success('Host accepted your request! You are now a guest.')
        } else if (newStatus === 'declined' && prevRequestStatus.current === 'accepted') {
          toast.error('You have been removed from the stream.')
        } else if (newStatus === 'declined' && prevRequestStatus.current === 'pending') {
          toast.error('Host declined your request.')
        }
        prevRequestStatus.current = newStatus
      }
    })
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, firebaseUser?.uid, isHost])

  // Viewer count — non-host, non-guest viewers only
  useEffect(() => {
    if (!stream || stream.status !== 'live' || isHost || isGuest || viewerTracked.current || !firebaseUser) return
    incrementViewerCount(streamId).catch(() => {})
    viewerTracked.current = true
    return () => {
      decrementViewerCount(streamId).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.status, isHost, isGuest, firebaseUser])

  // Subscribe to current user's like state for this stream
  useEffect(() => {
    if (!streamId || !firebaseUser) return
    const unsub = subscribeUserLike(streamId, firebaseUser.uid, setLiked)
    return () => unsub()
  }, [streamId, firebaseUser?.uid])

  // Subscribe to follow states for all visible participants
  // Re-runs whenever the set of participant IDs changes
  useEffect(() => {
    if (!firebaseUser || stageParticipants.length === 0) return
    const ids = stageParticipants
      .filter((p) => p.userId !== firebaseUser.uid)
      .map((p) => p.userId)
    if (ids.length === 0) return
    const unsubscribers: (() => void)[] = []
    for (const targetId of ids) {
      const unsub = subscribeFollowing(firebaseUser.uid, targetId, (following) => {
        setFollowingIds((prev) => {
          const next = new Set(prev)
          if (following) next.add(targetId)
          else next.delete(targetId)
          return next
        })
      })
      unsubscribers.push(unsub)
    }
    return () => unsubscribers.forEach((fn) => fn())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageParticipants.map((p) => p.userId).join(','), firebaseUser?.uid])

  // Subscribe to other live streams for the browse section
  useEffect(() => {
    const unsub = subscribeLiveStreams((streams) => {
      setBrowseStreams(streams.filter((s) => s.id !== streamId).slice(0, 4))
    })
    return () => unsub()
  }, [streamId])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleEndStream = useCallback(async () => {
    if (!stream || ending) return
    const confirmed = window.confirm('End this stream? This cannot be undone.')
    if (!confirmed) return
    setEnding(true)
    try {
      await endStream(streamId)
      toast.success('Stream ended')
      router.push('/streams')
    } catch {
      toast.error('Failed to end stream. Please try again.')
      setEnding(false)
    }
  }, [stream, ending, streamId, router])

  const handleRequestJoin = useCallback(async () => {
    if (!firebaseUser || requesting) return
    setRequesting(true)
    try {
      await sendJoinRequest(streamId, {
        userId: firebaseUser.uid,
        userName: khojUser?.name ?? firebaseUser.displayName ?? 'Viewer',
        userPhoto: khojUser?.avatarUrl ?? firebaseUser.photoURL ?? '',
      })
      toast.success('Request sent to host!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send request'
      toast.error(msg)
    } finally {
      setRequesting(false)
    }
  }, [firebaseUser, requesting, streamId, khojUser])

  const handleLeave = useCallback(async () => {
    if (!firebaseUser) return
    try {
      await leaveAsGuest(streamId, firebaseUser.uid)
      toast.success('You left the live.')
    } catch {
      toast.error('Failed to leave. Try again.')
    }
  }, [firebaseUser, streamId])

  const handleRemoveGuest = useCallback(async (guestId: string) => {
    try {
      await removeGuest(streamId, guestId)
      const p = participants.find((x) => x.userId === guestId)
      toast.success(`Removed ${p?.userName ?? 'guest'} from stream`)
    } catch {
      toast.error('Failed to remove guest.')
    }
  }, [streamId, participants])

  const handleLike = useCallback(async () => {
    if (!firebaseUser) { toast.error('Please login to like.'); return }
    if (likePending) return
    setLikePending(true)
    try {
      await toggleLike(streamId, firebaseUser.uid)
    } catch (error) {
      console.error('LIKE ERROR:', error)
      toast.error('Failed to like stream.')
    } finally {
      setLikePending(false)
    }
  }, [firebaseUser, streamId, likePending])

  const handleFollow = useCallback(async (
    targetUserId: string,
    targetUserName: string,
    targetUserPhoto: string,
  ) => {
    if (!firebaseUser) { toast.error('Please login to follow.'); return }
    if (followPending.has(targetUserId)) return
    setFollowPending((prev) => { const n = new Set(prev); n.add(targetUserId); return n })
    try {
      const nowFollowing = await toggleFollow({
        currentUserId: firebaseUser.uid,
        currentUserName: khojUser?.name ?? firebaseUser.displayName ?? 'User',
        currentUserPhoto: khojUser?.avatarUrl ?? firebaseUser.photoURL ?? '',
        targetUserId,
        targetUserName,
        targetUserPhoto,
      })
      toast.success(nowFollowing ? `Following ${targetUserName}` : `Unfollowed ${targetUserName}`)
    } catch (error) {
      console.error('FOLLOW ERROR:', error)
      toast.error('Failed to update follow.')
    } finally {
      setFollowPending((prev) => { const n = new Set(prev); n.delete(targetUserId); return n })
    }
  }, [firebaseUser, khojUser, followPending])

  const handleShare = useCallback(async () => {
    if (!stream) return
    const url = window.location.href
    const title = stream.title
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: `Watch ${title} live on KHOJ`, url })
        toast.success('Stream link shared')
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Stream link copied')
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('SHARE ERROR:', error)
        try {
          await navigator.clipboard.writeText(url)
          toast.success('Stream link copied')
        } catch {
          toast.error('Failed to share stream.')
        }
      }
    }
  }, [stream])

  // ── Loading / not found / ended states ───────────────────────────────────────

  if (loading || streamLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (!stream) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <p className="text-white font-bold text-lg">Stream not found</p>
          <p className="text-zinc-400 text-sm">This stream may have been removed.</p>
          <Link href="/streams">
            <button className="text-sm text-[#ff5a00] border border-[#ff5a00]/40 px-4 py-2 rounded-xl hover:bg-[#ff5a00]/10 transition-colors">
              ← Back to Streams
            </button>
          </Link>
        </div>
      </AppShell>
    )
  }

  if (stream.status === 'ended') {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-2xl opacity-40">◈</span>
          </div>
          <p className="text-white font-bold text-lg">Stream has ended</p>
          <p className="text-zinc-400 text-sm">
            <span className="font-semibold text-white">{stream.hostName}</span> has ended this stream.
          </p>
          <Link href="/streams">
            <button className="text-sm bg-[#ff5a00] text-white px-4 py-2 rounded-xl hover:bg-orange-500 transition-colors font-bold">
              ← Back to Streams
            </button>
          </Link>
        </div>
      </AppShell>
    )
  }

  // ── Derived state ─────────────────────────────────────────────────────────────
  const myRequestStatus = myRequest?.status ?? null
  const liveParticipantIds = Array.from(
    new Set([
      ...stageParticipants.map((p) => p.userId),
      ...(firebaseUser && (isHost || isGuest) ? [firebaseUser.uid] : []),
    ])
  )
  const canRequestJoin =
    !isHost &&
    !isGuest &&
    myRequestStatus !== 'pending' &&
    myRequestStatus !== 'accepted' &&
    stream.status === 'live'
  const guestCount = stageParticipants.filter((p) => p.role === 'guest').length

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AppShell fullWidth>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Stream Header Bar ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-4 px-5 h-14 bg-[#0d0e14] border-b border-zinc-800">
          {/* LIVE badge + title + viewer count */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            <h1 className="text-white font-bold text-sm truncate">{stream.title}</h1>
            <div className="flex items-center gap-1 text-zinc-500 text-xs flex-shrink-0">
              <span>◉</span>
              <span>{stream.viewerCount} watching</span>
            </div>
          </div>

          {/* Host controls */}
          {isHost && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Stream Settings
              </button>
              <button
                onClick={handleEndStream}
                disabled={ending}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {ending ? (
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-sm bg-white inline-block" />
                )}
                {ending ? 'Ending…' : 'End Stream'}
              </button>
            </div>
          )}
        </div>

        {/* ── Body: 3-column grid ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-[1fr_320px_280px]">

          {/* ── Column 1: Main video + info (scrollable) ──────────────────── */}
          <div className="flex flex-col overflow-y-auto gap-4 p-4 border-r border-zinc-800">

            {/* Player error */}
            {playerError && (
              <div className="flex-shrink-0 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                ⚠ {playerError}
              </div>
            )}

            {/* Video stage — the primary LiveKit video area */}
            {firebaseUser && (
              <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-black" style={{ minHeight: 520 }}>
                <LivePlayer
                  key={`player-${streamId}`}
                  streamId={streamId}
                  userId={firebaseUser.uid}
                  userName={khojUser?.name ?? firebaseUser.displayName ?? 'Viewer'}
                  role={isHost ? 'host' : isGuest ? 'guest' : 'viewer'}
                  allowedParticipantIds={liveParticipantIds}
                  onError={setPlayerError}
                />
              </div>
            )}

            {/* Participant thumbnail strip */}
            {stageParticipants.length > 0 && (
              <GuestLayout
                participants={stageParticipants}
                currentUserId={firebaseUser?.uid ?? ''}
                hostId={stream.hostId}
                onRemoveGuest={isHost ? handleRemoveGuest : undefined}
                onFollow={firebaseUser ? handleFollow : undefined}
                followingIds={followingIds}
              />
            )}

            {/* Viewer / guest join-request bar */}
            {!isHost && firebaseUser && (
              <ViewerJoinBar
                myRequestStatus={myRequestStatus}
                canRequest={canRequestJoin}
                requesting={requesting}
                isGuest={isGuest}
                onRequest={handleRequestJoin}
                onLeave={handleLeave}
              />
            )}

            {/* Stream info card */}
            <div className="bg-[#101218] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-lg truncate">{stream.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-zinc-400 text-xs">
                      By <span className="text-white font-semibold">{stream.hostName}</span>
                    </span>
                    <span className="text-zinc-700 text-xs">·</span>
                    <span className="text-zinc-500 text-xs">{stream.category}</span>
                    {guestCount > 0 && (
                      <>
                        <span className="text-zinc-700 text-xs">·</span>
                        <span className="text-[#ff5a00] text-xs font-semibold">
                          {guestCount} guest{guestCount !== 1 ? 's' : ''} live
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-zinc-500 text-xs flex items-center gap-1 flex-shrink-0">
                  <span>◉</span> {stream.viewerCount}
                </span>
              </div>

              {stream.description && (
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">{stream.description}</p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleLike}
                  disabled={likePending}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-60',
                    liked
                      ? 'text-red-400 border-red-400/40 bg-red-400/10'
                      : 'text-zinc-400 border-zinc-700 hover:text-red-400 hover:border-red-400/40'
                  )}
                >
                  {liked ? '♥' : '♡'}{stream.likeCount > 0 ? ` ${stream.likeCount}` : ''} {stream.likeCount === 1 ? 'Like' : 'Likes'}
                </button>

                {!isHost && (
                  <button
                    onClick={() => handleFollow(stream.hostId, stream.hostName, stream.hostPhoto)}
                    disabled={followPending.has(stream.hostId)}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-60',
                      followingIds.has(stream.hostId)
                        ? 'text-[#ff5a00] border-[#ff5a00]/40 bg-[#ff5a00]/10'
                        : 'text-zinc-400 border-zinc-700 hover:text-[#ff5a00] hover:border-[#ff5a00]/40'
                    )}
                  >
                    {followingIds.has(stream.hostId) ? '✓ Following' : '+ Follow'}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-all"
                >
                  ↗ Share
                </button>
              </div>
            </div>

            {/* Browse other live streams */}
            {browseStreams.length > 0 && (
              <div className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">Live Streams</h3>
                  <Link href="/streams" className="text-[#ff5a00] text-xs hover:text-orange-400 transition-colors">
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {browseStreams.map((s) => (
                    <StreamCard key={s.id} stream={s} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Column 2: Live Chat + Join Requests (fixed height) ─────────── */}
          <div className="flex flex-col h-full overflow-hidden bg-[#0d0e14]">
            {/* Chat fills available space */}
            <div className="flex-1 overflow-hidden">
              {stream.chatEnabled && firebaseUser ? (
                <LiveChat
                  streamId={streamId}
                  currentUserId={firebaseUser.uid}
                  currentUserName={khojUser?.name ?? firebaseUser.displayName ?? 'User'}
                  currentUserPhoto={khojUser?.avatarUrl ?? firebaseUser.photoURL ?? ''}
                />
              ) : (
                <div className="h-full flex items-center justify-center px-4">
                  <p className="text-zinc-600 text-sm text-center">
                    {!stream.chatEnabled ? 'Chat is disabled for this stream' : 'Login to chat'}
                  </p>
                </div>
              )}
            </div>

            {/* Join request panel — host only, pinned at bottom */}
            {isHost && (
              <div className="flex-shrink-0 border-t border-zinc-800">
                <JoinRequestPanel streamId={streamId} />
              </div>
            )}
          </div>

          {/* ── Column 3: Key Features (scrollable) ───────────────────────── */}
          <div className="overflow-y-auto border-l border-zinc-800 bg-[#0d0e14]">
            <KeyFeaturesPanel />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── ViewerJoinBar ─────────────────────────────────────────────────────────────
// Inline component — shows viewer's join-request state and action button.

function ViewerJoinBar({
  myRequestStatus,
  canRequest,
  requesting,
  isGuest,
  onRequest,
  onLeave,
}: {
  myRequestStatus: string | null
  canRequest: boolean
  requesting: boolean
  isGuest: boolean
  onRequest: () => void
  onLeave: () => void
}) {
  if (isGuest) {
    return (
      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="text-green-400 text-sm font-semibold flex-1">You are live as a guest</span>
        <button
          onClick={onLeave}
          className="text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
        >
          Leave Live
        </button>
      </div>
    )
  }

  if (myRequestStatus === 'pending') {
    return (
      <div className="flex items-center gap-3 bg-[#101218] border border-zinc-800 rounded-xl px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
        <span className="text-zinc-400 text-sm flex-1">Request pending — waiting for host to accept</span>
        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-md">
          PENDING
        </span>
      </div>
    )
  }

  if (myRequestStatus === 'declined') {
    return (
      <div className="flex items-center gap-3 bg-[#101218] border border-red-500/20 rounded-xl px-4 py-3">
        <span className="text-zinc-400 text-sm flex-1">Host declined your request.</span>
        <button
          onClick={onRequest}
          disabled={requesting}
          className="text-xs font-bold text-[#ff5a00] border border-[#ff5a00]/40 hover:bg-[#ff5a00]/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
        >
          Request Again
        </button>
      </div>
    )
  }

  if (!canRequest) return null

  return (
    <div className="bg-[#101218] border border-zinc-800 rounded-xl px-5 py-6 text-center">
      {/* Lock icon */}
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <p className="text-white font-bold text-base mb-1">This is a live stream</p>
      <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
        Join to participate in the conversation with the host and others.
      </p>
      <button
        onClick={onRequest}
        disabled={requesting}
        className="inline-flex items-center gap-2 bg-[#ff5a00] hover:bg-orange-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all disabled:opacity-40"
      >
        {requesting ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          '▶ Request to Join'
        )}
      </button>
    </div>
  )
}
