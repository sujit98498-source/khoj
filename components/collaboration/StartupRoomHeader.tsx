'use client'
// components/collaboration/StartupRoomHeader.tsx

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { CollabRoom, RoomMember } from '@/types/collaboration'

interface Props {
  room: CollabRoom
  myMember: RoomMember | null
  onJoin?: () => void
  onManage?: () => void
  onEvaluate?: () => void
}

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-zinc-700/60 text-zinc-300',
  mvp: 'bg-blue-900/60 text-blue-300',
  traction: 'bg-orange-900/60 text-khoj-accent',
  growth: 'bg-emerald-900/60 text-emerald-400',
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea Stage', mvp: 'MVP Stage', traction: 'Traction', growth: 'Growth',
}

function formatDate(ts: unknown): string {
  if (!ts) return ''
  try {
    const d = (ts as any)?.toDate ? (ts as any).toDate() : new Date(ts as string)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

export function StartupRoomHeader({ room, myMember, onJoin, onManage, onEvaluate }: Props) {
  const isOwnerOrFounder = myMember?.roomRole === 'owner' || myMember?.roomRole === 'cofounder'
  const isOwner = myMember?.roomRole === 'owner'
  const isMember = !!myMember && myMember.status !== 'inactive'
  const stage = room.startup?.stage ?? ''

  // Estimate in-progress milestones count from room data (use pendingJoinRequestCount as proxy)
  const applicationsCount = room.pendingJoinRequestCount ?? 0

  return (
    <div className="space-y-0">
      {/* Back link + action buttons row */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/rooms"
          className="flex items-center gap-1.5 text-khoj-subtle text-sm hover:text-khoj-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Rooms
        </Link>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-khoj-border bg-khoj-card text-khoj-subtle text-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-all"
            onClick={() => {
              if (typeof navigator !== 'undefined') {
                navigator.clipboard?.writeText(window.location.href)
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Room
          </button>
          {isOwnerOrFounder && (
            <button
              onClick={onEvaluate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-khoj-accent/40 text-khoj-accent text-sm font-semibold hover:bg-khoj-accent/10 transition-colors"
            >
              ⚡ Evaluate with KHOJ AI
            </button>
          )}
          {!isMember && room.isRecruiting && onJoin && (
            <Button variant="primary" onClick={onJoin}>
              Invite
            </Button>
          )}
          {isOwnerOrFounder && (
            <Button variant="primary" onClick={onManage}>
              Manage
            </Button>
          )}
        </div>
      </div>

      {/* Main header card */}
      <div className="bg-khoj-card border border-khoj-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Cover icon + info */}
          <div className="flex gap-5 flex-1 min-w-0">
            {/* Room icon / cover */}
            <div className="flex-shrink-0 w-24 h-24 rounded-xl bg-gradient-to-br from-khoj-accent/20 to-orange-900/30 border border-khoj-accent/20 flex items-center justify-center overflow-hidden">
              {room.coverImageUrl ? (
                <img src={room.coverImageUrl} alt={room.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">🚀</span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-khoj-accent font-semibold">
                Startup Room
              </p>
              <h1 className="text-2xl font-display font-bold text-khoj-text leading-tight">
                {room.title}
              </h1>
              <p className="text-khoj-subtle text-sm leading-relaxed line-clamp-2">
                {room.summary}
              </p>

              {/* Tags row */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {stage && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STAGE_COLORS[stage] ?? 'bg-khoj-border text-khoj-subtle'}`}>
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                )}
                {room.startup?.industryTags?.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-[#1a1a2e] text-khoj-subtle border border-khoj-border/60">
                    {tag}
                  </span>
                ))}
                {room.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-[#1a1a2e] text-khoj-subtle border border-khoj-border/60">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-6 pt-1 text-xs text-khoj-subtle">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-khoj-accent/20 flex items-center justify-center">
                    <span className="text-[10px] text-khoj-accent font-bold">
                      {(myMember?.profileSnapshot?.displayName ?? 'U')[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span>Room Owner</span>
                  <span className="font-medium text-khoj-text">
                    {isOwner ? 'You' : room.createdBy}
                  </span>
                  {isOwner && (
                    <span className="bg-khoj-accent/20 text-khoj-accent text-[10px] font-bold px-1.5 py-0.5 rounded">Owner</span>
                  )}
                </div>
                <div>
                  <span>Created on </span>
                  <span className="text-khoj-text font-medium">{formatDate(room.createdAt)}</span>
                </div>
                <div>
                  <span>Room Type </span>
                  <span className="text-khoj-text font-medium capitalize">Startup Room</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid + Join CTA */}
          <div className="flex flex-col gap-4 lg:w-72 flex-shrink-0">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: room.memberCount ?? 0,   label: 'Members' },
                { value: room.openRoleCount ?? 0,  label: 'Open Roles' },
                { value: applicationsCount,         label: 'Applications' },
                { value: room.startup?.progressProofCount ?? 0, label: 'Tasks in Progress' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-[#0d0d16] border border-khoj-border rounded-lg p-3 text-center">
                  <div className="text-khoj-text font-bold text-xl">{value}</div>
                  <div className="text-khoj-subtle text-[11px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Join CTA for non-members */}
            {!isMember && room.isRecruiting && (
              <div className="bg-[#0d0d16] border border-khoj-border rounded-lg p-4 space-y-2">
                <p className="text-khoj-text font-semibold text-sm">Join This Startup</p>
                <p className="text-khoj-subtle text-xs leading-relaxed">
                  Interested in this startup? Apply for a role and become part of the journey.
                </p>
                <button
                  onClick={onJoin}
                  className="w-full bg-khoj-accent hover:bg-khoj-accent/90 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  View Open Roles
                </button>
              </div>
            )}

            {/* Member badge */}
            {isMember && !isOwnerOrFounder && (
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3 text-center">
                <p className="text-emerald-400 text-sm font-semibold">✓ You're a member</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



