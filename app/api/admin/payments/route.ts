import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import {
  FinanceActivity,
  PaymentRecord,
  PaymentStatus,
  PayoutRecord,
  PayoutStatus,
  TournamentFinancialBreakdown,
  TournamentPlacement,
  TournamentStatus,
} from '@/lib/types'

type AdminFinanceAction = 'verify' | 'reject' | 'markFailed' | 'approveJoin' | 'saveNotes' | 'markPayoutSent' | 'deleteRecord'

const PRIZE_SPLIT: Record<TournamentPlacement, number> = {
  first: 0.6,
  second: 0.3,
  third: 0.1,
}

function buildEsewaStatusUrl(baseUrl: string, productCode: string, totalAmount: string, transactionUuid: string) {
  const statusUrl = new URL(baseUrl)
  statusUrl.search = ''
  statusUrl.searchParams.set('product_code', productCode)
  statusUrl.searchParams.set('total_amount', totalAmount)
  statusUrl.searchParams.set('transaction_uuid', transactionUuid)
  return statusUrl.toString()
}

function resolvePaymentStatus(rawStatus: string, joined: boolean): PaymentStatus {
  if (rawStatus === 'success') {
    return joined ? 'verified' : 'paid'
  }

  if (rawStatus === 'verified' || rawStatus === 'paid' || rawStatus === 'failed') {
    return rawStatus
  }

  return 'pending'
}

