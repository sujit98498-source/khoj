// types/collaboration.ts
// Shared TypeScript types for the Collaboration Rooms + Startup Rooms system.
// All types mirror Firestore document shapes.

import { Timestamp } from 'firebase/firestore'

// ── Feature flag ──────────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_STARTUP_ROOMS_V1=true in .env.local to enable startup rooms UI.
export const STARTUP_ROOMS_V1 =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_STARTUP_ROOMS_V1 === 'true'

// ── Primitive types ───────────────────────────────────────────────────────────
export type StartupStage = 'idea' | 'mvp' | 'traction' | 'growth'
export type LocationMode = 'remote' | 'hybrid' | 'onsite'
export type Commitment = 'part_time' | 'full_time' | 'flexible'
export type LookingFor = 'cofounder' | 'contributors' | 'both'
export type RoomType = 'tournament' | 'team' | 'circle' | 'voice' | 'startup'
export type RoomVisibility = 'public' | 'private' | 'invite_only'
export type RoomDocStatus = 'active' | 'archived' | 'deleted'
export type RoomRole = 'owner' | 'cofounder' | 'member' | 'advisor'
export type MemberStatus = 'active' | 'trial' | 'inactive'
export type RoleType = 'cofounder' | 'contributor' | 'advisor'
export type RoleStatus = 'open' | 'paused' | 'filled' | 'closed'
export type JoinRequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
export type JoinRequestType = 'cofounder' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
export type AssetType = 'deck' | 'doc' | 'image' | 'logo' | 'link'
export type AssetVisibility = 'room' | 'public'
export type SessionType = 'voice' | 'video' | 'pitch' | 'standup'
export type SessionStatus = 'scheduled' | 'live' | 'ended'
export type MilestoneStatus = 'todo' | 'in_progress' | 'done'
export type VisibilityMode = 'public_preview' | 'private' | 'unlisted'
export type AccessRequestStatus = 'pending' | 'accepted' | 'rejected'

// ── Startup sub-document (nested on room doc) ─────────────────────────────────
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

// ── rooms/{roomId} ────────────────────────────────────────────────────────────
export interface CollabRoom {
  id: string
  title: string
  slug: string
  roomType: RoomType
  visibility: RoomVisibility
  status: RoomDocStatus
  createdBy: string
  summary: string
  coverImageUrl?: string | null
  tags?: string[]
  memberCount: number
  openRoleCount: number
  pendingJoinRequestCount: number
  currentLiveSessionId?: string | null
  isRecruiting?: boolean
  founderName?: string
  lastActivityAt: Timestamp | string
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
  startup?: StartupSubDoc
  // ── Privacy / visibility controls ─────────────────────────────────────
  visibilityMode?: VisibilityMode
  protectedDetailsEnabled?: boolean
  privateFilesEnabled?: boolean
}

// ── startupProfiles/{userId} ──────────────────────────────────────────────────
export interface StartupProfile {
  userId: string
  visibility: 'public' | 'private'
  headline: string
  bio: string
  roleCategories: string[]
  skills: string[]
  industryTags?: string[]
  stageInterests?: string[]
  locationMode?: LocationMode
  city?: string
  country?: string
  timezone?: string
  availability?: Commitment
  lookingFor?: Array<'cofounder' | 'project' | 'job'>
  workStyle?: string[]
  links?: {
    portfolioUrl?: string
    linkedinUrl?: string
    githubUrl?: string
    websiteUrl?: string
    introVideoUrl?: string
  }
  proofSignals?: {
    tracksCompleted?: number
    arenaProjects?: number
    totalXp?: number
    leaderboardPercentile?: number
  }
  updatedAt: Timestamp | string
}

// ── Profile snapshot (denormalized) ─────────────────────────────────────────
export interface ProfileSnapshot {
  displayName?: string
  username?: string
  avatarUrl?: string
  headline?: string
  roleCategories?: string[]
}

// ── rooms/{roomId}/members/{userId} ──────────────────────────────────────────
export interface MemberPermissions {
  manageMembers: boolean
  manageRoles: boolean
  manageAssets: boolean
  manageSessions: boolean
}

export interface RoomMember {
  id: string          // == userId
  userId: string
  roomRole: RoomRole
  status: MemberStatus
  permissions: MemberPermissions
  joinedAt: Timestamp | string
  joinedVia: 'create' | 'join_request' | 'invite' | 'manual' | 'application'
  trialEndsAt?: Timestamp | string | null
  profileSnapshot?: ProfileSnapshot
  /** The role title they were accepted for (from roleApplication) */
  functionalRole?: string
  /** Application doc ID that led to membership */
  joinedFromApplicationId?: string
  /** UID of the founder who approved the application */
  approvedBy?: string
}

export type RoleApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type CompensationPreference = 'equity' | 'paid' | 'both' | 'volunteer'

// ── rooms/{roomId}/roleApplications/{applicationId} ───────────────────────────
export interface RoleApplication {
  id: string
  roleId: string
  roleTitle: string
  applicantId: string
  applicantName: string
  applicantPhoto: string
  message: string
  portfolioLink: string
  skills: string[]
  /** Hours per week the applicant can commit */
  weeklyCommitment?: number
  compensationPreference?: CompensationPreference
  /** Optional Loom / YouTube intro video */
  introVideoLink?: string
  status: RoleApplicationStatus
  createdAt: Timestamp | string
  decidedAt?: Timestamp | string | null
  decidedBy?: string | null
}

