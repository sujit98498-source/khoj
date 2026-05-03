'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAllTournaments, getUserTournaments } from '@/services/tournamentService'
import { Tournament } from '@/lib/types'
import { TournamentList } from '@/components/tournament/TournamentList'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab    = 'upcoming' | 'active' | 'completed' | 'mine'
type CategoryFilter = 'all' | 'esports' | 'webdev' | 'design' | 'startup'
type EntryFilter  = 'all' | 'free' | 'paid'
type SortFilter   = 'newest' | 'xp' | 'players'

const TAB_LABELS: Record<FilterTab, string> = {
  upcoming:  'Upcoming',
  active:    'Live',
  completed: 'Completed',
  mine:      'My Tournaments',
}

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  upcoming:  'No upcoming tournaments at the moment. Check back soon.',
  active:    'No live tournaments right now.',
  completed: 'No completed tournaments yet.',
  mine:      'You have not joined any tournaments yet.',
}

// ── Sidebar filter section helper ─────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-subtle font-semibold px-1">
        {title}
      </p>
      {children}
    </div>
  )
}

function FilterBtn({
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
      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-khoj-accent/15 text-khoj-accent border border-khoj-accent/30'
          : 'text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/30 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const { khojUser } = useAuth()

  // Data
  const [tournaments,   setTournaments]   = useState<Tournament[]>([])
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([])
  const [loading,       setLoading]       = useState(true)

  // Filters
  const [tab,      setTab]      = useState<FilterTab>('upcoming')
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [entry,    setEntry]    = useState<EntryFilter>('all')
  const [sort,     setSort]     = useState<SortFilter>('newest')

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllTournaments()
      setTournaments(data)
      if (khojUser?.uid) {
        const mine = await getUserTournaments(khojUser.uid)
        setMyTournaments(mine)
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error)
    } finally {
      setLoading(false)
    }
  }, [khojUser?.uid])

  useEffect(() => { void fetchTournaments() }, [fetchTournaments])

  // Compute live count for Live badge
  const liveCount = tournaments.filter((t) => t.status === 'active').length

  const filtered = useMemo<Tournament[]>(() => {
    let list = tab === 'mine'
      ? myTournaments
      : tournaments.filter((t) => t.status === tab)

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        (t.name ?? t.title).toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
      )
    }

    // entry type
    if (entry === 'free')  list = list.filter((t) => !t.entryFee || t.entryFee === 0)
    if (entry === 'paid')  list = list.filter((t) => (t.entryFee ?? 0) > 0)

    // sort
    if (sort === 'xp')      list = [...list].sort((a, b) => (b.prizeXP ?? 0) - (a.prizeXP ?? 0))
    if (sort === 'players') list = [...list].sort((a, b) => (b.currentPlayers ?? 0) - (a.currentPlayers ?? 0))
    // 'newest' relies on natural Firestore order (no extra sort needed)

    return list
  }, [tab, tournaments, myTournaments, search, entry, sort])

  return (
    <AppShell>
      <div className="animate-slide-up space-y-6 pb-12">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <PageHeader
          eyebrow="KHOJ Tournaments"
          title="Tournaments"
          subtitle="Compete, prove your skills, earn XP, and climb the leaderboard."
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {liveCount} Live
                </span>
              )}
              <button
                onClick={() => setTab('mine')}
                className="px-3 py-1.5 bg-khoj-card border border-khoj-border rounded-lg text-xs font-semibold text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40 transition-all"
              >
                My Tournaments
              </button>
              {khojUser && (
                <Link href="/admin/tournaments">
                  <Button variant="secondary" size="sm">Create Tournament</Button>
                </Link>
              )}
            </div>
          }
        />

        {/* ── Two-column layout ────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* ── LEFT: Filter sidebar ─────────────────────────────────── */}
          {/* Mobile toggle button */}
          <button
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-khoj-card border border-khoj-border rounded-lg text-sm text-khoj-subtle hover:text-khoj-text transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 10h12M3 16h7" />
            </svg>
            Filters
          </button>

          <aside
            className={`
              flex-shrink-0 w-56
              bg-khoj-card border border-khoj-border rounded-xl p-4 space-y-5
              lg:sticky lg:top-6
              ${sidebarOpen ? 'block' : 'hidden'} lg:block
            `}
          >
            <p className="text-sm font-display font-bold text-khoj-text">Filters</p>

            <FilterSection title="Category">
              {([
                ['all',     'All'],
                ['esports', 'Esports'],
                ['webdev',  'Web Dev'],
                ['design',  'Design'],
                ['startup', 'Startup'],
              ] as [CategoryFilter, string][]).map(([val, label]) => (
                <FilterBtn key={val} active={category === val} onClick={() => setCategory(val)}>
                  {label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection title="Status">
              {([
                ['upcoming',  'Upcoming'],
                ['active',    'Live'],
                ['completed', 'Completed'],
              ] as [FilterTab, string][]).map(([val, label]) => (
                <FilterBtn key={val} active={tab === val} onClick={() => { setTab(val); setSidebarOpen(false) }}>
                  <span className="flex items-center gap-2">
                    {val === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />}
                    {label}
                  </span>
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection title="Entry Type">
              {([
                ['all',  'All'],
                ['free', 'Free'],
                ['paid', 'Paid'],
              ] as [EntryFilter, string][]).map(([val, label]) => (
                <FilterBtn key={val} active={entry === val} onClick={() => setEntry(val)}>
                  {label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection title="Sort By">
              {([
                ['newest',  'Newest'],
                ['xp',      'Highest XP'],
                ['players', 'Most Players'],
              ] as [SortFilter, string][]).map(([val, label]) => (
                <FilterBtn key={val} active={sort === val} onClick={() => setSort(val)}>
                  {label}
                </FilterBtn>
              ))}
            </FilterSection>
          </aside>

          {/* ── RIGHT: Content area ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ── Top bar: search + status tabs ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-khoj-subtle pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tournaments…"
                  className="w-full bg-khoj-card border border-khoj-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-khoj-text placeholder:text-khoj-subtle focus:outline-none focus:border-khoj-accent/60 transition-colors"
                />
              </div>

              {/* Tab pills */}
              <div className="flex gap-1 flex-shrink-0 flex-wrap">
                {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                      tab === t
                        ? 'bg-khoj-accent text-white shadow-[0_0_14px_rgba(255,77,0,0.35)]'
                        : 'bg-khoj-card border border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40'
                    }`}
                  >
                    {label}
                    {t === 'active' && liveCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {liveCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tournament list ── */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-khoj-card border border-khoj-border rounded-xl h-52 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-khoj-border bg-khoj-card px-8 py-16 text-center space-y-3">
                <p className="text-3xl">▲</p>
                <p className="text-khoj-text font-bold text-sm">No tournaments found</p>
                <p className="text-khoj-subtle text-xs max-w-xs mx-auto">{EMPTY_MESSAGES[tab]}</p>
              </div>
            ) : (
              <TournamentList tournaments={filtered} onJoined={fetchTournaments} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
