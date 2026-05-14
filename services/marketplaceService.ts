// services/marketplaceService.ts
// Firestore-backed project/service marketplace for KHOJ Jobs.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { requireFirebaseStorage, requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'

export type MarketplaceCategory =
  | 'Development'
  | 'Design'
  | 'Marketing'
  | 'Content'
  | 'Data'
  | 'Product'
  | 'AI'
  | 'Business'
  | 'Other'

export type PricingType = 'fixed' | 'hourly' | 'both'
export type BudgetType = 'fixed' | 'hourly'
export type ServiceStatus = 'active' | 'paused' | 'deleted'
export type ProjectStatus = 'open' | 'closed' | 'deleted'
export type ProposalStatus = 'pending' | 'accepted' | 'rejected'
export type SkillLevel = 'beginner' | 'intermediate' | 'expert'
export type LocationType = 'remote' | 'onsite' | 'hybrid'

export interface MarketplaceService {
  id: string
  ownerId: string
  ownerName: string
  ownerPhoto?: string
  title: string
  category: MarketplaceCategory
  description: string
  skills: string[]
  pricingType: PricingType
  fixedPrice?: number
  hourlyRate?: number
  deliveryTime: string
  availability: string
  portfolioLink?: string
  thumbnailUrl?: string
  status: ServiceStatus
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MarketplaceProject {
  id: string
  clientId: string
  clientName: string
  title: string
  description: string
  skills: string[]
  category: MarketplaceCategory
  budgetType: BudgetType
  budgetMin?: number
  budgetMax?: number
  fixedBudget?: number
  hourlyRate?: number
  deadline?: string
  locationType: LocationType
  location?: string
  skillLevel: SkillLevel
  attachmentName?: string
  status: ProjectStatus
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MarketplaceProposal {
  id: string
  projectId: string
  projectTitle: string
  freelancerId: string
  freelancerName: string
  message: string
  proposedRate: number
  rateType: BudgetType
  deliveryTime: string
  status: ProposalStatus
  createdAt?: unknown
}

export interface SavedMarketplaceProject {
  id: string
  userId: string
  projectId: string
  projectTitle?: string
  clientName?: string
  savedAt?: unknown
}

export interface CreateServiceInput {
  ownerId: string
  ownerName: string
  ownerPhoto?: string
  title: string
  category: MarketplaceCategory
  description: string
  skills: string[]
  pricingType: PricingType
  fixedPrice?: number
  hourlyRate?: number
  deliveryTime: string
  availability: string
  portfolioLink?: string
  thumbnailUrl?: string
}

export interface CreateProjectInput {
  clientId: string
  clientName: string
  title: string
  description: string
  skills: string[]
  category: MarketplaceCategory
  budgetType: BudgetType
  budgetMin?: number
  budgetMax?: number
  fixedBudget?: number
  hourlyRate?: number
  deadline?: string
  locationType: LocationType
  location?: string
  skillLevel: SkillLevel
  attachmentName?: string
}

export interface CreateProposalInput {
  projectId: string
  projectTitle: string
  freelancerId: string
  freelancerName: string
  message: string
  proposedRate: number
  rateType: BudgetType
  deliveryTime: string
}

function noop(): Unsubscribe {
  return () => {}
}

function withSnapshotError(onError?: (error: Error) => void) {
  return (error: Error) => {
    console.warn('[marketplaceService] Firestore subscription error:', error.message)
    onError?.(error)
  }
}

function mapDoc<T>(snapshot: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snapshot.id, ...snapshot.data() } as T
}

function getTime(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'string') return new Date(value).getTime()
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000
  }
  return 0
}

function newestFirst<T extends { createdAt?: unknown; savedAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => getTime(b.createdAt ?? b.savedAt) - getTime(a.createdAt ?? a.savedAt))
}

