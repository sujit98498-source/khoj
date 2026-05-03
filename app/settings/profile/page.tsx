// app/settings/profile/page.tsx
// Edit Profile — authenticated users build and update their public portfolio.
//
// Layout:
//  ┌─────────────────────────────────────────────────────────┐
//  │ Header: title, Save / Cancel / Preview buttons          │
//  ├──────────────────────────┬──────────────────────────────┤
//  │ Left: form sections      │ Right: live preview (desktop)│
//  │ (stacked accordions)     │ mirrors public profile card  │
//  └──────────────────────────┴──────────────────────────────┘

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { CompletenessBar } from '@/components/profile-edit/CompletenessBar'
import { BasicInfoSection } from '@/components/profile-edit/BasicInfoSection'
import { SkillsEditSection } from '@/components/profile-edit/SkillsEditSection'
import { SocialLinksSection } from '@/components/profile-edit/SocialLinksSection'
import { ProjectsEditSection } from '@/components/profile-edit/ProjectsEditSection'
import { EducationSection, ExperienceSection } from '@/components/profile-edit/EducationExperienceSection'
import { AvatarSection } from '@/components/profile-edit/AvatarSection'
import { ProfileHeader } from '@/components/portfolio/ProfileHeader'
import {
  saveProfileData,
  loadSavedProfile,
  saveDraft,
  loadDraft,
  clearDraft,
  SAVE_DEBOUNCE_MS,
} from '@/services/profileEditService'
import { getFullPortfolioData } from '@/services/portfolioService'
import type { PortfolioUser, PortfolioSocialLinks, PortfolioEducation, PortfolioExperience } from '@/lib/types'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── Validation ────────────────────────────────────────────────────────────────

function validate(data: Partial<PortfolioUser>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.name?.trim()) errors.name = 'Name is required'
  if (data.username && !/^[a-z0-9_]{2,30}$/i.test(data.username))
    errors.username = '2–30 chars, letters/numbers/underscores only'
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))
    errors.contactEmail = 'Enter a valid email'
  if (data.bio && data.bio.length > 400)
    errors.bio = 'Bio must be 400 characters or less'
  return errors
}

// ── Seed blank profile from KhojUser if no portfolio exists ──────────────────

