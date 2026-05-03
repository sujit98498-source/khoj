// components/messages/EmptyInboxState.tsx
// Shown when no conversation is selected on the right panel (desktop)
// or when the user has no messages yet.

'use client'

import Link from 'next/link'

interface EmptyInboxStateProps {
  hasConversations: boolean
}

export function EmptyInboxState({ hasConversations }: EmptyInboxStateProps) {
  if (!hasConversations) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-sm bg-khoj-accent/8 border border-khoj-accent/20 flex items-center justify-center">
          <span className="text-3xl text-khoj-accent">✉</span>
        </div>
        <div>
          <h2 className="text-base font-display font-bold text-khoj-text mb-1">
            No messages yet
          </h2>
          <p className="text-sm text-khoj-subtle font-body leading-relaxed max-w-xs">
            Start a conversation from the Recruiter dashboard or a user's profile page.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/recruiter"
            className="text-xs font-body font-semibold px-4 py-2.5 bg-khoj-accent text-white rounded-sm hover:bg-khoj-accent/90 transition-colors"
          >
            Browse Talent →
          </Link>
          <Link
            href="/talent"
            className="text-xs font-body px-4 py-2.5 border border-khoj-border text-khoj-subtle rounded-sm hover:border-khoj-text/30 hover:text-khoj-text transition-colors"
          >
            Talent Search
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 py-16 text-center">
      <span className="text-4xl text-khoj-muted">◈</span>
      <p className="text-sm text-khoj-subtle font-body">
        Select a conversation to start chatting.
      </p>
    </div>
  )
}
