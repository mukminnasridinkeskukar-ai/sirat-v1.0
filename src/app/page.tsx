'use client'

import { useAuthStore } from '@/stores'
import LoginPage from '@/components/rme/LoginPage'
import AppShell from '@/components/rme/AppShell'

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppShell />
}
