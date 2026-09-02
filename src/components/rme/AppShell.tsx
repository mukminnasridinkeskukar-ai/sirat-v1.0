'use client'

import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Users, ListOrdered, Stethoscope,
  FileText, Receipt, BarChart3, Shield, Pill, Settings,
  LogOut, Sun, Moon, Menu, Heart, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { useAuthStore, useUIStore } from '@/stores'
import { useNhostAuth } from '@/hooks/use-nhost-auth'
import type { AppPage, UserRole } from '@/types'
import { cn } from '@/lib/utils'
import { useState, lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-loaded page components
const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'))
const PasienPage = lazy(() => import('@/components/pasien/PasienPage'))
const AntrianPage = lazy(() => import('@/components/antrian/AntrianPage'))
const PelayananPage = lazy(() => import('@/components/soap/PelayananPage'))
const ResepPage = lazy(() => import('@/components/resep/ResepPage'))
const BillingPage = lazy(() => import('@/components/billing/BillingPage'))
const LaporanPage = lazy(() => import('@/components/laporan/LaporanPage'))
const AuditPage = lazy(() => import('@/components/audit/AuditPage'))
const MasterObatPage = lazy(() => import('@/components/master-obat/MasterObatPage'))
const PengaturanPage = lazy(() => import('@/components/pengaturan/PengaturanPage'))

interface NavItem {
  id: AppPage
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin', 'apoteker'] },
  { id: 'pasien', label: 'Pasien', icon: Users, roles: ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin'] },
  { id: 'antrian', label: 'Antrian', icon: ListOrdered, roles: ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan', 'resepsionis_admin'] },
  { id: 'pelayanan', label: 'Pelayanan', icon: Stethoscope, roles: ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan'] },
  { id: 'resep', label: 'E-Resep', icon: FileText, roles: ['super_admin', 'dokter_pj', 'dokter', 'apoteker'] },
  { id: 'billing', label: 'Kasir', icon: Receipt, roles: ['super_admin', 'resepsionis_admin'] },
  { id: 'laporan', label: 'Laporan', icon: BarChart3, roles: ['super_admin', 'dokter_pj', 'dokter'] },
  { id: 'audit', label: 'Audit Trail', icon: Shield, roles: ['super_admin'] },
  { id: 'master-obat', label: 'Master Obat', icon: Pill, roles: ['super_admin', 'apoteker'] },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['super_admin'] },
]

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin', dokter_pj: 'Dokter PJ', dokter: 'Dokter',
  perawat_bidan: 'Perawat/Bidan', resepsionis_admin: 'Resepsionis', apoteker: 'Apoteker',
}

function SidebarContent() {
  const user = useAuthStore((s) => s.user)
  const currentPage = useUIStore((s) => s.currentPage)
  const navigate = useUIStore((s) => s.navigate)
  const logout = useNhostAuth().signOut

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#0E73F6] text-white shadow-md shadow-blue-500/20">
          <Heart className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight text-foreground">RME</span>
          <span className="text-[11px] leading-tight text-muted-foreground">Praktik Mandiri</span>
        </div>
      </div>

      <Separator className="mx-3 w-auto" />

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              currentPage === item.id ||
              (item.id === 'pasien' && (currentPage === 'pasien-detail' || currentPage === 'pelayanan-soap'))
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
                  isActive
                    ? 'bg-[#0E73F6]/10 text-[#0E73F6] font-semibold'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className={cn('size-4 shrink-0', isActive && 'text-[#0E73F6]')} />
                <span>{item.label}</span>
                {isActive && <div className="ml-auto size-1.5 rounded-full bg-[#0E73F6]" />}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <Separator className="mx-3 w-auto" />
      <div className="p-3">
        {user && (
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#0E73F6]/10 text-[#0E73F6] text-xs font-bold">
              {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">{user.fullName}</span>
              <span className="text-[11px] text-muted-foreground">{roleLabels[user.role]}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="size-4" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function PageRouter({ currentPage }: { currentPage: AppPage }) {
  switch (currentPage) {
    case 'dashboard': return <DashboardPage />
    case 'pasien': case 'pasien-detail': return <PasienPage />
    case 'antrian': return <AntrianPage />
    case 'pelayanan': case 'pelayanan-soap': return <PelayananPage />
    case 'resep': return <ResepPage />
    case 'billing': return <BillingPage />
    case 'laporan': return <LaporanPage />
    case 'audit': return <AuditPage />
    case 'master-obat': return <MasterObatPage />
    case 'pengaturan': return <PengaturanPage />
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0E73F6]/10 mb-4">
            <Heart className="size-8 text-[#0E73F6]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Halaman ini akan tersedia segera.</h2>
          <p className="text-sm text-muted-foreground max-w-md">Fitur untuk halaman ini sedang dalam pengembangan.</p>
        </div>
      )
  }
}

export default function AppShell() {
  const user = useAuthStore((s) => s.user)
  const currentPage = useUIStore((s) => s.currentPage)
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentNavLabel = navItems.find((i) => i.id === currentPage)?.label ?? 'RME'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
              <span className="sr-only">Buka menu</span>
            </Button>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-foreground">{user?.clinic?.name ?? 'Klinik Praktik Mandiri'}</span>
              <span className="text-xs text-muted-foreground">{currentNavLabel}</span>
            </div>
            <span className="text-sm font-semibold text-foreground sm:hidden">{currentNavLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 mr-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#0E73F6]/10 text-[#0E73F6] text-xs font-bold">
                  {user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground leading-tight">{user.fullName}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mt-0.5 bg-[#0E73F6]/10 text-[#0E73F6]">
                    {roleLabels[user.role]}
                  </Badge>
                </div>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Ubah tema">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => useAuthStore.getState().logout()} aria-label="Keluar">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<PageSkeleton />}>
            <PageRouter currentPage={currentPage} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
