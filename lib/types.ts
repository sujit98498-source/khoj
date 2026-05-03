// lib/types.ts
// Single source of truth for shared TypeScript interfaces
// These mirror Firestore document shapes while preserving existing app features

export interface KhojUser {
  uid: string
  name: string
  email: string
  role?: 'admin' | 'user' // optional for legacy docs; new users default to 'user'
  /** Optional profile photo — stored in Firestore when user updates their profile */
  avatarUrl?: string
  /** Optional @handle */
  username?: string
  xp: number
  rank: number
  wins: number
  matchesPlayed: number
  skills: string[]
  createdAt: string
  lastActive: string
}

export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type TournamentPlacement = 'first' | 'second' | 'third'

export interface TournamentResults {
  first: string
  second: string
  third: string
}

export interface Tournament {
  id: string
  title: string
  name?: string
  description: string
  category: string
  maxPlayers: number
  currentPlayers: number
  entryFee?: number
  prizeXP: number
  prizeMoney?: number
  startDate: string
  endDate: string
  status: TournamentStatus
  results?: TournamentResults
  participants: string[]
  createdBy: string
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  createdAt: string
  createdBy: string
}

export interface Result {
  id: string
  tournamentId: string
  tournamentTitle: string
  results: TournamentResults
  xpAwards: Record<string, number>
  prizeMoney: number
  createdAt: string
  publishedBy: string
}

export interface Match {
  id: string
  tournamentId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  winnerId: string | null
  status: 'pending' | 'room_created' | 'active' | 'under_review' | 'completed'
  xpAwarded: boolean
  createdAt: string
  completedAt: string | null
}

export interface MatchHistoryEntry {
  matchId: string
  opponentName: string
  result: 'win' | 'loss' | 'draw'
  xpEarned: number
  date: string
  tournamentTitle: string
}

export interface Job {
  id: string
  title: string
  company: string
  description: string
  requiredXP: number
  salary: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
  skills: string[]
  postedAt: string
  isActive: boolean
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'verified'

export interface PaymentRecord {
  id: string
  userId: string
  userName?: string
  tournamentId: string
  tournamentName?: string
  amount: number
  paymentMethod: 'esewa'
  status: PaymentStatus
  transactionUuid: string
  productCode: string
  createdAt: string
  updatedAt?: string
  paidAt?: string
  verifiedAt?: string
  joinedAt?: string
  joined?: boolean
  gatewayStatus?: string
  gatewayResponse?: Record<string, unknown> | null
  adminNotes?: string
}

export type PayoutStatus = 'owed' | 'processing' | 'sent'

export interface PayoutRecord {
  id: string
  tournamentId: string
  tournamentName: string
  winnerId: string
  winnerName: string
  placement: TournamentPlacement
  prizeAmount: number
  payoutStatus: PayoutStatus
  dueDate: string
  paidDate?: string
  payoutMethod?: string
  reference?: string
}

export interface TournamentFinancialBreakdown {
  tournamentId: string
  tournamentName: string
  playersPaid: number
  totalCollected: number
  prizePool: number
  prizePaid: number
  prizeRemaining: number
  netRetained: number
  status: TournamentStatus
}

export interface FinanceActivity {
  id: string
  type: 'payment' | 'verification' | 'payout'
  title: string
  description: string
  amount?: number
  createdAt: string
  status?: string
}

export interface Notification {
  id: string
  userId: string
  type:
    | 'announcement'
    | 'result'
    | 'win'
    | 'job_unlock'
    | 'tournament_start'
    | 'xp_gained'
    | 'rank_change'
    | 'post_like'
    | 'post_comment'
    | 'new_follower'
    | 'connection_request'
    | 'connection_accepted'
    | 'message'
    | 'incoming_call'
  title: string
  message: string
  read: boolean
  /** Soft-delete flag — cleared notifications are hidden from the UI but not removed from Firestore */
  cleared?: boolean
  createdAt: string
  /** Optional deep-link to navigate to when the notification is clicked */
  actionUrl?: string
  metadata?: Record<string, string | number>
}

export type PostType = 'Story' | 'Achievement' | 'Discussion' | 'Team-Up' | 'Showcase'

// ── Calls ────────────────────────────────────────────────────────────────────

export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed'
export type CallType = 'voice' | 'video'

export interface CallRecord {
  id: string
  conversationId: string
  /** LiveKit room name — equals conversationId */
  roomName: string
  callerId: string
  callerName: string
  receiverId: string
  type: CallType
  status: CallStatus
  createdAt: string
}

export type ReactionType = 'like' | 'fire' | 'clap' | 'insightful' | 'support'

export type CircleId =
  | 'coding'
  | 'startups'
  | 'design'
  | 'career'
  | 'team-search'

export interface Circle {
  id: CircleId
  label: string
  icon: string
  color: string
}

export const CIRCLES: Circle[] = [
  { id: 'coding',     label: 'Coding',      icon: '⟨/⟩', color: 'text-khoj-teal' },
  { id: 'startups',   label: 'Startups',    icon: '⚡',   color: 'text-khoj-gold' },
  { id: 'design',     label: 'Design',      icon: '◉',    color: 'text-purple-400' },
  { id: 'career',     label: 'Career',      icon: '▲',    color: 'text-blue-400' },
  { id: 'team-search',label: 'Team Search', icon: '○',    color: 'text-green-400' },
]

export interface CommunityPost {
  id: string
  authorId: string
  authorName: string
  authorXP: number
  authorSkills: string[]
  type: PostType
  circle: CircleId
  content: string
  imageUrl?: string
  reactions: Record<ReactionType, number>
  commentCount: number
  saveCount: number
  shareCount: number
  createdAt: string
  updatedAt?: string
  pinned?: boolean
}

export interface CommunityComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorXP: number
  content: string
  createdAt: string
  parentId?: string
}

