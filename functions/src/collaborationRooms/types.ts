// functions/src/collaborationRooms/types.ts
// Shared types for Cloud Functions — mirrors types/collaboration.ts from the Next.js app.

import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export type StartupStage    = 'idea' | 'mvp' | 'traction' | 'growth'
export type LocationMode    = 'remote' | 'hybrid' | 'onsite'
export type Commitment      = 'part_time' | 'full_time' | 'flexible'
export type LookingFor      = 'cofounder' | 'contributors' | 'both'
export type RoomType        = 'tournament' | 'team' | 'circle' | 'voice' | 'startup'
export type RoomVisibility  = 'public' | 'private' | 'invite_only'
export type RoomDocStatus   = 'active' | 'archived' | 'deleted'
export type RoomRole        = 'owner' | 'cofounder' | 'member' | 'advisor'
export type MemberStatus    = 'active' | 'trial' | 'inactive'
export type RoleType        = 'cofounder' | 'contributor' | 'advisor'
export type JoinRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
export type InviteStatus    = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
export type SessionType     = 'voice' | 'video' | 'pitch' | 'standup'

export interface StartupSubDoc {
  stage: StartupStage
  problem: string
  solution: string
  tractionSummary?: string
  industryTags?: string[]
  locationMode: LocationMode
  city?: string
  country?: string
  timezone?: string
  commitment: Commitment
  lookingFor: LookingFor
  maxFounders?: number
  progressProofCount?: number
}

export interface MemberPermissions {
  manageMembers: boolean
  manageRoles: boolean
  manageAssets: boolean
  manageSessions: boolean
}

export interface ProfileSnapshot {
  displayName?: string
  username?: string
  avatarUrl?: string
  headline?: string
  roleCategories?: string[]
}

export const COLLECTIONS = {
  ROOMS:            'rooms',
  STARTUP_PROFILES: 'startupProfiles',
  MEMBERS:          'members',
  ROLES:            'roles',
  JOIN_REQUESTS:    'joinRequests',
  INVITES:          'invites',
  ASSETS:           'assets',
  SESSIONS:         'sessions',
  MILESTONES:       'milestones',
  ROOM_MEMBERSHIPS: 'roomMemberships',
  USERS:            'users',
} as const

export const OWNER_PERMISSIONS: MemberPermissions = {
  manageMembers: true, manageRoles: true, manageAssets: true, manageSessions: true,
}
export const MEMBER_PERMISSIONS: MemberPermissions = {
  manageMembers: false, manageRoles: false, manageAssets: false, manageSessions: false,
}

export function permissionsForRole(role: RoomRole): MemberPermissions {
  if (role === 'owner' || role === 'cofounder') return OWNER_PERMISSIONS
  return MEMBER_PERMISSIONS
}

export function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
