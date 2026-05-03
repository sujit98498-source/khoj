import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { TournamentPlacement, TournamentResults, XP_CONFIG } from '@/lib/types'

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

function normalizeResultsPayload(raw: unknown): TournamentResults {
  const input = (raw ?? {}) as Partial<TournamentResults>

  return {
    first: typeof input.first === 'string' ? input.first.trim() : '',
    second: typeof input.second === 'string' ? input.second.trim() : '',
    third: typeof input.third === 'string' ? input.third.trim() : '',
  }
}

function getSelectedPlacements(results: TournamentResults): string[] {
  return PLACEMENT_ORDER.map((placement) => results[placement]).filter(Boolean)
}

function validateResults(results: TournamentResults, participants: string[]) {
  if (!results.first) {
    throw new Error('Select 1st place before publishing')
  }

  if (participants.length >= 2 && !results.second) {
    throw new Error('Select 2nd place before publishing')
  }

  if (participants.length >= 3 && !results.third) {
    throw new Error('Select 3rd place before publishing')
  }

  const selectedIds = getSelectedPlacements(results)

  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Each placement must use a different participant')
  }

  for (const playerId of selectedIds) {
    if (!participants.includes(playerId)) {
      throw new Error('All selected placements must be tournament participants')
    }
  }
}

function buildXpAwards(participants: string[], results: TournamentResults): Record<string, number> {
  const xpAwards = Object.fromEntries(
    participants.map((participantId) => [participantId, XP_CONFIG.TOURNAMENT_PARTICIPATION])
  ) as Record<string, number>

  for (const placement of PLACEMENT_ORDER) {
    const playerId = results[placement]

    if (playerId) {
      xpAwards[playerId] = (xpAwards[playerId] ?? XP_CONFIG.TOURNAMENT_PARTICIPATION) + TOURNAMENT_BONUS_XP[placement]
    }
  }

  return xpAwards
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

export async function POST(req: NextRequest) {
  try {
    const { tournamentId, results, submittedBy } = await req.json()

    if (!tournamentId || !results) {
      return NextResponse.json({ error: 'Tournament ID and results are required' }, { status: 400 })
    }

    const normalizedResults = normalizeResultsPayload(results)
    const adminDb = getAdminDb()

    if (submittedBy) {
      const adminUserSnap = await adminDb.collection(COLLECTIONS.USERS).doc(submittedBy).get()
      const adminData = adminUserSnap.data()

      if (!adminUserSnap.exists || adminData?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const tournamentRef = adminDb.collection(COLLECTIONS.TOURNAMENTS).doc(tournamentId)
    const resultRef = adminDb.collection(COLLECTIONS.RESULTS).doc()

    const tournamentSnap = await tournamentRef.get()
    if (!tournamentSnap.exists) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const tournamentData = tournamentSnap.data() ?? {}
    const participants = Array.isArray(tournamentData.participants) ? tournamentData.participants : []
    const tournamentTitle = String(tournamentData.title ?? tournamentData.name ?? 'Untitled Tournament')
    const prizeMoney = Number(tournamentData.prizeMoney ?? 0)

    if (tournamentData.status === 'completed') {
      return NextResponse.json({ error: 'Result already published' }, { status: 409 })
    }

    validateResults(normalizedResults, participants)

    const xpAwards = buildXpAwards(participants, normalizedResults)
    const now = new Date().toISOString()
    const batch = adminDb.batch()

    batch.update(tournamentRef, {
      status: 'completed',
      results: normalizedResults,
      winnerId: FieldValue.delete(),
    })

    participants.forEach((participantId) => {
      const participantRef = adminDb.collection(COLLECTIONS.USERS).doc(participantId)
      const participantUpdates: Record<string, unknown> = {
        xp: FieldValue.increment(xpAwards[participantId] ?? XP_CONFIG.TOURNAMENT_PARTICIPATION),
        matchesPlayed: FieldValue.increment(1),
        lastActive: now,
      }

      if (participantId === normalizedResults.first) {
        participantUpdates.wins = FieldValue.increment(1)
      }

      batch.update(participantRef, participantUpdates)
    })

    batch.set(resultRef, {
      tournamentId,
      tournamentTitle,
      results: normalizedResults,
      xpAwards,
      prizeMoney,
      createdAt: now,
      publishedBy: submittedBy ?? 'admin',
    })

    PLACEMENT_ORDER.forEach((placement) => {
      const playerId = normalizedResults[placement]

      if (!playerId) return

      const notificationRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc()
      batch.set(notificationRef, {
        userId: playerId,
        type: 'result',
        title: '🏆 Tournament Results Published',
        message: `You finished ${getPlacementLabel(placement)} in ${tournamentTitle} and earned ${xpAwards[playerId] ?? 0} XP!`,
        read: false,
        createdAt: now,
        metadata: {
          tournamentId,
          placement: getPlacementLabel(placement),
          xpAwarded: xpAwards[playerId] ?? 0,
        },
      })
    })

    await batch.commit()
    void recalculateRanksAsync()

    return NextResponse.json({ success: true, message: 'Top 3 results published ✅' })
  } catch (error) {
    console.error('Tournament result publish error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status =
      /Firebase Admin SDK is not configured/i.test(message)
        ? 503
        : /1st place|2nd place|3rd place|different participant|tournament participants/i.test(message)
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}

async function recalculateRanksAsync() {
  try {
    const adminDb = getAdminDb()
    const usersSnap = await adminDb.collection(COLLECTIONS.USERS).orderBy('xp', 'desc').get()

    const batch = adminDb.batch()
    usersSnap.docs.forEach((userDoc, index) => {
      batch.update(userDoc.ref, { rank: index + 1 })
    })

    await batch.commit()
  } catch (error) {
    console.error('Tournament rank recalculation failed:', error)
  }
}