export type CommunityReportReason =
  | 'Spam'
  | 'Harassment or abuse'
  | 'Hate or discrimination'
  | 'False or misleading content'
  | 'Inappropriate content'
  | 'Scams or fraud'
  | 'Self-promotion spam'
  | 'Other'

export type CommunityReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken'

// ── Portfolio / Public Profile ────────────────────────────────────────────────

export type PlacementBadge = '1st' | '2nd' | '3rd' | 'top10' | 'finalist' | 'participant'

export interface PortfolioAchievement {
  id: string
  title: string
  description: string
  date: string
  /** Icon or emoji to display */
  icon: string
  /** Optional XP associated with this achievement */
  xpValue?: number
}

export interface PortfolioProject {
  id: string
  title: string
  description: string
  techStack: string[]
  /** URL to live demo — optional */
  liveUrl?: string
  /** URL to source repo — optional */
  repoUrl?: string
  /** ISO date string of when it was built/shipped */
  builtAt: string
  /** Featured marks project as pinned to top */
  featured?: boolean
}

export interface PortfolioCompetition {
  id: string
  tournamentId: string
  tournamentTitle: string
  category: string
  placement: PlacementBadge
  xpEarned: number
  date: string
  /** Prize money won in NPR/USD — optional */
  prize?: number
}

export interface PortfolioSocialLinks {
  github?: string
  linkedin?: string
  twitter?: string
  website?: string
  instagram?: string
}

export interface PortfolioEducation {
  id: string
  institution: string
  degree: string
  field: string
  startYear: string
  endYear: string
  current: boolean
  description?: string
}

export interface PortfolioExperience {
  id: string
  company: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description?: string
}

/**
 * Extended user profile for the public portfolio page.
 * Fields beyond KhojUser are optional so legacy users still render cleanly.
 * When connecting to a real DB, store these as a subcollection or extended document.
 */
export interface PortfolioUser {
  uid: string
  name: string
  /** Short @handle — optional, fallback to uid */
  username?: string
  /** Professional headline e.g. "Full-Stack Developer & Open Source Contributor" */
  headline?: string
  /** One-liner or multi-line bio */
  bio?: string
  /** Primary domain/category: Coding, Design, Esports, etc. */
  field?: string
  /** Profile photo URL */
  avatarUrl?: string
  /** Whether the user is open to jobs/collabs */
  availableForOpportunities?: boolean
  /** Whether contact email is shown publicly */
  contactVisible?: boolean
  /** Contact email shown on public profile — optional */
  contactEmail?: string
  /** City / region display string e.g. "Kathmandu, Nepal" */
  location?: string
  /** ISO 3166-1 alpha-2 country code or full name e.g. "Nepal" */
  country?: string
  /** Verified champion badge — earned through tournament wins */
  verifiedChampion?: boolean

  // Core stats (from KhojUser)
  xp: number
  rank: number
  wins: number
  matchesPlayed: number
  skills: string[]
  createdAt: string

