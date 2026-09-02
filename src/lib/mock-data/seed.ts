import type {
  Patient, Encounter, VitalSign, SoapNote, Diagnosis,
  Queue, Medicine, Icd10, Invoice, InvoiceItem, AuditLog,
  Prescription, PrescriptionItem, Clinic, UserProfile
} from '@/types'

export const DEMO_CLINIC: Clinic = {
  id: 'demo-clinic-001',
  name: 'Klinik Sehat Sentosa',
  address: 'Jl. Merdeka No. 45, Jakarta Selatan',
  phone: '021-7654321',
  sipDoctor: '123.456.7.890.123456',
  logoUrl: '',
  kopSurat: 'Klinik Sehat Sentosa\nJl. Merdeka No. 45, Jakarta Selatan\nTelp: 021-7654321',
  isActive: true,
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
}

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-001', authUserId: 'auth-001', clinicId: DEMO_CLINIC.id,
    role: 'super_admin', fullName: 'Dr. Andi Pratama, Sp.PD',
    sip: '123.456.7.890.123456', str: '32.1.1.4567.8.23.12345',
    specialty: 'Penyakit Dalam', isActive: true, clinic: DEMO_CLINIC,
  },
  {
    id: 'usr-002', authUserId: 'auth-002', clinicId: DEMO_CLINIC.id,
    role: 'dokter', fullName: 'Dr. Siti Rahayu, Sp.KK',
    sip: '123.456.7.890.234567', str: '32.1.1.4567.8.23.23456',
    specialty: 'Kulit dan Kelamin', isActive: true, clinic: DEMO_CLINIC,
  },
  {
    id: 'usr-003', authUserId: 'auth-003', clinicId: DEMO_CLINIC.id,
    role: 'perawat_bidan', fullName: 'Ns. Dewi Lestari',
    sip: '', str: '87321001',
    specialty: 'Keperawatan', isActive: true, clinic: DEMO_CLINIC,
  },
  {
    id: 'usr-004', authUserId: 'auth-004', clinicId: DEMO_CLINIC.id,
    role: 'resepsionis_admin', fullName: 'Rina Wati',
    sip: '', str: '',
    specialty: 'Administrasi', isActive: true, clinic: DEMO_CLINIC,
  },
  {
    id: 'usr-005', authUserId: 'auth-005', clinicId: DEMO_CLINIC.id,
    role: 'apoteker', fullName: 'Apt. Budi Santoso',
    sip: '', str: '54321001',
    specialty: 'Farmasi', isActive: true, clinic: DEMO_CLINIC,
  },
]

