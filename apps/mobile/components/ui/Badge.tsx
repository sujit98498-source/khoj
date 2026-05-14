import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import { getXpTier } from '../../lib/theme'

type BadgeVariant = 'xp' | 'status' | 'rank' | 'custom'
type StatusType = 'online' | 'offline' | 'in-game'

interface BadgeProps {
  variant?: BadgeVariant
  xp?: number
  status?: StatusType
  label?: string
  color?: string
}

export function Badge({ variant = 'custom', xp, status, label, color }: BadgeProps) {
  if (variant === 'xp' && xp !== undefined) {
    const tier = getXpTier(xp)
    return (
      <View style={[styles.base, { backgroundColor: tier.color + '22', borderColor: tier.color + '66' }]}>
        <Text style={[styles.text, { color: tier.color }]}>{tier.label}</Text>
      </View>
    )
  }

  if (variant === 'status' && status) {
    const statusColor =
      status === 'online' ? colors.green :
      status === 'in-game' ? colors.cyan :
      colors.textMuted
    const statusLabel =
      status === 'online' ? 'Online' :
      status === 'in-game' ? 'In Game' : 'Offline'
    return (
      <View style={[styles.base, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.text, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    )
  }

  const bg = color ? color + '22' : colors.surface
  const border = color ? color + '55' : colors.border
  const textColor = color ?? colors.textMuted
  return (
    <View style={[styles.base, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: textColor }]}>{label ?? ''}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})