  // Extended portfolio data
  achievements: PortfolioAchievement[]
  projects: PortfolioProject[]
  competitions: PortfolioCompetition[]
  socialLinks: PortfolioSocialLinks
  education?: PortfolioEducation[]
  experience?: PortfolioExperience[]
}

export interface CommunityPostReport {
  reportId: string
  postId: string
  reporterUserId: string
  reporterName?: string
  postOwnerUserId: string
  postOwnerName?: string
  postPreview?: string
  reason: CommunityReportReason
  details: string
  status: CommunityReportStatus
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
}

export const XP_CONFIG = {
  WIN: 100,
  LOSS: 10,
  PARTICIPATION: 10,
  TOURNAMENT_PARTICIPATION: 10,
  TOURNAMENT_FIRST: 100,
  TOURNAMENT_SECOND: 50,
  TOURNAMENT_THIRD: 25,
  TOP_3_BONUS: 50,
  TOURNAMENT_WIN_BONUS: 200,
} as const

// ── Social / Connections ─────────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

/** Computed UI state for the Connect button on a profile */
export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

/**
 * A friend/connection request between two users.
 * ── DB: Firestore collection `friendRequests/{id}`
 */
export interface FriendRequest {
  id: string
  fromUserId: string
  fromUserName: string
  fromUserAvatar?: string
  fromUserUsername?: string
  toUserId: string
  toUserName: string
  toUserAvatar?: string
  toUserUsername?: string
  status: FriendRequestStatus
  createdAt: string
  updatedAt: string
}

/**
 * An established friendship between two users.
 * ── DB: Firestore collection `friends/{id}`
 */
export interface Friendship {
  id: string
  /** Both UIDs — supports array-contains queries */
  userIds: string[]
  userNames: Record<string, string>
  userAvatars: Record<string, string>
  userUsernames: Record<string, string>
  createdAt: string
}

// ── Direct Messaging ──────────────────────────────────────────────────────────

/**
 * A participant in a conversation.
 * Snapshot of the user's display info at conversation-creation time.
 * ── DB swap: store as a sub-map inside the Conversation document.
 */
export interface MessageParticipant {
  uid: string
  name: string
  username?: string
  avatarUrl?: string
  /** 'user' | 'recruiter' | 'admin' */
  role?: string
}

/**
 * A single message in a thread.
 * ── DB swap: Firestore sub-collection  conversations/{id}/messages/{msgId}
 *            or Supabase table `messages` with conversationId FK.
 */
export interface DirectMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  createdAt: string
  /** UIDs of participants who have read this message */
  readBy: string[]
}

/**
 * A conversation thread between exactly two participants.
 * ID is deterministic: conv_${[uid1, uid2].sort().join('_')}
 * This guarantees no duplicate threads for the same pair.
 *
 * ── DB swap: Firestore collection `conversations/{id}`
 *            Query: where('participantIds', 'array-contains', uid)
 */
export interface Conversation {
  id: string
  /** Both participants (exactly 2 for DMs) */
  participants: MessageParticipant[]
  /** Flat array for easy Firestore array-contains queries */
  participantIds: string[]
  /** Preview of the last message */
  lastMessage?: string
  lastMessageAt?: string
  lastMessageSenderId?: string
  createdAt: string
  updatedAt?: string
  /** Per-uid unread message count: { uid: count } */
  unreadCount: Record<string, number>
}

// ── Hiring Pipeline ───────────────────────────────────────────────────────────

export type WorkType = 'remote' | 'onsite' | 'hybrid'

export type ExperienceLevel =
  | 'intern'
  | 'entry'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive'

export type JobCategory =
  | 'Coding'
  | 'Design'
  | 'Esports'
  | 'Startups'
  | 'Marketing'
  | 'Data'
  | 'Product'
  | 'Other'

/**
 * ApplicationStage — the Kanban column in the recruiter pipeline.
 * ── DB swap: stored as a field on the JobApplication document.
 */
export type ApplicationStage =
  | 'applied'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'hired'

export type InviteStatus = 'pending' | 'accepted' | 'declined'

/**
 * A recruiter-created job post.
 * ── DB swap: Firestore collection `jobPosts/{id}`
 *            Query: where('active', '==', true) orderBy('createdAt', 'desc')
 */
