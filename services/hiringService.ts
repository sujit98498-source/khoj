// services/hiringService.ts
// localStorage-backed hiring pipeline service.
// Covers: JobPost CRUD · JobApplication CRUD · JobInvite CRUD · Kanban stage updates
//
// ── How to connect Firestore later ───────────────────────────────────────────
// 1. Replace STORAGE_KEYS.* reads/writes with:
//      setDoc(doc(db, 'jobPosts', id), data)
//      getDocs(query(collection(db, 'jobPosts'), where('active','==',true)))
// 2. Replace application queries with:
//      getDocs(query(collection(db,'jobApplications'), where('jobId','==',jobId)))
//      getDocs(query(collection(db,'jobApplications'), where('applicantId','==',uid)))
// 3. Replace invite queries with:
//      getDocs(query(collection(db,'jobInvites'), where('recipientId','==',uid)))
// 4. For real-time updates use onSnapshot instead of one-off gets.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  JobPost,
  JobApplication,
  JobInvite,
  ApplicationStage,
  InviteStatus,
} from '@/lib/types'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  JOB_POSTS: 'khoj_job_posts',               // JobPost[]
  JOB_APPLICATIONS: 'khoj_job_applications', // JobApplication[]
  JOB_INVITES: 'khoj_job_invites',           // JobInvite[]
} as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function writeList<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Mock seed data (loaded once if storage is empty) ─────────────────────────

const MOCK_RECRUITER_ID = 'recruiter_demo'
const MOCK_JOBS: Omit<JobPost, 'id'>[] = [
  {
    recruiterId: MOCK_RECRUITER_ID,
    recruiterName: 'Priya Sharma',
    company: 'NovaTech Labs',
    title: 'Senior Frontend Engineer',
    location: 'Bangalore, India',
    workType: 'hybrid',
    salaryMin: 180000,
    salaryMax: 260000,
    salaryCurrency: 'NPR',
    category: 'Coding',
    requiredSkills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    experienceLevel: 'senior',
    description:
      'We are looking for a passionate Senior Frontend Engineer to lead our product UI. You will work directly with the founding team to build beautiful, performant interfaces. Deep experience with React and TypeScript is a must. Knowledge of design systems is a big plus.',
    deadline: '2026-05-30',
    active: true,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
    applicationCount: 4,
  },
  {
    recruiterId: MOCK_RECRUITER_ID,
    recruiterName: 'Priya Sharma',
    company: 'NovaTech Labs',
    title: 'Full-Stack Developer',
    location: 'Remote',
    workType: 'remote',
    salaryMin: 120000,
    salaryMax: 180000,
    salaryCurrency: 'NPR',
    category: 'Coding',
    requiredSkills: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
    experienceLevel: 'mid',
    description:
      'Join our backend team to build scalable APIs powering millions of users. You will design and implement REST and GraphQL services, collaborate with mobile and frontend teams, and champion engineering excellence.',
    deadline: '2026-06-15',
    active: true,
    createdAt: '2026-04-05T08:00:00Z',
    updatedAt: '2026-04-05T08:00:00Z',
    applicationCount: 2,
  },
  {
    recruiterId: 'recruiter_xyz',
    recruiterName: 'Rajan Koirala',
    company: 'PixelForge Studio',
    title: 'UI/UX Designer',
    location: 'Kathmandu, Nepal',
    workType: 'onsite',
    salaryMin: 80000,
    salaryMax: 130000,
    salaryCurrency: 'NPR',
    category: 'Design',
    requiredSkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    experienceLevel: 'mid',
    description:
      'Design next-generation gaming interfaces and esports platforms. You will own the end-to-end design process — from discovery through delivery — working closely with engineers and stakeholders.',
    deadline: '2026-05-20',
    active: true,
    createdAt: '2026-04-10T12:00:00Z',
    updatedAt: '2026-04-10T12:00:00Z',
    applicationCount: 7,
  },
  {
    recruiterId: 'recruiter_xyz',
    recruiterName: 'Rajan Koirala',
    company: 'PixelForge Studio',
    title: 'Esports Content Creator',
    location: 'Remote',
    workType: 'remote',
    salaryMin: 50000,
    salaryMax: 90000,
    salaryCurrency: 'NPR',
    category: 'Esports',
    requiredSkills: ['Content Writing', 'Video Editing', 'Social Media', 'Gaming'],
    experienceLevel: 'entry',
    description:
      'Create engaging esports content — highlight reels, tournament recaps, player spotlights. Strong understanding of the gaming community and ability to produce high-quality video content required.',
    deadline: '2026-05-10',
    active: true,
    createdAt: '2026-04-12T09:30:00Z',
    updatedAt: '2026-04-12T09:30:00Z',
    applicationCount: 12,
  },
  {
    recruiterId: 'recruiter_abc',
    recruiterName: 'Anisha Gurung',
    company: 'DataSprint Analytics',
    title: 'Data Analyst',
    location: 'Hybrid (Pokhara)',
    workType: 'hybrid',
    salaryMin: 90000,
    salaryMax: 150000,
    salaryCurrency: 'NPR',
    category: 'Data',
    requiredSkills: ['Python', 'SQL', 'Tableau', 'Statistics'],
    experienceLevel: 'entry',
    description:
      'Turn raw competition data into actionable insights. You will build dashboards, run cohort analyses, and help product teams make data-driven decisions. Python and SQL are essential.',
    deadline: '2026-06-01',
    active: true,
    createdAt: '2026-04-15T14:00:00Z',
    updatedAt: '2026-04-15T14:00:00Z',
    applicationCount: 3,
  },
]

