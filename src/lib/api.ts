import type {
  Patient, Encounter, SoapNote, Prescription, Invoice, Queue, AuditLog, Medicine, Icd10,
  DailyVisitReport, TopDiseaseReport, RevenueReport, Clinic, UserProfile
} from '@/types'

const API_BASE = '/api'

// Helper to create headers with auth context
function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const raw = localStorage.getItem('rme_auth')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    const user = parsed.state?.user || parsed
    return {
      'Content-Type': 'application/json',
      'x-user-id': user.id || '',
      'x-clinic-id': user.clinicId || '',
      'x-user-role': user.role || '',
      'x-user-name': user.fullName || '',
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---- Patient API ----
export const patientApi = {
  list: (search?: string, page = 1, limit = 20) =>
    apiFetch<{ data: Patient[]; total: number }>(`/patients?search=${encodeURIComponent(search || '')}&page=${page}&limit=${limit}`),
  get: (id: string) => apiFetch<Patient>(`/patients/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ---- Encounter API ----
export const encounterApi = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch<Encounter[]>(`/encounters${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => apiFetch<Encounter>(`/encounters/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Encounter>('/encounters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Encounter>(`/encounters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
}

// ---- SOAP API ----
export const soapApi = {
  get: (encounterId: string) => apiFetch<SoapNote[]>(`/soap?encounterId=${encounterId}`),
  upsert: (data: Record<string, unknown>) =>
    apiFetch<SoapNote>('/soap', { method: 'POST', body: JSON.stringify(data) }),
}

// ---- Prescription API ----
export const prescriptionApi = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch<Prescription[]>(`/prescriptions${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<Prescription>('/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
}

// ---- Invoice API ----
export const invoiceApi = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch<Invoice[]>(`/invoices${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  markPaid: (id: string, data: Record<string, unknown>) =>
    apiFetch<Invoice>(`/invoices`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
}

// ---- Queue API ----
export const queueApi = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch<Queue[]>(`/queues${qs ? `?${qs}` : ''}`)
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<Queue>('/queues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Queue>('/queues', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
}

// ---- Medicine API ----
export const medicineApi = {
  list: (search?: string) =>
    apiFetch<Medicine[]>(`/medicines?search=${encodeURIComponent(search || '')}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<Medicine>('/medicines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<Medicine>('/medicines', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
}

// ---- Audit Log API ----
export const auditLogApi = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch<AuditLog[]>(`/audit-logs${qs ? `?${qs}` : ''}`)
  },
}

// ---- Report API ----
export const reportApi = {
  dailyVisits: (date: string) =>
    apiFetch<DailyVisitReport>(`/reports?type=daily-visits&date=${date}`),
  topDiseases: (period = 'month') =>
    apiFetch<TopDiseaseReport[]>(`/reports?type=top-diseases&period=${period}`),
  revenue: (period = 'month') =>
    apiFetch<RevenueReport>(`/reports?type=revenue&period=${period}`),
}

// ---- ICD API ----
export const icdApi = {
  search: (search: string, limit = 20) =>
    apiFetch<Icd10[]>(`/icd?search=${encodeURIComponent(search)}&limit=${limit}`),
}

// ---- Clinic API ----
export const clinicApi = {
  get: () => apiFetch<Clinic>('/clinic'),
  update: (data: Record<string, unknown>) =>
    apiFetch<Clinic>('/clinic', { method: 'POST', body: JSON.stringify(data) }),
}

// ---- Seed API ----
export const seedApi = {
  run: () => apiFetch<{ message: string }>('/seed', { method: 'POST' }),
}

// ---- Auth (demo) ----
export const authApi = {
  login: async (authUserId: string): Promise<UserProfile | null> => {
    const users = await apiFetch<UserProfile[]>(`/patients`) // we'll use a special approach
    return null
  },
}
