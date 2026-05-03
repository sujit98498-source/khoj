'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PaymentRecord } from '@/lib/types'
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge'

type AdminFinanceAction = 'verify' | 'reject' | 'markFailed' | 'approveJoin' | 'saveNotes' | 'markPayoutSent' | 'deleteRecord'

interface PaymentDetailsModalProps {
  payment: PaymentRecord | null
  busyAction?: AdminFinanceAction | null
  onClose: () => void
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

export function PaymentDetailsModal({ payment, busyAction, onClose, onAction }: PaymentDetailsModalProps) {
  const [notes, setNotes] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setNotes(payment?.adminNotes ?? '')
    setShowDeleteConfirm(false)
  }, [payment])

  if (!payment) return null

  const canVerify = payment.status === 'pending' || payment.status === 'paid'
  const canApprove = payment.status === 'paid' && !payment.joined
  const canFail = payment.status !== 'verified' && payment.status !== 'failed'
  const isVerifiedPayment = payment.status === 'verified'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-sm border border-khoj-border bg-khoj-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-khoj-border px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body">Payment Details</p>
            <h2 className="text-2xl font-display font-bold text-khoj-text mt-1">{payment.tournamentName || 'Tournament Payment'}</h2>
          </div>
          <button onClick={onClose} className="text-khoj-subtle hover:text-khoj-text text-xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-4 space-y-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-widest text-khoj-subtle">Summary Block</p>
              <p className="text-khoj-text font-semibold">{payment.userName || 'Unknown User'}</p>
              <p className="text-sm text-khoj-subtle">Tournament: {payment.tournamentName || 'Untitled Tournament'}</p>
              <p className="text-sm text-khoj-subtle">Payment ID: {payment.id}</p>
              <p className="text-sm text-khoj-subtle">Transaction: {payment.transactionUuid}</p>
            </div>

            <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-4 space-y-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-widest text-khoj-subtle">Status Block</p>
              <div className="flex flex-wrap gap-2">
                <PaymentStatusBadge status={payment.status} />
                <Badge label={payment.gatewayStatus || 'PENDING'} variant={getGatewayVariant(payment.gatewayStatus)} size="md" />
              </div>
              <p className="text-sm text-khoj-subtle">Created: {formatDate(payment.createdAt)}</p>
              <p className="text-sm text-khoj-subtle">Verified: {formatDate(payment.verifiedAt || payment.paidAt)}</p>
            </div>

            <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-4 space-y-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-widest text-khoj-subtle">User / Tournament Relation</p>
              <p className="text-sm text-khoj-text">Method: {payment.paymentMethod.toUpperCase()}</p>
              <p className="text-sm text-khoj-text">Amount: Rs {payment.amount.toLocaleString()}</p>
              <p className="text-sm text-khoj-text">Joined Tournament: {payment.joined ? 'Yes' : 'No'}</p>
              <p className="text-sm text-khoj-text">User ID: {payment.userId}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs uppercase tracking-widest text-khoj-subtle mb-2">Raw Gateway Response</p>
              <pre className="rounded-sm border border-khoj-border bg-khoj-bg/70 p-4 text-xs text-khoj-text overflow-x-auto whitespace-pre-wrap min-h-[220px]">
{JSON.stringify(payment.gatewayResponse ?? { message: 'No gateway payload recorded yet.' }, null, 2)}
              </pre>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-khoj-subtle mb-2">Admin Notes</p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={9}
                  placeholder="Add review notes, escalation comments, or verification context..."
                  className="w-full rounded-sm border border-khoj-border bg-khoj-bg/70 px-3 py-3 text-sm text-khoj-text outline-none focus:border-khoj-accent"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" loading={busyAction === 'saveNotes'} onClick={() => onAction('saveNotes', payment.id, notes)}>
                  Save Notes
                </Button>
                {canVerify && (
                  <Button loading={busyAction === 'verify'} onClick={() => onAction('verify', payment.id, notes)}>
                    Verify
                  </Button>
                )}
                {canApprove && (
                  <Button variant="secondary" loading={busyAction === 'approveJoin'} onClick={() => onAction('approveJoin', payment.id, notes)}>
                    Approve Join
                  </Button>
                )}
                {canFail && (
                  <Button variant="ghost" loading={busyAction === 'reject'} onClick={() => onAction('reject', payment.id, notes)}>
                    Reject
                  </Button>
                )}
                {canFail && (
                  <Button variant="danger" loading={busyAction === 'markFailed'} onClick={() => onAction('markFailed', payment.id, notes)}>
                    Mark Failed
                  </Button>
                )}
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Record
                </Button>
                <Button variant="ghost" onClick={onClose}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-sm border border-khoj-border bg-khoj-card shadow-2xl">
            <div className="border-b border-khoj-border px-6 py-5">
              <h3 className="text-2xl font-display font-bold text-khoj-text">
                {isVerifiedPayment ? 'Delete Verified Payment Record?' : 'Delete Payment Record'}
              </h3>
              <p className="mt-2 text-sm text-khoj-subtle">
                You are about to remove this payment statement from the finance dashboard.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                  <p className="text-khoj-subtle mb-1">User</p>
                  <p className="text-khoj-text font-semibold">{payment.userName || 'Unknown User'}</p>
                </div>
                <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                  <p className="text-khoj-subtle mb-1">Tournament</p>
                  <p className="text-khoj-text font-semibold">{payment.tournamentName || 'Untitled Tournament'}</p>
                </div>
                <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                  <p className="text-khoj-subtle mb-1">Payment Ref</p>
                  <p className="text-khoj-text break-all">{payment.id}</p>
                </div>
                <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3">
                  <p className="text-khoj-subtle mb-1">Amount</p>
                  <p className="text-khoj-text font-semibold">Rs {payment.amount.toLocaleString()}</p>
                </div>
                <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-3 sm:col-span-2">
                  <p className="text-khoj-subtle mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {isVerifiedPayment
                  ? 'This payment has already been verified. Deleting it may affect audit history, reporting, or tournament finance records. Please confirm only if this entry is incorrect.'
                  : 'This record will be removed from the main finance dashboard. Use this only for invalid, duplicate, failed, or test records.'}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-khoj-border px-6 py-4">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busyAction === 'deleteRecord'}
                onClick={() => onAction('deleteRecord', payment.id, notes)}
              >
                {isVerifiedPayment ? 'Yes, Delete' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