function normalizePayment(docId: string, data: Record<string, unknown>): PaymentRecord {
  const rawStatus = String(data.status ?? 'pending').toLowerCase()

  return {
    id: docId,
    userId: String(data.userId ?? ''),
    userName: String(data.userName ?? 'Unknown User'),
    tournamentId: String(data.tournamentId ?? ''),
    tournamentName: String(data.tournamentName ?? 'Untitled Tournament'),
    amount: Number(data.amount ?? 0),
    paymentMethod: 'esewa',
    status: resolvePaymentStatus(rawStatus, Boolean(data.joined)),
    transactionUuid: String(data.transactionUuid ?? ''),
    productCode: String(data.productCode ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    paidAt: data.paidAt ? String(data.paidAt) : undefined,
    verifiedAt: data.verifiedAt ? String(data.verifiedAt) : undefined,
    joinedAt: data.joinedAt ? String(data.joinedAt) : undefined,
    joined: Boolean(data.joined),
    gatewayStatus: data.gatewayStatus ? String(data.gatewayStatus) : undefined,
    gatewayResponse:
      data.gatewayResponse && typeof data.gatewayResponse === 'object'
        ? (data.gatewayResponse as Record<string, unknown>)
        : null,
    adminNotes: data.adminNotes ? String(data.adminNotes) : '',
  }
}

function normalizePayout(docId: string, data: Record<string, unknown>): PayoutRecord {
  const rawStatus = String(data.payoutStatus ?? 'owed').toLowerCase()
  const payoutStatus: PayoutStatus = rawStatus === 'sent' || rawStatus === 'processing' ? rawStatus : 'owed'

  return {
    id: docId,
    tournamentId: String(data.tournamentId ?? ''),
    tournamentName: String(data.tournamentName ?? 'Untitled Tournament'),
    winnerId: String(data.winnerId ?? ''),
    winnerName: String(data.winnerName ?? 'Unknown Winner'),
    placement: String(data.placement ?? 'first') as TournamentPlacement,
    prizeAmount: Number(data.prizeAmount ?? 0),
    payoutStatus,
    dueDate: String(data.dueDate ?? new Date().toISOString()),
    paidDate: data.paidDate ? String(data.paidDate) : undefined,
    payoutMethod: data.payoutMethod ? String(data.payoutMethod) : 'bank_transfer',
    reference: data.reference ? String(data.reference) : '',
  }
}

async function getUserName(adminDb: ReturnType<typeof getAdminDb>, userId: string, cache: Map<string, string>) {
  if (!userId) {
    return 'Unknown User'
  }

  if (cache.has(userId)) {
    return cache.get(userId) as string
  }

  const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get()
  const userName = String(userSnap.data()?.name ?? 'Unknown User')
  cache.set(userId, userName)
  return userName
}

async function buildFinanceDashboard() {
  const adminDb = getAdminDb()
  const [paymentSnapshot, tournamentSnapshot, payoutSnapshot] = await Promise.all([
    adminDb.collection(COLLECTIONS.PAYMENTS).orderBy('createdAt', 'desc').get(),
    adminDb.collection(COLLECTIONS.TOURNAMENTS).get(),
    adminDb.collection(COLLECTIONS.PAYOUTS).get(),
  ])

  const userNameCache = new Map<string, string>()
  const payments: PaymentRecord[] = await Promise.all(
    paymentSnapshot.docs.map(async (doc) => {
      const data = doc.data() as Record<string, unknown>
      const userId = String(data.userId ?? '')
      const tournamentId = String(data.tournamentId ?? '')

      const userName = data.userName
        ? String(data.userName)
        : await getUserName(adminDb, userId, userNameCache)

      let tournamentName = String(data.tournamentName ?? '')
      if (!tournamentName && tournamentId) {
        const tournamentSnap = await adminDb.collection(COLLECTIONS.TOURNAMENTS).doc(tournamentId).get()
        tournamentName = String(tournamentSnap.data()?.title ?? tournamentSnap.data()?.name ?? 'Untitled Tournament')
      }

      return normalizePayment(doc.id, {
        ...data,
        userName,
        tournamentName,
      })
    })
  )

  const payoutOverrides = new Map<string, Record<string, unknown>>()
  payoutSnapshot.docs.forEach((doc) => {
    payoutOverrides.set(doc.id, doc.data() as Record<string, unknown>)
  })

  const payouts: PayoutRecord[] = []
  const financials: TournamentFinancialBreakdown[] = []

  for (const tournamentDoc of tournamentSnapshot.docs) {
    const tournament = tournamentDoc.data() as Record<string, unknown>
    const tournamentId = tournamentDoc.id
    const tournamentName = String(tournament.title ?? tournament.name ?? 'Untitled Tournament')
    const status = String(tournament.status ?? 'upcoming') as TournamentStatus
    const prizePool = Number(tournament.prizeMoney ?? 0)
    const successfulPayments = payments.filter(
      (payment) => payment.tournamentId === tournamentId && (payment.status === 'paid' || payment.status === 'verified')
    )

    const totalCollected = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const playersPaid = new Set(successfulPayments.map((payment) => payment.userId)).size

    let prizePaid = 0
    const results = (tournament.results ?? {}) as Partial<Record<TournamentPlacement, string>>

    if (prizePool > 0) {
      for (const placement of ['first', 'second', 'third'] as TournamentPlacement[]) {
        const winnerId = typeof results[placement] === 'string' ? String(results[placement]) : ''

        if (!winnerId) {
          continue
        }

        const payoutId = tournamentId + '_' + placement
        const prizeAmount = Math.round(prizePool * PRIZE_SPLIT[placement])
        const override = payoutOverrides.get(payoutId) ?? {}
        const payout = normalizePayout(payoutId, {
          tournamentId,
          tournamentName,
          winnerId,
          winnerName: await getUserName(adminDb, winnerId, userNameCache),
          placement,
          prizeAmount,
          dueDate: override.dueDate ?? tournament.endDate ?? tournament.createdAt ?? new Date().toISOString(),
          payoutMethod: override.payoutMethod ?? 'bank_transfer',
          reference: override.reference ?? '',
          payoutStatus: override.payoutStatus ?? 'owed',
          paidDate: override.paidDate,
        })

        payouts.push(payout)

        if (payout.payoutStatus === 'sent') {
          prizePaid += payout.prizeAmount
        }
      }
    }

    financials.push({
      tournamentId,
      tournamentName,
      playersPaid,
      totalCollected,
      prizePool,
      prizePaid,
      prizeRemaining: Math.max(prizePool - prizePaid, 0),
      netRetained: totalCollected - prizePaid,
      status,
    })
  }

  const recentActivity: FinanceActivity[] = []

  payments.forEach((payment) => {
    recentActivity.push({
      id: 'payment-' + payment.id,
      type: 'payment',
      title: 'Incoming payment captured',
      description: (payment.userName || 'Unknown User') + ' started a payment for ' + (payment.tournamentName || 'a tournament') + '.',
      amount: payment.amount,
      createdAt: payment.createdAt,
      status: payment.status,
    })

    if (payment.paidAt || payment.verifiedAt) {
      recentActivity.push({
        id: 'verification-' + payment.id,
        type: 'verification',
        title: payment.status === 'verified' ? 'Payment approved' : 'Payment verified',
        description:
          (payment.tournamentName || 'Tournament') +
          (payment.status === 'verified' ? ' was approved for entry.' : ' cleared the eSewa verification step.'),
        amount: payment.amount,
        createdAt: payment.verifiedAt || payment.paidAt || payment.updatedAt || payment.createdAt,
        status: payment.status,
      })
    }
  })

  payouts.forEach((payout) => {
    recentActivity.push({
      id: 'payout-' + payout.id,
      type: 'payout',
      title: payout.payoutStatus === 'sent' ? 'Winner payout sent' : 'Winner payout scheduled',
      description: payout.winnerName + ' • ' + payout.tournamentName + ' • ' + payout.placement.toUpperCase(),
      amount: payout.prizeAmount,
      createdAt: payout.paidDate || payout.dueDate,
      status: payout.payoutStatus,
    })
  })

  recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    payments,
    payouts: payouts.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    financials: financials.sort((a, b) => b.totalCollected - a.totalCollected),
    recentActivity: recentActivity.slice(0, 12),
  }
}

