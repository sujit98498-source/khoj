// apps/mobile/hooks/useCallSession.ts
// Stage 2 + 3 — manages LiveKit call sessions stored in Firestore.
// Caller creates a callSession doc; callee watches for incoming sessions.

import { useEffect, useState, useCallback } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { fetchCallToken, callRoomName } from '@/lib/livekit'
import { startRingtone, stopRingtone } from '@/lib/soundManager'

export type CallStatus = 'ringing' | 'active' | 'ended' | 'rejected' | 'missed'

export interface CallSession {
  id:              string
  callerId:        string
  callerName:      string
  callerAvatarUrl?: string
  calleeId:        string
  calleeName:      string
  conversationId:  string
  roomName:        string
  type:            'voice' | 'video'
  status:          CallStatus
  startedAt:       Timestamp | null
  endedAt?:        Timestamp | null
  duration?:       number
}

/** Watches for incoming calls for `uid`. Returns the ringing session (if any). */
export function useIncomingCall(uid: string | null) {
  const [incoming, setIncoming] = useState<CallSession | null>(null)

  useEffect(() => {
    if (!uid) return

    const q = query(
      collection(db, COLLECTIONS.CALL_SESSIONS),
      where('calleeId', '==', uid),
      where('status', '==', 'ringing'),
    )

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        stopRingtone()
        setIncoming(null)
      } else {
        const session = { id: snap.docs[0].id, ...snap.docs[0].data() } as CallSession
        setIncoming(session)
        startRingtone()
      }
    })

    return () => { unsub(); stopRingtone() }
  }, [uid])

  return incoming
}

/** Initiates an outgoing call to another gamer. Returns { sessionId, token, url }. */
export async function initiateCall(params: {
  callerId:        string
  callerName:      string
  callerAvatarUrl?: string
  calleeId:        string
  calleeName:      string
  conversationId:  string
  callType:        'voice' | 'video'
  idToken:         string
}): Promise<{ sessionId: string; token: string; url: string }> {
  const room = callRoomName(params.conversationId)

  const sessionRef = await addDoc(collection(db, COLLECTIONS.CALL_SESSIONS), {
    callerId:        params.callerId,
    callerName:      params.callerName,
    callerAvatarUrl: params.callerAvatarUrl ?? null,
    calleeId:        params.calleeId,
    calleeName:      params.calleeName,
    conversationId:  params.conversationId,
    roomName:        room,
    type:            params.callType,
    status:          'ringing',
    startedAt:       serverTimestamp(),
  })

  const { token, url } = await fetchCallToken({
    roomName:  room,
    userId:    params.callerId,
    userName:  params.callerName,
    idToken:   params.idToken,
    callType:  params.callType,
  })

  return { sessionId: sessionRef.id, token, url }
}

/** Accept an incoming call — updates status and returns the LiveKit token. */
export async function acceptCall(params: {
  session:   CallSession
  uid:       string
  name:      string
  idToken:   string
}): Promise<{ token: string; url: string }> {
  await stopRingtone()
  await updateDoc(doc(db, COLLECTIONS.CALL_SESSIONS, params.session.id), {
    status: 'active',
  })
  return fetchCallToken({
    roomName:  params.session.roomName,
    userId:    params.uid,
    userName:  params.name,
    idToken:   params.idToken,
    callType:  params.session.type,
  })
}

/** Reject an incoming call. */
export async function rejectCall(sessionId: string): Promise<void> {
  await stopRingtone()
  await updateDoc(doc(db, COLLECTIONS.CALL_SESSIONS, sessionId), {
    status:  'rejected',
    endedAt: serverTimestamp(),
  })
}

/** End an active call and record duration. */
export async function endCall(sessionId: string, durationSeconds: number): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.CALL_SESSIONS, sessionId), {
    status:   'ended',
    endedAt:  serverTimestamp(),
    duration: durationSeconds,
  })
}
