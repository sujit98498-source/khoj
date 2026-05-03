// components/jobs/ApplicationStatusBadge.tsx
// Colored pill badge for application pipeline stages.
// Used in ApplicantTable, user Applications dashboard, and job cards.

'use client'

import type { ApplicationStage } from '@/lib/types'
import clsx from 'clsx'

const STAGE_CONFIG: Record<
  ApplicationStage,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  applied: {
    label: 'Applied',
    dot: 'bg-blue-400',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  shortlisted: {
    label: 'Shortlisted',
    dot: 'bg-khoj-gold',
    bg: 'bg-khoj-gold/10',
    text: 'text-khoj-gold',
    border: 'border-khoj-gold/20',
  },
  interview: {
    label: 'Interview',
    dot: 'bg-purple-400',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  offered: {
    label: 'Offered',
    dot: 'bg-khoj-teal',
    bg: 'bg-khoj-teal/10',
    text: 'text-khoj-teal',
    border: 'border-khoj-teal/20',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-red-400',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  hired: {
    label: 'Hired ✓',
    dot: 'bg-khoj-accent',
    bg: 'bg-khoj-accent/10',
    text: 'text-khoj-accent',
    border: 'border-khoj-accent/20',
  },
}

interface ApplicationStatusBadgeProps {
  stage: ApplicationStage
  /** 'sm' (default) | 'xs' | 'md' */
  size?: 'xs' | 'sm' | 'md'
}

export function ApplicationStatusBadge({
  stage,
  size = 'sm',
}: ApplicationStatusBadgeProps) {
  const cfg = STAGE_CONFIG[stage]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-sm border font-body font-medium',
        cfg.bg,
        cfg.text,
        cfg.border,
        size === 'xs' && 'text-[9px] px-1.5 py-0.5 uppercase tracking-widest',
        size === 'sm' && 'text-[10px] px-2 py-1 uppercase tracking-widest',
        size === 'md' && 'text-xs px-2.5 py-1.5'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

/** All stage values in pipeline order */
export const STAGE_ORDER: ApplicationStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'offered',
  'hired',
  'rejected',
]
