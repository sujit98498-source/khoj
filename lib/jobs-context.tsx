// lib/jobs-context.tsx
// Central state context for the Jobs module.
// Provides live badge counts (applications, saved jobs, alerts, messages) to all
// components without prop drilling. Call refresh() after any save/apply/alert action
// to immediately propagate updated counts to the sidebar and other consumers.
//
// Mock-first: reads from localStorage via service helpers.
// Firebase-ready: swap service helpers for Firestore queries when ready.

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { getApplicationsByUser } from '@/services/hiringService'
import { getSavedJobCount } from '@/services/savedJobService'
import { getActiveAlertCount } from '@/services/jobAlertService'
import { getTotalUnread } from '@/services/messageService'

// ── Context shape ─────────────────────────────────────────────────────────────

interface JobsCounts {
  applications: number
  savedJobs: number
  activeAlerts: number
  unreadMessages: number
}

interface JobsContextValue extends JobsCounts {
  /** Call after any save/apply/alert mutation to sync badge counts immediately. */
  refresh: () => void
}

const defaultCounts: JobsCounts = {
  applications: 0,
  savedJobs: 0,
  activeAlerts: 0,
  unreadMessages: 0,
}

const JobsContext = createContext<JobsContextValue>({
  ...defaultCounts,
  refresh: () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

interface JobsProviderProps {
  userId: string | null
  children: React.ReactNode
}

export function JobsProvider({ userId, children }: JobsProviderProps) {
  const [counts, setCounts] = useState<JobsCounts>(defaultCounts)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reload = useCallback(() => {
    if (!userId) {
      setCounts(defaultCounts)
      return
    }
    // Sync counts that can be computed immediately
    const syncCounts = {
      applications: getApplicationsByUser(userId).length,
      savedJobs: getSavedJobCount(userId),
      activeAlerts: getActiveAlertCount(userId),
    }
    // Async unread count from Firestore
    getTotalUnread(userId)
      .then((unreadMessages) => {
        setCounts({ ...syncCounts, unreadMessages })
      })
      .catch(() => {
        setCounts({ ...syncCounts, unreadMessages: 0 })
      })
  }, [userId])

  useEffect(() => {
    reload()
    // Refresh counts periodically so unread messages stay current
    intervalRef.current = setInterval(reload, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [reload])

  const value: JobsContextValue = {
    ...counts,
    refresh: reload,
  }

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useJobs(): JobsContextValue {
  return useContext(JobsContext)
}
