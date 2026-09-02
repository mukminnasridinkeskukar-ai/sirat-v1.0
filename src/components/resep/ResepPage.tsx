'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores'
import type { Prescription, PrescriptionItem, Medicine, Encounter, Patient } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Plus, Trash2, Search, Pill, QrCode, Printer, CheckCircle2, AlertTriangle, X } from 'lucide-react'

interface ResepItem {
  medicineName: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  notes: string
}

export default function ResepPage() {
  const user = useAuthStore((s) => s.user)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [items, setItems] = useState<ResepItem[]>([{ medicineName: '', dose: '', frequency: '', duration: '', quantity: 1, notes: '' }])
  const [isCompound, setIsCompound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [medDialogOpen, setMedDialogOpen] = useState(false)
  const [activeItemIdx, setActiveItemIdx] = useState(0)
  const [selectedEncounterId, setSelectedEncounterId] = useState('')

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch<Prescription[]>('/prescriptions')
      setPrescriptions(data || [])
    } catch { toast.error('Gagal memuat data resep') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

  const searchMedicine = useCallback(async (q: string) => {
    if (q.length < 2) { setMedicines([]); return }
    try {
      const data = await apiFetch<Medicine[]>(`/medicines?search=${encodeURIComponent(q)}`)
      setMedicines(data || [])
    } catch { setMedicines([]) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchMedicine(medSearch), 300)
    return () => clearTimeout(t)
  }, [medSearch, searchMedicine])

  const updateItem = (idx: number, field: keyof ResepItem, value: string | number) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { medicineName: '', dose: '', frequency: '', duration: '', quantity: 1, notes: '' }])
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  const selectMedicine = (med: Medicine) => {
    const newItems = [...items]
    newItems[activeItemIdx] = { ...newItems[activeItemIdx], medicineName: med.name }
    setItems(newItems)
    setMedDialogOpen(false)
    setMedSearch('')
  }

  const checkInteraction = async (medNames: string[]) => {
    if (medNames.length < 2) return
    try {
      const data = await apiFetch<Medicine[]>(`/medicines?search=`)
      const allMeds = data || []
      for (const name of medNames) {
        const med = allMeds.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
        if (med?.interactions) {
          const otherMeds = medNames.filter(n => n !== name)
          for (const other of otherMeds) {
            if (med.interactions.toLowerCase().includes(other.toLowerCase())) {
              toast.warning(`Perhatian: Kemungkinan interaksi obat antara ${name} dan ${other}`)
            }
          }
        }
      }
    } catch { /* silent */ }
  }

  const savePrescription = async () => {
    const validItems = items.filter(i => i.medicineName.trim())
    if (validItems.length === 0) { toast.error('Tambahkan minimal 1 obat'); return }
    if (!selectedEncounterId) { toast.error('Pilih kunjungan terlebih dahulu'); return }

    const medNames = validItems.map(i => i.medicineName)
    await checkInteraction(medNames)

    setSaving(true)
    try {
      await apiFetch('/prescriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: selectedEncounterId,
          isCompound,
          items: validItems
        })
      })
      toast.success('Resep berhasil disimpan')
      setShowForm(false)
      setItems([{ medicineName: '', dose: '', frequency: '', duration: '', quantity: 1, notes: '' }])
      setSelectedEncounterId('')
      fetchPrescriptions()
    } catch { toast.error('Gagal menyimpan resep') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="size-5 text-primary" /> E-Resep
          </h1>
          <p className="text-sm text-muted-foreground">Kelola resep elektronik pasien</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Buat Resep Baru
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Resep Baru</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Racikan:</Label>
                <Select value={isCompound ? 'ya' : 'tidak'} onValueChange={(v) => setIsCompound(v === 'ya')}>
                  <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tidak">Non-Racikan</SelectItem>
                    <SelectItem value="ya">Racikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">ID Kunjungan (Encounter ID)</Label>
                <Input
                  placeholder="Masukkan encounter ID"
                  value={selectedEncounterId}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Daftar Obat</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="size-3.5" /> Tambah Obat
                </Button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-card">
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Nama Obat</Label>
                    <div className="relative">
                      <Input
                        placeholder="Ketik/cari obat..."
                        value={item.medicineName}
                        onChange={(e) => { updateItem(idx, 'medicineName', e.target.value) }}
                        onFocus={() => { setActiveItemIdx(idx); setMedDialogOpen(true) }}
                        className="pr-8 text-sm"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setActiveItemIdx(idx); setMedDialogOpen(true) }}>
                        <Search className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Dosis</Label>
                    <Input placeholder="500mg" value={item.dose} onChange={(e) => updateItem(idx, 'dose', e.target.value)} className="text-sm" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Frekuensi</Label>
                    <Select value={item.frequency} onValueChange={(v) => updateItem(idx, 'frequency', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x1">1x1</SelectItem>
                        <SelectItem value="2x1">2x1</SelectItem>
                        <SelectItem value="3x1">3x1</SelectItem>
                        <SelectItem value="1x2">1x2</SelectItem>
                        <SelectItem value="2x2">2x2</SelectItem>
                        <SelectItem value="PRN">PRN</SelectItem>
                        <SelectItem value="SOS">SOS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Durasi</Label>
                    <Input placeholder="3 hari" value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} className="text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={savePrescription} disabled={saving} className="gap-1.5">
                {saving ? 'Menyimpan...' : <><CheckCircle2 className="size-4" /> Simpan Resep</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : prescriptions.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Pill className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Resep</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">Buat resep elektronik baru untuk pasien.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedRx(rx)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{rx.prescriptionNo || '-'}</Badge>
                    {rx.isCompound && <Badge variant="secondary" className="text-xs">Racikan</Badge>}
                    <Badge variant={rx.status === 'aktif' ? 'default' : 'destructive'} className="text-xs">{rx.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); toast.info('QR Code resep ditampilkan') }}>
                      <QrCode className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); toast.info('Cetak resep...') }}>
                      <Printer className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{rx.prescriptionItems?.length || 0} obat &middot; {new Date(rx.prescriptionDate).toLocaleDateString('id-ID')}</p>
                {selectedRx?.id === rx.id && rx.prescriptionItems && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1">
                    {rx.prescriptionItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Pill className="size-3.5 text-primary" />
                        <span className="font-medium">{item.medicineName}</span>
                        <span className="text-muted-foreground">{item.dose} &middot; {item.frequency} &middot; {item.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={medDialogOpen} onOpenChange={setMedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Cari Obat</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Ketik nama obat..." className="pl-9" value={medSearch} onChange={(e) => setMedSearch(e.target.value)} />
          </div>
          <ScrollArea className="max-h-64">
            <div className="space-y-1">
              {medicines.map((med) => (
                <button key={med.id} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent text-sm" onClick={() => selectMedicine(med)}>
                  <Pill className="size-3.5 text-primary" />
                  <span className="font-medium">{med.name}</span>
                  <span className="text-xs text-muted-foreground">{med.genericName} &middot; Stok: {med.stock}</span>
                </button>
              ))}
              {medSearch.length >= 2 && medicines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Obat tidak ditemukan</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}