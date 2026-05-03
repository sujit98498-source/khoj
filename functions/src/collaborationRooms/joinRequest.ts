// functions/src/collaborationRooms/joinRequest.ts
// Callable functions for join requests and reviewing them.

import * as functions from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS as C, permissionsForRole, ProfileSnapshot } from './types'

// ── submitStartupJoinRequest ──────────────────────────────────────────────────
interface SubmitJoinRequestData {
  roomId: string
  roleId?: string | null
  requestType: 'cofounder' | 'member'
  message: string
  links?: string[]
  proofSnapshot?: {
    introVideoUrl?: string
    portfolioUrl?: string
    tracksCompleted?: number
    arenaProjects?: number
  }
}

export const submitStartupJoinRequest = functions
  .region('us-central1')
  .https.onCall(async (data: SubmitJoinRequestData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid, token: { name = '' } } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    const roomRef = db.doc(`${C.ROOMS}/${data.roomId}`)
    const roomSnap = await roomRef.get()
    if (!roomSnap.exists) throw new functions.https.HttpsError('not-found', 'Room not found')

    const room = roomSnap.data()!
    if (room.status !== 'active') throw new functions.https.HttpsError('failed-precondition', 'Room is not active')
    if (!room.isRecruiting) throw new functions.https.HttpsError('failed-precondition', 'Room is not recruiting')

    // Check not already a member
    const memberSnap = await roomRef.collection(C.MEMBERS).doc(uid).get()
    if (memberSnap.exists) throw new functions.https.HttpsError('already-exists', 'Already a member')

    // Check no duplicate pending request
    const dupSnap = await roomRef.collection(C.JOIN_REQUESTS)
      .where('userId', '==', uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
    if (!dupSnap.empty) throw new functions.https.HttpsError('already-exists', 'Pending request already exists')

    const batch = db.batch()
    const requestRef = roomRef.collection(C.JOIN_REQUESTS).doc()

    batch.set(requestRef, {
      userId:       uid,
      roleId:       data.roleId ?? null,
      requestType:  data.requestType,
      status:       'pending',
      message:      data.message,
      links:        data.links ?? [],
      proofSnapshot: data.proofSnapshot ?? null,
      userSnapshot:  { displayName: name },
      createdAt:    now,
      updatedAt:    now,
      respondedAt:  null,
      expiresAt:    null,
    })

    batch.update(roomRef, {
      pendingJoinRequestCount: FieldValue.increment(1),
      updatedAt: now,
    })

    await batch.commit()
    functions.logger.info('startup_join_request_submit', { roomId: data.roomId, uid })
    return { requestId: requestRef.id }
  })

// ── reviewStartupJoinRequest ──────────────────────────────────────────────────
interface ReviewJoinRequestData {
  roomId: string
  requestId: string
  action: 'accept' | 'decline'
  setTrial?: boolean
}

export const reviewStartupJoinRequest = functions
  .region('us-central1')
  .https.onCall(async (data: ReviewJoinRequestData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    // Verify reviewer is owner/cofounder with manageMembers permission
    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    if (!memberSnap.exists) throw new functions.https.HttpsError('permission-denied', 'Not a room member')
    const reviewer = memberSnap.data()!
    if (!reviewer.permissions?.manageMembers) {
      throw new functions.https.HttpsError('permission-denied', 'No permission to manage members')
    }

    const requestRef = db.doc(`${C.ROOMS}/${data.roomId}/${C.JOIN_REQUESTS}/${data.requestId}`)
    const requestSnap = await requestRef.get()
    if (!requestSnap.exists) throw new functions.https.HttpsError('not-found', 'Request not found')
    const request = requestSnap.data()!

    // Idempotent: already processed
    if (request.status !== 'pending') return { status: request.status }

    const batch = db.batch()
    batch.update(requestRef, {
      status: data.action === 'accept' ? 'accepted' : 'declined',
      respondedAt: now,
      updatedAt: now,
    })

    batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
      pendingJoinRequestCount: FieldValue.increment(-1),
      updatedAt: now,
    })

    if (data.action === 'accept') {
      const roomRole = request.requestType === 'cofounder' ? 'cofounder' : 'member'
      const memberRef = db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${request.userId}`)
      batch.set(memberRef, {
        userId:      request.userId,
        roomRole,
        status:      data.setTrial ? 'trial' : 'active',
        permissions: permissionsForRole(roomRole),
        joinedAt:    now,
        joinedVia:   'join_request',
        profileSnapshot: request.userSnapshot ?? {},
        trialEndsAt: data.setTrial
          ? new Date(Date.now() + 14 * 86_400_000)   // 14 days
          : null,
      })

      batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
        memberCount: FieldValue.increment(1),
      })

      if (request.roleId) {
        batch.update(db.doc(`${C.ROOMS}/${data.roomId}/${C.ROLES}/${request.roleId}`), {
          seatsFilled: FieldValue.increment(1),
          updatedAt: now,
        })
      }

      // User membership index
      const roomSnap = await db.doc(`${C.ROOMS}/${data.roomId}`).get()
      batch.set(db.doc(`${C.USERS}/${request.userId}/${C.ROOM_MEMBERSHIPS}/${data.roomId}`), {
        roomId: data.roomId,
        title: roomSnap.data()?.title ?? '',
        coverImageUrl: roomSnap.data()?.coverImageUrl ?? null,
        roomType: 'startup',
        roomRole,
        status: data.setTrial ? 'trial' : 'active',
        joinedAt: now,
      })
    }

    await batch.commit()
    functions.logger.info('startup_join_request_review', { roomId: data.roomId, uid, action: data.action })
    return { status: data.action === 'accept' ? 'accepted' : 'declined' }
  })

// ── withdrawStartupJoinRequest ────────────────────────────────────────────────
export const withdrawStartupJoinRequest = functions
  .region('us-central1')
  .https.onCall(async (data: { roomId: string; requestId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()

    const requestRef = db.doc(`${C.ROOMS}/${data.roomId}/${C.JOIN_REQUESTS}/${data.requestId}`)
    const snap = await requestRef.get()
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Request not found')
    if (snap.data()!.userId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your request')
    if (snap.data()!.status !== 'pending') return { status: snap.data()!.status }

    const batch = db.batch()
    batch.update(requestRef, { status: 'withdrawn', updatedAt: FieldValue.serverTimestamp() })
    batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
      pendingJoinRequestCount: FieldValue.increment(-1),
    })
    await batch.commit()
    return { status: 'withdrawn' }
  })
