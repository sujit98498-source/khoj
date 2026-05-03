'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useStartupRooms } from '@/hooks/useStartupRooms'
import { StartupRoomCard } from '@/components/collaboration/StartupRoomCard'
import { CreateStartupRoomWizard } from '@/components/collaboration/CreateStartupRoomWizard'
import { CardSkeleton, EmptyState } from '@/components/collaboration/EmptyState'
import type { StartupStage, LocationMode, Commitment } from '@/types/collaboration'

/** Debounce a value to avoid firing Firestore subscriptions on every keystroke/select. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const STAGE_OPTS: Array<{ value: StartupStage | ''; label: string }> = [
  { value: '', label: 'All stages' },
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'traction', label: 'Traction' },
  { value: 'growth', label: 'Growth' },
]

const COMMITMENT_OPTS: Array<{ value: Commitment | ''; label: string }> = [
  { value: '', label: 'Any commitment' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'flexible', label: 'Flexible' },
]

const LOCATION_OPTS: Array<{ value: LocationMode | ''; label: string }> = [
  { value: '', label: 'Any location' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

export default function StartupRoomsPage() {
  const { khojUser } = useAuth()
  const [showWizard, setShowWizard] = useState(false)
  const [stage, setStage]       = useState<StartupStage | ''>('')
  const [commitment, setComm]   = useState<Commitment | ''>('')
  const [locationMode, setLoc]  = useState<LocationMode | ''>('')
  const [recruiting, setRec]    = useState(false)

  // Debounce filter state so rapid changes don't recreate Firestore subscriptions immediately
  const dStage      = useDebounced(stage)
  const dCommitment = useDebounced(commitment)
  const dLocation   = useDebounced(locationMode)
  const dRecruiting = useDebounced(recruiting)

  const { rooms, loading, error } = useStartupRooms({
    stage:        dStage      || undefined,
    commitment:   dCommitment || undefined,
    locationMode: dLocation   || undefined,
    isRecruiting: dRecruiting || undefined,
  })

  return (
    <AppShell>
      <div className="animate-slide-up space-y-8">
        <PageHeader
          eyebrow="Collaboration Rooms"
          title="Startup Rooms"
          subtitle="Find co-founders, contributors, and advisors. Build in public with the KHOJ community."
          action={
            khojUser && (
              <Button onClick={() => setShowWizard(true)}>+ Create Startup Room</Button>
            )
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
            value={stage}
            onChange={(e) => setStage(e.target.value as any)}
          >
            {STAGE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
            value={commitment}
            onChange={(e) => setComm(e.target.value as any)}
          >
            {COMMITMENT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
            value={locationMode}
            onChange={(e) => setLoc(e.target.value as any)}
          >
            {LOCATION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recruiting}
              onChange={(e) => setRec(e.target.checked)}
              className="accent-khoj-accent w-4 h-4"
            />
            <span className="text-khoj-subtle text-sm">Hiring only</span>
          </label>
        </div>

        {/* Grid */}
        {loading && (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {!loading && error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {!loading && !error && rooms.length === 0 && (
          <EmptyState
            icon="🚀"
            title="No startup rooms found"
            description="Try adjusting the filters, or be the first to create one."
            action={khojUser && <Button onClick={() => setShowWizard(true)}>Create Startup Room</Button>}
          />
        )}

        {!loading && rooms.length > 0 && (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <StartupRoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>

      {showWizard && khojUser && (
        <CreateStartupRoomWizard
          userId={khojUser.uid}
          displayName={khojUser.name ?? ''}
          avatarUrl={khojUser.avatarUrl ?? ''}
          onClose={() => setShowWizard(false)}
        />
      )}
    </AppShell>
  )
}
