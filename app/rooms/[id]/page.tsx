'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import VoiceRoom from '@/components/rooms/VoiceRoom'
import RoomChatPanel from '@/components/rooms/RoomChatPanel'
import { getRoomById, RoomItem } from '@/services/roomService'
import { getCollabRoom } from '@/lib/collaboration/roomQueries'
import type { CollabRoom } from '@/types/collaboration'
import { StartupRoomView } from '@/components/collaboration/StartupRoomView'

interface RoomDetailPageProps {
  params: {
    id: string
  }
}

function formatRoomTitle(roomId: string) {
  return roomId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function RoomDetailPage({ params }: RoomDetailPageProps) {
  const roomName = params.id
  const { khojUser, isAuthenticated, loading } = useAuth()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') ?? 'overview') as
    'overview' | 'members' | 'roles' | 'files' | 'sessions' | 'inbox' | 'ai_evaluation' | 'ai_builder'
  const [room, setRoom] = useState<RoomItem | null>(null)
  const [collabRoom, setCollabRoom] = useState<CollabRoom | null | undefined>(undefined)

  useEffect(() => {
    setRoom(getRoomById(roomName))
    // Also try Firestore for startup rooms
    getCollabRoom(roomName).then((r) => setCollabRoom(r))
  }, [roomName])

  const roomTitle = useMemo(() => room?.name || formatRoomTitle(roomName), [room?.name, roomName])
  const roomDescription = room?.description || 'Join this real-time KHOJ collaboration space for tournament sync, strategy, discussion, and live voice coordination.'

  if (loading || collabRoom === undefined) {
    return (
      <AppShell>
        <div className="py-16 text-center text-khoj-subtle">Loading room...</div>
      </AppShell>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-khoj-bg text-khoj-text flex items-center justify-center px-6">
        <Card className="max-w-lg text-center space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
            Login Required
          </p>
          <h1 className="text-2xl font-display font-bold text-khoj-text">Sign in to join KHOJ rooms</h1>
          <p className="text-sm text-khoj-subtle font-body">
            Room access is protected so voice and collaboration stay tied to real KHOJ identities.
          </p>
          <Link href={`/auth/login?redirect=/rooms/${roomName}`}>
            <Button>Go to Login</Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Startup room branch
  if (collabRoom?.roomType === 'startup') {
    return (
      <AppShell>
        <StartupRoomView
          room={collabRoom}
          currentUserId={khojUser!.uid}
          currentUserName={khojUser!.name ?? ''}
          currentUserAvatar={khojUser!.avatarUrl ?? ''}
          initialTab={initialTab}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-8 animate-slide-up">
        <div className="rounded-sm border border-khoj-border bg-khoj-card p-6 shadow-[0_0_30px_rgba(255,77,0,0.06)]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
            KHOJ Room
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-khoj-text">{roomTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm text-khoj-subtle font-body leading-6">
                {roomDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge label={room?.type || 'Voice Room'} variant="info" size="md" />
              <Badge label={room?.status || 'Live'} variant="success" size="md" />
              <Badge label={room?.visibility === 'private' ? 'Private' : 'Public'} variant="warning" size="md" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <VoiceRoom
            roomName={roomName}
            userName={khojUser?.name || 'KHOJ User'}
            userIdentityBase={khojUser?.uid}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RoomChatPanel
              roomId={roomName}
              currentUserId={khojUser?.uid || 'guest'}
              currentUserName={khojUser?.name || 'KHOJ User'}
            />

            <Card className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                Room Activity
              </p>
              <h2 className="text-lg font-display font-bold text-khoj-text">Live Collaboration Ready</h2>
              <p className="text-sm text-khoj-subtle font-body">
                Participants update in real time as people join or leave, and text chat now keeps the room conversation active during voice sessions.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
