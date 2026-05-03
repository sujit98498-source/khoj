'use client'
// components/collaboration/StartupRoomView.tsx
// Full startup room detail view with collaboration, evaluation, and AI Builder tabs.

import React, { useMemo, useRef, useState, useTransition } from 'react'
import type { CollabRoom, StartupRole } from '@/types/collaboration'
import { useStartupRoom } from '@/hooks/useStartupRoom'
import { useFounderInbox } from '@/hooks/useFounderInbox'
import { useStartupAssets } from '@/hooks/useStartupAssets'
import { useStartupSessions } from '@/hooks/useStartupSessions'
import { submitAccessRequest } from '@/lib/collaboration/roomMutations'
import toast from 'react-hot-toast'

import { StartupRoomHeader } from './StartupRoomHeader'
import { StartupOverviewPanel } from './StartupOverviewPanel'
import { TeamMembersPanel } from './TeamMembersPanel'
import { StartupRolesPanel } from './StartupRolesPanel'
import { AssetUploader, AssetsList } from './AssetUploader'
import { SessionsPanel } from './SessionsPanel'
import { FounderInboxPanel } from './FounderInboxPanel'
import { StartupJoinRequestModal } from './StartupJoinRequestModal'
import { MatchSidebar } from './MatchSidebar'
import { CardSkeleton } from './EmptyState'
import { StartupAIEvaluationPanel } from '@/components/ai/StartupAIEvaluationPanel'
import { KhojAssistantChat } from '@/components/ai/KhojAssistantChat'

type Tab = 'overview' | 'members' | 'roles' | 'files' | 'sessions' | 'inbox' | 'ai_evaluation' | 'ai_builder'

interface Props {
  room: CollabRoom
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string
  initialTab?: Tab
}

