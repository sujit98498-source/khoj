'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/services/announcementService'
import { Announcement } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface CreateFormProps {
  onSubmit: (title: string, message: string) => Promise<void>
  loading: boolean
}

function CreateForm({ onSubmit, loading }: CreateFormProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title required')
      return
    }
    if (!message.trim()) {
      toast.error('Message required')
      return
    }
    await onSubmit(title.trim(), message.trim())
    setTitle('')
    setMessage('')
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-text placeholder-khoj-subtle font-body focus:outline-none focus:border-khoj-accent transition-colors'

  return (
    <Card className="mb-8">
      <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-4">
        New Announcement
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-khoj-subtle font-body mb-1.5">
            Title *
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g., Season 2 is live!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-khoj-subtle font-body mb-1.5">
            Message *
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Write your message to all users..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
          <p className="text-[10px] text-khoj-muted mt-1 text-right font-body">{message.length}/500</p>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Publish Announcement
        </Button>
      </form>
    </Card>
  )
}

export default function AdminAnnouncementsPage() {
  const { user: adminUser } = useAdminGuard()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getAnnouncements(50)
      setAnnouncements(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (title: string, message: string) => {
    if (!adminUser) return
    setSubmitting(true)
    try {
      await createAnnouncement({ title, message, createdBy: adminUser.uid })
      toast.success('✓ Announcement published!')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to publish')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteAnnouncement(id)
      toast.success('Announcement deleted')
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        eyebrow="Admin · Announcements"
        title="Announcements"
        subtitle="Published messages appear in real-time on every user's dashboard."
      />

      <CreateForm onSubmit={handleCreate} loading={submitting} />

      <div>
        <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-4">
          Published ({announcements.length})
        </p>

        {loading ? (
          <LoadingSpinner />
        ) : announcements.length === 0 ? (
          <EmptyState icon="◉" title="No announcements" description="Publish your first announcement above." />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-khoj-text mb-1">{a.title}</h3>
                    <p className="text-sm text-khoj-subtle font-body leading-relaxed">{a.message}</p>
                    <p className="text-[10px] text-khoj-muted font-mono mt-3">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deletingId === a.id}
                    onClick={() => handleDelete(a.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
