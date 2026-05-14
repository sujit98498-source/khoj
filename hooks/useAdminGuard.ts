'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { KhojUser } from '@/lib/types'
import {
  hasAllowedAdminRole,
  normalizeAdminRole,
  resolveAdminRole,
  type AdminAllowedRole,
} from '@/lib/admin/roles'

export type AdminGuardStatus = 'loading' | 'authorized' | 'unauthorized'

const DEFAULT_ALLOWED_ROLES: AdminAllowedRole[] = ['admin']

export interface AdminGuardState {
  status: AdminGuardStatus
  user: KhojUser | null
}

export function useAdminGuard(allowedRoles: AdminAllowedRole[] = DEFAULT_ALLOWED_ROLES): AdminGuardState {
  const [state, setState] = useState<AdminGuardState>({
    status: 'loading',
    user: null,
  })

  const allowedRolesKey = allowedRoles.join('|')

  useEffect(() => {
    let isActive = true

    if (!auth) {
      setState({ status: 'unauthorized', user: null })
      return () => {
        isActive = false
      }
    }

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

        const userRef = doc(requireFirestoreDb(), COLLECTIONS.USERS, user.uid)
        const userSnap = await getDoc(userRef)

        if (!isActive) return

        if (!userSnap.exists()) {
          console.log('User Data:', null)
          console.log('Role:', undefined)
          setState({ status: 'unauthorized', user: null })
          return
        }

        const rawData = userSnap.data() as Partial<KhojUser>
        const resolvedRole = resolveAdminRole(rawData)
        const normalizedRole = normalizeAdminRole(rawData.role)
        const role = resolvedRole ?? (normalizedRole === 'user' ? 'user' : undefined)
        const isAllowed = hasAllowedAdminRole(rawData, allowedRoles)
        const userData: KhojUser = {
          uid: user.uid,
          name: rawData.name ?? user.displayName ?? 'Admin User',
          email: rawData.email ?? user.email ?? '',
          role,
          isAdmin: rawData.isAdmin === true,
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

        if (allowedRoles.includes('founder') && allowedRoles.includes('ceo')) {
          console.log('Growth Studio role check', {
            uid: user.uid,
            email: user.email ?? userData.email,
            role: rawData.role ?? (rawData.isAdmin === true ? 'isAdmin:true' : undefined),
            isAllowed,
          })
        }

        if (isAllowed) {
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
  }, [allowedRoles, allowedRolesKey])

  return state
}
