import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'
import { Avatar } from '../ui/Avatar'

interface IncomingCallModalProps {
  visible: boolean
  callerName: string
  callerAvatar?: string | null
  callType?: 'voice' | 'video'
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallModal({
  visible,
  callerName,
  callerAvatar,
  callType = 'voice',
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onReject}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.callType}>
            {callType === 'video' ? '🎥 Incoming Video Call' : '📞 Incoming Voice Call'}
          </Text>

          {/* Caller info */}
          <Avatar uri={callerAvatar} name={callerName} size={80} />
          <Text style={styles.callerName}>{callerName}</Text>

          {/* Ringtone label */}
          <Text style={styles.ringing}>Ringing…</Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onReject}
              style={[styles.actionBtn, styles.rejectBtn]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Reject call"
            >
              <Text style={styles.actionIcon}>✕</Text>
              <Text style={styles.actionLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAccept}
              style={[styles.actionBtn, styles.acceptBtn]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Accept call"
            >
              <Text style={styles.actionIcon}>{callType === 'video' ? '🎥' : '📞'}</Text>
              <Text style={styles.actionLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.purple + '66',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  callType: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  callerName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  ringing: {
    color: colors.cyan,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  actionBtn: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minWidth: 100,
  },
  rejectBtn: {
    backgroundColor: colors.red,
  },
  acceptBtn: {
    backgroundColor: colors.green,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
})
