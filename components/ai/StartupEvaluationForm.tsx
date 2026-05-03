'use client'
// components/ai/StartupEvaluationForm.tsx
// KHOJ AI — Startup Idea Evaluation Form
// Collects founder inputs and submits to /api/ai/startup-evaluation

import React, { useState } from 'react'
import { auth } from '@/lib/firebase/config'
import toast from 'react-hot-toast'
import type { StartupEvaluationInput, StartupEvaluationResult } from '@/lib/ai/startupEvaluation'

interface Props {
  roomId?: string
  startupId?: string
  prefill?: Partial<StartupEvaluationInput>
  onResult: (result: StartupEvaluationResult, evaluationId: string | null) => void
  onCancel: () => void
}

const STAGE_OPTS = [
  { value: 'idea',   label: 'Idea — I have a concept but no product yet' },
  { value: 'mvp',    label: 'MVP — I have a working prototype or beta' },
  { value: 'growth', label: 'Growth — I have paying users or traction' },
]

const CATEGORY_OPTS = [
  'AI / Machine Learning', 'EdTech', 'FinTech', 'HealthTech', 'E-Commerce',
  'SaaS / B2B Tools', 'Social / Community', 'Gaming', 'Logistics / Supply Chain',
  'Climate / GreenTech', 'HR / Recruiting', 'Legal / Compliance', 'DevTools',
  'Media / Content', 'Other',
]

type FormData = StartupEvaluationInput

const EMPTY: FormData = {
  startupName: '',
  oneLiner: '',
  category: '',
  stage: 'idea',
  targetMarket: '',
  problem: '',
  targetCustomer: '',
  currentAlternatives: '',
  solution: '',
  whyNow: '',
  competitors: '',
  differentiation: '',
  revenueModel: '',
  teamStatus: '',
  rolesNeeded: '',
  fundingNeeded: '',
  currentTraction: '',
  mvpPlan: '',
}

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}
function Field({ label, hint, required, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-khoj-subtle">
        {label}{required && <span className="text-khoj-accent ml-1">*</span>}
      </label>
      {hint && <p className="text-[11px] text-khoj-subtle/70 leading-snug">{hint}</p>}
      {children}
    </div>
  )
}

const INPUT_CLS =
  'w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm placeholder:text-khoj-subtle/50 focus:outline-none focus:border-khoj-accent/60 transition-colors'

const TEXTAREA_CLS = INPUT_CLS + ' resize-none'

