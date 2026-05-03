// app/jobs/page.tsx
// Opportunity Market — co-founder roles, startup jobs, internships, projects,
// funding pitches, competitions, and mentors all in one unified board.
// Existing recruiter-posted JobPost listings are preserved in the "Startup Jobs" tab.

'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { HiringJobCard } from '@/components/jobs/HiringJobCard'
import { OpportunityCard } from '@/components/jobs/OpportunityCard'
import { getActiveJobPosts } from '@/services/hiringService'
import { getOpenOpportunities } from '@/lib/collaboration/roomQueries'
import { PLACEHOLDER_BY_TYPE, PLACEHOLDER_OPPORTUNITIES } from '@/lib/jobs/opportunityData'
import type { JobPost, JobCategory, WorkType, Opportunity } from '@/lib/types'
import clsx from 'clsx'

// ── Tab definition ────────────────────────────────────────────────────────────
type TabId = 'all' | 'cofounder' | 'startup_job' | 'internship' | 'project' | 'funding' | 'competition' | 'mentor'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'all',         label: 'All',              icon: '◈' },
  { id: 'cofounder',   label: 'Co-founder Roles', icon: '⚡' },
  { id: 'startup_job', label: 'Startup Jobs',     icon: '◉' },
  { id: 'internship',  label: 'Internships',      icon: '◇' },
  { id: 'project',     label: 'Projects',         icon: '▦' },
  { id: 'funding',     label: 'Funding',          icon: '◈' },
  { id: 'competition', label: 'Competitions',     icon: '▲' },
  { id: 'mentor',      label: 'Mentors',          icon: '○' },
]

const CATEGORIES: JobCategory[] = [
  'Coding', 'Design', 'Esports', 'Startups', 'Marketing', 'Data', 'Product', 'Other',
]
const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-Site' },
]

function FilterChip({
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
        'text-[10px] font-body px-2.5 py-1 rounded-sm border transition-all duration-150',
        active
          ? 'bg-khoj-accent/10 border-khoj-accent/40 text-khoj-accent'
          : 'bg-khoj-card border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text',
      )}
    >
      {children}
    </button>
  )
}

