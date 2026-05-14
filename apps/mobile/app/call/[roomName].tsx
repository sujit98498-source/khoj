import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { endCall } from '../../hooks/useCallSession'
import { colors, spacing, radius } from '../../lib/theme'

export default function CallScreen() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { roomName, sessionId, callType, remoteUserId, remoteUserName, token, lkUrl } =
    useLocalSearchParams<{
      roomName: string
      sessionId: string
      callType?: string
      remoteUserId?: string
      remoteUserName?: string
      token?: string
      lkUrl?: string
    }>()

  const { addCallMessage } = { addCallMessage: null } // placeholder — unused in Stage 1
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start timer when connected
  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [connected])

  // NOTE: LiveKit React Native requires a custom Expo Dev Client (EAS Build).
  // For Expo Go / development builds without the native module, we show
  // a "Call Connected" placeholder. Stage 2 will wire up @livekit/react-native.
  useEffect(() => {
    if (token && lkUrl) {
      // Simulated connection — replace with real LiveKit room join in Stage 2
      const t = setTimeout(() => setConnected(true), 1200)
      return () => clearTimeout(t)
    }
  }, [token, lkUrl])

  async function handleEndCall() {
    if (ending) return
    setEnding(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      if (sessionId) await endCall(sessionId, elapsed)
    } catch {
      // fail silently
    }
    router.back()
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Remote user info */}
      <View style={styles.remote}>
        <Text style={styles.remoteIcon}>🎮</Text>
        <Text style={styles.remoteName}>{remoteUserName ?? 'Gamer'}</Text>
        <Text style={styles.status}>
          {!connected ? (
            <ActivityIndicator size="small" color={colors.cyan} />
          ) : (
            formatDuration(elapsed)
          )}
        </Text>
        {!connected && <Text style={styles.connecting}>Connecting…</Text>}
      </View>

      {/* Call type label */}
      <Text style={styles.callTypeLabel}>
        {callType === 'video' ? '🎥 Video Call' : '📞 Voice Call'}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mute */}
        <TouchableOpacity
          style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]}
          onPress={() => setMuted((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Unmute' : 'Mute'}
        >
          <Text style={styles.ctrlIcon}>{muted ? '🔇' : '🎤'}</Text>
          <Text style={styles.ctrlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {/* End call */}
        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endBtn]}
          onPress={handleEndCall}
          disabled={ending}
          accessibilityRole="button"
          accessibilityLabel="End call"
        >
          {ending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctrlIcon}>📵</Text>
          )}
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End</Text>
        </TouchableOpacity>

        {/* Camera (video only) */}
        {callType === 'video' && (
          <TouchableOpacity
            style={styles.ctrlBtn}
            accessibilityRole="button"
            accessibilityLabel="Toggle camera"
          >
            <Text style={styles.ctrlIcon}>📷</Text>
            <Text style={styles.ctrlLabel}>Camera</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stage 2 note */}
      <Text style={styles.stageNote}>
        Live audio/video requires EAS Build with @livekit/react-native (Stage 2)
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  remote: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  remoteIcon: { fontSize: 72 },
  remoteName: { color: colors.text, fontSize: 26, fontWeight: '800' },
  status: { color: colors.cyan, fontSize: 20, fontWeight: '600', minHeight: 28 },
  connecting: { color: colors.textMuted, fontSize: 14 },
  callTypeLabel: { color: colors.textMuted, fontSize: 14 },
  controls: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ctrlBtn: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctrlBtnActive: { borderColor: colors.purple, backgroundColor: colors.purple + '22' },
  endBtn: { backgroundColor: colors.red, borderColor: colors.red },
  ctrlIcon: { fontSize: 28 },
  ctrlLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  stageNote: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
})
