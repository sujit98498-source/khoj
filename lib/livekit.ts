// lib/livekit.ts
// Shared LiveKit utilities used by stream components.
// All server-side secrets stay in API routes — this file is client-safe.

/**
 * Returns true when the LiveKit URL env var is present.
 * Components can use this to decide whether to render the video player
 * or show a "LiveKit not configured" placeholder.
 */
export function isLiveKitConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim())
}

/**
 * Returns the LiveKit server URL from env.
 * Falls back to '' so callers can check truthiness.
 */
export function getLiveKitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''
}

/**
 * Fetches a short-lived LiveKit JWT from the streams token API.
 * Throws on any non-OK response with the server's error message.
 */
export async function fetchStreamToken(params: {
  streamId: string
  userId: string
  userName: string
  role: 'host' | 'guest' | 'viewer'
}): Promise<{ token: string; url: string }> {
  const res = await fetch('/api/streams/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: params.streamId,
      identity: params.userId,
      name: params.userName,
      role: params.role,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Failed to get stream token')
  }

  return res.json() as Promise<{ token: string; url: string }>
}
