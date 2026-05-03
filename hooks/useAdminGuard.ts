'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { KhojUser } from '@/lib/types'

export type AdminGuardStatus = 'loading' | 'authorized' | 'unauthorized'

export interface AdminGuardState {
  status: AdminGuardStatus
  user: KhojUser | null
}

export function useAdminGuard(): AdminGuardState {
  const [state, setState] = useState<AdminGuardState>({
    status: 'loading',
    user: null,
  })

  useEffect(() => {
    let isActive = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) return

      if (!user) {
        console.log('UID:', null)
        console.log('User Data:', null)
        console.log('Role:', undefined)
        setState({ status: 'unauthorized', user: null })
        return
      }

      try {
        console.log('UID:', user.uid)

        const userRef = doc(db, COLLECTIONS.USERS, user.uid)
        const userSnap = await getDoc(userRef)

        if (!isActive) return

        if (!userSnap.exists()) {
          console.log('User Data:', null)
          console.log('Role:', undefined)
          setState({ status: 'unauthorized', user: null })
          return
        }

        const rawData = userSnap.data() as Partial<KhojUser>
        const userData: KhojUser = {
          uid: user.uid,
          name: rawData.name ?? user.displayName ?? 'Admin User',
          email: rawData.email ?? user.email ?? '',
          role: rawData.role,
          xp: rawData.xp ?? 0,
          rank: rawData.rank ?? 0,
          wins: rawData.wins ?? 0,
          matchesPlayed: rawData.matchesPlayed ?? 0,
          skills: rawData.skills ?? [],
          createdAt: rawData.createdAt ?? new Date().toISOString(),
          lastActive: rawData.lastActive ?? new Date().toISOString(),
        }

        console.log('User Data:', userData)
        console.log('Role:', userData?.role)

        if (userData.role === 'admin') {
          setState({ status: 'authorized', user: userData })
          return
        }

        setState({ status: 'unauthorized', user: null })
      } catch (error) {
        console.error('Admin guard error:', error)
        if (isActive) {
          setState({ status: 'unauthorized', user: null })
        }
      }
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  return state
}
