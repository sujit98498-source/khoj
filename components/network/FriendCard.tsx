// components/network/FriendCard.tsx
// Card showing an established connection with quick Message + View Profile actions.

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { buildConversationId, getOrCreateConversation } from '@/services/messageService'
import { removeFriend } from '@/services/friendRequestService'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import type { Friendship } from '@/lib/types'

interface Props {
  friendship: Friendship
  myUid: string
  onRemove: (friendshipId: string) => void
}

export function FriendCard({ friendship, myUid, onRemove }: Props) {
  const router = useRouter()
  const { khojUser } = useAuth()
  const [messageBusy, setMessageBusy] = useState(false)

  const theirUid = friendship.userIds.find((id) => id !== myUid) ?? ''
  const theirName = friendship.userNames[theirUid] ?? 'Unknown'
  const theirAvatar = friendship.userAvatars[theirUid]
  const theirUsername = friendship.userUsernames[theirUid]
  const initials = theirName.charAt(0).toUpperCase()

  async function handleMessage() {
    if (!khojUser) { router.push('/auth/login'); return }
    if (messageBusy) return
    setMessageBusy(true)
    try {
      // Pre-create the conversation with full participant data (including avatar
      // and username that we already have from the Friendship document).
      // This ensures getOrCreateConversation's Firestore document has rich info
      // AND that the conversation appears immediately in the conversation list.
      await getOrCreateConversation(
        {
          uid: myUid,
          name: khojUser.name,
          avatarUrl: khojUser.avatarUrl,
          username: khojUser.username,
        },
        {
          uid: theirUid,
          name: theirName,
          avatarUrl: theirAvatar,
          username: theirUsername,
        }
      )
    } catch {
      // Proceed anyway — the conversation page can create the doc on arrival
    } finally {
      setMessageBusy(false)
    }
    const convoId = buildConversationId(myUid, theirUid)
    router.push(`/messages/${convoId}`)
  }

  async function handleRemove() {
    try {
      await removeFriend(myUid, theirUid)
      onRemove(friendship.id)
      toast.success(`Removed ${theirName} from connections`)
    } catch {
      toast.error('Failed to remove connection')
    }
  }

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm p-4 flex items-center gap-4 hover:border-khoj-accent/20 transition-colors">
      {/* Avatar */}
      <Link href={`/profile/${theirUid}`} className="flex-shrink-0">
        {theirAvatar ? (
          <img
            src={theirAvatar}
            alt={theirName}
            className="w-10 h-10 rounded-sm object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-sm bg-khoj-accent/20 border border-khoj-accent/30 flex items-center justify-center">
            <span className="text-khoj-accent font-display font-bold text-sm">{initials}</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${theirUid}`}
          className="text-sm font-display font-semibold text-khoj-text hover:text-khoj-accent transition-colors"
        >
          {theirName}
        </Link>
        {theirUsername && (
          <p className="text-[10px] font-body text-khoj-muted">@{theirUsername}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleMessage}
          disabled={messageBusy}
          className={clsx(
            'text-[10px] font-body font-semibold px-3 py-1.5 rounded-sm transition-colors',
            messageBusy
              ? 'bg-khoj-muted/10 text-khoj-muted cursor-wait'
              : 'bg-khoj-accent/10 border border-khoj-accent/30 text-khoj-accent hover:bg-khoj-accent/20'
          )}
        >
          {messageBusy ? '…' : '✉ Message'}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1.5 rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
          title="Remove connection"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
