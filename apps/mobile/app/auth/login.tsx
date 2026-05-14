import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { colors, radius, spacing } from '../../lib/theme'
import { GamingButton } from '../../components/ui/GamingButton'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    const e = email.trim().toLowerCase()
    const p = password

    if (!e || !p) {
      Alert.alert('Error', 'Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, e, p)
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please try again later.'
          : 'Sign in failed. Please try again.'
      Alert.alert('Sign In Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>⬡</Text>
          <Text style={styles.appName}>KHOJ Gaming</Text>
          <Text style={styles.tagline}>Level up. Game together.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
          </View>

          <GamingButton
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to KHOJ? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    fontSize: 56,
    color: colors.purple,
  },
  appName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '700',
  },
})