export function StartupRoomView({ room, currentUserId, currentUserName, currentUserAvatar, initialTab }: Props) {
  const { members, roles, milestones, myMember, myApplications, myAccess, loading, canManage } =
    useStartupRoom(room.id, currentUserId, room)

  const { requests, invites, applications, accessRequests, counts } =
    useFounderInbox(room.id, canManage)

  const { assets, uploading, progress, error: assetError, uploadFile } =
    useStartupAssets(room.id, !!myMember)

  const { sessions, liveSession, fetchSessionToken, tokenMap, tokenLoading } =
    useStartupSessions(room.id, !!myMember)

  const [tab, setTab] = useState<Tab>(initialTab ?? 'overview')
  const [isPending, startTabTransition] = useTransition()
  const mountedTabs = useRef<Set<Tab>>(new Set<Tab>([initialTab ?? 'overview']))
  const [joinRoleId, setJoinRoleId] = useState<string | null>(null)
  const [joinRole, setJoinRole] = useState<StartupRole | null>(null)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [accessReason, setAccessReason]       = useState('')
  const [accessSubmitting, setAccessSubmitting] = useState(false)

  // Determine if the current viewer has approved access
  const isApproved = canManage || !!myMember || !!myAccess
  const detailsLocked = !isApproved && !!(room.protectedDetailsEnabled ?? true)
  const canAccessBuilder = canManage || !!myMember

  function handleTabChange(newTab: Tab) {
    startTabTransition(() => {
      setTab(newTab)
      mountedTabs.current = new Set(Array.from(mountedTabs.current).concat(newTab))
    })
  }

  async function handleSubmitAccessRequest() {
    if (!accessReason.trim()) return
    setAccessSubmitting(true)
    try {
      await submitAccessRequest(room.id, currentUserId, currentUserName, currentUserAvatar, accessReason.trim())
      toast.success('Access request sent! The founder will review it.')
      setShowAccessModal(false)
      setAccessReason('')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send request.')
    } finally {
      setAccessSubmitting(false)
    }
  }

  const TABS = useMemo<Array<{ id: Tab; label: string; badge?: number; hidden?: boolean }>>(() => [
    { id: 'overview',       label: 'Overview' },
    { id: 'members',        label: `Members${members.length > 0 ? ` (${members.length})` : ''}` },
    { id: 'roles',          label: `Roles${roles.length > 0 ? ` (${roles.length})` : ''}` },
    { id: 'files',          label: 'Files',         hidden: !myMember },
    { id: 'sessions',       label: 'Sessions',      hidden: !myMember },
    { id: 'ai_evaluation',  label: 'AI Evaluation' },
    { id: 'ai_builder',     label: 'AI Builder' },
    { id: 'inbox',          label: 'Inbox',         badge: counts.total, hidden: !canManage },
  ], [roles.length, members.length, myMember, canManage, counts.total])

  function openJoinModal(roleId: string) {
    const role = roles.find((r) => r.id === roleId) ?? null
    setJoinRole(role)
    setJoinRoleId(roleId)
  }

  const userSnapshot = {
    uid: currentUserId,
    displayName: currentUserName,
    avatarUrl: currentUserAvatar,
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <CardSkeleton />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <StartupRoomHeader
        room={room}
        myMember={myMember ?? null}
        onJoin={!myMember && room.isRecruiting ? () => setJoinRoleId('') : undefined}
        onManage={canManage ? () => handleTabChange('inbox') : undefined}
        onEvaluate={canManage ? () => handleTabChange('ai_evaluation') : undefined}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-khoj-border overflow-x-auto">
        {TABS.filter((t) => !t.hidden).map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-khoj-accent border-b-2 border-khoj-accent -mb-px'
                : 'text-khoj-subtle hover:text-khoj-text'
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-1.5 bg-khoj-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Locked details banner (unapproved viewers only) ───────────────── */}
      {detailsLocked && tab === 'overview' && (
        <div className="bg-[#0d0d16] border border-khoj-border/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-khoj-text font-semibold text-sm">🔒 Details protected by founder</p>
              <p className="text-khoj-subtle text-xs mt-0.5">
                Request access to see the full problem, solution, roadmap and files.
              </p>
            </div>
            <button
              onClick={() => setShowAccessModal(true)}
              className="px-4 py-2 bg-khoj-accent text-white text-sm font-medium rounded-lg hover:bg-khoj-accent/90 transition-colors flex-shrink-0"
            >
              Request Access
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Full Problem', 'Solution', 'Roadmap', 'Files'].map((item) => (
              <div key={item} className="bg-khoj-card border border-khoj-border rounded-lg p-3 flex flex-col items-center justify-center gap-1 min-h-[72px] opacity-60">
                <span className="text-lg">🔒</span>
                <p className="text-khoj-subtle text-xs text-center">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className={`${canManage && tab === 'roles' ? 'grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6' : ''} ${isPending ? 'opacity-70 transition-opacity' : ''}`}>
        <div>
          {/* Overview — lazy-mount, stays in DOM once visited */}
          <div className={mountedTabs.current.has('overview') && tab !== 'overview' ? 'hidden' : ''}>
            {mountedTabs.current.has('overview') && (
              <StartupOverviewPanel
                room={room}
                members={members}
                milestones={milestones}
                roles={roles}
                canManage={canManage}
                onViewRoles={() => handleTabChange('roles')}
                onViewMembers={() => handleTabChange('members')}
              />
            )}
          </div>

          {/* Members */}
          <div className={mountedTabs.current.has('members') && tab !== 'members' ? 'hidden' : ''}>
            {mountedTabs.current.has('members') && (
              <TeamMembersPanel members={members} loading={loading} />
            )}
          </div>

          {/* Roles */}
          <div className={mountedTabs.current.has('roles') && tab !== 'roles' ? 'hidden' : ''}>
            {mountedTabs.current.has('roles') && (
              <StartupRolesPanel
                roles={roles}
                room={room}
                myMember={myMember ?? null}
                canManage={canManage}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                myApplications={myApplications}
                onRequestToJoin={!myMember && !currentUserId ? openJoinModal : undefined}
              />
            )}
          </div>

          {/* Files (members only) */}
          {myMember && (
            <div className={mountedTabs.current.has('files') && tab !== 'files' ? 'hidden' : ''}>
              {mountedTabs.current.has('files') && (
                <div className="space-y-4">
                  {canManage && (
                    <AssetUploader
                      onFile={(file, vis) => uploadFile(file, currentUserId, vis)}
                      uploading={uploading}
                      progress={progress?.percent ?? 0}
                      error={assetError}
                    />
                  )}
                  <AssetsList assets={assets} />
                </div>
              )}
            </div>
          )}

          {/* Sessions (members only) */}
          {myMember && (
            <div className={mountedTabs.current.has('sessions') && tab !== 'sessions' ? 'hidden' : ''}>
              {mountedTabs.current.has('sessions') && (
                <SessionsPanel
                  roomId={room.id}
                  sessions={sessions}
                  liveSession={liveSession}
                  myMember={myMember ?? null}
                  canManage={canManage}
                  onFetchToken={(sid, lkName) =>
                    fetchSessionToken(sid, lkName, currentUserId, currentUserName)
                  }
                  tokenMap={tokenMap}
                  tokenLoading={tokenLoading}
                />
              )}
            </div>
          )}

          {/* AI Evaluation */}
          <div className={mountedTabs.current.has('ai_evaluation') && tab !== 'ai_evaluation' ? 'hidden' : ''}>
            {mountedTabs.current.has('ai_evaluation') && (
              <StartupAIEvaluationPanel
                room={room}
                currentUserId={currentUserId}
                canManage={canManage}
              />
            )}
          </div>

          {/* AI Builder */}
          <div className={mountedTabs.current.has('ai_builder') && tab !== 'ai_builder' ? 'hidden' : ''}>
            {mountedTabs.current.has('ai_builder') && (
              canAccessBuilder ? (
                <KhojAssistantChat
                  title="AI Builder"
                  subtitle="Room-aware startup coaching for evaluation, roadmap, tasks, validation, launch readiness, and investor preparation."
                  initialMode="startup"
                  fixedMode
                  defaultToolType="startup_evaluation"
                  roomContext={{
                    roomId: room.id,
                    roomName: room.title,
                    roomGoal: room.startup?.problem ?? room.summary,
                  }}
                  starterPrompts={[
                    `Create a startup roadmap for ${room.title}`,
                    'Generate tasks by founder, developer, designer, and marketer',
                    'Evaluate our validation readiness',
                    'Prepare investor questions for this room',
                  ]}
                  initialAssistantMessage={`KHOJ AI Builder is ready for ${room.title}. Ask for a roadmap, task plan, validation review, or launch-readiness checklist.`}
                  placeholder="Ask AI Builder for roadmap, tasks, validation, launch steps, or investor prep..."
                />
              ) : (
                <div className="bg-[#0d0d16] border border-khoj-border rounded-xl p-6 text-center">
                  <h3 className="text-khoj-text font-bold text-lg mt-2">KHOJ AI Builder</h3>
                  <p className="text-khoj-subtle text-sm mt-2">
                    KHOJ AI Builder is private to the startup team.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Inbox (managers only) */}
          {canManage && (
            <div className={mountedTabs.current.has('inbox') && tab !== 'inbox' ? 'hidden' : ''}>
              {mountedTabs.current.has('inbox') && (
                <FounderInboxPanel
                  roomId={room.id}
                  roomTitle={room.title}
                  currentUserId={currentUserId ?? ''}
                  requests={requests}
                  invites={invites}
                  applications={applications}
                  accessRequests={accessRequests}
                  counts={counts}
                  loading={false}
                />
              )}
            </div>
          )}
        </div>

        {/* Match sidebar — only on roles tab for managers */}
        {canManage && tab === 'roles' && (
          <aside className="hidden xl:block">
            <MatchSidebar
              room={room}
              targetRole={roles.find((r) => r.status === 'open') ?? null}
              enabled={canManage}
            />
          </aside>
        )}
      </div>

      {/* Join request modal */}
      {joinRoleId !== null && (
        <StartupJoinRequestModal
          room={room}
          role={joinRole}
          userSnapshot={userSnapshot}
          onClose={() => { setJoinRoleId(null); setJoinRole(null) }}
        />
      )}

      {/* Access request modal */}
      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-khoj-card border border-khoj-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-khoj-border flex items-center justify-between">
              <div>
                <h3 className="text-khoj-text font-bold text-base">Request Access</h3>
                <p className="text-khoj-subtle text-xs mt-0.5">Tell the founder why you&apos;d like to see more details.</p>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="text-khoj-subtle hover:text-khoj-text">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block">
                <span className="text-xs text-khoj-subtle uppercase tracking-wide">Your reason *</span>
                <textarea
                  rows={4}
                  className="mt-1 w-full bg-[#0d0d16] border border-khoj-border rounded-lg px-3 py-2 text-khoj-text text-sm focus:outline-none focus:border-khoj-accent/60 resize-none"
                  placeholder="e.g. I'm a product designer looking to co-found in this space and would love to learn more about the solution approach."
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  maxLength={500}
                />
                <p className="text-khoj-subtle text-[10px] mt-1 text-right">{accessReason.length}/500</p>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-khoj-border flex justify-end gap-3">
              <button
                onClick={() => setShowAccessModal(false)}
                className="px-4 py-2 text-khoj-subtle hover:text-khoj-text text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAccessRequest}
                disabled={accessSubmitting || accessReason.trim().length < 10}
                className="px-4 py-2 bg-khoj-accent text-white text-sm font-medium rounded-lg hover:bg-khoj-accent/90 transition-colors disabled:opacity-50"
              >
                {accessSubmitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