/** Initialize mock data once on first load */
function ensureSeedData(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(KEYS.JOB_POSTS)) return // already seeded
  const posts: JobPost[] = MOCK_JOBS.map((j) => ({ ...j, id: uid() }))
  writeList(KEYS.JOB_POSTS, posts)
}

// ── JobPost ───────────────────────────────────────────────────────────────────

export function getJobPosts(): JobPost[] {
  ensureSeedData()
  return readList<JobPost>(KEYS.JOB_POSTS)
}

export function getActiveJobPosts(): JobPost[] {
  return getJobPosts().filter((j) => j.active && !j.deleted)
}

export function getJobPostsByRecruiter(recruiterId: string): JobPost[] {
  return getJobPosts().filter((j) => j.recruiterId === recruiterId)
}

export function getJobPost(jobId: string): JobPost | null {
  return getJobPosts().find((j) => j.id === jobId) ?? null
}

export function createJobPost(
  data: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount'>
): JobPost {
  const posts = getJobPosts()
  const newPost: JobPost = {
    ...data,
    id: uid(),
    applicationCount: 0,
    createdAt: now(),
    updatedAt: now(),
  }
  writeList(KEYS.JOB_POSTS, [...posts, newPost])
  return newPost
}

export function updateJobPost(
  jobId: string,
  updates: Partial<Omit<JobPost, 'id' | 'createdAt'>>
): JobPost | null {
  const posts = getJobPosts()
  const idx = posts.findIndex((j) => j.id === jobId)
  if (idx === -1) return null
  const updated = { ...posts[idx], ...updates, updatedAt: now() }
  posts[idx] = updated
  writeList(KEYS.JOB_POSTS, posts)
  return updated
}

export function deleteJobPost(jobId: string): void {
  const posts = getJobPosts().filter((j) => j.id !== jobId)
  writeList(KEYS.JOB_POSTS, posts)
}

/** Soft-delete: marks job as deleted & inactive. Applications are preserved. */
export function archiveJob(jobId: string): JobPost | null {
  return updateJobPost(jobId, { deleted: true, active: false, deletedAt: now() } as Partial<JobPost>)
}

/** Restore a previously archived job (sets deleted = false, keeps active = false so recruiter re-enables manually). */
export function restoreJob(jobId: string): JobPost | null {
  const posts = getJobPosts()
  const idx = posts.findIndex((j) => j.id === jobId)
  if (idx === -1) return null
  const { deletedAt: _dt, ...rest } = posts[idx] as JobPost & { deletedAt?: string }
  posts[idx] = { ...rest, deleted: false, active: false, updatedAt: now() }
  writeList(KEYS.JOB_POSTS, posts)
  return posts[idx]
}

// ── JobApplication ────────────────────────────────────────────────────────────

export function getApplications(): JobApplication[] {
  return readList<JobApplication>(KEYS.JOB_APPLICATIONS)
}

/** All applications for a specific job (recruiter view) */
export function getApplicationsForJob(jobId: string): JobApplication[] {
  return getApplications().filter((a) => a.jobId === jobId)
}

/** All applications by a specific user (applicant view) */
export function getApplicationsByUser(applicantId: string): JobApplication[] {
  return getApplications()
    .filter((a) => a.applicantId === applicantId)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
}

export function getApplication(applicationId: string): JobApplication | null {
  return getApplications().find((a) => a.id === applicationId) ?? null
}

