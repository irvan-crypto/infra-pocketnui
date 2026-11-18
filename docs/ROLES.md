# Role, Hak Akses & Tabel Pengguna

Dokumen ini menjelaskan model role, aturan akses, dan cara menerapkan migrasinya.

## 1. Daftar Role

| Role (`users_akun.role`) | Label | Hak akses data | Kelola Pengguna |
|---|---|---|---|
| `admin` | Admin | CRUD semua modul | ✅ |
| `asisten_admin` | Asisten Admin | CRUD semua modul | ✅ |
| `general_manager` | General Manager | Lihat saja (semua modul) | ❌ |
| `senior_manager` | Senior Manager | Lihat saja (semua modul) | ❌ |
| `manager` | Manager | Lihat saja (semua modul) | ❌ |
| `operator` | Operator | CRUD **hanya unit kerjanya** | ❌ |
| `guest` | Guest | Lihat saja (semua modul) | ❌ |

Sumber kebenaran: `lib/roles.ts` (tipe, label, alias, kapabilitas).
Role lama `viewer` otomatis dinormalisasi menjadi `guest` (`normalizeRole`).

## 2. Cakupan Unit untuk Operator

Operator hanya bisa menambah/mengubah/menghapus data sesuai kombinasi
`users_akun.akses` + `users_akun.akses_pp` (lihat `lib/units.ts`).
`unit_kerja` hanya informasi, **tidak** menentukan hak CRUD.

| Akses | Akses PP | Cakupan CRUD |
|---|---|---|
| Semua Akses | – | semua modul |
| Packing Plant 1 | PP1 Samarinda/Balikpapan/Banjar/Palu/Lembar/Makassar | tabel PP1 terkait + shipment tujuan PP tersebut |
| Packing Plant 2 | PP2 Bitung/Mamuju/Kendari/Oba/Ambon/Sorong | tabel PP2 terkait + shipment tujuan PP tersebut |
| Silo | – | silo_semen, silo_pantai, silo_mini, cp_tonasa |
| Angkutan Darat | – | angkutan_darat, shipments_darat |

Master dropdown diambil dari tabel `users_role` (kolom `role`, `akses_role`, `akses_pp`).
Nilai lama (sebelum standardisasi) tetap dipetakan toleran oleh `lib/units.ts`.


| Unit | Tabel monitoring yang bisa di-CRUD | Tujuan shipment / packing plant |
|---|---|---|
| Head Office | semua tabel monitoring + `angkutan_darat`, `shipments_darat` | semua tujuan |
| Packing Plant Biringkassi | `pp_biringkassi` | PP. Biringkassi |
| PP1 Samarinda / Balikpapan / Banjar / Palu / Lembar / Makassar | `pp1_<unit>` | PP. <unit> |
| PP2 Bitung / Mamuju / Kendari / Oba / Ambon / Sorong | `pp2_<unit>` | PP. <unit> |
| Silo Pantai / Silo Semen / Silo Mini / CP Tonasa | tabel masing-masing | — |

Operator dengan unit yang tidak dikenali **tidak dapat menulis** (hanya lihat).
Pastikan pengisian unit di menu Kelola Pengguna memakai pilihan yang tersedia.

## 3. Implementasi Proteksi

| Lapisan | Lokasi | Fungsi |
|---|---|---|
| Sesi | `lib/auth/session.ts` | Cookie `shipmonitor_session` HttpOnly, ditandatangani HMAC-SHA256, umur 8 jam |
| Guard API | `lib/auth/guard.ts` | `requireUser` (login), `requireWriter` (CRUD), `requireAdmin` (kelola pengguna) |
| Guard halaman | `components/ClientLayout.tsx` + `lib/access.ts` | Menampilkan `AccessDenied` untuk `/kelola-pengguna` & `/db-status` bila role tidak berhak |
| Menu | `components/Sidebar.tsx` + `lib/menu.ts` | Item `restricted` disembunyikan sesuai role |
| Aksi UI | `lib/access.ts` | `getPermissions`, `canEditShipmentRow`, `canEditRkapRow`, `canEditMonitoringPage` |
| Database | `database/migrations/20240101000003_lockdown_rls.sql` | RLS dikunci; hanya service role (server) yang bisa akses |

Profil pengguna diambil dari `/api/auth/me` setiap load — **tidak** dari
`localStorage`, sehingga role tidak bisa dinaikkan dari browser.

## 4. Langkah Deploy / Migrasi

1. **Isi environment** (server):
   - `SUPABASE_SERVICE_ROLE_KEY` — wajib (API route memakai service role).
   - `AUTH_SECRET` — opsional tapi disarankan: `openssl rand -base64 32`.
     Bila kosong, dipakai `SUPABASE_SERVICE_ROLE_KEY` sebagai secret.
2. Jalankan SQL di Supabase → SQL Editor, berurutan:
   1. `database/migrations/20240101000002_expand_roles.sql` — perluas CHECK constraint role + migrasi `viewer` → `guest`.
   2. `database/migrations/20240101000003_lockdown_rls.sql` — kunci RLS untuk anon/authenticated.
   3. `database/migrations/20240101000004_users_akun.sql` — buat `users_akun`, seed `users_role`, backfill dari `pengguna`.
   4. Setelah deploy baru terbukti login: `database/migrations/20240101000005_drop_pengguna.sql`.
3. (Opsional) Buat akun contoh untuk semua role: login sebagai Admin, lalu
   `POST /api/pengguna/seed`. Akun demo: `admin`, `asisten_admin`,
   `general_manager`, `senior_manager`, `manager`, `operator_palu`,
   `operator_bitung`, `supervisor`, `viewer_palu`.

> ⚠️ Setelah langkah 2, browser tidak boleh lagi mengakses Supabase langsung
> dengan anon key. Semua data harus lewat API route.

## 5. Matriks Uji Cepat

| Aksi | admin | asisten_admin | operator (unit) | operator (unit lain) | GM/SM/Manager/Guest |
|---|---|---|---|---|---|
| Lihat halaman & data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tambah/ubah data unit sendiri | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Hapus data unit sendiri | ✅ | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Kelola pengguna | ✅ | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| Lihat halaman Kelola Pengguna | ✅ | ✅ | ❌ (AccessDenied) | ❌ | ❌ |
