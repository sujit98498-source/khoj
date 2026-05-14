import React, { ReactNode } from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'cyan'
type Size = 'sm' | 'md' | 'lg'

interface GamingButtonProps {
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: Variant
  size?: Size
  label: string
  icon?: ReactNode
  style?: ViewStyle
  labelStyle?: TextStyle
  fullWidth?: boolean
}

const BG: Record<Variant, string> = {
  primary: colors.purple,
  secondary: colors.surface,
  danger: colors.red,
  ghost: 'transparent',
  cyan: colors.cyan,
}
const TEXT_COLOR: Record<Variant, string> = {
  primary: '#fff',
  secondary: colors.text,
  danger: '#fff',
  ghost: colors.textMuted,
  cyan: colors.bg,
}
const BORDER: Record<Variant, string> = {
  primary: colors.purple,
  secondary: colors.border,
  danger: colors.red,
  ghost: colors.border,
  cyan: colors.cyan,
}
const PAD: Record<Size, { paddingHorizontal: number; paddingVertical: number }> = {
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  md: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
}
const FONT: Record<Size, number> = { sm: 12, md: 14, lg: 16 }

export function GamingButton({
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  label,
  icon,
  style,
  labelStyle,
  fullWidth = false,
}: GamingButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        PAD[size],
        {
          backgroundColor: BG[variant],
          borderColor: BORDER[variant],
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: TEXT_COLOR[variant], fontSize: FONT[size] }, labelStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 36,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