export interface JobPost {
  id: string
  /** UID of the recruiter who created it */
  recruiterId: string
  recruiterName: string
  company: string
  title: string
  location: string
  workType: WorkType
  /** Salary range min in USD / display currency */
  salaryMin?: number
  salaryMax?: number
  salaryCurrency: string
  category: JobCategory
  requiredSkills: string[]
  experienceLevel: ExperienceLevel
  description: string
  /** ISO date string — application deadline */
  deadline: string
  active: boolean
  /** Soft-delete flag — archived jobs stay in DB but are hidden from public board */
  deleted?: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
  /** Denormalized count for display — increment on apply */
  applicationCount: number
}

/**
 * A user's job application.
 * ── DB swap: Firestore collection `jobApplications/{id}`
 *            Query by jobId (recruiter view) or by applicantId (user view)
 */
export interface JobApplication {
  id: string
  jobId: string
  jobTitle: string
  company: string
  /** UID of the applicant */
  applicantId: string
  applicantName: string
  applicantUsername?: string
  applicantAvatarUrl?: string
  /** Optional cover message from applicant */
  message?: string
  stage: ApplicationStage
  appliedAt: string
  updatedAt: string
  /** Private notes from recruiter */
  recruiterNotes?: string
  /** If applied via invite, store invite ID */
  inviteId?: string
}

/**
 * A recruiter's direct invite to a specific user.
 * ── DB swap: Firestore collection `jobInvites/{id}`
 *            Query: where('recipientId', '==', uid) for user inbox
 *                   where('recruiterId', '==', uid) for recruiter view
 */
export interface JobInvite {
  id: string
  jobId: string
  jobTitle: string
  company: string
  recruiterId: string
  recruiterName: string
  recipientId: string
  recipientName: string
  /** Optional personal message from recruiter */
  message?: string
  status: InviteStatus
  sentAt: string
  respondedAt?: string
}

// ── Opportunity Market ────────────────────────────────────────────────────────

/**
 * OpportunityType — the category of a non-standard job listing.
 * 'startup_job' maps directly to the existing JobPost / HiringJobCard flow.
 */
export type OpportunityType =
  | 'cofounder'
  | 'startup_job'
  | 'internship'
  | 'project'
  | 'funding'
  | 'competition'
  | 'mentor'

/**
 * A flexible opportunity listing for the Opportunity Market (/jobs).
 * Covers co-founder search, internships, open-source projects, funding pitches,
 * competitions, and mentorship — all in one normalised shape.
 *
 * ── DB: Firestore collection `opportunities/{id}`
 *        Query: where('status', '==', 'open') + orderBy('createdAt', 'desc')
 */
export interface Opportunity {
  id: string
  type: OpportunityType
  title: string
  description: string

  // Poster
  postedBy: string
  postedByName: string
  postedByAvatarUrl?: string

  // Optional link back to a Startup Room role
  startupId?: string
  roomId?: string
  roleId?: string
  /** Set to 'startup_room_role' when auto-published from a Startup Room */
  sourceType?: 'startup_room_role' | 'manual'

  // Classification
  category: string
  skillsRequired: string[]

  // Work logistics
  location?: string
  remoteAllowed?: boolean
  compensationType?: 'paid' | 'unpaid' | 'equity' | 'stipend' | 'prize'
  equityRange?: string

  // Status
  status: 'open' | 'closed'
  createdAt: string
  updatedAt?: string

  // ── Co-founder specific ────────────────────────────────────────────────
  startupName?: string
  startupStage?: 'idea' | 'mvp' | 'traction' | 'growth'
  weeklyCommitment?: string

  // ── Funding specific ──────────────────────────────────────────────────
  fundingNeeded?: string
  useOfFunds?: string
  traction?: string

  // ── Mentor / Internship specific ──────────────────────────────────────
  durationWeeks?: number

  // ── Competition / Project specific ────────────────────────────────────
  deadline?: string
  prizePool?: string
  teamSize?: string

  // ── KHOJ AI Evaluation ────────────────────────────────────────────────
  /** AI Validation Readiness Score (0–10), populated when a KHOJ AI evaluation exists */
  aiScore?: number
  aiRatingLabel?: string
  aiEvaluationId?: string
}

// ── Interview Scheduling ──────────────────────────────────────────────────────

/**
 * Lifecycle state of a scheduled interview from the recruiter's perspective.
 * ── DB swap: stored as a field on the InterviewSchedule document.
 */
export type InterviewStatus =
  | 'scheduled'
  | 'accepted'
  | 'declined'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled'

/** Format of the meeting. */
export type MeetingType = 'online' | 'phone' | 'onsite'

