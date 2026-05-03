// services/matchService.ts
// Match operations + XP award engine
// This is the core business logic of KHOJ

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Match, XP_CONFIG } from '@/lib/types'
import { addMatchHistoryEntry, recalculateRanks } from './userService'
import { createNotification } from './notificationService'
import { getTournamentById } from './tournamentService'
import { generateMatches, MatchmakingConfig } from './matchmakingService'

/**
 * Fetch all matches for a tournament
 */
export async function getMatchesByTournament(tournamentId: string): Promise<Match[]> {
  const q = query(
    collection(db, COLLECTIONS.MATCHES),
    where('tournamentId', '==', tournamentId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match))
}

/**
 * Fetch matches involving a specific user
 */
export async function getUserMatches(userId: string): Promise<Match[]> {
  const q1 = query(
    collection(db, COLLECTIONS.MATCHES),
    where('player1Id', '==', userId)
  )
  const q2 = query(
    collection(db, COLLECTIONS.MATCHES),
    where('player2Id', '==', userId)
  )
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const matches = [
    ...snap1.docs.map((d) => ({ id: d.id, ...d.data() } as Match)),
    ...snap2.docs.map((d) => ({ id: d.id, ...d.data() } as Match)),
  ]
  return matches.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/**
 * Create a new match record
 */
export async function createMatch(
  data: Omit<Match, 'id' | 'xpAwarded' | 'completedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.MATCHES), {
    ...data,
    xpAwarded: false,
    completedAt: null,
  })
  return ref.id
}

/**
 * Submit match result + trigger XP award
 * This is the core engine — called when scores are finalized
 */
export async function submitMatchResult(
  matchId: string,
  player1Score: number,
  player2Score: number
): Promise<{ success: boolean; message: string }> {
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId)
  const matchSnap = await getDoc(matchRef)

  if (!matchSnap.exists()) return { success: false, message: 'Match not found' }

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match

  if (match.xpAwarded) {
    return { success: false, message: 'XP already awarded for this match' }
  }

  const winnerId =
    player1Score > player2Score
      ? match.player1Id
      : player2Score > player1Score
      ? match.player2Id
      : null // draw

  const loserId = winnerId
    ? winnerId === match.player1Id
      ? match.player2Id
      : match.player1Id
    : null

  const now = new Date().toISOString()

  // Update match record
  await updateDoc(matchRef, {
    player1Score,
    player2Score,
    winnerId,
    status: 'completed',
    xpAwarded: true,
    completedAt: now,
  })

  // Fetch tournament info for history entries
  const tournament = await getTournamentById(match.tournamentId)
  const tournamentTitle = tournament?.title ?? 'Unknown Tournament'

  // Award XP and record history for both players
  const xpOps: Promise<void>[] = []

  if (winnerId) {
    const winnerXP = XP_CONFIG.WIN
    const loserXP = XP_CONFIG.LOSS

    // Update winner stats
    const winnerRef = doc(db, COLLECTIONS.USERS, winnerId)
    xpOps.push(
      updateDoc(winnerRef, {
        xp: increment(winnerXP),
        wins: increment(1),
        matchesPlayed: increment(1),
        lastActive: now,
      })
    )

    // Update loser stats
    if (loserId) {
      const loserRef = doc(db, COLLECTIONS.USERS, loserId)
      xpOps.push(
        updateDoc(loserRef, {
          xp: increment(loserXP),
          matchesPlayed: increment(1),
          lastActive: now,
        })
      )
    }

    // Add to match history
    xpOps.push(
      addMatchHistoryEntry(winnerId, {
        matchId,
        opponentName: winnerId === match.player1Id ? match.player2Name : match.player1Name,
        result: 'win',
        xpEarned: winnerXP,
        date: now,
        tournamentTitle,
      })
    )

    if (loserId) {
      xpOps.push(
        addMatchHistoryEntry(loserId, {
          matchId,
          opponentName: loserId === match.player1Id ? match.player2Name : match.player1Name,
          result: 'loss',
          xpEarned: loserXP,
          date: now,
          tournamentTitle,
        })
      )
    }

    // Send win notification
    xpOps.push(
      createNotification({
        userId: winnerId,
        type: 'win',
        title: '🏆 Match Won!',
        message: `You won your match and earned +${winnerXP} XP!`,
        metadata: { xpEarned: winnerXP, matchId },
      })
    )
  } else {
    // Draw — both get participation XP
    const drawXP = XP_CONFIG.PARTICIPATION
    const p1Ref = doc(db, COLLECTIONS.USERS, match.player1Id)
    const p2Ref = doc(db, COLLECTIONS.USERS, match.player2Id)
    xpOps.push(
      updateDoc(p1Ref, { xp: increment(drawXP), matchesPlayed: increment(1) }),
      updateDoc(p2Ref, { xp: increment(drawXP), matchesPlayed: increment(1) }),
      addMatchHistoryEntry(match.player1Id, {
        matchId,
        opponentName: match.player2Name,
        result: 'draw',
        xpEarned: drawXP,
        date: now,
        tournamentTitle,
      }),
      addMatchHistoryEntry(match.player2Id, {
        matchId,
        opponentName: match.player1Name,
        result: 'draw',
        xpEarned: drawXP,
        date: now,
        tournamentTitle,
      })
    )
  }

  await Promise.all(xpOps)

  // Recalculate ranks for all users
  await recalculateRanks()

  return { success: true, message: 'Match result submitted and XP awarded!' }
}

