'use client'

import { useEffect, useState } from 'react'
import { getAnnouncements } from '@/services/announcementService'
import { Announcement } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AnnouncementListProps {
  limit?: number
}

function formatAnnouncementDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AnnouncementList({ limit = 5 }: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadAnnouncements = async () => {
      try {
        const data = await getAnnouncements(limit)
        if (isMounted) {
          setAnnouncements(data)
        }
      } catch (error) {
        console.error('Failed to load announcements:', error)
        if (isMounted) {
          setAnnouncements([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadAnnouncements()

    return () => {
      isMounted = false
    }
  }, [limit])

  return (
    <Card glow>
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold mb-1">
          Announcements
        </p>
        <h2 className="text-xl font-display font-bold text-khoj-text">Latest updates</h2>
        <p className="text-sm text-khoj-subtle font-body mt-1">
          Read-only updates published by platform admins.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="sm" />
      ) : announcements.length === 0 ? (
        <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-6 text-sm text-khoj-subtle">
          No announcements yet
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display font-semibold text-khoj-text">
                    {announcement.title}
                  </h3>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-khoj-muted font-body whitespace-nowrap">
                  {formatAnnouncementDate(announcement.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-khoj-subtle font-body leading-relaxed">
                {announcement.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
