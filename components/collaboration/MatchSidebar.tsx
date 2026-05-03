'use client'
// components/collaboration/MatchSidebar.tsx
// Shows ranked profile matches for a room + role.

import React from 'react'
import type { CollabRoom, StartupRole } from '@/types/collaboration'
import { useStartupMatches } from '@/hooks/useStartupMatches'
import { CardSkeleton } from './EmptyState'

interface Props {
  room: CollabRoom
  targetRole: StartupRole | null
  enabled: boolean
}

export function MatchSidebar({ room, targetRole, enabled }: Props) {
  const { matches, loading } = useStartupMatches(room, targetRole, enabled)

  return (
    <div className="space-y-3">
      <h3 className="text-khoj-text font-semibold text-sm">
        {targetRole ? `Top matches for ${targetRole.title}` : 'Suggested Profiles'}
      </h3>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-khoj-card border border-khoj-border rounded-lg p-3 animate-pulse">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-khoj-border flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-khoj-border rounded w-1/2" />
                  <div className="h-2.5 bg-khoj-border rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && matches.length === 0 && (
        <p className="text-khoj-subtle text-xs text-center py-6">No public profiles to match against.</p>
      )}

      {!loading && matches.map((m) => (
        <div
          key={m.profile.userId}
          className="flex items-center gap-3 bg-[#0d0d16] border border-khoj-border rounded-lg p-3 hover:border-khoj-accent/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-khoj-border overflow-hidden flex-shrink-0">
            {(m.profile as any)?.avatarUrl ? (
              <img src={(m.profile as any).avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-khoj-subtle">
                {((m.profile as any)?.displayName ?? 'U')[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-khoj-text text-xs font-medium truncate">
              {(m.profile as any)?.displayName ?? m.profile.userId}
            </p>
            <p className="text-khoj-subtle text-[10px] truncate mt-0.5">
              {m.profile?.headline ?? ''}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-khoj-teal text-xs font-bold">{Math.round(m.score * 100)}%</div>
            <div className="text-khoj-subtle text-[10px]">match</div>
          </div>
        </div>
      ))}
    </div>
  )
}
