'use client'
// components/collaboration/CreateStartupRoomWizard.tsx
// Multi-step wizard for creating a startup room.

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { createStartupRoom } from '@/lib/collaboration/roomMutations'
import type { CreateStartupRoomPayload, VisibilityMode } from '@/types/collaboration'
import {
  STAGE_OPTIONS,
  INDUSTRY_TAGS,
  ROLE_CATEGORIES,
} from '@/lib/collaboration/roomTypes'
import { StartupEvaluationForm } from '@/components/ai/StartupEvaluationForm'
import type { StartupEvaluationResult } from '@/lib/ai/startupEvaluation'

interface Props {
  userId: string
  displayName: string
  avatarUrl: string
  onClose: () => void
}

type Step = 1 | 2 | 3

const EMPTY: CreateStartupRoomPayload = {
  title: '',
  summary: '',
  visibility: 'public',
  startup: {
    stage: 'idea',
    problem: '',
    solution: '',
    locationMode: 'remote',
    commitment: 'full_time',
    lookingFor: 'cofounder',
  },
  tags: [],
  createDefaultRole: false,
  publishDefaultRoleToMarket: true,
  visibilityMode: 'public_preview',
  protectedDetailsEnabled: true,
  privateFilesEnabled: false,
}

export function CreateStartupRoomWizard({ userId, displayName, avatarUrl, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [payload, setPayload] = useState<CreateStartupRoomPayload>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [evalResult, setEvalResult]     = useState<{ score: number; label: string } | null>(null)

  function update(updates: Partial<CreateStartupRoomPayload>) {
    setPayload((p) => ({ ...p, ...updates }))
  }
  function updateStartup(updates: Partial<CreateStartupRoomPayload['startup']>) {
    setPayload((p) => ({ ...p, startup: { ...p.startup, ...updates } }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const roomId = await createStartupRoom(userId, displayName, avatarUrl, payload)
      toast.success('Startup room created! 🚀')
      router.push(`/rooms/${roomId}`)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const canNext1 = payload.title.trim().length >= 3 && payload.summary.trim().length >= 10
  const canNext2 = payload.startup.problem.trim().length >= 10 && payload.startup.solution.trim().length >= 10
  const canSubmit = canNext1 && canNext2

  if (showEvalForm) {
    return (
      <StartupEvaluationForm
        prefill={{
          startupName: payload.title,
          oneLiner: payload.summary,
          stage: payload.startup.stage as any,
          problem: payload.startup.problem,
          solution: payload.startup.solution,
          category: payload.tags?.[0] ?? '',
        }}
        onResult={(result: StartupEvaluationResult) => {
          setEvalResult({ score: result.overallScore, label: result.ratingLabel })
          setShowEvalForm(false)
          toast.success(`KHOJ AI Score: ${result.overallScore}/10 — ${result.ratingLabel}`)
        }}
        onCancel={() => setShowEvalForm(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-khoj-card border border-khoj-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-center justify-between">
          <div>
            <h2 className="text-khoj-text font-bold text-lg">Create Startup Room</h2>
            <p className="text-khoj-subtle text-sm mt-0.5">Step {step} of 3</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEvalForm(true)}
              title="Evaluate your idea with KHOJ AI before creating"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-khoj-accent/40 text-khoj-accent hover:bg-khoj-accent/10 transition-colors font-semibold"
            >
              ⚡ Evaluate with KHOJ AI
              {evalResult && (
                <span className="ml-1 text-[10px] bg-khoj-accent/20 px-1.5 py-0.5 rounded-full">
                  {evalResult.score}/10
                </span>
              )}
            </button>
            <button onClick={onClose} className="text-khoj-subtle hover:text-khoj-text transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex h-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 transition-colors ${s <= step ? 'bg-khoj-accent' : 'bg-khoj-border'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5 space-y-4 min-h-[320px]">
          {step === 1 && (
            <>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Room Title *</span>
                <input
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                  placeholder="e.g. AI Recruiting Copilot"
                  value={payload.title}
                  onChange={(e) => update({ title: e.target.value })}
                  maxLength={80}
                />
              </label>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Summary *</span>
                <textarea
                  rows={3}
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                  placeholder="One line that excites people about what you're building"
                  value={payload.summary}
                  onChange={(e) => update({ summary: e.target.value })}
                  maxLength={200}
                />
              </label>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Visibility</span>
                <select
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                  value={payload.visibility}
                  onChange={(e) => update({ visibility: e.target.value as any })}
                >
                  <option value="public">Public — anyone can find and request to join</option>
                  <option value="invite_only">Invite Only</option>
                  <option value="private">Private (hidden)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Industry Tags</span>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {INDUSTRY_TAGS.slice(0, 20).map((tag) => {
                    const sel = payload.tags?.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          update({
                            tags: sel
                              ? (payload.tags ?? []).filter((t) => t !== tag)
                              : [...(payload.tags ?? []).slice(0, 4), tag],
                          })
                        }
                        className={`text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                          sel
                            ? 'bg-khoj-accent/20 border-khoj-accent/60 text-khoj-accent'
                            : 'bg-khoj-border/40 border-khoj-border text-khoj-subtle hover:border-khoj-accent/40'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-khoj-subtle uppercase tracking-wide">Stage *</span>
                  <select
                    className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                    value={payload.startup.stage}
                    onChange={(e) => updateStartup({ stage: e.target.value as any })}
                  >
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-khoj-subtle uppercase tracking-wide">Commitment</span>
                  <select
                    className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                    value={payload.startup.commitment}
                    onChange={(e) => updateStartup({ commitment: e.target.value as any })}
                  >
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-khoj-subtle uppercase tracking-wide">Location Mode</span>
                  <select
                    className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                    value={payload.startup.locationMode}
                    onChange={(e) => updateStartup({ locationMode: e.target.value as any })}
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-khoj-subtle uppercase tracking-wide">Looking for</span>
                  <select
                    className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                    value={payload.startup.lookingFor}
                    onChange={(e) => updateStartup({ lookingFor: e.target.value as any })}
                  >
                    <option value="cofounder">Co-founder</option>
                    <option value="contributors">Contributors</option>
                    <option value="both">Both</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Problem *</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                  placeholder="What problem are you solving?"
                  value={payload.startup.problem}
                  onChange={(e) => updateStartup({ problem: e.target.value })}
                  maxLength={500}
                />
              </label>
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Solution *</span>
                <textarea
                  rows={2}
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                  placeholder="Your approach / what you're building"
                  value={payload.startup.solution}
                  onChange={(e) => updateStartup({ solution: e.target.value })}
                  maxLength={500}
                />
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-khoj-subtle text-sm">
                Almost done! Add your first open role so others can see what you need.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payload.createDefaultRole ?? false}
                  onChange={(e) => update({ createDefaultRole: e.target.checked })}
                  className="accent-khoj-accent w-4 h-4"
                />
                <span className="text-khoj-text text-sm">Add a default open role</span>
              </label>
              {payload.createDefaultRole && (
                <div className="space-y-3 pl-6">
                  <label className="block">
                    <span className="text-xs text-khoj-subtle uppercase tracking-wide">Role Title</span>
                    <input
                      className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                      placeholder="e.g. Technical Co-founder"
                      value={payload.defaultRoleTitle ?? ''}
                      onChange={(e) => update({ defaultRoleTitle: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-khoj-subtle uppercase tracking-wide">Category</span>
                    <select
                      className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60"
                      value={payload.defaultRoleCategory ?? ''}
                      onChange={(e) => update({ defaultRoleCategory: e.target.value })}
                    >
                      <option value="">Select category…</option>
                      {ROLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-khoj-subtle uppercase tracking-wide">Description</span>
                    <textarea
                      rows={2}
                      className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                      placeholder="What will this person do / own?"
                      value={payload.defaultRoleDescription ?? ''}
                      onChange={(e) => update({ defaultRoleDescription: e.target.value })}
                    />
                  </label>
                  {/* Publish toggle */}
                  <label className="flex items-start gap-3 cursor-pointer bg-khoj-accent/5 border border-khoj-accent/20 rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={payload.publishDefaultRoleToMarket ?? true}
                      onChange={(e) => update({ publishDefaultRoleToMarket: e.target.checked })}
                      className="accent-khoj-accent w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-khoj-text text-sm font-semibold">Publish to Opportunity Market 🚀</p>
                      <p className="text-khoj-subtle text-xs mt-0.5">Visible to all KHOJ members on the Co-founder Roles tab.</p>
                    </div>
                  </label>
                </div>
              )}

              {/* ── Protect your idea ── */}
              <div className="border border-khoj-border rounded-xl p-4 space-y-3 mt-2">
                <p className="text-khoj-text text-sm font-semibold">🔒 Protect your idea</p>

                {/* Visibility mode picker */}
                <div className="space-y-2">
                  {([
                    { value: 'public_preview', label: 'Public Preview', desc: 'Share basic idea and roles only' },
                    { value: 'private',        label: 'Private',        desc: 'Hidden from discovery — invite-only' },
                    { value: 'unlisted',       label: 'Unlisted',       desc: 'Not in discovery, but accessible via link' },
                  ] as { value: VisibilityMode; label: string; desc: string }[]).map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibilityMode"
                        value={opt.value}
                        checked={payload.visibilityMode === opt.value}
                        onChange={() => update({ visibilityMode: opt.value })}
                        className="accent-khoj-accent mt-0.5"
                      />
                      <div>
                        <p className="text-khoj-text text-sm font-medium">{opt.label}</p>
                        <p className="text-khoj-subtle text-xs">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Protection toggles */}
                <div className="pt-2 border-t border-khoj-border/60 space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payload.protectedDetailsEnabled ?? true}
                      onChange={(e) => update({ protectedDetailsEnabled: e.target.checked })}
                      className="accent-khoj-accent w-4 h-4"
                    />
                    <div>
                      <p className="text-khoj-text text-sm font-medium">Protected Details</p>
                      <p className="text-khoj-subtle text-xs">Full problem, solution, roadmap — visible after approval</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payload.privateFilesEnabled ?? false}
                      onChange={(e) => update({ privateFilesEnabled: e.target.checked })}
                      className="accent-khoj-accent w-4 h-4"
                    />
                    <div>
                      <p className="text-khoj-text text-sm font-medium">Private Files</p>
                      <p className="text-khoj-subtle text-xs">Pitch deck / uploaded files require permission</p>
                    </div>
                  </label>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-khoj-border flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as Step)}
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </Button>
          {step < 3 ? (
            <Button
              variant="primary"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Next →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
            >
              {loading ? 'Creating…' : 'Create Room'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
