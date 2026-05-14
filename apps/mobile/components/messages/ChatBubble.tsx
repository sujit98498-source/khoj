import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'
import { formatRelativeTime } from '../../../../packages/shared/src/types'

interface ChatBubbleProps {
  content: string
  sentByMe: boolean
  senderName?: string
  timestamp?: Date | null
  type?: 'text' | 'voice_call' | 'video_call' | 'missed_call'
  callDuration?: number
}

export function ChatBubble({
  content,
  sentByMe,
  senderName,
  timestamp,
  type = 'text',
  callDuration,
}: ChatBubbleProps) {
  if (type !== 'text') {
    const icon =
      type === 'voice_call' ? '📞' :
      type === 'video_call' ? '🎥' : '📵'
    const label =
      type === 'missed_call'
        ? 'Missed call'
        : callDuration
        ? `${type === 'video_call' ? 'Video' : 'Voice'} call · ${formatDuration(callDuration)}`
        : `${type === 'video_call' ? 'Video' : 'Voice'} call`

    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{icon} {label}</Text>
        {timestamp && <Text style={styles.systemTime}>{formatRelativeTime(timestamp)}</Text>}
      </View>
    )
  }

  return (
    <View style={[styles.row, sentByMe ? styles.rowRight : styles.rowLeft]}>
      {!sentByMe && senderName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <View style={[styles.bubble, sentByMe ? styles.bubbleSent : styles.bubbleReceived]}>
        <Text style={[styles.messageText, sentByMe ? styles.sentText : styles.receivedText]}>
          {content}
        </Text>
      </View>
      {timestamp && (
        <Text style={[styles.timestamp, sentByMe ? styles.alignRight : styles.alignLeft]}>
          {formatRelativeTime(timestamp)}
        </Text>
      )}
    </View>
  )
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  row: {
    maxWidth: '78%',
    gap: 3,
    marginVertical: 2,
  },
  rowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  bubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleSent: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  alignRight: {
    textAlign: 'right',
  },
  alignLeft: {
    textAlign: 'left',
  },
  systemRow: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  systemText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  systemTime: {
    color: colors.textMuted,
    fontSize: 10,
  },
})
