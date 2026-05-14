// apps/mobile/hooks/useAuth.ts
// Subscribes to Firebase Auth state and loads the Firestore gamer profile.

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '@/lib/firebase'

export interface GamerProfile {
  uid:            string
  name:           string
  email:          string
  username?:      string
  gamerTag?:      string
  avatarUrl?:     string
  bio?:           string
  games?:         string[]
  skills?:        string[]
  xp:             number
  rank:           number
  wins:           number
  matchesPlayed:  number
  role?:          string
  isAdmin?:       boolean
  createdAt?:     string
  lastActive?:    string
}

interface AuthState {
  user:        User | null
  profile:     GamerProfile | null
  loading:     boolean
  signedIn:    boolean
}

export function useAuth(): AuthState {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<GamerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      // Cancel previous profile subscription
      profileUnsub?.()

      if (!firebaseUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Live profile subscription
      profileUnsub = onSnapshot(
        doc(db, COLLECTIONS.USERS, firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            setProfile({ uid: firebaseUser.uid, ...snap.data() } as GamerProfile)
          } else {
            setProfile(null)
          }
          setLoading(false)
        },
        () => setLoading(false),
      )
    })

    return () => {
      authUnsub()
      profileUnsub?.()
    }
  }, [])

  return { user, profile, loading, signedIn: !!user }
}
