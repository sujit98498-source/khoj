import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const { roomName, userName, userIdentity } = await request.json()
    const hasAuthCookie = request.cookies.get('khoj-auth')?.value === '1'

    if (!roomName || !userName) {
      return NextResponse.json(
        { error: 'roomName and userName are required' },
        { status: 400 }
      )
    }

    if (!hasAuthCookie) {
      return NextResponse.json(
        { error: 'Login required to join voice rooms' },
        { status: 401 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY?.trim()
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim()

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 503 }
      )
    }

    const identity = typeof userIdentity === 'string' && userIdentity.trim().length > 0
      ? userIdentity.trim()
      : `${String(userName).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: userName,
    })

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    })

    return NextResponse.json({
      token: await token.toJwt(),
      url: livekitUrl,
    })
  } catch (error) {
    console.error('LiveKit token generation failed:', error)

    return NextResponse.json(
      { error: 'Failed to generate LiveKit token' },
      { status: 500 }
    )
  }
}
