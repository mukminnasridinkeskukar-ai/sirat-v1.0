'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useAuthStore, useUIStore } from '@/stores'
import type { Patient, Encounter, VitalSign, SoapNote, Diagnosis, Icd10, Queue } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, Plus, Save, Lock, ChevronRight, Stethoscope, Heart, Thermometer, Activity, User, AlertTriangle, CheckCircle2, FileText, ClipboardList, X
} from 'lucide-react'

const ROLE_CLINICAL = ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan']
const ROLE_DOCTOR = ['super_admin', 'dokter_pj', 'dokter']
const ROLE_NURSE = ['super_admin', 'perawat_bidan']

const SOAP_TEMPLATES: Record<string, { s: string; o: string; a: string; p: string }> = {
  ispa: {
    s: 'Batuk pilek 3 hari, demam sejak 2 hari. Tidak ada sesak napas.',
    o: 'TD 120/80 mmHg, Nadi 88x/mnt, RR 20x/mnt, Suhu 38,2°C, SpO2 98%. Tampak adekuat, konjungtiva tidak anemis, faring eritem, tonsil tidak membesar, dada: vesikuler bilateral, no wheezing.',
    a: 'ISPA saluran atas (J06.9)',
    p: 'Paracetamol 500mg 3x1, CTM 4mg 3x1, Amoxicillin 500mg 3x1. Kontrol 3 hari jika tidak membaik.',
  },
  hipertensi: {
    s: 'Sering pusing kepala sejak 1 minggu. Riwayat hipertensi 2 tahun, obat rutin tidak teratur.',
    o: 'TD 160/100 mmHg, Nadi 80x/mnt, RR 18x/mnt, Suhu 36,5°C. BB 78 kg, TB 165 cm. Jantung: regular, tidak ada murmur. Paru: vesikuler. Ekstremitas: tidak ada edema.',
    a: 'Hipertensi esensial (I10)',
    p: 'Amlodipin 10mg 1x1 pagi, dikontrol TD setiap hari. Diet rendah garam, olahraga teratur. Kontrol 1 minggu.',
  },
  dm: {
    s: 'Sering haus dan sering BAK sejak 2 minggu. Riwayat DM tipe 2 sejak 3 tahun. Gula darah terakhir 250 mg/dL.',
    o: 'TD 130/80 mmHg, Nadi 76x/mnt, RR 16x/mnt, Suhu 36,6°C. BB 82 kg, TB 168 cm, BMI 29.0. Kulit turgor cukup, luka kaki kiri (-).',
    a: 'Diabetes Melitus Tipe 2 (E11.9)',
    p: 'Metformin 500mg 2x1, Diet DM, olahraga 30 menit/hari. Cek GDS, G2PP, HbA1c. Kontrol 1 minggu bawa hasil lab.',
  },
  diare: {
    s: 'BAB lembek 5x sehari sejak 2 hari. Tidak ada darah/lendir. Mual, muntah 2x.',
    o: 'TD 110/70 mmHg, Nadi 90x/mnt, RR 20x/mnt, Suhu 37,1°C. Turgor kulit cukup, mata tidak cekung, abdomen lemas, bising usus (+).',
    a: 'Gastroenteritis akut (K52.9)',
    p: 'Oralit tiap BAB, Zinc 20mg 1x1 selama 10 hari, Loperamid 2mg 3x1. Diet BRAT. Kontrol jika dehidrasi.',
  },
}

