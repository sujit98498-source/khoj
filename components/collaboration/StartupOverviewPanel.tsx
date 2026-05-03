'use client'
// components/collaboration/StartupOverviewPanel.tsx
// Two-column overview layout: main content (left 2/3) + right sidebar (1/3)

import React from 'react'
import type { CollabRoom, RoomMember, Milestone, StartupRole } from '@/types/collaboration'
import { MilestoneList } from './MilestoneList'

interface Props {
  room: CollabRoom
  members: RoomMember[]
  milestones: Milestone[]
  roles?: StartupRole[]
  canManage: boolean
  onViewRoles?: () => void
  onViewMembers?: () => void
}

function deriveSkills(room: CollabRoom, roles: StartupRole[]): string[] {
  const tagSet = new Set<string>()
  room.startup?.industryTags?.forEach((t) => tagSet.add(t))
  room.tags?.forEach((t) => tagSet.add(t))
  roles.forEach((r) => r.category && tagSet.add(r.category))
  return Array.from(tagSet).slice(0, 12)
}

const PROGRESS_ITEMS = [
  { key: 'problem',     label: 'Problem defined' },
  { key: 'solution',    label: 'Solution described' },
  { key: 'industryTags',label: 'Industry tags set' },
  { key: 'roles',       label: 'Open roles added' },
  { key: 'traction',    label: 'Traction summary added' },
]

function calcProgress(room: CollabRoom, rolesCount: number) {
  const checks = [
    !!(room.startup?.problem),
    !!(room.startup?.solution),
    !!(room.startup?.industryTags?.length),
    rolesCount > 0,
    !!(room.startup?.tractionSummary),
  ]
  return { pct: Math.round((checks.filter(Boolean).length / checks.length) * 100), checks }
}

const ROLE_ICONS: Record<string, string> = {
  Engineering: '⚙️', Design: '🎨', Marketing: '📣', Product: '🧩',
  Sales: '💼', Finance: '💰', Operations: '🔧', Content: '✍️',
  Data: '📊', Legal: '⚖️',
}