// ──────────────────────────────────────────────────────────────────────────────
// TOURNAMENT MATCHMAKING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Wrapper function: Generate matches for a tournament
 * Uses the matchmaking service to pair players fairly
 * 
 * Call this when tournament is ready to start (or each round)
 * 
 * Example:
 * await startTournamentMatches('tournament-123')
 */
export async function startTournamentMatches(
  tournamentId: string,
  config?: MatchmakingConfig
): Promise<{
  success: boolean
  matchesCreated: number
  byePlayer?: string
  message: string
}> {
  try {
    const result = await generateMatches(tournamentId, config)
    return {
      success: true,
      matchesCreated: result.totalMatches,
      byePlayer: result.byePlayer,
      message: `Created ${result.totalMatches} matches. ${result.byePlayer ? '1 player gets bye.' : ''}`,
    }
  } catch (error) {
    console.error('Tournament matchmaking error:', error)
    return {
      success: false,
      matchesCreated: 0,
      message: error instanceof Error ? error.message : 'Failed to create matches',
    }
  }
}

export async function getMatchesUnderReview(): Promise<Match[]> {
  const q = query(
    collection(db, COLLECTIONS.MATCHES),
    where('status', '==', 'under_review')
  )

  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Match))
    .sort(
      (a, b) =>
        new Date(String(b.createdAt ?? 0)).getTime() -
        new Date(String(a.createdAt ?? 0)).getTime()
    )
}

export async function approveMatch(
  matchId: string,
  winnerId: string,
  loserId: string
): Promise<{ success: boolean; winnerXPGained: number }> {
  if (!winnerId || !loserId) {
    throw new Error('Winner and loser are required')
  }

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId)
  const matchSnap = await getDoc(matchRef)

  if (!matchSnap.exists()) {
    throw new Error('Match not found')
  }

  const match = { id: matchSnap.id, ...matchSnap.data() } as Match

  if (match.status !== 'under_review') {
    throw new Error('Match is not under review')
  }

  const now = new Date().toISOString()
  const winnerXPGained = XP_CONFIG.WIN ?? 50

  await updateDoc(matchRef, {
    winnerId,
    status: 'completed',
    xpAwarded: true,
    completedAt: now,
  })

  await updateDoc(doc(db, COLLECTIONS.USERS, winnerId), {
    xp: increment(winnerXPGained),
    wins: increment(1),
    matchesPlayed: increment(1),
    lastActive: now,
  })

  await updateDoc(doc(db, COLLECTIONS.USERS, loserId), {
    losses: increment(1),
    matchesPlayed: increment(1),
    lastActive: now,
  })

  return { success: true, winnerXPGained }
}

export async function rejectMatch(matchId: string): Promise<{ success: boolean }> {
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId)
  const matchSnap = await getDoc(matchRef)

  if (!matchSnap.exists()) {
    throw new Error('Match not found')
  }

  await updateDoc(matchRef, {
    status: 'room_created',
    screenshotUrl: null,
    winnerId: null,
    completedAt: null,
    aiResult: null,
    xpAwarded: false,
  })

  return { success: true }
}
