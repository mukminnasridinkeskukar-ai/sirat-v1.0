'use client'

import { useState, useCallback, useMemo } from 'react'
import { useMutation, useLazyQuery } from '@apollo/client/react'
import { toast } from 'sonner'
import {
  Heart, Thermometer, Activity, User, AlertTriangle,
  Save, Lock, FileText, Stethoscope, CheckCircle2, Plus, X, ClipboardList,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Icd10Autocomplete } from '@/components/pasien/PatientSearch'
import { useAuthStore } from '@/stores'
import {
  INSERT_SOAP_NOTE, UPDATE_SOAP_NOTE, INSERT_VITAL_SIGN,
  INSERT_DIAGNOSIS, SEARCH_ICD10,
} from '@/lib/graphql/queries'
import type { VitalSign, SoapNote, Diagnosis, Icd10 } from '@/types'
import { cn } from '@/lib/utils'

// SOAP Templates for common cases (Permenkes compliant)
const SOAP_TEMPLATES: Record<string, { s: string; o: string; a: string; p: string }> = {
  ispa: {
    s: 'Batuk pilek 3 hari, demam sejak 2 hari. Tidak ada sesak napas.',
    o: 'TD 120/80 mmHg, Nadi 88x/mnt, RR 20x/mnt, Suhu 38,2C, SpO2 98%. Tampak adekuat, konjungtiva tidak anemis, faring eritem, tonsil tidak membesar, dada: vesikuler bilateral, no wheezing.',
    a: 'ISPA saluran atas (J06.9)',
    p: 'Paracetamol 500mg 3x1, CTM 4mg 3x1, Amoxicillin 500mg 3x1. Kontrol 3 hari jika tidak membaik.',
  },
  hipertensi: {
    s: 'Sering pusing kepala sejak 1 minggu. Riwayat hipertensi 2 tahun, obat rutin tidak teratur.',
    o: 'TD 160/100 mmHg, Nadi 80x/mnt, RR 18x/mnt, Suhu 36,5C. BB 78 kg, TB 165 cm. Jantung: regular, tidak ada murmur. Paru: vesikuler. Ekstremitas: tidak ada edema.',
    a: 'Hipertensi esensial (I10)',
    p: 'Amlodipin 10mg 1x1 pagi, dikontrol TD setiap hari. Diet rendah garam, olahraga teratur. Kontrol 1 minggu.',
  },
  dm: {
    s: 'Sering haus dan sering BAK sejak 2 minggu. Riwayat DM tipe 2 sejak 3 tahun. Gula darah terakhir 250 mg/dL.',
    o: 'TD 130/80 mmHg, Nadi 76x/mnt, RR 16x/mnt, Suhu 36,6C. BB 82 kg, TB 168 cm, BMI 29.0. Kulit turgor cukup, luka kaki kiri (-).',
    a: 'Diabetes Melitus Tipe 2 (E11.9)',
    p: 'Metformin 500mg 2x1, Diet DM, olahraga 30 menit/hari. Cek GDS, G2PP, HbA1c. Kontrol 1 minggu bawa hasil lab.',
  },
  diare: {
    s: 'BAB lembek 5x sehari sejak 2 hari. Tidak ada darah/lendir. Mual, muntah 2x.',
    o: 'TD 110/70 mmHg, Nadi 90x/mnt, RR 20x/mnt, Suhu 37,1C. Turgor kulit cukup, mata tidak cekung, abdomen lemas, bising usus (+).',
    a: 'Gastroenteritis akut (K52.9)',
    p: 'Oralit tiap BAB, Zinc 20mg 1x1 selama 10 hari, Loperamid 2mg 3x1. Diet BRAT. Kontrol jika dehidrasi.',
  },
}

