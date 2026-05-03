// components/messages/MessageComposer.tsx
// Text input + send button at the bottom of the chat window.
// Handles Enter-to-send (Shift+Enter for newline), empty guard, loading state,
// and optional typing-indicator callback with auto-stop after 3 s of inactivity.

'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import clsx from 'clsx'

interface MessageComposerProps {
  onSend: (text: string) => void | Promise<void>
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageComposer({
  onSend,
  onTyping,
  disabled = false,
  placeholder = 'Type a message…',
}: MessageComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    onTyping?.(false)
  }, [onTyping])

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    stopTyping()
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    try {
      await onSend(trimmed)
    } catch {
      setText(trimmed)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    // Auto-resize
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }
    // Typing indicator
    if (onTyping) {
      onTyping(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => onTyping(false), 3000)
    }
  }

  const canSend = !!text.trim() && !disabled

  return (
    <div className="flex items-end gap-2.5 px-4 py-3 border-t border-khoj-border bg-khoj-card/80 backdrop-blur-sm">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={stopTyping}
        disabled={disabled}
        placeholder={placeholder}
        className={clsx(
          'flex-1 resize-none bg-khoj-bg border border-khoj-border/60 rounded-2xl px-4 py-2.5',
          'text-sm font-body text-khoj-text placeholder:text-khoj-muted',
          'focus:outline-none focus:border-khoj-accent/50 focus:ring-1 focus:ring-khoj-accent/20 transition-all',
          'max-h-[120px] overflow-y-auto leading-relaxed',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        title="Send (Enter)"
        className={clsx(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
          canSend
            ? 'bg-khoj-accent text-white hover:bg-khoj-accent/90 shadow-[0_0_16px_rgba(255,77,0,0.35)] scale-100 hover:scale-105'
            : 'bg-khoj-border/30 text-khoj-muted cursor-not-allowed'
        )}
      >
        {/* Paper-plane send icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
