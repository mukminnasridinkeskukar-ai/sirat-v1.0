'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  User,
  QrCode,
  FileText,
  Calendar,
  Phone,
  MapPin,
  Droplets,
  AlertTriangle,
  Heart,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { apiFetch } from '@/lib/api'
import { useUIStore } from '@/stores'
import type { Patient, Encounter, Prescription } from '@/types'

// ---- Zod Schema ----
const patientFormSchema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi').regex(/^\d{16}$/, 'NIK harus berupa 16 digit angka'),
  fullName: z.string().min(3, 'Nama minimal 3 karakter'),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().min(1, 'No HP wajib diisi'),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type PatientFormValues = z.infer<typeof patientFormSchema>

// ---- Helpers ----
const PAGE_SIZE = 15

function maskNik(nik: string): string {
  if (!nik || nik.length < 8) return nik || '-'
  return nik.slice(0, 4) + '****' + nik.slice(-4)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function genderLabel(g: string): string {
  if (g === 'L') return 'Laki-laki'
  if (g === 'P') return 'Perempuan'
  return g || '-'
}

// ---- Response types ----
interface PatientListResponse {
  data: Patient[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
interface PatientDetailResponse {
  data: Patient & { encounters?: (Encounter & { doctor?: { fullName: string; specialty: string } })[] }
}

// ---- Pagination component ----
function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (p: number) => void
}) {
  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Menampilkan {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} pasien
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="icon" className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline" size="icon" className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon" className="size-8"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline" size="icon" className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="outline" size="icon" className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ---- Patient Form Dialog (Create / Edit) ----
function PatientFormDialog({
  open,
  onOpenChange,
  editPatient,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editPatient: Patient | null
  onSuccess: () => void
}) {
  const isEdit = !!editPatient
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      nik: '',
      fullName: '',
      birthPlace: '',
      birthDate: '',
      gender: 'L',
      address: '',
      phone: '',
      bloodType: '',
      allergies: '',
      medicalHistory: '',
      emergencyContact: '',
      emergencyPhone: '',
    },
  })

  useEffect(() => {
    if (editPatient) {
      form.reset({
        nik: editPatient.nik || '',
        fullName: editPatient.fullName || '',
        birthPlace: editPatient.birthPlace || '',
        birthDate: editPatient.birthDate ? editPatient.birthDate.split('T')[0] : '',
        gender: editPatient.gender || 'L',
        address: editPatient.address || '',
        phone: editPatient.phone || '',
        bloodType: editPatient.bloodType || '',
        allergies: editPatient.allergies || '',
        medicalHistory: editPatient.medicalHistory || '',
        emergencyContact: editPatient.emergencyContact || '',
        emergencyPhone: editPatient.emergencyPhone || '',
      })
    } else {
      form.reset({
        nik: '',
        fullName: '',
        birthPlace: '',
        birthDate: '',
        gender: 'L',
        address: '',
        phone: '',
        bloodType: '',
        allergies: '',
        medicalHistory: '',
        emergencyContact: '',
        emergencyPhone: '',
      })
    }
  }, [editPatient, form, open])

  async function onSubmit(values: PatientFormValues) {
    setSubmitting(true)
    try {
      if (isEdit) {
        await apiFetch(`/patients/${editPatient!.id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
        })
        toast.success('Data pasien berhasil diperbarui')
      } else {
        await apiFetch('/patients', {
          method: 'POST',
          body: JSON.stringify(values),
        })
        toast.success('Pasien baru berhasil ditambahkan')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pasien' : 'Pasien Baru'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Perbarui data pasien' : 'Isi data pasien baru'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="16 digit NIK"
                        maxLength={16}
                        {...field}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 16)
                          field.onChange(v)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nama lengkap pasien" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input placeholder="Kota/Kabupaten" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih jenis kelamin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No HP <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Golongan Darah</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih golongan darah" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="AB">AB</SelectItem>
                        <SelectItem value="O">O</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alergi</FormLabel>
                    <FormControl>
                      <Input placeholder="Pisahkan dengan koma, contoh: Penisilin, Aspirin" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alamat lengkap" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="medicalHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Riwayat Penyakit</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Riwayat penyakit yang pernah diderita" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Kontak Darurat</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kontak Darurat</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No HP Darurat</FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
                {isEdit ? 'Simpan Perubahan' : 'Tambah Pasien'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Detail Dialog ----
interface PatientDetailData {
  patientId: string
  patient: PatientDetailResponse['data']
  encounters: Encounter[]
  prescriptions: Prescription[]
}

function DetailDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [data, setData] = useState<PatientDetailData | null>(null)
  const [activeTab, setActiveTab] = useState('identitas')
  const loading = open && !!patientId && (data === null || data.patientId !== patientId)

  useEffect(() => {
    if (!patientId || !open) return
    Promise.all([
      apiFetch<PatientDetailResponse>(`/patients/${patientId}`).catch(() => null),
      apiFetch<Encounter[]>(`/encounters?patientId=${patientId}`).catch(() => []),
      apiFetch<Prescription[]>(`/prescriptions?patientId=${patientId}`).catch(() => []),
    ]).then(([patientRes, encRes, rxRes]) => {
      if (patientRes) {
        setData({
          patientId,
          patient: patientRes.data,
          encounters: encRes || [],
          prescriptions: rxRes || [],
        })
      }
    })
  }, [patientId, open])

  if (!open) return null

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Memuat data...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!data) return null

  const p = data.patient
  const encounters = data.encounters
  const prescriptions = data.prescriptions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{p.fullName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                  <QrCode className="size-3" />
                  {p.rmNumber}
                </span>
                <span className="text-xs text-muted-foreground">NIK: {maskNik(p.nik)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="mx-6 w-fit">
              <TabsTrigger value="identitas">Identitas</TabsTrigger>
              <TabsTrigger value="kunjungan">Riwayat Kunjungan</TabsTrigger>
              <TabsTrigger value="resep">Riwayat Resep</TabsTrigger>
            </TabsList>

            <TabsContent value="identitas" className="flex-1 overflow-y-auto px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <InfoItem icon={User} label="Nama Lengkap" value={p.fullName} />
                <InfoItem icon={ShieldCheck} label="NIK" value={p.nik} />
                <InfoItem icon={QrCode} label="No RM" value={p.rmNumber} />
                <InfoItem icon={Calendar} label="Tempat, Tgl Lahir" value={`${p.birthPlace || '-'}, ${formatDate(p.birthDate)}`} />
                <InfoItem icon={User} label="Jenis Kelamin" value={genderLabel(p.gender)} />
                <InfoItem icon={Droplets} label="Golongan Darah" value={p.bloodType || '-'} />
                <InfoItem icon={Phone} label="No HP" value={p.phone || '-'} />
                <InfoItem icon={MapPin} label="Alamat" value={p.address || '-'} />
                <InfoItem icon={AlertTriangle} label="Alergi" value={p.allergies || 'Tidak ada'} />
                <InfoItem icon={Heart} label="Riwayat Penyakit" value={p.medicalHistory || 'Tidak ada'} />
                <InfoItem icon={Phone} label="Kontak Darurat" value={p.emergencyContact || '-'} />
                <InfoItem icon={Phone} label="No HP Darurat" value={p.emergencyPhone || '-'} />
              </div>
            </TabsContent>

            <TabsContent value="kunjungan" className="flex-1 overflow-y-auto px-6">
              {encounters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="size-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada riwayat kunjungan</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Dokter</TableHead>
                        <TableHead>Keluhan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {encounters.map((enc) => (
                        <TableRow key={enc.id}>
                          <TableCell className="text-xs">{formatDateTime(enc.encounterDate)}</TableCell>
                          <TableCell className="text-xs">{enc.doctor?.fullName || '-'}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{enc.chiefComplaint || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={enc.status === 'selesai' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {enc.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="resep" className="flex-1 overflow-y-auto px-6">
              {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="size-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada riwayat resep</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {prescriptions.map((rx) => (
                      <Card key={rx.id} className="py-3">
                        <CardHeader className="px-4 py-0">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-mono">{rx.prescriptionNo}</CardTitle>
                            <Badge variant={rx.status === 'selesai' ? 'default' : 'secondary'} className="text-[10px]">
                              {rx.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 py-0">
                          <p className="text-xs text-muted-foreground">{formatDate(rx.prescriptionDate)}</p>
                          {rx.notes && <p className="text-xs mt-1">{rx.notes}</p>}
                          {rx.prescriptionItems && rx.prescriptionItems.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {rx.prescriptionItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-2 text-xs">
                                  <span className="font-medium">{item.medicineName}</span>
                                  <span className="text-muted-foreground">
                                    {item.dose} × {item.frequency} × {item.duration}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border p-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

// ---- Main Page ----
export default function PasienPage() {
  const navigate = useUIStore((s) => s.navigate)
  const setSelectedPatient = useUIStore((s) => s.setSelectedPatient)

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Debounce search
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<PatientListResponse>(
        `/patients?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${PAGE_SIZE}`
      )
      setPatients(res.data)
      setTotalPages(res.pagination.totalPages)
      setTotal(res.pagination.total)
    } catch {
      toast.error('Gagal memuat data pasien')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  function handleDetail(id: string) {
    setDetailId(id)
  }

  function handleEdit(patient: Patient) {
    setEditPatient(patient)
  }

  function handleRiwayat(patient: Patient) {
    setSelectedPatient(patient.id)
    setDetailId(patient.id)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Data Pasien</h1>
          <p className="text-sm text-muted-foreground">Kelola data pasien klinik</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span className="sm:inline">Pasien Baru</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari NIK, nama, atau No RM..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <User className="size-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">Tidak ada data pasien</p>
              <p className="text-xs">Coba ubah kata kunci pencarian</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No RM</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead className="hidden md:table-cell">NIK</TableHead>
                      <TableHead className="hidden sm:table-cell">Jenis Kelamin</TableHead>
                      <TableHead className="hidden lg:table-cell">No HP</TableHead>
                      <TableHead className="hidden xl:table-cell">Alergi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-mono font-bold text-primary">
                            <QrCode className="size-3" />
                            {patient.rmNumber}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{patient.fullName}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {maskNik(patient.nik)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px]">
                            {genderLabel(patient.gender)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {patient.phone || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {patient.allergies ? (
                            <Badge variant="destructive" className="text-[10px]">
                              {patient.allergies.split(',').slice(0, 2).join(', ')}
                              {patient.allergies.split(',').length > 2 && '...'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="size-8"
                              onClick={() => handleDetail(patient.id)}
                              title="Detail"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="size-8"
                              onClick={() => handleEdit(patient)}
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="size-8"
                              onClick={() => handleRiwayat(patient)}
                              title="Riwayat"
                            >
                              <History className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="border-t p-4">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PatientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editPatient={null}
        onSuccess={fetchPatients}
      />
      <PatientFormDialog
        open={!!editPatient}
        onOpenChange={(v) => !v && setEditPatient(null)}
        editPatient={editPatient}
        onSuccess={fetchPatients}
      />
      <DetailDialog
        patientId={detailId}
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
      />
    </div>
  )
}
