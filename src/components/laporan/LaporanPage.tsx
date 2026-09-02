'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Download,
  AlertCircle,
  Users,
  Activity,
  Banknote,
  CheckCircle2,
  XCircle,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function shortDay(d: Date): string {
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ---------- types ----------

interface DailyVisitResponse {
  type: string
  date: string
  summary: {
    totalEncounters: number
    totalQueues: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }
  encounters: DailyEncounter[]
}

interface DailyEncounter {
  id: string
  encounterDate: string
  status: string
  chiefComplaint: string
  patient?: { fullName: string; rmNumber: string }
  doctor?: { fullName: string }
  diagnoses?: Array<{ icd10Code: string; icd10Name: string }>
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

// ---------- status badge ----------

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    berlangsung: { label: 'Berlangsung', variant: 'default' },
    selesai: { label: 'Selesai', variant: 'secondary' },
    dibatalkan: { label: 'Dibatalkan', variant: 'destructive' },
  }
  const s = map[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

// ---------- skeleton ----------

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  )
}

// ---------- main component ----------

export default function LaporanPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // daily data
  const [dailyData, setDailyData] = useState<DailyVisitResponse | null>(null)

  // weekly data
  const [weeklyChart, setWeeklyChart] = useState<Array<{ date: string; kunjungan: number }>>([])
  const [weeklySummary, setWeeklySummary] = useState({
    totalVisits: 0,
    completedVisits: 0,
    totalDays: 7,
  })

  // monthly data
  const [monthlySummary, setMonthlySummary] = useState({
    totalVisits: 0,
    completedVisits: 0,
    avgPerDay: 0,
  })

  // top diseases (shared)
  const [topDiseases, setTopDiseases] = useState<
    Array<{ code: string; name: string; count: number }>
  >([])

  // revenue (shared)
  const [revenue, setRevenue] = useState<RevenueResponse['summary'] | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const today = new Date()
      const todayStr = toDateStr(today)

      // Common requests (always needed)
 const [diseaseRes, revenueRes] = await Promise.all([
        apiFetch<TopDiseaseResponse>(
          `/reports?type=top-diseases&period=${period === 'today' ? 'month' : period === 'week' ? 'week' : 'month'}`
        ).catch(() => null),
        apiFetch<RevenueResponse>(
          `/reports?type=revenue&period=${period === 'today' ? 'month' : period === 'week' ? 'week' : 'month'}`
        ).catch(() => null),
      ])

      setTopDiseases(diseaseRes?.data?.slice(0, 10) ?? [])
      setRevenue(revenueRes?.summary ?? null)

      if (period === 'today') {
        // Today's detailed data
        const dailyRes = await apiFetch<DailyVisitResponse>(
          `/reports?type=daily-visits&date=${todayStr}`
        ).catch(() => null)
        setDailyData(dailyRes)
      } else if (period === 'week') {
        // Week: fetch each day
        const days: string[] = []
        const dayOfWeek = today.getDay() // 0=Sun
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(today)
        monday.setDate(today.getDate() + mondayOffset)

        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          days.push(toDateStr(d))
        }

        const weekResults = await Promise.all(
          days.map(async (date) => {
            const res = await apiFetch<DailyVisitResponse>(
              `/reports?type=daily-visits&date=${date}`
            ).catch(() => null)
            const d = new Date(date)
            return {
              date: shortDay(d),
              kunjungan: res?.summary?.totalEncounters ?? 0,
              completed: res?.summary?.byStatus?.selesai ?? 0,
            }
          })
        )

        setWeeklyChart(weekResults)
        const totalV = weekResults.reduce((s, r) => s + r.kunjungan, 0)
        const totalC = weekResults.reduce((s, r) => s + r.completed, 0)
        setWeeklySummary({
          totalVisits: totalV,
          completedVisits: totalC,
          totalDays: 7,
        })
      } else {
        // Month: fetch each day of the month
        const year = today.getFullYear()
        const month = today.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const todayDate = today.getDate()

        const days: string[] = []
        for (let i = 1; i <= todayDate; i++) {
          days.push(
            `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
          )
        }

        const monthResults = await Promise.all(
          days.map(async (date) => {
            const res = await apiFetch<DailyVisitResponse>(
              `/reports?type=daily-visits&date=${date}`
            ).catch(() => null)
            return {
              total: res?.summary?.totalEncounters ?? 0,
              completed: res?.summary?.byStatus?.selesai ?? 0,
            }
          })
        )

        const totalV = monthResults.reduce((s, r) => s + r.total, 0)
        const totalC = monthResults.reduce((s, r) => s + r.completed, 0)
        setMonthlySummary({
          totalVisits: totalV,
          completedVisits: totalC,
          avgPerDay: todayDate > 0 ? Math.round(totalV / todayDate) : 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data laporan')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    toast.info('Fitur export akan segera tersedia')
  }

  const maxDiseaseCount =
    topDiseases.length > 0 ? Math.max(...topDiseases.map((d) => d.count)) : 1

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Laporan
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan data pelayanan klinik
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="size-4" />
          <span className="ml-2">Export</span>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList>
          <TabsTrigger value="today">Hari Ini</TabsTrigger>
          <TabsTrigger value="week">Minggu Ini</TabsTrigger>
          <TabsTrigger value="month">Bulan Ini</TabsTrigger>
        </TabsList>

        {/* ==================== TAB: HARI INI ==================== */}
        <TabsContent value="today">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
              <Card>
                <CardContent className="py-4">
                  <TableSkeleton />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                      <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Kunjungan
                      </p>
                      <p className="text-2xl font-bold">
                        {dailyData?.summary?.totalEncounters ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                      <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Selesai
                      </p>
                      <p className="text-2xl font-bold">
                        {dailyData?.summary?.byStatus?.selesai ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                      <Users className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Antrian Hari Ini
                      </p>
                      <p className="text-2xl font-bold">
                        {dailyData?.summary?.totalQueues ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's visit table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Kunjungan Hari Ini
                  </CardTitle>
                  <CardDescription>
                    <CalendarDays className="mr-1 inline size-3" />
                    {new Date().toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyData?.encounters && dailyData.encounters.length > 0 ? (
                    <ScrollArea className="max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Pasien</TableHead>
                            <TableHead>Dokter</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Diagnosa
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Waktu</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyData.encounters.map((enc) => (
                            <TableRow key={enc.id}>
                              <TableCell className="font-medium">
                                {enc.patient?.fullName ?? '-'}
                              </TableCell>
                              <TableCell>
                                {enc.doctor?.fullName ?? '-'}
                              </TableCell>
                              <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                                {enc.diagnoses && enc.diagnoses.length > 0
                                  ? enc.diagnoses
                                      .map((d) => `${d.icd10Code} - ${d.icd10Name}`)
                                      .join(', ')
                                  : '-'}
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
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Tidak ada kunjungan hari ini
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB: MINGGU INI ==================== */}
        <TabsContent value="week">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
              <Card>
                <CardContent className="py-4">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Weekly summary stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                      <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Kunjungan Minggu Ini
                      </p>
                      <p className="text-2xl font-bold">
                        {weeklySummary.totalVisits}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                    <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Kunjungan Selesai
                    </p>
                    <p className="text-2xl font-bold">
                      {weeklySummary.completedVisits}
                    </p>
                  </div>
                </CardContent>
              </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                      <CalendarDays className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Rata-rata per Hari
                      </p>
                      <p className="text-2xl font-bold">
                        {Math.round(weeklySummary.totalVisits / weeklySummary.totalDays)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Kunjungan Per Hari (Minggu Ini)
                  </CardTitle>
                  <CardDescription>
                    Distribusi kunjungan dari Senin sampai Minggu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyChart}>
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
                          formatter={(v: number) => [`${v} kunjungan`, 'Jumlah']}
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
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB: BULAN INI ==================== */}
        <TabsContent value="month">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Monthly summary stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                      <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Kunjungan Bulan Ini
                      </p>
                      <p className="text-2xl font-bold">
                        {monthlySummary.totalVisits}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                      <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Kunjungan Selesai
                      </p>
                      <p className="text-2xl font-bold">
                        {monthlySummary.completedVisits}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                      <CalendarDays className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Rata-rata per Hari
                      </p>
                      <p className="text-2xl font-bold">
                        {monthlySummary.avgPerDay}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================== TOP 10 PENYAKIT ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">10 Penyakit Terbanyak</CardTitle>
          <CardDescription>
            Berdasarkan data diagnosis (ICD-10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : topDiseases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada data penyakit
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Kode ICD-10</TableHead>
                    <TableHead>Nama Penyakit</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDiseases.map((d, i) => (
                    <TableRow key={d.code}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {d.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden w-24 sm:block">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{
                                  width: `${Math.round((d.count / maxDiseaseCount) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="font-semibold">{d.count}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ==================== REVENUE SUMMARY ==================== */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-5 text-emerald-600 dark:text-emerald-400" />
            Ringkasan Pendapatan
          </CardTitle>
          <CardDescription>
            {period === 'today'
              ? 'Data bulan berjalan'
              : period === 'week'
                ? 'Data minggu berjalan'
                : 'Data bulan berjalan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Banknote className="size-4 text-emerald-500" />
                  Total Pendapatan
                </div>
                <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(revenue?.totalRevenue ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-blue-500" />
                  Sudah Dibayar
                </div>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatRupiah(revenue?.totalRevenue ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {revenue?.paidCount ?? 0} invoice lunas
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="size-4 text-red-500" />
                  Belum Dibayar
                </div>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {formatRupiah(revenue?.totalUnpaid ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {revenue?.unpaidCount ?? 0} invoice tertunda
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
