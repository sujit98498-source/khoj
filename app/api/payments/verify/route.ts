import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

function buildEsewaStatusUrl(baseUrl: string, productCode: string, totalAmount: string, transactionUuid: string) {
  const statusUrl = new URL(baseUrl)
  statusUrl.search = ''
  statusUrl.searchParams.set('product_code', productCode)
  statusUrl.searchParams.set('total_amount', totalAmount)
  statusUrl.searchParams.set('transaction_uuid', transactionUuid)
  return statusUrl.toString()
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, transactionUuid, productCode, totalAmount } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ message: 'Payment ID is required' }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const paymentRef = adminDb.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId))
    const paymentSnap = await paymentRef.get()

    if (!paymentSnap.exists) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentSnap.data() ?? {}

    if (payment.status === 'verified' || payment.status === 'success') {
      return NextResponse.json({
        success: true,
        message: 'Payment already approved and tournament access has been granted.',
        paymentId: String(paymentId),
        tournamentId: String(payment.tournamentId ?? ''),
        alreadyJoined: true,
      })
    }

    if (payment.status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment confirmed and waiting for admin approval.',
        paymentId: String(paymentId),
        tournamentId: String(payment.tournamentId ?? ''),
        alreadyJoined: Boolean(payment.joined),
      })
    }

    const resolvedTransactionUuid = String(transactionUuid || payment.transactionUuid || '')
    const resolvedProductCode = String(productCode || payment.productCode || process.env.ESEWA_PRODUCT_CODE || '')
    const resolvedTotalAmount = String(totalAmount || Number(payment.amount ?? 0).toFixed(2))
    const esewaStatusCheckUrl = process.env.ESEWA_STATUS_CHECK_URL

    if (!resolvedTransactionUuid || !resolvedProductCode || !resolvedTotalAmount || !esewaStatusCheckUrl) {
      return NextResponse.json({ message: 'Missing payment verification configuration' }, { status: 500 })
    }

    const statusUrl = buildEsewaStatusUrl(esewaStatusCheckUrl, resolvedProductCode, resolvedTotalAmount, resolvedTransactionUuid)
    const verificationResponse = await fetch(statusUrl, { method: 'GET', cache: 'no-store' })
    const verificationPayload = await verificationResponse.json().catch(() => null)
    const gatewayStatus = String(
      verificationPayload?.status ?? verificationPayload?.transaction_status ?? ''
    ).toUpperCase()

    const now = new Date().toISOString()

    if (!verificationResponse.ok || !/(COMPLETE|SUCCESS)/i.test(gatewayStatus)) {
      await paymentRef.update({
        status: 'failed',
        gatewayStatus,
        gatewayResponse: verificationPayload,
        updatedAt: now,
      })

      return NextResponse.json(
        { message: 'Payment verification failed. Please try again.' },
        { status: 400 }
      )
    }

    await paymentRef.update({
      status: 'paid',
      gatewayStatus,
      gatewayResponse: verificationPayload,
      updatedAt: now,
      paidAt: now,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment verified with eSewa and added to the admin review queue.',
      paymentId: String(paymentId),
      tournamentId: String(payment.tournamentId ?? ''),
      alreadyJoined: Boolean(payment.joined),
    })
  } catch (error) {
    console.error('Payment verification error:', error)

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Payment verification failed' },
      { status: 500 }
    )
  }
}
