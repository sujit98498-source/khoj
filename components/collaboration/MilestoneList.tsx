'use client'
// components/collaboration/MilestoneList.tsx

import React, { useState } from 'react'
import type { Milestone, MilestoneStatus } from '@/types/collaboration'
import { updateMilestoneStatus } from '@/lib/collaboration/roomMutations'

interface Props {
  milestones: Milestone[]
  canManage: boolean
  roomId: string
}

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  todo:        'text-khoj-subtle border-khoj-border',
  in_progress: 'text-khoj-gold border-khoj-gold/40',
  done:        'text-khoj-teal border-khoj-teal/40',
}

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
}

export function MilestoneList({ milestones, canManage, roomId }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)

  async function cycleStatus(m: Milestone) {
    if (!canManage) return
    const next: MilestoneStatus =
      m.status === 'todo' ? 'in_progress'
      : m.status === 'in_progress' ? 'done'
      : 'todo'
    setUpdating(m.id)
    await updateMilestoneStatus(roomId, m.id, next).catch(() => null)
    setUpdating(null)
  }

  if (milestones.length === 0) {
    return <p className="text-khoj-subtle text-xs">No milestones yet.</p>
  }

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 bg-[#0d0d16] border border-khoj-border rounded-lg px-4 py-3"
        >
          <button
            onClick={() => cycleStatus(m)}
            disabled={!canManage || updating === m.id}
            className={`flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${STATUS_COLORS[m.status]} ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
            title={canManage ? 'Click to advance status' : undefined}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${m.status === 'done' ? 'line-through text-khoj-subtle' : 'text-khoj-text'}`}>
              {m.title}
            </p>
            {m.description && (
              <p className="text-khoj-subtle text-xs mt-0.5 line-clamp-1">{m.description}</p>
            )}
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${STATUS_COLORS[m.status]}`}>
            {STATUS_LABELS[m.status]}
          </span>
        </div>
      ))}
    </div>
  )
}
