'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PayoutRecord } from '@/lib/types'

interface WinnerPayoutsTableProps {
  payouts: PayoutRecord[]
  loading?: boolean
  onMarkSent: (payout: PayoutRecord) => void
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function getVariant(status: PayoutRecord['payoutStatus']) {
  if (status === 'sent') return 'success'
  if (status === 'processing') return 'info'
  return 'warning'
}

export function WinnerPayoutsTable({ payouts, loading = false, onMarkSent }: WinnerPayoutsTableProps) {
  if (loading) {
    return <Card className="text-khoj-subtle">Loading payout ledger...</Card>
  }

  if (payouts.length === 0) {
    return <Card className="text-khoj-subtle">No winner payouts are due yet.</Card>
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm font-body">
          <thead className="bg-khoj-bg/70 text-khoj-subtle uppercase tracking-widest text-[10px]">
            <tr>
              <th className="text-left px-4 py-3">Tournament</th>
              <th className="text-left px-4 py-3">Winner Name</th>
              <th className="text-left px-4 py-3">Placement</th>
              <th className="text-left px-4 py-3">Prize Amount</th>
              <th className="text-left px-4 py-3">Payout Status</th>
              <th className="text-left px-4 py-3">Due Date</th>
              <th className="text-left px-4 py-3">Paid Date</th>
              <th className="text-left px-4 py-3">Payout Method</th>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-t border-khoj-border text-khoj-text align-top">
                <td className="px-4 py-3 font-semibold">{payout.tournamentName}</td>
                <td className="px-4 py-3">{payout.winnerName}</td>
                <td className="px-4 py-3 uppercase">{payout.placement}</td>
                <td className="px-4 py-3">Rs {payout.prizeAmount.toLocaleString()}</td>
                <td className="px-4 py-3"><Badge label={payout.payoutStatus} variant={getVariant(payout.payoutStatus)} size="md" /></td>
                <td className="px-4 py-3 text-khoj-subtle">{formatDate(payout.dueDate)}</td>
                <td className="px-4 py-3 text-khoj-subtle">{formatDate(payout.paidDate)}</td>
                <td className="px-4 py-3 uppercase">{(payout.payoutMethod || 'bank_transfer').replace('_', ' ')}</td>
                <td className="px-4 py-3 text-xs text-khoj-subtle">{payout.reference || '—'}</td>
                <td className="px-4 py-3">
                  {payout.payoutStatus === 'sent' ? (
                    <Badge label="Sent" variant="success" size="md" />
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onMarkSent(payout)}>
                      Mark Sent
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
