import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { colors } from '../../lib/theme'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.purple} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
})
