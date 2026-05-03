'use client'
// components/collaboration/SessionsPanel.tsx

import React, { useState } from 'react'
import type { StartupSession, RoomMember } from '@/types/collaboration'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createStartupSession, endStartupSession } from '@/lib/collaboration/roomMutations'
import { EmptyState } from './EmptyState'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'

interface Props {
  roomId: string
  sessions: StartupSession[]
  liveSession: StartupSession | null
  myMember: RoomMember | null
  canManage: boolean
  onFetchToken: (sessionId: string, liveKitRoomName: string) => Promise<string | null>
  tokenMap: Record<string, string>
  tokenLoading: string | null
}

export function SessionsPanel({
  roomId,
  sessions,
  liveSession,
  myMember,
  canManage,
  onFetchToken,
  tokenMap,
  tokenLoading,
}: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', sessionType: 'standup' as any })
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  async function handleCreate() {
    if (!myMember) return
    setCreating(true)
    setErr(null)
    try {
      await createStartupSession(myMember.userId, roomId, { ...form, roomId })
      setShowCreate(false)
      setForm({ title: '', sessionType: 'standup' })
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  async function joinSession(session: StartupSession) {
    if (!myMember) return
    setActiveSessionId(session.id)
    await onFetchToken(session.id, session.liveKitRoomName)
  }

  async function endSession(session: StartupSession) {
    await endStartupSession(roomId, session.id)
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  // If user is in a session with a token, render the LiveKit room full-screen
  if (activeSessionId && tokenMap[activeSessionId] && livekitUrl) {
    return (
      <div className="relative h-[600px] rounded-xl overflow-hidden">
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={tokenMap[activeSessionId]}
          connect
          data-lk-theme="default"
          className="h-full"
        >
          <VideoConference />
        </LiveKitRoom>
        <button
          onClick={() => setActiveSessionId(null)}
          className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
        >
          Leave
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Schedule Session'}
          </Button>
        </div>
      )}

      {showCreate && (
        <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-5 space-y-3">
          <h4 className="text-khoj-text font-semibold text-sm">New Session</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-khoj-subtle">Title</span>
              <input
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                placeholder="e.g. Weekly Standup"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-xs text-khoj-subtle">Type</span>
              <select
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                value={form.sessionType}
                onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value as any }))}
              >
                <option value="standup">Standup</option>
                <option value="voice">Voice</option>
                <option value="video">Video</option>
                <option value="pitch">Pitch Practice</option>
              </select>
            </label>
          </div>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <Button variant="primary" onClick={handleCreate} disabled={creating || !form.title}>
            {creating ? 'Scheduling…' : 'Start Now'}
          </Button>
        </div>
      )}

      {sessions.length === 0 && !showCreate ? (
        <EmptyState
          icon="🎙"
          title="No sessions yet"
          description={canManage ? 'Schedule a standup or live session for your team.' : 'No sessions scheduled.'}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 bg-[#0d0d16] border border-khoj-border rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-khoj-text text-sm font-medium">{s.title}</p>
                <p className="text-khoj-subtle text-xs capitalize mt-0.5">{s.sessionType}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  label={s.status}
                  variant={s.status === 'live' ? 'danger' : s.status === 'scheduled' ? 'info' : 'default'}
                />
                {(s.status === 'live' || s.status === 'scheduled') && myMember && (
                  <Button
                    variant="primary"
                    onClick={() => joinSession(s)}
                    disabled={tokenLoading === s.id}
                  >
                    {tokenLoading === s.id ? '…' : 'Join'}
                  </Button>
                )}
                {s.status === 'live' && canManage && (
                  <Button variant="danger" onClick={() => endSession(s)}>
                    End
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
