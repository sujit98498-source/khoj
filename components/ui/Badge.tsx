// components/ui/Badge.tsx

import clsx from 'clsx'

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'locked'
  size?: 'sm' | 'md'
}

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants = {
    default: 'bg-khoj-muted/40 text-khoj-subtle border-khoj-border',
    success: 'bg-khoj-teal/10 text-khoj-teal border-khoj-teal/30',
    warning: 'bg-khoj-gold/10 text-khoj-gold border-khoj-gold/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/30',
    locked: 'bg-khoj-muted/20 text-khoj-subtle/50 border-khoj-border/50',
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-3 py-1',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center font-body font-semibold tracking-wider uppercase border rounded-sm',
        variants[variant],
        sizes[size]
      )}
    >
      {label}
    </span>
  )
}
