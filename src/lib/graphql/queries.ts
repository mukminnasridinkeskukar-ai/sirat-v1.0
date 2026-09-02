import { gql } from '@apollo/client'

// ========== PATIENTS ==========
export const GET_PATIENTS = gql`
  query GetPatients($search: String, $limit: Int, $offset: Int, $clinicId: uuid!) {
    patients(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          {
            _or: [
              { full_name: { _ilike: $search } },
              { rm_number: { _ilike: $search } },
              { nik_encrypted: { _ilike: $search } }
            ]
          }
        ]
      }
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      clinic_id
      rm_number
      nik_encrypted
      full_name
      birth_place
      birth_date
      gender
      address
      phone
      allergies
      medical_history
      emergency_contact
      emergency_phone
      blood_type
      created_at
      updated_at
    }
    patients_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          {
            _or: [
              { full_name: { _ilike: $search } },
              { rm_number: { _ilike: $search } },
              { nik_encrypted: { _ilike: $search } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_PATIENT_BY_ID = gql`
  query GetPatientById($id: uuid!) {
    patients_by_pk(id: $id) {
      id
      clinic_id
      rm_number
      nik_encrypted
      full_name
      birth_place
      birth_date
      gender
      address
      phone
      allergies
      medical_history
      emergency_contact
      emergency_phone
      blood_type
      created_at
      updated_at
      encounters(order_by: { created_at: desc }) {
        id
        encounter_date
        encounter_type
        status
        chief_complaint
        created_at
        soap_notes {
          id
          subjective
          objective
          assessment
          plan
          is_locked
          locked_at
          created_at
        }
        diagnoses {
          id
          icd10_code
          icd10_name
          diagnosis_type
        }
      }
    }
  }
`

export const INSERT_PATIENT = gql`
  mutation InsertPatient($object: patients_insert_input!) {
    insert_patients_one(object: $object) {
      id
      rm_number
      full_name
      created_at
    }
  }
`

export const UPDATE_PATIENT = gql`
  mutation UpdatePatient($id: uuid!, $_set: patients_set_input!) {
    update_patients_by_pk(pk_columns: { id: $id }, _set: $_set) {
      id
      full_name
      updated_at
    }
  }
`

// ========== ENCOUNTERS ==========
export const GET_ENCOUNTERS = gql`
  query GetEncounters($clinicId: uuid!, $date: date, $status: String) {
    encounters(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          { encounter_date: { _eq: $date } },
          { status: { _eq: $status } }
        ]
      }
      order_by: { created_at: desc }
    ) {
      id
      clinic_id
      patient_id
      doctor_id
      encounter_date
      encounter_type
      status
      chief_complaint
      notes
      created_at
      patient {
        id
        full_name
        rm_number
        gender
      }
      vital_signs {
        id
        systolic
        diastolic
        heart_rate
        respiratory_rate
        temperature
        weight
        height
        oxygen_sat
        pain_scale
        notes
      }
      soap_notes {
        id
        subjective
        objective
        assessment
        plan
        instructions
        is_locked
        locked_at
        created_at
        updated_at
      }
      diagnoses {
        id
        icd10_code
        icd10_name
        diagnosis_type
        notes
      }
    }
  }
`

export const INSERT_ENCOUNTER = gql`
  mutation InsertEncounter($object: encounters_insert_input!) {
    insert_encounters_one(object: $object) {
      id
      status
      created_at
    }
  }
`

export const UPDATE_ENCOUNTER = gql`
  mutation UpdateEncounter($id: uuid!, $_set: encounters_set_input!) {
    update_encounters_by_pk(pk_columns: { id: $id }, _set: $_set) {
      id
      status
      updated_at
    }
  }
`

// ========== VITAL SIGNS ==========
export const INSERT_VITAL_SIGN = gql`
  mutation InsertVitalSign($object: vital_signs_insert_input!) {
    insert_vital_signs_one(object: $object) {
      id
    }
  }
