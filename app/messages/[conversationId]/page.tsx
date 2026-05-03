// app/messages/[conversationId]/page.tsx
// Chat thread page — /messages/[conversationId]
// Desktop: two-panel (conversation list left, chat right)
// Mobile: full-screen chat with back button
//
// Resolution order for a conversation:
//   1. Fast-path: read the Firestore doc (pre-created by FriendCard / profile page)
//      1a. If the doc has participants: [], enrich from users/{otherUid} and patch Firestore.
//   2. If the doc is missing (e.g. direct URL visit), parse the UIDs from the
//      deterministic conversationId and call getOrCreateConversation.
//   3. If the other user can't be found, build a minimal placeholder conversation
//      so the composer is ALWAYS shown — never show an empty error state.

'use client'

import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConversations, useChatMessages, useTypingStatus, useUserPresence } from '@/hooks/useMessages'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatWindow } from '@/components/messages/ChatWindow'
import { MessageComposer } from '@/components/messages/MessageComposer'
import {
  getOrCreateConversation,
  getConversation,
  sendMessage,
  setTyping,
  updatePresence,
} from '@/services/messageService'
import { getUserById } from '@/services/userService'
import { createNotification } from '@/services/notificationService'
import { doc, updateDoc } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { Conversation } from '@/lib/types'

/**
 * Parse the two UIDs from a deterministic conversation ID.
 * Format: conv_<uid1>_<uid2>  (Firebase UIDs are alphanumeric — no underscores)
 * Uses the last underscore as the separator (greedy regex backtrack).
 */