/**
 * A single interview session between a recruiter and a candidate.
 * Linked to both a JobPost and a JobApplication.
 *
 * ── DB swap: Firestore collection `interviews/{id}`
 *            Query recruiter view: where('recruiterId', '==', uid)
 *            Query candidate view: where('candidateId', '==', uid)
 *            Real-time: onSnapshot for live status updates
 */
export interface InterviewSchedule {
  id: string
  /** Links back to the job */
  jobId: string
  jobTitle: string
  /** Links back to the specific application */
  applicationId: string
  /** Recruiter info */
  recruiterId: string
  recruiterName: string
  /** Candidate info — snapshot at schedule time */
  candidateId: string
  candidateName: string
  candidateUsername?: string
  candidateAvatarUrl?: string
  /** Interview metadata */
  title: string
  /** ISO date: YYYY-MM-DD */
  date: string
  /** HH:MM 24-hour */
  time: string
  timezone: string
  meetingType: MeetingType
  /** Video / call link — relevant for online/phone */
  meetingLink?: string
  /** Physical address — relevant for onsite */
  location?: string
  /** Recruiter instructions or agenda for the candidate */
  notes?: string
  /** Current status in the lifecycle */
  status: InterviewStatus
  /** Candidate's note when requesting reschedule */
  rescheduleNote?: string
  /** ISO timestamp when interview was created */
  scheduledAt: string
  updatedAt: string
}

// ── Saved Jobs ────────────────────────────────────────────────────────────────

/**
 * A job post that a user has bookmarked for later.
 * ── DB swap: Firestore collection `savedJobs/{id}`
 *            Query: where('userId', '==', uid) orderBy('savedAt', 'desc')
 */
export interface SavedJob {
  /** Deterministic ID: saved_${userId}_${jobId} */
  id: string
  userId: string
  jobId: string
  /** Snapshot of job fields for display even after job is deleted */
  jobTitle: string
  company: string
  location: string
  workType: WorkType
  salaryMin?: number
  salaryMax?: number
  salaryCurrency: string
  category: JobCategory
  deadline: string
  /** ISO timestamp when the job was saved */
  savedAt: string
}

// ── Job Alerts ────────────────────────────────────────────────────────────────

export type AlertFrequency = 'instant' | 'daily' | 'weekly'

/**
 * A user-configured alert that notifies them when matching jobs are posted.
 * ── DB swap: Firestore collection `jobAlerts/{id}`
 *            Query: where('userId', '==', uid)
 */
export interface JobAlert {
  id: string
  userId: string
  /** Human-readable label shown in the list */
  label: string
  keyword?: string
  category?: JobCategory
  location?: string
  workType?: WorkType
  salaryMin?: number
  salaryMax?: number
  frequency: AlertFrequency
  /** Whether the alert is currently active */
  active: boolean
  createdAt: string
  updatedAt: string
}

// ── Live Streams ──────────────────────────────────────────────────────────────

export type StreamStatus = 'live' | 'ended'

export type StreamCategory =
  | 'Coding'
  | 'Gaming'
  | 'Startup'
  | 'Fitness'
  | 'Design'
  | 'Education'
  | 'Tournaments'
  | 'Other'

/**
 * A live stream created by a host.
 * ── DB: Firestore collection `streams/{streamId}`
 */
export interface Stream {
  id: string
  title: string
  description: string
  category: StreamCategory
  visibility: 'public' | 'private'
  status: StreamStatus
  hostId: string
  hostName: string
  hostPhoto: string
  viewerCount: number
  likeCount: number
  thumbnailUrl: string
  chatEnabled: boolean
  createdAt: string
  endedAt: string | null
}

/**
 * A chat message inside a live stream.
 * ── DB: Firestore sub-collection `streams/{streamId}/messages/{messageId}`
 */
export interface StreamMessage {
  id: string
  userId: string
  userName: string
  userPhoto: string
  text: string
  createdAt: string
  isDeleted: boolean
  reportCount: number
}

/**
 * A request from a viewer to join a live stream as a guest.
 * ── DB: Firestore sub-collection `streams/{streamId}/joinRequests/{requestId}`
 */
export interface JoinRequest {
  id: string
  userId: string
  userName: string
  userPhoto: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt: string | null
}

/**
 * An active participant (host or guest) in a live stream.
 * ── DB: Firestore sub-collection `streams/{streamId}/participants/{userId}`
 * NOTE: Viewers are NOT stored here. Only host and accepted guests appear.
 */
export interface StreamParticipant {
  userId: string
  userName: string
  userPhoto: string
  role: 'host' | 'guest'
  joinedAt: string
}
