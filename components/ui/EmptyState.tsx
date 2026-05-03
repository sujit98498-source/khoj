// components/ui/EmptyState.tsx

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon = '◈', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <span className="text-4xl text-khoj-muted mb-4 font-display">{icon}</span>
      <h3 className="text-lg font-display font-bold text-khoj-text mb-2">{title}</h3>
      <p className="text-sm text-khoj-subtle font-body max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
