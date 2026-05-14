import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { requireFirestoreDb } from '@/lib/firebase/config'

export type GrowthContentStatus = 'draft' | 'approved' | 'posted'

export interface GrowthContentIdea {
  id: string
  title: string
  platform: string
  contentType: string
  hook: string
  script: string
  caption: string
  hashtags: string[]
  cta: string
  status: GrowthContentStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  rawInput?: string
  researchOutput?: string
  validationScore?: number | null
  rawOutput?: string
}

export interface CreateGrowthContentIdeaInput {
  title: string
  platform: string
  contentType: string
  hook: string
  script: string
  caption: string
  hashtags: string[]
  cta: string
  status: GrowthContentStatus
  createdBy: string
  rawInput?: string
  researchOutput?: string
  validationScore?: number | null
  rawOutput?: string
}

const VALID_STATUSES: GrowthContentStatus[] = ['draft', 'approved', 'posted']

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

function normalizeHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeStatus(value: unknown): GrowthContentStatus {
  return VALID_STATUSES.includes(value as GrowthContentStatus) ? (value as GrowthContentStatus) : 'draft'
}

function normalizeValidationScore(value: unknown): number | null {
  const rawNumber = typeof value === 'number'
    ? value
    : Number(String(value ?? '').match(/\d+(\.\d+)?/)?.[0] ?? NaN)

  if (!Number.isFinite(rawNumber)) return null
  return Math.max(0, Math.min(10, rawNumber))
}

function growthContentCollection() {
  return collection(requireFirestoreDb(), COLLECTIONS.GROWTH_CONTENT_IDEAS)
}

export async function saveGrowthContentIdea(input: CreateGrowthContentIdeaInput): Promise<string> {
  const ref = await addDoc(growthContentCollection(), {
    title: input.title,
    platform: input.platform,
    contentType: input.contentType,
    hook: input.hook,
    script: input.script,
    caption: input.caption,
    hashtags: input.hashtags,
    cta: input.cta,
    status: input.status,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    rawInput: input.rawInput ?? '',
    researchOutput: input.researchOutput ?? '',
    validationScore: input.validationScore ?? null,
    rawOutput: input.rawOutput ?? '',
  })

  return ref.id
}

export async function getGrowthContentIdeas(maxItems = 30): Promise<GrowthContentIdea[]> {
  const snap = await getDocs(
    query(growthContentCollection(), orderBy('createdAt', 'desc'), limit(maxItems))
  )

  return snap.docs.map((item) => {
    const data = item.data() as Record<string, unknown>

    return {
      id: item.id,
      title: String(data.title ?? 'Untitled content idea'),
      platform: String(data.platform ?? 'Not set'),
      contentType: String(data.contentType ?? 'Content'),
      hook: String(data.hook ?? ''),
      script: String(data.script ?? ''),
      caption: String(data.caption ?? ''),
      hashtags: normalizeHashtags(data.hashtags),
      cta: String(data.cta ?? ''),
      status: normalizeStatus(data.status),
      createdBy: String(data.createdBy ?? ''),
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt),
      rawInput: typeof data.rawInput === 'string' ? data.rawInput : undefined,
      researchOutput: typeof data.researchOutput === 'string' ? data.researchOutput : undefined,
      validationScore: normalizeValidationScore(data.validationScore),
      rawOutput: typeof data.rawOutput === 'string' ? data.rawOutput : undefined,
    }
  })
}

export async function updateGrowthContentStatus(
  ideaId: string,
  status: GrowthContentStatus
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error('Invalid growth content status.')
  }

  await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.GROWTH_CONTENT_IDEAS, ideaId), {
    status,
    updatedAt: serverTimestamp(),
  })
}
