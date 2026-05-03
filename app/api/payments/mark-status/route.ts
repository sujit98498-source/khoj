import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { PaymentStatus } from '@/lib/types'

function isValidStatus(status: string): status is PaymentStatus {
  return status === 'pending' || status === 'paid' || status === 'failed' || status === 'verified'
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, status } = await req.json()

    if (!paymentId || !isValidStatus(String(status))) {
      return NextResponse.json({ error: 'Payment ID and valid status are required' }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const paymentRef = adminDb.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId))
    const paymentSnap = await paymentRef.get()

    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentSnap.data() ?? {}

    if ((payment.status === 'verified' || payment.status === 'success') && status === 'failed') {
      return NextResponse.json({ success: true, status: payment.status })
    }

    await paymentRef.update({
      status,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Payment status update error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update payment status' },
      { status: 500 }
    )
  }
}
