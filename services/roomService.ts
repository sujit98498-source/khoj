export type RoomCategory = 'all' | 'discussion' | 'learning' | 'project' | 'startup' | 'hiring'
export type RoomStatus = 'active' | 'live' | 'private' | 'coming soon'
export type RoomVisibility = 'public' | 'private'

export interface RoomItem {
  id: string
  name: string
  type: string
  category: Exclude<RoomCategory, 'all'>
  description: string
  members: number
  status: RoomStatus
  visibility: RoomVisibility
  createdAt?: string
  createdBy?: string
}

const STORAGE_KEY = 'khoj-created-rooms'

export const DEFAULT_ROOMS: RoomItem[] = [
  {
    id: 'build-and-ship-room',
    name: 'Build & Ship Room',
    type: 'Learning Room',
    category: 'learning',
    description: 'Live space for build check-ins, code reviews, and learning alongside fellow builders.',
    members: 42,
    status: 'live',
    visibility: 'public',
  },
  {
    id: 'project-collab-room',
    name: 'Project Collab Room',
    type: 'Project Room',
    category: 'project',
    description: 'Coordinate your project team, share progress, and plan the next sprint.',
    members: 18,
    status: 'active',
    visibility: 'public',
  },
  {
    id: 'startup-founders-room',
    name: 'Startup Founders Room',
    type: 'Startup Room',
    category: 'startup',
    description: 'A focused space for founders refining ideas, feedback loops, and pitch practice.',
    members: 27,
    status: 'active',
    visibility: 'public',
  },
  {
    id: 'coding-help-room',
    name: 'Coding Help Room',
    type: 'Discussion Room',
    category: 'discussion',
    description: 'Ask questions, unblock your project, and collaborate with builders in real time.',
    members: 56,
    status: 'active',
    visibility: 'public',
  },
  {
    id: 'team-alpha-project-room',
    name: 'Team Alpha Project Room',
    type: 'Project Room',
    category: 'project',
    description: 'Private planning room for weekly targets, sprint planning, and high-performance teamwork.',
    members: 9,
    status: 'private',
    visibility: 'private',
  },
  {
    id: 'hiring-hub',
    name: 'Hiring Hub',
    type: 'Hiring Room',
    category: 'hiring',
    description: 'Discover talent, post opportunities, and connect with builders ready to join your team.',
    members: 14,
    status: 'active',
    visibility: 'public',
  },
]

const ROOM_TYPE_LABELS: Record<Exclude<RoomCategory, 'all'>, string> = {
  discussion: 'Discussion Room',
  learning: 'Learning Room',
  project: 'Project Room',
  startup: 'Startup Room',
  hiring: 'Hiring Room',
}

function dedupeRooms(rooms: RoomItem[]) {
  const map = new Map<string, RoomItem>()
  rooms.forEach((room) => map.set(room.id, room))
  return Array.from(map.values())
}

function slugifyRoomName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getRooms(): RoomItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_ROOMS
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as RoomItem[]) : []
    return dedupeRooms([...DEFAULT_ROOMS, ...stored])
  } catch {
    return DEFAULT_ROOMS
  }
}

export function getRoomById(roomId: string): RoomItem | null {
  return getRooms().find((room) => room.id === roomId) ?? null
}

export function createRoom(input: {
  name: string
  category: Exclude<RoomCategory, 'all'>
  description: string
  visibility: RoomVisibility
  createdBy?: string
}): RoomItem {
  const trimmedName = input.name.trim()
  const idBase = slugifyRoomName(trimmedName) || 'room'

  const room: RoomItem = {
    id: `${idBase}-${Date.now().toString(36)}`,
    name: trimmedName,
    type: ROOM_TYPE_LABELS[input.category],
    category: input.category,
    description: input.description.trim(),
    members: 1,
    status: input.visibility === 'private' ? 'private' : 'active',
    visibility: input.visibility,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  }

  if (typeof window !== 'undefined') {
    const existing = getRooms().filter((item) => !DEFAULT_ROOMS.some((base) => base.id === item.id))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([room, ...existing]))
  }

  return room
}
