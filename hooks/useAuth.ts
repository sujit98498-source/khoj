// hooks/useAuth.ts
// Centralized authentication state management
// Combines Firebase Auth with Firestore user document

'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { getUserById } from '@/services/userService'
import { KhojUser } from '@/lib/types'

interface AuthState {
  firebaseUser: User | null
  khojUser: KhojUser | null
  loading: boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    khojUser: null,
    loading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    if (!auth) {
      setState({
        firebaseUser: null,
        khojUser: null,
        loading: false,
        isAuthenticated: false,
      })
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch Firestore profile — catch Firestore errors so loading never hangs
        const khojUser = await getUserById(user.uid).catch(() => null)
        setState({
          firebaseUser: user,
          khojUser,
          loading: false,
          isAuthenticated: true,
        })
      } else {
        setState({
          firebaseUser: null,
          khojUser: null,
          loading: false,
          isAuthenticated: false,
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return state
}
