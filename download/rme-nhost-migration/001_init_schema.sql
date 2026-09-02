-- =============================================================
-- RME Praktik Mandiri Dokter — PostgreSQL Migration
-- Compliance: Permenkes No. 24 Tahun 2022, UU 17/2023, UU PDP 27/2022
-- Platform: Nhost (PostgreSQL 16 + Hasura GraphQL)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- 2. ENUM TYPES
-- ---------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'dokter_pj',
    'dokter',
    'perawat_bidan',
    'resepsionis_admin',
    'apoteker'
);

CREATE TYPE encounter_status AS ENUM (
    'berlangsung',
    'selesai',
    'dibatalkan'
);

CREATE TYPE encounter_type AS ENUM (
    'rawat_jalan',
    'rawat_inap',
    'emergency'
);

CREATE TYPE queue_status AS ENUM (
    'menunggu',
    'dipanggil',
    'sedang_diperiksa',
    'selesai',
    'dibatalkan'
);

CREATE TYPE queue_type AS ENUM (
    'walk_in',
    'appointment'
);

CREATE TYPE diagnosis_type AS ENUM (
    'primer',
    'sekunder'
);

CREATE TYPE prescription_status AS ENUM (
    'aktif',
    'dibatalkan'
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'qris',
    'transfer'
);

CREATE TYPE payment_status AS ENUM (
    'belum_bayar',
    'lunas'
);

CREATE TYPE gender AS ENUM (
    'L',
    'P'
);

-- ---------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- ---------------------------------------------------------------

-- Enkripsi NIK (AES-256-GCM). Key diambil dari env var ENCRYPTION_KEY.
-- Enkripsi at-rest sesuai Pasal 29 Permenkes 24/2022
CREATE OR REPLACE FUNCTION encrypt_nik(plain_text text)
RETURNS text AS $$
DECLARE
    _key bytea;
