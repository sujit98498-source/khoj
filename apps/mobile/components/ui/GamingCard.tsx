import React, { ReactNode } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'

interface GamingCardProps {
  children: ReactNode
  glow?: boolean
  glowColor?: string
  style?: ViewStyle
  padding?: number
}

export function GamingCard({
  children,
  glow = false,
  glowColor,
  style,
  padding = spacing.md,
}: GamingCardProps) {
  const glowStyle: ViewStyle = glow
    ? {
        borderColor: glowColor ?? colors.purple,
        shadowColor: glowColor ?? colors.purple,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 8,
      }
    : {}

  return (
    <View style={[styles.card, { padding }, glowStyle, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