const VITAL_FIELDS: { label: string; key: keyof VitalSign; unit: string; icon: React.ElementType; color: string; placeholder: string }[] = [
  { label: 'TD Sistolik', key: 'systolic', unit: 'mmHg', icon: Heart, color: 'text-red-500', placeholder: '120' },
  { label: 'TD Diastolik', key: 'diastolic', unit: 'mmHg', icon: Heart, color: 'text-red-400', placeholder: '80' },
  { label: 'Nadi', key: 'heartRate', unit: 'x/mnt', icon: Activity, color: 'text-rose-500', placeholder: '80' },
  { label: 'Suhu', key: 'temperature', unit: 'C', icon: Thermometer, color: 'text-orange-500', placeholder: '36.5' },
  { label: 'RR', key: 'respiratoryRate', unit: 'x/mnt', icon: Activity, color: 'text-blue-500', placeholder: '20' },
  { label: 'SpO2', key: 'oxygenSat', unit: '%', icon: Activity, color: 'text-cyan-500', placeholder: '98' },
  { label: 'BB', key: 'weight', unit: 'kg', icon: User, color: 'text-green-500', placeholder: '65' },
  { label: 'TB', key: 'height', unit: 'cm', icon: User, color: 'text-green-400', placeholder: '170' },
  { label: 'Nyeri', key: 'painScale', unit: '/10', icon: AlertTriangle, color: 'text-amber-500', placeholder: '0' },
]

interface SOAPFormProps {
  encounterId: string
  patientName?: string
  patientRmNumber?: string
  patientGender?: string
  existingSoap?: any // from GraphQL (snake_case)
  existingDiagnoses?: any[]
  existingVitalSigns?: any[]
  isLocked?: boolean
  onLocked?: () => void
  onBack?: () => void
}

