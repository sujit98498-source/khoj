// app/recruiter/page.tsx
// Recruiter / Company Talent Discovery Dashboard
//
// Layout:
//   Desktop — left filter sidebar · main grid · collapsible right shortlist panel
//   Mobile  — sticky top search bar · filter drawer · grid
//
// Data flow:
//   Mock: ALL_TALENT (15 users from lib/talent/mockTalentData.ts)
//   DB swap: replace ALL_TALENT with a Firestore query on 'portfolios' collection
//             filtered by availableForOpportunities, ordered by profileScore DESC
//   Score: calculateProfileScore(user) called per-user during filter + sort

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { RecruiterTalentCard } from '@/components/recruiter/RecruiterTalentCard'
import {
  RecruiterFilters,
  RecruiterFilterState,
  DEFAULT_RECRUITER_FILTERS,
} from '@/components/recruiter/RecruiterFilters'
import { RecruiterSearchBar } from '@/components/recruiter/RecruiterSearchBar'
import { ALL_TALENT, TALENT_COUNTRIES } from '@/lib/talent/mockTalentData'
import { calculateProfileScore } from '@/lib/portfolio/profileScore'
import {
  getSavedCandidates,
  toggleSavedCandidate,
  getShortlistedCandidates,
  toggleShortlistedCandidate,
} from '@/services/recruiterService'
import { useAuth } from '@/hooks/useAuth'
import type { PortfolioUser } from '@/lib/types'
import clsx from 'clsx'

// ── Filter + sort ──────────────────────────────────────────────────────────────

