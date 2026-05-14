import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'

const MAX_CHARS = 1000

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = 'Type a message…' }: ChatInputProps) {
  const [text, setText] = useState('')

  const trimmed = text.trim()
  const canSend = trimmed.length > 0 && !disabled

  function handleSend() {
    if (!canSend) return
    onSend(trimmed)
    setText('')
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={(v) => setText(v.slice(0, MAX_CHARS))}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        maxLength={MAX_CHARS}
        returnKeyType="default"
        blurOnSubmit={false}
        editable={!disabled}
        accessibilityLabel="Message input"
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        <Text style={styles.sendIcon}>▶</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.purple,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
})
