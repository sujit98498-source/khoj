import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'
import { Avatar } from '../ui/Avatar'
import { formatRelativeTime } from '../../../../packages/shared/src/types'

interface InboxItemProps {
  name: string
  avatarUri?: string | null
  lastMessage: string
  timestamp?: Date | null
  unread: number
  onPress: () => void
}

export function InboxItem({
  name,
  avatarUri,
  lastMessage,
  timestamp,
  unread,
  onPress,
}: InboxItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.row, unread > 0 && styles.unreadBg]}
    >
      <Avatar uri={avatarUri} name={name} size={46} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, unread > 0 && styles.nameBold]} numberOfLines={1}>
            {name}
          </Text>
          {timestamp && (
            <Text style={styles.time}>{formatRelativeTime(timestamp)}</Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.preview, unread > 0 && styles.previewBold]} numberOfLines={1}>
            {lastMessage}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unreadBg: {
    backgroundColor: colors.purple + '0D',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  nameBold: {
    color: colors.text,
    fontWeight: '700',
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    flexShrink: 0,
  },
  preview: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  previewBold: {
    color: colors.text,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
})
