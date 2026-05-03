// app/talent/page.tsx
// Talent Search — discover talented KHOJ community members.
// Companies, founders, and recruiters can filter by skill, field, country, XP, etc.

'use client'

import { useState, useMemo, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TalentCard } from '@/components/talent/TalentCard'
import {
  TalentFilters,
  TalentFilterState,
  DEFAULT_FILTERS,
} from '@/components/talent/TalentFilters'
import { ALL_TALENT, TALENT_COUNTRIES } from '@/lib/talent/mockTalentData'
import type { PortfolioUser } from '@/lib/types'
import clsx from 'clsx'

// ── Filter + sort logic ───────────────────────────────────────────────────────

function applyFilters(users: PortfolioUser[], f: TalentFilterState): PortfolioUser[] {
  const q = f.search.trim().toLowerCase()

  let result = users.filter((u) => {
    // Text search: name, username, skills
    if (q) {
      const haystack = [u.name, u.username, ...(u.skills ?? [])].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    // Category / field
    if (f.fields.length > 0 && !f.fields.includes(u.field ?? '')) return false
    // Country
    if (f.country && u.country !== f.country) return false
    // Min XP
    if (u.xp < f.minXP) return false
    // Min wins
    if (u.wins < f.minWins) return false
    // Availability
    if (f.availableOnly && !u.availableForOpportunities) return false
    // Verified champion
    if (f.verifiedOnly && !u.verifiedChampion) return false
    return true
  })

  // Sort
  result = [...result].sort((a, b) => {
    if (f.sort === 'xp') return b.xp - a.xp
    if (f.sort === 'rank') return a.rank - b.rank
    if (f.sort === 'wins') return b.wins - a.wins
    return 0
  })

  return result
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TalentPage() {
  const [filters, setFilters] = useState<TalentFilterState>(DEFAULT_FILTERS)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const results = useMemo(() => applyFilters(ALL_TALENT, filters), [filters])

  const handleFiltersChange = useCallback((next: TalentFilterState) => {
    setFilters(next)
  }, [])

  const activeFilterCount = [
    filters.fields.length > 0,
    filters.country !== '',
    filters.minXP > 0,
    filters.minWins > 0,
    filters.availableOnly,
    filters.verifiedOnly,
    filters.search !== '',
  ].filter(Boolean).length

  return (
    <AppShell>
      <div className="min-h-screen bg-khoj-bg">
        {/* ── Page header ── */}
        <div className="border-b border-khoj-border bg-khoj-card/40 px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-display font-bold text-khoj-text tracking-tight">
                  Talent Search
                </h1>
                <p className="text-sm text-khoj-subtle font-body mt-1">
                  Discover skilled individuals from the KHOJ community — hire, collaborate, or connect.
                </p>
              </div>

              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className={clsx(
                  'lg:hidden flex items-center gap-2 text-xs font-body px-3 py-2 rounded-sm border transition-all',
                  mobileFiltersOpen || activeFilterCount > 0
                    ? 'bg-khoj-accent/10 border-khoj-accent/40 text-khoj-accent'
                    : 'bg-khoj-card border-khoj-border text-khoj-subtle'
                )}
              >
                <span>⊞ Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-khoj-accent text-white text-[9px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex gap-6 relative">
            {/* ══ Desktop filter sidebar ══ */}
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-6 bg-khoj-card border border-khoj-border rounded-sm p-4">
                <TalentFilters
                  filters={filters}
                  onChange={handleFiltersChange}
                  countries={TALENT_COUNTRIES}
                  resultCount={results.length}
                />
              </div>
            </aside>

            {/* ══ Mobile filter drawer ══ */}
            {mobileFiltersOpen && (
              <div className="lg:hidden fixed inset-0 z-40 flex">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setMobileFiltersOpen(false)}
                />
                {/* Panel */}
                <div className="relative ml-auto w-72 max-w-[90vw] bg-khoj-card border-l border-khoj-border h-full overflow-y-auto p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs uppercase tracking-widest font-body text-khoj-subtle">
                      Filters
                    </h2>
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="text-khoj-subtle hover:text-khoj-text transition-colors text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  <TalentFilters
                    filters={filters}
                    onChange={handleFiltersChange}
                    countries={TALENT_COUNTRIES}
                    resultCount={results.length}
                    compact
                  />
                </div>
              </div>
            )}

            {/* ══ Main content ══ */}
            <div className="flex-1 min-w-0">
              {/* Result summary bar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs font-body text-khoj-subtle">
                  <span className="text-khoj-text font-bold">{results.length}</span> talent
                  {results.length !== 1 ? 's' : ''} found
                  {filters.search && (
                    <> for <span className="text-khoj-accent">"{filters.search}"</span></>
                  )}
                </p>
                {/* Active filter chips */}
                <div className="flex flex-wrap gap-1.5">
                  {filters.fields.map((f) => (
                    <FilterChip
                      key={f}
                      label={f}
                      onRemove={() =>
                        handleFiltersChange({
                          ...filters,
                          fields: filters.fields.filter((x) => x !== f),
                        })
                      }
                    />
                  ))}
                  {filters.country && (
                    <FilterChip
                      label={filters.country}
                      onRemove={() => handleFiltersChange({ ...filters, country: '' })}
                    />
                  )}
                  {filters.availableOnly && (
                    <FilterChip
                      label="Open to work"
                      onRemove={() => handleFiltersChange({ ...filters, availableOnly: false })}
                    />
                  )}
                  {filters.verifiedOnly && (
                    <FilterChip
                      label="★ Champion"
                      onRemove={() => handleFiltersChange({ ...filters, verifiedOnly: false })}
                    />
                  )}
                </div>
              </div>

              {/* Talent grid */}
              {results.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map((user) => (
                    <TalentCard key={user.uid} user={user} />
                  ))}
                </div>
              ) : (
                <EmptyState onReset={() => handleFiltersChange({ ...DEFAULT_FILTERS })} />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-body px-2 py-0.5 bg-khoj-accent/10 border border-khoj-accent/30 text-khoj-accent rounded-sm">
      {label}
      <button
        onClick={onRemove}
        className="text-khoj-accent/70 hover:text-khoj-accent ml-0.5 leading-none"
        aria-label={`Remove ${label} filter`}
      >
        ✕
      </button>
    </span>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-khoj-border rounded-sm">
      <div className="text-4xl mb-4 opacity-30">◉</div>
      <h3 className="text-sm font-display font-semibold text-khoj-text mb-1">No talent found</h3>
      <p className="text-xs text-khoj-subtle font-body mb-4">
        Try adjusting your filters to see more results.
      </p>
      <button
        onClick={onReset}
        className="text-xs font-body text-khoj-accent hover:underline transition-colors"
      >
        Reset all filters
      </button>
    </div>
  )
}
