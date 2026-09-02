'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLazyQuery } from '@apollo/client/react'
import { Search, User, X, Loader2, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GET_PATIENTS, SEARCH_ICD10 } from '@/lib/graphql/queries'
import { useAuthStore } from '@/stores'
import type { Patient } from '@/types'
import { cn } from '@/lib/utils'

interface PatientSearchProps {
  onSelect?: (patient: Patient) => void
  onNavigateToDetail?: (patientId: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  compact?: boolean
}

export default function PatientSearch({
  onSelect, onNavigateToDetail,
  placeholder = 'Cari NIK atau No. Rekam Medis...',
  className, autoFocus = false, compact = false,
}: PatientSearchProps) {
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [fetchPatients, { data, loading }] = useLazyQuery(GET_PATIENTS, {
    variables: { clinicId: user?.clinicId || '', search: '', limit: 20, offset: 0 },
  })

  // Derive dropdown visibility from query length and fetched data
  const patients = data?.patients || []
  const showDropdown = query.length >= 2 && (loading || patients.length > 0)

  useEffect(() => {
    if (query.length < 2) return
    const timer = setTimeout(() => {
      fetchPatients({ variables: { clinicId: user?.clinicId || '', search: `%${query}%`, limit: 20, offset: 0 } })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user?.clinicId, fetchPatients])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setQuery('')
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || patients.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((p) => Math.min(p + 1, patients.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((p) => Math.max(p - 1, 0)) }
    else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); handleSelect(patients[selectedIndex]) }
    else if (e.key === 'Escape') setQuery('')
  }

  function mapPatient(p: any): Patient {
    return { id: p.id, clinicId: p.clinic_id, rmNumber: p.rm_number, nik: p.nik_encrypted, fullName: p.full_name, birthPlace: p.birth_place, birthDate: p.birth_date, gender: p.gender, address: p.address, phone: p.phone, allergies: p.allergies, medicalHistory: p.medical_history, emergencyContact: p.emergency_contact, emergencyPhone: p.emergency_phone, bloodType: p.blood_type, createdAt: p.created_at, updatedAt: p.updated_at }
  }

  function handleSelect(p: any) {
    const patient = mapPatient(p)
    setQuery('')
    if (onSelect) onSelect(patient)
    if (onNavigateToDetail) onNavigateToDetail(patient.id)
  }

  function clear() { setQuery(''); inputRef.current?.focus() }

  function highlight(text: string, search: string) {
    if (!search) return text
    const idx = text.toLowerCase().indexOf(search.toLowerCase())
    if (idx === -1) return text
    return (<>{text.slice(0, idx)}<span className="font-semibold text-[#0E73F6] bg-blue-50 dark:bg-blue-950 rounded px-0.5">{text.slice(idx, idx + search.length)}</span>{text.slice(idx + search.length)}</>)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input ref={inputRef} type="text" placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} className={cn('pl-9 pr-9', compact ? 'h-9 text-sm' : 'h-11')} autoFocus={autoFocus} autoComplete="off" role="combobox" aria-expanded={showDropdown} aria-autocomplete="list" />
        {query && (<button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Hapus pencarian"><X className="size-4" /></button>)}
      </div>
      {showDropdown && (<div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-8 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Mencari pasien...</span></div>) : patients.length === 0 ? (<div className="flex flex-col items-center py-8 text-muted-foreground"><User className="size-8 mb-2 opacity-30" /><p className="text-sm">Tidak ada pasien ditemukan</p><p className="text-xs mt-1">Coba dengan NIK atau No. RM lain</p></div>) : (
          <ScrollArea className="max-h-80">
            <div className="p-1.5">
              <div className="px-2 py-1.5 mb-1"><span className="text-xs font-medium text-muted-foreground">{patients.length} pasien ditemukan</span></div>
              {patients.map((p: any, idx: number) => {
                const patient = mapPatient(p)
                const isSelected = idx === selectedIndex
                return (
                  <button key={p.id} onClick={() => handleSelect(p)} className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors', isSelected ? 'bg-[#0E73F6]/10 text-[#0E73F6]' : 'hover:bg-accent')} onMouseEnter={() => setSelectedIndex(idx)}>
                    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', isSelected ? 'bg-[#0E73F6] text-white' : 'bg-primary/10 text-primary')}>{patient.fullName.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{highlight(patient.fullName, query)}</span>
                        <Badge variant={patient.gender === 'L' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4 shrink-0">{patient.gender === 'L' ? 'L' : 'P'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{highlight(patient.rmNumber, query)}</span>
                        <span className="text-xs text-muted-foreground">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>)}
    </div>
  )
}

export function Icd10Autocomplete({ onSelect }: { onSelect: (icd: { code: string; name: string; id: string }) => void }) {
  const [search, setSearch] = useState('')
  const [searchIcd, { data, loading }] = useLazyQuery(SEARCH_ICD10, { variables: { search: '', limit: 15 } })

  const results = data?.icd10_codes || []
  const showDropdown = search.length >= 2 && (loading || results.length > 0)

  const handleSelect = useCallback((icd: { code: string; name: string; id: string }) => {
    onSelect(icd)
    setSearch('')
  }, [onSelect])

  const clearSearch = useCallback(() => setSearch(''), [])

  useEffect(() => {
    if (search.length < 2) return
    const t = setTimeout(() => { searchIcd({ variables: { search: `%${search}%`, limit: 15 } }) }, 300)
    return () => clearTimeout(t)
  }, [search, searchIcd])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Ketik kode atau nama penyakit (ICD-10)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-9" autoComplete="off" />
        {search && (<button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>)}
      </div>
      {showDropdown && (
        <ScrollArea className="absolute z-50 mt-1 w-full max-h-64 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="p-1.5">
            {loading ? (<div className="flex items-center justify-center py-6 gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Mencari...</span></div>) : results.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-6">Tidak ditemukan</p>) : (
              results.map((icd: any) => (
                <button key={icd.id} onClick={() => handleSelect({ code: icd.code, name: icd.name, id: icd.id })} className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent text-sm">
                  <Badge variant="secondary" className="shrink-0 mt-0.5 font-mono text-xs">{icd.code}</Badge>
                  <span>{icd.name}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
