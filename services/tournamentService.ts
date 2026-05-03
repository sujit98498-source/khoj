// services/tournamentService.ts
// Tournament CRUD and join operations

import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  addDoc,
} from 'firebase/firestore'
import { auth, requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Tournament, TournamentPlacement, TournamentResults, XP_CONFIG } from '@/lib/types'
import { recalculateRanks } from '@/services/userService'
import { createNotification } from '@/services/notificationService'

type TournamentRecord = Partial<Tournament> & { name?: string; title?: string; winnerId?: string }

const EMPTY_RESULTS: TournamentResults = {
  first: '',
  second: '',
  third: '',
}

const PLACEMENT_ORDER: TournamentPlacement[] = ['first', 'second', 'third']

const TOURNAMENT_BONUS_XP: Record<TournamentPlacement, number> = {
  first: XP_CONFIG.TOURNAMENT_FIRST,
  second: XP_CONFIG.TOURNAMENT_SECOND,
  third: XP_CONFIG.TOURNAMENT_THIRD,
}

export interface CreateTournamentInput {
  title: string
  description: string
  category: string
  maxPlayers: number
  entryFee?: number
  prizeXP: number
  prizeMoney?: number
  startDate: string
  endDate: string
  status: Tournament['status']
  createdBy: string
  createdAt?: string
}

export type UpdateTournamentInput = Partial<
  Omit<Tournament, 'id' | 'participants' | 'currentPlayers' | 'createdAt' | 'createdBy'>
>

function normalizeTournamentResults(data: TournamentRecord): TournamentResults | undefined {
  const rawResults = data.results ?? EMPTY_RESULTS

  const normalized: TournamentResults = {
    first:
      typeof rawResults.first === 'string'
        ? rawResults.first
        : typeof data.winnerId === 'string'
          ? data.winnerId
          : '',
    second: typeof rawResults.second === 'string' ? rawResults.second : '',
    third: typeof rawResults.third === 'string' ? rawResults.third : '',
  }

  return normalized.first || normalized.second || normalized.third ? normalized : undefined
}

function normalizeTournament(data: TournamentRecord, id: string): Tournament {
  const resolvedTitle = data.title || data.name || 'Untitled Tournament'
  const participants = Array.isArray(data.participants) ? data.participants : []

  return {
    ...data,
    id,
    title: resolvedTitle,
    name: data.name || resolvedTitle,
    description: data.description ?? '',
    category: data.category ?? 'Other',
    maxPlayers: data.maxPlayers ?? participants.length,
    currentPlayers: data.currentPlayers ?? participants.length,
    entryFee: data.entryFee ?? 0,
    prizeXP: data.prizeXP ?? 0,
    prizeMoney: data.prizeMoney ?? 0,
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    status: data.status ?? 'upcoming',
    results: normalizeTournamentResults(data),
    participants,
    createdBy: data.createdBy ?? '',
    createdAt: data.createdAt ?? new Date().toISOString(),
  } as Tournament
}

function normalizePublishResults(results: TournamentResults): TournamentResults {
  return {
    first: results.first?.trim() ?? '',
    second: results.second?.trim() ?? '',
    third: results.third?.trim() ?? '',
  }
}

function getSelectedPlacements(results: TournamentResults): string[] {
  return PLACEMENT_ORDER.map((placement) => results[placement]).filter(Boolean)
}

function validateTournamentResults(tournament: Tournament, results: TournamentResults): TournamentResults {
  const normalizedResults = normalizePublishResults(results)

  if (!normalizedResults.first) {
    throw new Error('Select 1st place before publishing')
  }

  if (tournament.participants.length >= 2 && !normalizedResults.second) {
    throw new Error('Select 2nd place before publishing')
  }

  if (tournament.participants.length >= 3 && !normalizedResults.third) {
    throw new Error('Select 3rd place before publishing')
  }

  const selectedIds = getSelectedPlacements(normalizedResults)

  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Each placement must use a different participant')
  }

  for (const playerId of selectedIds) {
    if (!tournament.participants.includes(playerId)) {
      throw new Error('All selected placements must be tournament participants')
    }
  }

  return normalizedResults
}

function buildTournamentXpAwards(
  participants: string[],
  results: TournamentResults
): Record<string, number> {
  const awards = Object.fromEntries(
    participants.map((participantId) => [participantId, XP_CONFIG.TOURNAMENT_PARTICIPATION])
  ) as Record<string, number>

  for (const placement of PLACEMENT_ORDER) {
    const playerId = results[placement]

    if (playerId) {
      awards[playerId] = (awards[playerId] ?? XP_CONFIG.TOURNAMENT_PARTICIPATION) + TOURNAMENT_BONUS_XP[placement]
    }
  }

  return awards
}

function getPlacementLabel(placement: TournamentPlacement): string {
  switch (placement) {
    case 'first':
      return '1st'
    case 'second':
      return '2nd'
    case 'third':
      return '3rd'
  }
}

/**
 * Fetch all tournaments, preserving current user-facing ordering by startDate
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS),
    orderBy('startDate', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeTournament(d.data() as TournamentRecord, d.id))
}

/**
 * Fetch a single tournament by id
 */
export async function getTournamentById(id: string): Promise<Tournament | null> {
  const ref = doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return normalizeTournament(snap.data() as TournamentRecord, snap.id)
}

/**
 * Get tournaments a user has joined
 */
export async function getUserTournaments(userId: string): Promise<Tournament[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS),
    where('participants', 'array-contains', userId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeTournament(d.data() as TournamentRecord, d.id))
}

/**
 * Create a new tournament
 */
