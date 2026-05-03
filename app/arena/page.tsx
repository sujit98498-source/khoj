// app/arena/page.tsx
// Arena - KHOJ media hub: Live streams, Videos, Clips, Following.
// Videos and Clips are read from Firestore `media` collection.
// Go Live uses existing LiveKit / CreateStreamModal flow.

'use client'

// Prevent build-time prerendering so Firebase is only initialized in the browser.
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { StreamCard } from '@/components/streams/StreamCard'
import { CreateStreamModal } from '@/components/streams/CreateStreamModal'
import { CreateDropdown } from '@/components/arena/CreateDropdown'
import { UploadMediaModal } from '@/components/arena/UploadMediaModal'
import { VideoMediaCard, ClipMediaCard, VideoCardSkeleton, ClipCardSkeleton } from '@/components/arena/MediaCard'
import { subscribeLiveStreams } from '@/services/streamService'
import { subscribeMediaByType, MediaDoc, MediaType } from '@/services/mediaService'
import { ReportTargetType } from '@/services/reportService'
import { ReportModal } from '@/components/reports/ReportModal'
import { Stream } from '@/lib/types'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import toast from 'react-hot-toast'

interface ReportTarget {
  targetType: ReportTargetType
  targetId: string
  targetTitle?: string
  targetPreview?: string
  targetOwnerId: string
  targetOwnerName: string
}

function matchesQuery(q: string, ...fields: string[]) {
  if (!q) return true
  const lower = q.toLowerCase()
  return fields.some((f) => f.toLowerCase().includes(lower))
}

type Tab = 'live' | 'videos' | 'clips' | 'following'

const TABS: { id: Tab; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'videos', label: 'Videos' },
  { id: 'clips', label: 'Clips' },
  { id: 'following', label: 'Following' },
]

export default function ArenaPage() {
  const router = useRouter()
  const { khojUser, firebaseUser, loading } = useAuth()

  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [liveStreams, setLiveStreams] = useState<Stream[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [showGoLive, setShowGoLive] = useState(false)
  const [uploadType, setUploadType] = useState<MediaType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)

  useEffect(() => {
    if (!loading && !firebaseUser) router.push('/auth/login')
  }, [loading, firebaseUser, router])

  useEffect(() => {
    if (!firebaseUser) return
    const unsub = subscribeLiveStreams((streams) => {
      setLiveStreams(streams)
      setLiveLoading(false)
    })
    return () => unsub()
  }, [firebaseUser])

  function openReport(target: ReportTarget) {
    if (!firebaseUser) { router.push('/auth/login'); return }
    setReportTarget(target)
  }

  function handleCreate(type: 'video' | 'clip' | 'live') {
    if (!firebaseUser) { router.push('/auth/login'); return }
    if (type === 'live') { setShowGoLive(true); return }
    setUploadType(type)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Arena</h1>
            <p className="text-zinc-500 text-sm mt-1">Discover live streams, videos, clips, and creators</p>
          </div>
          <CreateDropdown
            onUploadVideo={() => handleCreate('video')}
            onUploadClip={() => handleCreate('clip')}
            onGoLive={() => handleCreate('live')}
          />
        </div>

        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search streams, videos, creators..."
            className="w-full bg-[#101218] border border-zinc-800 text-white text-sm placeholder-zinc-600 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-[#ff5a00]/50 focus:ring-1 focus:ring-[#ff5a00]/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 border-b border-zinc-800">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'text-[#ff5a00] border-[#ff5a00]' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600'}`}>
              {tab.id === 'live' && liveStreams.length > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {tab.label}
                  <span className="text-[10px] font-bold bg-red-600/80 text-white px-1.5 py-0.5 rounded-md ml-0.5">{liveStreams.length}</span>
                </span>
              ) : tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'live' && <LiveTab streams={liveStreams} loading={liveLoading} searchQuery={searchQuery} onReport={openReport} />}
        {activeTab === 'videos' && <VideosTab searchQuery={searchQuery} reportedBy={firebaseUser?.uid} reporterName={khojUser?.name ?? firebaseUser?.displayName ?? undefined} onUpload={() => handleCreate('video')} />}
        {activeTab === 'clips' && <ClipsTab searchQuery={searchQuery} reportedBy={firebaseUser?.uid} reporterName={khojUser?.name ?? firebaseUser?.displayName ?? undefined} onUpload={() => handleCreate('clip')} />}
        {activeTab === 'following' && <FollowingTab uid={firebaseUser?.uid ?? null} searchQuery={searchQuery} onDiscover={() => router.push('/community')} />}
      </div>

      {showGoLive && firebaseUser && (
        <CreateStreamModal onClose={() => setShowGoLive(false)} hostId={firebaseUser.uid} hostName={khojUser?.name ?? firebaseUser.displayName ?? 'Anonymous'} hostPhoto={khojUser?.avatarUrl ?? firebaseUser.photoURL ?? ''} />
      )}

      {uploadType && firebaseUser && (
        <UploadMediaModal
          type={uploadType}
          creatorId={firebaseUser.uid}
          creatorName={khojUser?.name ?? firebaseUser.displayName ?? 'KHOJ User'}
          creatorPhoto={khojUser?.avatarUrl ?? firebaseUser.photoURL ?? ''}
          onClose={() => setUploadType(null)}
          onSuccess={(mediaId) => {
            const tab = uploadType === 'clip' ? 'clips' : 'videos'
            setUploadType(null)
            setActiveTab(tab)
            router.push(`/arena/media/${mediaId}`)
          }}
        />
      )}

      {reportTarget && firebaseUser && (
        <ReportModal
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          targetTitle={reportTarget.targetTitle ?? reportTarget.targetOwnerName}
          targetPreview={reportTarget.targetPreview}
          targetOwnerId={reportTarget.targetOwnerId}
          targetOwnerName={reportTarget.targetOwnerName}
          reportedBy={firebaseUser.uid}
          reporterName={khojUser?.name ?? firebaseUser.displayName ?? 'Anonymous'}
          onClose={() => setReportTarget(null)}
        />
      )}
    </AppShell>
  )
}

