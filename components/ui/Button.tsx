// components/ui/Button.tsx

import { ReactNode, ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-body font-semibold tracking-wide transition-all duration-200 rounded-sm border disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-khoj-accent/50'

  const variants = {
    primary:
      'bg-khoj-accent border-khoj-accent text-white hover:bg-orange-500 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(255,77,0,0.4)]',
    secondary:
      'bg-transparent border-khoj-border text-khoj-text hover:border-khoj-accent hover:text-khoj-accent',
    ghost:
      'bg-transparent border-transparent text-khoj-subtle hover:text-khoj-text',
    danger:
      'bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-7 py-3.5',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
