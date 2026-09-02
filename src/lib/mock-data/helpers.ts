import { DEMO_PATIENTS, DEMO_MEDICINES, DEMO_ICD10, DEMO_QUEUES, DEMO_ENCOUNTERS, DEMO_PRESCRIPTIONS, DEMO_INVOICES, DEMO_AUDIT_LOGS, DEMO_CLINIC } from './seed'

function mapPatient(p: any) {
  return { id: p.id, clinic_id: p.clinicId, rm_number: p.rmNumber, nik_encrypted: p.nik, full_name: p.fullName, birth_place: p.birthPlace, birth_date: p.birthDate, gender: p.gender, address: p.address, phone: p.phone, allergies: p.allergies, medical_history: p.medicalHistory, emergency_contact: p.emergencyContact, emergency_phone: p.emergencyPhone, blood_type: p.bloodType, created_at: p.createdAt, updated_at: p.updatedAt }
}

function mapMedicine(m: any) {
  return { id: m.id, name: m.name, generic_name: m.genericName, category: m.category, unit: m.unit, stock: m.stock, price: m.price, dosage_form: m.dosageForm, contraindications: m.contraindications, interactions: m.interactions, is_active: m.isActive }
}

function mapQueue(q: any) {
  return { id: q.id, patient_id: q.patientId, queue_number: q.queueNumber, queue_date: q.queueDate, status: q.status, queue_type: q.queueType, encounter_id: q.encounterId, notes: q.notes, created_at: new Date().toISOString(), patient: q.patient ? { id: q.patient.id, full_name: q.patient.fullName, rm_number: q.patient.rmNumber, gender: q.patient.gender } : null }
}

function mapEncounter(enc: any) {
  const patient = enc.patient ? { id: enc.patient.id, full_name: enc.patient.fullName, rm_number: enc.patient.rmNumber, gender: enc.patient.gender } : null
  const vitalSigns = (enc.vitalSigns || []).map((v: any) => ({ id: v.id, systolic: v.systolic, diastolic: v.diastolic, heart_rate: v.heartRate, respiratory_rate: v.respiratoryRate, temperature: v.temperature, weight: v.weight, height: v.height, oxygen_sat: v.oxygenSat, pain_scale: v.painScale, notes: v.notes }))
  const soapNotes = (enc.soapNotes || []).map((s: any) => ({ id: s.id, encounter_id: s.encounterId, doctor_id: s.doctorId, subjective: s.subjective, objective: s.objective, assessment: s.assessment, plan: s.plan, instructions: s.instructions, is_locked: s.isLocked, locked_at: s.lockedAt, created_at: s.createdAt, updated_at: s.updatedAt }))
  const diagnoses = (enc.diagnoses || []).map((d: any) => ({ id: d.id, icd10_code: d.icd10Code, icd10_name: d.icd10Name, diagnosis_type: d.diagnosisType, notes: d.notes }))
  return { id: enc.id, clinic_id: enc.clinicId, patient_id: enc.patientId, doctor_id: enc.doctorId, encounter_date: enc.encounterDate, encounter_type: enc.encounterType, status: enc.status, chief_complaint: enc.chiefComplaint, notes: enc.notes, created_at: enc.createdAt, patient, vital_signs: vitalSigns, soap_notes: soapNotes, diagnoses }
}

export function buildMockData() {
  return {
    patients: DEMO_PATIENTS.map(mapPatient),
    encounters: DEMO_ENCOUNTERS.map(mapEncounter),
    queues: DEMO_QUEUES.map(mapQueue),
    medicines: DEMO_MEDICINES.map(mapMedicine),
    icd10_codes: DEMO_ICD10.map(i => ({ id: i.id, code: i.code, name: i.name, category: i.category })),
    prescriptions: DEMO_PRESCRIPTIONS.map(rx => ({ id: rx.id, encounter_id: rx.encounterId, prescription_no: rx.prescriptionNo, prescription_date: rx.prescriptionDate, is_compound: rx.isCompound, notes: rx.notes, status: rx.status, created_at: new Date().toISOString(), encounter: { patient: { full_name: 'Demo', rm_number: 'RM-001' } }, prescription_items: (rx.prescriptionItems || []).map((i: any) => ({ id: i.id, medicine_name: i.medicineName, dose: i.dose, frequency: i.frequency, duration: i.duration, quantity: i.quantity, notes: i.notes })) })),
    invoices: DEMO_INVOICES.map(inv => ({ id: inv.id, encounter_id: inv.encounterId, patient_id: inv.patientId, invoice_no: inv.invoiceNo, invoice_date: inv.invoiceDate, subtotal: inv.subtotal, discount: inv.discount, total: inv.total, payment_method: inv.paymentMethod, payment_status: inv.paymentStatus, paid_at: inv.paidAt, notes: inv.notes, patient: inv.patient ? { full_name: inv.patient.fullName, rm_number: inv.patient.rmNumber } : null, invoice_items: (inv.invoiceItems || []).map((i: any) => ({ id: i.id, item_type: i.itemType, item_name: i.itemName, quantity: i.quantity, unit_price: i.unitPrice, total: i.total })) })),
    audit_logs: DEMO_AUDIT_LOGS.map(al => ({ id: al.id, user_id: al.userId, user_name: al.userName, action: al.action, table_name: al.tableName, record_id: al.recordId, old_data: al.oldData, new_data: al.newData, ip_address: al.ipAddress, created_at: al.createdAt })),
    clinics_by_pk: { id: DEMO_CLINIC.id, name: DEMO_CLINIC.name, address: DEMO_CLINIC.address, phone: DEMO_CLINIC.phone, sip_doctor: DEMO_CLINIC.sipDoctor, logo_url: DEMO_CLINIC.logoUrl, kop_surat: DEMO_CLINIC.kopSurat, is_active: DEMO_CLINIC.isActive, created_at: DEMO_CLINIC.createdAt, updated_at: DEMO_CLINIC.updatedAt },
    dashboard: { today_encounters: { aggregate: { count: 3 } }, today_queues: { aggregate: { count: 6 } }, active_queues: { aggregate: { count: 3 } }, completed_today: { aggregate: { count: 1 } }, unpaid_invoices: { aggregate: { count: 1 } }, total_patients: { aggregate: { count: 10 } } },
  }
}
