'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PaymentRecord } from '@/lib/types'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'
import { PaymentDetailsModal } from '@/components/admin/PaymentDetailsModal'

type AdminFinanceAction = 'verify' | 'reject' | 'markFailed' | 'approveJoin' | 'saveNotes' | 'markPayoutSent' | 'deleteRecord'

interface PaymentReviewTableProps {
  payments: PaymentRecord[]
  loading?: boolean
  busyAction?: AdminFinanceAction | null
  onAction: (action: AdminFinanceAction, paymentId: string, notes?: string) => void
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function getGatewayVariant(gatewayStatus?: string) {
  const status = String(gatewayStatus ?? 'PENDING').toUpperCase()

  if (status.includes('COMPLETE') || status.includes('SUCCESS') || status.includes('VERIFIED')) {
    return 'success'
  }

  if (status.includes('FAILED') || status.includes('REJECT')) {
    return 'danger'
  }

  return 'warning'
}

export function PaymentReviewTable({ payments, loading = false, busyAction, onAction }: PaymentReviewTableProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [payments]
  )

  const selectedPayment = sortedPayments.find((payment) => payment.id === selectedPaymentId) ?? null

  if (loading) {
    return <Card className="text-khoj-subtle">Loading incoming payments...</Card>
  }

  if (sortedPayments.length === 0) {
    return <Card className="text-khoj-subtle">No incoming payment attempts match the current filters.</Card>
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm font-body">
            <thead className="bg-khoj-bg/70 text-khoj-subtle uppercase tracking-widest text-[10px]">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Tournament</th>
                <th className="text-left px-4 py-3">Payment Ref</th>
                <th className="text-left px-4 py-3">Transaction UUID</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">Gateway Status</th>
                <th className="text-left px-4 py-3">Internal Status</th>
                <th className="text-left px-4 py-3">Created At</th>
                <th className="text-left px-4 py-3">Verified At</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => {
                const canVerify = payment.status === 'pending' || payment.status === 'paid'
                const canReject = payment.status !== 'failed' && payment.status !== 'verified'

                return (
                  <tr key={payment.id} className="border-t border-khoj-border text-khoj-text align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{payment.userName || 'Unknown User'}</div>
                      <div className="text-xs text-khoj-subtle mt-1 break-all">{payment.userId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{payment.tournamentName || 'Untitled Tournament'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-khoj-subtle break-all">{payment.id}</td>
                    <td className="px-4 py-3 text-xs text-khoj-subtle break-all">{payment.transactionUuid}</td>
                    <td className="px-4 py-3 font-semibold">Rs {payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 uppercase">{payment.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <Badge label={payment.gatewayStatus || 'PENDING'} variant={getGatewayVariant(payment.gatewayStatus)} size="md" />
                    </td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
                    <td className="px-4 py-3 text-khoj-subtle">{formatDate(payment.createdAt)}</td>
                    <td className="px-4 py-3 text-khoj-subtle">{formatDate(payment.verifiedAt || payment.paidAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedPaymentId(payment.id)}>
                          View Details
                        </Button>
                        {canVerify && (
                          <Button size="sm" loading={busyAction === 'verify'} onClick={() => onAction('verify', payment.id)}>
                            Verify
                          </Button>
                        )}
                        {canReject && (
                          <Button size="sm" variant="ghost" loading={busyAction === 'reject'} onClick={() => onAction('reject', payment.id)}>
                            Reject
                          </Button>
                        )}
                        {canReject && (
                          <Button size="sm" variant="danger" loading={busyAction === 'markFailed'} onClick={() => onAction('markFailed', payment.id)}>
                            Mark Failed
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <PaymentDetailsModal
        payment={selectedPayment}
        busyAction={busyAction}
        onClose={() => setSelectedPaymentId(null)}
        onAction={onAction}
      />
    </>
  )
}
