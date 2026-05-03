// components/streams/GuestLayout.tsx
// Horizontal participant thumbnail strip — shown below the main video player.
// Displays host + guest avatar tiles with name, role badge, and action buttons.

'use client'

import { StreamParticipant } from '@/lib/types'

interface GuestLayoutProps {
  participants: StreamParticipant[]
  currentUserId: string
  hostId: string
  onRemoveGuest?: (userId: string) => void
  onFollow?: (targetUserId: string, targetUserName: string, targetUserPhoto: string) => void
  followingIds?: Set<string>
}

const VISIBLE_LIMIT = 5

export function GuestLayout({
  participants,
  currentUserId,
  hostId,
  onRemoveGuest,
  onFollow,
  followingIds = new Set(),
}: GuestLayoutProps) {
  if (participants.length === 0) return null

  // Sort: host first, then guests chronologically
  const sorted = [...participants].sort((a, b) => {
    if (a.role === 'host') return -1
    if (b.role === 'host') return 1
    return a.joinedAt > b.joinedAt ? 1 : -1
  })

  const visible = sorted.slice(0, VISIBLE_LIMIT)
  const overflow = sorted.length - VISIBLE_LIMIT
  const isHostUser = currentUserId === hostId

  return (
    <div className="bg-[#0d0e14] border border-zinc-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          Live — {sorted.length} {sorted.length === 1 ? 'participant' : 'participants'}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="flex items-start gap-3 overflow-x-auto pb-1">
        {visible.map((p) => {
          const isMe = p.userId === currentUserId
          const isHost = p.role === 'host'
          const initial = p.userName.charAt(0).toUpperCase()
          const isFollowing = followingIds.has(p.userId)

          return (
            <div
              key={p.userId}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] group"
            >
              {/* Avatar tile */}
              <div
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 ${
                  isHost ? 'border-[#ff5a00]' : 'border-zinc-700'
                }`}
              >
                {p.userPhoto ? (
                  <img
                    src={p.userPhoto}
                    alt={p.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-[#ff5a00] font-bold text-xl">{initial}</span>
                  </div>
                )}

                {/* "You" badge */}
                {isMe && (
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[7px] font-bold px-1 py-0.5 rounded-md leading-none">
                    You
                  </div>
                )}

                {/* Host remove button (visible on hover for host user, on guest tiles) */}
                {isHostUser && !isHost && !isMe && onRemoveGuest && (
                  <button
                    onClick={() => onRemoveGuest(p.userId)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600/80 hover:bg-red-500 text-white text-[10px] rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Remove ${p.userName}`}
                  >
                    ✕
                  </button>
                )}

                {/* Role badge at bottom */}
                <div
                  className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                    isHost
                      ? 'bg-[#ff5a00]/90 text-white'
                      : 'bg-black/70 text-zinc-300'
                  }`}
                >
                  {isHost ? 'Host' : 'Guest'}
                </div>
              </div>

              {/* Name */}
              <p className="text-zinc-300 text-[10px] truncate w-full text-center leading-tight">
                {p.userName}
              </p>

              {/* Follow button */}
              {!isMe && onFollow && (
                <button
                  onClick={() => onFollow(p.userId, p.userName, p.userPhoto)}
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                    isFollowing
                      ? 'text-[#ff5a00] border-[#ff5a00]/40 bg-[#ff5a00]/10'
                      : 'text-zinc-500 border-zinc-700 hover:text-[#ff5a00] hover:border-[#ff5a00]/40'
                  }`}
                >
                  {isFollowing ? '✓' : '+ Follow'}
                </button>
              )}
            </div>
          )
        })}

        {/* Overflow "+N View all" tile */}
        {overflow > 0 && (
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
              <span className="text-white font-bold text-base">+{overflow}</span>
            </div>
            <p className="text-zinc-500 text-[10px] text-center leading-tight">View all</p>
          </div>
        )}
      </div>
    </div>
  )
}
