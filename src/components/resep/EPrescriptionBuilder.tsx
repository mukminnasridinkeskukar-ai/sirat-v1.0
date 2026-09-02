'use client'

import { useState, useCallback } from 'react'
import { useMutation, useLazyQuery } from '@apollo/client/react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Save, Search, Loader2, Pill, AlertTriangle,
  FileText, Package, Droplets, FlaskConical, Beaker,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores'
import { GET_MEDICINES, INSERT_PRESCRIPTION, INSERT_PRESCRIPTION_ITEM } from '@/lib/graphql/queries'
import type { Medicine, PrescriptionItem } from '@/types'
import { cn } from '@/lib/utils'

interface RxItem {
  medicineId: string
  medicineName: string
  genericName: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  notes: string
  isCompound: boolean
  interactions: string
}

interface EPrescriptionBuilderProps {
  encounterId: string
  patientName?: string
  patientRmNumber?: string
  patientAllergies?: string
  existingItems?: any[]
  isCompound?: boolean
  onSaved?: (prescriptionId: string) => void
}

export default function EPrescriptionBuilder({
  encounterId,
  patientName = '',
  patientRmNumber = '',
  patientAllergies = '',
  existingItems = [],
  isCompound: initialCompound = false,
  onSaved,
}: EPrescriptionBuilderProps) {
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<RxItem[]>(
    (existingItems || []).map(mapExistingItem)
  )
  const [compound, setCompound] = useState(initialCompound)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [medicineSearch, setMedicineSearch] = useState('')
  const [medDropdownOpen, setMedDropdownOpen] = useState(false)

  const [fetchMedicines, { data: medData, loading: medLoading }] = useLazyQuery(GET_MEDICINES, {
    variables: { clinicId: user?.clinicId || '', search: '' },
  })

  // Search medicines with debounce
  const searchMeds = useCallback(
    (q: string) => {
      if (q.length < 1) { setMedDropdownOpen(false); return }
      fetchMedicines({ variables: { clinicId: user?.clinicId || '', search: `%${q}%` } })
      setMedDropdownOpen(true)
    },
    [user?.clinicId, fetchMedicines]
  )

  const medicines = (medData?.medicines || []).map(mapMedicine)

  // Add medicine to prescription
  function addMedicine(med: Medicine) {
    // Check interactions with existing items
    const interactions: string[] = []
    items.forEach((item) => {
      if (med.interactions && med.interactions.toLowerCase().includes(item.genericName.toLowerCase())) {
        interactions.push(`${med.genericName} <-> ${item.genericName}`)
      }
      if (item.interactions && item.interactions.toLowerCase().includes(med.genericName.toLowerCase())) {
        interactions.push(`${item.genericName} <-> ${med.genericName}`)
      }
    })

    // Check allergy
    let allergyWarning = ''
    if (patientAllergies && med.name.toLowerCase().includes(patientAllergies.toLowerCase())) {
      allergyWarning = `Peringatan: Pasien alergi ${patientAllergies}`
    }

    setItems([
      ...items,
      {
        medicineId: med.id,
        medicineName: med.name,
        genericName: med.genericName,
        dose: '',
        frequency: '3x1',
        duration: '7 hari',
        quantity: 21,
        notes: interactions.length > 0 ? `Interaksi: ${interactions.join(', ')}` : '',
        isCompound: compound,
        interactions: med.interactions || '',
      },
    ])
    setMedDropdownOpen(false)
    setMedicineSearch('')

    if (allergyWarning) {
      toast.warning(allergyWarning, { duration: 5000 })
    }
    if (interactions.length > 0) {
      toast.error(`Interaksi obat terdeteksi: ${interactions.join(', ')}`, { duration: 6000 })
    }
  }

  // Update item field
  function updateItem(idx: number, field: keyof RxItem, value: string | number | boolean) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  // Remove item
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  // Save prescription
  const [insertPrescription] = useMutation(INSERT_PRESCRIPTION)
  const [insertPrescriptionItem] = useMutation(INSERT_PRESCRIPTION_ITEM)

  const save = async () => {
    if (items.length === 0) {
      toast.error('Tambahkan minimal 1 obat')
      return
    }
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const rxNo = `R/${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

      const { data: rxData } = await insertPrescription({
        variables: {
          object: {
            encounter_id: encounterId,
            clinic_id: user?.clinicId,
            prescription_no: rxNo,
            prescription_date: today,
            is_compound: compound,
            notes,
            status: 'menunggu',
            created_by: user?.id,
          },
        },
      })

      const rxId = rxData?.insert_prescriptions_one?.id
      if (!rxId) throw new Error('Failed to create prescription')

      // Insert items
      for (const item of items) {
        await insertPrescriptionItem({
          variables: {
            object: {
              prescription_id: rxId,
              medicine_id: item.medicineId,
              medicine_name: item.medicineName,
              dose: item.dose,
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity,
              notes: item.notes,
              is_compound: item.isCompound,
              clinic_id: user?.clinicId,
            },
          },
        })
      }

      toast.success(`Resep ${rxNo} berhasil disimpan`)
      onSaved?.(rxId)
    } catch {
      toast.error('Gagal menyimpan resep')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#0E73F6]/10">
              <FileText className="size-4 text-[#0E73F6]" />
            </div>
            <div>
              <CardTitle className="text-base">E-Resep</CardTitle>
              <p className="text-xs text-muted-foreground">
                {patientName} ({patientRmNumber})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="compound" className="text-xs">Racikan</Label>
            <Switch
              id="compound"
              checked={compound}
              onCheckedChange={setCompound}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Medicine search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari obat (nama generik atau merek)..."
              value={medicineSearch}
              onChange={(e) => {
                setMedicineSearch(e.target.value)
                searchMeds(e.target.value)
              }}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {medDropdownOpen && medicineSearch.length >= 1 && (
            <ScrollArea className="absolute z-50 mt-1 w-full max-h-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="p-1.5">
                {medLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Mencari obat...</span>
                  </div>
                ) : medicines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Tidak ditemukan</p>
                ) : (
                  medicines.map((med) => (
                    <button
                      key={med.id}
                      onClick={() => addMedicine(med)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.genericName} &middot; {med.dosageForm} &middot; Stock: {med.stock}</p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 ml-2">
                        Rp {med.price.toLocaleString('id-ID')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Prescription items */}
        {items.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 rounded-xl">
            <Pill className="size-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada obat ditambahkan</p>
            <p className="text-xs text-muted-foreground mt-1">Gunakan pencarian di atas untuk menambahkan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border p-4 space-y-3 bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[#0E73F6]/10 text-[#0E73F6] text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{item.genericName}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dosis</Label>
                    <Input
                      placeholder="500mg"
                      value={item.dose}
                      onChange={(e) => updateItem(idx, 'dose', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frekuensi</Label>
                    <Input
                      placeholder="3x1"
                      value={item.frequency}
                      onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Durasi</Label>
                    <Input
                      placeholder="7 hari"
                      value={item.duration}
                      onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jumlah</Label>
                    <Input
                      type="number"
                      placeholder="21"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="size-3" /> {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs">Catatan Resep</Label>
          <Textarea
            placeholder="Catatan tambahan untuk apotek..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Save */}
        <Button
          onClick={save}
          disabled={items.length === 0 || saving}
          className="w-full gap-1.5 bg-[#0E73F6] hover:bg-[#0B5FCE]"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Menyimpan...' : 'Simpan Resep'}
        </Button>
      </CardContent>
    </Card>
  )
}

// Helpers
function mapMedicine(m: any): Medicine {
  return {
    id: m.id, clinicId: '', name: m.name, genericName: m.generic_name,
    category: m.category, unit: m.unit, stock: m.stock, price: m.price,
    dosageForm: m.dosage_form, contraindications: m.contraindications,
    interactions: m.interactions, isActive: m.is_active,
  }
}

function mapExistingItem(item: any): RxItem {
  return {
    medicineId: item.medicine_id,
    medicineName: item.medicine_name,
    genericName: '',
    dose: item.dose,
    frequency: item.frequency,
    duration: item.duration,
    quantity: item.quantity,
    notes: item.notes,
    isCompound: item.is_compound,
    interactions: '',
  }
}
