// functions/src/collaborationRooms/invites.ts
// Callable functions for sending, responding to, and revoking startup invites.

import * as functions from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS as C, permissionsForRole } from './types'

// ── sendStartupInvite ─────────────────────────────────────────────────────────
interface SendInviteData {
  roomId: string
  targetUserId: string
  roleId?: string | null
  message?: string
}

export const sendStartupInvite = functions
  .region('us-central1')
  .https.onCall(async (data: SendInviteData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    if (!memberSnap.exists || !memberSnap.data()!.permissions?.manageMembers) {
      throw new functions.https.HttpsError('permission-denied', 'No permission to invite')
    }

    const [roomSnap, roleSnap] = await Promise.all([
      db.doc(`${C.ROOMS}/${data.roomId}`).get(),
      data.roleId ? db.doc(`${C.ROOMS}/${data.roomId}/${C.ROLES}/${data.roleId}`).get() : null,
    ])

    if (!roomSnap.exists) throw new functions.https.HttpsError('not-found', 'Room not found')
    const room = roomSnap.data()!
    const role = roleSnap?.data()

    const ref = db.collection(`${C.ROOMS}/${data.roomId}/${C.INVITES}`).doc()
    await ref.set({
      targetUserId: data.targetUserId,
      roleId:       data.roleId ?? null,
      sentBy:       uid,
      status:       'pending',
      message:      data.message ?? '',
      roomSnapshot: { title: room.title, summary: room.summary, coverImageUrl: room.coverImageUrl ?? null },
      roleSnapshot: role ? { title: role.title, category: role.category, roleType: role.roleType } : null,
      createdAt:    now,
      updatedAt:    now,
      respondedAt:  null,
      expiresAt:    null,
    })

    functions.logger.info('startup_invite_send', { roomId: data.roomId, uid, targetUserId: data.targetUserId })
    return { inviteId: ref.id }
  })

// ── respondToStartupInvite ────────────────────────────────────────────────────
interface RespondInviteData {
  roomId: string
  inviteId: string
  action: 'accept' | 'decline'
}

export const respondToStartupInvite = functions
  .region('us-central1')
  .https.onCall(async (data: RespondInviteData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid, token: { name = '' } } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()

    const inviteRef = db.doc(`${C.ROOMS}/${data.roomId}/${C.INVITES}/${data.inviteId}`)
    const inviteSnap = await inviteRef.get()
    if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found')
    const invite = inviteSnap.data()!

    if (invite.targetUserId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your invite')
    if (invite.status !== 'pending') return { status: invite.status }

    const batch = db.batch()
    batch.update(inviteRef, {
      status: data.action === 'accept' ? 'accepted' : 'declined',
      respondedAt: now,
      updatedAt: now,
    })

    if (data.action === 'accept') {
      const roleType = invite.roleSnapshot?.roleType
      const roomRole = roleType === 'cofounder' ? 'cofounder' : 'member'

      batch.set(db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`), {
        userId:     uid,
        roomRole,
        status:     'active',
        permissions: permissionsForRole(roomRole),
        joinedAt:   now,
        joinedVia:  'invite',
        profileSnapshot: { displayName: name },
      })

      batch.set(db.doc(`${C.USERS}/${uid}/${C.ROOM_MEMBERSHIPS}/${data.roomId}`), {
        roomId:        data.roomId,
        title:         invite.roomSnapshot?.title ?? '',
        coverImageUrl: invite.roomSnapshot?.coverImageUrl ?? null,
        roomType:      'startup',
        roomRole,
        status:        'active',
        joinedAt:      now,
      })

      batch.update(db.doc(`${C.ROOMS}/${data.roomId}`), {
        memberCount: FieldValue.increment(1),
        updatedAt: now,
      })

      if (data.roleId) {
        batch.update(db.doc(`${C.ROOMS}/${data.roomId}/${C.ROLES}/${invite.roleId}`), {
          seatsFilled: FieldValue.increment(1),
          updatedAt: now,
        })
      }
    }

    await batch.commit()
    functions.logger.info('startup_invite_respond', { roomId: data.roomId, uid, action: data.action })
    return { status: data.action === 'accept' ? 'accepted' : 'declined' }
  })

// ── revokeStartupInvite ───────────────────────────────────────────────────────
export const revokeStartupInvite = functions
  .region('us-central1')
  .https.onCall(async (data: { roomId: string; inviteId: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const { uid } = context.auth
    const db = getFirestore()

    const memberSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.MEMBERS}/${uid}`).get()
    if (!memberSnap.exists || !memberSnap.data()!.permissions?.manageMembers) {
      throw new functions.https.HttpsError('permission-denied', 'No permission to revoke')
    }

    const inviteRef = db.doc(`${C.ROOMS}/${data.roomId}/${C.INVITES}/${data.inviteId}`)
    const snap = await inviteRef.get()
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found')
    if (snap.data()!.status !== 'pending') return { status: snap.data()!.status }

    await inviteRef.update({ status: 'revoked', updatedAt: FieldValue.serverTimestamp() })
    return { status: 'revoked' }
  })
