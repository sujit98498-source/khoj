import React, { useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useMessages } from '../../hooks/useMessages'
import { colors, spacing } from '../../lib/theme'
import { ChatBubble } from '../../components/messages/ChatBubble'
import { ChatInput } from '../../components/messages/ChatInput'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'

export default function ChatScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { conversationId, otherName, otherAvatar } = useLocalSearchParams<{
    conversationId: string
    otherName?: string
    otherAvatar?: string
  }>()

  const { user, profile } = useAuth()
  const { messages, loading, sendMessage } = useMessages(conversationId ?? null)
  const listRef = useRef<FlatList>(null)

  async function handleSend(text: string) {
    if (!user || !profile) return
    await sendMessage({
      senderId: user.uid,
      senderName: profile.gamerTag ?? profile.name ?? 'Gamer',
      content: text,
    })
    // Scroll to bottom
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }

  if (loading) return <LoadingScreen message="Loading chat…" />

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Avatar name={otherName} size={36} />
        <Text style={styles.headerName} numberOfLines={1}>
          {otherName ?? 'Chat'}
        </Text>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 8 },
          ]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <EmptyState icon="💬" title="No messages yet" subtitle="Say hello!" />
          }
          renderItem={({ item }) => (
            <ChatBubble
              content={item.content}
              sentByMe={item.senderId === user?.uid}
              senderName={item.senderId !== user?.uid ? item.senderName : undefined}
              timestamp={item.createdAt?.toDate ? item.createdAt.toDate() : null}
              type={item.type}
              callDuration={item.callData?.duration}
            />
          )}
        />

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  headerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  list: {
    padding: spacing.md,
    gap: spacing.xs,
    flexGrow: 1,
  },
})
