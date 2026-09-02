'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  ShieldAlert,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Lock,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'

// ---------- types ----------

interface AuditLogRow {
  id: string
  userId: string
  userName: string
  action: string
  tableName: string
  recordId: string
  oldData: string
  newData: string
  ipAddress: string
  createdAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---------- action icons ----------

function actionIcon(action: string) {
 switch (action) {
    case 'CREATE':
      return <Plus className="size-3.5 text-emerald-500" />
    case 'UPDATE':
      return <Pencil className="size-3.5 text-blue-500" />
    case 'DELETE':
      return <Trash2 className="size-3.5 text-red-500" />
    default:
      return <RotateCcw className="size-3.5 text-muted-foreground" />
  }
}

function actionBadge(action: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    CREATE: { label: 'Buat', variant: 'default' },
    UPDATE: { label: 'Ubah', variant: 'secondary' },
    DELETE: { label: 'Hapus', variant: 'destructive' },
    LOGIN: { label: 'Login', variant: 'outline' },
  }
  const s = map[action] || { label: action, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ---------- table name options ----------

const TABLE_OPTIONS = [
  { value: 'all', label: 'Semua Tabel' },
  { value: 'Patient', label: 'Pasien' },
  { value: 'Encounter', label: 'Kunjungan' },
  { value: 'SoapNote', label: 'Catatan SOAP' },
  { value: 'Diagnosis', label: 'Diagnosis' },
  { value: 'Prescription', label: 'Resep' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Queue', label: 'Antrian' },
  { value: 'Medicine', label: 'Obat' },
  { value: 'Clinic', label: 'Klinik' },
  { value: 'UserProfile', label: 'Pengguna' },
]

const PAGE_SIZE = 10

// ---------- main component ----------

export default function AuditPage() {
  // filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userName, setUserName] = useState('')
  const [tableName, setTableName] = useState('all')

  // data
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLog, setDetailLog] = useState<AuditLogRow | null>(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (userName.trim()) params.set('userId', userName.trim())
      if (tableName !== 'all') params.set('tableName', tableName)

      const res = await apiFetch<{
        data: AuditLogRow[]
        pagination: PaginationInfo
      }>(`/audit-logs?${params.toString()}`)

      setLogs(res.data ?? [])
      setPagination(res.pagination ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data audit')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, userName, tableName])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setUserName('')
    setTableName('all')
  }

  const openDetail = (log: AuditLogRow) => {
    setDetailLog(log)
    setDetailOpen(true)
  }

  const tryParseJson = (str: string): string => {
    if (!str) return '(kosong)'
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          Audit Trail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat semua aktivitas yang tercatat di sistem
        </p>
      </div>

      {/* Immutable notice */}
      <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
        <Lock className="size-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300">
          Log Audit Bersifat Immutable
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          Log audit tidak dapat dihapus atau diubah sesuai Permenkes 24/2022
          Pasal 29 tentang penyimpanan dan keamanan rekam medis elektronik.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" />
            Filter
          </CardTitle>
          <CardDescription>
            Gunakan filter untuk mencari log audit tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="audit-start-date" className="text-xs">
                Tanggal Mulai
              </Label>
              <Input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-end-date" className="text-xs">
                Tanggal Akhir
              </Label>
              <Input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-user" className="text-xs">
                Nama Pengguna
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-user"
                  placeholder="Cari nama..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-table" className="text-xs">
                Nama Tabel
              </Label>
              <Select value={tableName} onValueChange={setTableName}>
                <SelectTrigger id="audit-table">
                  <SelectValue placeholder="Pilih tabel" />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-4" />
              <span className="ml-2">Reset Filter</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <ShieldAlert className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Tidak ada log audit ditemukan
              </p>
            </div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Waktu</TableHead>
                    <TableHead className="min-w-[120px]">User</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Tabel</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Record ID
                    </TableHead>
                    <TableHead className="w-20 text-center">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.userName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcon(log.action)}
                          {actionBadge(log.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.tableName}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-[120px] truncate font-mono text-xs text-muted-foreground md:table-cell">
                        {log.recordId}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(log)}
                          aria-label="Lihat detail"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(1)}
              aria-label="Halaman pertama"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[80px] text-center text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.totalPages)}
              aria-label="Halaman terakhir"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Log Audit</DialogTitle>
            <DialogDescription>
              {detailLog
                ? `${detailLog.action} pada ${detailLog.tableName} oleh ${detailLog.userName}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Waktu</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(detailLog.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm font-medium">
                    {detailLog.ipAddress || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm font-medium">
                    {detailLog.userId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Record ID</p>
                  <p className="font-mono text-sm font-medium">
                    {detailLog.recordId}
                  </p>
                </div>
              </div>

                {/* Data Lama */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  Data Lama (sebelum perubahan)
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {tryParseJson(detailLog.oldData)}
                </pre>
              </div>

                {/* Data Baru */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Data Baru (setelah perubahan)
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {tryParseJson(detailLog.newData)}
                </pre>
              </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
