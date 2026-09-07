delete from public.penomoran_config;
delete from public.pengaturan;
delete from public.template_surat;
delete from public.pejabat;
delete from public.unit_kerja;
delete from auth.roles where role in ('SUPERADMIN','ADMIN','VERIFIKATOR','PIMPINAN','OPERATOR','VIEWER');
