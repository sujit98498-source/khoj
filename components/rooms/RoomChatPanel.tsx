'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { subscribeToRoomMessages, sendRoomMessage, RoomMessage } from '@/services/roomChatService'

interface RoomChatPanelProps {
  roomId: string
  currentUserId: string
  currentUserName: string
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Now'
  }
}

export default function RoomChatPanel({ roomId, currentUserId, currentUserName }: RoomChatPanelProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    return subscribeToRoomMessages(roomId, setMessages)
  }, [roomId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.trim()) return

    try {
      setSending(true)
      await sendRoomMessage({
        roomId,
        authorId: currentUserId,
        authorName: currentUserName,
        content: draft,
      })
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card p-5 space-y-4 shadow-[0_0_30px_rgba(255,77,0,0.05)]">
      <div className="flex items-start justify-between gap-3 border-b border-khoj-border pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
            Text Chat
          </p>
          <h2 className="mt-1 text-lg font-display font-bold text-khoj-text">Room conversation</h2>
        </div>
        <div className="rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 px-3 py-1 text-sm font-display font-bold text-khoj-accent">
          {messages.length}
        </div>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-sm border border-dashed border-khoj-border bg-khoj-bg px-4 py-6 text-sm text-khoj-subtle font-body text-center">
            No messages yet. Start the room conversation.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.authorId === currentUserId
            return (
              <div
                key={message.id}
                className={isMine ? 'flex justify-end' : 'flex justify-start'}
              >
                <div className={isMine ? 'max-w-[85%] rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 px-4 py-3' : 'max-w-[85%] rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3'}>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-khoj-accent/30 bg-khoj-accent/10 text-[10px] font-display font-bold text-khoj-accent">
                      {message.authorName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-body font-semibold text-khoj-text">
                      {message.authorName} {isMine && '• You'}
                    </p>
                    <span className="text-[10px] text-khoj-subtle">{formatTime(message.createdAt)}</span>
                  </div>
                  <p className="text-sm text-khoj-text font-body leading-6 whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-khoj-border pt-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Share an update, ask a question, or coordinate with the room..."
          className="w-full rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2.5 text-sm text-khoj-text outline-none focus:border-khoj-accent"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={sending} disabled={!draft.trim() || sending}>
            Send Message
          </Button>
        </div>
      </form>
    </div>
  )
}
