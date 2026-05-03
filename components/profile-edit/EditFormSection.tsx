// components/profile-edit/EditFormSection.tsx
// Shared wrapper card used by every edit section.
// Provides consistent heading, border, spacing and collapse toggle.

'use client'

import { useState } from 'react'
import clsx from 'clsx'

interface EditFormSectionProps {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
  completeness?: number // 0-100
}

export function EditFormSection({
  title,
  icon,
  children,
  defaultOpen = true,
  completeness,
}: EditFormSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-khoj-accent text-sm">{icon}</span>
          <span className="text-sm font-display font-semibold text-khoj-text">{title}</span>
          {completeness !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 bg-khoj-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-khoj-teal rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-[9px] text-khoj-subtle font-body">{completeness}%</span>
            </div>
          )}
        </div>
        <span
          className={clsx(
            'text-khoj-subtle text-xs transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        >
          ▾
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-khoj-border/50 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