export async function createTournament(input: CreateTournamentInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS), {
    ...input,
    entryFee: input.entryFee ?? 0,
    prizeMoney: input.prizeMoney ?? 0,
    participants: [],
    currentPlayers: 0,
    createdAt: input.createdAt ?? new Date().toISOString(),
  })
  return ref.id
}

/**
 * Update tournament fields
 */
export async function updateTournament(
  id: string,
  input: UpdateTournamentInput
): Promise<void> {
  await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, id), { ...input })
}

/**
 * Delete a tournament
 */
export async function deleteTournament(id: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, id))
}

/**
 * Update tournament status
 */
export async function updateTournamentStatus(
  id: string,
  status: Tournament['status']
): Promise<void> {
  const ref = doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, id)
  await updateDoc(ref, { status })
}

async function publishTournamentResultClient(
  tournamentId: string,
  results: TournamentResults
): Promise<void> {
  const tournamentRef = doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, tournamentId)
  const resultRef = doc(collection(requireFirestoreDb(), COLLECTIONS.RESULTS))
  let publishedTournament: Tournament | null = null
  let publishedResults = EMPTY_RESULTS
  let xpAwards: Record<string, number> = {}

  await runTransaction(requireFirestoreDb(), async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef)

    if (!tournamentSnap.exists()) {
      throw new Error('Tournament not found')
    }

    const tournament = normalizeTournament(tournamentSnap.data() as TournamentRecord, tournamentSnap.id)
    const validatedResults = validateTournamentResults(tournament, results)
    const computedXpAwards = buildTournamentXpAwards(tournament.participants, validatedResults)
    const now = new Date().toISOString()

    if (tournament.status === 'completed') {
      throw new Error('Result already published')
    }

    publishedTournament = tournament
    publishedResults = validatedResults
    xpAwards = computedXpAwards

    transaction.update(tournamentRef, {
      status: 'completed',
      results: validatedResults,
      winnerId: deleteField(),
    })

    tournament.participants.forEach((participantId) => {
      const participantRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, participantId)
      const participantUpdates: Record<string, unknown> = {
        xp: increment(computedXpAwards[participantId] ?? XP_CONFIG.TOURNAMENT_PARTICIPATION),
        matchesPlayed: increment(1),
        lastActive: now,
      }

      if (participantId === validatedResults.first) {
        participantUpdates.wins = increment(1)
      }

      transaction.update(participantRef, participantUpdates)
    })

    transaction.set(resultRef, {
      tournamentId,
      tournamentTitle: tournament.title,
      results: validatedResults,
      xpAwards: computedXpAwards,
      prizeMoney: tournament.prizeMoney ?? 0,
      createdAt: now,
      publishedBy: auth?.currentUser?.uid ?? 'admin',
    })
  })

  if (!publishedTournament) return

  const finalizedTournament = publishedTournament as Tournament

  try {
    await recalculateRanks()
  } catch (error) {
    console.error('Rank recalculation failed after tournament publish', error)
  }

  for (const placement of PLACEMENT_ORDER) {
    const playerId = publishedResults[placement]

    if (!playerId) continue

    try {
      await createNotification({
        userId: playerId,
        type: 'result',
        title: '🏆 Tournament Results Published',
        message: `You finished ${getPlacementLabel(placement)} in ${finalizedTournament.title} and earned ${xpAwards[playerId] ?? 0} XP!`,
        metadata: {
          tournamentId,
          placement: getPlacementLabel(placement),
          xpAwarded: xpAwards[playerId] ?? 0,
        },
      })
    } catch (error) {
      console.error('Failed to create tournament placement notification', error)
    }
  }
}

export async function publishTournamentResult(
  tournamentId: string,
  results: TournamentResults
): Promise<void> {
  const normalizedResults = normalizePublishResults(results)

  if (!normalizedResults.first) {
    throw new Error('Select 1st place before publishing')
  }

  try {
    const response = await fetch('/api/tournaments/publish-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournamentId,
        results: normalizedResults,
        submittedBy: auth?.currentUser?.uid ?? null,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (response.ok) {
      return
    }

    const message = typeof payload?.error === 'string'
      ? payload.error
      : 'Failed to publish result'

    if (response.status < 500 && response.status !== 503) {
      throw new Error(message)
    }

    console.warn('Falling back to client-side tournament result publishing:', message)
  } catch (error) {
    if (
      error instanceof Error &&
      /1st place|2nd place|3rd place|Result already published|All selected placements must be tournament participants|Each placement must use a different participant|Unauthorized|Tournament not found/i.test(error.message)
    ) {
      throw error
    }

    console.warn('Tournament result API unavailable, using client fallback.', error)
  }

  await publishTournamentResultClient(tournamentId, normalizedResults)
}

/**
 * Join a tournament — idempotent and safe for repeat attempts
 */
export async function joinTournament(
  tournamentId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const ref = doc(requireFirestoreDb(), COLLECTIONS.TOURNAMENTS, tournamentId)
  const snap = await getDoc(ref)

  if (!snap.exists()) return { success: false, message: 'Tournament not found' }

  const tournament = normalizeTournament(snap.data() as TournamentRecord, snap.id)

  if (tournament.participants.includes(userId)) {
    return { success: false, message: 'Already joined this tournament' }
  }

  if (tournament.currentPlayers >= tournament.maxPlayers) {
    return { success: false, message: 'Tournament is full' }
  }

  if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
    return { success: false, message: 'Tournament is not open for joining' }
  }

  await updateDoc(ref, {
    participants: arrayUnion(userId),
    currentPlayers: increment(1),
  })

  return { success: true, message: 'Successfully joined tournament!' }
}
