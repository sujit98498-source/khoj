// functions/src/collaborationRooms/triggers.ts
// Firestore triggers for summary denormalization.
// All triggers are idempotent — safe to replay.

import * as functions from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS as C } from './types'

const db = () => getFirestore()

// ── onMemberWriteSyncRoomSummary ──────────────────────────────────────────────
// Keeps rooms/{roomId}.memberCount accurate.
export const onMemberWriteSyncRoomSummary = functions
  .region('us-central1')
  .firestore.document(`${C.ROOMS}/{roomId}/${C.MEMBERS}/{userId}`)
  .onWrite(async (change, ctx) => {
    const { roomId } = ctx.params
    const before = change.before.data()
    const after  = change.after.data()

    // Recount active+trial members
    const snap = await db()
      .collection(`${C.ROOMS}/${roomId}/${C.MEMBERS}`)
      .where('status', 'in', ['active', 'trial'])
      .count()
      .get()

    await db().doc(`${C.ROOMS}/${roomId}`).update({
      memberCount: snap.data().count,
      lastActivityAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

// ── onRoleWriteSyncOpenRoleCount ──────────────────────────────────────────────
export const onRoleWriteSyncOpenRoleCount = functions
  .region('us-central1')
  .firestore.document(`${C.ROOMS}/{roomId}/${C.ROLES}/{roleId}`)
  .onWrite(async (change, ctx) => {
    const { roomId } = ctx.params

    const snap = await db()
      .collection(`${C.ROOMS}/${roomId}/${C.ROLES}`)
      .where('status', '==', 'open')
      .count()
      .get()

    await db().doc(`${C.ROOMS}/${roomId}`).update({
      openRoleCount: snap.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

// ── onJoinRequestWriteSyncPendingCount ────────────────────────────────────────
export const onJoinRequestWriteSyncPendingCount = functions
  .region('us-central1')
  .firestore.document(`${C.ROOMS}/{roomId}/${C.JOIN_REQUESTS}/{requestId}`)
  .onWrite(async (change, ctx) => {
    const { roomId } = ctx.params

    const snap = await db()
      .collection(`${C.ROOMS}/${roomId}/${C.JOIN_REQUESTS}`)
      .where('status', '==', 'pending')
      .count()
      .get()

    await db().doc(`${C.ROOMS}/${roomId}`).update({
      pendingJoinRequestCount: snap.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

// ── onRoomDeleteCleanup ───────────────────────────────────────────────────────
// Cleans up user membership index docs when a room is deleted.
// Storage asset cleanup requires the deleteStartupRoomCascade callable.
export const onRoomDeleteCleanup = functions
  .region('us-central1')
  .firestore.document(`${C.ROOMS}/{roomId}`)
  .onDelete(async (snap, ctx) => {
    const { roomId } = ctx.params
    // Remove membership index for all members
    const membersSnap = await db()
      .collection(`${C.ROOMS}/${roomId}/${C.MEMBERS}`)
      .get()

    const batch = db().batch()
    membersSnap.docs.forEach((d) => {
      const uid = d.id
      batch.delete(db().doc(`${C.USERS}/${uid}/${C.ROOM_MEMBERSHIPS}/${roomId}`))
    })
    await batch.commit()
  })