function LiveTab({ streams, loading, searchQuery, onReport }: { streams: Stream[]; loading: boolean; searchQuery: string; onReport: (t: ReportTarget) => void }) {
  const filtered = streams.filter((s) => matchesQuery(searchQuery, s.title, s.hostName, s.category))

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => <LiveCardSkeleton key={i} />)}
    </div>
  )

  if (streams.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <span className="text-2xl opacity-30">&#9654;</span>
      </div>
      <div>
        <p className="text-white font-bold text-base">No live streams right now</p>
        <p className="text-zinc-500 text-sm mt-1">Be the first to go live in the KHOJ community!</p>
      </div>
    </div>
  )

  if (filtered.length === 0) return <SearchEmptyState query={searchQuery} />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {filtered.map((stream) => (
        <div key={stream.id} className="relative group/wrap">
          <StreamCard stream={stream} />
          <div className="absolute top-2 right-2 z-10">
            <LiveCardMenu targetId={stream.id} targetTitle={stream.title} targetOwnerId={stream.hostId} targetOwnerName={stream.hostName} shareUrl={`/streams/${stream.id}`} onReport={onReport} />
          </div>
        </div>
      ))}
    </div>
  )
}

function LiveCardSkeleton() {
  return (
    <div className="bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-zinc-900" />
      <div className="p-3 space-y-2.5">
        <div className="flex gap-2.5"><div className="w-8 h-8 rounded-full bg-zinc-800" /><div className="flex-1 space-y-1.5"><div className="h-3 bg-zinc-800 rounded w-3/4" /><div className="h-2.5 bg-zinc-800 rounded w-1/2" /></div></div>
        <div className="h-2.5 bg-zinc-800 rounded w-1/3" />
      </div>
    </div>
  )
}

function VideosTab({ searchQuery, reportedBy, reporterName, onUpload }: { searchQuery: string; reportedBy?: string; reporterName?: string; onUpload: () => void }) {
  const [videos, setVideos] = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeMediaByType('video', (items) => { setVideos(items); setLoading(false) })
    return () => unsub()
  }, [])

  const filtered = videos.filter((v) => matchesQuery(searchQuery, v.title, v.creatorName, v.category))

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
    </div>
  )

  if (videos.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-[#ff5a00]/5 border border-[#ff5a00]/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-[#ff5a00]/50" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <div className="space-y-2">
        <p className="text-white font-bold text-base">No videos yet</p>
        <p className="text-zinc-500 text-sm max-w-xs">Be the first to share your journey, skills, or tutorials with the KHOJ community.</p>
      </div>
      <button onClick={onUpload} className="flex items-center gap-2 bg-[#ff5a00] hover:bg-orange-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/15">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Upload Video
      </button>
    </div>
  )

  if (filtered.length === 0) return <SearchEmptyState query={searchQuery} />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {filtered.map((v) => <VideoMediaCard key={v.id} media={v} reportedBy={reportedBy} reporterName={reporterName} />)}
    </div>
  )
}

function ClipsTab({ searchQuery, reportedBy, reporterName, onUpload }: { searchQuery: string; reportedBy?: string; reporterName?: string; onUpload: () => void }) {
  const [clips, setClips] = useState<MediaDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeMediaByType('clip', (items) => { setClips(items); setLoading(false) })
    return () => unsub()
  }, [])

  const filtered = clips.filter((c) => matchesQuery(searchQuery, c.title, c.creatorName, c.category))

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => <ClipCardSkeleton key={i} />)}
    </div>
  )

  if (clips.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-purple-500/50" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <div className="space-y-2">
        <p className="text-white font-bold text-base">No clips yet</p>
        <p className="text-zinc-500 text-sm max-w-xs">Share quick moments - product demos, gaming highlights, skill tips.</p>
      </div>
      <button onClick={onUpload} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/15">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Upload Clip
      </button>
    </div>
  )

  if (filtered.length === 0) return <SearchEmptyState query={searchQuery} />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {filtered.map((clip) => <ClipMediaCard key={clip.id} media={clip} reportedBy={reportedBy} reporterName={reporterName} />)}
    </div>
  )
}