export function StartupEvaluationForm({ roomId, startupId, prefill, onResult, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...prefill })
  const [loading, setLoading] = useState(false)

  function set(field: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const canSubmit =
    form.startupName.trim().length >= 2 &&
    form.oneLiner.trim().length >= 10 &&
    form.problem.trim().length >= 10 &&
    form.solution.trim().length >= 10 &&
    form.targetCustomer.trim().length >= 5 &&
    form.targetMarket.trim().length >= 3

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)

    try {
      const user = auth.currentUser
      if (!user) throw new Error('You must be signed in to run an evaluation.')
      const token = await user.getIdToken()

      const res = await fetch('/api/ai/startup-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, roomId: roomId ?? null, startupId: startupId ?? null }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Evaluation failed.')

      toast.success('KHOJ AI evaluation complete!')
      onResult(data.result, data.evaluationId)
    } catch (err: any) {
      toast.error(err.message ?? 'Evaluation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4 py-10">
      <div className="w-full max-w-2xl bg-khoj-card border border-khoj-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-khoj-accent text-lg">⚡</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-semibold">KHOJ AI</span>
            </div>
            <h2 className="text-khoj-text font-bold text-xl">Evaluate Your Startup Idea</h2>
            <p className="text-khoj-subtle text-sm mt-1 leading-snug">
              Get a Validation Readiness Score, strategic feedback, and next steps.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-khoj-subtle hover:text-khoj-text transition-colors mt-1 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-[12px] text-amber-300/80 leading-relaxed">
          ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-5">

          {/* Section: Basics */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent/70 font-semibold pb-1 border-b border-khoj-border/60">
            The Basics
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Startup Name" required>
              <input
                className={INPUT_CLS}
                placeholder="e.g. TalentFlow AI"
                value={form.startupName}
                onChange={(e) => set('startupName', e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Category / Industry" hint="Pick the closest match">
              <select
                className={INPUT_CLS}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select category…</option>
                {CATEGORY_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <Field label="One-Line Pitch" hint="One sentence that captures what you build and for whom" required>
            <input
              className={INPUT_CLS}
              placeholder="e.g. AI-powered recruiting copilot for early-stage startups"
              value={form.oneLiner}
              onChange={(e) => set('oneLiner', e.target.value)}
              maxLength={160}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Stage" required>
              <select
                className={INPUT_CLS}
                value={form.stage}
                onChange={(e) => set('stage', e.target.value as FormData['stage'])}
              >
                {STAGE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Target Country / Market" required hint="e.g. India, Southeast Asia, Global B2B SaaS">
              <input
                className={INPUT_CLS}
                placeholder="e.g. India, Southeast Asia"
                value={form.targetMarket}
                onChange={(e) => set('targetMarket', e.target.value)}
                maxLength={80}
              />
            </Field>
          </div>

          {/* Section: Problem & Customer */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent/70 font-semibold pb-1 border-b border-khoj-border/60 pt-2">
            Problem & Customer
          </div>

          <Field label="Problem" hint="What real pain do your customers face today?" required>
            <textarea
              rows={3}
              className={TEXTAREA_CLS}
              placeholder="Describe the core problem in detail — who experiences it, how often, and what it costs them."
              value={form.problem}
              onChange={(e) => set('problem', e.target.value)}
              maxLength={600}
            />
          </Field>

          <Field label="Target Customer" hint="Be specific — role, company size, behaviour" required>
            <input
              className={INPUT_CLS}
              placeholder="e.g. HR managers at 10–200 person tech startups in India"
              value={form.targetCustomer}
              onChange={(e) => set('targetCustomer', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Current Alternatives" hint="How do customers solve this today?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Spreadsheets, manual sourcing, expensive agencies"
              value={form.currentAlternatives}
              onChange={(e) => set('currentAlternatives', e.target.value)}
              maxLength={200}
            />
          </Field>

          {/* Section: Solution */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent/70 font-semibold pb-1 border-b border-khoj-border/60 pt-2">
            Solution & Market
          </div>

          <Field label="Your Solution" hint="What do you build and how does it solve the problem?" required>
            <textarea
              rows={3}
              className={TEXTAREA_CLS}
              placeholder="Describe your product or service clearly — the mechanism of how it works."
              value={form.solution}
              onChange={(e) => set('solution', e.target.value)}
              maxLength={600}
            />
          </Field>

          <Field label="Why Now?" hint="What has changed that makes this the right time?">
            <textarea
              rows={2}
              className={TEXTAREA_CLS}
              placeholder="e.g. LLMs have dropped API costs by 10x, enabling affordable AI hiring tools"
              value={form.whyNow}
              onChange={(e) => set('whyNow', e.target.value)}
              maxLength={400}
            />
          </Field>

          <Field label="Competitors" hint="Who else is solving this? (company names or categories)">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Workday, Lever, Greenhouse — but they target enterprise"
              value={form.competitors}
              onChange={(e) => set('competitors', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Differentiation" hint="Why will customers choose you over alternatives?">
            <textarea
              rows={2}
              className={TEXTAREA_CLS}
              placeholder="e.g. 10x cheaper, built for seed-stage startups, AI-native from day one"
              value={form.differentiation}
              onChange={(e) => set('differentiation', e.target.value)}
              maxLength={400}
            />
          </Field>

          {/* Section: Business */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent/70 font-semibold pb-1 border-b border-khoj-border/60 pt-2">
            Business & Team
          </div>

          <Field label="Revenue Model" hint="How will you make money?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. SaaS subscription $49/mo, usage-based pricing per hire"
              value={form.revenueModel}
              onChange={(e) => set('revenueModel', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Team Status" hint="Who is already on the founding team?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Solo founder (product), need tech co-founder"
              value={form.teamStatus}
              onChange={(e) => set('teamStatus', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Roles Needed" hint="What roles are you actively recruiting for?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. Full-Stack Engineer, Growth Marketer"
              value={form.rolesNeeded}
              onChange={(e) => set('rolesNeeded', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Funding Needed" hint="How much are you raising and for what?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. $100K pre-seed for 6-month runway and MVP"
              value={form.fundingNeeded}
              onChange={(e) => set('fundingNeeded', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Current Traction" hint="Any users, revenue, pilots, waitlist?">
            <input
              className={INPUT_CLS}
              placeholder="e.g. 3 pilot customers, 200 waitlist signups, 0 revenue yet"
              value={form.currentTraction}
              onChange={(e) => set('currentTraction', e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="MVP Plan" hint="What are you building first and in what timeframe?">
            <textarea
              rows={2}
              className={TEXTAREA_CLS}
              placeholder="e.g. Job description generator + applicant scoring in 6 weeks using GPT-4o"
              value={form.mvpPlan}
              onChange={(e) => set('mvpPlan', e.target.value)}
              maxLength={400}
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`
                flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200 border
                ${canSubmit && !loading
                  ? 'bg-khoj-accent border-khoj-accent text-white hover:bg-orange-500 hover:shadow-[0_0_24px_rgba(255,77,0,0.4)]'
                  : 'bg-khoj-accent/30 border-khoj-accent/30 text-white/50 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Evaluating with KHOJ AI…
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Run KHOJ AI Evaluation
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 rounded-xl border border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-khoj-subtle/60 text-center leading-relaxed">
            ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.
          </p>
        </form>
      </div>
    </div>
  )
}
