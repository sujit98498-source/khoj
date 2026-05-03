'use client'

import { useLocalParticipant, useParticipants } from '@livekit/components-react'
import { Badge } from '@/components/ui/Badge'
import type { Participant } from 'livekit-client'

function getDisplayName(participant: Participant) {
  return participant.name?.trim() || participant.identity || 'Guest'
}

export default function ParticipantsPanel() {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()

  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsLocal = a.identity === localParticipant?.identity ? 1 : 0
    const bIsLocal = b.identity === localParticipant?.identity ? 1 : 0
    return bIsLocal - aIsLocal
  })

  return (
    <div className="h-full p-4">
      <div className="flex items-start justify-between gap-3 border-b border-khoj-border pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
            Participants
          </p>
          <h3 className="mt-1 text-lg font-display font-bold text-khoj-text">Live in room</h3>
        </div>
        <div className="rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 px-3 py-1 text-sm font-display font-bold text-khoj-accent">
          {participants.length}
        </div>
      </div>

      {sortedParticipants.length === 0 ? (
        <div className="py-8 text-sm text-khoj-subtle font-body">
          No participants connected yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedParticipants.map((participant) => {
            const displayName = getDisplayName(participant)
            const isLocalUser = participant.identity === localParticipant?.identity
            const isMuted = participant.isMicrophoneEnabled === false

            return (
              <div
                key={participant.sid}
                className="flex items-center justify-between gap-3 rounded-sm border border-khoj-border bg-khoj-bg px-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-khoj-accent/30 bg-khoj-accent/10 text-sm font-display font-bold text-khoj-accent">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-body font-semibold text-khoj-text">
                      {displayName}
                    </p>
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-khoj-subtle font-body">
                      {participant.identity}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isLocalUser && <Badge label="You" variant="info" size="sm" />}
                  <span className={isMuted ? 'text-[10px] font-body font-semibold text-red-400' : 'text-[10px] font-body font-semibold text-khoj-teal'}>
                    {isMuted ? 'Muted' : 'Mic On'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
