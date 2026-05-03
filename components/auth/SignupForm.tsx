'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { requireFirebaseAuth } from '@/lib/firebase/config'
import { createUserDocument, getUserById } from '@/services/userService'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Minimum 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const auth = requireFirebaseAuth()
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name })
      await createUserDocument(user.uid, name.trim(), email)
      document.cookie = 'khoj-auth=1; path=/; max-age=2592000; SameSite=Lax'
      toast.success('Account created! Welcome to KHOJ.')
      router.push('/dashboard')
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered'
          : 'Signup failed. Try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    try {
      const auth = requireFirebaseAuth()
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
        label="Full Name"
        type="text"
        placeholder="John Doe"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        placeholder="Min. 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="new-password"
      />
      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create Account
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-khoj-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider text-khoj-subtle font-body">
          <span className="bg-khoj-bg px-3">Or</span>
        </div>
      </div>
      <Button type="button" variant="secondary" onClick={handleGoogleSignup} className="w-full" size="lg" disabled={loading}>
        Continue with Google
      </Button>
      <p className="text-center text-sm text-khoj-subtle font-body">
        Have an account?{' '}
        <Link href="/auth/login" className="text-khoj-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