/** Returns existing application or creates a new one (idempotent) */
export function applyToJob(params: {
  job: JobPost
  applicantId: string
  applicantName: string
  applicantUsername?: string
  applicantAvatarUrl?: string
  message?: string
  inviteId?: string
}): JobApplication {
  const existing = getApplications().find(
    (a) => a.jobId === params.job.id && a.applicantId === params.applicantId
  )
  if (existing) return existing

  const apps = getApplications()
  const newApp: JobApplication = {
    id: uid(),
    jobId: params.job.id,
    jobTitle: params.job.title,
    company: params.job.company,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantUsername: params.applicantUsername,
    applicantAvatarUrl: params.applicantAvatarUrl,
    message: params.message,
    stage: 'applied',
    appliedAt: now(),
    updatedAt: now(),
    inviteId: params.inviteId,
  }
  writeList(KEYS.JOB_APPLICATIONS, [...apps, newApp])

  // Increment applicationCount on the job
  updateJobPost(params.job.id, {
    applicationCount: params.job.applicationCount + 1,
  })

  return newApp
}

/** Check if user has already applied to a job */
export function hasApplied(jobId: string, applicantId: string): boolean {
  return getApplications().some(
    (a) => a.jobId === jobId && a.applicantId === applicantId
  )
}

/** Move an application to a new Kanban stage */
export function updateApplicationStage(
  applicationId: string,
  stage: ApplicationStage
): JobApplication | null {
  const apps = getApplications()
  const idx = apps.findIndex((a) => a.id === applicationId)
  if (idx === -1) return null
  apps[idx] = { ...apps[idx], stage, updatedAt: now() }
  writeList(KEYS.JOB_APPLICATIONS, apps)
  return apps[idx]
}

export function updateApplicationNotes(
  applicationId: string,
  notes: string
): JobApplication | null {
  const apps = getApplications()
  const idx = apps.findIndex((a) => a.id === applicationId)
  if (idx === -1) return null
  apps[idx] = { ...apps[idx], recruiterNotes: notes, updatedAt: now() }
  writeList(KEYS.JOB_APPLICATIONS, apps)
  return apps[idx]
}

// ── JobInvite ─────────────────────────────────────────────────────────────────

export function getInvites(): JobInvite[] {
  return readList<JobInvite>(KEYS.JOB_INVITES)
}

/** Invites received by a user */
export function getInvitesByRecipient(recipientId: string): JobInvite[] {
  return getInvites()
    .filter((i) => i.recipientId === recipientId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

/** Invites sent by a recruiter */
export function getInvitesByRecruiter(recruiterId: string): JobInvite[] {
  return getInvites().filter((i) => i.recruiterId === recruiterId)
}

/** Check if an invite already exists for this job+recipient pair */
export function inviteExists(jobId: string, recipientId: string): boolean {
  return getInvites().some((i) => i.jobId === jobId && i.recipientId === recipientId)
}

export function sendInvite(params: {
  jobId: string
  jobTitle: string
  company: string
  recruiterId: string
  recruiterName: string
  recipientId: string
  recipientName: string
  message?: string
}): JobInvite {
  // Idempotent — don't duplicate if already invited
  const existing = getInvites().find(
    (i) => i.jobId === params.jobId && i.recipientId === params.recipientId
  )
  if (existing) return existing

  const invites = getInvites()
  const invite: JobInvite = {
    ...params,
    id: uid(),
    status: 'pending',
    sentAt: now(),
  }
  writeList(KEYS.JOB_INVITES, [...invites, invite])
  return invite
}

export function respondToInvite(
  inviteId: string,
  status: Extract<InviteStatus, 'accepted' | 'declined'>
): JobInvite | null {
  const invites = getInvites()
  const idx = invites.findIndex((i) => i.id === inviteId)
  if (idx === -1) return null
  invites[idx] = { ...invites[idx], status, respondedAt: now() }
  writeList(KEYS.JOB_INVITES, invites)
  return invites[idx]
}

// ── Aggregate helpers ─────────────────────────────────────────────────────────

/** Stage counts for a given job (for Kanban headers) */
export function getStageCounts(jobId: string): Record<ApplicationStage, number> {
  const apps = getApplicationsForJob(jobId)
  const counts: Record<ApplicationStage, number> = {
    applied: 0,
    shortlisted: 0,
    interview: 0,
    offered: 0,
    rejected: 0,
    hired: 0,
  }
  for (const a of apps) counts[a.stage]++
  return counts
}

/** Total pending invites for a user */
export function getPendingInviteCount(recipientId: string): number {
  return getInvitesByRecipient(recipientId).filter((i) => i.status === 'pending').length
}
