// app/network/requests/page.tsx
// Incoming and sent connection requests — real-time via Firestore onSnapshot.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { FriendRequestCard } from '@/components/network/FriendRequestCard'
import { useAuth } from '@/hooks/useAuth'
import { useIncomingRequests, useSentRequests } from '@/hooks/useFriendRequests'
import {
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from '@/services/friendRequestService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'incoming' | 'sent'

export default function RequestsPage() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const myUid = khojUser?.uid ?? null
  const { requests: incoming, loading: loadingIn } = useIncomingRequests(myUid)
  const { requests: sent, loading: loadingOut } = useSentRequests(myUid)

  const [activeTab, setActiveTab] = useState<Tab>('incoming')
  const [busyId, setBusyId] = useState<string | null>(null)

  if (authLoading) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  async function handleAccept(requestId: string) {
    setBusyId(requestId)
    try {
      await acceptFriendRequest(requestId, khojUser!.uid)
      toast.success('Connection accepted!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to accept')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(requestId: string) {
    setBusyId(requestId)
    try {
      await declineFriendRequest(requestId)
      toast('Request declined')
    } catch {
      toast.error('Failed to decline')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(requestId: string) {
    setBusyId(requestId)
    try {
      await cancelFriendRequest(requestId)
      toast('Request cancelled')
    } catch {
      toast.error('Failed to cancel')
    } finally {
      setBusyId(null)
    }
  }

  const loading = activeTab === 'incoming' ? loadingIn : loadingOut
  const items = activeTab === 'incoming' ? incoming : sent

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/network"
              className="text-[9px] uppercase tracking-widest font-body text-khoj-muted hover:text-khoj-accent transition-colors"
            >
              Network
            </Link>
            <span className="text-khoj-border">/</span>
            <span className="text-[9px] uppercase tracking-widest font-body text-khoj-subtle">
              Requests
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-khoj-text">Connection Requests</h1>
          <p className="text-xs font-body text-khoj-subtle mt-1">
            {incoming.length} pending incoming · {sent.length} sent
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-khoj-border">
        {([
          { key: 'incoming' as Tab, label: 'Incoming', count: incoming.length },
          { key: 'sent' as Tab, label: 'Sent', count: sent.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 text-xs font-body px-4 py-2.5 border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-khoj-accent text-khoj-accent'
                : 'border-transparent text-khoj-subtle hover:text-khoj-text'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={clsx(
                  'text-[9px] font-mono px-1.5 py-0.5 rounded-sm',
                  activeTab === tab.key
                    ? 'bg-khoj-accent/15 text-khoj-accent'
                    : 'bg-khoj-bg text-khoj-muted border border-khoj-border'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-khoj-card border border-khoj-border rounded-sm animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <span className="text-4xl text-khoj-muted">◈</span>
          <p className="text-sm font-body text-khoj-subtle">
            {activeTab === 'incoming'
              ? 'No incoming connection requests.'
              : 'No sent requests pending.'}
          </p>
          <Link
            href="/leaderboard"
            className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            Discover players →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <FriendRequestCard
              key={req.id}
              request={req}
              direction={activeTab}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
              busy={busyId === req.id}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
