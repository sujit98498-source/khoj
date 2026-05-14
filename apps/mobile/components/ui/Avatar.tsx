import React from 'react'
import { View, Image, Text, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'

interface AvatarProps {
  uri?: string | null
  name?: string | null
  size?: number
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initial = name?.charAt(0).toUpperCase() ?? '?'
  const style = { width: size, height: size, borderRadius: size / 2 }

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, style]}
        accessibilityLabel={name ?? 'avatar'}
      />
    )
  }

  return (
    <View style={[styles.base, styles.placeholder, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.text,
    fontWeight: '700',
  },
})
