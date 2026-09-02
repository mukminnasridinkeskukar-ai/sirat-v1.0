'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { Medicine } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Pill, Plus, Search, Edit, Package } from 'lucide-react'

export default function MasterObatPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', genericName: '', category: '', unit: 'tablet', stock: 0, price: 0, dosageForm: '', contraindications: '', interactions: '' })
  const [saving, setSaving] = useState(false)

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiFetch<{ data: Medicine[]; total: number }>(`/medicines?search=${encodeURIComponent(search)}`)
      setMedicines(res?.data || res || [])
    } catch { toast.error('Gagal memuat data obat') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchMedicines() }, [fetchMedicines])

  const saveMedicine = async () => {
    if (!form.name.trim()) { toast.error('Nama obat wajib diisi'); return }
    setSaving(true)
    try {
      await apiFetch('/medicines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      toast.success('Obat berhasil ditambahkan')
      setShowForm(false)
      setForm({ name: '', genericName: '', category: '', unit: 'tablet', stock: 0, price: 0, dosageForm: '', contraindications: '', interactions: '' })
      fetchMedicines()
    } catch { toast.error('Gagal menyimpan obat') }
    finally { setSaving(false) }
  }

  const updateStock = async (med: Medicine) => {
    const newStock = prompt(`Stok saat ini: ${med.stock}\nMasukkan stok baru:`, String(med.stock))
    if (newStock === null) return
    try {
      await apiFetch('/medicines', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: med.id, stock: Number(newStock) })
      })
      toast.success('Stok diperbarui')
      fetchMedicines()
    } catch { toast.error('Gagal memperbarui stok') }
  }

  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Pill className="size-5 text-primary" /> Master Obat
          </h1>
          <p className="text-sm text-muted-foreground">Kelola data obat dan stok</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Tambah Obat
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Cari nama obat..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Tambah Obat Baru</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nama Obat *</Label><Input placeholder="Paracetamol" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Nama Generik</Label><Input placeholder="Acetaminophen" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Kategori</Label><Input placeholder="Analgesik" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="kapsul">Kapsul</SelectItem>
                    <SelectItem value="sirup">Sirup</SelectItem>
                    <SelectItem value="injeksi">Injeksi</SelectItem>
                    <SelectItem value="salep">Salep</SelectItem>
                    <SelectItem value="tetes">Tetes</SelectItem>
                    <SelectItem value="kaplet">Kaplet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Stok</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Harga (Rp)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Sediaan</Label><Input placeholder="500mg" value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Kontraindikasi</Label><Input placeholder="Hipersensitivitas terhadap obat" value={form.contraindications} onChange={(e) => setForm({ ...form, contraindications: e.target.value })} /></div>
              <div className="space-y-1 col-span-2 lg:col-span-3"><Label className="text-xs">Interaksi Obat</Label><Input placeholder="Warfarin, alkohol" value={form.interactions} onChange={(e) => setForm({ ...form, interactions: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={saveMedicine} disabled={saving} className="gap-1.5">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead className="hidden md:table-cell">Generik</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Package className="size-8 mx-auto mb-2 opacity-30" />
                        Tidak ada data obat
                      </TableCell>
                    </TableRow>
                  ) : (
                    medicines.map((med, idx) => (
                      <TableRow key={med.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{med.genericName || '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{med.category || '-'}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Badge variant={med.stock > 10 ? 'default' : med.stock > 0 ? 'secondary' : 'destructive'} className="text-xs">
                            {med.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatRp(med.price)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => updateStock(med)}>
                            <Edit className="size-3.5" /> Stok
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}