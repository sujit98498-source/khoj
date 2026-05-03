'use client'
// hooks/useFounderInbox.ts
// Founder inbox: pending join requests + pending invites + role applications + access requests for a room.

import { useEffect, useState } from 'react'
import {
  subscribeRoomJoinRequests,
  subscribeRoomInvites,
  subscribeRoleApplications,
  subscribeAccessRequests,
} from '@/lib/collaboration/roomQueries'
import type { JoinRequest, StartupInvite, FounderInboxCounts, RoleApplication, AccessRequest } from '@/types/collaboration'

export function useFounderInbox(roomId: string, enabled: boolean) {
  const [requests,       setRequests]       = useState<JoinRequest[]>([])
  const [invites,        setInvites]        = useState<StartupInvite[]>([])
  const [applications,   setApplications]   = useState<RoleApplication[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])

  useEffect(() => {
    if (!roomId || !enabled) return
    const unsub1 = subscribeRoomJoinRequests(roomId, setRequests)
    const unsub2 = subscribeRoomInvites(roomId, setInvites)
    const unsub3 = subscribeRoleApplications(roomId, setApplications)
    const unsub4 = subscribeAccessRequests(roomId, setAccessRequests)
    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
  }, [roomId, enabled])

  const pendingApplications      = applications.filter((a) => a.status === 'pending')
  const pendingAccessRequests    = accessRequests.filter((r) => r.status === 'pending')

  const counts: FounderInboxCounts = {
    pendingRequests:       requests.length + pendingApplications.length,
    pendingInvites:        invites.length,
    pendingAccessRequests: pendingAccessRequests.length,
    total:                 requests.length + pendingApplications.length + invites.length + pendingAccessRequests.length,
  }

  return { requests, invites, applications, accessRequests, counts }
}
