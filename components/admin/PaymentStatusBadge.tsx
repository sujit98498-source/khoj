import { Badge } from '@/components/ui/Badge'
import { PaymentStatus } from '@/lib/types'

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const normalized = status.toLowerCase() as PaymentStatus

  const variant =
    normalized === 'verified'
      ? 'success'
      : normalized === 'paid'
        ? 'info'
        : normalized === 'failed'
          ? 'danger'
          : 'warning'

  return <Badge label={normalized} variant={variant} size="md" />
}