export function StartupOverviewPanel({
  room, members, milestones, roles = [], canManage, onViewRoles, onViewMembers,
}: Props) {
  const skills = deriveSkills(room, roles)
  const { pct, checks } = calcProgress(room, roles.length)
  const openRoles = roles.filter((r) => r.status === 'open')
  const doneMilestones = milestones.filter((m) => m.status === 'done').length
  const inProgressMilestones = milestones.filter((m) => m.status === 'in_progress')

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
      {/* ── LEFT: main content ────────────────────────────────────── */}
      <div className="space-y-6 min-w-0">

        {/* About */}
        {room.summary && (
          <section>
            <h2 className="text-khoj-text font-semibold text-base mb-2">About Our Startup</h2>
            <p className="text-khoj-subtle text-sm leading-relaxed">{room.summary}</p>
          </section>
        )}

        {/* Problem / Solution / Vision 3-col */}
        {room.startup && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <h3 className="text-khoj-text text-xs font-semibold uppercase tracking-wider">Problem</h3>
                </div>
                <p className="text-khoj-subtle text-sm leading-relaxed">{room.startup.problem}</p>
              </div>
              <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">💡</span>
                  <h3 className="text-khoj-text text-xs font-semibold uppercase tracking-wider">Solution</h3>
                </div>
                <p className="text-khoj-subtle text-sm leading-relaxed">{room.startup.solution}</p>
              </div>
              <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <h3 className="text-khoj-text text-xs font-semibold uppercase tracking-wider">Our Vision</h3>
                </div>
                <p className="text-khoj-subtle text-sm leading-relaxed">
                  {room.startup.tractionSummary
                    ? room.startup.tractionSummary
                    : `Building a ${room.startup.locationMode === 'remote' ? 'fully remote' : room.startup.locationMode} startup in the ${room.startup.industryTags?.[0] ?? 'tech'} space.`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* What We Need */}
        {openRoles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-khoj-text font-semibold text-base">What We Need</h2>
              {onViewRoles && (
                <button onClick={onViewRoles} className="text-khoj-accent text-xs hover:underline">
                  View all roles →
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {openRoles.slice(0, 6).map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 bg-[#0d0d16] border border-khoj-border rounded-xl px-4 py-3 min-w-[180px] flex-1"
                >
                  <span className="text-xl">{ROLE_ICONS[role.category] ?? '👤'}</span>
                  <div>
                    <p className="text-khoj-text text-sm font-medium">{role.title}</p>
                    <p className="text-khoj-subtle text-xs mt-0.5">
                      {role.seats > 1 ? `${role.seats} Openings` : '1 Opening'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 className="text-khoj-text font-semibold text-base mb-3">Skills We're Looking For</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-3 py-1 bg-[#0d0d16] border border-khoj-border rounded-full text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Current Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-khoj-text font-semibold text-base">Current Tasks</h2>
            <span className="text-khoj-subtle text-xs">{doneMilestones}/{milestones.length} complete</span>
          </div>
          <MilestoneList milestones={milestones} canManage={canManage} roomId={room.id} />
        </section>
      </div>

      {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Members */}
        <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-khoj-text font-semibold text-sm">Members ({members.length})</h3>
            {onViewMembers && (
              <button onClick={onViewMembers} className="text-khoj-accent text-xs hover:underline">View all</button>
            )}
          </div>
          <div className="space-y-3">
            {members.slice(0, 5).map((m, i) => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-khoj-border overflow-hidden">
                    {m.profileSnapshot?.avatarUrl ? (
                      <img src={m.profileSnapshot.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-khoj-subtle font-medium">
                        {(m.profileSnapshot?.displayName ?? 'U')[0]}
                      </div>
                    )}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0d0d16] ${i < 2 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-khoj-text text-xs font-semibold truncate">{m.profileSnapshot?.displayName ?? 'Member'}</p>
                  <p className="text-khoj-subtle text-[11px] capitalize truncate">{m.profileSnapshot?.headline ?? m.roomRole}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Progress */}
        <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4">
          <h3 className="text-khoj-text font-semibold text-sm mb-4">Room Progress</h3>
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E1E2E" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#FF4D00" strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-khoj-text font-bold text-sm">{pct}%</span>
              </div>
            </div>
            <p className="text-khoj-subtle text-xs mt-1">Setup Progress</p>
          </div>
          <div className="space-y-2">
            {PROGRESS_ITEMS.map((item, idx) => (
              <div key={item.key} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${checks[idx] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-khoj-border text-khoj-subtle'}`}>
                  {checks[idx] ? '✓' : '·'}
                </span>
                <span className={`text-xs ${checks[idx] ? 'text-khoj-text' : 'text-khoj-subtle'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Activity */}
        <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4">
          <h3 className="text-khoj-text font-semibold text-sm mb-3">Room Activity</h3>
          <div className="space-y-3">
            {members.slice(0, 3).map((m) => (
              <div key={m.userId} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-khoj-border overflow-hidden flex-shrink-0 mt-0.5">
                  {m.profileSnapshot?.avatarUrl ? (
                    <img src={m.profileSnapshot.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-khoj-subtle">
                      {(m.profileSnapshot?.displayName ?? 'U')[0]}
                    </div>
                  )}
                </div>
                <p className="text-khoj-subtle text-[11px] leading-relaxed flex-1 min-w-0">
                  <span className="text-khoj-text font-medium">{m.profileSnapshot?.displayName ?? 'Someone'}</span>{' '}
                  {m.roomRole === 'owner' ? 'created this room' : 'joined the room'}
                </p>
              </div>
            ))}
            {inProgressMilestones.slice(0, 2).map((ms) => (
              <div key={ms.id} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-khoj-accent/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] text-khoj-accent">⚡</span>
                </div>
                <p className="text-khoj-subtle text-[11px] leading-relaxed flex-1 min-w-0">
                  Task <span className="text-khoj-text font-medium">{ms.title}</span> in progress
                </p>
              </div>
            ))}
            {members.length === 0 && milestones.length === 0 && (
              <p className="text-khoj-subtle text-xs text-center py-2">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
