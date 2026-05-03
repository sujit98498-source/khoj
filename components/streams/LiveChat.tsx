// components/streams/LiveChat.tsx
// Real-time Firestore-backed chat panel for a live stream.
// Uses onSnapshot for instant message delivery.

'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeMessages, sendMessage } from '@/services/streamService'
import { StreamMessage } from '@/lib/types'

interface LiveChatProps {
  streamId: string
  currentUserId: string
  currentUserName: string
  currentUserPhoto: string
  disabled?: boolean
}

export function LiveChat({
  streamId,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  disabled = false,
}: LiveChatProps) {
  const [messages, setMessages] = useState<StreamMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Subscribe to real-time messages
  useEffect(() => {
    const unsub = subscribeMessages(streamId, (msgs) => {
      setMessages(msgs)
    })
    return () => unsub()
  }, [streamId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await sendMessage(streamId, {
        userId: currentUserId,
        userName: currentUserName,
        userPhoto: currentUserPhoto,
        text: trimmed,
      })
    } catch {
      setText(trimmed) // restore on failure
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-khoj-card border-l border-khoj-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-khoj-border flex items-center gap-2 flex-shrink-0">
        <span className="text-khoj-accent text-sm">◈</span>
        <span className="text-khoj-text text-sm font-body font-semibold">Live Chat</span>
        {messages.length > 0 && (
          <span className="ml-auto text-[10px] text-khoj-subtle font-mono">
            {messages.length} msgs
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-khoj-subtle text-xs text-center pt-8 font-body">
            No messages yet. Say hello! 👋
          </p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} isOwn={msg.userId === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-khoj-border flex-shrink-0">
        {disabled ? (
          <p className="text-khoj-subtle text-xs text-center font-body py-1">
            Chat is disabled for this stream
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              maxLength={300}
              className="flex-1 bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-xs text-khoj-text placeholder-khoj-subtle/50 focus:outline-none focus:border-khoj-accent/60 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="bg-khoj-accent text-white text-xs font-body font-semibold px-3 py-2 rounded-sm hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatMessage({ msg, isOwn }: { msg: StreamMessage; isOwn: boolean }) {
  const initials = msg.userName.charAt(0).toUpperCase()

  return (
    <div className="flex items-start gap-2">
      {/* Avatar */}
      <div className="w-5 h-5 rounded-sm flex-shrink-0 bg-khoj-accent/20 border border-khoj-accent/20 flex items-center justify-center mt-0.5">
        {msg.userPhoto ? (
          <img src={msg.userPhoto} alt={msg.userName} className="w-full h-full object-cover rounded-sm" />
        ) : (
          <span className="text-[9px] font-display font-bold text-khoj-accent">{initials}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-[10px] font-body font-bold mr-1.5 ${isOwn ? 'text-khoj-accent' : 'text-khoj-gold'}`}>
          {msg.userName}
        </span>
        <span className="text-xs text-khoj-text font-body break-words">{msg.text}</span>
      </div>
    </div>
  )
}
