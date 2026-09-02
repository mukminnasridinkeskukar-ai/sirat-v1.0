import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// POST /api/seed — seed demo data (idempotent)
export async function POST(request: NextRequest) {
  try {
    // Check if already seeded by looking for the clinic
    const existingClinic = await db.clinic.findFirst({
      where: { name: 'Klinik Sehat Sejahtera' },
    })
    if (existingClinic) {
      return NextResponse.json({
        message: 'Data demo sudah ada (idempotent)',
        clinicId: existingClinic.id,
      })
    }

    // ============================================
    // 1. CLINIC
    // ============================================
    const clinic = await db.clinic.create({
      data: {
        name: 'Klinik Sehat Sejahtera',
        address: 'Jl. Merdeka No. 45, Kelurahan Sukamaju, Kecamatan Cilandak, Jakarta Selatan 12430',
        phone: '021-7654321',
        sipDoctor: '123/SP/DK/X/2020/1234',
        logoUrl: '',
        kopSurat: 'KLINIK SEHAT SEJAHTERA\nJl. Merdeka No. 45, Jakarta Selatan\nTelp: 021-7654321',
        isActive: true,
      },
    })

    // ============================================
    // 2. USERS (6 roles)
    // ============================================
    const usersData = [
      { authUserId: 'seed-super-admin', role: 'super_admin', fullName: 'Dr. Ahmad Fauzi, Sp.PD', sip: '123/SP/DK/X/2020/1234', str: '', specialty: 'Penyakit Dalam' },
      { authUserId: 'seed-dokter-pj', role: 'dokter_pj', fullName: 'Dr. Siti Rahmawati, Sp.OG', sip: '456/SP/OB/VI/2019/5678', str: '', specialty: 'Obstetri & Ginekologi' },
      { authUserId: 'seed-dokter', role: 'dokter', fullName: 'Dr. Budi Santoso', sip: '789/SP/UM/I/2021/9012', str: '', specialty: 'Umum' },
      { authUserId: 'seed-perawat', role: 'perawat_bidan', fullName: 'Ns. Dewi Lestari, S.Kep', sip: '', str: 'STR-2021-001', specialty: 'Keperawatan' },
      { authUserId: 'seed-resepsionis', role: 'resepsionis_admin', fullName: 'Rina Wulandari', sip: '', str: '', specialty: '' },
      { authUserId: 'seed-apoteker', role: 'apoteker', fullName: 'Apt. Hendra Wijaya, S.Farm', sip: '', str: 'STR-2020-002', specialty: 'Farmasi' },
    ]

    const users: Array<{ id: string; role: string; fullName: string }> = []
    for (const u of usersData) {
      const user = await db.userProfile.create({
        data: { ...u, clinicId: clinic.id, isActive: true },
      })
      users.push(user)
    }

    // ============================================
    // 3. ICD-10 CODES (30 common)
    // ============================================
    const icd10Data = [
      { code: 'J06.9', name: 'Infeksi saluran pernapasan atas, akut', category: 'ISPA' },
      { code: 'J00', name: 'Nasofaringitis akut (pilek biasa)', category: 'ISPA' },
      { code: 'J02.9', name: 'Faringitis akut, tidak spesifik', category: 'ISPA' },
      { code: 'J05.0', name: 'Laringitis akut', category: 'ISPA' },
      { code: 'J20.9', name: 'Bronkitis akut, tidak spesifik', category: 'ISPA' },
      { code: 'I10', name: 'Hipertensi esensial (primer)', category: 'Hipertensi' },
      { code: 'I11.9', name: 'Penyakit jantung hipertensif tanpa gagal jantung', category: 'Hipertensi' },
      { code: 'E11.9', name: 'Diabetes mellitus tipe 2 tanpa komplikasi', category: 'DM' },
      { code: 'E11.5', name: 'Diabetes mellitus tipe 2 dengan gangguan sirkulasi perifer', category: 'DM' },
      { code: 'E11.6', name: 'Diabetes mellitus tipe 2 dengan komplikasi lain', category: 'DM' },
      { code: 'A09', name: 'Diare dan gastroenteritis yang diduga berasal dari infeksi', category: 'Diare' },
      { code: 'K29.0', name: 'Gastritis akut (hemoragik)', category: 'GI' },
      { code: 'K29.7', name: 'Gastritis, tidak spesifik', category: 'GI' },
      { code: 'K21.0', name: 'Gastroesofageal reflux dengan esofagitis', category: 'GI' },
      { code: 'M54.5', name: 'Nyeri punggung bawah', category: 'Muskuloskeletal' },
      { code: 'M79.3', name: 'Pannikulitis, tidak spesifik', category: 'Muskuloskeletal' },
      { code: 'J45.9', name: 'Asma, tidak spesifik', category: 'Pernapasan' },
      { code: 'J18.9', name: 'Pneumonia, tidak spesifik', category: 'Pernapasan' },
      { code: 'N39.0', name: 'Infeksi saluran kemih, lokasi tidak spesifik', category: 'Urologi' },
      { code: 'B82.9', name: 'Helminthiasis usus, tidak spesifik', category: 'Parasit' },
      { code: 'L23.9', name: 'Dermatitis kontak alergi, penyebab tidak spesifik', category: 'Dermatologi' },
      { code: 'L30.9', name: 'Dermatitis, tidak spesifik', category: 'Dermatologi' },
      { code: 'R50.9', name: 'Demam, tidak spesifik', category: 'Umum' },
      { code: 'R51', name: 'Sakit kepala', category: 'Umum' },
      { code: 'H10.9', name: 'Konjungtivitis, tidak spesifik', category: 'Mata' },
      { code: 'H66.9', name: 'Otitis media, tidak spesifik', category: 'THT' },
      { code: 'K35.9', name: 'Apendisitis akut, tidak spesifik', category: 'GI' },
      { code: 'E78.5', name: 'Hiperlipidemia, tidak spesifik', category: 'Metabolik' },
      { code: 'E03.9', name: 'Hipotiroidisme, tidak spesifik', category: 'Endokrin' },
      { code: 'F41.1', name: 'Gangguan kecemasan generalisata', category: 'Psikiatri' },
    ]

    for (const icd of icd10Data) {
      await db.icd10.create({ data: icd })
    }

    // ============================================
    // 4. PATIENTS (15 Indonesian names)
    // ============================================
    const patientsData = [
      { fullName: 'Siti Aminah', nik: '3174056789010002', gender: 'P', birthPlace: 'Jakarta', birthDate: '1985-03-15', phone: '081234567890', bloodType: 'O' },
      { fullName: 'Budi Prasetyo', nik: '3174056789010003', gender: 'L', birthPlace: 'Bandung', birthDate: '1990-07-22', phone: '081234567891', bloodType: 'A' },
      { fullName: 'Dewi Kartika', nik: '3174056789010004', gender: 'P', birthPlace: 'Surabaya', birthDate: '1978-11-03', phone: '081234567892', bloodType: 'B' },
      { fullName: 'Ahmad Hidayat', nik: '3174056789010005', gender: 'L', birthPlace: 'Yogyakarta', birthDate: '1965-01-10', phone: '081234567893', bloodType: 'AB' },
      { fullName: 'Sri Wahyuni', nik: '3174056789010006', gender: 'P', birthPlace: 'Semarang', birthDate: '1995-05-28', phone: '081234567894', bloodType: 'O' },
      { fullName: 'Rudi Hermawan', nik: '3174056789010007', gender: 'L', birthPlace: 'Medan', birthDate: '1982-09-14', phone: '081234567895', bloodType: 'A' },
      { fullName: 'Nurul Fadhilah', nik: '3174056789010008', gender: 'P', birthPlace: 'Makassar', birthDate: '2000-12-01', phone: '081234567896', bloodType: 'B' },
      { fullName: 'Hendra Gunawan', nik: '3174056789010009', gender: 'L', birthPlace: 'Palembang', birthDate: '1972-04-17', phone: '081234567897', bloodType: 'O' },
      { fullName: 'Lina Marlina', nik: '3174056789010010', gender: 'P', birthPlace: 'Denpasar', birthDate: '1988-08-25', phone: '081234567898', bloodType: 'A' },
      { fullName: 'Agus Supriyadi', nik: '3174056789010011', gender: 'L', birthPlace: 'Malang', birthDate: '1993-02-09', phone: '081234567899', bloodType: 'B' },
      { fullName: 'Ratna Sari', nik: '3174056789010012', gender: 'P', birthPlace: 'Bogor', birthDate: '1980-06-30', phone: '081234567800', bloodType: 'O' },
      { fullName: 'Dwi Putranto', nik: '3174056789010013', gender: 'L', birthPlace: 'Tangerang', birthDate: '1998-10-11', phone: '081234567801', bloodType: 'AB' },
      { fullName: 'Yuliani', nik: '3174056789010014', gender: 'P', birthPlace: 'Bekasi', birthDate: '1975-07-19', phone: '081234567802', bloodType: 'A' },
      { fullName: 'Fajar Nugroho', nik: '3174056789010015', gender: 'L', birthPlace: 'Depok', birthDate: '2001-11-27', phone: '081234567803', bloodType: 'B' },
      { fullName: 'Mega Puspita', nik: '3174056789010016', gender: 'P', birthPlace: 'Solo', birthDate: '1987-04-05', phone: '081234567804', bloodType: 'O' },
    ]

    const patients: Array<{ id: string; rmNumber: string }> = []
    for (let i = 0; i < patientsData.length; i++) {
      const p = patientsData[i]
      const rmNumber = `RM-2025-${String(i + 1).padStart(4, '0')}`
      const patient = await db.patient.create({
        data: {
          clinicId: clinic.id,
          rmNumber,
          nik: p.nik,
          nikHash: createHash('sha256').update(p.nik).digest('hex'),
          fullName: p.fullName,
          birthPlace: p.birthPlace,
          birthDate: new Date(p.birthDate),
          gender: p.gender,
          address: 'Jakarta',
          phone: p.phone,
          bloodType: p.bloodType,
          allergies: '[]',
          medicalHistory: '[]',
          createdBy: users[0].id,
        },
      })
      patients.push(patient)
    }

    // ============================================
    // 5. MEDICINES (20 common)
    // ============================================
    const medicinesData = [
      { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Analgesik', unit: 'tablet', stock: 500, price: 3500, dosageForm: 'Tablet' },
      { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotik', unit: 'kapsul', stock: 300, price: 8000, dosageForm: 'Kapsul' },
      { name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', category: 'Antibiotik', unit: 'tablet', stock: 200, price: 12000, dosageForm: 'Tablet' },
      { name: 'Amlodipine 5mg', genericName: 'Amlodipin Besilat', category: 'Antihipertensi', unit: 'tablet', stock: 400, price: 6000, dosageForm: 'Tablet' },
      { name: 'Metformin 500mg', genericName: 'Metformin HCl', category: 'Antidiabetik', unit: 'tablet', stock: 350, price: 4500, dosageForm: 'Tablet' },
      { name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Antasida', unit: 'kapsul', stock: 250, price: 5500, dosageForm: 'Kapsul' },
      { name: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', category: 'Antihistamin', unit: 'tablet', stock: 300, price: 4000, dosageForm: 'Tablet' },
      { name: 'Salbutamol 2mg', genericName: 'Salbutamol Sulfat', category: 'Bronkodilator', unit: 'tablet', stock: 150, price: 5000, dosageForm: 'Tablet' },
      { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'NSAID', unit: 'tablet', stock: 300, price: 5000, dosageForm: 'Tablet' },
      { name: 'Cotrimoxazole 480mg', genericName: 'Cotrimoxazole', category: 'Antibiotik', unit: 'tablet', stock: 200, price: 6000, dosageForm: 'Tablet' },
      { name: 'Loperamide 2mg', genericName: 'Loperamide HCl', category: 'Antidiare', unit: 'kapsul', stock: 200, price: 3500, dosageForm: 'Kapsul' },
      { name: 'Oralit (ORS)', genericName: 'Garam Oralit', category: 'Rehidrasi', unit: 'sachet', stock: 500, price: 2000, dosageForm: 'Bubuk' },
      { name: 'Dexamethasone 0.5mg', genericName: 'Dexamethasone', category: 'Kortikosteroid', unit: 'tablet', stock: 150, price: 3000, dosageForm: 'Tablet' },
      { name: 'Antasida (Maalox)', genericName: 'Magnesium Hidroksida + Alumunium Hidroksida', category: 'Antasida', unit: 'suspensi', stock: 100, price: 15000, dosageForm: 'Suspensi' },
      { name: 'Simvastatin 20mg', genericName: 'Simvastatin', category: 'Hipolipidemik', unit: 'tablet', stock: 200, price: 7000, dosageForm: 'Tablet' },
      { name: 'Losartan 50mg', genericName: 'Losartan Kalium', category: 'Antihipertensi', unit: 'tablet', stock: 250, price: 8000, dosageForm: 'Tablet' },
      { name: 'Metronidazole 500mg', genericName: 'Metronidazole', category: 'Antibiotik', unit: 'tablet', stock: 200, price: 5000, dosageForm: 'Tablet' },
      { name: 'Ranitidine 150mg', genericName: 'Ranitidine HCl', category: 'H2 Blocker', unit: 'tablet', stock: 150, price: 6000, dosageForm: 'Tablet' },
      { name: 'Mefenamic Acid 500mg', genericName: 'Asam Mefenamat', category: 'NSAID', unit: 'kapsul', stock: 200, price: 4500, dosageForm: 'Kapsul' },
      { name: 'Vitamin C 1000mg', genericName: 'Asam Askorbat', category: 'Vitamin', unit: 'tablet', stock: 1000, price: 2500, dosageForm: 'Tablet Hisap' },
    ]

    const medicines: Array<{ id: string; name: string; stock: number }> = []
    for (const m of medicinesData) {
      const med = await db.medicine.create({
        data: { ...m, clinicId: clinic.id, isActive: true, createdBy: users[5].id },
      })
      medicines.push(med)
    }

    // ============================================
    // 6. ENCOUNTERS + SOAP (5 sample)
    // ============================================
    const encountersData = [
      { patientIdx: 0, doctorIdx: 2, type: 'rawat_jalan', status: 'selesai', chiefComplaint: 'Batuk pilek 3 hari, demam ringan', soap: { subjective: 'Pasien mengeluh batuk pilek sejak 3 hari yang lalu disertai demam ringan. Tidak ada sesak napas.', objective: 'Tampak tidak lemah. TD 120/80 mmHg, N 80x/mnt, RR 20x/mnt, S 37.5°C. Faring hiperemis ringan.', assessment: 'ISPA (J06.9)', plan: 'Paracetamol 3x1, Istirahat cukup, Minum air putih banyak' } },
      { patientIdx: 1, doctorIdx: 2, type: 'rawat_jalan', status: 'selesai', chiefComplaint: 'Tekanan darah tinggi terdeteksi saat pemeriksaan rutin', soap: { subjective: 'Pasien datang untuk pemeriksaan rutin. Tidak ada keluhan. Riwayat hipertensi keluarga (+).', objective: 'TD 150/95 mmHg, N 76x/mnt, RR 18x/mnt, S 36.5°C. BB 78 kg, TB 170 cm. IMT 27.', assessment: 'Hipertensi Grade 1 (I10)', plan: 'Amlodipine 5mg 1x1 pagi, Diet rendah garam, Kontrol 2 minggu lagi' } },
      { patientIdx: 2, doctorIdx: 1, type: 'rawat_jalan', status: 'selesai', chiefComplaint: 'Nyeri ulu hati dan mual setelah makan', soap: { subjective: 'Pasien mengeluh nyeri ulu hati dan mual yang sering muncul setelah makan sejak 1 minggu lalu. Riwayat maag (+).', objective: 'TD 110/70 mmHg, N 80x/mnt, RR 18x/mnt, S 36.6°C. Epigastrium teraba nyeri tekan ringan.', assessment: 'Gastritis akut (K29.0)', plan: 'Omeprazole 2x1, Antasida 3x1, Diet teratur, Hindari makanan pedas/asam' } },
      { patientIdx: 3, doctorIdx: 2, type: 'rawat_jalan', status: 'selesai', chiefComplaint: 'Gula darah tinggi saat pemeriksaan lab', soap: { subjective: 'Pasien diketahui DM tipe 2 sejak 2 tahun lalu. Kontrol rutin. Obat diminum teratur. Kadang masih merasa haus dan sering BAK.', objective: 'TD 130/80 mmHg, N 82x/mnt, RR 18x/mnt, S 36.4°C. BB 68 kg, TB 165 cm. Luka kaki kiri kering (-).', assessment: 'DM Tipe 2 (E11.9)', plan: 'Metformin 500mg 2x1, Diet DM, Olahraga rutin 30 menit/hari, Kontrol 1 bulan' } },
      { patientIdx: 4, doctorIdx: 2, type: 'rawat_jalan', status: 'berlangsung', chiefComplaint: 'Batuk berdahak dan sesak napas sejak 5 hari', soap: { subjective: 'Pasien mengeluh batuk berdahak dan sesak napas sejak 5 hari. Riwayat asma (-). Tidak ada riwayat alergi.', objective: 'TD 115/75 mmHg, N 90x/mnt, RR 24x/mnt, S 38.2°C. Auskultasi: ronki basah kanan bawah.', assessment: 'Bronkitis akut (J20.9)', plan: 'Ciprofloxacin 500mg 2x1, Paracetamol 3x1, Salbutamol 3x1, Evaluasi 3 hari' } },
    ]

    const encounterIcdMap = ['J06.9', 'I10', 'K29.0', 'E11.9', 'J20.9']
    const encounterIcdNameMap = ['Infeksi saluran pernapasan atas, akut', 'Hipertensi esensial (primer)', 'Gastritis akut (hemoragik)', 'Diabetes mellitus tipe 2 tanpa komplikasi', 'Bronkitis akut, tidak spesifik']

    for (let i = 0; i < encountersData.length; i++) {
      const enc = encountersData[i]
      const patient = patients[enc.patientIdx]
      const doctor = users[enc.doctorIdx]

      const dateOffset = encountersData.length - i
      const encDate = new Date()
      encDate.setDate(encDate.getDate() - dateOffset)
      encDate.setHours(9 + i, 0, 0, 0)

      const encounter = await db.encounter.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          doctorId: doctor.id,
          encounterDate: encDate,
          encounterType: enc.type,
          status: enc.status,
          chiefComplaint: enc.chiefComplaint,
          notes: '',
          createdBy: doctor.id,
        },
      })

      // SOAP Note
      await db.soapNote.create({
        data: {
          encounterId: encounter.id,
          clinicId: clinic.id,
          doctorId: doctor.id,
          subjective: enc.soap.subjective,
          objective: enc.soap.objective,
          assessment: enc.soap.assessment,
          plan: enc.soap.plan,
          instructions: '',
          isLocked: enc.status === 'selesai',
          lockedAt: enc.status === 'selesai' ? new Date() : null,
          createdBy: doctor.id,
        },
      })

      // Diagnosis
      await db.diagnosis.create({
        data: {
          encounterId: encounter.id,
          clinicId: clinic.id,
          icd10Code: encounterIcdMap[i],
          icd10Name: encounterIcdNameMap[i],
          diagnosisType: 'primer',
          createdBy: doctor.id,
        },
      })

      // Prescription (for completed encounters)
      if (enc.status === 'selesai') {
        const prescriptionItems: Array<Record<string, unknown>> = []
        if (i === 0) {
          prescriptionItems.push({ medicineId: medicines[0].id, medicineName: 'Paracetamol 500mg', dose: '500mg', frequency: '3x sehari', duration: '3 hari', quantity: 9 })
          prescriptionItems.push({ medicineId: medicines[19].id, medicineName: 'Vitamin C 1000mg', dose: '1000mg', frequency: '1x sehari', duration: '5 hari', quantity: 5 })
        } else if (i === 1) {
          prescriptionItems.push({ medicineId: medicines[3].id, medicineName: 'Amlodipine 5mg', dose: '5mg', frequency: '1x sehari (pagi)', duration: '30 hari', quantity: 30 })
        } else if (i === 2) {
          prescriptionItems.push({ medicineId: medicines[5].id, medicineName: 'Omeprazole 20mg', dose: '20mg', frequency: '2x sehari', duration: '14 hari', quantity: 28 })
          prescriptionItems.push({ medicineId: medicines[13].id, medicineName: 'Antasida (Maalox)', dose: '10ml', frequency: '3x sehari', duration: '7 hari', quantity: 21 })
        } else if (i === 3) {
          prescriptionItems.push({ medicineId: medicines[4].id, medicineName: 'Metformin 500mg', dose: '500mg', frequency: '2x sehari', duration: '30 hari', quantity: 60 })
        }

        if (prescriptionItems.length > 0) {
          await db.prescription.create({
            data: {
              encounterId: encounter.id,
              clinicId: clinic.id,
              prescriptionNo: `RX-2025-${String(i + 1).padStart(4, '0')}`,
              prescriptionDate: encDate,
              isCompound: false,
              notes: '',
              status: 'aktif',
              createdBy: doctor.id,
              prescriptionItems: { create: prescriptionItems.map(item => ({ ...item, createdBy: doctor.id })) },
            },
          })
        }
      }

      // Vital Signs
      await db.vitalSign.create({
        data: {
          encounterId: encounter.id,
          clinicId: clinic.id,
          nurseId: users[3].id,
          systolic: [120, 150, 110, 130, 115][i],
          diastolic: [80, 95, 70, 80, 75][i],
          heartRate: [80, 76, 80, 82, 90][i],
          respiratoryRate: [20, 18, 18, 18, 24][i],
          temperature: [37.5, 36.5, 36.6, 36.4, 38.2][i],
          weight: [55, 78, 60, 68, 52][i],
          height: [158, 170, 155, 165, 160][i],
          oxygenSat: 98,
          painScale: 2,
          notes: '',
          createdBy: users[3].id,
        },
      })
    }

    // ============================================
    // 7. QUEUES (3 sample)
    // ============================================
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 3; i++) {
      const status = ['selesai', 'sedang_diperiksa', 'menunggu'][i]
      await db.queue.create({
        data: {
          clinicId: clinic.id,
          patientId: patients[i + 5].id,
          queueNumber: i + 1,
          queueDate: new Date(),
          status,
          queueType: 'walk_in',
          notes: '',
          createdBy: users[4].id,
        },
      })
    }

    // ============================================
    // 8. INVOICES (2 sample)
    // ============================================
    const invoiceData = [
      { patientIdx: 0, items: [{ itemType: 'tindakan', itemName: 'Konsultasi Dokter Umum', quantity: 1, unitPrice: 150000 }, { itemType: 'obat', itemName: 'Paracetamol 500mg 3x9', quantity: 9, unitPrice: 3500 }, { itemType: 'obat', itemName: 'Vitamin C 1000mg 1x5', quantity: 5, unitPrice: 2500 }] },
      { patientIdx: 1, items: [{ itemType: 'tindakan', itemName: 'Konsultasi Dokter Umum', quantity: 1, unitPrice: 150000 }, { itemType: 'lab', itemName: 'Gula Darah Sewaktu', quantity: 1, unitPrice: 35000 }, { itemType: 'obat', itemName: 'Amlodipine 5mg 1x30', quantity: 30, unitPrice: 6000 }] },
    ]

    for (let i = 0; i < invoiceData.length; i++) {
      const inv = invoiceData[i]
      const patient = patients[inv.patientIdx]
      const items = inv.items
      const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0)

      await db.invoice.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          encounterId: '',
          invoiceNo: `INV-2025-${String(i + 1).padStart(4, '0')}`,
          invoiceDate: new Date(),
          subtotal,
          discount: 0,
          total: subtotal,
          paymentMethod: 'cash',
          paymentStatus: i === 0 ? 'lunas' : 'belum_bayar',
          paidAt: i === 0 ? new Date() : null,
          notes: '',
          createdBy: users[4].id,
          invoiceItems: {
            create: items.map(item => ({
              itemType: item.itemType,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
      })
    }

    return NextResponse.json({
      message: 'Data demo berhasil dibuat',
      clinicId: clinic.id,
      created: {
        clinic: 1,
        users: users.length,
        patients: patients.length,
        medicines: medicines.length,
        icd10Codes: icd10Data.length,
        encounters: encountersData.length,
        queues: 3,
        invoices: 2,
      },
    })
  } catch (error) {
    console.error('[POST /api/seed]', error)
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 })
  }
}