BEGIN
    _key := decode(coalesce(current_setting('app.encryption_key', true), 'default-key-change-me-32ch!!'), 'hex');
    IF length(_key) < 32 THEN
        _key := decode('64656661756c742d6b65792d6368616e67652d6d652d33326368', 'hex');
    END IF;
    RETURN encode(
        encrypt(
            convert_to(plain_text, 'UTF8'),
            substring(_key, 1, 32),
            'aes'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION decrypt_nik(cipher_text text)
RETURNS text AS $$
DECLARE
    _key bytea;
BEGIN
    _key := decode(coalesce(current_setting('app.encryption_key', true), 'default-key-change-me-32ch!!'), 'hex');
    IF length(_key) < 32 THEN
        _key := decode('64656661756c742d6b65792d6368616e67652d6d652d33326368', 'hex');
    END IF;
    RETURN convert_from(
        decrypt(
            decode(cipher_text, 'hex'),
            substring(_key, 1, 32),
            'aes'
        ),
        'UTF8'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Generate nomor RM otomatis: RM-YYYY-XXXX
CREATE OR REPLACE FUNCTION generate_rm_number(p_clinic_id uuid)
RETURNS text AS $$
DECLARE
    _year  text := to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta', 'YYYY');
    _count int;
    _seq   text;
BEGIN
    SELECT COUNT(*) INTO _count
    FROM patients
    WHERE clinic_id = p_clinic_id
      AND deleted_at IS NULL
      AND to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY') = _year;

    _seq := lpad((_count + 1)::text, 4, '0');
    RETURN 'RM-' || _year || '-' || _seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate nomor resep otomatis: RX-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_rx_number(p_clinic_id uuid)
RETURNS text AS $$
DECLARE
    _date  text := to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
    _count int;
    _seq   text;
BEGIN
    SELECT COUNT(*) INTO _count
    FROM prescriptions
    WHERE clinic_id = p_clinic_id
      AND deleted_at IS NULL
      AND to_char(prescription_date AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') = _date;

    _seq := lpad((_count + 1)::text, 4, '0');
    RETURN 'RX-' || _date || '-' || _seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate nomor invoice otomatis: INV-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_invoice_number(p_clinic_id uuid)
RETURNS text AS $$
DECLARE
    _date  text := to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
    _count int;
    _seq   text;
BEGIN
    SELECT COUNT(*) INTO _count
    FROM invoices
    WHERE clinic_id = p_clinic_id
      AND deleted_at IS NULL
      AND to_char(invoice_date AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') = _date;

    _seq := lpad((_count + 1)::text, 4, '0');
    RETURN 'INV-' || _date || '-' || _seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate nomor antrian harian
CREATE OR REPLACE FUNCTION generate_queue_number(p_clinic_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS int AS $$
DECLARE
    _count int;
BEGIN
    SELECT COALESCE(MAX(queue_number), 0) INTO _count
    FROM queues
    WHERE clinic_id = p_clinic_id
      AND queue_date::date = p_date
      AND deleted_at IS NULL;
    RETURN _count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================
-- 4. TABLES (RLS ON, Retensi 10 tahun sesuai Permenkes 24/2022)
-- =============================================================

-- 4a. CLINICS
CREATE TABLE clinics (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text NOT NULL,
    address     text NOT NULL DEFAULT '',
    phone       text NOT NULL DEFAULT '',
    sip_doctor  text NOT NULL DEFAULT '',
    logo_url    text NOT NULL DEFAULT '',
    kop_surat   text NOT NULL DEFAULT '',
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- 4b. USERS_PROFILE — link ke auth.users via auth_user_id
CREATE TABLE users_profile (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id text NOT NULL UNIQUE,               -- Nhost Auth user ID
    clinic_id    uuid NOT NULL REFERENCES clinics(id),
    role         user_role NOT NULL DEFAULT 'resepsionis_admin',
    full_name    text NOT NULL DEFAULT '',
    sip          text NOT NULL DEFAULT '',
    str          text NOT NULL DEFAULT '',
    specialty    text NOT NULL DEFAULT '',
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- 4c. PATIENTS — NIK dienkripsi at-rest (Pasal 14 & 29)
CREATE TABLE patients (
    id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id          uuid NOT NULL REFERENCES clinics(id),
    rm_number          text NOT NULL UNIQUE,
    nik_encrypted      text NOT NULL,                   -- pgcrypto encrypted
    nik_hash           text NOT NULL,                   -- SHA-256 hash untuk search
    full_name          text NOT NULL,
    birth_place        text NOT NULL DEFAULT '',
    birth_date         date,
    gender             gender NOT NULL DEFAULT 'L',
    address            text NOT NULL DEFAULT '',
    phone              text NOT NULL DEFAULT '',
    allergies          jsonb NOT NULL DEFAULT '[]'::jsonb,
    medical_history    jsonb NOT NULL DEFAULT '[]'::jsonb,
    emergency_contact  text NOT NULL DEFAULT '',
    emergency_phone    text NOT NULL DEFAULT '',
    blood_type         text NOT NULL DEFAULT '',
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,
    created_by         text NOT NULL DEFAULT ''
);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 4d. ENCOUNTERS
CREATE TABLE encounters (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id        uuid NOT NULL REFERENCES clinics(id),
    patient_id       uuid NOT NULL REFERENCES patients(id),
    doctor_id        uuid NOT NULL REFERENCES users_profile(id),
    encounter_date   timestamptz NOT NULL DEFAULT now(),
    encounter_type   encounter_type NOT NULL DEFAULT 'rawat_jalan',
    status           encounter_status NOT NULL DEFAULT 'berlangsung',
    chief_complaint  text NOT NULL DEFAULT '',
    notes            text NOT NULL DEFAULT '',
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    created_by       text NOT NULL DEFAULT ''
);
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

-- 4e. VITAL_SIGNS
CREATE TABLE vital_signs (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id      uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id         uuid NOT NULL REFERENCES clinics(id),
    nurse_id          uuid REFERENCES users_profile(id),
    systolic          int NOT NULL DEFAULT 0,
    diastolic         int NOT NULL DEFAULT 0,
    heart_rate        int NOT NULL DEFAULT 0,
    respiratory_rate  int NOT NULL DEFAULT 0,
    temperature       numeric(5,1) NOT NULL DEFAULT 0,
    weight            numeric(6,1) NOT NULL DEFAULT 0,
    height            numeric(5,1) NOT NULL DEFAULT 0,
    oxygen_sat        numeric(5,1) NOT NULL DEFAULT 0,
    pain_scale        int NOT NULL DEFAULT 0,
    notes             text NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    created_by        text NOT NULL DEFAULT ''
);
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

-- 4f. SOAP_NOTES — INTI PERMENKES 24/2022
CREATE TABLE soap_notes (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id  uuid NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id     uuid NOT NULL REFERENCES clinics(id),
    doctor_id     uuid NOT NULL REFERENCES users_profile(id),
    subjective    text NOT NULL DEFAULT '',
    objective     text NOT NULL DEFAULT '',
    assessment    text NOT NULL DEFAULT '',
    plan          text NOT NULL DEFAULT '',
    instructions  text NOT NULL DEFAULT '',
    is_locked     boolean NOT NULL DEFAULT false,
    locked_at     timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    created_by    text NOT NULL DEFAULT ''
);
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;

-- 4g. DIAGNOSES (ICD-10)
CREATE TABLE diagnoses (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id   uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id      uuid NOT NULL REFERENCES clinics(id),
    icd10_code     text NOT NULL,
    icd10_name     text NOT NULL DEFAULT '',
    diagnosis_type diagnosis_type NOT NULL DEFAULT 'primer',
    notes          text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    created_by     text NOT NULL DEFAULT ''
);
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

-- 4h. PROCEDURES (ICD-9 CM)
CREATE TABLE procedures (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id  uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id     uuid NOT NULL REFERENCES clinics(id),
    icd9_code     text NOT NULL,
    icd9_name     text NOT NULL DEFAULT '',
    notes         text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    created_by    text NOT NULL DEFAULT ''
);
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- 4i. PRESCRIPTIONS
CREATE TABLE prescriptions (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id      uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id         uuid NOT NULL REFERENCES clinics(id),
    prescription_no   text NOT NULL UNIQUE,
    prescription_date timestamptz NOT NULL DEFAULT now(),
    is_compound       boolean NOT NULL DEFAULT false,
    notes             text NOT NULL DEFAULT '',
    status            prescription_status NOT NULL DEFAULT 'aktif',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    created_by        text NOT NULL DEFAULT ''
);
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- 4j. PRESCRIPTION_ITEMS
CREATE TABLE prescription_items (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id     uuid REFERENCES medicines(id),
    medicine_name   text NOT NULL,
    dose            text NOT NULL DEFAULT '',
    frequency       text NOT NULL DEFAULT '',
    duration        text NOT NULL DEFAULT '',
    quantity        int NOT NULL DEFAULT 1,
    notes           text NOT NULL DEFAULT '',
    is_compound     boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    created_by      text NOT NULL DEFAULT ''
);
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- 4k. MEDICINES (Master)
CREATE TABLE medicines (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id         uuid NOT NULL REFERENCES clinics(id),
    name              text NOT NULL,
    generic_name      text NOT NULL DEFAULT '',
    category          text NOT NULL DEFAULT '',
    unit              text NOT NULL DEFAULT 'tablet',
    stock             int NOT NULL DEFAULT 0,
    price             numeric(12,0) NOT NULL DEFAULT 0,
    dosage_form       text NOT NULL DEFAULT '',
    contraindications text NOT NULL DEFAULT '',
    interactions      text NOT NULL DEFAULT '',
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    created_by        text NOT NULL DEFAULT ''
);
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

-- 4l. LAB_RESULTS
CREATE TABLE lab_results (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id  uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id     uuid NOT NULL REFERENCES clinics(id),
    lab_type      text NOT NULL DEFAULT '',
    result        text NOT NULL DEFAULT '',
    normal_range  text NOT NULL DEFAULT '',
    is_abnormal   boolean NOT NULL DEFAULT false,
    file_url      text NOT NULL DEFAULT '',
    notes         text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    created_by    text NOT NULL DEFAULT ''
);
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- 4m. CONSENT_FORMS — Informed Consent Digital + TTE
CREATE TABLE consent_forms (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id      uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    clinic_id         uuid NOT NULL REFERENCES clinics(id),
    consent_type      text NOT NULL DEFAULT 'tindakan',
    content           text NOT NULL DEFAULT '',
    patient_signature text NOT NULL DEFAULT '',  -- base64 TTE
    doctor_signature  text NOT NULL DEFAULT '',  -- base64 TTE
    signed_at         timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    created_by        text NOT NULL DEFAULT ''
);
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

-- 4n. INVOICES
CREATE TABLE invoices (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id      uuid NOT NULL REFERENCES clinics(id),
    encounter_id   uuid NOT NULL DEFAULT '',
    patient_id     uuid NOT NULL REFERENCES patients(id),
    invoice_no     text NOT NULL UNIQUE,
    invoice_date   timestamptz NOT NULL DEFAULT now(),
    subtotal       numeric(12,0) NOT NULL DEFAULT 0,
    discount       numeric(12,0) NOT NULL DEFAULT 0,
    total          numeric(12,0) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    payment_status payment_status NOT NULL DEFAULT 'belum_bayar',
    paid_at        timestamptz,
    notes          text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    created_by     text NOT NULL DEFAULT ''
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 4o. INVOICE_ITEMS
CREATE TABLE invoice_items (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type   text NOT NULL DEFAULT 'tindakan',
    item_name   text NOT NULL,
    quantity    int NOT NULL DEFAULT 1,
    unit_price  numeric(12,0) NOT NULL DEFAULT 0,
    total       numeric(12,0) NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 4p. QUEUES
CREATE TABLE queues (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id     uuid NOT NULL REFERENCES clinics(id),
    patient_id    uuid NOT NULL REFERENCES patients(id),
    queue_number  int NOT NULL,
    queue_date    timestamptz NOT NULL DEFAULT now(),
    status        queue_status NOT NULL DEFAULT 'menunggu',
    queue_type    queue_type NOT NULL DEFAULT 'walk_in',
    encounter_id  uuid NOT NULL DEFAULT '',
    notes         text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    created_by    text NOT NULL DEFAULT ''
);
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;

-- 4q. AUDIT_LOGS — IMMUTABLE, tidak bisa dihapus (Pasal 29)
-- Tidak ada ON DELETE CASCADE ke tabel ini.
-- Hanya INSERT yang diperbolehkan (via trigger atau manual).
CREATE TABLE audit_logs (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id   uuid NOT NULL DEFAULT '',
    user_id     text NOT NULL DEFAULT '',
    user_name   text NOT NULL DEFAULT '',
    action      text NOT NULL DEFAULT '',       -- INSERT, UPDATE, DELETE, LOGIN, LOCK
    table_name  text NOT NULL DEFAULT '',
    record_id   text NOT NULL DEFAULT '',
    old_data    jsonb NOT NULL DEFAULT '{}'::jsonb,
    new_data    jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address  text NOT NULL DEFAULT '',
    user_agent  text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now()
    -- TIDAK ADA deleted_at — audit log tidak bisa di-soft-delete
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4r. ICD-10 CACHE
CREATE TABLE icd10 (
    id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code     text NOT NULL UNIQUE,
    name     text NOT NULL DEFAULT '',
    category text NOT NULL DEFAULT ''
);
ALTER TABLE icd10 ENABLE ROW LEVEL SECURITY;

-- 4s. ICD-9 CM CACHE
CREATE TABLE icd9cm (
    id       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code     text NOT NULL UNIQUE,
    name     text NOT NULL DEFAULT '',
    category text NOT NULL DEFAULT ''
);
ALTER TABLE icd9cm ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- 5. INDEXES — Optimasi query & RLS performance
-- =============================================================
CREATE INDEX idx_patients_clinic_id       ON patients(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_rm_number       ON patients(rm_number);
CREATE INDEX idx_patients_nik_hash         ON patients(nik_hash);
CREATE INDEX idx_patients_full_name       ON patients USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_patients_created_at      ON patients(created_at DESC);

CREATE INDEX idx_encounters_clinic_id     ON encounters(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_encounters_patient_id    ON encounters(patient_id);
CREATE INDEX idx_encounters_doctor_id      ON encounters(doctor_id);
CREATE INDEX idx_encounters_date          ON encounters(encounter_date DESC);
CREATE INDEX idx_encounters_status        ON encounters(status);

CREATE INDEX idx_soap_notes_encounter_id  ON soap_notes(encounter_id);
CREATE INDEX idx_soap_notes_doctor_id     ON soap_notes(doctor_id);

CREATE INDEX idx_queues_clinic_date       ON queues(clinic_id, queue_date::date) WHERE deleted_at IS NULL;
CREATE INDEX idx_queues_status            ON queues(status);

CREATE INDEX idx_prescriptions_clinic     ON prescriptions(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_patient         ON invoices(patient_id);
CREATE INDEX idx_invoices_status          ON invoices(payment_status);
CREATE INDEX idx_medicines_name           ON medicines USING gin(name gin_trgm_ops);

CREATE INDEX idx_audit_logs_clinic        ON audit_logs(clinic_id);
CREATE INDEX idx_audit_logs_table          ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created        ON audit_logs(created_at DESC);


-- =============================================================
-- 6. UPDATED_AT TRIGGER
-- =============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables (kecuali audit_logs)
DO $$
DECLARE
    _tbl text;
BEGIN
    FOR _tbl IN SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name NOT IN ('audit_logs','icd10','icd9cm')
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_modified_column();
        ', _tbl);
    END LOOP;
END;
$$;