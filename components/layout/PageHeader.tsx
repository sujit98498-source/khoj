// components/layout/PageHeader.tsx

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  eyebrow?: string
}

export function PageHeader({ title, subtitle, action, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-10">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-display font-bold text-khoj-text tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-khoj-subtle font-body mt-1.5 max-w-xl">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