function seedFromAuth(khojUser: NonNullable<ReturnType<typeof useAuth>['khojUser']>): Partial<PortfolioUser> {
  return {
    uid: khojUser.uid,
    name: khojUser.name,
    xp: khojUser.xp,
    rank: khojUser.rank,
    wins: khojUser.wins,
    matchesPlayed: khojUser.matchesPlayed,
    skills: khojUser.skills ?? [],
    createdAt: khojUser.createdAt,
    achievements: [],
    projects: [],
    competitions: [],
    education: [],
    experience: [],
    socialLinks: {},
    availableForOpportunities: false,
    contactVisible: false,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()

  const [form, setForm] = useState<Partial<PortfolioUser>>({})
  const [original, setOriginal] = useState<Partial<PortfolioUser>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = JSON.stringify(form) !== JSON.stringify(original)

  // ── Load profile data on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!khojUser) { router.replace('/auth/login'); return }

    async function load() {
      // 1. Try real saved profile (localStorage in dev, DB in prod)
      const saved = loadSavedProfile(khojUser!.uid)
      // 2. Try full portfolio data (mock data)
      const portfolio = await getFullPortfolioData(khojUser!.uid).catch(() => null)

      let initial: Partial<PortfolioUser>

      if (saved) {
        initial = saved
      } else if (portfolio?.user) {
        initial = { ...portfolio.user }
      } else {
        initial = seedFromAuth(khojUser!)
      }

      // 3. Check for unfinished draft
      const draft = loadDraft(khojUser!.uid)
      if (draft && draft.savedAt > Date.now() - 24 * 60 * 60 * 1000) {
        // Draft is < 24 h old — offer to restore
        setForm({ ...initial, ...draft.data })
        setDraftRestored(true)
      } else {
        setForm(initial)
      }

      setOriginal(initial)
      setPageLoading(false)
    }

    load()
  }, [authLoading, khojUser, router])

  // ── Auto-save draft while editing ─────────────────────────────────────────
  useEffect(() => {
    if (!khojUser || pageLoading) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(khojUser.uid, form)
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [form, khojUser, pageLoading])

  // ── Unsaved-changes browser warning ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const patch = useCallback((p: Partial<PortfolioUser>) => {
    setForm((prev) => ({ ...prev, ...p }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(p).forEach((k) => delete next[k])
      return next
    })
  }, [])

  async function handleSave() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fix the errors before saving.')
      return
    }

    setSaving(true)
    const result = await saveProfileData(khojUser!.uid, form)
    setSaving(false)

    if (result.success) {
      setOriginal(form)
      clearDraft(khojUser!.uid)
      toast.success('Profile saved!')
    } else {
      toast.error(result.error ?? 'Save failed. Try again.')
    }
  }

  function handleCancel() {
    if (isDirty && !confirm('Discard unsaved changes?')) return
    clearDraft(khojUser!.uid)
    setForm(original)
    setErrors({})
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (authLoading || pageLoading) return <PageLoader />

  const previewUser: PortfolioUser = {
    uid: khojUser!.uid,
    name: form.name ?? khojUser!.name,
    xp: khojUser!.xp,
    rank: khojUser!.rank,
    wins: khojUser!.wins,
    matchesPlayed: khojUser!.matchesPlayed,
    skills: form.skills ?? [],
    createdAt: khojUser!.createdAt,
    achievements: form.achievements ?? [],
    projects: form.projects ?? [],
    competitions: form.competitions ?? [],
    socialLinks: form.socialLinks ?? {},
    username: form.username,
    headline: form.headline,
    bio: form.bio,
    field: form.field,
    avatarUrl: form.avatarUrl,
    availableForOpportunities: form.availableForOpportunities,
    contactEmail: form.contactVisible ? form.contactEmail : undefined,
    location: form.location,
    country: form.country,
    verifiedChampion: form.verifiedChampion,
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-xl font-display font-bold text-khoj-text tracking-tight">
              Edit Profile
            </h1>
            <p className="text-xs text-khoj-subtle font-body mt-0.5">
              Build your public KHOJ portfolio.{' '}
              <Link href={`/profile/${khojUser!.uid}`} className="text-khoj-accent hover:underline">
                View public page →
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Draft restored notice */}
            {draftRestored && (
              <span className="text-[10px] font-body text-khoj-gold px-2 py-1 bg-khoj-gold/10 border border-khoj-gold/30 rounded-sm">
                Draft restored
              </span>
            )}
            {/* Unsaved indicator */}
            {isDirty && (
              <span className="text-[10px] font-body text-khoj-subtle">
                ● Unsaved changes
              </span>
            )}

            {/* Mobile preview toggle */}
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="lg:hidden text-xs font-body px-3 py-2 rounded-sm border border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40 transition-all"
            >
              {previewOpen ? 'Hide Preview' : '◉ Preview'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={!isDirty || saving}
              className="text-xs font-body px-4 py-2 rounded-sm border border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'flex items-center gap-2 text-xs font-body px-5 py-2 rounded-sm border transition-all',
                saving
                  ? 'bg-khoj-accent/20 border-khoj-accent/30 text-khoj-accent/60 cursor-wait'
                  : 'bg-khoj-accent text-white border-khoj-accent hover:bg-khoj-accent/90 font-semibold'
              )}
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                '↑ Save Profile'
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile preview panel ────────────────────────────────────────── */}
        {previewOpen && (
          <div className="lg:hidden mb-6 border border-khoj-border rounded-sm overflow-hidden">
            <div className="px-4 py-2 bg-khoj-card/60 border-b border-khoj-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">Live Preview</span>
              <Link href={`/profile/${khojUser!.uid}`} className="text-[10px] text-khoj-accent hover:underline font-body">
                Open public page →
              </Link>
            </div>
            <div className="p-4">
              <ProfileHeader user={previewUser} isOwner={false} />
            </div>
          </div>
        )}

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        <div className="flex gap-6">
          {/* ══ Edit forms ══ */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Completeness bar */}
            <CompletenessBar data={form} />

            <AvatarSection
              data={form}
              onChange={patch}
            />

            <BasicInfoSection
              data={form}
              errors={errors}
              onChange={patch}
            />

            <SkillsEditSection
              skills={form.skills ?? []}
              onChange={(skills) => patch({ skills })}
            />

            <SocialLinksSection
              links={form.socialLinks ?? {}}
              errors={errors}
              onChange={(socialLinks: PortfolioSocialLinks) => patch({ socialLinks })}
            />

            <ProjectsEditSection
              projects={form.projects ?? []}
              onChange={(projects) => patch({ projects })}
            />

            <EducationSection
              education={form.education ?? []}
              onChange={(education: PortfolioEducation[]) => patch({ education })}
            />

            <ExperienceSection
              experience={form.experience ?? []}
              onChange={(experience: PortfolioExperience[]) => patch({ experience })}
            />

            {/* Bottom save bar */}
            <div className="sticky bottom-4 flex justify-end gap-2 pt-2">
              <div className="flex items-center gap-2 bg-khoj-card/90 backdrop-blur-sm border border-khoj-border rounded-sm px-4 py-2 shadow-lg">
                {isDirty && (
                  <span className="text-[10px] text-khoj-subtle font-body mr-2">Unsaved changes</span>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!isDirty || saving}
                  className="text-xs font-body px-3 py-1.5 rounded-sm border border-khoj-border text-khoj-subtle hover:text-khoj-text transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={clsx(
                    'text-xs font-body px-4 py-1.5 rounded-sm border transition-all',
                    saving
                      ? 'bg-khoj-accent/20 border-khoj-accent/30 text-khoj-accent/60 cursor-wait'
                      : 'bg-khoj-accent text-white border-khoj-accent hover:bg-khoj-accent/90 font-semibold'
                  )}
                >
                  {saving ? 'Saving…' : '↑ Save'}
                </button>
              </div>
            </div>
          </div>

          {/* ══ Desktop live preview ══ */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">
                  Live Preview
                </span>
                <Link
                  href={`/profile/${khojUser!.uid}`}
                  className="text-[10px] text-khoj-accent hover:underline font-body"
                >
                  Open public page →
                </Link>
              </div>
              <ProfileHeader user={previewUser} isOwner={false} />

              {/* Skill preview */}
              {(form.skills ?? []).length > 0 && (
                <div className="bg-khoj-card border border-khoj-border rounded-sm p-4">
                  <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-3">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(form.skills ?? []).map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 bg-khoj-teal/10 border border-khoj-teal/25 text-khoj-teal rounded-sm font-body">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
