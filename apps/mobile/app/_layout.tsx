import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '../hooks/useAuth'
import { useIncomingCall, acceptCall, rejectCall } from '../hooks/useCallSession'
import { IncomingCallModal } from '../components/calls/IncomingCallModal'

// ── Inner component that needs auth context ───────────────────────────────────
function AuthGuard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === 'auth'

    if (!user && !inAuth) {
      // Not signed in — send to login
      router.replace('/auth/login')
    } else if (user && inAuth) {
      // Already signed in — send to app
      router.replace('/(tabs)')
    }
  }, [user, loading, segments])

  return null
}

// ── Incoming call overlay ─────────────────────────────────────────────────────
function IncomingCallOverlay() {
  const { user, profile } = useAuth()
  const incomingCall = useIncomingCall(user?.uid ?? null)
  const router = useRouter()
  const [accepting, setAccepting] = React.useState(false)

  if (!incomingCall) return null

  async function handleAccept() {
    if (!incomingCall || !user || !profile || accepting) return
    setAccepting(true)
    try {
      const idToken = await user.getIdToken()
      const { token, url } = await acceptCall({
        session: incomingCall,
        uid: user.uid,
        name: profile.gamerTag ?? profile.name ?? 'Gamer',
        idToken,
      })
      router.push({
        pathname: '/call/[roomName]',
        params: {
          roomName: incomingCall.roomName,
          sessionId: incomingCall.id,
          callType: incomingCall.type,
          remoteUserId: incomingCall.callerId,
          remoteUserName: incomingCall.callerName,
          token,
          lkUrl: url,
        },
      })
    } catch {
      // fail silently
    } finally {
      setAccepting(false)
    }
  }

  async function handleReject() {
    if (!incomingCall) return
    await rejectCall(incomingCall.id)
  }

  return (
    <IncomingCallModal
      visible
      callerName={incomingCall.callerName}
      callType={incomingCall.type}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  )
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[conversationId]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="call/[roomName]"
            options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="gamer/[uid]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack>
        <IncomingCallOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
