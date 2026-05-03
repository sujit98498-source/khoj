// services/matchmakingService.ts
// Fair tournament pairing, rematch prevention, and bracket utilities

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  increment,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Match } from '@/lib/types'
import { getTournamentById } from './tournamentService'
import { addMatchHistoryEntry, getUserById, recalculateRanks } from './userService'
import { createNotification } from './notificationService'
import { XP_CONFIG } from '@/lib/types'

export interface PlayerStats {
  uid: string
  xp: number
  name: string
  wins: number
  losses: number
}

export interface MatchmakingConfig {
  preferRanking?: boolean
  minXPDifference?: number
  useELO?: boolean
  shuffle?: boolean
}

export interface MatchmakingResult {
  matches: Match[]
  byePlayer?: string
  totalMatches: number
}

export interface MatchmakingMetrics {
  averageXPDifference: number
  maxXPDifference: number
  totalMatches: number
  byeCount: number
}

type PlayerPair = [PlayerStats, PlayerStats]

type PairingPlan = {
  pairs: PlayerPair[]
  byePlayer?: string
}

/**
 * Core matchmaking entry point
 */
export async function generateMatches(
  tournamentId: string,
  config: MatchmakingConfig = {}
): Promise<MatchmakingResult> {
  const tournament = await getTournamentById(tournamentId)

  if (!tournament) {
    throw new Error('Tournament not found')
  }

  return generateMatchesForPlayers(tournamentId, tournament.participants, config)
}

/**
 * Generate the next round from prior winners
 */
export async function generateNextRound(
  tournamentId: string,
  config: MatchmakingConfig = {}
): Promise<MatchmakingResult> {
  const matchesSnap = await getDocs(
    query(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), where('tournamentId', '==', tournamentId))
  )

  const existingMatches = matchesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Match))

  if (existingMatches.length === 0) {
    return generateMatches(tournamentId, config)
  }

  const unfinished = existingMatches.filter((match) => match.status !== 'completed')
  if (unfinished.length > 0) {
    throw new Error('Current round is not finished')
  }

  const winners = Array.from(
    new Set(existingMatches.map((match) => match.winnerId).filter(Boolean) as string[])
  )

  if (winners.length <= 1) {
    throw new Error('Tournament is over')
  }

  return generateMatchesForPlayers(tournamentId, winners, config)
}

/**
 * Get pairing quality metrics for monitoring fairness
 */
export async function getMatchmakingMetrics(tournamentId: string): Promise<MatchmakingMetrics> {
  const matchesSnap = await getDocs(
    query(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), where('tournamentId', '==', tournamentId))
  )

  const matches = matchesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Match))
  const realMatches = matches.filter((match) => match.player1Id !== 'BYE' && match.player2Id !== 'BYE')

  const diffs = await Promise.all(
    realMatches.map(async (match) => {
      const [player1, player2] = await Promise.all([
        getUserById(match.player1Id),
        getUserById(match.player2Id),
      ])
      return Math.abs((player1?.xp ?? 0) - (player2?.xp ?? 0))
    })
  )

  const total = diffs.reduce((sum, diff) => sum + diff, 0)

  return {
    averageXPDifference: diffs.length > 0 ? Math.round(total / diffs.length) : 0,
    maxXPDifference: diffs.length > 0 ? Math.max(...diffs) : 0,
    totalMatches: matches.length,
    byeCount: matches.filter((match) => match.player1Id === 'BYE' || match.player2Id === 'BYE').length,
  }
}

/**
 * Prevent rematches inside the same tournament
 */
export async function checkExistingMatch(
  tournamentId: string,
  player1Id: string,
  player2Id: string
): Promise<Match | null> {
  const matchesSnap = await getDocs(
    query(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), where('tournamentId', '==', tournamentId))
  )

  for (const docSnap of matchesSnap.docs) {
    const match = { ...docSnap.data(), id: docSnap.id } as Match
    const samePair =
      (match.player1Id === player1Id && match.player2Id === player2Id) ||
      (match.player1Id === player2Id && match.player2Id === player1Id)

    if (samePair) {
      return match
    }
  }

  return null
}

async function generateMatchesForPlayers(
  tournamentId: string,
  participantIds: string[],
  config: MatchmakingConfig
): Promise<MatchmakingResult> {
  const uniqueParticipants = Array.from(new Set(participantIds)).filter(Boolean)

  if (uniqueParticipants.length <= 1) {
    throw new Error(uniqueParticipants.length === 1 ? 'Tournament is over' : 'Need at least 2 players')
  }

  const players = (
    await Promise.all(
      uniqueParticipants.map(async (uid) => {
        const user = await getUserById(uid)
        if (!user) return null

        return {
          uid,
          xp: user.xp ?? 0,
          name: user.name ?? 'Unknown Player',
          wins: user.wins ?? 0,
          losses: Math.max((user.matchesPlayed ?? 0) - (user.wins ?? 0), 0),
        } as PlayerStats
      })
    )
  ).filter(Boolean) as PlayerStats[]

  if (players.length <= 1) {
    throw new Error('Need at least 2 valid players')
  }

  const existingPairs = await getExistingPairKeys(tournamentId)

  const pairingPlan = config.preferRanking
    ? tierBasedPairing(players, existingPairs)
    : typeof config.minXPDifference === 'number'
      ? optimizedXPPairing(players, existingPairs, config.minXPDifference)
      : simpleXPPairing(players, existingPairs, config.shuffle)

  const createdMatches: Match[] = []

  for (const [player1, player2] of pairingPlan.pairs) {
    const duplicate = await checkExistingMatch(tournamentId, player1.uid, player2.uid)
    if (duplicate) continue

    const matchData: Omit<Match, 'id'> = {
      tournamentId,
      player1Id: player1.uid,
      player2Id: player2.uid,
      player1Name: player1.name,
      player2Name: player2.name,
      player1Score: 0,
      player2Score: 0,
      winnerId: null,
      status: 'pending',
      xpAwarded: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), matchData)
    createdMatches.push({ ...matchData, id: ref.id })
  }

  if (pairingPlan.byePlayer) {
    await awardByeWin(tournamentId, pairingPlan.byePlayer)
  }

  return {
    matches: createdMatches,
    byePlayer: pairingPlan.byePlayer,
    totalMatches: createdMatches.length,
  }
}

