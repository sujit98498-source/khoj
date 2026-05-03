// components/recruiter/RecruiterFilters.tsx
// Extended filter panel for the Recruiter Dashboard.
// Adds profile score tier filter and recruiter-specific sort options
// on top of the same field/country/XP/wins/availability filters.

'use client'

import clsx from 'clsx'
import { TIER_THRESHOLDS } from '@/lib/portfolio/profileScore'
import { TALENT_SKILLS } from '@/lib/talent/mockTalentData'

export type RecruiterSortOption =
  | 'score'        // profile strength DESC
  | 'xp'           // XP DESC
  | 'rank'         // global rank ASC
  | 'wins'         // tournament wins DESC
  | 'newest'       // createdAt DESC
  | 'achievements' // achievement count DESC

export interface RecruiterFilterState {
  search: string
  fields: string[]
  /** Specific skills that ALL must appear in user.skills */
  skills: string[]
  country: string
  minXP: number
  minWins: number
  /** Minimum profile score (0 = any). Tied to TIER_THRESHOLDS. */
  minProfileScore: number
  availableOnly: boolean
  verifiedOnly: boolean
  sort: RecruiterSortOption
}

export const DEFAULT_RECRUITER_FILTERS: RecruiterFilterState = {
  search: '',
  fields: [],
  skills: [],
  country: '',
  minXP: 0,
  minWins: 0,
  minProfileScore: 0,
  availableOnly: false,
  verifiedOnly: false,
  sort: 'score',
}

const ALL_FIELDS = ['Coding', 'Design', 'Esports', 'Startups', 'Career']

const XP_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '500+', value: 500 },
  { label: '1K+', value: 1000 },
  { label: '2K+', value: 2000 },
]

const WINS_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '1+', value: 1 },
  { label: '3+', value: 3 },
  { label: '5+', value: 5 },
]

const SCORE_PRESETS = [
  { label: 'Any',             value: 0 },
  { label: 'Rising (25+)',    value: 25 },
  { label: 'Strong (50+)',    value: 50 },
  { label: 'Ready (75+)',     value: 75 },
  { label: 'Elite (90+)',     value: 90 },
]

const SORT_OPTIONS: { value: RecruiterSortOption; label: string }[] = [
  { value: 'score',        label: 'Profile Strength' },
  { value: 'xp',           label: 'Top XP' },
  { value: 'rank',         label: 'Top Ranked' },
  { value: 'wins',         label: 'Most Wins' },
  { value: 'achievements', label: 'Most Achievements' },
  { value: 'newest',       label: 'Newest' },
]

interface RecruiterFiltersProps {
  filters: RecruiterFilterState
  onChange: (next: RecruiterFilterState) => void
  countries: string[]
  resultCount: number
  compact?: boolean
}

export function RecruiterFilters({
  filters,
  onChange,
  countries,
  resultCount,
  compact,
}: RecruiterFiltersProps) {
  function set<K extends keyof RecruiterFilterState>(key: K, val: RecruiterFilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  function toggleField(field: string) {
    const next = filters.fields.includes(field)
      ? filters.fields.filter((f) => f !== field)
      : [...filters.fields, field]
    set('fields', next)
  }

  function toggleSkill(skill: string) {
    const next = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill]
    set('skills', next)
  }

  const isDefault =
    filters.search === '' &&
    filters.fields.length === 0 &&
    filters.skills.length === 0 &&
    filters.country === '' &&
    filters.minXP === 0 &&
    filters.minWins === 0 &&
    filters.minProfileScore === 0 &&
    !filters.availableOnly &&
    !filters.verifiedOnly &&
    filters.sort === 'score'

  function FilterLabel({ children }: { children: React.ReactNode }) {
    return (
      <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">
        {children}
      </label>
    )
  }

  function PillButton({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'text-[10px] px-2.5 py-1 rounded-sm border font-body transition-all duration-150',
          active
            ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
            : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      {!compact && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-body text-khoj-subtle">Filters</h2>
          {!isDefault && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_RECRUITER_FILTERS })}
              className="text-[10px] font-body text-khoj-accent hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* ── Sort ── */}
      <div>
        <FilterLabel>Sort by</FilterLabel>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set('sort', o.value)}
              className={clsx(
                'text-left text-[10px] px-2.5 py-1.5 rounded-sm border font-body transition-all duration-150',
                filters.sort === o.value
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Profile strength ── */}
      <div>
        <FilterLabel>Min Profile Strength</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {SCORE_PRESETS.map((p) => (
            <PillButton
              key={p.value}
              active={filters.minProfileScore === p.value}
              onClick={() => set('minProfileScore', p.value)}
            >
              {p.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* ── Category ── */}
      <div>
        <FilterLabel>Category</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {ALL_FIELDS.map((field) => (
            <PillButton
              key={field}
              active={filters.fields.includes(field)}
              onClick={() => toggleField(field)}
            >
              {field}
            </PillButton>
          ))}
        </div>
      </div>

      {/* ── Skills ── */}
      <div>
        <FilterLabel>Skills</FilterLabel>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {TALENT_SKILLS.slice(0, 24).map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={clsx(
                'text-[10px] px-2 py-0.5 rounded-sm border font-body transition-all duration-150',
                filters.skills.includes(skill)
                  ? 'bg-khoj-teal/15 border-khoj-teal/50 text-khoj-teal'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-teal/30 hover:text-khoj-text'
              )}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* ── Country ── */}
      <div>
        <FilterLabel>Country</FilterLabel>
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
        <FilterLabel>Min XP</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {XP_PRESETS.map((p) => (
            <PillButton
              key={p.value}
              active={filters.minXP === p.value}
              onClick={() => set('minXP', p.value)}
            >
              {p.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* ── Min Wins ── */}
      <div>
        <FilterLabel>Min Wins</FilterLabel>
        <div className="flex flex-wrap gap-1.5">
          {WINS_PRESETS.map((p) => (
            <PillButton
              key={p.value}
              active={filters.minWins === p.value}
              onClick={() => set('minWins', p.value)}
            >
              {p.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* ── Availability ── */}
      <label className="flex items-center justify-between cursor-pointer select-none">
        <span className="text-xs font-body text-khoj-text">Available now</span>
        <button
          type="button"
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
              filters.availableOnly ? 'left-[18px] bg-khoj-teal' : 'left-0.5 bg-khoj-subtle'
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

      {/* ── Result count ── */}
      <div className="pt-1 flex items-center justify-between border-t border-khoj-border/40 pt-3">
        <span className="text-[10px] font-body text-khoj-subtle">
          {resultCount} candidate{resultCount !== 1 ? 's' : ''} found
        </span>
        {!isDefault && compact && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_RECRUITER_FILTERS })}
            className="text-[10px] font-body text-khoj-accent hover:underline"
          >
            Reset all
          </button>
        )}
      </div>
    </div>
  )
}
