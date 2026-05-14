// apps/mobile/lib/livekit.ts
// LiveKit utilities for the mobile app.
// Stage 2 — voice/video calls via the web app's /api/calls/token endpoint.

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

export interface CallTokenResponse {
  token: string
  url:   string
}

/**
 * Fetches a short-lived LiveKit JWT from the KHOJ web API.
 * `idToken` — Firebase ID token from getIdToken(user) for auth.
 */
export async function fetchCallToken(params: {
  roomName:  string
  userId:    string
  userName:  string
  idToken:   string
  callType:  'voice' | 'video'
}): Promise<CallTokenResponse> {
  const res = await fetch(`${API_BASE}/api/calls/token`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({
      roomName:  params.roomName,
      userId:    params.userId,
      userName:  params.userName,
      callType:  params.callType,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<CallTokenResponse>
}

/** Generates a deterministic room name for a 1:1 conversation call. */
export function callRoomName(conversationId: string): string {
  return `call-${conversationId}`
}
