# AstraBite by Astratech

Sistem operasional UMKM makanan berbasis web: kasir, stok bahan, menu & HPP, pengeluaran, Promo Studio, layar TV toko, dan asisten AI **Astro**. Tampilannya adaptif: sidebar di desktop, menu bawah di HP.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Gemini API · Vercel · GitHub

## Fitur

| Halaman | Isi |
|---|---|
| **Mission Control** (`/`) | Omzet hari ini vs target, untung bersih, grafik 7 hari, menu terlaris, stok tipis, Daily Log dari Astro |
| **Launchpad** (`/kasir`) | Kasir: pilih menu, bayar (QRIS/Cash/Transfer), struk digital. Stok bahan kepotong otomatis sesuai resep, harga promo otomatis. Antrian pesanan (disiapin → siap → selesai) |
| **Fuel Tank** (`/stok`) | Stok bahan, status aman/tipis/kritis, perkiraan hari habis, isi/koreksi stok, tambah bahan |
| **Menu & Resep** (`/menu`) | Tambah/edit menu, resep per porsi, upload foto, HPP & margin otomatis, saran harga |
| **Promo Studio** (`/promo`) | Astro bikin hook, caption, hashtag, dan script video (Reels/TikTok). Cek margin setelah diskon, jam posting terbaik, kalender konten, aktifkan kode promo ke kasir |
| **Layar TV** (`/tv`) | Playlist slide (menu, promo, best seller, antrian, sosmed + QR, testimoni) buat TV toko. TV buka link `/tv/<token>` tanpa login |
| **Cuan Tracker** (`/cuan`) | Astro Scan: foto nota belanja → AI baca isinya → masuk pengeluaran + stok. Catat manual, cashflow hari ini |
| **Chat Astro** (`/astro`) | Tanya apa aja soal penjualan, stok, menu, promo. Jawaban dari data toko terbaru |

## Struktur

```
app/
  (app)/            halaman yang butuh login (dashboard, kasir, stok, menu, promo, tv, cuan, astro)
  api/ai/           route handler Gemini: scan-nota, promo, chat (streaming), daily
  api/tv/[token]/   feed publik buat layar TV
  tv/[token]/       halaman layar TV (tanpa login)
  login/
components/         komponen UI
lib/                Supabase client, loader data, helper format & HPP, konfigurasi AI
supabase/
  migrations/       skema database, RLS, fungsi transaksi, storage bucket
  seed.sql          data contoh (bisa dilewati)
```

## Setup

### 1. Supabase

1. Bikin project di [supabase.com](https://supabase.com). Pilih region **Southeast Asia (Singapore)**.
2. Buka **SQL Editor**, jalankan isi `supabase/migrations/20261108000000_init.sql`, lalu `supabase/migrations/20261108010000_storage_read.sql`.
3. (Opsional) Jalankan `supabase/seed.sql` buat data contoh. Lewati kalau mau langsung isi menu asli.
4. **Authentication → Providers → Email**: biarkan aktif. Buat akun owner lewat halaman `/login` → *Daftar*, atau dari **Authentication → Users → Add user**.
5. Setelah semua akun staf dibuat, matikan pendaftaran publik: **Authentication → Sign In / Providers → Allow new users to sign up** = off.
6. Catat **Project URL** dan **anon public key** dari **Project Settings → API**.

> Pakai Supabase CLI? `supabase link --project-ref <ref>` lalu `supabase db push`.

### 2. Gemini API

Bikin API key di [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Semua fitur AI memakai model `gemini-3.8-flash` lewat Interactions API (`@google/genai`), lihat `lib/ai.ts`:

| Fitur | Thinking | Google Search | Output |
| --- | --- | --- | --- |
| Scan nota | medium | tidak | JSON terstruktur |
| Promo Studio | medium | ya (tren & hashtag) | JSON terstruktur |
| Chat Astro | low | ya (info luar toko) | teks streaming |
| Daily Log | low | tidak | teks |

### 3. Jalankan lokal

```bash
cp .env.example .env.local   # isi 3 variabel
npm install
npm run dev
```

### 4. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new), import repo-nya. Framework otomatis terdeteksi sebagai Next.js.
3. Isi **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
4. Deploy. Setiap push ke `main` otomatis deploy ulang.
5. Di Supabase **Authentication → URL Configuration**, isi **Site URL** dengan domain Vercel lo.

## Pasang di HP & desktop

Buka domain Vercel di browser, lalu:
- **Android (Chrome):** menu ⋮ → *Tambahkan ke layar utama*.
- **iPhone (Safari):** tombol Share → *Add to Home Screen*.
- **Desktop (Chrome/Edge):** ikon install di address bar.

## Pasang layar TV

1. Buka **Layar TV** → tambah layar → salin link-nya.
2. Buka link itu di browser Smart TV / Android TV box / Chromecast / laptop yang dicolok HDMI.
3. Klik sekali buat layar penuh. Data update sendiri tiap 15 detik.

## Catatan keamanan

- Model akses MVP: **satu toko**. Semua user yang login dianggap staf dan boleh baca-tulis semua data (RLS `staff_all`). Kalau nanti butuh peran owner vs kasir atau multi-cabang, policy RLS perlu dipersempit.
- `GEMINI_API_KEY` hanya dipakai di server, tidak pernah dikirim ke browser.
- Layar TV publik hanya bisa membaca lewat fungsi `tv_feed(token)`: menu aktif, promo, terlaris hari ini, dan nomor antrian. Data omzet, target, dan pengeluaran tidak ikut.
- Foto nota disimpan di bucket privat `nota`; foto menu di bucket publik `menu`.

## Belum termasuk (fase berikutnya)

- Auto-posting langsung ke Instagram/TikTok/WhatsApp (Meta Graph API, TikTok Content Posting API, WhatsApp Business Cloud API). Sekarang: salin caption, jadwalkan, tandai sudah diposting.
- Payment gateway QRIS dinamis, printer thermal Bluetooth, integrasi GoFood/GrabFood.
- Peran owner/kasir terpisah dan multi-cabang.
- Update layar TV via Supabase Realtime (sekarang polling 15 detik).