export default function SOAPForm({
  encounterId,
  patientName = '',
  patientRmNumber = '',
  patientGender = '',
  existingSoap = null,
  existingDiagnoses = [],
  existingVitalSigns = [],
  isLocked = false,
  onLocked,
  onBack,
}: SOAPFormProps) {
  const user = useAuthStore((s) => s.user)

  // State
  const [activeTab, setActiveTab] = useState('vital')
  const [soapLocked, setSoapLocked] = useState(isLocked)
  const [saving, setSaving] = useState(false)
  const [vitalSign, setVitalSign] = useState<Partial<VitalSign>>({})
  const [soap, setSoap] = useState({
    subjective: existingSoap?.subjective || '',
    objective: existingSoap?.objective || '',
    assessment: existingSoap?.assessment || '',
    plan: existingSoap?.plan || '',
    instructions: existingSoap?.instructions || '',
  })
  const [diagnoses, setDiagnoses] = useState<Partial<Diagnosis>[]>(
    (existingDiagnoses || []).map((d: any) => ({
      icd10Code: d.icd10_code,
      icd10Name: d.icd10_name,
      diagnosisType: d.diagnosis_type,
    }))
  )
  const [vitalSaved, setVitalSaved] = useState(false)

  // Populate from existing vital signs
  if (existingVitalSigns.length > 0 && !vitalSaved) {
    const v = existingVitalSigns[0]
    setVitalSign({
      systolic: v.systolic,
      diastolic: v.diastolic,
      heartRate: v.heart_rate,
      respiratoryRate: v.respiratory_rate,
      temperature: v.temperature,
      weight: v.weight,
      height: v.height,
      oxygenSat: v.oxygen_sat,
      painScale: v.pain_scale,
      notes: v.notes,
    })
    setVitalSaved(true)
  }

  // GraphQL mutations
  const [insertVitalSign] = useMutation(INSERT_VITAL_SIGN)
  const [insertSoapNote] = useMutation(INSERT_SOAP_NOTE)
  const [updateSoapNote] = useMutation(UPDATE_SOAP_NOTE)

  // Save Vital Sign
  const saveVitalSign = async () => {
    try {
      await insertVitalSign({
        variables: {
          object: {
            encounter_id: encounterId,
            nurse_id: user?.id,
            clinic_id: user?.clinicId,
            ...Object.fromEntries(
              Object.entries(vitalSign).map(([k, v]) => [toSnake(k), v])
            ),
          },
        },
      })
      toast.success('Vital sign tersimpan')
    } catch {
      toast.error('Gagal menyimpan vital sign')
    }
  }

  // Save SOAP (draft or locked)
  const saveSoap = async (lock = false) => {
    setSaving(true)
    try {
      const soapData = {
        encounter_id: encounterId,
        doctor_id: user?.id,
        clinic_id: user?.clinicId,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        instructions: soap.instructions,
        is_locked: lock,
        ...(lock ? { locked_at: new Date().toISOString() } : {}),
      }

      if (existingSoap?.id) {
        await updateSoapNote({
          variables: { id: existingSoap.id, _set: soapData },
        })
      } else {
        await insertSoapNote({ variables: { object: soapData } })
      }

      if (lock) {
        setSoapLocked(true)
        toast.success('SOAP dikunci. Data siap dikirim ke SATUSEHAT.')
        onLocked?.()
      } else {
        toast.success('SOAP tersimpan sebagai draft')
      }
    } catch {
      toast.error('Gagal menyimpan SOAP')
    } finally {
      setSaving(false)
    }
  }

  // Template
  const applyTemplate = (key: string) => {
    const tpl = SOAP_TEMPLATES[key]
    if (tpl) {
      setSoap({ ...soap, subjective: tpl.s, objective: tpl.o, assessment: tpl.a, plan: tpl.p })
      toast.info(`Template ${key.toUpperCase()} diterapkan`)
    }
  }

  // Diagnosis management
  const addDiagnosis = (icd: { code: string; name: string; id: string }) => {
    if (diagnoses.find(d => d.icd10Code === icd.code)) {
      toast.warning('Diagnosis sudah ditambahkan')
      return
    }
    setDiagnoses([
      ...diagnoses,
      {
        icd10Code: icd.code,
        icd10Name: icd.name,
        diagnosisType: diagnoses.length === 0 ? 'primer' : 'sekunder',
      },
    ])
  }

  const removeDiagnosis = (idx: number) =>
    setDiagnoses(diagnoses.filter((_, i) => i !== idx))

  return (
    <Card className="border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <Stethoscope className="size-4 rotate-180" />
            </Button>
          )}
          <div>
            <h3 className="text-base font-semibold">{patientName}</h3>
            <p className="text-xs text-muted-foreground">
              {patientRmNumber} &middot;{' '}
              {patientGender === 'L' ? 'Laki-laki' : 'Perempuan'}
            </p>
          </div>
        </div>
        <Badge variant={soapLocked ? 'default' : 'secondary'} className="bg-[#0E73F6]">
          {soapLocked ? 'Terkunci' : 'Draft'}
        </Badge>
      </div>

      <CardContent className="pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="vital" className="gap-1.5 text-xs sm:text-sm">
              <Heart className="size-3.5" /> Vital
            </TabsTrigger>
            <TabsTrigger value="subjective" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="size-3.5" /> S
            </TabsTrigger>
            <TabsTrigger value="objective" className="gap-1.5 text-xs sm:text-sm">
              <Stethoscope className="size-3.5" /> O
            </TabsTrigger>
            <TabsTrigger value="ap" className="gap-1.5 text-xs sm:text-sm">
              <CheckCircle2 className="size-3.5" /> A/P
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB 1: VITAL SIGNS ===== */}
          <TabsContent value="vital">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {VITAL_FIELDS.map(({ label, key, unit, icon: Icon, color, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon className={cn('size-3', color)} /> {label}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      placeholder={placeholder}
                      value={vitalSign[key] ?? ''}
                      onChange={(e) =>
                        setVitalSign({ ...vitalSign, [key]: Number(e.target.value) })
                      }
                      disabled={soapLocked}
                      className="pr-8 text-lg font-semibold"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Catatan Perawat</Label>
              <Textarea
                placeholder="Catatan tambahan pemeriksaan fisik..."
                value={vitalSign.notes || ''}
                onChange={(e) => setVitalSign({ ...vitalSign, notes: e.target.value })}
                disabled={soapLocked}
                rows={2}
              />
            </div>
            <div className="mt-4">
              <Button
                onClick={saveVitalSign}
                disabled={soapLocked}
                className="gap-1.5 bg-[#0E73F6] hover:bg-[#0B5FCE]"
              >
                <Save className="size-4" /> Simpan Vital Sign
              </Button>
            </div>
          </TabsContent>

          {/* ===== TAB 2: SUBJECTIVE ===== */}
          <TabsContent value="subjective">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="size-3.5 text-[#0E73F6]" />
                Subjective — Anamnesis
              </Label>
              <Textarea
                placeholder="Keluhan utama, riwayat penyakit saat ini, riwayat penyakit dahulu, riwayat alergi obat, riwayat pengobatan..."
                value={soap.subjective}
                onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                disabled={soapLocked}
                rows={8}
                className="text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Identitas pemeriksa (dokter yang melakukan anamnesis): {user?.fullName}
              </p>
            </div>
          </TabsContent>

          {/* ===== TAB 3: OBJECTIVE ===== */}
          <TabsContent value="objective">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-emerald-500" />
                Objective — Pemeriksaan Fisik
              </Label>
              <Textarea
                placeholder="TD, Nadi, RR, Suhu, BB, TB, pemeriksaan umum, pemeriksaan sistem (kepala, mata, THT, thoraks, abdomen, ekstremitas, kulit)..."
                value={soap.objective}
                onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                disabled={soapLocked}
                rows={8}
                className="text-sm leading-relaxed"
              />
            </div>
          </TabsContent>

          {/* ===== TAB 4: ASSESSMENT & PLAN ===== */}
          <TabsContent value="ap">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Assessment */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Assessment
                </Label>
                <Textarea
                  placeholder="Diagnosis klinis berdasarkan data subjektif dan objektif..."
                  value={soap.assessment}
                  onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                  disabled={soapLocked}
                  rows={4}
                />
              </div>
              {/* Plan */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-green-500" />
                  Plan
                </Label>
                <Textarea
                  placeholder="Tatalaksana: tindakan, obat-obatan, pemeriksaan penunjang, rujukan, edukasi pasien..."
                  value={soap.plan}
                  onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                  disabled={soapLocked}
                  rows={4}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-semibold">Instruksi & Edukasi Pasien</Label>
              <Textarea
                placeholder="Instruksi untuk pasien setelah pulang..."
                value={soap.instructions}
                onChange={(e) => setSoap({ ...soap, instructions: e.target.value })}
                disabled={soapLocked}
                rows={2}
              />
            </div>

            {/* Template buttons */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Template Cepat:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(SOAP_TEMPLATES).map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(key)}
                    disabled={soapLocked}
                  >
                    {key.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Diagnosis ICD-10 */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Diagnosis ICD-10</Label>
              </div>
              <Icd10Autocomplete onSelect={addDiagnosis} />
              {diagnoses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Belum ada diagnosis. Gunakan pencarian ICD-10 di atas.
                </p>
              ) : (
                <div className="space-y-2">
                  {diagnoses.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={idx === 0 ? 'default' : 'secondary'}
                          className={cn('text-xs', idx === 0 && 'bg-[#0E73F6]')}
                        >
                          {idx === 0 ? 'Primer' : 'Sekunder'}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {d.icd10Code}
                        </Badge>
                        <span className="text-sm">{d.icd10Name}</span>
                      </div>
                      {!soapLocked && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeDiagnosis(idx)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => saveSoap(false)}
                disabled={soapLocked || saving}
                variant="outline"
                className="gap-1.5"
              >
                <Save className="size-4" /> {saving ? 'Menyimpan...' : 'Simpan Draft'}
              </Button>
              <Button
                onClick={() => saveSoap(true)}
                disabled={soapLocked || saving}
                className="gap-1.5 bg-[#0E73F6] hover:bg-[#0B5FCE]"
              >
                <Lock className="size-4" /> Kunci & Simpan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Helpers
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
}