`

// ========== SOAP NOTES ==========
export const GET_SOAP_BY_ENCOUNTER = gql`
  query GetSoapByEncounter($encounterId: uuid!) {
    soap_notes(
      where: { encounter_id: { _eq: $encounterId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      encounter_id
      doctor_id
      subjective
      objective
      assessment
      plan
      instructions
      is_locked
      locked_at
      created_at
      updated_at
    }
  }
`

export const INSERT_SOAP_NOTE = gql`
  mutation InsertSoapNote($object: soap_notes_insert_input!) {
    insert_soap_notes_one(object: $object) {
      id
      is_locked
      created_at
    }
  }
`

export const UPDATE_SOAP_NOTE = gql`
  mutation UpdateSoapNote($id: uuid!, $_set: soap_notes_set_input!) {
    update_soap_notes_by_pk(pk_columns: { id: $id }, _set: $_set) {
      id
      is_locked
      locked_at
      updated_at
    }
  }
`

// ========== DIAGNOSES ==========
export const INSERT_DIAGNOSIS = gql`
  mutation InsertDiagnosis($object: diagnoses_insert_input!) {
    insert_diagnoses_one(object: $object) {
      id
    }
  }
`

export const DELETE_DIAGNOSIS = gql`
  mutation DeleteDiagnosis($id: uuid!) {
    delete_diagnoses_by_pk(id: $id) {
      id
    }
  }
`

// ========== ICD-10 ==========
export const SEARCH_ICD10 = gql`
  query SearchIcd10($search: String!, $limit: Int) {
    icd10_codes(
      where: {
        _or: [
          { code: { _ilike: $search } },
          { name: { _ilike: $search } }
        ]
      }
      limit: $limit
      order_by: { code: asc }
    ) {
      id
      code
      name
      category
    }
  }
`

// ========== MEDICINES ==========
export const GET_MEDICINES = gql`
  query GetMedicines($clinicId: uuid!, $search: String) {
    medicines(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          { _or: [
            { name: { _ilike: $search } },
            { generic_name: { _ilike: $search } }
          ]}
        ]
      }
      order_by: { name: asc }
    ) {
      id
      name
      generic_name
      category
      unit
      stock
      price
      dosage_form
      contraindications
      interactions
      is_active
    }
  }
`

export const GET_MEDICINE_BY_ID = gql`
  query GetMedicineById($id: uuid!) {
    medicines_by_pk(id: $id) {
      id
      name
      generic_name
      category
      unit
      stock
      price
      dosage_form
      contraindications
      interactions
      is_active
    }
  }
`

// ========== PRESCRIPTIONS ==========
export const GET_PRESCRIPTIONS = gql`
  query GetPrescriptions($clinicId: uuid!, $status: String) {
    prescriptions(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          { status: { _eq: $status } }
        ]
      }
      order_by: { created_at: desc }
    ) {
      id
      encounter_id
      prescription_no
      prescription_date
      is_compound
      notes
      status
      created_at
      encounter {
        patient {
          full_name
          rm_number
        }
      }
      prescription_items {
        id
        medicine_id
        medicine_name
        dose
        frequency
        duration
        quantity
        notes
        is_compound
      }
    }
  }
`

export const INSERT_PRESCRIPTION = gql`
  mutation InsertPrescription($object: prescriptions_insert_input!) {
    insert_prescriptions_one(object: $object) {
      id
      prescription_no
      created_at
    }
  }
`

export const INSERT_PRESCRIPTION_ITEM = gql`
  mutation InsertPrescriptionItem($object: prescription_items_insert_input!) {
    insert_prescription_items_one(object: $object) {
      id
    }
  }
`

// ========== QUEUES (Realtime via v_antrian_hari_ini) ==========
export const SUBSCRIBE_TODAY_QUEUES = gql`
  subscription SubscribeTodayQueues($clinicId: uuid!) {
    v_antrian_hari_ini(
      where: { clinic_id: { _eq: $clinicId } }
      order_by: { queue_number: asc }
    ) {
      id
      clinic_id
      patient_id
      queue_number
      queue_date
      status
      queue_type
      encounter_id
      notes
      patient {
        id
        full_name
        rm_number
        gender
      }
    }
  }
