import { Card } from '@/components/ui/Card'

interface FinanceInsightStripProps {
  collectionRate: number
  outstandingLiability: number
  highestRevenueTournament: {
    name: string
    amount: number
  }
}

export function FinanceInsightStrip({ collectionRate, outstandingLiability, highestRevenueTournament }: FinanceInsightStripProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-khoj-accent/30 bg-gradient-to-br from-khoj-accent/10 to-transparent">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body mb-2">Collection Rate</p>
        <p className="text-3xl font-display font-bold text-khoj-text">{collectionRate.toFixed(1)}%</p>
        <p className="text-sm text-khoj-subtle mt-2">Share of payment attempts that cleared review or verification.</p>
      </Card>

      <Card className="border-khoj-gold/30 bg-gradient-to-br from-khoj-gold/10 to-transparent">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-gold font-body mb-2">Outstanding Prize Liability</p>
        <p className="text-3xl font-display font-bold text-khoj-text">Rs {outstandingLiability.toLocaleString()}</p>
        <p className="text-sm text-khoj-subtle mt-2">Prize money still due to verified winners and pending settlements.</p>
      </Card>

      <Card className="border-khoj-teal/30 bg-gradient-to-br from-khoj-teal/10 to-transparent">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-teal font-body mb-2">Highest Revenue Tournament</p>
        <p className="text-xl font-display font-bold text-khoj-text">{highestRevenueTournament.name}</p>
        <p className="text-sm text-khoj-subtle mt-2">Gross collected: Rs {highestRevenueTournament.amount.toLocaleString()}</p>
      </Card>
    </div>
  )
}
