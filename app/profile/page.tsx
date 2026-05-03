'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getMatchHistory, updateUserSkills } from '@/services/userService'
import { getUserMemberships, getPortfolioActivities } from '@/lib/collaboration/roomQueries'
import type { PortfolioActivity } from '@/lib/collaboration/roomQueries'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PortfolioCard } from '@/components/portfolio/PortfolioCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MatchHistoryEntry } from '@/lib/types'
import type { UserRoomMembership } from '@/types/collaboration'
import toast from 'react-hot-toast'

const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'Go',
  'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'GraphQL', 'System Design',
  'DSA', 'Machine Learning', 'Figma', 'Swift', 'Kotlin', 'Rust'
]

export default function ProfilePage() {
  const { khojUser, loading } = useAuth()
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [editingSkills, setEditingSkills] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [savingSkills, setSavingSkills] = useState(false)
  const [memberships, setMemberships] = useState<UserRoomMembership[]>([])
  const [activities, setActivities] = useState<PortfolioActivity[]>([])

  useEffect(() => {
    if (!khojUser) return
    setSkills(khojUser.skills ?? [])
    getMatchHistory(khojUser.uid)
      .then((h) => {
        setMatchHistory(h)
        setLoadingHistory(false)
      })
      .catch(() => setLoadingHistory(false))
    getUserMemberships(khojUser.uid)
      .then(setMemberships)
      .catch(() => {})
    getPortfolioActivities(khojUser.uid)
      .then(setActivities)
      .catch(() => {})
  }, [khojUser])

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed || skills.includes(trimmed)) return
    setSkills((prev) => [...prev, trimmed])
    setNewSkill('')
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  const handleSaveSkills = async () => {
    if (!khojUser) return
    setSavingSkills(true)
    await updateUserSkills(khojUser.uid, skills)
    toast.success('Skills updated!')
    setEditingSkills(false)
    setSavingSkills(false)
  }

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center py-32"><LoadingSpinner /></div>
    </AppShell>
  )

  if (!khojUser) return null

  return (
    <AppShell>
      <PageHeader
        eyebrow="Portfolio"
        title="Your Profile"
        subtitle="Your public performance portfolio — built from real competition results."
        action={
          <div className="flex items-center gap-2 bg-khoj-card border border-khoj-border rounded-sm px-4 py-2">
            <span className="text-[10px] text-khoj-subtle font-body uppercase tracking-wider">User ID</span>
            <code className="text-[10px] font-mono text-khoj-accent select-all">{khojUser.uid}</code>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main portfolio */}
        <div className="lg:col-span-2">
          {loadingHistory ? (
            <LoadingSpinner />
          ) : (
            <PortfolioCard
              user={{ ...khojUser, skills }}
              matchHistory={matchHistory}
            />
          )}
        </div>

        {/* Sidebar — skill editor */}
        <div className="space-y-5">
          {/* Skills editor */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body">Skills</p>
              {!editingSkills ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingSkills(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingSkills(false); setSkills(khojUser.skills ?? []) }}>
                    Cancel
                  </Button>
                  <Button size="sm" loading={savingSkills} onClick={handleSaveSkills}>
                    Save
                  </Button>
                </div>
              )}
            </div>

            {editingSkills ? (
              <div className="space-y-4">
                {/* Current skills */}
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-xs px-2.5 py-1 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-150 flex items-center gap-1"
                    >
                      {skill} ✕
                    </button>
                  ))}
                  {skills.length === 0 && (
                    <p className="text-xs text-khoj-subtle font-body">No skills added yet</p>
                  )}
                </div>

                {/* Add custom skill */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(newSkill)}
                    className="flex-1 text-xs py-2"
                  />
                  <Button size="sm" variant="secondary" onClick={() => handleAddSkill(newSkill)}>
                    Add
                  </Button>
                </div>

                {/* Suggestions */}
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body mb-2">
                    Suggestions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleAddSkill(s)}
                        className="text-[10px] px-2 py-1 bg-khoj-muted/20 border border-khoj-border text-khoj-subtle rounded-sm font-body hover:border-khoj-accent/30 hover:text-khoj-accent transition-all duration-150"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.length === 0 ? (
                  <p className="text-xs text-khoj-subtle font-body">
                    No skills yet.{' '}
                    <button onClick={() => setEditingSkills(true)} className="text-khoj-accent hover:underline">
                      Add some →
                    </button>
                  </p>
                ) : (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-1 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body"
                    >
                      {skill}
                    </span>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* How XP works */}
          <Card>
            <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
              XP Breakdown
            </p>
            <div className="space-y-3">
              {[
                { label: 'Match Win', xp: '+100 XP', color: 'text-khoj-gold' },
                { label: 'Match Loss', xp: '+10 XP', color: 'text-khoj-subtle' },
                { label: 'Participation', xp: '+10 XP', color: 'text-khoj-subtle' },
                { label: 'Top 3 Bonus', xp: '+50 XP', color: 'text-khoj-teal' },
                { label: 'Tournament Win', xp: '+200 XP', color: 'text-khoj-accent' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-khoj-subtle font-body">{item.label}</span>
                  <span className={`text-xs font-mono font-semibold ${item.color}`}>{item.xp}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Startup Rooms ─────────────────────────────────────────────────── */}
      {memberships.length > 0 && (
        <section className="space-y-3 mt-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
            Startup Rooms
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map((m) => (
              <Link key={m.roomId} href={`/rooms/${m.roomId}`}>
                <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 hover:border-khoj-accent/40 transition-colors cursor-pointer space-y-1">
                  <p className="text-khoj-text text-sm font-semibold truncate">{m.title || 'Startup Room'}</p>
                  <p className="text-khoj-subtle text-xs capitalize">{m.roomRole} · {m.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Portfolio Activity Feed ────────────────────────────────────────── */}
      {activities.length > 0 && (
        <section className="space-y-3 mt-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
            Activity
          </p>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="bg-khoj-card border border-khoj-border rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="text-khoj-text text-sm font-medium">
                    Accepted as <span className="text-khoj-accent">{a.roleTitle}</span>
                    {a.startupName ? <> at <span className="text-khoj-gold">{a.startupName}</span></> : null}
                  </p>
                  {a.roomId && (
                    <Link href={`/rooms/${a.roomId}`} className="text-xs text-khoj-subtle hover:text-khoj-accent transition-colors">
                      View Room →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}
