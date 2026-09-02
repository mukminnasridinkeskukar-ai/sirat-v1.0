'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client/react'
import { toast } from 'sonner'
import { useAuthStore, useUIStore } from '@/stores'
import { GET_ENCOUNTERS, SEARCH_ICD10 } from '@/lib/graphql/queries'
import { isNhostConfigured } from '@/lib/nhost'
import { apiFetch } from '@/lib/api'
import type { Encounter } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Stethoscope, ChevronRight, Lock } from 'lucide-react'
import SOAPForm from '@/components/soap/SOAPForm'

const ROLE_CLINICAL = ['super_admin', 'dokter_pj', 'dokter', 'perawat_bidan']

export default function PelayananPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useUIStore((s) => s.navigate)
  const [selectedEncounter, setSelectedEncounter] = useState<any>(null)
  const [localLoading, setLocalLoading] = useState(false)

  // Try GraphQL first, fall back to REST
  const today = new Date().toISOString().split('T')[0]

  // Use REST API for encounters (they already work with the SQLite backend)
  const fetchEncounters = useCallback(async () => {
    try {
      setLocalLoading(true)
      const data = await apiFetch<Encounter[]>(`/encounters?date=${today}&status=berlangsung`)
      return data || []
    } catch {
      toast.error('Gagal memuat data kunjungan')
      return []
    } finally {
      setLocalLoading(false)
    }
  }, [])

  const [encounters, setEncounters] = useState<Encounter[]>([])

  useEffect(() => {
    fetchEncounters().then(setEncounters)
  }, [fetchEncounters])

  function openEncounter(enc: Encounter) {
    setSelectedEncounter(enc)
  }

  function handleSoapLocked() {
    // Refresh encounters
    fetchEncounters().then(setEncounters)
    setSelectedEncounter(null)
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="size-5 text-[#0E73F6]" /> Pelayanan Klinis
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola kunjungan, asesmen, dan SOAP pasien
          </p>
        </div>
      </div>

      {selectedEncounter ? (
        <SOAPForm
          encounterId={selectedEncounter.id}
          patientName={selectedEncounter.patient?.fullName || ''}
          patientRmNumber={selectedEncounter.patient?.rmNumber || ''}
          patientGender={selectedEncounter.patient?.gender || ''}
          existingSoap={selectedEncounter.soapNotes?.[0] || null}
          existingDiagnoses={selectedEncounter.diagnoses || []}
          existingVitalSigns={selectedEncounter.vitalSigns || []}
          isLocked={selectedEncounter.soapNotes?.[0]?.isLocked || false}
          onLocked={handleSoapLocked}
          onBack={() => setSelectedEncounter(null)}
        />
      ) : localLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : encounters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0E73F6]/10 mb-4">
              <Stethoscope className="size-8 text-[#0E73F6]" />
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
            <Card
              key={enc.id}
              className="cursor-pointer hover:border-[#0E73F6]/50 transition-colors"
              onClick={() => openEncounter(enc)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#0E73F6]/10 text-[#0E73F6] font-bold text-sm">
                    {enc.patient?.fullName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{enc.patient?.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {enc.patient?.rmNumber} &middot; {enc.chiefComplaint || 'Tidak ada keluhan'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {enc.soapNotes && enc.soapNotes.length > 0 && enc.soapNotes[0].isLocked ? (
                    <Badge className="gap-1 bg-[#0E73F6]">
                      <Lock className="size-3" /> Selesai
                    </Badge>
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
    </div>
  )
}
