import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { getOrCreateConversation } from '../../lib/conversationService'
import { colors, spacing, radius, getXpTier } from '../../lib/theme'
import { GamingCard } from '../../components/ui/GamingCard'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { GamingButton } from '../../components/ui/GamingButton'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

interface GamerProfileData {
  uid: string
  name: string
  gamerTag?: string
  username?: string
  avatarUrl?: string
  bio?: string
  games?: string[]
  skills?: string[]
  xp?: number
  rank?: number
  wins?: number
  matchesPlayed?: number
}

export default function GamerProfileScreen() {
  const router = useRouter()
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const { user, profile } = useAuth()
  const [gamer, setGamer] = useState<GamerProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [messaging, setMessaging] = useState(false)

  const isOwnProfile = uid === user?.uid

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, COLLECTIONS.USERS, uid))
      .then((snap) => {
        if (snap.exists()) setGamer({ uid: snap.id, ...snap.data() } as GamerProfileData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uid])

  async function handleMessage() {
    if (!user || !profile || !gamer) return
    setMessaging(true)
    try {
      const conversationId = await getOrCreateConversation(
        user.uid,
        profile.gamerTag ?? profile.name ?? 'Gamer',
        profile.avatarUrl,
        gamer.uid,
      )
      router.push({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId,
          otherName: gamer.gamerTag ?? gamer.name,
          otherAvatar: gamer.avatarUrl ?? '',
        },
      })
    } catch {
      Alert.alert('Error', 'Could not open conversation. Please try again.')
    } finally {
      setMessaging(false)
    }
  }

  if (loading) return <LoadingScreen message="Loading profile…" />
  if (!gamer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Gamer not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const tier = getXpTier(gamer.xp ?? 0)

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backIcon}>‹</Text>
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar uri={gamer.avatarUrl} name={gamer.name} size={80} />
          <View style={styles.heroText}>
            <Text style={styles.displayName} numberOfLines={1}>
              {gamer.gamerTag ?? gamer.name}
            </Text>
            {gamer.username && <Text style={styles.username}>@{gamer.username}</Text>}
            <Badge variant="xp" xp={gamer.xp ?? 0} />
          </View>
        </View>

        {/* Stats */}
        <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
          <View style={styles.statsRow}>
            <StatItem label="Rank"    value={gamer.rank ? `#${gamer.rank}` : '--'} color={colors.gold} />
            <StatItem label="XP"      value={String(gamer.xp ?? 0)}               color={colors.cyan} />
            <StatItem label="Wins"    value={String(gamer.wins ?? 0)}              color={colors.green} />
            <StatItem label="Matches" value={String(gamer.matchesPlayed ?? 0)}     color={colors.purple} />
          </View>
        </GamingCard>

        {/* Bio */}
        {gamer.bio ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bioText}>{gamer.bio}</Text>
          </GamingCard>
        ) : null}

        {/* Games */}
        {gamer.games && gamer.games.length > 0 ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Games</Text>
            <View style={styles.tags}>
              {gamer.games.map((g) => <Badge key={g} label={g} color={colors.purple} />)}
            </View>
          </GamingCard>
        ) : null}

        {/* Skills */}
        {gamer.skills && gamer.skills.length > 0 ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.tags}>
              {gamer.skills.map((s) => <Badge key={s} label={s} color={colors.cyan} />)}
            </View>
          </GamingCard>
        ) : null}

        {/* Actions */}
        {!isOwnProfile && (
          <GamingButton
            label="Send Message"
            fullWidth
            loading={messaging}
            onPress={handleMessage}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  notFound: { color: colors.textMuted, fontSize: 16 },
  backLink: { color: colors.purple, fontSize: 15, fontWeight: '600' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backIcon: { color: colors.text, fontSize: 28, fontWeight: '300', lineHeight: 30 },
  backLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  heroText: { flex: 1, gap: spacing.xs },
  displayName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  username: { color: colors.textMuted, fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  bioText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
