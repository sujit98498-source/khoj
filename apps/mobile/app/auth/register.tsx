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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '../../lib/firebase'
import { colors, radius, spacing } from '../../lib/theme'
import { GamingButton } from '../../components/ui/GamingButton'

export default function RegisterScreen() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [gamerTag, setGamerTag] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const name = displayName.trim()
    const tag = gamerTag.trim()
    const e = email.trim().toLowerCase()
    const p = password

    if (!name) return 'Display name is required.'
    if (!tag) return 'GamerTag is required.'
    if (tag.length > 30) return 'GamerTag must be 30 characters or less.'
    if (!/^[a-zA-Z0-9_-]+$/.test(tag)) return 'GamerTag can only contain letters, numbers, _ and -.'
    if (!e) return 'Email is required.'
    if (!p) return 'Password is required.'
    if (p.length < 8) return 'Password must be at least 8 characters.'
    return null
  }

  async function handleRegister() {
    const error = validate()
    if (error) {
      Alert.alert('Validation Error', error)
      return
    }

    const name = displayName.trim()
    const tag = gamerTag.trim()
    const e = email.trim().toLowerCase()

    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, e, password)
      const uid = credential.user.uid

      // Update Firebase Auth display name
      await updateProfile(credential.user, { displayName: name })

      // Create the Firestore user document
      await setDoc(doc(db, COLLECTIONS.USERS, uid), {
        uid,
        name,
        email: e,
        gamerTag: tag,
        username: tag.toLowerCase(),
        xp: 0,
        rank: 9999,
        wins: 0,
        matchesPlayed: 0,
        games: [],
        skills: [],
        role: 'gamer',
        isAdmin: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      router.replace('/(tabs)')
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/weak-password'
          ? 'Password is too weak. Use at least 8 characters.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : 'Registration failed. Please try again.'
      Alert.alert('Registration Failed', msg)
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
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>⬡</Text>
          <Text style={styles.appName}>Join KHOJ Gaming</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your gaming name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>GamerTag</Text>
            <TextInput
              value={gamerTag}
              onChangeText={(v) => setGamerTag(v.slice(0, 30))}
              placeholder="xX_GamingHero_Xx"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
            <Text style={styles.hint}>Max 30 chars · letters, numbers, _ -</Text>
          </View>

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
              placeholder="Min 8 characters"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!loading}
            />
          </View>

          <GamingButton
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
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
    fontSize: 48,
    color: colors.purple,
  },
  appName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
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
  hint: {
    color: colors.textMuted,
    fontSize: 11,
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
