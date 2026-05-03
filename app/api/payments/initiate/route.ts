import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { generateEsewaSignature } from '@/services/paymentService'

function getEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(name + ' is not configured')
  }

  return value
}

export async function POST(req: NextRequest) {
  try {
    const { userId, tournamentId, amount } = await req.json()
    const normalizedAmount = Number(amount ?? 0)

    if (!userId || !tournamentId) {
      return NextResponse.json({ error: 'User ID and tournament ID are required' }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const tournamentRef = adminDb.collection(COLLECTIONS.TOURNAMENTS).doc(String(tournamentId))
    const tournamentSnap = await tournamentRef.get()

    if (!tournamentSnap.exists) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const tournament = tournamentSnap.data() ?? {}
    const participants = Array.isArray(tournament.participants) ? tournament.participants : []
    const currentPlayers = Number(tournament.currentPlayers ?? participants.length)
    const maxPlayers = Number(tournament.maxPlayers ?? 0)
    const entryFee = Number(tournament.entryFee ?? 0)
    const tournamentName = String(tournament.title ?? tournament.name ?? 'Untitled Tournament')

    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(String(userId)).get()
    const userName = String(userSnap.data()?.name ?? 'Unknown User')

    if (participants.includes(String(userId))) {
      return NextResponse.json({ error: 'Already joined this tournament' }, { status: 409 })
    }

    if (maxPlayers > 0 && currentPlayers >= maxPlayers) {
      return NextResponse.json({ error: 'Tournament Full' }, { status: 409 })
    }

    if (tournament.status === 'completed') {
      return NextResponse.json({ error: 'Tournament Ended' }, { status: 409 })
    }

    if (!Number.isFinite(entryFee) || entryFee <= 0) {
      return NextResponse.json({ error: 'Entry fee is not configured for this tournament' }, { status: 400 })
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount !== entryFee) {
      return NextResponse.json({ error: 'Invalid entry fee amount' }, { status: 400 })
    }

    const productCode = getEnv('ESEWA_PRODUCT_CODE')
    const secretKey = getEnv('ESEWA_SECRET_KEY')
    const esewaBaseUrl = getEnv('ESEWA_GATEWAY_URL')
    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')

    const transactionUuid = crypto.randomUUID()
    const totalAmount = normalizedAmount.toFixed(2)
    const signature = await generateEsewaSignature(totalAmount, transactionUuid, productCode, secretKey)
    const createdAt = new Date().toISOString()

    const paymentRef = adminDb.collection(COLLECTIONS.PAYMENTS).doc()

    await paymentRef.set({
      userId: String(userId),
      userName,
      tournamentId: String(tournamentId),
      tournamentName,
      amount: normalizedAmount,
      paymentMethod: 'esewa',
      status: 'pending',
      transactionUuid,
      productCode,
      createdAt,
      updatedAt: createdAt,
      joined: false,
      gatewayStatus: 'PENDING',
      gatewayResponse: null,
    })

    return NextResponse.json({
      paymentId: paymentRef.id,
      userId: String(userId),
      tournamentId: String(tournamentId),
      amount: normalizedAmount,
      status: 'pending',
      transactionUuid,
      productCode,
      createdAt,
      signature,
      totalAmount,
      esewaBaseUrl,
      successUrl: appUrl + '/payment-success?paymentId=' + paymentRef.id,
      failureUrl: appUrl + '/payment-failure?paymentId=' + paymentRef.id,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)

    const message = error instanceof Error ? error.message : 'Failed to initiate payment'

    return NextResponse.json(
      {
        error: message.includes('Firebase Admin SDK')
          ? message + ' The payment API needs the Firebase service-account credentials in the server environment.'
          : message,
      },
      { status: 500 }
    )
  }
}
