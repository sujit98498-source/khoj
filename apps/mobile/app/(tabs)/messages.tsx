import React from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import { colors, spacing } from '../../lib/theme'
import { InboxItem } from '../../components/messages/InboxItem'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function MessagesScreen() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { conversations, loading } = useConversations(user?.uid ?? null)

  if (loading) return <LoadingScreen message="Loading messages…" />

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="✉"
            title="No messages yet"
            subtitle="Start messaging gamers from their profiles"
          />
        }
        renderItem={({ item }) => {
          const otherUid = item.participantIds.find((id) => id !== user?.uid)
          const other = otherUid ? item.participants?.[otherUid] : undefined
          const name = other?.name ?? other?.gamerTag ?? 'Gamer'
          const avatar = other?.avatarUrl

          return (
            <InboxItem
              name={name}
              avatarUri={avatar}
              lastMessage={item.lastMessage ?? ''}
              timestamp={
                item.lastMessageAt?.toDate
                  ? item.lastMessageAt.toDate()
                  : null
              }
              unread={item.unreadCount?.[user?.uid ?? ''] ?? 0}
              onPress={() =>
                router.push({
                  pathname: '/chat/[conversationId]',
                  params: { conversationId: item.id },
                })
              }
            />
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
})