export async function uploadServiceThumbnail(file: File, ownerId: string): Promise<string> {
  const storage = requireFirebaseStorage()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const storageRef = ref(storage, `services/${ownerId}/${Date.now()}-${safeName}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function createMarketplaceService(input: CreateServiceInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.SERVICES), {
    ...input,
    status: 'active' satisfies ServiceStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeActiveServices(
  onUpdate: (items: MarketplaceService[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(
        collection(requireFirestoreDb(), COLLECTIONS.SERVICES),
        where('status', '==', 'active'),
      ),
      (snapshot) => onUpdate(newestFirst(snapshot.docs.map((item) => mapDoc<MarketplaceService>(item)))),
      withSnapshotError(onError),
    )
  } catch (error) {
    onError?.(error as Error)
    return noop()
  }
}

export function subscribeUserServices(
  ownerId: string,
  onUpdate: (items: MarketplaceService[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(
        collection(requireFirestoreDb(), COLLECTIONS.SERVICES),
        where('ownerId', '==', ownerId),
      ),
      (snapshot) => onUpdate(newestFirst(snapshot.docs.map((item) => mapDoc<MarketplaceService>(item)))),
      withSnapshotError(onError),
    )
  } catch (error) {
    onError?.(error as Error)
    return noop()
  }
}

export async function updateMarketplaceService(
  serviceId: string,
  updates: Partial<Omit<MarketplaceService, 'id' | 'ownerId' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.SERVICES, serviceId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMarketplaceService(serviceId: string): Promise<void> {
  await updateMarketplaceService(serviceId, { status: 'deleted' })
}

export async function createMarketplaceProject(input: CreateProjectInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.PROJECTS), {
    ...input,
    status: 'open' satisfies ProjectStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeOpenProjects(
  onUpdate: (items: MarketplaceProject[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(
        collection(requireFirestoreDb(), COLLECTIONS.PROJECTS),
        where('status', '==', 'open'),
      ),
      (snapshot) => onUpdate(newestFirst(snapshot.docs.map((item) => mapDoc<MarketplaceProject>(item)))),
      withSnapshotError(onError),
    )
  } catch (error) {
    onError?.(error as Error)
    return noop()
  }
}

export async function submitMarketplaceProposal(input: CreateProposalInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.PROPOSALS), {
    ...input,
    status: 'pending' satisfies ProposalStatus,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeUserProposals(
  freelancerId: string,
  onUpdate: (items: MarketplaceProposal[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(
        collection(requireFirestoreDb(), COLLECTIONS.PROPOSALS),
        where('freelancerId', '==', freelancerId),
      ),
      (snapshot) => onUpdate(newestFirst(snapshot.docs.map((item) => mapDoc<MarketplaceProposal>(item)))),
      withSnapshotError(onError),
    )
  } catch (error) {
    onError?.(error as Error)
    return noop()
  }
}

function savedProjectId(userId: string, projectId: string) {
  return `project_${userId}_${projectId}`
}

export async function saveMarketplaceProject(userId: string, project: MarketplaceProject): Promise<void> {
  await setDoc(doc(requireFirestoreDb(), COLLECTIONS.SAVED_JOBS, savedProjectId(userId, project.id)), {
    userId,
    projectId: project.id,
    projectTitle: project.title,
    clientName: project.clientName,
    savedAt: serverTimestamp(),
  })
}

export async function unsaveMarketplaceProject(userId: string, projectId: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.SAVED_JOBS, savedProjectId(userId, projectId)))
}

export async function isMarketplaceProjectSaved(userId: string, projectId: string): Promise<boolean> {
  const snapshot = await getDoc(doc(requireFirestoreDb(), COLLECTIONS.SAVED_JOBS, savedProjectId(userId, projectId)))
  return snapshot.exists()
}

export function subscribeSavedMarketplaceProjects(
  userId: string,
  onUpdate: (items: SavedMarketplaceProject[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(
        collection(requireFirestoreDb(), COLLECTIONS.SAVED_JOBS),
        where('userId', '==', userId),
      ),
      (snapshot) => onUpdate(
        newestFirst(snapshot.docs
          .map((item) => mapDoc<SavedMarketplaceProject>(item))
          .filter((item) => Boolean(item.projectId))),
      ),
      withSnapshotError(onError),
    )
  } catch (error) {
    onError?.(error as Error)
    return noop()
  }
}
