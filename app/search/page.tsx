'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PeopleSearchBox } from '@/components/layout/PeopleSearchBox'
import { NetworkUserCard } from '@/components/network/NetworkUserCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { searchPeople, type PeopleSearchResult } from '@/services/peopleSearchService'
import { useAuth } from '@/hooks/useAuth'

function SearchPageContent() {
  const searchParams = useSearchParams()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const query = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams])
  const [results, setResults] = useState<PeopleSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function runSearch() {
      if (authLoading || !isAuthenticated) return
      if (!query) {
        setResults([])
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await searchPeople(query)
        if (active) setResults(data)
      } catch (err) {
        console.error('[KHOJ] People search failed:', err)
        if (active) {
          setResults([])
          setError('Could not search people right now. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void runSearch()
    return () => { active = false }
  }, [authLoading, isAuthenticated, query])

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-sm border border-khoj-border bg-khoj-card p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-semibold">
            People Search
          </p>
          <h1 className="mt-2 text-2xl font-display font-bold text-khoj-text">
            Find collaborators and teammates
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-khoj-subtle">
            Search founders, developers, designers, marketers, creators, mentors, and builders by name, role, skill, headline, or location.
          </p>
          <div className="mt-5 max-w-xl">
            <PeopleSearchBox className="w-full" initialValue={query} />
          </div>
        </div>

        {query ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-khoj-text">
                Results for <span className="text-khoj-accent">"{query}"</span>
              </p>
              {!loading && !error && (
                <p className="mt-0.5 text-xs text-khoj-subtle">
                  {results.length} people found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-khoj-border bg-khoj-card/40 p-8 text-center">
            <p className="text-sm font-semibold text-khoj-text">Start with a role, skill, or name.</p>
            <p className="mt-1 text-xs text-khoj-subtle">Try React, founder, designer, AI, marketer, mentor, or a city.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && query && results.length === 0 && (
          <div className="rounded-sm border border-dashed border-khoj-border bg-khoj-card/40 p-10 text-center">
            <p className="text-sm font-semibold text-khoj-text">
              No people found. Try searching by name, role, or skill.
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid gap-4">
            {results.map((user) => (
              <NetworkUserCard key={user.uid} user={user} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchPageContent />
    </Suspense>
  )
}
