'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { createTournament } from '@/services/tournamentService'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Tournament } from '@/lib/types'

interface AdminStats {
  totalUsers: number
  totalTournaments: number
  totalAnnouncements: number
  totalResults: number
  totalReports: number
}

function getInitialFormData(): Omit<Tournament, 'id' | 'participants' | 'currentPlayers'> {
  return {
    title: '',
    description: '',
    status: 'upcoming',
    maxPlayers: 8,
    startDate: '',
    endDate: '',
    prizeXP: 100,
    prizeMoney: 0,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    category: 'General',
  }
}

const QUICK_LINKS = [
  {
    href: '/admin/tournaments',
    icon: '◈',
    label: 'Manage Tournaments',
    description: 'Create, edit, and review competitions',
    color: 'text-khoj-accent',
  },
  {
    href: '/admin/announcements',
    icon: '◉',
    label: 'Announcements',
    description: 'Broadcast messages to all users',
    color: 'text-khoj-gold',
  },
  {
    href: '/admin/results',
    icon: '▲',
    label: 'Publish Results',
    description: 'Award XP and prizes to winners',
    color: 'text-khoj-teal',
  },
  {
    href: '/admin/reports',
    icon: '⚑',
    label: 'Reported Posts',
    description: 'Review community moderation flags',
    color: 'text-red-400',
  },
]

export default function AdminPage() {
  const [formData, setFormData] = useState<Omit<Tournament, 'id' | 'participants' | 'currentPlayers'>>(getInitialFormData())
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTournaments: 0,
    totalAnnouncements: 0,
    totalResults: 0,
    totalReports: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [users, tournaments, announcements, results, reports] = await Promise.all([
          getDocs(collection(db, COLLECTIONS.USERS)),
          getDocs(collection(db, COLLECTIONS.TOURNAMENTS)),
          getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS)),
          getDocs(collection(db, COLLECTIONS.RESULTS)),
          getDocs(collection(db, COLLECTIONS.COMMUNITY_REPORTS)),
        ])

        setStats({
          totalUsers: users.size,
          totalTournaments: tournaments.size,
          totalAnnouncements: announcements.size,
          totalResults: results.size,
          totalReports: reports.size,
        })
      } catch (err) {
        console.error('Admin stats error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setCreating(true)
      const tournamentId = await createTournament(formData)
      setMessage(`Tournament created successfully! ID: ${tournamentId}`)
      setFormData(getInitialFormData())
    } catch (error) {
      console.error('Failed to create tournament:', error)
      setMessage('Failed to create tournament')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Admin Panel"
        title="Control Center"
        subtitle="Manage tournaments, announcements, results, and platform operations from here."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger-children">
        <StatCard label="Total Users" value={loading ? '–' : stats.totalUsers} accent="orange" />
        <StatCard label="Tournaments" value={loading ? '–' : stats.totalTournaments} accent="gold" />
        <StatCard label="Announcements" value={loading ? '–' : stats.totalAnnouncements} accent="teal" />
        <StatCard label="Results" value={loading ? '–' : stats.totalResults} accent="orange" />
        <StatCard label="Reports" value={loading ? '–' : stats.totalReports} accent="gold" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card hover className="h-full transition-all duration-150 hover:border-khoj-accent/40">
              <span className={`text-2xl mb-4 block ${link.color}`}>{link.icon}</span>
              <h3 className="font-display font-bold text-khoj-text mb-1">{link.label}</h3>
              <p className="text-xs text-khoj-subtle font-body">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-khoj-accent/20 bg-khoj-accent/5">
        <div className="flex items-start gap-3">
          <span className="text-khoj-accent text-lg mt-0.5">⬢</span>
          <div>
            <p className="text-sm font-display font-semibold text-khoj-text mb-1">Admin-Only Zone</p>
            <p className="text-xs text-khoj-subtle font-body leading-relaxed">
              This panel requires <span className="text-khoj-accent font-semibold">role: &quot;admin&quot;</span> in Firestore.
              All actions affect live user data. Non-admins are automatically redirected to /dashboard.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-bold mb-6 text-khoj-text">Create Tournament</h2>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <Input
            label="Tournament Title"
            placeholder="e.g., DSA Championship"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Input
            label="Description"
            placeholder="What is this tournament about?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Players"
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) || 0 })}
              required
            />

            <Input
              label="Prize XP"
              type="number"
              value={formData.prizeXP}
              onChange={(e) => setFormData({ ...formData, prizeXP: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />

            <Input
              label="End Date"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Tournament['status'] })}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
              ]}
            />

            <Input
              label="Category"
              placeholder="e.g., Web Dev, DSA"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          {message && (
            <div className={`p-3 rounded-sm text-sm ${
              message.includes('successfully')
                ? 'bg-khoj-teal/10 text-khoj-teal'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {message}
            </div>
          )}

          <Button type="submit" loading={creating} className="w-full">
            Create Tournament
          </Button>
        </form>
      </Card>
    </div>
  )
}
