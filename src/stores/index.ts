import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppPage, UserProfile, Patient, Encounter, Queue, SoapNote } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  login: (user: UserProfile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'rme_auth' }
  )
)

interface UIState {
  currentPage: AppPage
  sidebarOpen: boolean
  selectedPatientId: string | null
  selectedEncounterId: string | null
  navigate: (page: AppPage) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedPatient: (id: string | null) => void
  setSelectedEncounter: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentPage: 'login',
      sidebarOpen: true,
      selectedPatientId: null,
      selectedEncounterId: null,
      navigate: (page) => set({ currentPage: page }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedPatient: (id) => set({ selectedPatientId: id }),
      setSelectedEncounter: (id) => set({ selectedEncounterId: id }),
    }),
    { name: 'rme_ui', partialize: (state) => ({ currentPage: state.currentPage }) }
  )
)

interface PatientState {
  patients: Patient[]
  selectedPatient: Patient | null
  searchQuery: string
  totalPatients: number
  setPatients: (patients: Patient[], total: number) => void
  setSelectedPatient: (patient: Patient | null) => void
  setSearchQuery: (q: string) => void
}

export const usePatientStore = create<PatientState>((set) => ({
  patients: [],
  selectedPatient: null,
  searchQuery: '',
  totalPatients: 0,
  setPatients: (patients, total) => set({ patients, totalPatients: total }),
  setSelectedPatient: (patient) => set({ selectedPatient: patient }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}))

interface QueueState {
  queues: Queue[]
  setQueues: (queues: Queue[]) => void
}

export const useQueueStore = create<QueueState>((set) => ({
  queues: [],
  setQueues: (queues) => set({ queues }),
}))

interface EncounterState {
  currentEncounter: Encounter | null
  currentSoap: SoapNote | null
  setCurrentEncounter: (encounter: Encounter | null) => void
  setCurrentSoap: (soap: SoapNote | null) => void
}

export const useEncounterStore = create<EncounterState>((set) => ({
  currentEncounter: null,
  currentSoap: null,
  setCurrentEncounter: (encounter) => set({ currentEncounter: encounter }),
  setCurrentSoap: (soap) => set({ currentSoap: soap }),
}))