export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'pat-001', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0001',
    nik: '3201010101800001', fullName: 'Budi Santoso',
    birthPlace: 'Jakarta', birthDate: '1980-01-01', gender: 'L',
    address: 'Jl. Sudirman No. 10, Jakarta Selatan', phone: '081234567890',
    allergies: 'Tidak ada', medicalHistory: 'Hipertensi 2 tahun',
    emergencyContact: 'Ani Santoso', emergencyPhone: '081234567891',
    bloodType: 'O', createdAt: '2024-03-15T08:00:00.000Z', updatedAt: '2024-06-01T10:00:00.000Z',
  },
  {
    id: 'pat-002', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0002',
    nik: '3201010201850002', fullName: 'Sari Wulandari',
    birthPlace: 'Bandung', birthDate: '1985-02-15', gender: 'P',
    address: 'Jl. Gatot Subroto No. 5, Jakarta Selatan', phone: '081234567892',
    allergies: 'Penisilin', medicalHistory: 'DM Tipe 2',
    emergencyContact: 'Agus Wulandari', emergencyPhone: '081234567893',
    bloodType: 'A', createdAt: '2024-03-20T09:00:00.000Z', updatedAt: '2024-06-02T11:00:00.000Z',
  },
  {
    id: 'pat-003', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0003',
    nik: '3201010301750003', fullName: 'Ahmad Hidayat',
    birthPlace: 'Surabaya', birthDate: '1975-03-20', gender: 'L',
    address: 'Jl. Ahmad Yani No. 8, Jakarta Timur', phone: '081234567894',
    allergies: 'Sulfa', medicalHistory: 'Asma',
    emergencyContact: 'Siti Hidayat', emergencyPhone: '081234567895',
    bloodType: 'B', createdAt: '2024-04-01T08:00:00.000Z', updatedAt: '2024-06-03T12:00:00.000Z',
  },
  {
    id: 'pat-004', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0004',
    nik: '3201010401900004', fullName: 'Rina Pertiwi',
    birthPlace: 'Semarang', birthDate: '1990-04-10', gender: 'P',
    address: 'Jl. Diponegoro No. 12, Jakarta Pusat', phone: '081234567896',
    allergies: 'Tidak ada', medicalHistory: '',
    emergencyContact: 'Dedi Pertiwi', emergencyPhone: '081234567897',
    bloodType: 'AB', createdAt: '2024-04-15T10:00:00.000Z', updatedAt: '2024-06-04T09:00:00.000Z',
  },
  {
    id: 'pat-005', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0005',
    nik: '3201010502000005', fullName: 'Dimas Prasetyo',
    birthPlace: 'Yogyakarta', birthDate: '2000-05-25', gender: 'L',
    address: 'Jl. Malioboro No. 3, Yogyakarta', phone: '081234567898',
    allergies: 'Tidak ada', medicalHistory: '',
    emergencyContact: 'Wahyu Prasetyo', emergencyPhone: '081234567899',
    bloodType: 'O', createdAt: '2024-05-01T08:00:00.000Z', updatedAt: '2024-06-05T10:00:00.000Z',
  },
  {
    id: 'pat-006', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0006',
    nik: '3201010601950006', fullName: 'Linda Kusuma',
    birthPlace: 'Medan', birthDate: '1995-06-12', gender: 'P',
    address: 'Jl. Sudirman No. 20, Medan', phone: '081234567800',
    allergies: 'NSAID', medicalHistory: 'Maag kronis',
    emergencyContact: 'Budi Kusuma', emergencyPhone: '081234567801',
    bloodType: 'A', createdAt: '2024-05-10T09:00:00.000Z', updatedAt: '2024-06-06T11:00:00.000Z',
  },
  {
    id: 'pat-007', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0007',
    nik: '3201010701980007', fullName: 'Hendra Wijaya',
    birthPlace: 'Makassar', birthDate: '1998-07-08', gender: 'L',
    address: 'Jl. Pattimura No. 15, Makassar', phone: '081234567802',
    allergies: 'Tidak ada', medicalHistory: '',
    emergencyContact: 'Sri Wijaya', emergencyPhone: '081234567803',
    bloodType: 'B', createdAt: '2024-05-15T08:00:00.000Z', updatedAt: '2024-06-07T10:00:00.000Z',
  },
  {
    id: 'pat-008', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0008',
    nik: '3201010801680008', fullName: 'Sri Mulyani',
    birthPlace: 'Solo', birthDate: '1968-08-20', gender: 'P',
    address: 'Jl. Slamet Riyadi No. 7, Solo', phone: '081234567804',
    allergies: 'Tidak ada', medicalHistory: 'Hipertensi, DM Tipe 2',
    emergencyContact: 'Joko Mulyani', emergencyPhone: '081234567805',
    bloodType: 'O', createdAt: '2024-05-20T10:00:00.000Z', updatedAt: '2024-06-08T09:00:00.000Z',
  },
  {
    id: 'pat-009', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0009',
    nik: '3201010901550009', fullName: 'Bambang Soekarno',
    birthPlace: 'Malang', birthDate: '1955-09-03', gender: 'L',
    address: 'Jl. Ijen No. 22, Malang', phone: '081234567806',
    allergies: 'Aspirin', medicalHistory: 'Stroke 2022, Hipertensi',
    emergencyContact: 'Ratna Soekarno', emergencyPhone: '081234567807',
    bloodType: 'AB', createdAt: '2024-05-25T08:00:00.000Z', updatedAt: '2024-06-09T11:00:00.000Z',
  },
  {
    id: 'pat-010', clinicId: DEMO_CLINIC.id, rmNumber: 'RM-2024-0010',
    nik: '3201011002050010', fullName: 'Putri Amelia',
    birthPlace: 'Jakarta', birthDate: '2005-10-17', gender: 'P',
    address: 'Jl. Kemang Raya No. 4, Jakarta Selatan', phone: '081234567808',
    allergies: 'Tidak ada', medicalHistory: '',
    emergencyContact: 'Dian Amelia', emergencyPhone: '081234567809',
    bloodType: 'A', createdAt: '2024-06-01T08:00:00.000Z', updatedAt: '2024-06-10T10:00:00.000Z',
  },
]

