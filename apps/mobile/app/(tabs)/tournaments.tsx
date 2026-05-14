import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  where,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { colors, radius, spacing } from '../../lib/theme'
import { GamingCard } from '../../components/ui/GamingCard'
import { Badge } from '../../components/ui/Badge'
import { GamingButton } from '../../components/ui/GamingButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

type Filter = 'all' | 'upcoming' | 'active' | 'completed'

const STATUS_COLOR: Record<string, string> = {
  upcoming: colors.cyan,
  registration_open: colors.green,
  active: colors.gold,
  in_progress: colors.gold,
  completed: colors.textMuted,
  cancelled: colors.red,
}

interface Tournament {
  id: string
  name: string
  game: string
  status: string
  prizePool?: number
  entryFee?: number
  maxParticipants?: number
  participantIds?: string[]
  startDate?: any
  description?: string
}

export default function TournamentsScreen() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)

  async function loadTournaments() {
    try {
      const statusMap: Record<Filter, string[]> = {
        all: [],
        upcoming: ['upcoming', 'registration_open'],
        active: ['active', 'in_progress'],
        completed: ['completed'],
      }
      const statuses = statusMap[filter]
      const q =
        statuses.length > 0
          ? query(
              collection(db, COLLECTIONS.TOURNAMENTS),
              where('status', 'in', statuses),
              orderBy('startDate', 'asc'),
              limit(20),
            )
          : query(
              collection(db, COLLECTIONS.TOURNAMENTS),
              orderBy('startDate', 'desc'),
              limit(20),
            )
      const snap = await getDocs(q)
      setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)))
    } catch {
      // fail silently
    }
  }

  useEffect(() => { loadTournaments().finally(() => setLoading(false)) }, [filter])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadTournaments()
    setRefreshing(false)
  }, [filter])

  async function handleJoin(tournament: Tournament) {
    if (!user) { Alert.alert('Sign in', 'You need to be signed in to join.'); return }
    const isFull =
      tournament.maxParticipants != null &&
      (tournament.participantIds?.length ?? 0) >= tournament.maxParticipants
    if (isFull) { Alert.alert('Full', 'This tournament is full.'); return }

    setJoining(tournament.id)
    try {
      await updateDoc(doc(db, COLLECTIONS.TOURNAMENTS, tournament.id), {
        participantIds: arrayUnion(user.uid),
      })
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === tournament.id
            ? { ...t, participantIds: [...(t.participantIds ?? []), user.uid] }
            : t,
        ),
      )
    } catch {
      Alert.alert('Error', 'Could not join tournament. Please try again.')
    } finally {
      setJoining(null)
    }
  }

  if (loading) return <LoadingScreen message="Loading tournaments…" />

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Past' },
  ]

  return (
    <SafeAreaView style={styles.safe}>
      {/* Filter bar */}
      <View style={styles.filters}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
          >
            <Text style={[styles.filterLabel, filter === key && styles.filterLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tournaments}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
        contentContainerStyle={{ gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <EmptyState icon="🏆" title="No tournaments" subtitle="Check back soon for upcoming events!" />
        }
        renderItem={({ item }) => {
          const hasJoined = user ? (item.participantIds ?? []).includes(user.uid) : false
          const isFull =
            item.maxParticipants != null &&
            (item.participantIds?.length ?? 0) >= item.maxParticipants
          const canJoin =
            !hasJoined &&
            !isFull &&
            ['upcoming', 'registration_open'].includes(item.status)
          const statusColor = STATUS_COLOR[item.status] ?? colors.textMuted
          const startDateStr = item.startDate?.toDate
            ? new Date(item.startDate.toDate()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : null

          return (
            <GamingCard
              glow={item.status === 'active' || item.status === 'in_progress'}
              glowColor={colors.gold}
            >
              <View style={styles.cardInner}>
                {/* Status badge */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Badge label={item.status.replace('_', ' ').toUpperCase()} color={statusColor} />
                  {item.game ? <Badge label={item.game} color={colors.purple} /> : null}
                </View>

                {/* Name */}
                <Text style={styles.tournName} numberOfLines={2}>{item.name}</Text>

                {/* Meta row */}
                <View style={styles.metaRow}>
                  {item.prizePool ? (
                    <Text style={styles.prize}>🏆 ${item.prizePool} Prize</Text>
                  ) : null}
                  {item.entryFee && item.entryFee > 0 ? (
                    <Text style={styles.fee}>Entry: ${item.entryFee}</Text>
                  ) : (
                    <Text style={styles.free}>Free to Enter</Text>
                  )}
                  {item.maxParticipants ? (
                    <Text style={styles.spots}>
                      {item.participantIds?.length ?? 0}/{item.maxParticipants} players
                    </Text>
                  ) : null}
                </View>

                {startDateStr && (
                  <Text style={styles.date}>📅 {startDateStr}</Text>
                )}

                {/* Action */}
                {user && (
                  <View style={{ marginTop: spacing.sm }}>
                    {hasJoined ? (
                      <Badge label="Registered ✓" color={colors.green} />
                    ) : canJoin ? (
                      <GamingButton
                        label="Join Tournament"
                        size="sm"
                        loading={joining === item.id}
                        onPress={() => handleJoin(item)}
                      />
                    ) : isFull ? (
                      <Badge label="Tournament Full" color={colors.red} />
                    ) : null}
                  </View>
                )}
              </View>
            </GamingCard>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterLabelActive: { color: '#fff' },
  cardInner: { padding: spacing.md, gap: spacing.sm },
  tournName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  prize: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  fee: { color: colors.textMuted, fontSize: 13 },
  free: { color: colors.green, fontSize: 13, fontWeight: '600' },
  spots: { color: colors.textMuted, fontSize: 13 },
  date: { color: colors.textMuted, fontSize: 12 },
})