// ── rooms/{roomId}/roles/{roleId} ─────────────────────────────────────────────
export interface StartupRole {
  id: string
  title: string
  category: string
  roleType: RoleType
  seats: number
  seatsFilled: number
  status: RoleStatus
  mustHaveSkills?: string[]
  niceToHaveSkills?: string[]
  commitment?: Commitment
  locationMode?: LocationMode
  timezonePreference?: string
  description: string
  createdBy: string
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
  /** Opportunity Market fields */
  publishToMarket?: boolean
  opportunityId?: string
  compensationType?: CompensationPreference
  equityRange?: string
  weeklyCommitment?: string
}

// ── rooms/{roomId}/joinRequests/{requestId} ───────────────────────────────────
export interface JoinRequest {
  id: string
  userId: string
  roleId?: string | null
  requestType: JoinRequestType
  status: JoinRequestStatus
  message: string
  links?: string[]
  proofSnapshot?: {
    introVideoUrl?: string
    portfolioUrl?: string
    tracksCompleted?: number
    arenaProjects?: number
  }
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
  respondedAt?: Timestamp | string | null
  expiresAt?: Timestamp | string | null
  // Denormalized for display
  userSnapshot?: ProfileSnapshot
}

// ── rooms/{roomId}/invites/{inviteId} ─────────────────────────────────────────
export interface StartupInvite {
  id: string
  targetUserId: string
  roleId?: string | null
  sentBy: string
  status: InviteStatus
  message?: string
  roomSnapshot?: {
    title: string
    summary: string
    coverImageUrl?: string
  }
  roleSnapshot?: {
    title?: string
    category?: string
    roleType?: string
  }
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
  respondedAt?: Timestamp | string | null
  expiresAt?: Timestamp | string | null
}

// ── rooms/{roomId}/assets/{assetId} ──────────────────────────────────────────
export interface RoomAsset {
  id: string
  assetType: AssetType
  name: string
  storagePath?: string
  externalUrl?: string
  contentType?: string
  sizeBytes?: number
  uploadedBy: string
  visibility: AssetVisibility
  metadata?: Record<string, string>
  createdAt: Timestamp | string
}

// ── rooms/{roomId}/sessions/{sessionId} ──────────────────────────────────────
export interface StartupSession {
  id: string
  title: string
  sessionType: SessionType
  status: SessionStatus
  createdBy: string
  liveKitRoomName: string
  startsAt?: Timestamp | string | null
  endedAt?: Timestamp | string | null
  participantCount?: number
  createdAt: Timestamp | string
}

// ── rooms/{roomId}/milestones/{milestoneId} ───────────────────────────────────
export interface Milestone {
  id: string
  title: string
  description?: string
  status: MilestoneStatus
  ownerIds?: string[]
  dueAt?: Timestamp | string | null
  createdBy: string
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
}

// ── users/{userId}/roomMemberships/{roomId} ───────────────────────────────────
export interface UserRoomMembership {
  roomId: string
  title: string
  coverImageUrl?: string
  roomType: RoomType
  roomRole: RoomRole
  status: MemberStatus
  joinedAt: Timestamp | string
  lastActivityAt?: Timestamp | string
}

// ── Matching ──────────────────────────────────────────────────────────────────
export interface MatchResult {
  profile: StartupProfile
  score: number
  breakdown: {
    roleFit: number
    skillOverlap: number
    commitmentMatch: number
    locationMatch: number
    stageMatch: number
    proofSignals: number
  }
}

// ── rooms/{roomId}/accessRequests/{requestId} ────────────────────────────────
export interface AccessRequest {
  id: string
  userId: string
  userName: string
  userPhoto: string
  reason: string
  status: AccessRequestStatus
  createdAt: Timestamp | string
  decidedAt?: Timestamp | string | null
  decidedBy?: string | null
}

// ── rooms/{roomId}/access/{userId} ────────────────────────────────────────────
export interface RoomAccess {
  userId: string
  level: 'details' | 'files'
  grantedAt: Timestamp | string
  grantedBy: string
}

// ── Founder inbox ─────────────────────────────────────────────────────────────
export interface FounderInboxCounts {
  pendingRequests: number
  pendingInvites: number
  pendingAccessRequests: number
  total: number
}

// ── Callable function payloads ────────────────────────────────────────────────
export interface CreateStartupRoomPayload {
  title: string
  summary: string
  visibility: RoomVisibility
  startup: StartupSubDoc
  coverImageUrl?: string
  tags?: string[]
  createDefaultRole?: boolean
  defaultRoleTitle?: string
  defaultRoleCategory?: string
  defaultRoleDescription?: string
  // Privacy fields
  visibilityMode?: VisibilityMode
  protectedDetailsEnabled?: boolean
  privateFilesEnabled?: boolean
  /** Publish the default role to Opportunity Market on creation */
  publishDefaultRoleToMarket?: boolean
}

export interface SubmitJoinRequestPayload {
  roomId: string
  roleId?: string | null
  requestType: JoinRequestType
  message: string
  links?: string[]
  proofSnapshot?: JoinRequest['proofSnapshot']
}

export interface ReviewJoinRequestPayload {
  roomId: string
  requestId: string
  action: 'accept' | 'decline'
  setTrial?: boolean
}

export interface SendInvitePayload {
  roomId: string
  targetUserId: string
  roleId?: string | null
  message?: string
}

export interface RespondToInvitePayload {
  roomId: string
  inviteId: string
  action: 'accept' | 'decline'
}

export interface CreateSessionPayload {
  roomId: string
  title: string
  sessionType: SessionType
  startsAt?: string | null
}