export const DEMO_MEDICINES: Medicine[] = [
  { id: 'med-001', clinicId: DEMO_CLINIC.id, name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Analgesik', unit: 'tablet', stock: 500, price: 3500, dosageForm: 'Tablet', contraindications: 'Hepatopati berat', interactions: 'Warfarin', isActive: true },
  { id: 'med-002', clinicId: DEMO_CLINIC.id, name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotik', unit: 'kapsul', stock: 300, price: 8000, dosageForm: 'Kapsul', contraindications: 'Alergi penisilin', interactions: 'Allopurinol', isActive: true },
  { id: 'med-003', clinicId: DEMO_CLINIC.id, name: 'Amlodipin 10mg', genericName: 'Amlodipin', category: 'Antihipertensi', unit: 'tablet', stock: 200, price: 6000, dosageForm: 'Tablet', contraindications: 'Blok AV berat', interactions: 'Ketoconazole', isActive: true },
  { id: 'med-004', clinicId: DEMO_CLINIC.id, name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetik', unit: 'tablet', stock: 400, price: 4500, dosageForm: 'Tablet', contraindications: 'Asidosis laktat', interactions: 'Alkohol', isActive: true },
  { id: 'med-005', clinicId: DEMO_CLINIC.id, name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Antihistamin', unit: 'tablet', stock: 350, price: 3000, dosageForm: 'Tablet', contraindications: 'Hipersensitivitas', interactions: 'Sedatif', isActive: true },
  { id: 'med-006', clinicId: DEMO_CLINIC.id, name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'PPI', unit: 'kapsul', stock: 250, price: 5500, dosageForm: 'Kapsul', contraindications: '-', interactions: 'Diazepam, Warfarin', isActive: true },
  { id: 'med-007', clinicId: DEMO_CLINIC.id, name: 'Salbutamol 2mg', genericName: 'Salbutamol', category: 'Bronkodilator', unit: 'tablet', stock: 150, price: 4000, dosageForm: 'Tablet', contraindications: 'Takiaritmia', interactions: 'Beta blocker', isActive: true },
  { id: 'med-008', clinicId: DEMO_CLINIC.id, name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', category: 'Antibiotik', unit: 'tablet', stock: 200, price: 9000, dosageForm: 'Tablet', contraindications: 'Anak < 18 th', interactions: 'Antasid, Theofilin', isActive: true },
  { id: 'med-009', clinicId: DEMO_CLINIC.id, name: 'Loperamid 2mg', genericName: 'Loperamid', category: 'Antidiare', unit: 'kapsul', stock: 300, price: 2500, dosageForm: 'Kapsul', contraindications: 'Diare berdarah', interactions: '-', isActive: true },
  { id: 'med-010', clinicId: DEMO_CLINIC.id, name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', unit: 'tablet', stock: 400, price: 4000, dosageForm: 'Tablet', contraindications: 'Tukak lambung aktif', interactions: 'Warfarin, ASA', isActive: true },
  { id: 'med-011', clinicId: DEMO_CLINIC.id, name: 'CTM 4mg', genericName: 'Chlorpheniramin', category: 'Antihistamin', unit: 'tablet', stock: 500, price: 1500, dosageForm: 'Tablet', contraindications: 'Glaukoma', interactions: 'Sedatif, Alkohol', isActive: true },
  { id: 'med-012', clinicId: DEMO_CLINIC.id, name: 'Oralit', genericName: 'Oralit', category: 'Rehidrasi', unit: 'sachet', stock: 100, price: 2000, dosageForm: 'Serbuk', contraindications: '-', interactions: '-', isActive: true },
  { id: 'med-013', clinicId: DEMO_CLINIC.id, name: 'Zinc 20mg', genericName: 'Zinc Sulfat', category: 'Suplemen', unit: 'tablet', stock: 200, price: 3500, dosageForm: 'Tablet', contraindications: '-', interactions: '-', isActive: true },
  { id: 'med-014', clinicId: DEMO_CLINIC.id, name: 'Losartan 50mg', genericName: 'Losartan', category: 'Antihipertensi', unit: 'tablet', stock: 150, price: 8000, dosageForm: 'Tablet', contraindications: 'Kehamilan', interactions: 'NSAID, K-Sparing Diuretik', isActive: true },
  { id: 'med-015', clinicId: DEMO_CLINIC.id, name: 'Glimepiride 2mg', genericName: 'Glimepiride', category: 'Antidiabetik', unit: 'tablet', stock: 200, price: 7000, dosageForm: 'Tablet', contraindications: 'DKA', interactions: 'Sulfonamida', isActive: true },
]

export const DEMO_ICD10: Icd10[] = [
  { id: 'icd-001', code: 'J06.9', name: 'Infeksi saluran pernapasan atas, tidak spesifik', category: 'Infeksi' },
  { id: 'icd-002', code: 'I10', name: 'Hipertensi esensial (primer)', category: 'Sirkulasi' },
  { id: 'icd-003', code: 'E11.9', name: 'Diabetes melitus tipe 2 tanpa komplikasi', category: 'Endokrin' },
  { id: 'icd-004', code: 'K52.9', name: 'Gastroenteritis dan kolitis noninfeksius, tidak spesifik', category: 'Pencernaan' },
  { id: 'icd-005', code: 'J45.9', name: 'Asma, tidak spesifik', category: 'Pernapasan' },
  { id: 'icd-006', code: 'K21.0', name: 'Gastroesophageal reflux dengan esofagitis', category: 'Pencernaan' },
  { id: 'icd-007', code: 'M54.5', name: 'Nyeri punggung bawah', category: 'Muskuloskeletal' },
  { id: 'icd-008', code: 'J00', name: 'Nasofaringitis akut (pilek biasa)', category: 'Infeksi' },
  { id: 'icd-009', code: 'N39.0', name: 'Infeksi saluran kemih, lokasi tidak spesifik', category: 'Genitourinari' },
  { id: 'icd-010', code: 'L23.9', name: 'Dermatitis kontak alergi, penyebab tidak spesifik', category: 'Kulit' },
  { id: 'icd-011', code: 'R50.9', name: 'Demam, tidak spesifik', category: 'Umum' },
  { id: 'icd-012', code: 'H10.9', name: 'Konjungtivitis, tidak spesifik', category: 'Mata' },
  { id: 'icd-013', code: 'K29.7', name: 'Gastritis, tidak spesifik', category: 'Pencernaan' },
  { id: 'icd-014', code: 'I63.9', name: 'Infark serebral, tidak spesifik', category: 'Sirkulasi' },
  { id: 'icd-015', code: 'E78.5', name: 'Hiperlipidemia, tidak spesifik', category: 'Endokrin' },
  { id: 'icd-016', code: 'J02.9', name: 'Faringitis akut, tidak spesifik', category: 'Infeksi' },
  { id: 'icd-017', code: 'B35.1', name: 'Tinea ungui', category: 'Kulit' },
  { id: 'icd-018', code: 'G43.9', name: 'Migrain, tidak spesifik', category: 'Saraf' },
  { id: 'icd-019', code: 'F41.1', name: 'Gangguan kecemasan generalized', category: 'Mental' },
  { id: 'icd-020', code: 'E11.5', name: 'Diabetes melitus tipe 2 dengan gangguan sirkulasi perifer', category: 'Endokrin' },
  { id: 'icd-021', code: 'I25.1', name: 'Penyakit jantung aterosklerotik', category: 'Sirkulasi' },
  { id: 'icd-022', code: 'J18.9', name: 'Pneumonia, tidak spesifik', category: 'Pernapasan' },
  { id: 'icd-023', code: 'N30.0', name: 'Sistitis akut', category: 'Genitourinari' },
  { id: 'icd-024', code: 'L30.9', name: 'Dermatitis, tidak spesifik', category: 'Kulit' },
  { id: 'icd-025', code: 'M79.3', name: 'Pannikulitis, tidak spesifik', category: 'Muskuloskeletal' },
  { id: 'icd-026', code: 'R05', name: 'Batuk', category: 'Pernapasan' },
  { id: 'icd-027', code: 'D50.9', name: 'Anemia defisiensi besi, tidak spesifik', category: 'Darah' },
  { id: 'icd-028', code: 'E03.9', name: 'Hipotiroidisme, tidak spesifik', category: 'Endokrin' },
  { id: 'icd-029', code: 'K35.9', name: 'Apendisitis akut, tidak spesifik', category: 'Pencernaan' },
  { id: 'icd-030', code: 'A09', name: 'Diare dan gastroenteritis yang diduga berasal dari infeksi', category: 'Pencernaan' },
]

const today = new Date().toISOString().split('T')[0]

export const DEMO_QUEUES: Queue[] = [
  { id: 'q-001', clinicId: DEMO_CLINIC.id, patientId: 'pat-001', queueNumber: 1, queueDate: today, status: 'sedang_diperiksa', queueType: 'walk_in', encounterId: 'enc-001', notes: '', patient: DEMO_PATIENTS[0] },
  { id: 'q-002', clinicId: DEMO_CLINIC.id, patientId: 'pat-002', queueNumber: 2, queueDate: today, status: 'menunggu', queueType: 'walk_in', encounterId: 'enc-002', notes: '', patient: DEMO_PATIENTS[1] },
  { id: 'q-003', clinicId: DEMO_CLINIC.id, patientId: 'pat-003', queueNumber: 3, queueDate: today, status: 'menunggu', queueType: 'appointment', encounterId: '', notes: 'Kontrol asma', patient: DEMO_PATIENTS[2] },
  { id: 'q-004', clinicId: DEMO_CLINIC.id, patientId: 'pat-004', queueNumber: 4, queueDate: today, status: 'dipanggil', queueType: 'walk_in', encounterId: '', notes: '', patient: DEMO_PATIENTS[3] },
  { id: 'q-005', clinicId: DEMO_CLINIC.id, patientId: 'pat-005', queueNumber: 5, queueDate: today, status: 'menunggu', queueType: 'walk_in', encounterId: '', notes: '', patient: DEMO_PATIENTS[4] },
  { id: 'q-006', clinicId: DEMO_CLINIC.id, patientId: 'pat-006', queueNumber: 6, queueDate: today, status: 'selesai', queueType: 'walk_in', encounterId: 'enc-003', notes: '', patient: DEMO_PATIENTS[5] },
]

export const DEMO_ENCOUNTERS: Encounter[] = [
  {
    id: 'enc-001', clinicId: DEMO_CLINIC.id, patientId: 'pat-001', doctorId: 'usr-001',
    encounterDate: today, encounterType: 'rawat_jalan', status: 'berlangsung',
    chiefComplaint: 'Pusing kepala sejak 3 hari', notes: '',
    createdAt: `${today}T08:30:00.000Z`, updatedAt: `${today}T08:30:00.000Z`,
    patient: DEMO_PATIENTS[0],
    vitalSigns: [{
      id: 'vs-001', encounterId: 'enc-001', nurseId: 'usr-003',
      systolic: 160, diastolic: 100, heartRate: 80, respiratoryRate: 18,
      temperature: 36.5, weight: 78, height: 165, oxygenSat: 98, painScale: 2,
      notes: '', createdAt: `${today}T08:35:00.000Z`,
    }],
    soapNotes: [{
      id: 'soap-001', encounterId: 'enc-001', doctorId: 'usr-001',
      subjective: 'Sering pusing kepala sejak 1 minggu. Riwayat hipertensi 2 tahun, obat rutin tidak teratur.',
      objective: 'TD 160/100 mmHg, Nadi 80x/mnt, RR 18x/mnt, Suhu 36,5C. BB 78 kg, TB 165 cm. Jantung regular, tidak ada murmur.',
      assessment: 'Hipertensi esensial (I10)',
      plan: 'Amlodipin 10mg 1x1 pagi. Diet rendah garam, olahraga teratur.',
      instructions: 'Kontrol TD setiap hari, minum obat teratur.',
      isLocked: false, lockedAt: null,
      createdAt: `${today}T08:40:00.000Z`, updatedAt: `${today}T08:40:00.000Z`,
    }],
    diagnoses: [{ id: 'dx-001', encounterId: 'enc-001', icd10Code: 'I10', icd10Name: 'Hipertensi esensial (primer)', diagnosisType: 'primer', notes: '' }],
  },
  {
    id: 'enc-002', clinicId: DEMO_CLINIC.id, patientId: 'pat-002', doctorId: 'usr-002',
    encounterDate: today, encounterType: 'rawat_jalan', status: 'berlangsung',
    chiefComplaint: 'Batuk pilek 3 hari, demam', notes: '',
    createdAt: `${today}T09:00:00.000Z`, updatedAt: `${today}T09:00:00.000Z`,
    patient: DEMO_PATIENTS[1],
    vitalSigns: [], soapNotes: [], diagnoses: [],
  },
  {
    id: 'enc-003', clinicId: DEMO_CLINIC.id, patientId: 'pat-006', doctorId: 'usr-001',
    encounterDate: today, encounterType: 'rawat_jalan', status: 'selesai',
    chiefComplaint: 'Nyeri ulu hati', notes: '',
    createdAt: `${today}T07:00:00.000Z`, updatedAt: `${today}T07:45:00.000Z`,
    patient: DEMO_PATIENTS[5],
    vitalSigns: [{
      id: 'vs-003', encounterId: 'enc-003', nurseId: 'usr-003',
      systolic: 120, diastolic: 80, heartRate: 76, respiratoryRate: 16,
      temperature: 36.6, weight: 55, height: 160, oxygenSat: 99, painScale: 3,
      notes: '', createdAt: `${today}T07:10:00.000Z`,
    }],
    soapNotes: [{
      id: 'soap-003', encounterId: 'enc-003', doctorId: 'usr-001',
      subjective: 'Nyeri ulu hati terutama setelah makan, 1 minggu. Riwayat maag kronis.',
      objective: 'TD 120/80, Nadi 76x/mnt, Suhu 36,6C. Abdomen: epigastrium nyeri tekan (+).',
      assessment: 'Gastritis (K29.7)',
      plan: 'Omeprazole 20mg 1x1 pagi sebelum makan selama 2 minggu.',
      instructions: 'Hindari makanan pedas, asam, dan kopi.',
      isLocked: true, lockedAt: `${today}T07:45:00.000Z`,
      createdAt: `${today}T07:20:00.000Z`, updatedAt: `${today}T07:45:00.000Z`,
    }],
    diagnoses: [{ id: 'dx-003', encounterId: 'enc-003', icd10Code: 'K29.7', icd10Name: 'Gastritis, tidak spesifik', diagnosisType: 'primer', notes: '' }],
  },
]

export const DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-001', encounterId: 'enc-003', prescriptionNo: 'R/2024-001',
    prescriptionDate: today, isCompound: false, notes: '', status: 'diberikan',
    prescriptionItems: [
      { id: 'rxi-001', prescriptionId: 'rx-001', medicineId: 'med-006', medicineName: 'Omeprazole 20mg', dose: '20mg', frequency: '1x1', duration: '14 hari', quantity: 14, notes: 'Sebelum makan', isCompound: false },
      { id: 'rxi-002', prescriptionId: 'rx-001', medicineId: 'med-003', medicineName: 'Sucralfate 500mg', dose: '500mg', frequency: '3x1', duration: '7 hari', quantity: 21, notes: '1 jam sebelum makan', isCompound: false },
    ],
  },
  {
    id: 'rx-002', encounterId: 'enc-001', prescriptionNo: 'R/2024-002',
    prescriptionDate: today, isCompound: false, notes: '', status: 'menunggu',
    prescriptionItems: [
      { id: 'rxi-003', prescriptionId: 'rx-002', medicineId: 'med-003', medicineName: 'Amlodipin 10mg', dose: '10mg', frequency: '1x1', duration: '30 hari', quantity: 30, notes: 'Pagi', isCompound: false },
    ],
  },
]

export const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv-001', clinicId: DEMO_CLINIC.id, encounterId: 'enc-003', patientId: 'pat-006',
    invoiceNo: 'INV/2024-001', invoiceDate: today, subtotal: 150000, discount: 0, total: 150000,
    paymentMethod: 'cash', paymentStatus: 'belum_bayar', paidAt: null, notes: '',
    patient: DEMO_PATIENTS[5],
    invoiceItems: [
      { id: 'ivi-001', invoiceId: 'inv-001', itemType: 'konsultasi', itemName: 'Biaya Konsultasi Dokter', quantity: 1, unitPrice: 100000, total: 100000 },
      { id: 'ivi-002', invoiceId: 'inv-001', itemType: 'obat', itemName: 'Omeprazole 20mg (14 tab)', quantity: 1, unitPrice: 35000, total: 35000 },
      { id: 'ivi-003', invoiceId: 'inv-001', itemType: 'obat', itemName: 'Sucralfate 500mg (21 tab)', quantity: 1, unitPrice: 15000, total: 15000 },
    ],
  },
]

export const DEMO_AUDIT_LOGS: AuditLog[] = [
  { id: 'al-001', clinicId: DEMO_CLINIC.id, userId: 'usr-001', userName: 'Dr. Andi Pratama, Sp.PD', action: 'INSERT', tableName: 'soap_notes', recordId: 'soap-003', oldData: '', newData: '{"assessment":"Gastritis"}', ipAddress: '192.168.1.10', createdAt: `${today}T07:20:00.000Z` },
  { id: 'al-002', clinicId: DEMO_CLINIC.id, userId: 'usr-001', userName: 'Dr. Andi Pratama, Sp.PD', action: 'UPDATE', tableName: 'soap_notes', recordId: 'soap-003', oldData: '{"is_locked":false}', newData: '{"is_locked":true}', ipAddress: '192.168.1.10', createdAt: `${today}T07:45:00.000Z` },
  { id: 'al-003', clinicId: DEMO_CLINIC.id, userId: 'usr-003', userName: 'Ns. Dewi Lestari', action: 'INSERT', tableName: 'vital_signs', recordId: 'vs-003', oldData: '', newData: '{"systolic":120,"diastolic":80}', ipAddress: '192.168.1.11', createdAt: `${today}T07:10:00.000Z` },
  { id: 'al-004', clinicId: DEMO_CLINIC.id, userId: 'usr-004', userName: 'Rina Wati', action: 'INSERT', tableName: 'queues', recordId: 'q-001', oldData: '', newData: '{"queue_number":1}', ipAddress: '192.168.1.12', createdAt: `${today}T08:00:00.000Z` },
]