function simpleXPPairing(
  players: PlayerStats[],
  existingPairs: Set<string>,
  shuffle: boolean = false
): PairingPlan {
  const pool = [...players].sort((a, b) => b.xp - a.xp)
  const pairs: PlayerPair[] = []

  if (shuffle) {
    pool.sort(() => Math.random() - 0.5)
  }

  while (pool.length > 1) {
    const current = pool.shift()!
    let bestIndex = pool.findIndex((candidate) => !existingPairs.has(makePairKey(current.uid, candidate.uid)))

    if (bestIndex === -1) {
      bestIndex = 0
    }

    const opponent = pool.splice(bestIndex, 1)[0]
    pairs.push([current, opponent])
  }

  return {
    pairs,
    byePlayer: pool[0]?.uid,
  }
}

function tierBasedPairing(players: PlayerStats[], existingPairs: Set<string>): PairingPlan {
  const beginners = players.filter((player) => player.xp < 100)
  const intermediate = players.filter((player) => player.xp >= 100 && player.xp < 500)
  const advanced = players.filter((player) => player.xp >= 500 && player.xp < 1000)
  const expert = players.filter((player) => player.xp >= 1000)

  const tiers = [beginners, intermediate, advanced, expert]
  const pairs: PlayerPair[] = []
  const leftovers: PlayerStats[] = []

  for (const tier of tiers) {
    if (tier.length === 0) continue
    const result = simpleXPPairing(tier, existingPairs, false)
    pairs.push(...result.pairs)
    if (result.byePlayer) {
      const leftover = tier.find((player) => player.uid === result.byePlayer)
      if (leftover) leftovers.push(leftover)
    }
  }

  if (leftovers.length > 1) {
    const leftoverResult = simpleXPPairing(leftovers, existingPairs, false)
    pairs.push(...leftoverResult.pairs)
    return {
      pairs,
      byePlayer: leftoverResult.byePlayer,
    }
  }

  return {
    pairs,
    byePlayer: leftovers[0]?.uid,
  }
}

function optimizedXPPairing(
  players: PlayerStats[],
  existingPairs: Set<string>,
  maxXPDifference: number
): PairingPlan {
  const pool = [...players].sort((a, b) => b.xp - a.xp)
  const pairs: PlayerPair[] = []
  let byePlayer: string | undefined

  while (pool.length > 1) {
    const current = pool.shift()!

    let bestIndex = -1
    let smallestDiff = Number.POSITIVE_INFINITY

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i]
      const diff = Math.abs(current.xp - candidate.xp)
      const isRematch = existingPairs.has(makePairKey(current.uid, candidate.uid))

      if (!isRematch && diff <= maxXPDifference && diff < smallestDiff) {
        smallestDiff = diff
        bestIndex = i
      }
    }

    if (bestIndex === -1) {
      if (!byePlayer) {
        byePlayer = current.uid
        continue
      }
      bestIndex = 0
    }

    const opponent = pool.splice(bestIndex, 1)[0]
    pairs.push([current, opponent])
  }

  if (!byePlayer && pool.length === 1) {
    byePlayer = pool[0].uid
  }

  return { pairs, byePlayer }
}

async function getExistingPairKeys(tournamentId: string): Promise<Set<string>> {
  const matchesSnap = await getDocs(
    query(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), where('tournamentId', '==', tournamentId))
  )

  return new Set(
    matchesSnap.docs.map((docSnap) => {
      const match = docSnap.data() as Match
      return makePairKey(match.player1Id, match.player2Id)
    })
  )
}

function makePairKey(player1Id: string, player2Id: string): string {
  return [player1Id, player2Id].sort().join('::')
}

async function awardByeWin(tournamentId: string, playerId: string): Promise<void> {
  const player = await getUserById(playerId)
  if (!player) return

  const now = new Date().toISOString()
  const tournament = await getTournamentById(tournamentId)
  const playerRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, playerId)

  await updateDoc(playerRef, {
    xp: increment(XP_CONFIG.WIN),
    wins: increment(1),
    matchesPlayed: increment(1),
    lastActive: now,
  })

  const matchData: Omit<Match, 'id'> = {
    tournamentId,
    player1Id: playerId,
    player2Id: 'BYE',
    player1Name: player.name,
    player2Name: 'BYE',
    player1Score: 1,
    player2Score: 0,
    winnerId: playerId,
    status: 'completed',
    xpAwarded: true,
    createdAt: now,
    completedAt: now,
  }

  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.MATCHES), matchData)

  await addMatchHistoryEntry(playerId, {
    matchId: ref.id,
    opponentName: 'BYE',
    result: 'win',
    xpEarned: XP_CONFIG.WIN,
    date: now,
    tournamentTitle: tournament?.title ?? 'Unknown Tournament',
  })

  await createNotification({
    userId: playerId,
    type: 'win',
    title: '🎉 Bye Round Win',
    message: `You advanced automatically and earned +${XP_CONFIG.WIN} XP!`,
    metadata: { tournamentId, xpEarned: XP_CONFIG.WIN },
  })

  await recalculateRanks()
}
