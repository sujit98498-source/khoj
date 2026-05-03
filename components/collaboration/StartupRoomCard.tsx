'use client'
// components/collaboration/StartupRoomCard.tsx

import React from 'react'
import Link from 'next/link'
import type { CollabRoom } from '@/types/collaboration'

interface StartupRoomCardProps {
  room: CollabRoom
}

// Compute a 0-5 proof/trust score from available room data
function proofScore(room: CollabRoom): number {
  let s = 0
  if (room.startup?.problem)              s++
  if (room.startup?.solution)             s++
  if (room.tags && room.tags.length > 0)  s++
  if ((room.openRoleCount ?? 0) > 0)      s++
  if ((room.memberCount ?? 0) > 1)        s++
  return s
}

function timeAgo(ts: unknown): string {
  if (!ts) return ''
  try {
    const d = (ts as any)?.toDate ? (ts as any).toDate() : new Date(ts as string)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60)    return 'just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch { return '' }
}

const STAGE_STYLES: Record<string, string> = {
  idea:     'bg-zinc-800 text-zinc-300 border-zinc-700',
  mvp:      'bg-blue-900/60 text-blue-300 border-blue-700/40',
  traction: 'bg-orange-900/50 text-orange-300 border-orange-700/40',
  growth:   'bg-emerald-900/50 text-emerald-300 border-emerald-700/40',
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea Stage', mvp: 'MVP Stage', traction: 'Traction', growth: 'Growth',
}

const ROLE_ICONS: Record<string, string> = {
  Engineering: '⚙️', Design: '🎨', Marketing: '📣', Product: '🧩',
  Sales: '💼', Finance: '💰', Operations: '🔧', Content: '✍️',
  Data: '📊', Legal: '⚖️', Research: '🔬', Other: '💡',
}

export function StartupRoomCard({ room }: StartupRoomCardProps) {
  const stage = room.startup?.stage ?? ''
  const score = proofScore(room)
  const ago   = timeAgo(room.lastActivityAt)

  return (
    <div className="group bg-khoj-card border border-khoj-border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:border-khoj-accent/40 hover:shadow-[0_0_32px_rgba(255,77,0,0.08)]">

      {/* Top accent strip */}
      <div className="h-0.5 bg-gradient-to-r from-khoj-accent/60 via-khoj-accent/20 to-transparent" />

      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Row 1: stage badge + tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {stage && (
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${STAGE_STYLES[stage] ?? 'bg-khoj-border text-khoj-subtle border-khoj-border'}`}>
              {STAGE_LABELS[stage] ?? stage}
            </span>
          )}
          {room.startup?.locationMode && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#1a1a2e] border border-khoj-border/60 text-khoj-subtle capitalize">
              {room.startup.locationMode === 'remote' ? '🌍 Remote' : room.startup.locationMode === 'hybrid' ? '🏙️ Hybrid' : '📍 On-site'}
            </span>
          )}
          {room.isRecruiting && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-900/40 border border-emerald-700/30 text-emerald-400">
              Hiring
            </span>
          )}
          {room.currentLiveSessionId && (
            <span className="ml-auto flex items-center gap-1 text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Row 2: title + summary */}
        <div>
          <h3 className="text-khoj-text font-bold text-base leading-snug group-hover:text-khoj-accent transition-colors line-clamp-1">
            {room.title}
          </h3>
          <p className="text-khoj-subtle text-xs mt-1 leading-relaxed line-clamp-2">
            {room.startup?.problem || room.summary}
          </p>
        </div>

        {/* Row 3: industry tags */}
        {(room.startup?.industryTags?.length ?? 0) > 0 || (room.tags?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {[...(room.startup?.industryTags ?? []), ...(room.tags ?? [])]
              .slice(0, 4)
              .map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 bg-khoj-border/50 text-khoj-subtle rounded-sm">
                  {tag}
                </span>
              ))}
          </div>
        ) : null}

        {/* Row 4: roles needed */}
        {room.startup?.lookingFor && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] text-khoj-subtle">Looking for:</span>
            {room.startup.lookingFor === 'cofounder' && (
              <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 bg-khoj-accent/10 border border-khoj-accent/20 text-khoj-accent rounded-md">
                🤝 Co-founder
              </span>
            )}
            {(room.startup.lookingFor === 'contributors' || room.startup.lookingFor === 'both') && (
              <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 border border-blue-700/30 text-blue-300 rounded-md">
                ⚙️ Contributors
              </span>
            )}
            {room.startup.lookingFor === 'both' && (
              <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 rounded-md">
                🤝 Co-founder
              </span>
            )}
          </div>
        )}

        {/* Row 5: stats */}
        <div className="flex items-center gap-4 text-xs text-khoj-subtle pt-1 border-t border-khoj-border/60">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5m6 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
            </svg>
            {room.memberCount ?? 0}
          </span>
          {(room.openRoleCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-khoj-accent">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {room.openRoleCount} open
            </span>
          )}
          {(room.pendingJoinRequestCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-khoj-teal">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              {room.pendingJoinRequestCount} requests
            </span>
          )}
          {/* Proof score */}
          <span className="ml-auto flex items-center gap-1 text-khoj-gold">
            {'★'.repeat(score)}{'☆'.repeat(5 - score)}
            <span className="text-[10px] text-khoj-subtle ml-0.5">{score}/5</span>
          </span>
        </div>

        {/* Row 6: founder + time */}
        <div className="flex items-center justify-between text-[11px] text-khoj-subtle">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-khoj-accent/20 flex items-center justify-center text-[9px] text-khoj-accent font-bold flex-shrink-0">
              {(room.founderName ?? room.createdBy ?? 'F')[0]?.toUpperCase()}
            </div>
            <span>{room.founderName ?? 'Founder'}</span>
          </div>
          {ago && <span>{ago}</span>}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="px-5 pb-5 flex gap-2">
        <Link href={`/rooms/${room.id}`} className="flex-1">
          <button className="w-full px-4 py-2 rounded-lg border border-khoj-border bg-[#0d0d16] text-khoj-text text-sm font-semibold hover:border-khoj-accent/40 hover:text-khoj-accent transition-all">
            View Room
          </button>
        </Link>
        {room.isRecruiting && (
          <Link href={`/rooms/${room.id}`} className="flex-1">
            <button className="w-full px-4 py-2 rounded-lg bg-khoj-accent hover:bg-khoj-accent/90 text-white text-sm font-semibold transition-all">
              Request to Join
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

