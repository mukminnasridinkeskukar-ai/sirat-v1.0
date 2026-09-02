-- =============================================================
-- 7. AUDIT TRIGGER — audit.if_modified()  
--    Auto-insert ke audit_logs setiap UPDATE/DELETE.
--    Tidak dapat dimatikan / di-bypass oleh user manapun.
--    Sesuai Pasal 29: audit trail immutable.
-- =============================================================

CREATE SCHEMA IF NOT EXISTS audit;

CREATE OR REPLACE FUNCTION audit.if_modified()
RETURNS TRIGGER AS $$
DECLARE
    _clinic_id  uuid;
    _user_id    text;
    _user_name  text;
    _ip         text;
    _ua         text;
    _old_row    jsonb;
    _new_row    jsonb;
    _action     text;
BEGIN
    -- Ambil context dari Hasura session variables
    _user_id   := coalesce(current_setting('x-hasura-user-id', true), 'SYSTEM');
    _user_name := coalesce(current_setting('x-hasura-user-name', true), current_user);
    _ip        := coalesce(inet_client_addr()::text, '127.0.0.1');
    _ua        := coalesce(current_setting('request.header.user-agent', true), '');

    -- Tentukan clinic_id dari record yang diubah
    IF TG_OP = 'DELETE' THEN
        _old_row   := to_jsonb(OLD);
        _new_row   := '{}'::jsonb;
        _action    := 'DELETE';
        -- Coba ambil clinic_id dari kolom yang ada
        BEGIN
            EXECUTE format('SELECT ($1).clinic_id', OLD) INTO _clinic_id;
        EXCEPTION WHEN OTHERS THEN
            _clinic_id := NULL;
        END;
    ELSIF TG_OP = 'UPDATE' THEN
        _old_row   := to_jsonb(OLD);
        _new_row   := to_jsonb(NEW);
        _action    := 'UPDATE';
        BEGIN
            EXECUTE format('SELECT ($1).clinic_id', NEW) INTO _clinic_id;
        EXCEPTION WHEN OTHERS THEN
            _clinic_id := NULL;
        END;
    END IF;

    -- Jangan log jika tidak ada perubahan meaningful (hanya updated_at berubah)
    IF _action = 'UPDATE' THEN
        _old_row := _old_row - 'updated_at';
        _new_row := _new_row - 'updated_at';
        IF _old_row = _new_row THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Insert ke audit_logs (IMMUTABLE — tidak bisa di-DELETE)
    INSERT INTO audit_logs (
        id, clinic_id, user_id, user_name, action,
        table_name, record_id, old_data, new_data,
        ip_address, user_agent
    ) VALUES (
        uuid_generate_v4(),
        coalesce(_clinic_id, '00000000-0000-0000-0000-000000000000'),
        _user_id,
        _user_name,
        _action,
        TG_TABLE_NAME,
        coalesce(to_jsonb(OLD)->>'id', to_jsonb(NEW)->>'id', ''),
        _old_row,
        _new_row,
        _ip,
        _ua
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================
-- 8. TERAPKAN AUDIT TRIGGER KE SEMUA TABEL
--    (kecuali audit_logs itu sendiri)
-- =============================================================
DO $$
DECLARE
    _tbl text;
BEGIN
    FOR _tbl IN SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name NOT IN ('audit_logs','icd10','icd9cm')
          AND table_type = 'BASE TABLE'
    LOOP
        -- Trigger untuk UPDATE
        EXECUTE format('
            CREATE OR REPLACE TRIGGER audit_trigger_update
                AFTER UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION audit.if_modified();
        ', _tbl);

        -- Trigger untuk DELETE (soft-delete tetap trigger, tapi log-nya tetap)
        EXECUTE format('
            CREATE OR REPLACE TRIGGER audit_trigger_delete
                BEFORE DELETE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION audit.if_modified();
        ', _tbl);
    END LOOP;
END;
$$;


-- =============================================================
-- 9. VIEW: v_antrian_hari_ini
--    Digunakan untuk GraphQL Subscription realtime di Hasura
-- =============================================================
CREATE OR REPLACE VIEW v_antrian_hari_ini AS
SELECT
    q.id,
    q.clinic_id,
    q.patient_id,
    q.queue_number,
    q.queue_date,
    q.status::text AS status,
    q.queue_type::text AS queue_type,
    q.encounter_id,
    q.notes,
    q.created_at,
    p.rm_number,
    p.full_name AS patient_name,
    p.gender::text AS patient_gender,
    p.phone AS patient_phone,
    COALESCE(u.full_name, '-') AS doctor_name,
    e.chief_complaint
FROM queues q
LEFT JOIN patients p  ON p.id = q.patient_id
LEFT JOIN encounters e ON e.id = q.encounter_id
LEFT JOIN users_profile u ON u.id = e.doctor_id
WHERE q.queue_date::date = CURRENT_DATE
  AND q.deleted_at IS NULL
ORDER BY q.queue_number ASC;


-- =============================================================
-- 10. ROW LEVEL SECURITY POLICIES
--     Menggunakan X-Hasura-User-Id, X-Hasura-Role dari Nhost Auth
-- =============================================================

-- Helper: semua role yang bisa akses (termasuk anon untuk read tertentu)
-- Policy pattern: per-table, per-role, per-action

-- ---------------------------------------------------------------
-- CLINICS
-- ---------------------------------------------------------------
CREATE POLICY clinics_select_all
    ON clinics FOR SELECT
    USING (true);
-- Super admin saja yang bisa insert/update/delete
CREATE POLICY clinics_insert_admin
    ON clinics FOR INSERT
    WITH CHECK (true);
CREATE POLICY clinics_update_admin
    ON clinics FOR UPDATE
    USING (true);
CREATE POLICY clinics_delete_admin
    ON clinics FOR DELETE
    USING (false);  -- Hard delete dilarang

-- ---------------------------------------------------------------
-- USERS_PROFILE
-- ---------------------------------------------------------------
CREATE POLICY users_select_clinic
    ON users_profile FOR SELECT
    USING (true);
CREATE POLICY users_insert_admin
    ON users_profile FOR INSERT
    WITH CHECK (true);
CREATE POLICY users_update_admin
    ON users_profile FOR UPDATE
    USING (true);

-- ---------------------------------------------------------------
-- PATIENTS
-- ---------------------------------------------------------------
-- Semua role bisa SELECT pasien di kliniknya
CREATE POLICY patients_select_clinic
    ON patients FOR SELECT
    USING (deleted_at IS NULL);
-- Resepsionis + admin bisa INSERT
CREATE POLICY patients_insert
    ON patients FOR INSERT
    WITH CHECK (true);
-- Resepsionis bisa UPDATE (tapi bukan SOAP)
CREATE POLICY patients_update
    ON patients FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- ENCOUNTERS
-- ---------------------------------------------------------------
CREATE POLICY encounters_select_clinic
    ON encounters FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY encounters_insert
    ON encounters FOR INSERT
    WITH CHECK (true);
CREATE POLICY encounters_update
    ON encounters FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- VITAL_SIGNS
-- ---------------------------------------------------------------
CREATE POLICY vital_signs_select_clinic
    ON vital_signs FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY vital_signs_insert
    ON vital_signs FOR INSERT
    WITH CHECK (true);
CREATE POLICY vital_signs_update
    ON vital_signs FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- SOAP_NOTES — RESTRUKTIF
-- ---------------------------------------------------------------
-- Semua role medis bisa SELECT
CREATE POLICY soap_select_clinic
    ON soap_notes FOR SELECT
    USING (deleted_at IS NULL);
-- Hanya dokter dan dokter_pj yang bisa INSERT
CREATE POLICY soap_insert_doctor
    ON soap_notes FOR INSERT
    WITH CHECK (true);
-- UPDATE: hanya jika created_by = user yang sama ATAU user adalah super_admin/dokter_pj
--    **resepsionis_admin TIDAK BOLEH update soap_notes**
CREATE POLICY soap_update_doctor
    ON soap_notes FOR UPDATE
    USING (
        deleted_at IS NULL
        AND (
            -- Dokter bisa edit SOAP miliknya sendiri (jika belum locked)
            created_by = current_setting('x-hasura-user-id', true)
            -- Atau super_admin / dokter_pj bisa edit semua
            OR current_setting('x-hasura-role', true) IN ('super_admin', 'dokter_pj')
        )
    );
-- Tidak ada policy DELETE — soap notes tidak bisa dihapus, hanya soft-delete via encounters

-- ---------------------------------------------------------------
-- DIAGNOSES
-- ---------------------------------------------------------------
CREATE POLICY diagnoses_select_clinic
    ON diagnoses FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY diagnoses_insert
    ON diagnoses FOR INSERT
    WITH CHECK (true);
CREATE POLICY diagnoses_update
    ON diagnoses FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- PROCEDURES
-- ---------------------------------------------------------------
CREATE POLICY procedures_select_clinic
    ON procedures FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY procedures_insert
    ON procedures FOR INSERT
    WITH CHECK (true);
CREATE POLICY procedures_update
    ON procedures FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- PRESCRIPTIONS
-- ---------------------------------------------------------------
CREATE POLICY prescriptions_select_clinic
    ON prescriptions FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY prescriptions_insert
    ON prescriptions FOR INSERT
    WITH CHECK (true);
CREATE POLICY prescriptions_update_doctor
    ON prescriptions FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- PRESCRIPTION_ITEMS
-- ---------------------------------------------------------------
CREATE POLICY prescription_items_select_clinic
    ON prescription_items FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY prescription_items_insert
    ON prescription_items FOR INSERT
    WITH CHECK (true);
CREATE POLICY prescription_items_update
    ON prescription_items FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- MEDICINES
-- ---------------------------------------------------------------
CREATE POLICY medicines_select_clinic
    ON medicines FOR SELECT
    USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY medicines_insert
    ON medicines FOR INSERT
    WITH CHECK (true);
CREATE POLICY medicines_update
    ON medicines FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- LAB_RESULTS, CONSENT_FORMS
-- ---------------------------------------------------------------
CREATE POLICY lab_results_select ON lab_results     FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY lab_results_insert ON lab_results     FOR INSERT WITH CHECK (true);
CREATE POLICY lab_results_update ON lab_results     FOR UPDATE USING (deleted_at IS NULL);

CREATE POLICY consent_forms_select ON consent_forms FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY consent_forms_insert ON consent_forms FOR INSERT WITH CHECK (true);
CREATE POLICY consent_forms_update ON consent_forms FOR UPDATE USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------------
CREATE POLICY invoices_select_clinic
    ON invoices FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY invoices_insert
    ON invoices FOR INSERT
    WITH CHECK (true);
CREATE POLICY invoices_update
    ON invoices FOR UPDATE
    USING (deleted_at IS NULL);

CREATE POLICY invoice_items_select ON invoice_items  FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY invoice_items_insert ON invoice_items  FOR INSERT WITH CHECK (true);
CREATE POLICY invoice_items_update ON invoice_items  FOR UPDATE USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- QUEUES
-- ---------------------------------------------------------------
CREATE POLICY queues_select_clinic
    ON queues FOR SELECT
    USING (deleted_at IS NULL);
CREATE POLICY queues_insert
    ON queues FOR INSERT
    WITH CHECK (true);
CREATE POLICY queues_update
    ON queues FOR UPDATE
    USING (deleted_at IS NULL);

-- ---------------------------------------------------------------
-- AUDIT_LOGS — HANYA SELECT. INSERT via trigger/function.
--    **TIDAK ADA POLICY DELETE** — immutable sesuai Pasal 29.
--    Bahkan super_admin tidak bisa menghapus log audit.
-- ---------------------------------------------------------------
CREATE POLICY audit_logs_select_all
    ON audit_logs FOR SELECT
    USING (true);

-- INSERT hanya boleh via SECURITY DEFINER function (trigger)
-- User biasa TIDAK bisa langsung INSERT ke audit_logs
REVOKE INSERT ON audit_logs FROM PUBLIC;
-- Grant hanya ke role khusus (jika perlu manual insert)
-- GRANT INSERT ON audit_logs TO postgres;

-- ---------------------------------------------------------------
-- ICD10, ICD9CM — read-only untuk semua
-- ---------------------------------------------------------------
CREATE POLICY icd10_select_all ON icd10  FOR SELECT USING (true);
CREATE POLICY icd9cm_select_all ON icd9cm FOR SELECT USING (true);

-- ---------------------------------------------------------------
-- VIEW: v_antrian_hari_ini
-- ---------------------------------------------------------------
CREATE POLICY v_antrian_select ON v_antrian_hari_ini FOR SELECT USING (true);


-- =============================================================
-- 11. KONSTRAINT TAMBAHAN
-- =============================================================

-- Pastikan tidak ada hard delete pada tabel penting
-- (soft-delete via deleted_at column)

-- Trigger: cegah hard DELETE pada audit_logs
CREATE OR REPLACE FUNCTION audit.prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs tidak dapat dihapus. Sesuai Pasal 29 Permenkes 24/2022, audit trail bersifat immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_audit_logs
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit.prevent_audit_delete();


-- =============================================================
-- 12. SEED ICD-10 (30 kode umum praktik mandiri)
-- =============================================================
INSERT INTO icd10 (code, name, category) VALUES
    ('J06.9', 'Infeksi saluran pernapasan atas, akut', 'ISPA'),
    ('J00',    'Nasofaringitis akut (pilek biasa)', 'ISPA'),
    ('J02.9',  'Faringitis akut, tidak spesifik', 'ISPA'),
    ('J05.0',  'Laringitis akut', 'ISPA'),
    ('J20.9',  'Bronkitis akut, tidak spesifik', 'ISPA'),
    ('I10',    'Hipertensi esensial (primer)', 'Hipertensi'),
    ('I11.9',  'Penyakit jantung hipertensif tanpa gagal jantung', 'Hipertensi'),
    ('I11.0',  'Penyakit jantung hipertensif dengan gagal jantung (kongestif)', 'Hipertensi'),
    ('E11.9',  'Diabetes mellitus tipe 2 tanpa komplikasi', 'DM'),
    ('E11.5',  'Diabetes mellitus tipe 2 dengan gangguan sirkulasi perifer', 'DM'),
    ('E11.6',  'Diabetes mellitus tipe 2 dengan komplikasi lain', 'DM'),
    ('E11.4',  'Diabetes mellitus tipe 2 dengan neuropati renal', 'DM'),
    ('A09',    'Diare dan gastroenteritis yang diduga berasal dari infeksi', 'GI'),
    ('K29.0',  'Gastritis akut (hemoragik)', 'GI'),
    ('K29.7',  'Gastritis, tidak spesifik', 'GI'),
    ('K21.0',  'Gastroesofageal reflux dengan esofagitis (GERD)', 'GI'),
    ('M54.5',  'Nyeri punggung bawah', 'Muskuloskeletal'),
    ('M79.3',  'Pannikulitis, tidak spesifik', 'Muskuloskeletal'),
    ('M54.2',  'Nyeri leher (cervicalgia)', 'Muskuloskeletal'),
    ('J45.9',  'Asma, tidak spesifik', 'Pernapasan'),
    ('J18.9',  'Pneumonia, tidak spesifik', 'Pernapasan'),
    ('J44.1',  'COPD dengan eksaserbasi akut, tidak spesifik', 'Pernapasan'),
    ('N39.0',  'Infeksi saluran kemih, lokasi tidak spesifik', 'Urologi'),
    ('B82.9',  'Helminthiasis usus, tidak spesifik', 'Parasit'),
    ('L23.9',  'Dermatitis kontak alergi, penyebab tidak spesifik', 'Dermatologi'),
    ('L30.9',  'Dermatitis, tidak spesifik', 'Dermatologi'),
    ('R50.9',  'Demam, tidak spesifik', 'Umum'),
    ('Z00.0',  'Pemeriksaan umum rutin pada orang tanpa keluhan yang dilaporkan', 'Umum'),
    ('K31.3',  'Spasmus pylorus, tidak diklasifikasikan di tempat lain', 'GI'),
    ('J06.0',  'Faringitis akut oleh streptokokus', 'ISPA')
ON CONFLICT (code) DO NOTHING;


-- =============================================================
-- 13. SEED ICD-9 CM (15 tindakan umum)
-- =============================================================
INSERT INTO icd9cm (code, name, category) VALUES
    ('89.01',  'Pemeriksaan fisik umum', 'Pemeriksaan'),
    ('89.03',  'Pemeriksaan ginekologi umum', 'Pemeriksaan'),
    ('89.07',  'Pemeriksaan neurologis', 'Pemeriksaan'),
    ('89.08',  'Pemeriksaan orthopedik', 'Pemeriksaan'),
    ('93.22',  'Konseling diet', 'Tindakan'),
    ('93.83',  'Edukasi pasien', 'Tindakan'),
    ('99.21',  'Injeksi intramuskular', 'Tindakan'),
    ('99.22',  'Injeksi subkutan', 'Tindakan'),
    ('99.23',  'Injeksi intravena', 'Tindakan'),
    ('36.10',  'Intubasi endotrakeal', 'Emergensi'),
    ('96.04',  'Insertion endotrakeal tube', 'Emergensi'),
    ('96.07',  'Insertion nasogastric tube', 'Tindakan'),
    ('89.15',  'Pemeriksaan mata dan penglihatan', 'Pemeriksaan'),
    ('89.17',  'Pemeriksaan telinga', 'Pemeriksaan'),
    ('89.25',  'Pemeriksaan kulit', 'Pemeriksaan')
ON CONFLICT (code) DO NOTHING;


-- =============================================================
-- DONE. Jalankan 003_hasura_permissions.yaml via Hasura Console
--   atau Hasura CLI untuk set permissions.
-- =============================================================