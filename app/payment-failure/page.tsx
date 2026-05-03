'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { markPaymentStatus } from '@/services/paymentService'

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Your eSewa payment did not complete.')

  useEffect(() => {
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return
    }

    void markPaymentStatus(paymentId, 'failed').catch((error) => {
      console.error('Failed to mark payment as failed', error)
      setMessage('Payment was cancelled or failed. Please try again.')
    })
  }, [searchParams])

  return (
    <div className="container mx-auto px-6 py-12">
      <Card className="max-w-2xl mx-auto text-center space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-red-400 font-body mb-2">eSewa Payment</p>
          <h1 className="text-3xl font-display font-bold text-khoj-text">Payment Failed</h1>
        </div>

        <div className="rounded-sm border border-red-400/30 bg-red-500/10 p-4 text-red-300">
          {message}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/tournaments">
            <Button>Back to Tournaments</Button>
          </Link>
          <Link href="/tournaments">
            <Button variant="ghost">Try Again</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-12"><Card className="max-w-2xl mx-auto text-center text-khoj-subtle">Loading payment status...</Card></div>}>
      <PaymentFailureContent />
    </Suspense>
  )
}
