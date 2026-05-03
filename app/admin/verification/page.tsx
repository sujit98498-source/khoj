'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FinanceFilterBar, FinanceFilters } from '@/components/admin/FinanceFilterBar'
import { FinanceInsightStrip } from '@/components/admin/FinanceInsightStrip'
import { PaymentReviewTable } from '@/components/admin/PaymentReviewTable'
import { RecentFinanceActivity } from '@/components/admin/RecentFinanceActivity'
import { TournamentFinancialBreakdownTable } from '@/components/admin/TournamentFinancialBreakdownTable'
import { WinnerPayoutsTable } from '@/components/admin/WinnerPayoutsTable'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { FinanceActivity, PaymentRecord, PayoutRecord, TournamentFinancialBreakdown } from '@/lib/types'

type AdminFinanceAction = 'verify' | 'reject' | 'markFailed' | 'approveJoin' | 'saveNotes' | 'markPayoutSent' | 'deleteRecord'

const DEFAULT_FILTERS: FinanceFilters = {
  search: '',
  status: 'all',
  tournament: 'all',
  method: 'all',
  dateRange: 'all',
  sortBy: 'newest',
}

export default function AdminVerificationPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [financials, setFinancials] = useState<TournamentFinancialBreakdown[]>([])
  const [recentActivity, setRecentActivity] = useState<FinanceActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<AdminFinanceAction | null>(null)
  const [filters, setFilters] = useState<FinanceFilters>(DEFAULT_FILTERS)

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/payments', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to load finance dashboard')
      }

      setPayments(Array.isArray(payload?.payments) ? payload.payments : [])
      setPayouts(Array.isArray(payload?.payouts) ? payload.payouts : [])
      setFinancials(Array.isArray(payload?.financials) ? payload.financials : [])
      setRecentActivity(Array.isArray(payload?.recentActivity) ? payload.recentActivity : [])
    } catch (error) {
      console.error('Failed to load finance dashboard:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to load finance dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const tournamentOptions = useMemo(() => {
    return Array.from(new Set(financials.map((item) => item.tournamentName).filter(Boolean))).sort()
  }, [financials])

  const handleFilterChange = (key: keyof FinanceFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const filteredPayments = useMemo(() => {
    const now = Date.now()

    const scoped = payments.filter((payment) => {
      const haystack = [
        payment.userName,
        payment.userId,
        payment.tournamentName,
        payment.id,
        payment.transactionUuid,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !filters.search || haystack.includes(filters.search.toLowerCase())
      const matchesStatus = filters.status === 'all' || payment.status === filters.status
      const matchesTournament = filters.tournament === 'all' || payment.tournamentName === filters.tournament
      const matchesMethod = filters.method === 'all' || payment.paymentMethod === filters.method

      const createdAt = new Date(payment.createdAt).getTime()
      const matchesDateRange =
        filters.dateRange === 'all' ||
        (Number.isFinite(createdAt) && createdAt >= now - Number(filters.dateRange) * 24 * 60 * 60 * 1000)

      return matchesSearch && matchesStatus && matchesTournament && matchesMethod && matchesDateRange
    })

    return [...scoped].sort((left, right) => {
      if (filters.sortBy === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      }

      if (filters.sortBy === 'amount-desc') {
        return right.amount - left.amount
      }

      if (filters.sortBy === 'amount-asc') {
        return left.amount - right.amount
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [filters, payments])

  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      const matchesSearch =
        !filters.search ||
        [payout.tournamentName, payout.winnerName, payout.reference, payout.winnerId].join(' ').toLowerCase().includes(filters.search.toLowerCase())

      const matchesTournament = filters.tournament === 'all' || payout.tournamentName === filters.tournament
      return matchesSearch && matchesTournament
    })
  }, [filters.search, filters.tournament, payouts])

  const filteredFinancials = useMemo(() => {
    return financials.filter((item) => {
      const matchesSearch = !filters.search || item.tournamentName.toLowerCase().includes(filters.search.toLowerCase())
      const matchesTournament = filters.tournament === 'all' || item.tournamentName === filters.tournament
      return matchesSearch && matchesTournament
    })
  }, [financials, filters.search, filters.tournament])

  const metrics = useMemo(() => {
    const grossCollected = payments
      .filter((payment) => payment.status === 'paid' || payment.status === 'verified')
      .reduce((sum, payment) => sum + payment.amount, 0)

    const pendingVerification = payments.filter((payment) => payment.status === 'pending').length
    const failedPayments = payments.filter((payment) => payment.status === 'failed').length
    const verifiedCollected = payments
      .filter((payment) => payment.status === 'verified')
      .reduce((sum, payment) => sum + payment.amount, 0)

    const prizePayoutsOwed = payouts
      .filter((payout) => payout.payoutStatus !== 'sent')
      .reduce((sum, payout) => sum + payout.prizeAmount, 0)

    const prizePayoutsSent = payouts
      .filter((payout) => payout.payoutStatus === 'sent')
      .reduce((sum, payout) => sum + payout.prizeAmount, 0)

    const collectionRate = payments.length > 0
      ? (payments.filter((payment) => payment.status === 'paid' || payment.status === 'verified').length / payments.length) * 100
      : 0

    const highestRevenueTournament = financials.length > 0
      ? financials.reduce((best, row) => row.totalCollected > best.amount ? { name: row.tournamentName, amount: row.totalCollected } : best, { name: 'No revenue yet', amount: 0 })
      : { name: 'No revenue yet', amount: 0 }

    return {
      grossCollected,
      pendingVerification,
      failedPayments,
      verifiedCollected,
      prizePayoutsOwed,
      prizePayoutsSent,
      netBalanceHeld: grossCollected - prizePayoutsSent,
      activePaidTournaments: new Set(financials.filter((row) => row.totalCollected > 0 && row.status !== 'completed').map((row) => row.tournamentId)).size,
      collectionRate,
      highestRevenueTournament,
    }
  }, [financials, payments, payouts])

  const exportCsv = () => {
    const header = ['User', 'Tournament', 'Payment Ref', 'Transaction UUID', 'Amount', 'Method', 'Gateway Status', 'Internal Status', 'Created At', 'Verified At']
    const rows = filteredPayments.map((payment) => [
      payment.userName || 'Unknown User',
      payment.tournamentName || 'Untitled Tournament',
      payment.id,
      payment.transactionUuid,
      String(payment.amount),
      payment.paymentMethod,
      payment.gatewayStatus || 'PENDING',
      payment.status,
      payment.createdAt,
      payment.verifiedAt || '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'khoj-payments-export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAction = async (action: AdminFinanceAction, paymentId: string, notes?: string) => {
    setBusyAction(action)

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, action, notes }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : action === 'deleteRecord'
              ? 'Failed to delete payment record'
              : 'Unable to update payment'
        )
      }

      toast.success(
        action === 'deleteRecord'
          ? 'Payment record deleted successfully'
          : typeof payload?.message === 'string'
            ? payload.message
            : 'Finance record updated successfully'
      )
      await loadDashboard()
    } catch (error) {
      console.error('Finance action failed:', error)
      toast.error(action === 'deleteRecord' ? 'Failed to delete payment record' : error instanceof Error ? error.message : 'Unable to update finance record')
    } finally {
      setBusyAction(null)
    }
  }

  const handlePayoutSent = async (payout: PayoutRecord) => {
    setBusyAction('markPayoutSent')

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payoutId: payout.id, payout, action: 'markPayoutSent' }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update payout')
      }

      toast.success(typeof payload?.message === 'string' ? payload.message : 'Payout marked as sent')
      await loadDashboard()
    } catch (error) {
      console.error('Payout action failed:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to update payout')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-khoj-accent font-body">FINANCE OPERATIONS</p>
          <h1 className="mt-2 text-4xl font-display font-bold text-khoj-text">Payments & Payouts</h1>
          <p className="mt-2 text-khoj-subtle">
            Track incoming tournament payments, verify eSewa transactions, manage winner payouts, and review tournament financial performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void loadDashboard()} loading={loading}>
            Refresh Data
          </Button>
          <Button onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross Collected" value={'Rs ' + metrics.grossCollected.toLocaleString()} sub="Paid + verified intake" accent="orange" />
        <StatCard label="Pending Verification" value={metrics.pendingVerification} sub="Awaiting gateway review" accent="gold" />
        <StatCard label="Failed Payments" value={metrics.failedPayments} sub="Rejected or unsuccessful" accent="orange" />
        <StatCard label="Verified Collected" value={'Rs ' + metrics.verifiedCollected.toLocaleString()} sub="Approved tournament revenue" accent="teal" />
        <StatCard label="Prize Payouts Owed" value={'Rs ' + metrics.prizePayoutsOwed.toLocaleString()} sub="Outstanding winner liability" accent="gold" />
        <StatCard label="Prize Payouts Sent" value={'Rs ' + metrics.prizePayoutsSent.toLocaleString()} sub="Settled payout ledger" accent="teal" />
        <StatCard label="Net Balance Held" value={'Rs ' + metrics.netBalanceHeld.toLocaleString()} sub="Collection minus sent payouts" accent="orange" />
        <StatCard label="Active Paid Tournaments" value={metrics.activePaidTournaments} sub="Revenue-positive active events" accent="teal" />
      </div>

      <FinanceFilterBar
        filters={filters}
        tournamentOptions={tournamentOptions}
        onChange={handleFilterChange}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <FinanceInsightStrip
        collectionRate={metrics.collectionRate}
        outstandingLiability={metrics.prizePayoutsOwed}
        highestRevenueTournament={metrics.highestRevenueTournament}
      />

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body">Incoming Payments</p>
          <h2 className="text-2xl font-display font-bold text-khoj-text mt-1">Incoming Payments</h2>
        </div>

        <PaymentReviewTable
          payments={filteredPayments}
          loading={loading}
          busyAction={busyAction}
          onAction={handleAction}
        />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body">Winner Payouts</p>
          <h2 className="text-2xl font-display font-bold text-khoj-text mt-1">Winner Payouts</h2>
        </div>

        <WinnerPayoutsTable payouts={filteredPayouts} loading={loading} onMarkSent={handlePayoutSent} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body">Tournament Financial Breakdown</p>
          <h2 className="text-2xl font-display font-bold text-khoj-text mt-1">Tournament Financial Breakdown</h2>
        </div>

        <TournamentFinancialBreakdownTable
          rows={filteredFinancials}
          loading={loading}
          onFocusTournament={(tournamentName) => setFilters((current) => ({ ...current, tournament: tournamentName }))}
        />
      </section>

      <RecentFinanceActivity items={recentActivity} />

      <Card className="border-khoj-accent/20 bg-khoj-accent/5">
        <p className="text-sm text-khoj-subtle">
          Data flow: tournament payments are created as pending at checkout, verified through eSewa on callback, surfaced in this finance queue, and then approved into tournament access while payout obligations are tracked separately.
        </p>
      </Card>
    </div>
  )
}
