'use client'

import { useState } from 'react'
import {
  Heart,
  Loader2,
  Mail,
  Lock,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuthStore, useUIStore } from '@/stores'
import type { UserProfile } from '@/types'

// Demo super_admin user — matches the seed data
const DEMO_USER: UserProfile = {
  id: 'usr-super-001',
  authUserId: 'auth-super-001',
  clinicId: 'clinic-001',
  role: 'super_admin',
  fullName: 'Dr. Andi Pratama, Sp.PD',
  sip: '123.456.7.890.123456',
  str: '32.1.1.4567.8.23.12345',
  specialty: 'Penyakit Dalam',
  isActive: true,
  clinic: {
    id: 'clinic-001',
    name: 'Klinik Sehat Sentosa',
    address: 'Jl. Merdeka No. 45, Jakarta Selatan',
    phone: '021-7654321',
    sipDoctor: '123.456.7.890.123456',
    logoUrl: '',
    kopSurat: 'Klinik Sehat Sentosa\nJl. Merdeka No. 45, Jakarta Selatan\nTelp: 021-7654321',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useUIStore((s) => s.navigate)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi')
      return
    }
    // Demo: any email/password works, log in as super_admin
    login(DEMO_USER)
    navigate('dashboard')
  }

  async function handleDemoLogin() {
    setDemoLoading(true)
    setError('')
    try {
      // 1. Seed demo data (ignore error if already seeded)
      let clinicId = ''
      try {
        const seedRes = await fetch('/api/seed', { method: 'POST' })
        if (seedRes.ok) {
          const seedData = await seedRes.json()
          clinicId = seedData.clinicId || ''
        }
      } catch {
        // Already seeded or error — continue
      }

      // 2. Fetch clinic info
      let clinicData: Record<string, string> = {}
      try {
        const clinicRes = await fetch('/api/clinic')
        if (clinicRes.ok) {
          clinicData = await clinicRes.json()
          clinicId = clinicData.id || clinicId
        }
      } catch { /* ignore */ }

      // 3. Build user profile with real clinicId
      const userProfile: UserProfile = {
        ...DEMO_USER,
        clinicId: clinicId || DEMO_USER.clinicId,
        clinic: clinicData?.id ? {
          id: clinicData.id,
          name: clinicData.name || 'Klinik Sehat Sentosa',
          address: clinicData.address || '',
          phone: clinicData.phone || '',
          sipDoctor: clinicData.sipDoctor || '',
          logoUrl: clinicData.logoUrl || '',
          kopSurat: clinicData.kopSurat || '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } : DEMO_USER.clinic,
      }

      login(userProfile)
      navigate('dashboard')
    } catch {
      setError('Gagal terhubung ke server. Silakan coba lagi.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            {/* Logo / Branding */}
            <div className="flex justify-center mb-3">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Heart className="size-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Rekam Medis Elektronik
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Praktik Mandiri Dokter
            </CardDescription>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Sesuai Permenkes No. 24 Tahun 2022
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Manual login form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@klinik.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Masuk
              </Button>
            </form>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                atau
              </span>
            </div>

            {/* Demo login button */}
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleDemoLogin}
              disabled={demoLoading}
            >
              {demoLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Masuk Demo
            </Button>
            <p className="text-xs text-muted-foreground/70 text-center mt-2">
              Masuk sebagai Super Admin dengan data demo
            </p>
          </CardContent>

          <CardFooter className="justify-center pb-5">
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} — Sistem RME Praktik Mandiri
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