// Competitions tab — just a redirect card to Tournaments
function CompetitionsRedirectCard() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 border border-dashed border-khoj-border rounded-sm py-16 text-center">
      <span className="text-4xl">▲</span>
      <div>
        <p className="text-sm font-body font-semibold text-khoj-text">
          Competitions live in Tournaments
        </p>
        <p className="text-xs font-body text-khoj-subtle mt-1 max-w-xs mx-auto">
          Browse upcoming coding, design, and esports competitions with real prize pools.
        </p>
      </div>
      <Link
        href="/tournaments"
        className="text-xs font-mono px-4 py-2 border border-khoj-accent/40 text-khoj-accent rounded-sm hover:bg-khoj-accent hover:text-white transition-all duration-150"
      >
        ▲ Go to Tournaments
      </Link>
    </div>
  )
}

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [liveOpps, setLiveOpps] = useState<Opportunity[]>([])
  const [oppsLoading, setOppsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null)
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null)

  useEffect(() => {
    setJobs(getActiveJobPosts())
  }, [])

  // Fetch live opportunities when on a non-job tab
  useEffect(() => {
    if (activeTab === 'startup_job' || activeTab === 'competition') return
    setOppsLoading(true)
    const type = activeTab === 'all' ? undefined : activeTab
    getOpenOpportunities(type, 50)
      .then((data) => setLiveOpps(data))
      .catch(() => {/* fall back to placeholder */})
      .finally(() => setOppsLoading(false))
  }, [activeTab])

  // ── Filtered Startup Jobs (existing pipeline) ─────────────────────────────
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (selectedCategory && j.category !== selectedCategory) return false
      if (selectedWorkType && j.workType !== selectedWorkType) return false
      if (q) {
        const hay = [j.title, j.company, j.location, ...j.requiredSkills].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [jobs, search, selectedCategory, selectedWorkType])

  // ── Filtered Opportunity listings ─────────────────────────────────────────
  const filteredOpportunities = useMemo<Opportunity[]>(() => {
    const q = search.trim().toLowerCase()
    // Use live data if available, else fall back to placeholders
    const source: Opportunity[] =
      liveOpps.length > 0
        ? liveOpps
        : activeTab === 'all'
        ? PLACEHOLDER_OPPORTUNITIES
        : (PLACEHOLDER_BY_TYPE[activeTab as keyof typeof PLACEHOLDER_BY_TYPE] ?? [])

    return source.filter((o) => {
      if (!q) return true
      const hay = [o.title, o.postedByName, o.startupName ?? '', ...o.skillsRequired]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [activeTab, search, liveOpps])

  // ── Total count shown in header ───────────────────────────────────────────
  const oppCount = liveOpps.length > 0 ? liveOpps.length
    : activeTab === 'all' ? PLACEHOLDER_OPPORTUNITIES.length
    : (PLACEHOLDER_BY_TYPE[activeTab as keyof typeof PLACEHOLDER_BY_TYPE] ?? []).length

  const totalCount =
    activeTab === 'all'
      ? jobs.length + oppCount
      : activeTab === 'startup_job'
      ? jobs.length
      : activeTab === 'competition'
      ? 0
      : oppCount

  const showJobFilters = activeTab === 'all' || activeTab === 'startup_job'
  const showCompetitions = activeTab === 'competition'

  return (
    <AppShell>
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-khoj-text tracking-tight">
          Opportunity Market
        </h1>
        <p className="text-sm font-body text-khoj-subtle mt-1">
          {totalCount > 0
            ? `${totalCount} opportunit${totalCount !== 1 ? 'ies' : 'y'} · `
            : ''}
          Co-founder roles, startup jobs, funding, internships, projects &amp; more
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-5 border-b border-khoj-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setSearch(''); setSelectedCategory(null); setSelectedWorkType(null) }}
            className={clsx(
              'flex items-center gap-1.5 text-xs font-mono whitespace-nowrap px-3 py-2.5 border-b-2 transition-all duration-150',
              activeTab === tab.id
                ? 'border-khoj-accent text-khoj-accent'
                : 'border-transparent text-khoj-subtle hover:text-khoj-text',
            )}
          >
            <span className="text-[10px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search + filters (only for jobs-capable tabs) ── */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-khoj-muted text-xs">◎</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'startup_job'
                ? 'Search by title, company, skill…'
                : 'Search opportunities…'
            }
            className="w-full bg-khoj-card border border-khoj-border rounded-sm pl-8 pr-4 py-2.5 text-sm font-body text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20 transition-colors"
          />
        </div>

        {/* Category + work-type filters — only for Startup Jobs and All tab */}
        {showJobFilters && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cat}
              </FilterChip>
            ))}
            <div className="w-px bg-khoj-border mx-1" />
            {WORK_TYPES.map((wt) => (
              <FilterChip
                key={wt.value}
                active={selectedWorkType === wt.value}
                onClick={() => setSelectedWorkType(selectedWorkType === wt.value ? null : wt.value)}
              >
                {wt.label}
              </FilterChip>
            ))}
            {(selectedCategory || selectedWorkType || search) && (
              <button
                type="button"
                onClick={() => { setSelectedCategory(null); setSelectedWorkType(null); setSearch('') }}
                className="text-[10px] font-body text-khoj-muted hover:text-red-400 transition-colors px-1"
              >
                Clear ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {showCompetitions ? (
        <div className="grid grid-cols-1">
          <CompetitionsRedirectCard />
        </div>
      ) : activeTab === 'startup_job' ? (
        // ── Pure Startup Jobs tab (existing HiringJobCard pipeline) ──────────
        filteredJobs.length === 0 ? (
          <EmptyState onClear={() => { setSelectedCategory(null); setSelectedWorkType(null); setSearch('') }} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <HiringJobCard key={job.id} job={job} expired={new Date(job.deadline) < new Date()} />
            ))}
          </div>
        )
      ) : activeTab === 'all' ? (
        // ── All tab — mix of JobPosts + Opportunities ─────────────────────────
        filteredJobs.length === 0 && filteredOpportunities.length === 0 ? (
          <EmptyState onClear={() => { setSelectedCategory(null); setSelectedWorkType(null); setSearch('') }} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <HiringJobCard key={job.id} job={job} expired={new Date(job.deadline) < new Date()} />
            ))}
            {filteredOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )
      ) : (
        // ── All other opportunity tabs ────────────────────────────────────────
        filteredOpportunities.length === 0 ? (
          <EmptyState onClear={() => setSearch('')} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )
      )}
    </AppShell>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <span className="text-4xl text-khoj-muted">◈</span>
      <p className="text-sm font-body text-khoj-subtle">Nothing found matching your search.</p>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-body text-khoj-accent hover:underline"
      >
        Clear filters
      </button>
    </div>
  )
}
