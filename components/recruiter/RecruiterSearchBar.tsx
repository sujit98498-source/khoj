// components/recruiter/RecruiterSearchBar.tsx
// Top search + sort bar for the Recruiter Dashboard.
// Exposes a standalone search input separate from the filter sidebar.

'use client'

import clsx from 'clsx'
import type { RecruiterFilterState, RecruiterSortOption } from './RecruiterFilters'

const QUICK_SORTS: { value: RecruiterSortOption; label: string }[] = [
  { value: 'score',        label: 'Profile Strength' },
  { value: 'xp',           label: 'Top XP' },
  { value: 'rank',         label: 'Ranked' },
  { value: 'wins',         label: 'Wins' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'newest',       label: 'Newest' },
]

interface RecruiterSearchBarProps {
  filters: RecruiterFilterState
  onChange: (next: RecruiterFilterState) => void
  resultCount: number
  totalCount: number
}

export function RecruiterSearchBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: RecruiterSearchBarProps) {
  function set<K extends keyof RecruiterFilterState>(key: K, val: RecruiterFilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-khoj-muted text-sm pointer-events-none">
          ◎
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search by name, @username, or skill…"
          className="w-full bg-khoj-card border border-khoj-border rounded-sm pl-9 pr-4 py-2.5 text-sm text-khoj-text font-body placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/50 transition-colors"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => set('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-khoj-muted hover:text-khoj-text transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sort pills (desktop) */}
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
        {QUICK_SORTS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => set('sort', o.value)}
            className={clsx(
              'text-[10px] px-2.5 py-1.5 rounded-sm border font-body transition-all duration-150 whitespace-nowrap',
              filters.sort === o.value
                ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                : 'bg-khoj-card border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Sort select (mobile/tablet) */}
      <select
        value={filters.sort}
        onChange={(e) => set('sort', e.target.value as RecruiterSortOption)}
        className="lg:hidden bg-khoj-card border border-khoj-border rounded-sm px-3 py-2.5 text-xs text-khoj-text font-body focus:outline-none focus:border-khoj-accent/50 transition-colors flex-shrink-0"
      >
        {QUICK_SORTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Count badge */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs font-body text-khoj-subtle whitespace-nowrap">
          <span className="text-khoj-text font-semibold">{resultCount}</span>
          {resultCount !== totalCount ? `/${totalCount}` : ''} candidates
        </span>
      </div>
    </div>
  )
}
