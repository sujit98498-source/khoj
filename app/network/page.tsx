// app/network/page.tsx
// Your connections/friends list — real-time from Firestore.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { FriendCard } from '@/components/network/FriendCard'
import { useAuth } from '@/hooks/useAuth'
import { useFriends, useIncomingRequests } from '@/hooks/useFriendRequests'
import type { Friendship } from '@/lib/types'

export default function NetworkPage() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const myUid = khojUser?.uid ?? null
  const { friends, loading } = useFriends(myUid)
  const { requests: incoming } = useIncomingRequests(myUid)

  const [search, setSearch] = useState('')
  const [localFriends, setLocalFriends] = useState<Friendship[] | null>(null)

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  const displayFriends = localFriends ?? friends
  const filtered = search.trim()
    ? displayFriends.filter((f) => {
        const theirName = f.userNames[f.userIds.find((id) => id !== myUid!) ?? ''] ?? ''
        return theirName.toLowerCase().includes(search.toLowerCase())
      })
    : displayFriends

  function handleRemove(friendshipId: string) {
    setLocalFriends((prev) => (prev ?? friends).filter((f) => f.id !== friendshipId))
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-khoj-text">My Network</h1>
          <p className="text-xs font-body text-khoj-subtle mt-1">
            {displayFriends.length} connection{displayFriends.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {incoming.length > 0 && (
            <Link
              href="/network/requests"
              className="flex items-center gap-2 text-xs font-body font-semibold px-3 py-2 rounded-sm bg-khoj-accent/10 border border-khoj-accent/30 text-khoj-accent hover:bg-khoj-accent/20 transition-colors"
            >
              <span className="w-4 h-4 bg-khoj-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                {incoming.length}
              </span>
              Requests
            </Link>
          )}
          <Link
            href="/network/requests"
            className="text-xs font-body text-khoj-subtle border border-khoj-border px-3 py-2 rounded-sm hover:text-khoj-accent hover:border-khoj-accent/30 transition-colors"
          >
            All Requests →
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search connections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-khoj-card border border-khoj-border rounded-sm px-4 py-2.5 text-sm font-body text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/40 transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-khoj-card border border-khoj-border rounded-sm animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <span className="text-4xl text-khoj-muted">◈</span>
          {search ? (
            <p className="text-sm font-body text-khoj-subtle">No connections match "{search}"</p>
          ) : (
            <>
              <p className="text-sm font-body text-khoj-subtle">No connections yet.</p>
              <p className="text-xs font-body text-khoj-muted">
                Visit player profiles on the Leaderboard or Community to connect.
              </p>
              <Link
                href="/leaderboard"
                className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
              >
                Browse Leaderboard →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((friendship) => (
            <FriendCard
              key={friendship.id}
              friendship={friendship}
              myUid={myUid!}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
