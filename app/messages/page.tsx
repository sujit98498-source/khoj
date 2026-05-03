// app/messages/page.tsx
// Inbox page — /messages
// Desktop: two-panel layout (conversation list left, empty state right)
// Mobile: full-width conversation list only
//
// useSearchParams() must live inside a component wrapped by <Suspense>.
// MessagesContent contains all the logic; the default export provides the boundary.

'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConversations } from '@/hooks/useMessages'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ConversationList } from '@/components/messages/ConversationList'
import { EmptyInboxState } from '@/components/messages/EmptyInboxState'
import {
  buildConversationId,
} from '@/services/messageService'

// ── Inner component — allowed to call useSearchParams() ──────────────────────

function MessagesContent() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const myUid = khojUser?.uid ?? null
  const { conversations, unreadTotal, reload, loading: convosLoading } = useConversations(myUid)

  // Auto-open or create conversation when arriving with ?to=uid&name=Name
  useEffect(() => {
    const toUid = searchParams.get('to')

    if (!toUid || !khojUser) return

    // Use deterministic ID to navigate immediately; Firestore doc is created
    // lazily when the conversation page first loads.
    const convoId = buildConversationId(khojUser.uid, toUid)
    router.replace(`/messages/${convoId}`)
  }, [searchParams, khojUser]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-khoj-bg -mx-4 sm:-mx-6 -mt-6">
        {/* ── Inbox header ── */}
        <div className="border-b border-khoj-border bg-khoj-card/40 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-display font-bold text-khoj-text tracking-tight">
                Messages
              </h1>
              {unreadTotal > 0 && (
                <p className="text-[10px] text-khoj-accent font-body mt-0.5">
                  {unreadTotal} unread
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">
          {/* Left: conversation list */}
          <div className="w-full md:w-80 md:border-r md:border-khoj-border flex-shrink-0 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              myUid={khojUser.uid}
              loading={convosLoading}
            />
          </div>

          {/* Right: empty state (desktop only) */}
          <div className="hidden md:flex flex-1 bg-khoj-bg">
            <EmptyInboxState hasConversations={conversations.length > 0} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Default export — provides the required Suspense boundary ─────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MessagesContent />
    </Suspense>
  )
}