`

export const GET_QUEUES = gql`
  query GetQueues($clinicId: uuid!, $date: date!) {
    queues(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { queue_date: { _eq: $date } },
          { deleted_at: { _is_null: true } }
        ]
      }
      order_by: { queue_number: asc }
    ) {
      id
      patient_id
      queue_number
      queue_date
      status
      queue_type
      encounter_id
      notes
      created_at
      patient {
        id
        full_name
        rm_number
        gender
      }
    }
  }
`

export const INSERT_QUEUE = gql`
  mutation InsertQueue($object: queues_insert_input!) {
    insert_queues_one(object: $object) {
      id
      queue_number
      created_at
    }
  }
`

export const UPDATE_QUEUE = gql`
  mutation UpdateQueue($id: uuid!, $_set: queues_set_input!) {
    update_queues_by_pk(pk_columns: { id: $id }, _set: $_set) {
      id
      status
      updated_at
    }
  }
`

// ========== INVOICES ==========
export const GET_INVOICES = gql`
  query GetInvoices($clinicId: uuid!, $status: String) {
    invoices(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } },
          { payment_status: { _eq: $status } }
        ]
      }
      order_by: { created_at: desc }
    ) {
      id
      encounter_id
      patient_id
      invoice_no
      invoice_date
      subtotal
      discount
      total
      payment_method
      payment_status
      paid_at
      notes
      patient {
        full_name
        rm_number
      }
      invoice_items {
        id
        item_type
        item_name
        quantity
        unit_price
        total
      }
    }
  }
`

export const INSERT_INVOICE = gql`
  mutation InsertInvoice($object: invoices_insert_input!) {
    insert_invoices_one(object: $object) {
      id
      invoice_no
    }
  }
`

// ========== AUDIT LOGS ==========
export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($clinicId: uuid!, $limit: Int, $offset: Int) {
    audit_logs(
      where: { clinic_id: { _eq: $clinicId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      user_id
      user_name
      action
      table_name
      record_id
      old_data
      new_data
      ip_address
      created_at
    }
  }
`

// ========== CLINIC ==========
export const GET_CLINIC = gql`
  query GetClinic($id: uuid!) {
    clinics_by_pk(id: $id) {
      id
      name
      address
      phone
      sip_doctor
      logo_url
      kop_surat
      is_active
      created_at
      updated_at
    }
  }
`

// ========== DASHBOARD STATS ==========
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats($clinicId: uuid!, $today: date!) {
    today_encounters: encounters_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { encounter_date: { _eq: $today } },
          { deleted_at: { _is_null: true } }
        ]
      }
    ) {
      aggregate { count }
    }
    today_queues: queues_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { queue_date: { _eq: $today } },
          { deleted_at: { _is_null: true } },
          { status: { _neq: "dibatalkan" } }
        ]
      }
    ) {
      aggregate { count }
    }
    active_queues: queues_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { queue_date: { _eq: $today } },
          { status: { _eq: "menunggu" } },
          { deleted_at: { _is_null: true } }
        ]
      }
    ) {
      aggregate { count }
    }
    completed_today: encounters_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { encounter_date: { _eq: $today } },
          { status: { _eq: "selesai" } },
          { deleted_at: { _is_null: true } }
        ]
      }
    ) {
      aggregate { count }
    }
    unpaid_invoices: invoices_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { payment_status: { _eq: "belum_bayar" } },
          { deleted_at: { _is_null: true } }
        ]
      }
    ) {
      aggregate { count }
    }
    total_patients: patients_aggregate(
      where: {
        _and: [
          { clinic_id: { _eq: $clinicId } },
          { deleted_at: { _is_null: true } }
        ]
      }
    ) {
      aggregate { count }
    }
  }
`
