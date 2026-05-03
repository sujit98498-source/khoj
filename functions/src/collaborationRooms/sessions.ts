// functions/src/collaborationRooms/sessions.ts
// Callable functions for creating, joining, and ending startup live sessions.

import * as functions from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS as C } from './types'
import { AccessToken } from 'livekit-server-sdk'

// ── createStartupSession ──────────────────────────────────────────────────────
interface CreateSessionData {
  roomId: string
  title: string
  sessionType: 'voice' | 'video' | 'pitch' | 'standup'
  startsAt?: string | null
}

export const createStartupSession = functions
  .region('us-central1')
  .https.onCall(async (data: CreateSessionData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    if (!memberSnap.exists) throw new functions.https.HttpsError('permission-denied', 'Not a member')

    const sessionRef = db.collection(`${C.ROOMS}/${data.roomId}/${C.SESSIONS}`).doc()
    const sessionId = sessionRef.id
    const liveKitRoomName = `startup_${data.roomId}_${sessionId}`.slice(0, 64)

    const batch = db.batch()
    batch.set(sessionRef, {
      title:            data.title,
      sessionType:      data.sessionType,
      status:           'scheduled',
      createdBy:        uid,
      liveKitRoomName,
      startsAt:         data.startsAt ? new Date(data.startsAt) : null,
      endedAt:          null,
      participantCount: 0,
      createdAt:        now,
    })
    batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
      currentLiveSessionId: sessionId,
      lastActivityAt: now,
      updatedAt: now,
    })

    await batch.commit()
    functions.logger.info('startup_session_start', { roomId: data.roomId, sessionId, uid })
    return { sessionId, liveKitRoomName }
  })

// ── getStartupSessionToken ────────────────────────────────────────────────────
export const getStartupSessionToken = functions
  .region('us-central1')
  .https.onCall(async (data: { roomId: string; sessionId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid, token: { name = 'User' } } = context.auth
    const db = getFirestore()

    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    if (!memberSnap.exists) throw new functions.https.HttpsError('permission-denied', 'Not a room member')

    const sessionSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.SESSIONS}/${data.sessionId}`).get()
    if (!sessionSnap.exists) throw new functions.https.HttpsError('not-found', 'Session not found')

    const session = sessionSnap.data()!
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      throw new functions.https.HttpsError('internal', 'LiveKit credentials not configured')
    }

    const token = new AccessToken(apiKey, apiSecret, { identity: uid, name })
    token.addGrant({
      room: session.liveKitRoomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    })

    functions.logger.info('startup_session_join', { roomId: data.roomId, sessionId: data.sessionId, uid })
    return { token: await token.toJwt(), url: process.env.NEXT_PUBLIC_LIVEKIT_URL }
  })

// ── endStartupSession ─────────────────────────────────────────────────────────
export const endStartupSession = functions
  .region('us-central1')
  .https.onCall(async (data: { roomId: string; sessionId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    const member = memberSnap.data()
    if (!memberSnap.exists || !member?.permissions?.manageSessions) {
      throw new functions.https.HttpsError('permission-denied', 'No permission to end session')
    }

    const batch = db.batch()
    batch.update(db.doc(`${C.ROOMS}/${data.roomId}/${C.SESSIONS}/${data.sessionId}`), {
      status: 'ended', endedAt: now,
    })
    batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
      currentLiveSessionId: null, updatedAt: now,
    })
    await batch.commit()
    return { status: 'ended' }
  })
