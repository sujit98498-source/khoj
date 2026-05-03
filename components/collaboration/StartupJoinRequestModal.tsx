'use client'
// components/collaboration/StartupJoinRequestModal.tsx

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { submitJoinRequest } from '@/lib/collaboration/roomMutations'
import type { CollabRoom, StartupRole, ProfileSnapshot } from '@/types/collaboration'

interface Props {
  room: CollabRoom
  role: StartupRole | null
  userSnapshot: ProfileSnapshot & { uid: string }
  onClose: () => void
  onSuccess?: () => void
}

export function StartupJoinRequestModal({ room, role, userSnapshot, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState('')
  const [links, setLinks] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setErr(null)
    try {
      await submitJoinRequest(userSnapshot.uid, {
        displayName: userSnapshot.displayName,
        avatarUrl: userSnapshot.avatarUrl,
        headline: userSnapshot.headline,
      }, {
        roomId: room.id,
        roleId: role?.id ?? null,
        requestType: role?.roleType === 'cofounder' ? 'cofounder' : 'member',
        message,
        links: links.split('\n').map((l) => l.trim()).filter(Boolean),
      })
      onSuccess?.()
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-khoj-card border border-khoj-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-center justify-between">
          <div>
            <h2 className="text-khoj-text font-bold text-lg">Request to Join</h2>
            <p className="text-khoj-subtle text-sm mt-0.5">
              {role ? `Role: ${role.title}` : room.title}
            </p>
          </div>
          <button onClick={onClose} className="text-khoj-subtle hover:text-khoj-text transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs text-khoj-subtle uppercase tracking-wide">Why do you want to join? *</span>
            <textarea
              rows={4}
              className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
              placeholder="Share what you bring to the table and why this opportunity excites you…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={800}
            />
            <span className="text-[10px] text-khoj-subtle">{message.length}/800</span>
          </label>
          <label className="block">
            <span className="text-xs text-khoj-subtle uppercase tracking-wide">
              Links (one per line — portfolio, GitHub, etc.)
            </span>
            <textarea
              rows={2}
              className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
              placeholder="https://github.com/you&#10;https://yourproject.com"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
            />
          </label>
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-khoj-border flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || message.trim().length < 20}
          >
            {loading ? 'Submitting…' : 'Send Request'}
          </Button>
        </div>
      </div>
    </div>
  )
}
