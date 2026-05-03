'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export function PeopleSearchBox({
  className,
  initialValue = '',
}: {
  className?: string
  initialValue?: string
}) {
  const router = useRouter()
  const [focused, setFocused] = useState(false)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = value.trim()
    if (!query) return
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <form
      role="search"
      aria-label="Search people"
      onSubmit={handleSubmit}
      className={clsx(
        'flex h-9 flex-shrink-0 items-center gap-2 rounded-sm border bg-khoj-card px-2 transition-colors',
        focused ? 'border-khoj-accent/50' : 'border-khoj-border',
        className,
      )}
    >
      <input
        type="search"
        value={value}
        placeholder="Search people, skills, startups..."
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="min-w-0 flex-1 bg-transparent text-sm text-khoj-text outline-none placeholder:text-khoj-muted"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        aria-label="Search people"
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-khoj-subtle transition-colors hover:bg-khoj-accent/10 hover:text-khoj-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-sm">⌕</span>
      </button>
    </form>
  )
}
