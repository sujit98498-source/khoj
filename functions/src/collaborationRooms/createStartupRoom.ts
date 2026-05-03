// functions/src/collaborationRooms/createStartupRoom.ts
// Callable: creates room doc + owner member + membership index + optional default role.

import * as functions from 'firebase-functions'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  COLLECTIONS as C,
  slugify,
  permissionsForRole,
  StartupSubDoc,
  RoomVisibility,
} from './types'

interface CreateStartupRoomData {
  title: string
  summary: string
  visibility: RoomVisibility
  startup: StartupSubDoc
  coverImageUrl?: string
  tags?: string[]
  createDefaultRole?: boolean
  defaultRoleTitle?: string
  defaultRoleCategory?: string
  defaultRoleDescription?: string
}

export const createStartupRoom = functions
  .region('us-central1')
  .https.onCall(async (data: CreateStartupRoomData, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')

    const { uid, token: { name = '', picture = '' } } = context.auth
    const db = getFirestore()
    const now = FieldValue.serverTimestamp()
    const slug = slugify(data.title)

    const roomRef = db.collection(C.ROOMS).doc()
    const roomId = roomRef.id

    const batch = db.batch()

    // Room document
    batch.set(roomRef, {
      title:                    data.title,
      slug,
      roomType:                 'startup',
      visibility:               data.visibility,
      status:                   'active',
      createdBy:                uid,
      summary:                  data.summary,
      coverImageUrl:            data.coverImageUrl ?? null,
      tags:                     data.tags ?? [],
      memberCount:              1,
      openRoleCount:            data.createDefaultRole ? 1 : 0,
      pendingJoinRequestCount:  0,
      currentLiveSessionId:     null,
      isRecruiting:             true,
      lastActivityAt:           now,
      createdAt:                now,
      updatedAt:                now,
      startup:                  data.startup,
    })

    // Owner member doc
    batch.set(roomRef.collection(C.MEMBERS).doc(uid), {
      userId: uid,
      roomRole: 'owner',
      status: 'active',
      permissions: permissionsForRole('owner'),
      joinedAt: now,
      joinedVia: 'create',
      profileSnapshot: { displayName: name, avatarUrl: picture, roleCategories: [] },
    })

    // User membership index
    batch.set(db.doc(`${C.USERS}/${uid}/${C.ROOM_MEMBERSHIPS}/${roomId}`), {
      roomId,
      title: data.title,
      coverImageUrl: data.coverImageUrl ?? null,
      roomType: 'startup',
      roomRole: 'owner',
      status: 'active',
      joinedAt: now,
    })

    // Optional default role
    if (data.createDefaultRole) {
      const roleRef = roomRef.collection(C.ROLES).doc()
      batch.set(roleRef, {
        title:        data.defaultRoleTitle ?? 'Co-founder',
        category:     data.defaultRoleCategory ?? 'Engineering',
        roleType:     'cofounder',
        seats:        1,
        seatsFilled:  0,
        status:       'open',
        description:  data.defaultRoleDescription ?? 'Looking for a co-founder.',
        createdBy:    uid,
        createdAt:    now,
        updatedAt:    now,
      })
    }

    await batch.commit()

    functions.logger.info('startup_room_create', { roomId, uid })
    return { roomId }
  })
