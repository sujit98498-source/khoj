// app/streams/page.tsx
// Live Streams listing page — shows all active public streams with filters.
// Matches KHOJ dark/orange theme.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { StreamCard } from '@/components/streams/StreamCard'
import { CreateStreamModal } from '@/components/streams/CreateStreamModal'
import { subscribeLiveStreams } from '@/services/streamService'
import { Stream, StreamCategory } from '@/lib/types'

type FilterCategory = 'All' | StreamCategory

const FILTERS: FilterCategory[] = [
  'All',
  'Coding',
  'Gaming',
  'Startup',
  'Fitness',
  'Design',
  'Education',
  'Tournaments',
]

export default function StreamsPage() {
  const router = useRouter()
  const { khojUser, firebaseUser, loading } = useAuth()
  const [streams, setStreams] = useState<Stream[]>([])
  const [filter, setFilter] = useState<FilterCategory>('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [streamsLoading, setStreamsLoading] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/auth/login')
    }
  }, [loading, firebaseUser, router])

  // Subscribe to live streams
  useEffect(() => {
    if (!firebaseUser) return
    const unsub = subscribeLiveStreams((liveStreams) => {
      setStreams(liveStreams)
      setStreamsLoading(false)
    })
    return () => unsub()
  }, [firebaseUser])

  const filteredStreams =
    filter === 'All' ? streams : streams.filter((s) => s.category === filter)

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-khoj-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="animate-slide-up space-y-6">
        <PageHeader
          eyebrow="Live Now"
          title="Streams"
          subtitle="Watch and join live streams from the KHOJ community"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!firebaseUser) {
                  router.push('/auth/login')
                  return
                }
                setShowCreateModal(true)
              }}
            >
              🔴 Go Live
            </Button>
          }
        />

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm font-body">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-khoj-text font-semibold">{streams.length}</span>
            <span className="text-khoj-subtle">live now</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 text-xs font-body font-semibold rounded-sm border transition-all duration-150 ${
                filter === f
                  ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/40'
                  : 'bg-transparent text-khoj-subtle border-khoj-border hover:text-khoj-text hover:border-khoj-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Stream Grid */}
        {streamsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <StreamCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredStreams.length === 0 ? (
          <EmptyState
            category={filter}
            onGoLive={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </div>

      {/* Create Stream Modal */}
      {showCreateModal && firebaseUser && (
        <CreateStreamModal
          onClose={() => setShowCreateModal(false)}
          hostId={firebaseUser.uid}
          hostName={khojUser?.name ?? firebaseUser.displayName ?? 'Anonymous'}
          hostPhoto={khojUser?.avatarUrl ?? firebaseUser.photoURL ?? ''}
        />
      )}
    </AppShell>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StreamCardSkeleton() {
  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm overflow-hidden animate-pulse">
      <div className="aspect-video bg-khoj-bg" />
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-sm bg-khoj-border" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-khoj-border rounded w-3/4" />
            <div className="h-2.5 bg-khoj-border rounded w-1/2" />
          </div>
        </div>
        <div className="h-2.5 bg-khoj-border rounded w-1/3" />
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  category,
  onGoLive,
}: {
  category: FilterCategory
  onGoLive: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-sm bg-khoj-card border border-khoj-border flex items-center justify-center">
        <span className="text-2xl opacity-30">◈</span>
      </div>
      <div>
        <p className="text-khoj-text font-body font-semibold text-base">
          {category === 'All' ? 'No live streams right now' : `No ${category} streams live`}
        </p>
        <p className="text-khoj-subtle font-body text-sm mt-1">
          Be the first to go live!
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onGoLive}>
        🔴 Start a Stream
      </Button>
    </div>
  )
}
