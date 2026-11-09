-- Izin baca file di storage untuk staf yang login.
-- Dibutuhkan Supabase Storage saat upload (cek file yang sudah ada) dan untuk foto nota.
create policy "staff_read_menu" on storage.objects for select to authenticated using (bucket_id = 'menu');
