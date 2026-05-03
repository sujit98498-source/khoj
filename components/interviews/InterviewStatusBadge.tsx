// components/interviews/InterviewStatusBadge.tsx
// Colored pill badge representing an interview's lifecycle status.

import clsx from 'clsx'
import type { InterviewStatus } from '@/lib/types'

interface Props {
  status: InterviewStatus
  size?: 'xs' | 'sm' | 'md'
}

const STATUS_CONFIG: Record<
  InterviewStatus,
  { label: string; className: string; dot: string }
> = {
  scheduled: {
    label: 'Scheduled',
    dot: 'bg-blue-400',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  accepted: {
    label: 'Accepted',
    dot: 'bg-khoj-teal',
    className: 'bg-khoj-teal/10 text-khoj-teal border-khoj-teal/30',
  },
  declined: {
    label: 'Declined',
    dot: 'bg-red-400',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  reschedule_requested: {
    label: 'Reschedule Req.',
    dot: 'bg-khoj-gold',
    className: 'bg-khoj-gold/10 text-khoj-gold border-khoj-gold/30',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-khoj-accent',
    className: 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/30',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-khoj-muted',
    className: 'bg-khoj-card text-khoj-muted border-khoj-border',
  },
}

const SIZE_CLASS = {
  xs: 'text-[9px] px-1.5 py-0.5 gap-1',
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
}

export function InterviewStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={clsx(
        'inline-flex items-center font-body font-medium rounded-sm border',
        SIZE_CLASS[size],
        cfg.className
      )}
    >
      <span className={clsx('rounded-full flex-shrink-0', cfg.dot, size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
      {cfg.label}
    </span>
  )
}
