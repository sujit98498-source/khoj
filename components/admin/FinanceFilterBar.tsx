'use client'

import { Button } from '@/components/ui/Button'

export interface FinanceFilters {
  search: string
  status: string
  tournament: string
  method: string
  dateRange: string
  sortBy: string
}

interface FinanceFilterBarProps {
  filters: FinanceFilters
  tournamentOptions: string[]
  onChange: (key: keyof FinanceFilters, value: string) => void
  onReset: () => void
}

export function FinanceFilterBar({ filters, tournamentOptions, onChange, onReset }: FinanceFilterBarProps) {
  const baseInput = 'w-full rounded-sm border border-khoj-border bg-khoj-card px-3 py-2 text-sm text-khoj-text outline-none transition-colors focus:border-khoj-accent'

  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card p-4 space-y-4">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
        <input
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder="Search tournament, user, payment ref, or transaction ID"
          className={baseInput}
        />

        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} className={baseInput}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="verified">Verified</option>
          <option value="failed">Failed</option>
        </select>

        <select value={filters.tournament} onChange={(event) => onChange('tournament', event.target.value)} className={baseInput}>
          <option value="all">All Tournaments</option>
          {tournamentOptions.map((tournament) => (
            <option key={tournament} value={tournament}>{tournament}</option>
          ))}
        </select>

        <select value={filters.method} onChange={(event) => onChange('method', event.target.value)} className={baseInput}>
          <option value="all">All Methods</option>
          <option value="esewa">eSewa</option>
        </select>

        <select value={filters.dateRange} onChange={(event) => onChange('dateRange', event.target.value)} className={baseInput}>
          <option value="all">All Dates</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>

        <select value={filters.sortBy} onChange={(event) => onChange('sortBy', event.target.value)} className={baseInput}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>

        <Button variant="ghost" onClick={onReset}>Reset</Button>
      </div>
    </div>
  )
}
