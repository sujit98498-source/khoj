// functions/src/collaborationRooms/matching.ts
// Server-side profile matching — mirrors lib/collaboration/matching.ts.
// Can be called as a callable to get ranked profiles for a given room+role.

import * as functions from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'
import { COLLECTIONS as C } from './types'

interface MatchParams { roomId: string; roleId?: string | null; topN?: number }

export const rankStartupProfiles = functions
  .region('us-central1')
  .https.onCall(async (data: MatchParams, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required')
    const db = getFirestore()

    const [roomSnap, profilesSnap] = await Promise.all([
      db.doc(`${C.ROOMS}/${data.roomId}`).get(),
      db.collection(C.STARTUP_PROFILES)
        .where('visibility', '==', 'public')
        .limit(200)
        .get(),
    ])

    if (!roomSnap.exists) throw new functions.https.HttpsError('not-found', 'Room not found')
    const room = roomSnap.data()!

    let targetRole: Record<string, unknown> | null = null
    if (data.roleId) {
      const roleSnap = await db.doc(`${C.ROOMS}/${data.roomId}/${C.ROLES}/${data.roleId}`).get()
      targetRole = roleSnap.exists ? { id: roleSnap.id, ...roleSnap.data() } : null
    }

    const profiles = profilesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Simple scoring — mirrors client-side algorithm
    const scored = profiles.map((p: any) => {
      let score = 0

      // Role fit (0.30): category match
      if (targetRole) {
        const desired = (targetRole.category as string ?? '').toLowerCase()
        const userCats = (p.roleCategories ?? []).map((c: string) => c.toLowerCase())
        const direct = userCats.includes(desired) ? 0.30 : 0
        const partial = userCats.some((c: string) => c.includes(desired) || desired.includes(c)) ? 0.15 : 0
        score += direct || partial
      }

      // Commitment match (0.15)
      if (room.startup?.commitment && p.commitment === room.startup.commitment) score += 0.15

      // Location match (0.10)
      if (room.startup?.locationMode && p.locationMode === room.startup.locationMode) score += 0.10

      // Stage match (0.10)
      if (room.startup?.stage && p.preferredStages?.includes(room.startup.stage)) score += 0.10

      // Proof signals (0.10)
      if (p.tracksCompleted && p.tracksCompleted > 0) score += 0.05
      if (p.arenaProjects && p.arenaProjects > 0) score += 0.05

      return { userId: p.id, score: Math.round(score * 100) / 100, profile: p }
    })

    const topN = Math.min(data.topN ?? 20, 50)
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
  })
