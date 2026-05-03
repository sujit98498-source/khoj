// components/ui/Card.tsx

import { ReactNode, HTMLAttributes } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  glow?: boolean
}

export function Card({ children, className, hover = false, glow = false, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'bg-khoj-card border border-khoj-border rounded-sm p-6',
        hover && 'transition-all duration-300 hover:border-khoj-accent/40 hover:shadow-[0_0_30px_rgba(255,77,0,0.08)]',
        glow && 'border-khoj-accent/30 shadow-[0_0_20px_rgba(255,77,0,0.1)]',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: string
  accent?: 'orange' | 'gold' | 'teal'
}

export function StatCard({ label, value, sub, icon, accent = 'orange' }: StatCardProps) {
  const accentColors = {
    orange: 'text-khoj-accent',
    gold: 'text-khoj-gold',
    teal: 'text-khoj-teal',
  }

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm p-5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span className={clsx('text-sm', accentColors[accent])} aria-hidden>{icon}</span>}
        <span className="text-xs uppercase tracking-[0.15em] text-khoj-subtle font-body">{label}</span>
      </div>
      <span className={clsx('text-3xl font-display font-bold', accentColors[accent])}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-khoj-subtle font-body leading-snug mt-0.5">{sub}</span>}
    </div>
  )
}
