// app/studio/settings/page.tsx
// KHOJ Studio — Creator settings

'use client'

// Prevent build-time prerendering so Firebase is only initialized in the browser.
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import toast from 'react-hot-toast'

interface ChannelSettings {
  displayName: string
  channelDescription: string
  contactEmail: string
  twitterHandle: string
  instagramHandle: string
  websiteUrl: string
  notifyOnComment: boolean
  notifyOnLike: boolean
  notifyOnFollow: boolean
}

const DEFAULTS: ChannelSettings = {
  displayName: '',
  channelDescription: '',
  contactEmail: '',
  twitterHandle: '',
  instagramHandle: '',
  websiteUrl: '',
  notifyOnComment: true,
  notifyOnLike: false,
  notifyOnFollow: true,
}

export default function StudioSettingsPage() {
  const { firebaseUser, khojUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [form, setForm]       = useState<ChannelSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!uid) return
    async function loadSettings() {
      try {
        const ref = doc(requireFirestoreDb(), 'creatorSettings', uid!)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setForm({ ...DEFAULTS, ...snap.data() as ChannelSettings })
        } else {
          // Prefill from khojUser profile
          setForm((prev) => ({
            ...prev,
            displayName: khojUser?.name ?? '',
            contactEmail: firebaseUser?.email ?? '',
          }))
        }
      } catch {
        // no-op; creatorSettings doc may not exist yet
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [uid, khojUser, firebaseUser])

  function handle(field: keyof ChannelSettings, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!uid) return
    setSaving(true)
    try {
      const ref = doc(requireFirestoreDb(), 'creatorSettings', uid)
      await updateDoc(ref, { ...form }).catch(async () => {
        // Doc doesn't exist yet — use setDoc via dynamic import
        const { setDoc } = await import('firebase/firestore')
        await setDoc(ref, form)
      })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!uid) return null

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Manage your creator channel and preferences</p>
      </div>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Channel info */}
          <Section title="Channel Info" description="Basic information about your creator channel.">
            <FormField
              label="Display Name"
              type="text"
              value={form.displayName}
              onChange={(v) => handle('displayName', v)}
              placeholder="Your creator name"
            />
            <FormField
              label="Channel Description"
              type="textarea"
              value={form.channelDescription}
              onChange={(v) => handle('channelDescription', v)}
              placeholder="Tell viewers what your channel is about…"
            />
            <FormField
              label="Contact Email"
              type="email"
              value={form.contactEmail}
              onChange={(v) => handle('contactEmail', v)}
              placeholder="contact@example.com"
            />
          </Section>

          {/* Social links */}
          <Section title="Social Links" description="Connect your social profiles.">
            <FormField
              label="Twitter / X"
              type="text"
              value={form.twitterHandle}
              onChange={(v) => handle('twitterHandle', v)}
              placeholder="@yourhandle"
              prefix="twitter.com/"
            />
            <FormField
              label="Instagram"
              type="text"
              value={form.instagramHandle}
              onChange={(v) => handle('instagramHandle', v)}
              placeholder="@yourhandle"
              prefix="instagram.com/"
            />
            <FormField
              label="Website"
              type="url"
              value={form.websiteUrl}
              onChange={(v) => handle('websiteUrl', v)}
              placeholder="https://yoursite.com"
            />
          </Section>

          {/* Notifications */}
          <Section title="Notifications" description="Control which creator alerts you receive.">
            <ToggleRow
              label="New Comments"
              description="Notify when someone comments on your content."
              checked={form.notifyOnComment}
              onChange={(v) => handle('notifyOnComment', v)}
            />
            <ToggleRow
              label="New Likes"
              description="Notify when someone likes your content."
              checked={form.notifyOnLike}
              onChange={(v) => handle('notifyOnLike', v)}
            />
            <ToggleRow
              label="New Followers"
              description="Notify when someone follows you."
              checked={form.notifyOnFollow}
              onChange={(v) => handle('notifyOnFollow', v)}
            />
          </Section>

          {/* Profile redirect */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-white text-sm font-semibold">Full Profile Settings</p>
              <p className="text-zinc-500 text-xs">Update your avatar, username, bio, and account details.</p>
            </div>
            <Link
              href="/settings"
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
            >
              Go to Settings →
            </Link>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-6 space-y-5">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-white text-sm font-bold">{title}</h2>
        <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function FormField({
  label, type, value, onChange, placeholder, prefix,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string
}) {
  const baseClass = 'w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#ff5a00]/50 focus:border-[#ff5a00] transition-colors'

  return (
    <div className="space-y-1.5">
      <label className="text-zinc-400 text-xs font-semibold">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <div className="flex items-center">
          {prefix && (
            <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 text-xs px-3 py-2.5 rounded-l-xl">
              {prefix}
            </span>
          )}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${baseClass} ${prefix ? 'rounded-l-none border-l-0' : ''}`}
          />
        </div>
      )}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-zinc-300 text-sm font-semibold">{label}</p>
        <p className="text-zinc-600 text-xs">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#ff5a00]' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-6 space-y-4">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-32" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
