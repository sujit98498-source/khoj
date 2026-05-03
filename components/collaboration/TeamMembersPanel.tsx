'use client'
// components/collaboration/TeamMembersPanel.tsx

import React from 'react'
import type { RoomMember } from '@/types/collaboration'
import { Badge } from '@/components/ui/Badge'
import { ListSkeleton } from './EmptyState'

interface Props {
  members: RoomMember[]
  loading: boolean
}

const ROLE_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  owner: 'info', cofounder: 'warning', member: 'default', advisor: 'success',
}

export function TeamMembersPanel({ members, loading }: Props) {
  if (loading) return <ListSkeleton rows={4} />

  const active = members.filter((m) => m.status !== 'inactive')

  return (
    <div className="space-y-2">
      {active.map((m) => (
        <div
          key={m.userId}
          className="flex items-center gap-3 bg-[#0d0d16] border border-khoj-border rounded-xl px-4 py-3"
        >
          <div className="w-10 h-10 rounded-full bg-khoj-border overflow-hidden flex-shrink-0">
            {m.profileSnapshot?.avatarUrl ? (
              <img src={m.profileSnapshot.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-khoj-subtle">
                {(m.profileSnapshot?.displayName ?? 'U')[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-khoj-text text-sm font-medium truncate">
              {m.profileSnapshot?.displayName ?? 'Member'}
            </p>
            {m.profileSnapshot?.headline && (
              <p className="text-khoj-subtle text-xs truncate mt-0.5">{m.profileSnapshot.headline}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              label={m.roomRole.charAt(0).toUpperCase() + m.roomRole.slice(1)}
              variant={ROLE_VARIANT[m.roomRole] ?? 'default'}
            />
            {m.status === 'trial' && <Badge label="Trial" variant="warning" />}
          </div>
        </div>
      ))}
      {active.length === 0 && (
        <p className="text-khoj-subtle text-sm text-center py-6">No active members.</p>
      )}
    </div>
  )
}
