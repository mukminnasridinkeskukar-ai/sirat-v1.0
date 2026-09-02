// ==============================================
// RME Type Definitions
// Compliance: Permenkes No. 24 Tahun 2022
// ==============================================

export type UserRole =
  | 'super_admin'
  | 'dokter_pj'
  | 'dokter'
  | 'perawat_bidan'
  | 'resepsionis_admin'
  | 'apoteker'

export interface Clinic {
  id: string
  name: string
  address: string
  phone: string
  sipDoctor: string
  logoUrl: string
  kopSurat: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  authUserId: string
  clinicId: string
  role: UserRole
  fullName: string
  sip: string
  str: string
  specialty: string
  isActive: boolean
  clinic?: Clinic
}

export interface Patient {
  id: string
  clinicId: string
  rmNumber: string
  nik: string
  fullName: string
  birthPlace: string
  birthDate: string | null
  gender: string
  address: string
  phone: string
  allergies: string
  medicalHistory: string
  emergencyContact: string
  emergencyPhone: string
  bloodType: string
  createdAt: string
  updatedAt: string
  encounters?: Encounter[]
}

export interface Encounter {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  encounterDate: string
  encounterType: string
  status: string
  chiefComplaint: string
  notes: string
  createdAt: string
  updatedAt: string
  patient?: Patient
  doctor?: UserProfile
  vitalSigns?: VitalSign[]
  soapNotes?: SoapNote[]
  diagnoses?: Diagnosis[]
  procedures?: Procedure[]
  prescriptions?: Prescription[]
  labResults?: LabResult[]
}

export interface VitalSign {
  id: string
  encounterId: string
  nurseId: string
  systolic: number
  diastolic: number
  heartRate: number
  respiratoryRate: number
  temperature: number
  weight: number
  height: number
  oxygenSat: number
  painScale: number
  notes: string
  createdAt: string
}

export interface SoapNote {
  id: string
  encounterId: string
  doctorId: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  instructions: string
  isLocked: boolean
  lockedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Diagnosis {
  id: string
  encounterId: string
  icd10Code: string
  icd10Name: string
  diagnosisType: 'primer' | 'sekunder'
  notes: string
}

export interface Procedure {
  id: string
  encounterId: string
  icd9Code: string
  icd9Name: string
  notes: string
}

export interface Prescription {
  id: string
  encounterId: string
  prescriptionNo: string
  prescriptionDate: string
  isCompound: boolean
  notes: string
  status: string
  prescriptionItems?: PrescriptionItem[]
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  medicineId: string
  medicineName: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  notes: string
  isCompound: boolean
}

export interface Medicine {
  id: string
  clinicId: string
  name: string
  genericName: string
  category: string
  unit: string
  stock: number
  price: number
  dosageForm: string
  contraindications: string
  interactions: string
  isActive: boolean
}

export interface LabResult {
  id: string
  encounterId: string
  labType: string
  result: string
  normalRange: string
  isAbnormal: boolean
  fileUrl: string
  notes: string
}

export interface ConsentForm {
  id: string
  encounterId: string
  consentType: string
  content: string
  patientSignature: string
  doctorSignature: string
  signedAt: string | null
}

export interface Invoice {
  id: string
  clinicId: string
  encounterId: string
  patientId: string
  invoiceNo: string
  invoiceDate: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  paymentStatus: string
  paidAt: string | null
  notes: string
  patient?: Patient
  invoiceItems?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  itemType: string
  itemName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Queue {
  id: string
  clinicId: string
  patientId: string
  queueNumber: number
  queueDate: string
  status: 'menunggu' | 'dipanggil' | 'sedang_diperiksa' | 'selesai' | 'dibatalkan'
  queueType: 'walk_in' | 'appointment'
  encounterId: string
  notes: string
  patient?: Patient
}

export interface AuditLog {
  id: string
  clinicId: string
  userId: string
  userName: string
  action: string
  tableName: string
  recordId: string
  oldData: string
  newData: string
  ipAddress: string
  createdAt: string
}

export interface Icd10 {
  id: string
  code: string
  name: string
  category: string
}

export interface Icd9Cm {
  id: string
  code: string
  name: string
  category: string
}

export interface DailyVisitReport {
  date: string
  totalVisits: number
  completedVisits: number
  activeQueues: number
}

export interface TopDiseaseReport {
  icd10Code: string
  icd10Name: string
  count: number
}

export interface RevenueReport {
  period: string
  totalRevenue: number
  paidAmount: number
  unpaidAmount: number
}

// Form types
export interface PatientFormData {
  nik: string
  fullName: string
  birthPlace: string
  birthDate: string
  gender: string
  address: string
  phone: string
  allergies: string
  medicalHistory: string
  emergencyContact: string
  emergencyPhone: string
  bloodType: string
}

export interface SoapFormData {
  subjective: string
  objective: string
  assessment: string
  plan: string
  instructions: string
}

export interface VitalSignFormData {
  systolic: number
  diastolic: number
  heartRate: number
  respiratoryRate: number
  temperature: number
  weight: number
  height: number
  oxygenSat: number
  painScale: number
  notes: string
}

// Navigation
export type AppPage =
  | 'login'
  | 'dashboard'
  | 'pasien'
  | 'pasien-detail'
  | 'antrian'
  | 'pelayanan'
  | 'pelayanan-soap'
  | 'resep'
  | 'billing'
  | 'laporan'
  | 'audit'
  | 'master-obat'
  | 'pengaturan'
