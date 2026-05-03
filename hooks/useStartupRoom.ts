'use client'
// hooks/useStartupRoom.ts
// Single startup room detail + member check + roles + sessions.

import { useEffect, useMemo, useState, startTransition } from 'react'
import {
  subscribeCollabRoom,
  subscribeRoomMembers,
  subscribeStartupRoles,
  subscribeMilestones,
  subscribeMyRoleApplications,
  subscribeMyAccess,
} from '@/lib/collaboration/roomQueries'
import type {
  CollabRoom,
  RoomMember,
  StartupRole,
  Milestone,
  RoleApplication,
  RoomAccess,
} from '@/types/collaboration'

export function useStartupRoom(
  roomId: string,
  currentUserId: string | null | undefined,
  /** Pass the already-fetched room to skip the loading skeleton entirely. */
  initialRoom?: CollabRoom,
) {
  // Lazy init from prop so the skeleton never flashes when we already have the room
  const [room,           setRoom]           = useState<CollabRoom | null | undefined>(() => initialRoom ?? undefined)
  const [members,        setMembers]        = useState<RoomMember[]>([])
  const [roles,          setRoles]          = useState<StartupRole[]>([])
  const [milestones,     setMilestones]     = useState<Milestone[]>([])
  const [myApplications, setMyApplications] = useState<RoleApplication[]>([])
  const [myAccess,        setMyAccess]        = useState<RoomAccess | null>(null)
  const [membersLoaded,  setMembersLoaded]  = useState(false)
  const [loading,        setLoading]        = useState(!initialRoom)

  useEffect(() => {
    if (!roomId) return
    // Reset secondary state on roomId change
    setMembers([])
    setRoles([])
    setMilestones([])
    setMembersLoaded(false)
    if (!initialRoom) setLoading(true)

    const unsubs: Array<() => void> = []

    // Room subscription — marks loading done
    unsubs.push(subscribeCollabRoom(roomId, (r) => {
      setRoom(r)
      setLoading(false)
    }))

    // Members — derive myMember here; use startTransition so it doesn't block the main render
    unsubs.push(subscribeRoomMembers(roomId, (m) => {
      startTransition(() => {
        setMembers(m)
        setMembersLoaded(true)
      })
    }))

    // Roles + milestones are non-critical — defer rendering with startTransition
    unsubs.push(subscribeStartupRoles(roomId,  (r) => startTransition(() => setRoles(r))))
    unsubs.push(subscribeMilestones(roomId,    (m) => startTransition(() => setMilestones(m))))

    // My role applications (only when logged in)
    if (currentUserId) {
      unsubs.push(subscribeMyRoleApplications(roomId, currentUserId, (a) => startTransition(() => setMyApplications(a))))
      unsubs.push(subscribeMyAccess(roomId, currentUserId, (a) => startTransition(() => setMyAccess(a))))
    }

    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Derive myMember from the members list — eliminates a separate getDoc round-trip
  const myMember = useMemo<RoomMember | null | undefined>(() => {
    if (!currentUserId) return null
    if (!membersLoaded) return undefined   // still waiting for first snapshot
    return members.find((m) => m.userId === currentUserId) ?? null
  }, [members, currentUserId, membersLoaded])

  const isMember  = !!myMember && myMember.status !== 'inactive'
  const isOwner   = myMember?.roomRole === 'owner'
  const isFounder = isOwner || myMember?.roomRole === 'cofounder'
  const canManage = isFounder && !!myMember?.permissions?.manageMembers

  return { room, members, roles, milestones, myMember, myApplications, myAccess, loading, isMember, isOwner, isFounder, canManage }
}
