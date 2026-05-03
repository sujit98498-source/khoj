'use client'
// components/collaboration/StartupRolesPanel.tsx

import React, { useState } from 'react'
import toast from 'react-hot-toast'
import type { StartupRole, CollabRoom, RoomMember, RoleApplication, CompensationPreference } from '@/types/collaboration'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createStartupRole, submitRoleApplication } from '@/lib/collaboration/roomMutations'
import type { RolePublishMeta } from '@/lib/collaboration/roomMutations'
import { ROLE_CATEGORIES, ROLE_TYPE_LABELS } from '@/lib/collaboration/roomTypes'
import { EmptyState } from './EmptyState'

interface Props {
  roles: StartupRole[]
  room: CollabRoom
  myMember: RoomMember | null
  canManage: boolean
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  myApplications?: RoleApplication[]
  /** Legacy fallback — kept so existing callers don't break */
  onRequestToJoin?: (roleId: string) => void
}

// ── Co-founder Apply Modal ─────────────────────────────────────────────────────
interface ApplyModalProps {
  role: StartupRole
  room: CollabRoom
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string
  existingRejectedApp: boolean   // true → "Apply Again" (new application)
  onClose: () => void
}

function ApplyModal({ role, room, currentUserId, currentUserName, currentUserAvatar, existingRejectedApp, onClose }: ApplyModalProps) {
  const [message,                setMessage]                = useState('')
  const [skillsInput,            setSkillsInput]            = useState('')
  const [weeklyCommitment,       setWeeklyCommitment]       = useState<number | ''>(10)
  const [portfolioLink,          setPortfolioLink]          = useState('')
  const [compensationPreference, setCompensationPreference] = useState<CompensationPreference>('equity')
  const [introVideoLink,         setIntroVideoLink]         = useState('')
  const [submitting,             setSubmitting]             = useState(false)
  const [submitted,              setSubmitted]              = useState(false)
  const [err,                    setErr]                    = useState<string | null>(null)

  async function handleSubmit() {
    if (!message.trim()) { setErr('Please explain why you want to join.'); return }
    if (!weeklyCommitment || Number(weeklyCommitment) < 1) {
      setErr('Please enter a realistic weekly commitment.'); return
    }
    setSubmitting(true)
    setErr(null)
    try {
      const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      await submitRoleApplication(
        room.id,
        currentUserId,
        currentUserName,
        currentUserAvatar,
        role.id,
        role.title,
        message.trim(),
        portfolioLink.trim(),
        skills,
        Number(weeklyCommitment),
        compensationPreference,
        introVideoLink.trim() || undefined,
      )
      setSubmitted(true)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60'
  const labelCls = 'text-[11px] font-semibold text-khoj-subtle uppercase tracking-wide'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-khoj-card border border-khoj-border rounded-xl w-full max-w-lg shadow-2xl my-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-start justify-between gap-3">
          <div>
            <h2 className="text-khoj-text font-bold text-base">
              {existingRejectedApp ? 'Apply Again' : 'Apply as Co-founder'}
            </h2>
            <p className="text-khoj-subtle text-xs mt-0.5">
              {role.title}
              {role.category ? ` · ${role.category}` : ''}
              {' · '}<span className="text-khoj-text/60">{room.title}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-khoj-subtle hover:text-khoj-text p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <p className="text-khoj-text font-bold text-lg">Application Sent!</p>
            <p className="text-khoj-subtle text-sm max-w-sm mx-auto">
              The founder will review your application and reach out. Good luck!
            </p>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* Why do you want to join */}
            <label className="block">
              <span className={labelCls}>Why do you want to join this startup? *</span>
              <textarea
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="Describe your motivation, what excites you about this opportunity, and what you'll own."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={900}
              />
              <span className="text-[10px] text-khoj-subtle/60 float-right">{message.length}/900</span>
            </label>

            {/* Skills */}
            <label className="block">
              <span className={labelCls}>Skills you bring (comma-separated) *</span>
              <input
                className={inputCls}
                placeholder="e.g. React, Node.js, Product Strategy, Fundraising"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
            </label>

            {/* Weekly commitment + compensation */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>Weekly hours *</span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  className={inputCls}
                  placeholder="e.g. 20"
                  value={weeklyCommitment}
                  onChange={(e) => setWeeklyCommitment(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Preferred compensation</span>
                <select
                  className={inputCls}
                  value={compensationPreference}
                  onChange={(e) => setCompensationPreference(e.target.value as CompensationPreference)}
                >
                  <option value="equity">Equity only</option>
                  <option value="paid">Paid / Salary</option>
                  <option value="both">Equity + Paid</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </label>
            </div>

            {/* Portfolio link */}
            <label className="block">
              <span className={labelCls}>Portfolio / GitHub / KHOJ Profile</span>
              <input
                className={inputCls}
                placeholder="https://github.com/yourname"
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
              />
            </label>

            {/* Intro video */}
            <label className="block">
              <span className={labelCls}>Short intro video link (optional)</span>
              <input
                className={inputCls}
                placeholder="Loom, YouTube, or any public video URL"
                value={introVideoLink}
                onChange={(e) => setIntroVideoLink(e.target.value)}
              />
            </label>

            {err && <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{err}</p>}

            <div className="flex justify-end gap-3 pt-2 border-t border-khoj-border">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || !message.trim() || !skillsInput.trim()}
              >
                {submitting ? 'Submitting…' : existingRejectedApp ? 'Reapply' : 'Submit Application'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function StartupRolesPanel({
  roles, room, myMember, canManage,
  currentUserId, currentUserName, currentUserAvatar,
  myApplications = [],
  onRequestToJoin,
}: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title:           '',
    category:        '',
    roleType:        'cofounder' as any,
    seats:           1,
    description:     '',
    status:          'open' as const,
    skillsInput:     '',            // comma-separated, split before save
    compensationType: 'equity' as CompensationPreference,
    equityRange:     '',
    weeklyCommitment: '',
    publishToMarket:  true,
  })
  const [creating,     setCreating]     = useState(false)
  const [createErr,    setCreateErr]    = useState<string | null>(null)
  const [applyingRole, setApplyingRole] = useState<StartupRole | null>(null)

  async function handleCreate() {
    if (!myMember) return
    setCreating(true)
    setCreateErr(null)
    try {
      const skills = form.skillsInput.split(',').map((s) => s.trim()).filter(Boolean)
      const meta: RolePublishMeta = {
        roomTitle:    room.title,
        founderName:  currentUserName ?? '',
        founderUid:   myMember.userId,
        stage:        room.startup?.stage,
        locationMode: room.startup?.locationMode,
      }
      await createStartupRole(
        room.id,
        myMember.userId,
        {
          title:            form.title,
          category:         form.category,
          roleType:         form.roleType,
          seats:            form.seats,
          description:      form.description,
          status:           form.status,
          mustHaveSkills:   skills,
          compensationType: form.compensationType,
          equityRange:      form.equityRange || undefined,
          weeklyCommitment: form.weeklyCommitment || undefined,
          publishToMarket:  form.publishToMarket,
        },
        form.publishToMarket ? meta : undefined,
      )
      setShowCreate(false)
      setForm({
        title: '', category: '', roleType: 'cofounder', seats: 1, description: '',
        status: 'open', skillsInput: '', compensationType: 'equity',
        equityRange: '', weeklyCommitment: '', publishToMarket: true,
      })
      toast.success(form.publishToMarket ? 'Role created & published to Opportunity Market! 🚀' : 'Role created!')
    } catch (e: any) {
      setCreateErr(e.message ?? 'Failed to create role')
    } finally {
      setCreating(false)
    }
  }

  function getMyApplicationForRole(roleId: string): RoleApplication | undefined {
    return myApplications.find((a) => a.roleId === roleId)
  }

  // Founder of the room should never see the Apply button
  const isRoomOwner = currentUserId === room.createdBy
  const canApply    = !myMember && !!currentUserId && !isRoomOwner

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Add Role'}
          </Button>
        </div>
      )}

      {showCreate && (
        <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-5 space-y-4">
          <h4 className="text-khoj-text font-semibold text-sm">New Open Role</h4>

          {/* Row 1: Title + Category */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-khoj-subtle">Title *</span>
              <input
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                placeholder="e.g. CTO / Head of Engineering"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-xs text-khoj-subtle">Category</span>
              <select
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Select…</option>
                {ROLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {/* Row 2: Role Type + Seats */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-khoj-subtle">Role Type</span>
              <select
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                value={form.roleType}
                onChange={(e) => setForm((f) => ({ ...f, roleType: e.target.value as any }))}
              >
                {Object.entries(ROLE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-khoj-subtle">Seats</span>
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                value={form.seats}
                onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))}
              />
            </label>
          </div>

          {/* Description */}
          <label className="block">
            <span className="text-xs text-khoj-subtle">Description *</span>
            <textarea
              rows={2}
              className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
              placeholder="What will this person own? What are the key responsibilities?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          {/* Skills */}
          <label className="block">
            <span className="text-xs text-khoj-subtle">Required Skills (comma-separated)</span>
            <input
              className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
              placeholder="e.g. React, Node.js, AWS, Figma"
              value={form.skillsInput}
              onChange={(e) => setForm((f) => ({ ...f, skillsInput: e.target.value }))}
            />
          </label>

          {/* Row 3: Compensation + Equity Range */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-khoj-subtle">Compensation</span>
              <select
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                value={form.compensationType}
                onChange={(e) => setForm((f) => ({ ...f, compensationType: e.target.value as CompensationPreference }))}
              >
                <option value="equity">Equity only</option>
                <option value="paid">Paid / Salary</option>
                <option value="both">Equity + Paid</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-khoj-subtle">Equity Range (optional)</span>
              <input
                className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                placeholder="e.g. 5–15%"
                value={form.equityRange}
                onChange={(e) => setForm((f) => ({ ...f, equityRange: e.target.value }))}
              />
            </label>
          </div>

          {/* Weekly Commitment */}
          <label className="block">
            <span className="text-xs text-khoj-subtle">Weekly Commitment</span>
            <input
              className="mt-1 w-full bg-khoj-card border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
              placeholder="e.g. 20–30 hrs / week or Full-time"
              value={form.weeklyCommitment}
              onChange={(e) => setForm((f) => ({ ...f, weeklyCommitment: e.target.value }))}
            />
          </label>

          {/* Publish toggle */}
          <label className="flex items-start gap-3 cursor-pointer bg-khoj-accent/5 border border-khoj-accent/20 rounded-lg p-3">
            <input
              type="checkbox"
              checked={form.publishToMarket}
              onChange={(e) => setForm((f) => ({ ...f, publishToMarket: e.target.checked }))}
              className="accent-khoj-accent w-4 h-4 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-khoj-text text-sm font-semibold">Publish to Opportunity Market 🚀</p>
              <p className="text-khoj-subtle text-xs mt-0.5">This role will appear on the Co-founder Roles tab for all KHOJ members to discover and apply.</p>
            </div>
          </label>

          {createErr && <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{createErr}</p>}
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={creating || !form.title.trim() || !form.description.trim() || !form.category}
          >
            {creating ? 'Creating…' : 'Create Role'}
          </Button>
        </div>
      )}

      {roles.length === 0 && !showCreate ? (
        <EmptyState
          icon="💼"
          title="No open roles yet"
          description={canManage ? 'Add your first role to start attracting talent.' : 'This room has no open roles right now.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {roles.map((role) => {
            const myApp            = getMyApplicationForRole(role.id)
            const isRejected       = myApp?.status === 'rejected'
            const isPending        = myApp?.status === 'pending'
            const isAccepted       = myApp?.status === 'accepted'
            const hasActiveApp     = isPending || isAccepted
            const showApplyBtn     = canApply && role.status === 'open' && (!myApp || isRejected)
            const showStatusBadge  = canApply && myApp && !isRejected

            return (
              <div key={role.id} className="bg-khoj-card border border-khoj-border rounded-xl p-4 space-y-3 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-khoj-text font-semibold text-sm">{role.title}</h4>
                    {role.category && <p className="text-khoj-subtle text-xs mt-0.5">{role.category}</p>}
                  </div>
                  <Badge
                    label={role.status === 'open' ? 'Open' : role.status === 'filled' ? 'Filled' : role.status === 'closed' ? 'Closed' : 'Paused'}
                    variant={role.status === 'open' ? 'success' : 'default'}
                  />
                </div>

                {/* Description */}
                {role.description && (
                  <p className="text-khoj-subtle text-xs leading-relaxed line-clamp-3">{role.description}</p>
                )}

                {/* Skills */}
                {role.mustHaveSkills && role.mustHaveSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {role.mustHaveSkills.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-khoj-border/60 text-khoj-subtle rounded-sm">{s}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-khoj-border/60">
                  <span className="text-[11px] text-khoj-subtle">{role.seatsFilled ?? 0}/{role.seats ?? 1} filled</span>

                  <div className="flex items-center gap-2">
                    {/* Active application status badge */}
                    {showStatusBadge && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        isAccepted
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/30'
                          : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'
                      }`}>
                        {isAccepted ? '✓ Accepted' : '⏳ Pending'}
                      </span>
                    )}

                    {/* Apply / Re-apply button */}
                    {showApplyBtn && (
                      <button
                        onClick={() => setApplyingRole(role)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-khoj-accent hover:bg-khoj-accent/90 text-white transition-colors"
                      >
                        {isRejected ? 'Apply Again' : 'Apply as Co-founder'}
                      </button>
                    )}

                    {/* Rejected label (shown together with Apply Again btn above) */}
                    {canApply && isRejected && (
                      <span className="text-[10px] text-red-400 border border-red-800/40 px-2 py-0.5 rounded-lg bg-red-900/20">
                        Not selected
                      </span>
                    )}

                    {/* Legacy fallback for unauthenticated users */}
                    {!currentUserId && !myMember && role.status === 'open' && onRequestToJoin && (
                      <button
                        onClick={() => onRequestToJoin(role.id)}
                        className="text-khoj-accent text-xs hover:underline"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Apply modal */}
      {applyingRole && currentUserId && currentUserName != null && currentUserAvatar != null && (
        <ApplyModal
          role={applyingRole}
          room={room}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          existingRejectedApp={getMyApplicationForRole(applyingRole.id)?.status === 'rejected'}
          onClose={() => setApplyingRole(null)}
        />
      )}
    </div>
  )
}


interface Props {
  roles: StartupRole[]
  room: CollabRoom
  myMember: RoomMember | null
  canManage: boolean
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  myApplications?: RoleApplication[]
  /** Legacy fallback — kept so existing callers don't break */
  onRequestToJoin?: (roleId: string) => void
}

