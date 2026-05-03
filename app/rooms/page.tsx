'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useStartupRooms } from '@/hooks/useStartupRooms'
import { StartupRoomCard } from '@/components/collaboration/StartupRoomCard'
import { CreateStartupRoomWizard } from '@/components/collaboration/CreateStartupRoomWizard'
import { CardSkeleton, EmptyState } from '@/components/collaboration/EmptyState'
import type { StartupStage, LocationMode } from '@/types/collaboration'
import { createRoom, getRooms, RoomItem } from '@/services/roomService'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

// ── Tab types ──────────────────────────────────────────────────────────────────
type RoomTab = 'all' | 'discussion' | 'learning' | 'project' | 'startup' | 'hiring'

const ROOM_TABS: Array<{ id: RoomTab; label: string; emoji: string }> = [
  { id: 'all',        label: 'All',        emoji: '🏠' },
  { id: 'discussion', label: 'Discussion', emoji: '💬' },
  { id: 'learning',   label: 'Learning',   emoji: '📚' },
  { id: 'project',    label: 'Project',    emoji: '🛠️'  },
  { id: 'startup',    label: 'Startup',    emoji: '🚀' },
  { id: 'hiring',     label: 'Hiring',     emoji: '💼' },
]

const STAGE_OPTS: Array<{ value: StartupStage | ''; label: string }> = [
  { value: '', label: 'All Stages' },
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'traction', label: 'Traction' },
  { value: 'growth', label: 'Growth' },
]

