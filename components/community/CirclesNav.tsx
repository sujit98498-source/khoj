// components/community/CirclesNav.tsx
// Horizontal circle/category filter tabs
// Shows "All" + each circle; highlights active

'use client'

import { CIRCLES, CircleId } from '@/lib/types'
import clsx from 'clsx'

interface CirclesNavProps {
  active: CircleId | undefined
  onChange: (circle: CircleId | undefined) => void
}

export function CirclesNav({ active, onChange }: CirclesNavProps) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-5">
      <button
        onClick={() => onChange(undefined)}
        className={clsx(
          'px-3.5 py-1.5 rounded-sm border text-xs font-body font-semibold transition-all duration-150',
          active === undefined
            ? 'bg-khoj-accent border-khoj-accent text-white'
            : 'border-khoj-border text-khoj-subtle hover:border-khoj-muted hover:text-khoj-text'
        )}
      >
        All
      </button>

      {CIRCLES.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={clsx(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border text-xs font-body font-semibold transition-all duration-150',
            active === c.id
              ? `border-current bg-current/10 ${c.color}`
              : 'border-khoj-border text-khoj-subtle hover:border-khoj-muted hover:text-khoj-text'
          )}
        >
          <span className="text-sm leading-none">{c.icon}</span>
          {c.label}
        </button>
      ))}
    </div>
  )
}