function applyFilters(users: PortfolioUser[], f: RecruiterFilterState): PortfolioUser[] {
  const q = f.search.trim().toLowerCase()

  let result = users.filter((u) => {
    // Text search: name, username, skills
    if (q) {
      const hay = [u.name, u.username ?? '', ...(u.skills ?? [])].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    // Category filter
    if (f.fields.length > 0 && !f.fields.includes(u.field ?? '')) return false
    // Skill filter — user must have ALL selected skills
    if (f.skills.length > 0) {
      const userSkills = (u.skills ?? []).map((s) => s.toLowerCase())
      const match = f.skills.every((fs) => userSkills.includes(fs.toLowerCase()))
      if (!match) return false
    }
    // Country
    if (f.country && u.country !== f.country) return false
    // Min XP
    if (u.xp < f.minXP) return false
    // Min wins
    if (u.wins < f.minWins) return false
    // Min profile score
    if (f.minProfileScore > 0) {
      const { score } = calculateProfileScore(u)
      if (score < f.minProfileScore) return false
    }
    // Available only
    if (f.availableOnly && !u.availableForOpportunities) return false
    // Verified champion only
    if (f.verifiedOnly && !u.verifiedChampion) return false
    return true
  })

  // Sort
  result = [...result].sort((a, b) => {
    switch (f.sort) {
      case 'score': {
        const sa = calculateProfileScore(a).score
        const sb = calculateProfileScore(b).score
        return sb - sa
      }
      case 'xp':           return b.xp - a.xp
      case 'rank':         return a.rank - b.rank
      case 'wins':         return b.wins - a.wins
      case 'achievements': return (b.achievements?.length ?? 0) - (a.achievements?.length ?? 0)
      case 'newest':       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:             return 0
    }
  })

  return result
}

// ── Aggregate stats strip ─────────────────────────────────────────────────────

function useStats(users: PortfolioUser[]) {
  return useMemo(() => {
    const total = users.length
    const available = users.filter((u) => u.availableForOpportunities).length
    const recruiterReady = users.filter((u) => calculateProfileScore(u).score >= 75).length
    const verified = users.filter((u) => u.verifiedChampion).length
    return { total, available, recruiterReady, verified }
  }, [users])
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const { khojUser } = useAuth()
  // Use a stable recruiter ID — in production this is the logged-in company UID
  const recruiterId = khojUser?.uid ?? 'guest'

  const [filters, setFilters] = useState<RecruiterFilterState>(DEFAULT_RECRUITER_FILTERS)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [shortlistPanelOpen, setShortlistPanelOpen] = useState(false)

  // Candidate list state — derived from localStorage on client
  const [saved, setSaved] = useState<string[]>([])
  const [shortlisted, setShortlisted] = useState<string[]>([])

  useEffect(() => {
    setSaved(getSavedCandidates(recruiterId))
    setShortlisted(getShortlistedCandidates(recruiterId))
  }, [recruiterId])

  const handleToggleSave = useCallback(
    (uid: string) => setSaved(toggleSavedCandidate(recruiterId, uid)),
    [recruiterId]
  )
  const handleToggleShortlist = useCallback(
    (uid: string) => setShortlisted(toggleShortlistedCandidate(recruiterId, uid)),
    [recruiterId]
  )

  const results = useMemo(() => applyFilters(ALL_TALENT, filters), [filters])
  const globalStats = useStats(ALL_TALENT)

  const activeFilterCount = [
    filters.fields.length > 0,
    filters.skills.length > 0,
    filters.country !== '',
    filters.minXP > 0,
    filters.minWins > 0,
    filters.minProfileScore > 0,
    filters.availableOnly,
    filters.verifiedOnly,
    filters.search !== '',
  ].filter(Boolean).length

  // Shortlisted users resolved from the full talent list
  const shortlistedUsers = useMemo(
    () => ALL_TALENT.filter((u) => shortlisted.includes(u.uid)),
    [shortlisted]
  )

  return (
    <AppShell>
      <div className="min-h-screen bg-khoj-bg">

        {/* ── Dashboard header ── */}
        <div className="border-b border-khoj-border bg-khoj-card/40 px-4 sm:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-khoj-accent text-sm">◈</span>
                  <span className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">
                    Recruiter Dashboard
                  </span>
                </div>
                <h1 className="text-2xl font-display font-bold text-khoj-text tracking-tight">
                  Talent Discovery
                </h1>
                <p className="text-sm text-khoj-subtle font-body mt-1">
                  Discover, shortlist, and contact top talent from the KHOJ community.
                </p>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Shortlist toggle */}
                <button
                  type="button"
                  onClick={() => setShortlistPanelOpen((v) => !v)}
                  className={clsx(
                    'flex items-center gap-2 text-xs font-body px-3 py-2 rounded-sm border transition-all',
                    shortlistPanelOpen || shortlisted.length > 0
                      ? 'bg-khoj-gold/10 border-khoj-gold/40 text-khoj-gold'
                      : 'bg-khoj-card border-khoj-border text-khoj-subtle hover:border-khoj-gold/30'
                  )}
                >
                  <span>★ Shortlist</span>
                  {shortlisted.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-khoj-gold text-khoj-bg text-[9px] flex items-center justify-center font-bold">
                      {shortlisted.length}
                    </span>
                  )}
                </button>

                {/* Mobile filter button */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className={clsx(
                    'lg:hidden flex items-center gap-2 text-xs font-body px-3 py-2 rounded-sm border transition-all',
                    activeFilterCount > 0
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

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Talent',      value: globalStats.total,         color: 'text-khoj-text' },
                { label: 'Available Now',     value: globalStats.available,      color: 'text-khoj-teal' },
                { label: 'Recruiter Ready',   value: globalStats.recruiterReady, color: 'text-khoj-gold' },
                { label: 'Champions',         value: globalStats.verified,       color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="bg-khoj-bg border border-khoj-border rounded-sm px-4 py-3"
                >
                  <p className={clsx('text-xl font-display font-bold', color)}>{value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* ── Search + sort bar ── */}
          <div className="mb-5">
            <RecruiterSearchBar
              filters={filters}
              onChange={setFilters}
              resultCount={results.length}
              totalCount={ALL_TALENT.length}
            />
          </div>

          {/* ── Active filter chips ── */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.fields.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  onRemove={() =>
                    setFilters((prev) => ({ ...prev, fields: prev.fields.filter((x) => x !== f) }))
                  }
                />
              ))}
              {filters.skills.map((s) => (
                <FilterChip
                  key={s}
                  label={s}
                  color="teal"
                  onRemove={() =>
                    setFilters((prev) => ({ ...prev, skills: prev.skills.filter((x) => x !== s) }))
                  }
                />
              ))}
              {filters.country && (
                <FilterChip
                  label={filters.country}
                  onRemove={() => setFilters((prev) => ({ ...prev, country: '' }))}
                />
              )}
              {filters.minProfileScore > 0 && (
                <FilterChip
                  label={`Score ≥ ${filters.minProfileScore}`}
                  onRemove={() => setFilters((prev) => ({ ...prev, minProfileScore: 0 }))}
                />
              )}
              {filters.availableOnly && (
                <FilterChip
                  label="Available now"
                  onRemove={() => setFilters((prev) => ({ ...prev, availableOnly: false }))}
                />
              )}
              {filters.verifiedOnly && (
                <FilterChip
                  label="Champions only"
                  onRemove={() => setFilters((prev) => ({ ...prev, verifiedOnly: false }))}
                />
              )}
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_RECRUITER_FILTERS)}
                className="text-[10px] font-body text-khoj-accent hover:underline px-1"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex gap-6 relative">
            {/* ══ Desktop filter sidebar ══ */}
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-6 bg-khoj-card border border-khoj-border rounded-sm p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <RecruiterFilters
                  filters={filters}
                  onChange={setFilters}
                  countries={TALENT_COUNTRIES}
                  resultCount={results.length}
                />
              </div>
            </aside>

            {/* ══ Main talent grid ══ */}
            <main className="flex-1 min-w-0">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <span className="text-4xl text-khoj-muted">◈</span>
                  <p className="text-sm text-khoj-subtle font-body text-center max-w-xs">
                    No candidates match your current filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_RECRUITER_FILTERS)}
                    className="text-xs font-body text-khoj-accent border border-khoj-accent/40 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map((user) => (
                    <RecruiterTalentCard
                      key={user.uid}
                      user={user}
                      saved={saved.includes(user.uid)}
                      shortlisted={shortlisted.includes(user.uid)}
                      onToggleSave={handleToggleSave}
                      onToggleShortlist={handleToggleShortlist}
                    />
                  ))}
                </div>
              )}
            </main>

            {/* ══ Shortlist side panel (desktop) ══ */}
            {shortlistPanelOpen && (
              <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
                <div className="sticky top-6 bg-khoj-card border border-khoj-border rounded-sm max-h-[calc(100vh-7rem)] flex flex-col">
                  <div className="px-4 py-3 border-b border-khoj-border flex items-center justify-between">
                    <h2 className="text-xs font-display font-semibold text-khoj-text">
                      Shortlist ({shortlisted.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShortlistPanelOpen(false)}
                      className="text-khoj-subtle hover:text-khoj-text text-sm leading-none transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {shortlistedUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-[10px] text-khoj-muted font-body">
                          Star a candidate to shortlist them.
                        </p>
                      </div>
                    ) : (
                      shortlistedUsers.map((u) => (
                        <ShortlistRow
                          key={u.uid}
                          user={u}
                          onRemove={() => handleToggleShortlist(u.uid)}
                        />
                      ))
                    )}
                  </div>

                  {shortlistedUsers.length > 0 && (
                    <div className="p-3 border-t border-khoj-border">
                      <button
                        type="button"
                        onClick={() =>
                          window.alert(
                            `Export ${shortlisted.length} shortlisted candidates to CSV — connect your ATS to enable this.`
                          )
                        }
                        className="w-full text-[10px] uppercase tracking-widest font-body py-2 border border-khoj-accent/40 text-khoj-accent rounded-sm hover:bg-khoj-accent/10 transition-colors"
                      >
                        Export Shortlist ↗
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* ══ Mobile filter drawer ══ */}
        {mobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="relative ml-auto w-72 max-w-[90vw] bg-khoj-card border-l border-khoj-border h-full overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-widest font-body text-khoj-subtle">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-khoj-subtle hover:text-khoj-text transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <RecruiterFilters
                filters={filters}
                onChange={setFilters}
                countries={TALENT_COUNTRIES}
                resultCount={results.length}
                compact
              />
            </div>
          </div>
        )}

        {/* ══ Mobile shortlist drawer ══ */}
        {shortlistPanelOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShortlistPanelOpen(false)}
            />
            <div className="relative ml-auto w-72 max-w-[90vw] bg-khoj-card border-l border-khoj-border h-full overflow-y-auto flex flex-col">
              <div className="px-5 py-4 border-b border-khoj-border flex items-center justify-between">
                <h2 className="text-sm font-display font-semibold text-khoj-text">
                  Shortlist ({shortlisted.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShortlistPanelOpen(false)}
                  className="text-khoj-subtle hover:text-khoj-text text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {shortlistedUsers.length === 0 ? (
                  <p className="text-xs text-khoj-muted font-body text-center py-8">
                    No candidates shortlisted yet.
                  </p>
                ) : (
                  shortlistedUsers.map((u) => (
                    <ShortlistRow
                      key={u.uid}
                      user={u}
                      onRemove={() => handleToggleShortlist(u.uid)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
  color = 'accent',
}: {
  label: string
  onRemove: () => void
  color?: 'accent' | 'teal'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-[10px] font-body px-2 py-0.5 rounded-sm border',
        color === 'teal'
          ? 'bg-khoj-teal/10 border-khoj-teal/30 text-khoj-teal'
          : 'bg-khoj-accent/10 border-khoj-accent/30 text-khoj-accent'
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity leading-none"
      >
        ✕
      </button>
    </span>
  )
}

function ShortlistRow({
  user,
  onRemove,
}: {
  user: PortfolioUser
  onRemove: () => void
}) {
  const { score, tierColor } = calculateProfileScore(user)

  return (
    <div className="flex items-center gap-2 p-2 rounded-sm bg-khoj-bg border border-khoj-border hover:border-khoj-gold/30 transition-colors group">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center text-xs font-display font-bold"
        style={{
          backgroundColor: `#FFB80018`,
          border: '1px solid #FFB80040',
          color: '#FFB800',
        }}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-sm" />
        ) : (
          user.name.charAt(0)
        )}
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={`/profile/${user.uid}`}
          className="text-xs font-body font-semibold text-khoj-text truncate hover:text-khoj-accent transition-colors block"
        >
          {user.name}
        </a>
        <p className={clsx('text-[9px] font-body', tierColor)}>{score}/100</p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-khoj-muted hover:text-khoj-accent text-xs opacity-0 group-hover:opacity-100 transition-all"
      >
        ✕
      </button>
    </div>
  )
}
