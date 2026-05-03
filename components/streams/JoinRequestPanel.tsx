// components/streams/JoinRequestPanel.tsx
// Host-only panel showing incoming join requests with Accept / Decline buttons.
// Real-time via Firestore onSnapshot.

'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { JoinRequest } from '@/lib/types'
import {
  subscribeJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
} from '@/services/streamService'

interface JoinRequestPanelProps {
  streamId: string
}

export function JoinRequestPanel({ streamId }: JoinRequestPanelProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsub = subscribeJoinRequests(streamId, setRequests)
    return () => unsub()
  }, [streamId])

  // subscribeJoinRequests now filters to pending-only server-side
  const pending = requests

  async function handleAccept(req: JoinRequest) {
    if (processing.has(req.id)) return
    setProcessing((s) => new Set(s).add(req.id))
    try {
      await acceptJoinRequest(streamId, req)
      toast.success(`${req.userName} joined as guest`)
    } catch (e) {
      console.error('[JoinRequestPanel] accept error:', e)
      toast.error('Failed to accept request')
    } finally {
      setProcessing((s) => { const n = new Set(s); n.delete(req.id); return n })
    }
  }

  async function handleDecline(req: JoinRequest) {
    if (processing.has(req.id)) return
    setProcessing((s) => new Set(s).add(req.id))
    try {
      await declineJoinRequest(streamId, req.id)
      toast.success(`Declined ${req.userName}'s request`)
    } catch (e) {
      console.error('[JoinRequestPanel] decline error:', e)
      toast.error('Failed to decline request')
    } finally {
      setProcessing((s) => { const n = new Set(s); n.delete(req.id); return n })
    }
  }

  if (pending.length === 0) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-zinc-600 text-xs">No pending join requests</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#ff5a00] animate-pulse flex-shrink-0" />
        <span className="text-[#ff5a00] text-[10px] font-bold uppercase tracking-widest">
          Join Requests
        </span>
        <span className="ml-auto bg-[#ff5a00] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
          {pending.length}
        </span>
      </div>

      {/* Request cards */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
        {pending.map((req) => {
          const busy = processing.has(req.id)
          return (
            <div
              key={req.id}
              className="flex items-center gap-3 bg-[#13151d] border border-zinc-800 rounded-xl p-3"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                {req.userPhoto ? (
                  <img
                    src={req.userPhoto}
                    alt={req.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#ff5a00] font-bold text-sm">
                    {req.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + label */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{req.userName}</p>
                <p className="text-zinc-500 text-[10px] leading-tight">Request to join as participant</p>
              </div>

              {/* Accept / Decline */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  disabled={busy}
                  className="w-7 h-7 bg-green-600/80 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center"
                  title="Accept"
                >
                  {busy ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : '✓'}
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  disabled={busy}
                  className="w-7 h-7 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center"
                  title="Decline"
                >
                  {busy ? '…' : '✕'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
