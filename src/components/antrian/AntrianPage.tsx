'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Loader2,
  Megaphone,
  PlayCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Clock,
  Stethoscope,
  UserCheck,
  CalendarCheck,
  Volume2,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { apiFetch } from '@/lib/api'
import { useUIStore, useQueueStore } from '@/stores'
import type { Queue, Patient } from '@/types'

// ---- Types ----
interface QueueWithPatient extends Queue {
  patient?: { id: string; rmNumber: string; fullName: string; gender?: string }
}

interface QueueListResponse {
  data: QueueWithPatient[]
}

// ---- Status config ----
const statusConfig: Record<Queue['status'], { label: string; className: string }> = {
  menunggu: {
    label: 'Menunggu',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  dipanggil: {
    label: 'Dipanggil',
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  },
  sedang_diperiksa: {
    label: 'Sedang Diperiksa',
    className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  },
  selesai: {
    label: 'Selesai',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  },
  dibatalkan: {
    label: 'Dibatalkan',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  },
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ---- Add Queue Dialog ----
function AddQueueDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [queueType, setQueueType] = useState<string>('walk_in')
  const [notes, setNotes] = useState('')
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!open) {
      setPatientSearch('')
      setPatientResults([])
      setSelectedPatientId('')
      setSelectedPatientName('')
      setQueueType('walk_in')
      setNotes('')
    }
  }, [open])

  const handlePatientSearch = useCallback((value: string) => {
    setPatientSearch(value)
    setSelectedPatientId('')
    setSelectedPatientName('')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.length < 2) {
      setPatientResults([])
      return
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiFetch<{ data: Patient[]; pagination: { total: number } }>(
          `/patients?search=${encodeURIComponent(value)}&page=1&limit=10`
        )
        setPatientResults(res.data)
      } catch {
        setPatientResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  async function handleSubmit() {
    if (!selectedPatientId) {
      toast.error('Pilih pasien terlebih dahulu')
      return
    }
    setSubmitting(true)
    try {
      await apiFetch('/queues', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          queueType,
          notes,
        }),
      })
      toast.success('Antrian berhasil ditambahkan')
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah antrian')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Antrian</DialogTitle>
          <DialogDescription>Pilih pasien dan jenis kunjungan</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Cari Pasien</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ketik nama, NIK, atau No RM..."
                className="pl-9"
                value={patientSearch}
                onChange={(e) => handlePatientSearch(e.target.value)}
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>

            {/* Selected patient indicator */}
            {selectedPatientId && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
                <UserCheck className="size-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary truncate">{selectedPatientName}</span>
                <Button
                  variant="ghost" size="icon" className="size-6 ml-auto shrink-0"
                  onClick={() => {
                    setSelectedPatientId('')
                    setSelectedPatientName('')
                  }}
                >
                  <XCircle className="size-3" />
                </Button>
              </div>
            )}

            {/* Search results dropdown */}
            {patientResults.length > 0 && !selectedPatientId && (
              <ScrollArea className="max-h-40 rounded-md border">
                <div className="p-1">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors"
                      onClick={() => {
                        setSelectedPatientId(p.id)
                        setSelectedPatientName(`${p.fullName} (${p.rmNumber})`)
                        setPatientResults([])
                        setPatientSearch('')
                      }}
                    >
                      <span className="font-medium truncate">{p.fullName}</span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">{p.rmNumber}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Jenis Kunjungan</Label>
            <Select value={queueType} onValueChange={setQueueType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in (Datang Langsung)</SelectItem>
                <SelectItem value="appointment">Appointment (Perjanjian)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Catatan tambahan (opsional)"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedPatientId}>
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Tambah Antrian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Active Call Card ----
function ActiveCallCard({ queue }: { queue: QueueWithPatient | null }) {
  if (!queue) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-5 text-primary" />
            Panggilan Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Megaphone className="size-10 mb-2 opacity-20" />
            <p className="text-sm">Belum ada pasien yang dipanggil</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/50 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="size-5 text-primary" />
          Panggilan Aktif
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* Big queue number */}
          <div className="flex size-24 items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary/30">
            <span className="text-4xl font-bold text-primary font-mono">
              {String(queue.queueNumber).padStart(3, '0')}
            </span>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{queue.patient?.fullName || '-'}</p>
            <p className="text-xs font-mono text-muted-foreground">{queue.patient?.rmNumber || ''}</p>
          </div>
          <Badge className={statusConfig[queue.status].className}>
            {statusConfig[queue.status].label}
          </Badge>
          {queue.queueType === 'appointment' && (
            <Badge variant="outline" className="text-[10px]">
              <CalendarCheck className="size-3 mr-1" />
              Appointment
            </Badge>
          )}
          {queue.notes && (
            <p className="text-xs text-muted-foreground text-center mt-1">{queue.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Main Page ----
export default function AntrianPage() {
  const navigate = useUIStore((s) => s.navigate)
  const setSelectedPatient = useUIStore((s) => s.setSelectedPatient)
  const setSelectedEncounter = useUIStore((s) => s.setSelectedEncounter)
  const queues = useQueueStore((s) => s.queues)
  const setQueues = useQueueStore((s) => s.setQueues)

  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  // Fetch queues
  const fetchQueues = useCallback(async () => {
    try {
      const res = await apiFetch<QueueListResponse>('/queues')
      setQueues(res.data)
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false)
    }
  }, [setQueues])

  useEffect(() => {
    fetchQueues()
  }, [fetchQueues])

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchQueues, 5000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchQueues])

  // Count badges
  const countMenunggu = queues.filter((q) => q.status === 'menunggu').length
  const countDiperiksa = queues.filter((q) => q.status === 'sedang_diperiksa').length
  const countSelesai = queues.filter((q) => q.status === 'selesai').length
  const activeCall = queues.find((q) => q.status === 'dipanggil') || null
  const examinedQueue = queues.find((q) => q.status === 'sedang_diperiksa') || null

  // Queue actions
  async function handleAction(queueId: string, newStatus: Queue['status'], extraData?: Record<string, unknown>) {
    setActionLoading(queueId)
    try {
      const payload: Record<string, unknown> = { id: queueId, status: newStatus }
      if (extraData) Object.assign(payload, extraData)

      // If starting examination, create encounter
      if (newStatus === 'sedang_diperiksa') {
        const queue = queues.find((q) => q.id === queueId)
        if (queue) {
          try {
            const enc = await apiFetch('/encounters', {
              method: 'POST',
              body: JSON.stringify({
                patientId: queue.patientId,
                encounterType: 'rawat_jalan',
                chiefComplaint: queue.notes || '',
              }),
            })
            payload.encounterId = enc.id
            setSelectedEncounter(enc.id)
          } catch {
            toast.error('Gagal membuat kunjungan')
            setActionLoading(null)
            return
          }
        }
      }

      await apiFetch('/queues', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      const statusLabels: Record<string, string> = {
        dipanggil: 'Pasien berhasil dipanggil',
        sedang_diperiksa: 'Pemeriksaan dimulai',
        selesai: 'Pemeriksaan selesai',
        dibatalkan: 'Antrian dibatalkan',
      }
      toast.success(statusLabels[newStatus] || 'Status diperbarui')

      // Navigate to pelayanan on sedang_diperiksa
      if (newStatus === 'sedang_diperiksa') {
        const queue = queues.find((q) => q.id === queueId)
        if (queue) {
          setSelectedPatient(queue.patientId)
        }
        navigate('pelayanan')
      } else {
        fetchQueues()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui antrian')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Antrian Pasien</h1>
          <p className="text-sm text-muted-foreground">Kelola antrian kunjungan hari ini</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground whitespace-nowrap">
              Auto-refresh 5d
            </Label>
          </div>
          <Button variant="outline" size="icon" onClick={fetchQueues} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span className="sm:inline">Tambah Antrian</span>
          </Button>
        </div>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
          <Clock className="size-3.5" />
          Menunggu: {countMenunggu}
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs border-blue-300 text-blue-700 dark:text-blue-400 dark:border-blue-700">
          <Stethoscope className="size-3.5" />
          Sedang Diperiksa: {countDiperiksa}
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-700">
          <CalendarCheck className="size-3.5" />
          Selesai: {countSelesai}
        </Badge>
      </div>

      {/* Main content: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue table (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Daftar Antrian
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : queues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="size-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada antrian hari ini</p>
                  <p className="text-xs">Klik "Tambah Antrian" untuk memulai</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[480px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">No</TableHead>
                        <TableHead>Pasien</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Jenis</TableHead>
                        <TableHead className="hidden md:table-cell">Waktu</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queues.map((q) => {
                        const isActionLoading = actionLoading === q.id
                        return (
                          <TableRow key={q.id}>
                            <TableCell>
                              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold font-mono text-primary">
                                {String(q.queueNumber).padStart(3, '0')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{q.patient?.fullName || '-'}</span>
                                <span className="text-[11px] text-muted-foreground font-mono">{q.patient?.rmNumber || ''}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge className={`text-[10px] ${statusConfig[q.status].className}`}>
                                {statusConfig[q.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-[10px]">
                                {q.queueType === 'walk_in' ? 'Walk-in' : 'Appointment'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {formatTime(q.queueDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {q.status === 'menunggu' && (
                                  <Button
                                    variant="outline" size="sm" className="h-7 gap-1 text-xs"
                                    disabled={isActionLoading}
                                    onClick={() => handleAction(q.id, 'dipanggil')}
                                  >
                                    {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : <Megaphone className="size-3" />}
                                    Panggil
                                  </Button>
                                )}
                                {q.status === 'dipanggil' && (
                                  <Button
                                    variant="default" size="sm" className="h-7 gap-1 text-xs"
                                    disabled={isActionLoading}
                                    onClick={() => handleAction(q.id, 'sedang_diperiksa')}
                                  >
                                    {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : <PlayCircle className="size-3" />}
                                    Mulai Periksa
                                  </Button>
                                )}
                                {(q.status === 'dipanggil' || q.status === 'menunggu' || q.status === 'sedang_diperiksa') && (
                                  <Button
                                    variant="outline" size="sm" className="h-7 gap-1 text-xs"
                                    disabled={isActionLoading}
                                    onClick={() => handleAction(q.id, 'selesai')}
                                  >
                                    {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                                    <span className="hidden sm:inline">Selesai</span>
                                  </Button>
                                )}
                                {(q.status === 'menunggu' || q.status === 'dipanggil') && (
                                  <Button
                                    variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                    disabled={isActionLoading}
                                    onClick={() => handleAction(q.id, 'dibatalkan')}
                                  >
                                    {isActionLoading ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
                                    <span className="hidden sm:inline">Batal</span>
                                  </Button>
                                )}
                                {q.status === 'selesai' && (
                                  <Badge className={`text-[10px] ${statusConfig.selesai.className}`}>
                                    <CheckCircle2 className="size-3 mr-1" />
                                    Selesai
                                  </Badge>
                                )}
                                {q.status === 'dibatalkan' && (
                                  <Badge className={`text-[10px] ${statusConfig.dibatalkan.className}`}>
                                    <XCircle className="size-3 mr-1" />
                                    Dibatalkan
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Active call + currently examined (1/3 width) */}
        <div className="flex flex-col gap-4">
          <ActiveCallCard queue={activeCall} />

          {/* Currently being examined card */}
          {examinedQueue && (
            <Card className="border-blue-300 dark:border-blue-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="size-4 text-blue-600 dark:text-blue-400" />
                  Sedang Diperiksa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex size-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">
                      {String(examinedQueue.queueNumber).padStart(3, '0')}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{examinedQueue.patient?.fullName || '-'}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{examinedQueue.patient?.rmNumber || ''}</p>
                  </div>
                  <Button
                    variant="outline" size="sm" className="gap-1 text-xs"
                    onClick={() => {
                      setSelectedPatient(examinedQueue.patientId)
                      navigate('pelayanan')
                    }}
                  >
                    <Stethoscope className="size-3" />
                    Buka Pelayanan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Queue Dialog */}
      <AddQueueDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchQueues}
      />
    </div>
  )
}
