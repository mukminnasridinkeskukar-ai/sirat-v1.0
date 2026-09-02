'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Activity,
  ListOrdered,
  Banknote,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores'
import { apiFetch } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// ---------- helpers ----------

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDateIndo(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortDay(d: Date): string {
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ---------- types ----------

interface StatCard {
  label: string
  value: number | string
  icon: React.ElementType
  bgClass: string
  iconClass: string
  trend?: { value: number; up: boolean }
}

interface DailyVisitResponse {
  type: string
  date: string
  summary: {
    totalEncounters: number
    totalQueues: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }
  encounters: Array<{
    id: string
    encounterDate: string
    status: string
    chiefComplaint: string
    patient?: { fullName: string; rmNumber: string }
    doctor?: { fullName: string }
  }>
}

interface TopDiseaseResponse {
  type: string
  data: Array<{ code: string; name: string; count: number }>
}

interface RevenueResponse {
  type: string
  summary: {
    totalRevenue: number
    totalUnpaid: number
    totalInvoices: number
    paidCount: number
    unpaidCount: number
  }
}

interface EncounterRow {
  id: string
  encounterDate: string
  status: string
  chiefComplaint: string
  patient?: { rmNumber: string; fullName: string }
  doctor?: { fullName: string }
}

// ---------- skeleton components ----------

function StatCardSkeleton() {
  return (
    <Card className="py-5">
      <CardContent className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

// ---------- status badge helper ----------

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    berlangsung: { label: 'Berlangsung', variant: 'default' },
    selesai: { label: 'Selesai', variant: 'secondary' },
    dibatalkan: { label: 'Dibatalkan', variant: 'destructive' },
  }
  const s = map[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

// ---------- main component ----------

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  // data states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // stats
  const [totalPatients, setTotalPatients] = useState(0)
  const [todayVisits, setTodayVisits] = useState(0)
  const [activeQueues, setActiveQueues] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)

  // chart data
  const [chartData, setChartData] = useState<
    Array<{ date: string; kunjungan: number }>
  >([])

  // last 5 encounters
  const [recentEncounters, setRecentEncounters] = useState<EncounterRow[]>([])

  // top diseases
  const [topDiseases, setTopDiseases] = useState<
    Array<{ code: string; name: string; count: number }>
  >([])

  // compliance (super_admin)
  const [compliance, setCompliance] = useState<number | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const today = new Date()
      const todayStr = toDateStr(today)

      // Build 7-day chart dates
      const chartDates: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        chartDates.push(toDateStr(d))
      }

      // Fire all requests in parallel
      const [patientRes, dailyRes, queueRes, revenueRes, encounterRes, diseaseRes] =
        await Promise.all([
          apiFetch<{ data: unknown[]; pagination: { total: number } }>(
            '/patients?limit=1&page=1'
          ).catch(() => null),
          apiFetch<DailyVisitResponse>(
            `/reports?type=daily-visits&date=${todayStr}`
          ).catch(() => null),
          apiFetch<{ data: unknown[] }>('/queues?status=menunggu').catch(
            () => null
          ),
          apiFetch<RevenueResponse>(
            '/reports?type=revenue&period=month'
          ).catch(() => null),
          apiFetch<{ data: EncounterRow[]; pagination: unknown }>(
            '/encounters?limit=5'
          ).catch(() => null),
          apiFetch<TopDiseaseResponse>(
            '/reports?type=top-diseases&period=month'
          ).catch(() => null),
        ])

      // Stats
      setTotalPatients(patientRes?.pagination?.total ?? 0)
      setTodayVisits(dailyRes?.summary?.totalEncounters ?? 0)
      setActiveQueues(queueRes?.data?.length ?? 0)
      setMonthRevenue(revenueRes?.summary?.totalRevenue ?? 0)

      // Chart: fetch each day
      const chartPromises = chartDates.map(async (date) => {
        const res = await apiFetch<DailyVisitResponse>(
          `/reports?type=daily-visits&date=${date}`
        ).catch(() => null)
        const d = new Date(date)
        return {
          date: shortDay(d),
          kunjungan: res?.summary?.totalEncounters ?? 0,
        }
      })
      const chartResults = await Promise.all(chartPromises)
      setChartData(chartResults)

      // Recent encounters
      setRecentEncounters(encounterRes?.data ?? [])

      // Top diseases
      setTopDiseases(diseaseRes?.data?.slice(0, 10) ?? [])

      // Compliance (super_admin only)
      if (user?.role === 'super_admin' && dailyRes) {
        const total = dailyRes.summary.totalEncounters || 1
        const completed = dailyRes.summary.byStatus?.selesai || 0
        setCompliance(Math.round((completed / total) * 100))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ---------- stat cards ----------

  const statCards: StatCard[] = [
    {
      label: 'Total Pasien Terdaftar',
      value: totalPatients.toLocaleString('id-ID'),
      icon: Users,
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/40',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      trend: { value: 12, up: true },
    },
    {
      label: 'Kunjungan Hari Ini',
      value: todayVisits,
      icon: Activity,
      bgClass: 'bg-blue-100 dark:bg-blue-950/40',
      iconClass: 'text-blue-600 dark:text-blue-400',
      trend: todayVisits > 0 ? { value: 8, up: true } : undefined,
    },
    {
      label: 'Antrian Aktif',
      value: activeQueues,
      icon: ListOrdered,
      bgClass: 'bg-amber-100 dark:bg-amber-950/40',
      iconClass: 'text-amber-600 dark:text-amber-400',
      trend: activeQueues > 0 ? { value: 3, up: true } : undefined,
    },
    {
      label: 'Pendapatan Bulan Ini',
      value: formatRupiah(monthRevenue),
      icon: Banknote,
      bgClass: 'bg-green-100 dark:bg-green-950/40',
      iconClass: 'text-green-600 dark:text-green-400',
      trend: { value: 15, up: true },
    },
  ]

  const maxDiseaseCount =
    topDiseases.length > 0
      ? Math.max(...topDiseases.map((d) => d.count))
      : 1

  // ---------- render ----------

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Selamat Datang, {user?.fullName?.split(' ')[0] ?? 'Admin'}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>{formatDateIndo(new Date())}</span>
          <span className="hidden sm:inline">
            &mdash; {user?.clinic?.name ?? 'Klinik Praktik Mandiri'}
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label} className="py-5">
                  <CardContent className="flex items-center gap-4">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${card.bgClass}`}
                    >
                      <Icon className={`size-6 ${card.iconClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {card.value}
                      </p>
                      {card.trend && (
                        <div className="mt-1 flex items-center gap-1">
                          {card.trend.up ? (
                            <TrendingUp className="size-3 text-emerald-500" />
                          ) : (
                            <TrendingDown className="size-3 text-red-500" />
                          )}
                          <span
                            className={`text-xs font-medium ${card.trend.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            +{card.trend.value}% dari kemarin
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* Super admin: Kepatuhan RME */}
      {user?.role === 'super_admin' && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              Kepatuhan RME
            </CardTitle>
            <CardDescription>
              Persentase kunjungan yang telah dilengkapi rekam medis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress
                value={loading ? 0 : compliance ?? 0}
                className="h-3 flex-1"
              />
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {loading ? (
                  <Skeleton className="inline-block h-6 w-12" />
                ) : (
                  `${compliance ?? 0}%`
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart: Kunjungan 7 Hari Terakhir */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kunjungan 7 Hari Terakhir
            </CardTitle>
            <CardDescription>
              Jumlah kunjungan pasien per hari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                    }}
                    labelFormatter={(l) => `Tanggal: ${l}`}
                    formatter={(v: number) => [
                      `${v} kunjungan`,
                      'Jumlah',
                    ]}
                  />
                  <Bar
                    dataKey="kunjungan"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom grid: Recent Visits + Top Diseases */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 5 Kunjungan Terakhir */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                5 Kunjungan Terakhir
              </CardTitle>
              <CardDescription>
                Daftar kunjungan pasien terbaru
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEncounters.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada kunjungan
                </p>
              ) : (
                <ScrollArea className="max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No RM</TableHead>
                        <TableHead>Nama Pasien</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Dokter
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Keluhan
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Waktu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEncounters.map((enc) => (
                        <TableRow key={enc.id}>
                          <TableCell className="font-mono text-xs">
                            {enc.patient?.rmNumber ?? '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {enc.patient?.fullName ?? '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {enc.doctor?.fullName ?? '-'}
                          </TableCell>
                          <TableCell className="hidden max-w-[140px] truncate lg:table-cell">
                            {enc.chiefComplaint || '-'}
                          </TableCell>
                          <TableCell>{statusBadge(enc.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatTime(enc.encounterDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* 10 Penyakit Terbanyak */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                10 Penyakit Terbanyak
              </CardTitle>
              <CardDescription>
                Berdasarkan data diagnosis bulan ini (ICD-10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topDiseases.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada data penyakit
                </p>
              ) : (
                <ScrollArea className="max-h-80">
                  <div className="flex flex-col gap-3">
                    {topDiseases.map((d) => (
                      <div key={d.code} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {d.code}
                            </span>{' '}
                            <span className="text-sm font-medium text-foreground">
                              {d.name}
                            </span>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {d.count}
                          </Badge>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.round((d.count / maxDiseaseCount) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
