'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores'
import type { Clinic } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Settings, Building2, Shield, Users, Database, Save, RefreshCw, Info } from 'lucide-react'

export default function PengaturanPage() {
  const user = useAuthStore((s) => s.user)
  const [clinic, setClinic] = useState<Partial<Clinic>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    apiFetch<Clinic>('/clinic').then(setClinic).catch(() => {})
  }, [])

  const saveClinic = async () => {
    setSaving(true)
    try {
      await apiFetch('/clinic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clinic) })
      toast.success('Data praktik berhasil disimpan')
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const reseed = async () => {
    setSeeding(true)
    try {
      await apiFetch('/seed', { method: 'POST' })
      toast.success('Demo data berhasil dimuat ulang')
    } catch { toast.error('Gagal memuat demo data') }
    finally { setSeeding(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="size-5 text-primary" /> Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground">Kelola data praktik dan preferensi sistem</p>
      </div>

      {/* Clinic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="size-4" /> Data Praktik</CardTitle>
          <CardDescription>Informasi tempat praktik mandiri dokter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Nama Praktik</Label><Input placeholder="Klinik Sehat Sentosa" value={clinic.name || ''} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">No. Telepon</Label><Input placeholder="021-1234567" value={clinic.phone || ''} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} /></div>
            <div className="space-y-1 col-span-full"><Label className="text-xs">Alamat</Label><Textarea placeholder="Jl. Sudirman No. 1, Jakarta" value={clinic.address || ''} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label className="text-xs">SIP Dokter PJ</Label><Input placeholder="SIP/123/2023" value={clinic.sipDoctor || ''} onChange={(e) => setClinic({ ...clinic, sipDoctor: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">URL Logo</Label><Input placeholder="https://..." value={clinic.logoUrl || ''} onChange={(e) => setClinic({ ...clinic, logoUrl: e.target.value })} /></div>
          </div>
          <Button onClick={saveClinic} disabled={saving} className="gap-1.5"><Save className="size-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</Button>
        </CardContent>
      </Card>

      {/* Compliance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="size-4" /> Kepatuhan Regulasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <Info className="size-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">Permenkes No. 24 Tahun 2022</p>
              <p className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">Sistem ini memenuhi ketentuan penyelenggaraan Rekam Medis Elektronik sesuai regulasi Kementerian Kesehatan RI.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border">
              <p className="font-medium">Identitas Pasien (Pasal 14)</p>
              <p className="text-xs text-muted-foreground mt-1">No RM, NIK, Nama Lengkap, TTL, Jenis Kelamin, Alamat, No HP, Alergi, Riwayat Penyakit</p>
              <Badge variant="default" className="mt-2 text-xs">Terpenuhi</Badge>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="font-medium">Keamanan Data (Pasal 29)</p>
              <p className="text-xs text-muted-foreground mt-1">Audit trail immutable, akses berbasis peran, retensi 10 tahun</p>
              <Badge variant="default" className="mt-2 text-xs">Terpenuhi</Badge>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="font-medium">Interoperabilitas SATUSEHAT</p>
              <p className="text-xs text-muted-foreground mt-1">Standar FHIR R4: Patient, Encounter, Condition, Observation, MedicationRequest</p>
              <Badge variant="secondary" className="mt-2 text-xs">Bridge Tersedia</Badge>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="font-medium">UU PDP No. 27 Tahun 2022</p>
              <p className="text-xs text-muted-foreground mt-1">Perlindungan data pribadi pasien, enkripsi, persetujuan</p>
              <Badge variant="default" className="mt-2 text-xs">Terpenuhi</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Peran & Hak Akses (RBAC)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { role: 'super_admin', label: 'Super Admin', desc: 'Pemilik praktik, akses penuh semua modul', color: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
              { role: 'dokter_pj', label: 'Dokter PJ', desc: 'Tanda tangan elektronik, akses klinis penuh', color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
              { role: 'dokter', label: 'Dokter', desc: 'Lihat & isi pasien yang diperiksa sendiri', color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
              { role: 'perawat_bidan', label: 'Perawat/Bidan', desc: 'Input vital sign, asesmen awal, CPPT', color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
              { role: 'resepsionis_admin', label: 'Resepsionis', desc: 'Registrasi, antrian, pembayaran', color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
              { role: 'apoteker', label: 'Apoteker', desc: 'Kelola resep & stok obat', color: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
            ].map((r) => (
              <div key={r.role} className={`p-3 rounded-lg ${r.color}`}>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs mt-1 opacity-80">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="size-4" /> Manajemen Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={reseed} disabled={seeding} className="gap-1.5">
              <RefreshCw className={`size-4 ${seeding ? 'animate-spin' : ''}`} /> {seeding ? 'Memuat...' : 'Muat Ulang Demo Data'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Demo data termasuk: 6 user, 15 pasien, 20 obat, 30 kode ICD-10, 5 kunjungan dengan SOAP.</p>
        </CardContent>
      </Card>
    </div>
  )
}