function FollowingTab({ uid, searchQuery, onDiscover }: { uid: string | null; searchQuery: string; onDiscover: () => void }) {
  const [items, setItems]       = useState<MediaDoc[]>([])
  const [loading, setLoading]   = useState(true)
  const [recommended, setRecommended] = useState<MediaDoc[]>([])

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    async function loadFollowingFeed() {
      setLoading(true)
      try {
        // 1. Get the list of followed user IDs
        const followingSnap = await getDocs(collection(requireFirestoreDb(), 'users', uid!, 'following'))
        const followedIds = followingSnap.docs.map((d) => d.data().userId as string)

        if (followedIds.length === 0) {
          setItems([])
          // Load recommendations (top recent public media)
          const recSnap = await getDocs(
            query(collection(requireFirestoreDb(), 'media'),
              where('status', '==', 'published'),
              where('visibility', '==', 'public'),
              orderBy('createdAt', 'desc'),
              limit(12)
            )
          )
          setRecommended(recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MediaDoc)))
          return
        }

        // 2. Query media for followed users (batch by 30)
        const chunks: string[][] = []
        for (let i = 0; i < followedIds.length; i += 30) chunks.push(followedIds.slice(i, i + 30))
        const results: MediaDoc[] = []
        for (const chunk of chunks) {
          const snap = await getDocs(
            query(collection(requireFirestoreDb(), 'media'),
              where('creatorId', 'in', chunk),
              where('status', '==', 'published'),
              where('visibility', '==', 'public'),
              orderBy('createdAt', 'desc'),
              limit(24)
            )
          )
          snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as MediaDoc))
        }

        // 3. Sort merged results by createdAt desc
        results.sort((a, b) => {
          const ta = (a.createdAt as { seconds: number })?.seconds ?? 0
          const tb = (b.createdAt as { seconds: number })?.seconds ?? 0
          return tb - ta
        })
        setItems(results)
        setRecommended([])
      } catch (err) {
        console.warn('[KHOJ] Following feed error:', err)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadFollowingFeed()
  }, [uid])

  if (!uid) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <p className="text-white font-bold text-base">Sign in to see your following feed</p>
        <a href="/auth/login" className="text-[#ff5a00] text-sm font-semibold hover:underline">Sign in →</a>
      </div>
    )
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
    </div>
  )

  const filtered = items.filter((v) => !searchQuery || matchesQuery(searchQuery, v.title, v.creatorName, v.category))

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        {/* Empty following state */}
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#ff5a00]/5 border border-[#ff5a00]/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#ff5a00]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-white font-bold text-lg">Nothing here yet</p>
            <p className="text-zinc-500 text-sm max-w-xs">Follow creators to see their videos and clips here.</p>
          </div>
          <button onClick={onDiscover} className="flex items-center gap-2 bg-[#ff5a00] hover:bg-orange-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/15">
            Discover Creators
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Recommendations */}
        {recommended.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Recommended for you</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {recommended.map((v) => <VideoMediaCard key={v.id} media={v} />)}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (filtered.length === 0) return <SearchEmptyState query={searchQuery} />

  // Split videos (16:9) from clips (9:16)
  const videos = filtered.filter((m) => m.type === 'video')
  const clips  = filtered.filter((m) => m.type === 'clip')

  return (
    <div className="space-y-8">
      {videos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Videos from creators you follow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {videos.map((v) => <VideoMediaCard key={v.id} media={v} />)}
          </div>
        </div>
      )}
      {clips.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Clips from creators you follow</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {clips.map((c) => <ClipMediaCard key={c.id} media={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function SearchEmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <svg className="w-6 h-6 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      </div>
      <div>
        <p className="text-white font-semibold text-sm">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-zinc-600 text-xs mt-1">Try a different search or browse another tab.</p>
      </div>
    </div>
  )
}

function LiveCardMenu({ targetId, targetTitle, targetOwnerId, targetOwnerName, shareUrl, onReport }: { targetId: string; targetTitle: string; targetOwnerId: string; targetOwnerName: string; shareUrl: string; onReport: (t: ReportTarget) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover/wrap:opacity-100 focus:opacity-100 ${open ? '!opacity-100' : ''}`}
        aria-label="More options">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#13151d] border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 py-1 z-50">
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`).then(() => toast.success('Link copied!', { icon: '🔗' })) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            Share
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onReport({ targetType: 'stream', targetId, targetTitle, targetOwnerId, targetOwnerName }) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
            Report
          </button>
        </div>
      )}
    </div>
  )
}
