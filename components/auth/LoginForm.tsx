'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { createUserDocument, getUserById } from '@/services/userService'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errs: typeof errors = {}
    if (!email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email'
    if (!password) errs.password = 'Password is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      document.cookie = 'khoj-auth=1; path=/; max-age=2592000; SameSite=Lax'
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : 'Login failed. Try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (targetEmail: string) => {
    console.log('Forgot password clicked')

    const trimmedEmail = (targetEmail || email).trim()
    console.log('Reset email value:', trimmedEmail)

    if (!trimmedEmail) {
      const message = 'Please enter your email address.'
      console.error('Reset password error:', message)
      setResetMessage({ type: 'error', text: message })
      return
    }

    setResetLoading(true)
    setResetMessage(null)

    try {
      await sendPasswordResetEmail(auth, trimmedEmail)
      console.log('Password reset email sent successfully for:', trimmedEmail)
      setResetMessage({ type: 'success', text: 'Reset email sent. Check your inbox.' })
      toast.success('Reset email sent. Check your inbox.')
    } catch (err: any) {
      console.error('Reset password Firebase error:', err)

      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account was found for that email.'
          : err.code === 'auth/invalid-email'
            ? 'Please enter a valid email address.'
            : err.code === 'auth/network-request-failed'
              ? 'Network error. Please check your internet connection and try again.'
              : 'Failed to send reset email. Try again.'

      setResetMessage({ type: 'error', text: msg })
      toast.error(msg)
    } finally {
      setResetLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const existingUser = await getUserById(user.uid)
      if (!existingUser) {
        await createUserDocument(
          user.uid,
          user.displayName?.trim() || 'Google User',
          user.email || ''
        )
      }

      document.cookie = 'khoj-auth=1; path=/; max-age=2592000; SameSite=Lax'
      toast.success('Signed in with Google!')
      router.push('/dashboard')
    } catch (err: any) {
      const msg =
        err.code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled'
          : 'Google sign-in failed. Try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (!showResetPassword) setResetEmail(e.target.value)
        }}
        error={errors.email}
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="current-password"
      />

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setShowResetPassword((prev) => !prev)
            setResetEmail(email)
            setResetMessage(null)
          }}
          className="text-sm text-khoj-subtle underline underline-offset-4 hover:text-khoj-accent transition-colors cursor-pointer"
        >
          Forgot Password?
        </button>

        {showResetPassword && (
          <div className="rounded-sm border border-khoj-border bg-khoj-card p-4 space-y-3">
            <Input
              label="Reset Email"
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              autoComplete="email"
            />

            {resetMessage && (
              <div
                className={resetMessage.type === 'success'
                  ? 'rounded-sm bg-khoj-teal/10 text-khoj-teal px-3 py-2 text-sm'
                  : 'rounded-sm bg-red-500/10 text-red-400 px-3 py-2 text-sm'}
              >
                {resetMessage.text}
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleResetPassword(resetEmail || email)}
              loading={resetLoading}
              disabled={resetLoading || loading}
              className="w-full"
            >
              Send Reset Link
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Sign In
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-khoj-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider text-khoj-subtle font-body">
          <span className="bg-khoj-bg px-3">Or</span>
        </div>
      </div>
      <Button type="button" variant="secondary" onClick={handleGoogleSignIn} className="w-full" size="lg" disabled={loading || resetLoading}>
        Continue with Google
      </Button>
      <p className="text-center text-sm text-khoj-subtle font-body">
        No account?{' '}
        <Link href="/auth/signup" className="text-khoj-accent hover:underline">
          Create one
        </Link>
      </p>
    </form>
  )
}
