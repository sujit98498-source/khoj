import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db, COLLECTIONS } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { colors, radius, spacing, getXpTier } from '../../lib/theme'
import { GamingCard } from '../../components/ui/GamingCard'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const QUICK_ACTIONS = [
  { label: 'Find Players', icon: '🎮', route: '/(tabs)/feed' as const },
  { label: 'Tournaments', icon: '🏆', route: '/(tabs)/tournaments' as const },
  { label: 'Messages',    icon: '✉',  route: '/(tabs)/messages' as const },
  { label: 'Leaderboard', icon: '📊', route: '/leaderboard' as const },
] as const

export default function HomeScreen() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [recentMatches, setRecentMatches] = useState<any[]>([])
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([])

  async function fetchData() {
    if (!profile?.uid) return
    try {
      const [matchSnap, tournSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.MATCHES),
            where('playerIds', 'array-contains', profile.uid),
            orderBy('createdAt', 'desc'),
            limit(3),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.TOURNAMENTS),
            where('status', 'in', ['upcoming', 'registration_open']),
            orderBy('startDate', 'asc'),
            limit(3),
          ),
        ),
      ])
      setRecentMatches(matchSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setUpcomingTournaments(tournSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch {
      // fail silently — data will remain empty
    }
  }

  useEffect(() => { fetchData() }, [profile?.uid])

  async function onRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  if (loading) return <LoadingScreen message="Loading your profile…" />

  const tier = profile ? getXpTier(profile.xp ?? 0) : null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {profile?.gamerTag ?? profile?.name ?? 'Gamer'}
            </Text>
          </View>
          <Avatar uri={profile?.avatarUrl} name={profile?.name} size={48} />
        </View>

        {/* XP tier badge */}
        {tier && (
          <View style={{ marginBottom: spacing.md }}>
            <Badge variant="xp" xp={profile?.xp ?? 0} />
          </View>
        )}

        {/* Stats row */}
        <GamingCard style={styles.statsCard} padding={spacing.md}>
          <View style={styles.statsRow}>
            <StatItem label="Rank" value={profile?.rank ? `#${profile.rank}` : '--'} color={colors.gold} />
            <StatItem label="XP" value={String(profile?.xp ?? 0)} color={colors.cyan} />
            <StatItem label="Wins" value={String(profile?.wins ?? 0)} color={colors.green} />
            <StatItem label="Matches" value={String(profile?.matchesPlayed ?? 0)} color={colors.purple} />
          </View>
        </GamingCard>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(({ label, icon, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.actionCard}
              onPress={() => router.push(route as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>{icon}</Text>
              <Text style={styles.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent matches */}
        <Text style={styles.sectionTitle}>Recent Matches</Text>
        {recentMatches.length === 0 ? (
          <GamingCard padding={spacing.md}>
            <Text style={styles.emptyText}>No matches yet. Join a tournament to get started!</Text>
          </GamingCard>
        ) : (
          recentMatches.map((m) => (
            <GamingCard key={m.id} style={{ marginBottom: spacing.sm }} padding={spacing.md}>
              <View style={styles.matchRow}>
                <Text style={styles.matchGame}>{m.game ?? 'Game'}</Text>
                <Text style={[styles.matchResult, m.winnerId === profile?.uid ? styles.win : styles.loss]}>
                  {m.winnerId === profile?.uid ? 'WIN' : 'LOSS'}
                </Text>
              </View>
            </GamingCard>
          ))
        )}

        {/* Upcoming tournaments */}
        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
        {upcomingTournaments.length === 0 ? (
          <GamingCard padding={spacing.md}>
            <Text style={styles.emptyText}>No upcoming tournaments right now.</Text>
          </GamingCard>
        ) : (
          upcomingTournaments.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => router.push('/(tabs)/tournaments')}
              activeOpacity={0.75}
            >
              <GamingCard style={{ marginBottom: spacing.sm }} padding={spacing.md}>
                <Text style={styles.tournName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.tournMeta}>{t.game} · {t.prizePool ? `$${t.prizePool} Prize` : 'Free'}</Text>
              </GamingCard>
            </TouchableOpacity>
          ))
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
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  greeting: { color: colors.textMuted, fontSize: 13 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', maxWidth: 220 },
  statsCard: { marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchGame: { color: colors.text, fontSize: 14, fontWeight: '600' },
  matchResult: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  win: { color: colors.green },
  loss: { color: colors.red },
  tournName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  tournMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
})