function parseUidsFromConversationId(id: string): [string, string] | null {
  const match = id.match(/^conv_(.+)_([^_]+)$/)
  if (!match) return null
  return [match[1], match[2]]
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId =
    typeof params.conversationId === 'string'
      ? params.conversationId
      : Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : ''

  const { khojUser, loading: authLoading } = useAuth()
  const myUid = khojUser?.uid ?? null

  const { conversations, loading: convosLoading } = useConversations(myUid)
  const { messages } = useChatMessages(conversationId, myUid)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [convoLoading, setConvoLoading] = useState(true)
  const initDone = useRef(false)

  // Derive the other participant's UID once the conversation is resolved
  const otherUid = conversation?.participantIds.find((id) => id !== myUid) ?? null

  // Real-time typing + online presence for the other participant
  const isOtherTyping = useTypingStatus(conversationId, otherUid)
  const isOtherOnline = useUserPresence(otherUid)

  // Bump presence on mount and every 60 seconds while the page is open
  useEffect(() => {
    if (!myUid) return
    updatePresence(myUid)
    const interval = setInterval(() => updatePresence(myUid), 60_000)
    return () => clearInterval(interval)
  }, [myUid])

  // Typing callback — debounced in MessageComposer; we just relay to Firestore
  const handleTyping = useCallback((isTyping: boolean) => {
    if (!myUid || !conversationId) return
    setTyping(conversationId, myUid, isTyping).catch(() => {})
  }, [myUid, conversationId])

  // Resolve (or create) the conversation once we know who the current user is.
  useEffect(() => {
    if (!conversationId || !khojUser || initDone.current) return
    initDone.current = true

    async function resolveConversation() {
      setConvoLoading(true)
      try {
        // ── Fast path: conversation already exists in Firestore ────────────
        // (The Firestore rule now allows read on non-existent docs, so this
        //  returns null instead of throwing when the doc doesn't exist yet.)
        const existing = await getConversation(conversationId)
        if (existing) {
          const otherUid = existing.participantIds.find(id => id !== khojUser!.uid) ?? ''

          // Check if the other participant's name is valid.
          // A name is INVALID if it is: missing, empty, "Unknown User", or starts
          // with "User (" (the uid-prefix fallback from a previous partial repair).
          const otherParticipant = existing.participants.find(p => p.uid !== khojUser!.uid)
          const isNameValid = (name?: string) =>
            !!name && name !== 'Unknown User' && !name.startsWith('User (')
          const hasValidOtherUser = isNameValid(otherParticipant?.name)

          console.log('[KHOJ] resolveConversation fast-path:', {
            conversationId,
            participantIds: existing.participantIds,
            currentUserId: khojUser!.uid,
            otherUid,
            storedOtherParticipant: otherParticipant,
            hasValidOtherUser,
          })

          if (!hasValidOtherUser && otherUid) {
            const otherUser = await getUserById(otherUid).catch(() => null)

            // Build robust participant objects using every available name field
            const resolveName = (
              user: (typeof otherUser) & { displayName?: string } | null,
              fallbackUid: string
            ) =>
              (user as any)?.name ||
              (user as any)?.username ||
              (user as any)?.displayName ||
              `User (${fallbackUid.slice(0, 8)})`

            const resolveAvatar = (user: typeof otherUser) =>
              (user as any)?.avatarUrl || (user as any)?.photoURL || undefined

            console.log('[KHOJ] fetched other user for enrichment:', {
              otherUid,
              otherUser,
            })

            const enrichedParticipants = [
              {
                uid: khojUser!.uid,
                name: khojUser!.name || khojUser!.username || khojUser!.uid.slice(0, 8),
                avatarUrl: khojUser!.avatarUrl,
                username: khojUser!.username ?? '',
              },
              {
                uid: otherUid,
                name: resolveName(otherUser, otherUid),
                avatarUrl: resolveAvatar(otherUser),
                username: (otherUser as any)?.username ?? '',
              },
            ]
            const enriched = { ...existing, participants: enrichedParticipants }
            setConversation(enriched)
            // Persist back to Firestore so the conversation list also shows the
            // correct name without waiting for the background useConversations repair
            updateDoc(doc(requireFirestoreDb(), COLLECTIONS.CONVERSATIONS, conversationId), {
              participants: enrichedParticipants,
            }).catch(() => {})
            return
          }
          setConversation(existing)
          return
        }

        // ── Slow path: doc doesn't exist yet ─────────────────────────────
        const uids = parseUidsFromConversationId(conversationId)
        if (!uids) return  // malformed ID — show error state

        const [uid1, uid2] = uids
        const otherUid = uid1 === khojUser!.uid ? uid2 : uid1

        // Try to look up the other user for rich participant data
        const otherUser = await getUserById(otherUid).catch(() => null)

        const created = await getOrCreateConversation(
          {
            uid: khojUser!.uid,
            name: khojUser!.name,
            avatarUrl: khojUser!.avatarUrl,
            username: khojUser!.username,
          },
          {
            uid: otherUid,
            name: otherUser?.name ?? otherUid.slice(0, 8),  // fallback: truncated UID
            avatarUrl: otherUser?.avatarUrl,
            username: otherUser?.username,
          }
        )
        setConversation(created)
      } catch (err) {
        console.error('[KHOJ] resolveConversation error:', err)
        // Even on error, try to build a placeholder so the composer is visible
        const uids = parseUidsFromConversationId(conversationId)
        if (uids) {
          const otherUid = uids[0] === khojUser!.uid ? uids[1] : uids[0]
          setConversation({
            id: conversationId,
            participants: [
              { uid: khojUser!.uid, name: khojUser!.name },
              { uid: otherUid, name: 'Unknown User' },
            ],
            participantIds: [khojUser!.uid, otherUid],
            createdAt: new Date().toISOString(),
            unreadCount: {},
          })
        }
      } finally {
        setConvoLoading(false)
      }
    }

    resolveConversation()
  }, [conversationId, khojUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // When the onSnapshot listener updates the conversations list, refresh the
  // local conversation object so the header/last-message info stays current.
  useEffect(() => {
    if (!conversationId || !initDone.current) return
    getConversation(conversationId)
      .then((updated) => { if (updated) setConversation(updated) })
      .catch(() => {})
  }, [conversations, conversationId])

  async function handleSend(text: string) {
    if (!myUid || !conversationId) return
    try {
      await sendMessage(conversationId, myUid, text)
      // onSnapshot in useChatMessages will auto-refresh messages

      // Fire-and-forget notification to the recipient
      if (conversation) {
        const recipientId = conversation.participantIds.find((id) => id !== myUid)
        if (recipientId) {
          createNotification({
            userId: recipientId,
            type: 'message',
            title: `New message from ${khojUser!.name}`,
            message: text.length > 60 ? text.slice(0, 60) + '…' : text,
            actionUrl: `/messages/${conversationId}`,
            metadata: { conversationId, senderId: myUid },
          }).catch((err) => console.warn('[handleSend] notification failed:', err))
        }
      }

      getConversation(conversationId)
        .then((updated) => { if (updated) setConversation(updated) })
        .catch(() => {})
    } catch (err) {
      console.error('[KHOJ] sendMessage error:', err)
      const isPermission =
        err instanceof Error &&
        (err.message.includes('permission') || err.message.includes('insufficient'))
      toast.error(
        isPermission
          ? 'Permission denied. Please sign out and sign back in, then try again.'
          : 'Could not send message. Please try again.'
      )
      throw err  // re-throw so MessageComposer can restore the input
    }
  }

  if (authLoading) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  return (
    <AppShell>
      {/* Full-height two-panel layout */}
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-khoj-bg -mx-4 sm:-mx-6 -mt-6">

        {/* ── Back bar (mobile only) ── */}
        <div className="md:hidden border-b border-khoj-border bg-khoj-card/40 px-4 py-3 flex-shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/messages')}
            className="text-khoj-subtle hover:text-khoj-text transition-colors text-sm"
          >
            ←
          </button>
          <h1 className="text-sm font-display font-bold text-khoj-text">Messages</h1>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* ── Left: conversation list (desktop only) ── */}
          <div className="hidden md:flex md:flex-col md:w-80 md:flex-shrink-0 md:border-r md:border-khoj-border">
            <div className="px-4 py-3 border-b border-khoj-border flex-shrink-0">
              <h2 className="text-xs font-display font-semibold text-khoj-text">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <ConversationList
                conversations={conversations}
                myUid={khojUser.uid}
                activeConversationId={conversationId}
                loading={convosLoading}
              />
            </div>
          </div>

          {/* ── Right: chat panel ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {convoLoading ? (
              <div className="flex items-center justify-center h-full">
                <PageLoader />
              </div>
            ) : !conversation ? (
              /* Conversation could not be resolved — invalid or deleted */
              <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                <span className="text-4xl text-khoj-muted">✉</span>
                <p className="text-sm font-body text-khoj-subtle">
                  Could not open this conversation.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/messages')}
                  className="text-xs font-body text-khoj-accent underline hover:no-underline"
                >
                  Back to Messages
                </button>
              </div>
            ) : (
              <>
                {/* Chat window (scrollable messages) */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatWindow
                    conversation={conversation}
                    messages={messages}
                    myUid={khojUser.uid}
                    isOtherTyping={isOtherTyping}
                    isOtherOnline={isOtherOnline}
                    onBack={() => router.push('/messages')}
                  />
                </div>

                {/* Composer — always visible once loading is done */}
                <div className="flex-shrink-0">
                  <MessageComposer onSend={handleSend} onTyping={handleTyping} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
