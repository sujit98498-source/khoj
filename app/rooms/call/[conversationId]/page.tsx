// app/rooms/call/[conversationId]/page.tsx
// Private 1:1 call room page — /rooms/call/[conversationId]?mode=voice|video&callId=xxx
//
// Route is protected by middleware (under /rooms/*).
// Both participants navigate here: caller immediately, receiver via Accept in IncomingCallBanner.

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { CallRoom } from '@/components/calls/CallRoom'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { getConversation } from '@/services/messageService'
import { getOtherParticipant } from '@/services/messageService'
import { updateCallStatus } from '@/services/callService'
import type { CallType } from '@/lib/types'

function CallPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  const conversationId =
    typeof params.conversationId === 'string'
      ? params.conversationId
      : Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : ''

  const mode = searchParams.get('mode') === 'video' ? 'video' : 'voice'
  const callId = searchParams.get('callId') ?? null

  const { khojUser, loading: authLoading } = useAuth()
  const myUid = khojUser?.uid ?? null

  const [otherName, setOtherName] = useState<string>('')
  const [resolving, setResolving] = useState(true)

  // Resolve the other participant's name from the conversation doc
  useEffect(() => {
    if (!conversationId || !myUid) return
    getConversation(conversationId)
      .then((convo) => {
        if (convo) {
          const other = getOtherParticipant(convo, myUid)
          setOtherName(other.name)
        }
      })
      .catch(() => {})
      .finally(() => setResolving(false))
  }, [conversationId, myUid])

  function handleHangUp() {
    if (callId) {
      updateCallStatus(callId, 'ended').catch(() => {})
    }
    // Navigate back to the conversation they were in
    router.replace(`/messages/${conversationId}`)
  }

  if (authLoading || resolving) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  return (
    <div className="fixed inset-0 bg-khoj-bg z-50 flex flex-col">
      <CallRoom
        conversationId={conversationId}
        callType={mode as CallType}
        callId={callId}
        myUid={khojUser.uid}
        myName={khojUser.name}
        otherName={otherName || 'User'}
        onHangUp={handleHangUp}
      />
    </div>
  )
}

export default function CallPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CallPageContent />
    </Suspense>
  )
}