export default function PelayananPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useUIStore((s) => s.navigate)
  const [activeTab, setActiveTab] = useState('list')
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [vitalSign, setVitalSign] = useState<Partial<VitalSign>>({})
  const [soap, setSoap] = useState<Partial<SoapNote>>({})
  const [diagnoses, setDiagnoses] = useState<Partial<Diagnosis>[]>([])
  const [icdSearch, setIcdSearch] = useState('')
  const [icdResults, setIcdResults] = useState<Icd10[]>([])
  const [icdOpen, setIcdOpen] = useState(false)
  const [soapLocked, setSoapLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const isNurse = user && ROLE_NURSE.includes(user.role)
  const isDoctor = user && ROLE_DOCTOR.includes(user.role)

  const fetchEncounters = useCallback(async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const data = await apiFetch<Encounter[]>(`/encounters?date=${today}&status=berlangsung`)
      setEncounters(data || [])
    } catch (err) {
      toast.error('Gagal memuat data kunjungan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEncounters() }, [fetchEncounters])

  const searchIcd = useCallback(async (q: string) => {
    if (q.length < 2) { setIcdResults([]); return }
    try {
      const data = await apiFetch<Icd10[]>(`/icd?search=${encodeURIComponent(q)}&limit=15`)
      setIcdResults(data || [])
    } catch { setIcdResults([]) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchIcd(icdSearch), 300)
    return () => clearTimeout(t)
  }, [icdSearch, searchIcd])

  const openEncounter = (enc: Encounter) => {
    setSelectedEncounter(enc)
    setVitalSign({})
    setSoap({})
    setDiagnoses([])
    setSoapLocked(false)
    if (enc.soapNotes && enc.soapNotes.length > 0) {
      const s = enc.soapNotes[0]
      setSoap({ subjective: s.subjective, objective: s.objective, assessment: s.assessment, plan: s.plan, instructions: s.instructions, isLocked: s.isLocked })
      setSoapLocked(s.isLocked)
    }
    if (enc.diagnoses) setDiagnoses(enc.diagnoses)
    if (enc.vitalSigns && enc.vitalSigns.length > 0) {
      const v = enc.vitalSigns[0]
      setVitalSign({ systolic: v.systolic, diastolic: v.diastolic, heartRate: v.heartRate, respiratoryRate: v.respiratoryRate, temperature: v.temperature, weight: v.weight, height: v.height, oxygenSat: v.oxygenSat, painScale: v.painScale, notes: v.notes })
    }
    setActiveTab(isNurse ? 'vital' : 'soap')
  }

  const saveVitalSign = async () => {
    if (!selectedEncounter) return
    try {
      await apiFetch('/encounters/' + selectedEncounter.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'berlangsung', vitalSignData: vitalSign })
      })
      toast.success('Vital sign tersimpan')
    } catch { toast.error('Gagal menyimpan vital sign') }
  }

  const saveSoap = async (lock = false) => {
    if (!selectedEncounter) return
    setSaving(true)
    try {
      const data = await apiFetch<SoapNote>('/soap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: selectedEncounter.id,
          subjective: soap.subjective || '',
          objective: soap.objective || '',
          assessment: soap.assessment || '',
          plan: soap.plan || '',
          instructions: soap.instructions || '',
          isLocked: lock,
          diagnoses: diagnoses.map((d, i) => ({ icd10Code: d.icd10Code, icd10Name: d.icd10Name, diagnosisType: i === 0 ? 'primer' : 'sekunder' }))
        })
      })
      if (lock) {
        setSoapLocked(true)
        toast.success('SOAP dikunci dan disimpan. Data dikirim ke SATUSEHAT.')
        fetchEncounters()
      } else {
        toast.success('SOAP tersimpan sebagai draft')
      }
    } catch { toast.error('Gagal menyimpan SOAP') }
    finally { setSaving(false) }
  }

  const applyTemplate = (key: string) => {
    const tpl = SOAP_TEMPLATES[key]
    if (tpl) {
      setSoap({ ...soap, subjective: tpl.s, objective: tpl.o, assessment: tpl.a, plan: tpl.p })
      toast.info('Template SOAP ' + key.toUpperCase() + ' diterapkan')
    }
  }

  const addDiagnosis = (icd: Icd10) => {
    if (diagnoses.find(d => d.icd10Code === icd.code)) { toast.warning('Diagnosis sudah ditambahkan'); return }
    setDiagnoses([...diagnoses, { icd10Code: icd.code, icd10Name: icd.name, diagnosisType: diagnoses.length === 0 ? 'primer' : 'sekunder' }])
    setIcdOpen(false)
    setIcdSearch('')
  }

  const removeDiagnosis = (idx: number) => setDiagnoses(diagnoses.filter((_, i) => i !== idx))

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" /> Pelayanan Klinis
          </h1>
          <p className="text-sm text-muted-foreground">Kelola kunjungan, asesmen, dan SOAP pasien</p>
        </div>
      </div>

      {selectedEncounter ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedEncounter(null)}>
                  <ChevronRight className="size-4 rotate-180" />
                </Button>
                <div>
                  <CardTitle className="text-base">{selectedEncounter.patient?.fullName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedEncounter.patient?.rmNumber} &middot; {selectedEncounter.patient?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                </div>
              </div>
              <Badge variant={soapLocked ? 'default' : 'secondary'}>
                {soapLocked ? 'Terkunci' : 'Draft'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="vital" className="gap-1.5"><Heart className="size-3.5" /> Vital Sign</TabsTrigger>
                <TabsTrigger value="soap" className="gap-1.5"><ClipboardList className="size-3.5" /> SOAP</TabsTrigger>
                <TabsTrigger value="diagnosis" className="gap-1.5"><AlertTriangle className="size-3.5" /> Diagnosis</TabsTrigger>
              </TabsList>

              {/* Vital Sign Tab */}
              <TabsContent value="vital">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'TD Sistolik', key: 'systolic', unit: 'mmHg', icon: Heart, color: 'text-red-500' },
                    { label: 'TD Diastolik', key: 'diastolic', unit: 'mmHg', icon: Heart, color: 'text-red-400' },
                    { label: 'Nadi', key: 'heartRate', unit: 'x/mnt', icon: Activity, color: 'text-rose-500' },
                    { label: 'Suhu', key: 'temperature', unit: '°C', icon: Thermometer, color: 'text-orange-500' },
                    { label: 'RR', key: 'respiratoryRate', unit: 'x/mnt', icon: Activity, color: 'text-blue-500' },
                    { label: 'SpO2', key: 'oxygenSat', unit: '%', icon: Activity, color: 'text-cyan-500' },
                    { label: 'BB', key: 'weight', unit: 'kg', icon: User, color: 'text-green-500' },
                    { label: 'TB', key: 'height', unit: 'cm', icon: User, color: 'text-green-400' },
                    { label: 'Nyeri', key: 'painScale', unit: '/10', icon: AlertTriangle, color: 'text-amber-500' },
                  ].map(({ label, key, unit, icon: Icon, color }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon className={`size-3 ${color}`} /> {label}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={vitalSign[key as keyof VitalSign] ?? ''}
                          onChange={(e) => setVitalSign({ ...vitalSign, [key]: Number(e.target.value) })}
                          disabled={soapLocked}
                          className="pr-8 text-lg font-semibold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={saveVitalSign} disabled={soapLocked} className="gap-1.5">
                    <Save className="size-4" /> Simpan Vital Sign
                  </Button>
                </div>
              </TabsContent>

              {/* SOAP Tab */}
              <TabsContent value="soap">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-muted-foreground self-center">Template Cepat:</span>
                  {Object.keys(SOAP_TEMPLATES).map((key) => (
                    <Button key={key} variant="outline" size="sm" onClick={() => applyTemplate(key)} disabled={soapLocked}>
                      {key.toUpperCase()}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5"><FileText className="size-3.5 text-blue-500" /> Subjective (S)</Label>
                    <Textarea
                      placeholder="Anamnesis: keluhan utama, riwayat penyakit saat ini, riwayat penyakit dahulu..."
                      value={soap.subjective || ''}
                      onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                      disabled={soapLocked}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5"><Stethoscope className="size-3.5 text-emerald-500" /> Objective (O)</Label>
                    <Textarea
                      placeholder="Pemeriksaan fisik: TD, Nadi, RR, Suhu, pemeriksaan sistem..."
                      value={soap.objective || ''}
                      onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                      disabled={soapLocked}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="size-3.5 text-amber-500" /> Assessment (A)</Label>
                    <Textarea
                      placeholder="Diagnosis klinis berdasarkan SOAP..."
                      value={soap.assessment || ''}
                      onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                      disabled={soapLocked}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-green-500" /> Plan (P)</Label>
                    <Textarea
                      placeholder="Rencana tatalaksana: tindakan, obat, lab, rujukan, edukasi..."
                      value={soap.plan || ''}
                      onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                      disabled={soapLocked}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Label className="text-sm font-semibold">Instruksi & Edukasi Pasien</Label>
                  <Textarea
                    placeholder="Instruksi untuk pasien..."
                    value={soap.instructions || ''}
                    onChange={(e) => setSoap({ ...soap, instructions: e.target.value })}
                    disabled={soapLocked}
                    rows={2}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => saveSoap(false)} disabled={soapLocked || saving} variant="outline" className="gap-1.5">
                    <Save className="size-4" /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
                  </Button>
                  <Button onClick={() => saveSoap(true)} disabled={soapLocked || saving} className="gap-1.5">
                    <Lock className="size-4" /> Kunci & Simpan
                  </Button>
                </div>
              </TabsContent>

              {/* Diagnosis Tab */}
              <TabsContent value="diagnosis">
                <div className="flex items-center gap-2 mb-4">
                  <Dialog open={icdOpen} onOpenChange={setIcdOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={soapLocked} className="gap-1.5">
                        <Plus className="size-4" /> Tambah Diagnosis ICD-10
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Cari Diagnosis ICD-10</DialogTitle>
                      </DialogHeader>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Ketik kode atau nama penyakit..."
                          className="pl-9"
                          value={icdSearch}
                          onChange={(e) => setIcdSearch(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="max-h-64">
                        <div className="space-y-1">
                          {icdResults.map((icd) => (
                            <button
                              key={icd.code}
                              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent text-sm"
                              onClick={() => addDiagnosis(icd)}
                            >
                              <Badge variant="secondary" className="shrink-0 mt-0.5 font-mono text-xs">{icd.code}</Badge>
                              <span>{icd.name}</span>
                            </button>
                          ))}
                          {icdSearch.length >= 2 && icdResults.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Tidak ditemukan</p>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
                {diagnoses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada diagnosis. Klik &quot;Tambah Diagnosis ICD-10&quot;.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnoses.map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-xs">
                            {idx === 0 ? 'Primer' : 'Sekunder'}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-xs">{d.icd10Code}</Badge>
                          <span className="text-sm">{d.icd10Name}</span>
                        </div>
                        {!soapLocked && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => removeDiagnosis(idx)}>
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <>
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : encounters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Stethoscope className="size-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Belum Ada Kunjungan Aktif</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Tambahkan pasien melalui Antrian terlebih dahulu, lalu mulai periksa untuk membuka SOAP.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('antrian')}>
                  Buka Antrian
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {encounters.map((enc) => (
                <Card key={enc.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openEncounter(enc)}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {enc.patient?.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{enc.patient?.fullName}</p>
                        <p className="text-xs text-muted-foreground">{enc.patient?.rmNumber} &middot; {enc.chiefComplaint || 'Tidak ada keluhan'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {enc.soapNotes && enc.soapNotes.length > 0 && enc.soapNotes[0].isLocked ? (
                        <Badge variant="default" className="gap-1"><Lock className="size-3" /> Selesai</Badge>
                      ) : (
                        <Badge variant="secondary">Berlangsung</Badge>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}