const LOCATION_OPTS: Array<{ value: LocationMode | ''; label: string }> = [
  { value: '', label: 'Any Location' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

/** Debounce helper to avoid rapid Firestore subscription resets */
function useDebounced<T>(value: T, delay = 300): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return dv
}

export default function RoomsPage() {
  const router = useRouter()
  const { khojUser } = useAuth()
  const [activeTab, setActiveTab] = useState<RoomTab>('all')
  const [showStartupWizard, setShowStartupWizard] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState<RoomTab>('startup')

  // Legacy rooms from localStorage (Discussion / Learning / Project / Hiring tabs)
  const [legacyRooms, setLegacyRooms] = useState<RoomItem[]>([])
  useEffect(() => {
    const sync = () => setLegacyRooms(getRooms())
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  // Startup room filters
  const [stage, setStage]             = useState<StartupStage | ''>('')
  const [locationMode, setLocation]   = useState<LocationMode | ''>('')
  const [recruiting, setRecruiting]   = useState(false)
  const [sortBy, setSortBy]           = useState<'recent' | 'members' | 'roles'>('recent')

  const dStage    = useDebounced(stage)
  const dLocation = useDebounced(locationMode)
  const dRec      = useDebounced(recruiting)

  const { rooms: startupRooms, loading: startupLoading } = useStartupRooms({
    stage:        dStage    || undefined,
    locationMode: dLocation || undefined,
    isRecruiting: dRec      || undefined,
  })

  // Decide which rooms to show for non-startup tabs
  const showStartupSection = activeTab === 'all' || activeTab === 'startup'
  const showStartupFilters = activeTab === 'startup'

  return (
    <AppShell>
      <div className="animate-slide-up space-y-8 pb-12">

        {/* ── Hero section ────────────────────────────────────────────── */}
        <section className="relative rounded-2xl overflow-hidden border border-khoj-border bg-gradient-to-br from-[#0d0d16] to-khoj-card px-8 py-12">
          {/* bg glow */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-khoj-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-blue-600/8 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
            <div className="flex-1 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-khoj-accent font-semibold">
                Collaboration Rooms
              </p>
              <h1 className="text-3xl font-display font-bold text-khoj-text leading-tight">
                Find co-founders. Build proof. Launch faster.
              </h1>
              <p className="text-khoj-subtle text-base leading-relaxed max-w-xl">
                Post your startup idea, recruit proven builders and designers, manage tasks together, and turn ideas into real products — all in one place.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {khojUser ? (
                <>
                  <Button variant="primary" onClick={() => { setCreateType('startup'); setShowStartupWizard(true) }}>
                    Create Startup Room
                  </Button>
                  <Link href="/explore">
                    <Button variant="secondary">Explore Founders</Button>
                  </Link>
                </>
              ) : (
                <Link href="/auth/login">
                  <Button variant="primary">Sign in to create a room</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="relative z-10 mt-8 flex flex-wrap gap-6 text-sm">
            {[
              { label: 'Active Rooms', value: startupRooms.length + legacyRooms.length },
              { label: 'Open Roles', value: startupRooms.reduce((a, r) => a + (r.openRoleCount ?? 0), 0) },
              { label: 'Builders Online', value: '—' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-khoj-text font-bold text-2xl">{value}</div>
                <div className="text-khoj-subtle text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works (shown on 'all' tab only) ────────────────── */}
        {activeTab === 'all' && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { step: '01', icon: '🚀', title: 'Create', desc: 'Post your startup idea with stage, problem, and the roles you need to fill.' },
              { step: '02', icon: '🎯', title: 'Recruit', desc: 'Review builder profiles with proof scores, send invites, or accept join requests.' },
              { step: '03', icon: '⚙️', title: 'Build',   desc: 'Use tasks, file sharing, live sessions, and roadmaps to ship together.' },
              { step: '04', icon: '🏆', title: 'Launch',  desc: 'Publish your product, document your journey, and grow your team further.' },
            ] as const).map(({ step, icon, title, desc }) => (
              <div key={step} className="relative bg-[#0d0d16] border border-khoj-border rounded-xl p-5 space-y-2 hover:border-khoj-accent/25 transition-colors">
                <span className="absolute top-3 right-4 text-[10px] font-mono text-khoj-border">{step}</span>
                <span className="text-2xl">{icon}</span>
                <p className="text-khoj-text font-bold text-sm">{title}</p>
                <p className="text-khoj-subtle text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </section>
        )}

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-khoj-border overflow-x-auto pb-0">
          {ROOM_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-khoj-accent border-khoj-accent'
                  : 'text-khoj-subtle border-transparent hover:text-khoj-text'
              )}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}

          <div className="ml-auto flex-shrink-0 pb-1.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (activeTab === 'startup') { setShowStartupWizard(true) }
                else { setShowCreateModal(true) }
              }}
            >
              + Create Room
            </Button>
          </div>
        </div>

        {/* ── Startup filter bar (only on Startup tab) ─────────────── */}
        {showStartupFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-khoj-subtle text-xs font-semibold uppercase tracking-wide mr-1">Filter:</span>
            {/* Stage */}
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as StartupStage | '')}
              className="bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-1.5 text-khoj-text text-xs focus:outline-none focus:border-khoj-accent/60"
            >
              {STAGE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {/* Location */}
            <select
              value={locationMode}
              onChange={(e) => setLocation(e.target.value as LocationMode | '')}
              className="bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-1.5 text-khoj-text text-xs focus:outline-none focus:border-khoj-accent/60"
            >
              {LOCATION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {/* Actively hiring */}
            <label className="flex items-center gap-1.5 text-khoj-subtle text-xs cursor-pointer px-3 py-1.5 bg-[#0d0d16] border border-khoj-border rounded-lg hover:border-khoj-accent/40 transition-colors">
              <input
                type="checkbox"
                checked={recruiting}
                onChange={(e) => setRecruiting(e.target.checked)}
                className="accent-khoj-accent"
              />
              Actively Hiring
            </label>
            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-khoj-subtle text-xs">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-1.5 text-khoj-text text-xs focus:outline-none focus:border-khoj-accent/60"
              >
                <option value="recent">Most Recent</option>
                <option value="members">Most Members</option>
                <option value="roles">Most Open Roles</option>
              </select>
            </div>
            {(stage || locationMode || recruiting) && (
              <button
                onClick={() => { setStage(''); setLocation(''); setRecruiting(false) }}
                className="text-khoj-accent text-xs hover:underline whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── All tab banner (when 'all' is active, show startup CTA) ─── */}
        {activeTab === 'all' && (
          <div className="rounded-xl border border-khoj-accent/25 bg-gradient-to-r from-khoj-accent/8 to-transparent p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
            <span className="text-3xl">🚀</span>
            <div className="flex-1">
              <p className="text-khoj-text font-semibold text-sm">Startup Rooms are live</p>
              <p className="text-khoj-subtle text-xs mt-0.5">
                Post your startup idea, define open roles, and match with co-founders and builders from the KHOJ community.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('startup')}
              className="flex-shrink-0 text-khoj-accent text-sm font-semibold hover:underline"
            >
              Browse Startup Rooms →
            </button>
          </div>
        )}

        {/* ── Startup Rooms content (shown on 'all' and 'startup' tabs) ── */}
        {showStartupSection && (
          <section>
            {activeTab !== 'all' && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-khoj-text font-bold text-xl">Startup Rooms</h2>
                  <p className="text-khoj-subtle text-sm mt-0.5">
                    Join a startup in progress or create your own.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'all' && (
              <h2 className="text-khoj-text font-semibold text-base mb-4">Startup Rooms</h2>
            )}

            {startupLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[0,1,2].map((i) => <CardSkeleton key={i} />)}
              </div>
            ) : startupRooms.length === 0 ? (
              <EmptyState
                title="No startup rooms yet"
                description={
                  stage || locationMode || recruiting
                    ? 'Try changing or clearing your filters.'
                    : 'Create the first startup room and find your co-founder.'
                }
                action={
                  khojUser ? (
                    <Button onClick={() => setShowStartupWizard(true)}>Create First Startup Room</Button>
                  ) : (
                    <Link href="/auth/login"><Button>Sign in to create a room</Button></Link>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {(activeTab === 'all' ? startupRooms.slice(0, 3) : [...startupRooms].sort((a, b) => {
                  if (sortBy === 'members') return (b.memberCount ?? 0) - (a.memberCount ?? 0)
                  if (sortBy === 'roles')   return (b.openRoleCount ?? 0) - (a.openRoleCount ?? 0)
                  // 'recent' — compare lastActivityAt
                  const ta = (a.lastActivityAt as any)?.toDate?.()?.getTime?.() ?? new Date(a.lastActivityAt as string).getTime()
                  const tb = (b.lastActivityAt as any)?.toDate?.()?.getTime?.() ?? new Date(b.lastActivityAt as string).getTime()
                  return tb - ta
                })).map((room) => (
                  <StartupRoomCard key={room.id} room={room} />
                ))}
              </div>
            )}

            {activeTab === 'all' && startupRooms.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setActiveTab('startup')}
                  className="text-khoj-accent text-sm font-semibold hover:underline"
                >
                  View all {startupRooms.length} startup rooms →
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── Discussion / Learning / Project / Hiring tabs ─────────── */}
        {(activeTab === 'discussion' || activeTab === 'learning' || activeTab === 'project' || activeTab === 'hiring') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-khoj-text font-bold text-xl capitalize">{activeTab} Rooms</h2>
            </div>
            {legacyRooms.length === 0 ? (
              <div className="rounded-xl border border-khoj-border bg-[#0d0d16] p-12 text-center space-y-3">
                <p className="text-4xl">
                  {activeTab === 'discussion' ? '💬' : activeTab === 'learning' ? '📚' : activeTab === 'hiring' ? '💼' : '🛠️'}
                </p>
                <p className="text-khoj-text font-semibold">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Rooms — Coming Soon
                </p>
                <p className="text-khoj-subtle text-sm">
                  {activeTab === 'hiring'
                    ? 'Post hiring-focused rooms to find talent directly from the KHOJ community.'
                    : activeTab === 'discussion'
                    ? 'Structured discussion rooms for community topics, AMAs, and debates.'
                    : activeTab === 'learning'
                    ? 'Learning cohorts, study groups, and skill-building sessions.'
                    : 'Collaborative project rooms for open-source and side projects.'}
                </p>
                {khojUser && (
                  <Button size="sm" onClick={() => setShowCreateModal(true)}>
                    Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Room
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {legacyRooms.map((room) => (
                  <LegacyRoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Create Room modal (non-startup types) ──────────────────── */}
      {showCreateModal && (
        <CreateRoomModal
          defaultType={createType}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => { setShowCreateModal(false); router.push(`/rooms/${id}`) }}
          onStartup={() => { setShowCreateModal(false); setShowStartupWizard(true) }}
          khojUser={khojUser}
          onRoomsUpdate={() => setLegacyRooms(getRooms())}
        />
      )}

      {/* ── Startup wizard ─────────────────────────────────────────── */}
      {showStartupWizard && khojUser && (
        <CreateStartupRoomWizard
          userId={khojUser.uid}
          displayName={khojUser.name ?? ''}
          avatarUrl={khojUser.avatarUrl ?? ''}
          onClose={() => setShowStartupWizard(false)}
        />
      )}
    </AppShell>
  )
}

// ── Legacy room card (non-startup) ────────────────────────────────────────────
function LegacyRoomCard({ room }: { room: RoomItem }) {
  const statusVariant = (s: string) => {
    if (s === 'live') return 'success'
    if (s === 'active') return 'info'
    if (s === 'private') return 'warning'
    return 'default'
  }
  return (
    <div className="bg-khoj-card border border-khoj-border rounded-xl p-5 space-y-4 hover:border-khoj-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-semibold">{room.type}</p>
          <h3 className="text-khoj-text font-bold text-base mt-0.5">{room.name}</h3>
        </div>
        <Badge label={room.status} variant={statusVariant(room.status) as any} size="md" />
      </div>
      <p className="text-khoj-subtle text-sm leading-relaxed">{room.description}</p>
      <div className="flex items-center justify-between pt-1">
        <span className="text-khoj-subtle text-xs">{room.members} members</span>
        <Link href={`/rooms/${room.id}`}>
          <Button size="sm" variant={room.status === 'coming soon' ? 'secondary' : 'primary'} disabled={room.status === 'coming soon'}>
            {room.status === 'coming soon' ? 'Coming Soon' : 'Join Room'}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Create Room modal ────────────────────────────────────────────────────────
const MODAL_TYPES: Array<{ id: RoomTab; label: string; desc: string; emoji: string }> = [
  { id: 'startup',    label: 'Startup Room',    desc: 'Build with co-founders and contributors',           emoji: '🚀' },
  { id: 'discussion', label: 'Discussion Room',  desc: 'Community topic, AMA, or debate',                  emoji: '💬' },
  { id: 'learning',   label: 'Learning Room',    desc: 'Study group, cohort, or skill workshop',           emoji: '📚' },
  { id: 'project',    label: 'Project Room',     desc: 'Open-source or side project collaboration',        emoji: '🛠️' },
  { id: 'hiring',     label: 'Hiring Room',      desc: 'Post a role and connect with talent',              emoji: '💼' },
]

interface CreateRoomModalProps {
  defaultType: RoomTab
  onClose: () => void
  onCreated: (id: string) => void
  onStartup: () => void
  khojUser: any
  onRoomsUpdate: () => void
}

function CreateRoomModal({ defaultType, onClose, onCreated, onStartup, khojUser, onRoomsUpdate }: CreateRoomModalProps) {
  const [selectedType, setSelectedType] = useState<RoomTab>(defaultType)
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')

  function handleCreate() {
    if (!name.trim() || !description.trim() || !khojUser) return
    const category: Exclude<import('@/services/roomService').RoomCategory, 'all'> =
      selectedType === 'all' ? 'discussion' : selectedType
    const room = createRoom({ name, category, description, visibility, createdBy: khojUser?.uid })
    onRoomsUpdate()
    onCreated(room.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-khoj-card border border-khoj-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-center justify-between">
          <div>
            <h2 className="text-khoj-text font-bold text-lg">Create a Room</h2>
            <p className="text-khoj-subtle text-sm mt-0.5">
              {step === 'pick' ? 'Choose a room type to get started' : 'Fill in the details'}
            </p>
          </div>
          <button onClick={onClose} className="text-khoj-subtle hover:text-khoj-text transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'pick' ? (
            <div className="space-y-2">
              {MODAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={clsx(
                    'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                    selectedType === t.id
                      ? 'border-khoj-accent bg-khoj-accent/8 text-khoj-text'
                      : 'border-khoj-border bg-[#0d0d16] text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
                  )}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
                  </div>
                  {selectedType === t.id && (
                    <span className="ml-auto text-khoj-accent text-sm">✓</span>
                  )}
                </button>
              ))}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-khoj-border">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (selectedType === 'startup') { onClose(); onStartup() }
                    else setStep('form')
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Room Name *</span>
                <input
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                  placeholder="e.g. JS Study Group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Description *</span>
                <textarea
                  rows={3}
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                  placeholder="What is this room for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div>
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Visibility</span>
                <div className="mt-1 flex gap-3">
                  {(['public', 'private'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer text-sm text-khoj-subtle">
                      <input type="radio" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="accent-khoj-accent" />
                      <span className="capitalize">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-khoj-border">
                <Button variant="secondary" onClick={() => setStep('pick')}>Back</Button>
                <Button onClick={handleCreate} disabled={!name.trim() || !description.trim()}>
                  Create Room
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
