import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { colors, spacing, radius, getXpTier } from '../../lib/theme'
import { GamingCard } from '../../components/ui/GamingCard'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { GamingButton } from '../../components/ui/GamingButton'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!profile) return <LoadingScreen message="Loading profile…" />

  const tier = getXpTier(profile.xp ?? 0)

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth)
            router.replace('/auth/login')
          } catch {
            Alert.alert('Error', 'Could not sign out. Please try again.')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={profile.avatarUrl} name={profile.name} size={80} />
          <View style={styles.headerText}>
            <Text style={styles.displayName} numberOfLines={1}>
              {profile.gamerTag ?? profile.name}
            </Text>
            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}
            <Badge variant="xp" xp={profile.xp ?? 0} />
          </View>
        </View>

        {/* Stats */}
        <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
          <View style={styles.statsRow}>
            <StatItem label="Rank"    value={profile.rank ? `#${profile.rank}` : '--'} color={colors.gold} />
            <StatItem label="XP"      value={String(profile.xp ?? 0)}                  color={colors.cyan} />
            <StatItem label="Wins"    value={String(profile.wins ?? 0)}                 color={colors.green} />
            <StatItem label="Matches" value={String(profile.matchesPlayed ?? 0)}        color={colors.purple} />
          </View>
        </GamingCard>

        {/* Bio */}
        {profile.bio ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </GamingCard>
        ) : null}

        {/* Games */}
        {profile.games && profile.games.length > 0 ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Games</Text>
            <View style={styles.tags}>
              {profile.games.map((g: string) => (
                <Badge key={g} label={g} color={colors.purple} />
              ))}
            </View>
          </GamingCard>
        ) : null}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 ? (
          <GamingCard style={{ marginBottom: spacing.md }} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.tags}>
              {profile.skills.map((s: string) => (
                <Badge key={s} label={s} color={colors.cyan} />
              ))}
            </View>
          </GamingCard>
        ) : null}

        {/* Actions */}
        <GamingButton
          label="Edit Profile"
          variant="secondary"
          fullWidth
          style={{ marginBottom: spacing.sm }}
          onPress={() =>
            router.push({
              pathname: '/gamer/[uid]',
              params: { uid: user?.uid ?? '', mode: 'edit' },
            })
          }
        />
        <GamingButton
          label="Sign Out"
          variant="danger"
          fullWidth
          onPress={handleSignOut}
        />
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
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  headerText: { flex: 1, gap: spacing.xs },
  displayName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  username: { color: colors.textMuted, fontSize: 13 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  bioText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
