// services/callService.ts
// Firestore CRUD for call records + incoming-call notifications.
// Room names equal conversationId — deterministic, one room per pair.

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { createNotification } from '@/services/notificationService'
import type { CallRecord, CallStatus, CallType } from '@/lib/types'

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

function docToCallRecord(id: string, data: Record<string, unknown>): CallRecord {
  return {
    id,
    conversationId: data.conversationId as string,
    roomName: data.roomName as string,
    callerId: data.callerId as string,
    callerName: data.callerName as string,
    receiverId: data.receiverId as string,
    type: data.type as CallType,
    status: data.status as CallStatus,
    createdAt: tsToISO(data.createdAt),
  }
}

/**
 * Create a new call record and send an incoming-call notification to the receiver.
 * Returns the generated callId.
 */
export async function startCall(
  conversationId: string,
  callerId: string,
  callerName: string,
  receiverId: string,
  type: CallType
): Promise<string> {
  const roomName = conversationId // room name == conversationId (deterministic)

  // Firestore rejects undefined values — ensure name is always a string
  const safeName = callerName || 'User'

  console.log('[callService] startCall →', { conversationId, callerId, safeName, receiverId, type })

  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.CALLS), {
    conversationId,
    roomName,
    callerId,
    callerName: safeName,
    receiverId,
    type,
    status: 'ringing' as CallStatus,
    createdAt: serverTimestamp(),
  })

  console.log('[callService] call doc created:', ref.id)

  // Notify the receiver so IncomingCallBanner can show accept/decline
  await createNotification({
    userId: receiverId,
    type: 'incoming_call',
    title: `Incoming ${type} call from ${callerName}`,
    message: `${callerName} is calling you`,
    actionUrl: `/rooms/call/${conversationId}?mode=${type}&callId=${ref.id}`,
    metadata: {
      callId: ref.id,
      conversationId,
      callerId,
      type,
    },
  }).catch(() => {})

  return ref.id
}

/**
 * Update the status of a call (active | ended | declined | missed).
 */
export async function updateCallStatus(
  callId: string,
  status: CallStatus
): Promise<void> {
  const ref = doc(requireFirestoreDb(), COLLECTIONS.CALLS, callId)
  await updateDoc(ref, { status }).catch((err) => {
    console.error('[callService] updateCallStatus failed:', callId, status, err)
  })
}

/**
 * Fetch a single call record.
 */
export async function getCallRecord(callId: string): Promise<CallRecord | null> {
  const snap = await getDoc(doc(requireFirestoreDb(), COLLECTIONS.CALLS, callId))
  if (!snap.exists()) return null
  return docToCallRecord(snap.id, snap.data() as Record<string, unknown>)
}

/**
 * Subscribe to incoming ringing calls for a user.
 * Calls the callback whenever a new call arrives with status === 'ringing'.
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingCalls(
  userId: string,
  onCall: (calls: CallRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.CALLS),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing')
  )
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map((d) =>
      docToCallRecord(d.id, d.data() as Record<string, unknown>)
    )
    onCall(calls)
  }, () => onCall([]))
}

/**
 * Subscribe to a single call document by ID.
 * Fires immediately with current data, then on every change.
 * Returns the unsubscribe function.
 */
export function subscribeToCallRecord(
  callId: string,
  onUpdate: (call: CallRecord | null) => void
): Unsubscribe {
  const ref = doc(requireFirestoreDb(), COLLECTIONS.CALLS, callId)
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { onUpdate(null); return }
    onUpdate(docToCallRecord(snap.id, snap.data() as Record<string, unknown>))
  }, () => onUpdate(null))
}
