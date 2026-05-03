'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TournamentFinancialBreakdown } from '@/lib/types'

interface TournamentFinancialBreakdownTableProps {
  rows: TournamentFinancialBreakdown[]
  loading?: boolean
  onFocusTournament: (tournamentName: string) => void
}

export function TournamentFinancialBreakdownTable({ rows, loading = false, onFocusTournament }: TournamentFinancialBreakdownTableProps) {
  if (loading) {
    return <Card className="text-khoj-subtle">Loading tournament finance breakdown...</Card>
  }

  if (rows.length === 0) {
    return <Card className="text-khoj-subtle">No tournament financial data is available yet.</Card>
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm font-body">
          <thead className="bg-khoj-bg/70 text-khoj-subtle uppercase tracking-widest text-[10px]">
            <tr>
              <th className="text-left px-4 py-3">Tournament</th>
              <th className="text-left px-4 py-3">Players Paid</th>
              <th className="text-left px-4 py-3">Total Collected</th>
              <th className="text-left px-4 py-3">Prize Pool</th>
              <th className="text-left px-4 py-3">Prize Paid</th>
              <th className="text-left px-4 py-3">Prize Remaining</th>
              <th className="text-left px-4 py-3">Net Retained by KHOJ</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tournamentId} className="border-t border-khoj-border text-khoj-text align-top">
                <td className="px-4 py-3 font-semibold">{row.tournamentName}</td>
                <td className="px-4 py-3">{row.playersPaid}</td>
                <td className="px-4 py-3">Rs {row.totalCollected.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {row.prizePool.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {row.prizePaid.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {row.prizeRemaining.toLocaleString()}</td>
                <td className="px-4 py-3">Rs {row.netRetained.toLocaleString()}</td>
                <td className="px-4 py-3"><Badge label={row.status} variant={row.status === 'completed' ? 'default' : row.status === 'active' ? 'success' : 'warning'} size="md" /></td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => onFocusTournament(row.tournamentName)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