export async function GET() {
  try {
    const dashboard = await buildFinanceDashboard()
    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Admin payments fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load finance dashboard' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, payoutId, payout, action, notes } = await req.json() as {
      paymentId?: string
      payoutId?: string
      payout?: Partial<PayoutRecord>
      action?: AdminFinanceAction
      notes?: string
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const now = new Date().toISOString()

    if (action === 'markPayoutSent') {
      const resolvedPayoutId = payoutId || payout?.id

      if (!resolvedPayoutId || !payout) {
        return NextResponse.json({ error: 'Payout details are required' }, { status: 400 })
      }

      await adminDb.collection(COLLECTIONS.PAYOUTS).doc(String(resolvedPayoutId)).set({
        tournamentId: payout.tournamentId,
        tournamentName: payout.tournamentName,
        winnerId: payout.winnerId,
        winnerName: payout.winnerName,
        placement: payout.placement,
        prizeAmount: payout.prizeAmount,
        payoutStatus: 'sent',
        dueDate: payout.dueDate,
        paidDate: now,
        payoutMethod: payout.payoutMethod ?? 'bank_transfer',
        reference: payout.reference || 'PAYOUT-' + Date.now(),
      }, { merge: true })

      return NextResponse.json({
        success: true,
        status: 'sent',
        message: 'Winner payout marked as sent.',
      })
    }

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    const paymentRef = adminDb.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId))
    const paymentSnap = await paymentRef.get()

    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentSnap.data() as Record<string, unknown>

    if (action === 'deleteRecord') {
      await paymentRef.delete()

      return NextResponse.json({
        success: true,
        message: 'Payment record deleted successfully',
      })
    }

    if (action === 'saveNotes') {
      await paymentRef.update({
        adminNotes: String(notes ?? ''),
        updatedAt: now,
      })

      return NextResponse.json({ success: true, message: 'Admin notes saved.' })
    }

    if (action === 'reject' || action === 'markFailed') {
      await paymentRef.update({
        status: 'failed',
        updatedAt: now,
        gatewayStatus: action === 'reject' ? 'REJECTED_BY_ADMIN' : 'FAILED_BY_ADMIN',
        adminNotes: String(notes ?? payment.adminNotes ?? ''),
      })

      return NextResponse.json({
        success: true,
        status: 'failed',
        message: action === 'reject' ? 'Payment rejected by admin.' : 'Payment marked as failed.',
      })
    }

    if (action === 'verify') {
      if (String(payment.status ?? '') === 'verified' || String(payment.status ?? '') === 'success') {
        return NextResponse.json({ success: true, status: 'verified', message: 'Payment already verified.' })
      }

      const productCode = String(payment.productCode ?? process.env.ESEWA_PRODUCT_CODE ?? '')
      const transactionUuid = String(payment.transactionUuid ?? '')
      const totalAmount = Number(payment.amount ?? 0).toFixed(2)
      const statusBaseUrl = process.env.ESEWA_STATUS_CHECK_URL

      if (!productCode || !transactionUuid || !statusBaseUrl) {
        return NextResponse.json({ error: 'Missing eSewa verification configuration' }, { status: 500 })
      }

      const statusUrl = buildEsewaStatusUrl(statusBaseUrl, productCode, totalAmount, transactionUuid)
      const verificationResponse = await fetch(statusUrl, { method: 'GET', cache: 'no-store' })
      const verificationPayload = await verificationResponse.json().catch(() => null)
      const gatewayStatus = String(
        verificationPayload?.status ?? verificationPayload?.transaction_status ?? ''
      ).toUpperCase()

      const nextStatus = verificationResponse.ok && /(COMPLETE|SUCCESS)/i.test(gatewayStatus) ? 'paid' : 'failed'

      await paymentRef.update({
        status: nextStatus,
        updatedAt: now,
        paidAt: nextStatus === 'paid' ? now : payment.paidAt ?? null,
        gatewayStatus,
        gatewayResponse: verificationPayload,
        adminNotes: String(notes ?? payment.adminNotes ?? ''),
      })

      return NextResponse.json({
        success: true,
        status: nextStatus,
        message: nextStatus === 'paid' ? 'Payment verified with eSewa.' : 'Payment marked as failed after verification.',
      })
    }

    if (String(payment.status ?? '') !== 'paid' && String(payment.status ?? '') !== 'verified' && String(payment.status ?? '') !== 'success') {
      return NextResponse.json(
        { error: 'Only successfully paid records can be approved for tournament entry' },
        { status: 409 }
      )
    }

    let alreadyJoined = false

    await adminDb.runTransaction(async (transaction) => {
      const currentPaymentSnap = await transaction.get(paymentRef)
      const currentPayment = currentPaymentSnap.data() as Record<string, unknown>
      const userId = String(currentPayment.userId ?? '')
      const tournamentId = String(currentPayment.tournamentId ?? '')
      const tournamentRef = adminDb.collection(COLLECTIONS.TOURNAMENTS).doc(tournamentId)
      const tournamentSnap = await transaction.get(tournamentRef)

      if (!tournamentSnap.exists) {
        throw new Error('Tournament not found for this payment')
      }

      const tournament = tournamentSnap.data() ?? {}
      const participants = Array.isArray(tournament.participants) ? tournament.participants : []
      const currentPlayers = Number(tournament.currentPlayers ?? participants.length)
      const maxPlayers = Number(tournament.maxPlayers ?? 0)

      if (participants.includes(userId)) {
        alreadyJoined = true
      } else {
        if (maxPlayers > 0 && currentPlayers >= maxPlayers) {
          throw new Error('Tournament is already full. Unable to approve join.')
        }

        transaction.update(tournamentRef, {
          participants: FieldValue.arrayUnion(userId),
          currentPlayers: FieldValue.increment(1),
        })
      }

      transaction.update(paymentRef, {
        status: 'verified',
        joined: true,
        updatedAt: now,
        verifiedAt: now,
        joinedAt: now,
        adminNotes: String(notes ?? currentPayment.adminNotes ?? ''),
      })
    })

    return NextResponse.json({
      success: true,
      status: 'verified',
      alreadyJoined,
      message: alreadyJoined ? 'User was already joined to this tournament.' : 'Tournament entry approved and synced.',
    })
  } catch (error) {
    console.error('Admin payment action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update finance data' },
      { status: 500 }
    )
  }
}
