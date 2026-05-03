// components/talent/TalentFilters.tsx
// Filter sidebar + mobile filter panel for the Talent Search page.

'use client'

import clsx from 'clsx'

export type SortOption = 'xp' | 'rank' | 'wins'

export interface TalentFilterState {
  search: string
  fields: string[]
  country: string
  minXP: number
  minWins: number
  availableOnly: boolean
  verifiedOnly: boolean
  sort: SortOption
}

export const DEFAULT_FILTERS: TalentFilterState = {
  search: '',
  fields: [],
  country: '',
  minXP: 0,
  minWins: 0,
  availableOnly: false,
  verifiedOnly: false,
  sort: 'xp',
}

const ALL_FIELDS = ['Coding', 'Design', 'Esports', 'Startups', 'Career']

const XP_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
  { label: '1 000+', value: 1000 },
  { label: '2 000+', value: 2000 },
]

const WINS_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '1+', value: 1 },
  { label: '3+', value: 3 },
  { label: '5+', value: 5 },
]

interface TalentFiltersProps {
  filters: TalentFilterState
  onChange: (next: TalentFilterState) => void
  countries: string[]
  resultCount: number
  /** render compact (no label row) for mobile drawer */
  compact?: boolean
}

export function TalentFilters({ filters, onChange, countries, resultCount, compact }: TalentFiltersProps) {
  function set<K extends keyof TalentFilterState>(key: K, value: TalentFilterState[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleField(field: string) {
    const next = filters.fields.includes(field)
      ? filters.fields.filter((f) => f !== field)
      : [...filters.fields, field]
    set('fields', next)
  }

  const isDefault =
    filters.search === '' &&
    filters.fields.length === 0 &&
    filters.country === '' &&
    filters.minXP === 0 &&
    filters.minWins === 0 &&
    !filters.availableOnly &&
    !filters.verifiedOnly &&
    filters.sort === 'xp'

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      {!compact && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-body text-khoj-subtle">Filters</h2>
          {!isDefault && (
            <button
              onClick={() => onChange({ ...DEFAULT_FILTERS })}
              className="text-[10px] font-body text-khoj-accent hover:underline transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* ── Search ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1.5">
          Search
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Name, username, skill…"
          className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-xs text-khoj-text font-body placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/50 transition-colors"
        />
      </div>

      {/* ── Category / Field ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_FIELDS.map((field) => (
            <button
              key={field}
              onClick={() => toggleField(field)}
              className={clsx(
                'text-[10px] px-2.5 py-1 rounded-sm border font-body transition-all duration-150',
                filters.fields.includes(field)
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {field}
            </button>
          ))}
        </div>
      </div>

      {/* ── Country ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1.5">
          Country
        </label>
        <select
          value={filters.country}
          onChange={(e) => set('country', e.target.value)}
          className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-xs text-khoj-text font-body focus:outline-none focus:border-khoj-accent/50 transition-colors"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* ── Min XP ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">
          Min XP
        </label>
        <div className="flex flex-wrap gap-1.5">
          {XP_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => set('minXP', p.value)}
              className={clsx(
                'text-[10px] px-2.5 py-1 rounded-sm border font-body transition-all duration-150',
                filters.minXP === p.value
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Min Wins ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">
          Min Wins
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WINS_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => set('minWins', p.value)}
              className={clsx(
                'text-[10px] px-2.5 py-1 rounded-sm border font-body transition-all duration-150',
                filters.minWins === p.value
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Availability toggle ── */}
      <label className="flex items-center justify-between cursor-pointer select-none">
        <span className="text-xs font-body text-khoj-text">Open to opportunities only</span>
        <button
          role="switch"
          aria-checked={filters.availableOnly}
          onClick={() => set('availableOnly', !filters.availableOnly)}
          className={clsx(
            'w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0',
            filters.availableOnly
              ? 'bg-khoj-teal/30 border-khoj-teal/60'
              : 'bg-khoj-muted/20 border-khoj-border'
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200',
              filters.availableOnly
                ? 'left-[18px] bg-khoj-teal'
                : 'left-0.5 bg-khoj-subtle'
            )}
          />
        </button>
      </label>

      {/* ── Verified champion ── */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => set('verifiedOnly', e.target.checked)}
          className="sr-only"
        />
        <span
          className={clsx(
            'w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all duration-150',
            filters.verifiedOnly
              ? 'bg-khoj-gold/20 border-khoj-gold/60'
              : 'bg-transparent border-khoj-border group-hover:border-khoj-gold/40'
          )}
        >
          {filters.verifiedOnly && (
            <span className="text-khoj-gold text-[10px] leading-none">✓</span>
          )}
        </span>
        <span className="text-xs font-body text-khoj-text">Verified Champions only</span>
      </label>

      {/* ── Sort ── */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1.5">
          Sort by
        </label>
        <div className="flex gap-1.5">
          {(['xp', 'rank', 'wins'] as SortOption[]).map((s) => (
            <button
              key={s}
              onClick={() => set('sort', s)}
              className={clsx(
                'flex-1 text-[10px] py-1.5 rounded-sm border font-body capitalize transition-all duration-150',
                filters.sort === s
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {s === 'xp' ? 'XP' : s === 'rank' ? 'Rank' : 'Wins'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count + reset (compact) ── */}
      <div className="pt-1 flex items-center justify-between">
        <span className="text-[10px] font-body text-khoj-subtle">
          {resultCount} talent{resultCount !== 1 ? 's' : ''} found
        </span>
        {!isDefault && compact && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="text-[10px] font-body text-khoj-accent hover:underline transition-colors"
          >
            Reset all
          </button>
        )}
      </div>
    </div>
  )
}
