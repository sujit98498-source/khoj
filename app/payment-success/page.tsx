'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { decodeEsewaSuccessData, verifyEsewaPayment } from '@/services/paymentService'

type VerificationState = {
  loading: boolean
  success: boolean
  message: string
  tournamentId?: string
  paymentId?: string
  transactionUuid?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<VerificationState>({
    loading: true,
    success: false,
    message: 'Verifying your eSewa payment...',
  })

  const decodedData = useMemo(() => decodeEsewaSuccessData(searchParams.get('data')), [searchParams])

  useEffect(() => {
    let cancelled = false

    const runVerification = async () => {
      const paymentId = searchParams.get('paymentId')
      const transactionUuid = decodedData?.transaction_uuid ?? searchParams.get('transaction_uuid') ?? ''

      if (!paymentId) {
        setState({
          loading: false,
          success: false,
          message: 'Missing payment reference. Please contact support if money was deducted.',
          transactionUuid,
        })
        return
      }

      try {
        const result = await verifyEsewaPayment(
          transactionUuid,
          decodedData?.product_code ?? searchParams.get('product_code') ?? '',
          decodedData?.total_amount ?? searchParams.get('total_amount') ?? '',
          paymentId
        )

        if (!cancelled) {
          setState({
            loading: false,
            success: result.success,
            message: result.message,
            tournamentId: result.tournamentId,
            paymentId,
            transactionUuid,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            success: false,
            message: error instanceof Error ? error.message : 'Payment verification failed.',
            paymentId,
            transactionUuid,
          })
        }
      }
    }

    void runVerification()

    return () => {
      cancelled = true
    }
  }, [decodedData, searchParams])

  return (
    <div className="container mx-auto px-6 py-12">
      <Card className="max-w-2xl mx-auto text-center space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">eSewa Payment</p>
          <h1 className="text-3xl font-display font-bold text-khoj-text">
            {state.loading ? 'Verifying Payment' : state.success ? 'Payment Successful' : 'Verification Failed'}
          </h1>
        </div>

        {state.loading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <LoadingSpinner />
            <p className="text-sm text-khoj-subtle">Please wait while we confirm your transaction.</p>
          </div>
        ) : (
          <>
            <div className={state.success ? 'rounded-sm border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-300' : 'rounded-sm border border-red-400/30 bg-red-500/10 p-4 text-red-300'}>
              {state.message}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-left">
              <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                <p className="text-[10px] uppercase tracking-widest text-khoj-subtle mb-1">Payment ID</p>
                <p className="text-sm text-khoj-text break-all">{state.paymentId || 'Unavailable'}</p>
              </div>
              <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                <p className="text-[10px] uppercase tracking-widest text-khoj-subtle mb-1">Transaction UUID</p>
                <p className="text-sm text-khoj-text break-all">{state.transactionUuid || 'Unavailable'}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={state.tournamentId ? '/tournaments/' + state.tournamentId : '/tournaments'}>
                <Button>{state.success ? 'View Tournament' : 'Back to Tournaments'}</Button>
              </Link>
              {!state.success && (
                <Link href="/payment-failure">
                  <Button variant="ghost">Go to Failure Page</Button>
                </Link>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-12"><Card className="max-w-2xl mx-auto text-center"><LoadingSpinner /></Card></div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
