// app/api/matches/submit/route.ts
// Server-side match result submission using Firebase Admin SDK
// Handles XP calculation with server authority (prevents client-side manipulation)

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Match, XP_CONFIG } from '@/lib/types'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb()
    const { matchId, player1Score, player2Score, submittedBy } = await req.json()

    // Validate inputs
    if (!matchId || player1Score === undefined || player2Score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof player1Score !== 'number' || typeof player2Score !== 'number') {
      return NextResponse.json({ error: 'Scores must be numbers' }, { status: 400 })
    }
    if (player1Score < 0 || player2Score < 0) {
      return NextResponse.json({ error: 'Scores must be non-negative' }, { status: 400 })
    }

    // Fetch match — admin SDK bypasses security rules
    const matchRef = adminDb.collection(COLLECTIONS.MATCHES).doc(matchId)
    const matchSnap = await matchRef.get()

    if (!matchSnap.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = { id: matchSnap.id, ...matchSnap.data() } as Match

    // Idempotency check
    if (match.xpAwarded) {
      return NextResponse.json({ error: 'XP already awarded for this match' }, { status: 409 })
    }

    // Only match participants can submit results
    if (submittedBy && submittedBy !== match.player1Id && submittedBy !== match.player2Id) {
      return NextResponse.json({ error: 'Unauthorized: not a match participant' }, { status: 403 })
    }

    // Determine winner
    const winnerId =
      player1Score > player2Score ? match.player1Id :
      player2Score > player1Score ? match.player2Id :
      null
    const loserId = winnerId
      ? (winnerId === match.player1Id ? match.player2Id : match.player1Id)
      : null

    const now = new Date().toISOString()

    // Atomic batch write — all or nothing
    const batch = adminDb.batch()

    // 1. Update match document
    batch.update(matchRef, {
      player1Score,
      player2Score,
      winnerId,
      status: 'completed',
      xpAwarded: true,
      completedAt: now,
    })

    // 2. Award XP to players
    if (winnerId) {
      const winnerRef = adminDb.collection(COLLECTIONS.USERS).doc(winnerId)
      batch.update(winnerRef, {
        xp: FieldValue.increment(XP_CONFIG.WIN),
        wins: FieldValue.increment(1),
        matchesPlayed: FieldValue.increment(1),
        lastActive: now,
      })

      if (loserId) {
        const loserRef = adminDb.collection(COLLECTIONS.USERS).doc(loserId)
        batch.update(loserRef, {
          xp: FieldValue.increment(XP_CONFIG.LOSS),
          matchesPlayed: FieldValue.increment(1),
          lastActive: now,
        })
      }

      // 3. Create win notification
      const notifRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc()
      batch.set(notifRef, {
        userId: winnerId,
        type: 'win',
        title: '🏆 Match Won!',
        message: `You won your match and earned +${XP_CONFIG.WIN} XP!`,
        read: false,
        createdAt: now,
        metadata: { xpEarned: XP_CONFIG.WIN, matchId },
      })
    } else {
      // Draw — both get participation XP
      const p1Ref = adminDb.collection(COLLECTIONS.USERS).doc(match.player1Id)
      const p2Ref = adminDb.collection(COLLECTIONS.USERS).doc(match.player2Id)
      batch.update(p1Ref, {
        xp: FieldValue.increment(XP_CONFIG.PARTICIPATION),
        matchesPlayed: FieldValue.increment(1),
        lastActive: now,
      })
      batch.update(p2Ref, {
        xp: FieldValue.increment(XP_CONFIG.PARTICIPATION),
        matchesPlayed: FieldValue.increment(1),
        lastActive: now,
      })
    }

    // 4. Add match history entries to each user's subcollection
    const historyBase = {
      matchId,
      date: now,
      tournamentTitle: 'Tournament', // could fetch tournament title here
    }

    if (winnerId && loserId) {
      const winHistRef = adminDb
        .collection(COLLECTIONS.USERS).doc(winnerId)
        .collection('matchHistory').doc(matchId)
      batch.set(winHistRef, {
        ...historyBase,
        opponentName: winnerId === match.player1Id ? match.player2Name : match.player1Name,
        result: 'win',
        xpEarned: XP_CONFIG.WIN,
      })

      const lossHistRef = adminDb
        .collection(COLLECTIONS.USERS).doc(loserId)
        .collection('matchHistory').doc(matchId)
      batch.set(lossHistRef, {
        ...historyBase,
        opponentName: loserId === match.player1Id ? match.player2Name : match.player1Name,
        result: 'loss',
        xpEarned: XP_CONFIG.LOSS,
      })
    } else {
      // Draw history
      const p1HistRef = adminDb
        .collection(COLLECTIONS.USERS).doc(match.player1Id)
        .collection('matchHistory').doc(matchId)
      batch.set(p1HistRef, {
        ...historyBase,
        opponentName: match.player2Name,
        result: 'draw',
        xpEarned: XP_CONFIG.PARTICIPATION,
      })
      const p2HistRef = adminDb
        .collection(COLLECTIONS.USERS).doc(match.player2Id)
        .collection('matchHistory').doc(matchId)
      batch.set(p2HistRef, {
        ...historyBase,
        opponentName: match.player1Name,
        result: 'draw',
        xpEarned: XP_CONFIG.PARTICIPATION,
      })
    }

    // Commit batch
    await batch.commit()

    // Trigger rank recalculation asynchronously (don't block response)
    recalculateRanksAsync()

    return NextResponse.json({
      success: true,
      message: 'Match result submitted and XP awarded!',
      xpAwarded: winnerId ? XP_CONFIG.WIN : XP_CONFIG.PARTICIPATION,
      winnerId,
    })
  } catch (error) {
    console.error('Match submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Recalculate ranks for all users asynchronously
 * For production scale: move this to a Cloud Function triggered by Firestore writes
 */
async function recalculateRanksAsync() {
  try {
    const adminDb = getAdminDb()
    const usersSnap = await adminDb
      .collection(COLLECTIONS.USERS)
      .orderBy('xp', 'desc')
      .get()

    const batch = adminDb.batch()
    usersSnap.docs.forEach((doc, index) => {
      batch.update(doc.ref, { rank: index + 1 })
    })
    await batch.commit()
  } catch (err) {
    console.error('Rank recalculation failed:', err)
  }
}
