'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores'
import type { Invoice, InvoiceItem, Encounter, Patient } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, Plus, Trash2, CheckCircle2, CreditCard, Banknote, QrCode, Search, X, FileText } from 'lucide-react'

interface BillItem {
  itemType: string
  itemName: string
  quantity: number
  unitPrice: number
}

export default function BillingPage() {
  const user = useAuthStore((s) => s.user)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [items, setItems] = useState<BillItem[]>([{ itemType: 'tindakan', itemName: '', quantity: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [selectedEncounterId, setSelectedEncounterId] = useState('')

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const qs = params.toString()
      const data = await apiFetch<Invoice[]>(`/invoices${qs ? `?${qs}` : ''}`)
      setInvoices(data || [])
    } catch { toast.error('Gagal memuat data invoice') }
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const total = Math.max(0, subtotal - discount)
  const formatRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const updateItem = (idx: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { itemType: 'tindakan', itemName: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  const saveInvoice = async () => {
    const validItems = items.filter(i => i.itemName.trim() && i.unitPrice > 0)
    if (validItems.length === 0) { toast.error('Tambahkan minimal 1 item dengan harga'); return }
    if (!patientId) { toast.error('Masukkan ID pasien'); return }

    setSaving(true)
    try {
      await apiFetch('/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, encounterId: selectedEncounterId, items: validItems, discount, paymentMethod })
      })
      toast.success('Invoice berhasil dibuat')
      setShowForm(false)
      setItems([{ itemType: 'tindakan', itemName: '', quantity: 1, unitPrice: 0 }])
      setDiscount(0)
      setPatientId('')
      setPatientName('')
      setSelectedEncounterId('')
      fetchInvoices()
    } catch { toast.error('Gagal membuat invoice') }
    finally { setSaving(false) }
  }

  const markPaid = async (invoice: Invoice) => {
    try {
      await apiFetch('/invoices', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoice.id, paymentStatus: 'lunas', paymentMethod: invoice.paymentMethod })
      })
      toast.success('Pembayaran dicatat')
      fetchInvoices()
    } catch { toast.error('Gagal mencatat pembayaran') }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="size-5 text-primary" /> Billing & Kasir
          </h1>
          <p className="text-sm text-muted-foreground">Kelola pembayaran dan invoice pasien</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> Buat Invoice
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {['', 'belum_bayar', 'lunas'].map((s) => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm"
            onClick={() => setFilterStatus(s)}>
            {s === '' ? 'Semua' : s === 'belum_bayar' ? 'Belum Bayar' : 'Lunas'}
          </Button>
        ))}
      </div>

      {/* Create Invoice Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" /> Invoice Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">ID Pasien</Label>
                <Input placeholder="Masukkan patient ID" value={patientId}
                  onChange={(e) => setPatientId(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash"><span className="flex items-center gap-2"><Banknote className="size-3.5" /> Cash</span></SelectItem>
                    <SelectItem value="qris"><span className="flex items-center gap-2"><QrCode className="size-3.5" /> QRIS</span></SelectItem>
                    <SelectItem value="transfer"><span className="flex items-center gap-2"><CreditCard className="size-3.5" /> Transfer</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Item Tagihan</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="size-3.5" /> Tambah</Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border">
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">Jenis</Label>
                    <Select value={item.itemType} onValueChange={(v) => updateItem(idx, 'itemType', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tindakan">Tindakan</SelectItem>
                        <SelectItem value="obat">Obat</SelectItem>
                        <SelectItem value="lab">Laboratorium</SelectItem>
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">Nama Item</Label>
                    <Input placeholder="Nama item" value={item.itemName}
                      onChange={(e) => updateItem(idx, 'itemName', e.target.value)} className="text-sm" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Harga</Label>
                    <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} className="text-sm" />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="col-span-12 text-right text-xs text-muted-foreground">
                    Subtotal: {formatRp(item.quantity * item.unitPrice)}
                  </div>
                </div>
              ))}
            </div>

            <Separator />
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex gap-6"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatRp(subtotal)}</span></div>
              <div className="flex gap-6 items-center">
                <span className="text-muted-foreground">Diskon</span>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-32 h-8 text-sm text-right" />
              </div>
              <Separator className="w-full max-w-xs" />
              <div className="flex gap-6 text-base"><span className="font-semibold">Total</span><span className="font-bold text-primary">{formatRp(total)}</span></div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={saveInvoice} disabled={saving} className="gap-1.5">
                {saving ? 'Menyimpan...' : <><CheckCircle2 className="size-4" /> Simpan Invoice</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : invoices.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Receipt className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Invoice</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">Buat invoice baru untuk pasien.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{inv.invoiceNo || '-'}</Badge>
                    <Badge variant={inv.paymentStatus === 'lunas' ? 'default' : 'destructive'} className="text-xs">
                      {inv.paymentStatus === 'lunas' ? 'Lunas' : 'Belum Bayar'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {inv.paymentMethod === 'cash' ? 'Cash' : inv.paymentMethod === 'qris' ? 'QRIS' : 'Transfer'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inv.invoiceDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-muted-foreground">ID Pasien: <span className="font-mono text-foreground">{inv.patientId?.slice(0, 12)}...</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatRp(inv.total)}</p>
                    {inv.paymentStatus !== 'lunas' && (
                      <Button size="sm" className="mt-1 gap-1" onClick={() => markPaid(inv)}>
                        <CheckCircle2 className="size-3.5" /> Bayar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}