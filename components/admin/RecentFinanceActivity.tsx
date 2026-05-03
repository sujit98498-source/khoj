import { Card } from '@/components/ui/Card'
import { FinanceActivity } from '@/lib/types'

interface RecentFinanceActivityProps {
  items: FinanceActivity[]
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function RecentFinanceActivity({ items }: RecentFinanceActivityProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body">Recent Finance Activity</p>
          <h3 className="text-xl font-display font-bold text-khoj-text mt-1">Latest operational movement</h3>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-khoj-subtle">Finance activity will appear here as payments and payouts are processed.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-khoj-text">{item.title}</p>
                <p className="text-sm text-khoj-subtle mt-1">{item.description}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-khoj-text">{typeof item.amount === 'number' ? 'Rs ' + item.amount.toLocaleString() : '—'}</p>
                <p className="text-xs text-khoj-subtle mt-1">{formatDate(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
