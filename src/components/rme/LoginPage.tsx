'use client'

import { useState } from 'react'
import { Heart, Loader2, Mail, Lock, Zap, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useNhostAuth } from '@/hooks/use-nhost-auth'
import { useUIStore } from '@/stores'
import { isNhostConfigured } from '@/lib/nhost'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signInEmailPassword, loading, error, mode } = useNhostAuth()
  const navigate = useUIStore((s) => s.navigate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    const user = await signInEmailPassword(email, password)
    if (user) navigate('dashboard')
  }

  async function handleDemoLogin() {
    const user = await signInEmailPassword('demo@klinik.com', 'demo1234')
    if (user) navigate('dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 p-4">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#0E73F6] text-white shadow-lg shadow-blue-500/25 mb-4">
            <Heart className="size-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Rekam Medis Elektronik
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Praktik Mandiri Dokter
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
            <ShieldCheck className="size-3.5 text-[#0E73F6]" />
            <span className="text-xs font-medium text-[#0E73F6]">
              Sesuai Permenkes No. 24 Tahun 2022
            </span>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl shadow-blue-900/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Masuk ke Sistem</CardTitle>
            <CardDescription>
              {isNhostConfigured
                ? 'Gunakan akun Nhost yang terdaftar'
                : 'Mode demo — masukkan email & password apapun'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    required
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
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/5 rounded-lg py-2 px-3">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#0E73F6] hover:bg-[#0B5FCE] text-white"
                size="lg"
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Masuk
              </Button>
            </form>

            {!isNhostConfigured && (
              <>
                <div className="relative my-5">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    atau
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleDemoLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                  Masuk Mode Demo
                </Button>
                <p className="text-xs text-muted-foreground/70 text-center mt-2">
                  Masuk sebagai Super Admin dengan data contoh
                </p>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center pb-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Mode: {mode === 'nhost' ? 'Nhost Production' : 'Demo Sandbox'}</span>
              {mode === 'nhost' && (
                <span className="inline-flex size-2 rounded-full bg-green-500" />
              )}
              {mode === 'demo' && (
                <span className="inline-flex size-2 rounded-full bg-amber-500" />
              )}
            </div>
          </CardFooter>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          &copy; {new Date().getFullYear()} — Sistem RME Praktik Mandiri
        </p>
      </div>
    </div>
  )
}
