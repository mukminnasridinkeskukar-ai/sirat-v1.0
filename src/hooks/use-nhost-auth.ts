'use client'

import { useState, useEffect, useCallback } from 'react'
import { isNhostConfigured, nhost } from '@/lib/nhost'
import { useAuthStore } from '@/stores'
import type { UserProfile } from '@/types'
import { DEMO_CLINIC, DEMO_USERS } from '@/lib/mock-data/seed'

type AuthMode = 'nhost' | 'demo'

export function useNhostAuth() {
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const mode: AuthMode = isNhostConfigured ? 'nhost' : 'demo'

  const signInEmailPassword = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError('')
      try {
        if (mode === 'nhost' && nhost) {
          // Real Nhost auth
          const { session, error: authError } = await nhost.auth.signIn({
            email,
            password,
          })
          if (authError) {
            setError(authError.message || 'Login gagal')
            return null
          }
          // Get user profile from JWT claims
          const jwt = session?.accessToken
          const claims = parseJwt(jwt || '')
          // Nhost puts Hasura claims under 'https://hasura.io/jwt/claims'
          const hClaims = claims['https://hasura.io/jwt/claims'] || {}
          const userProfile: UserProfile = {
            id: hClaims['x-hasura-user-id'] || claims['x-hasura-user-id'] || session?.user?.id || '',
            authUserId: session?.user?.id || '',
            clinicId: hClaims['x-hasura-clinic-id'] || claims['x-hasura-clinic-id'] || '',
            role: (hClaims['x-hasura-role'] || claims['x-hasura-role'] || 'user') as UserProfile['role'],
            fullName: session?.user?.displayName || email,
            sip: hClaims['x-hasura-sip'] || claims['x-hasura-sip'] || '',
            str: hClaims['x-hasura-str'] || claims['x-hasura-str'] || '',
            specialty: hClaims['x-hasura-specialty'] || claims['x-hasura-specialty'] || '',
            isActive: true,
            clinic: undefined,
          }
          login(userProfile)
          return userProfile
        } else {
          // Demo mode: accept any email/password, match to demo user
          // First seed database, then fetch real clinic ID
          try {
            await fetch('/api/seed', { method: 'POST' }).catch(() => {})
            const clinicRes = await fetch('/api/clinic')
            if (clinicRes.ok) {
              const realClinic = await clinicRes.json()
              if (realClinic?.id) {
                const demoUser = DEMO_USERS.find(u => u.role === 'super_admin') || DEMO_USERS[0]
                const userProfile: UserProfile = {
                  ...demoUser,
                  clinicId: realClinic.id,
                  clinic: { ...DEMO_CLINIC, id: realClinic.id, name: realClinic.name || DEMO_CLINIC.name, address: realClinic.address || DEMO_CLINIC.address, phone: realClinic.phone || DEMO_CLINIC.phone },
                }
                login(userProfile)
                return userProfile
              }
            }
          } catch { /* fallback to mock clinic */ }
          const demoUser = DEMO_USERS.find(u => u.role === 'super_admin') || DEMO_USERS[0]
          const userProfile: UserProfile = { ...demoUser, clinic: DEMO_CLINIC }
          login(userProfile)
          return userProfile
        }
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan saat login')
        return null
      } finally {
        setLoading(false)
      }
    },
    [mode, login]
  )

  const signOut = useCallback(async () => {
    if (mode === 'nhost' && nhost) {
      await nhost.auth.signOut()
    }
    useAuthStore.getState().logout()
  }, [mode])

  return { signInEmailPassword, signOut, loading, error, mode }
}

function parseJwt(token: string): Record<string, any> {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return {}
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return {}
  }
}

// Custom hook for getting the current auth state from Nhost (SSR-safe)
export function useAuthSession() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // In production, also sync with Nhost session
  useEffect(() => {
    if (!isNhostConfigured || !nhost) return
    nhost.auth.getSession().then((session) => {
      if (!session && isAuthenticated) {
        // Session expired, logout
        useAuthStore.getState().logout()
      }
    })
  }, [isAuthenticated])

  return { user, isAuthenticated, isLoading: false }
}
