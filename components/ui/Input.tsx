// components/ui/Input.tsx

import { InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs uppercase tracking-[0.12em] text-khoj-subtle font-body font-semibold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full bg-khoj-bg border border-khoj-border rounded-sm px-4 py-3',
            'text-sm text-khoj-text font-body placeholder:text-khoj-muted',
            'focus:outline-none focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20',
            'transition-all duration-200',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-400 font-body">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs uppercase tracking-[0.12em] text-khoj-subtle font-body font-semibold">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full bg-khoj-bg border border-khoj-border rounded-sm px-4 py-3',
          'text-sm text-khoj-text font-body',
          'focus:outline-none focus:border-khoj-accent/60',
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400 font-body">{error}</span>}
    </div>
  )
}
