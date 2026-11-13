# ai-artikel-testing-project

Aplikasi CRUD artikel (Next.js App Router + Prisma) dengan dukungan **upload gambar artikel**, lengkap dengan pipeline CI/CD ke VPS.

## Getting Started

Prasyarat: Node.js 22+ dan npm.

```bash
# 1. Siapkan environment lokal (file `.env` TIDAK di-commit)
cp .env.example .env

# 2. Install dependensi (deterministik)
npm ci

# 3. Migrasi database
npx prisma migrate deploy

# 4. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Perintah lain:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # Type check
npm test            # Unit test (Vitest)
npm run build       # Build produksi
```

## Environment Variables

Semua variabel didokumentasikan di `.env.example` (tanpa nilai rahasia). Ringkasan:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Koneksi database (SQLite untuk lokal). |
| `API_BASE_URL` | `http://localhost:3000` | Base URL internal untuk pemanggilan API dari server. |
| `API_BASE_URL_ALLOWLIST` | `localhost` | Daftar host yang diizinkan (dipisah koma). |
| `UPLOAD_DIR` | `public/uploads/artikel` | Direktori penyimpanan gambar artikel. Relatif terhadap `process.cwd()`; boleh absolut bila menunjuk volume container. |
| `MAX_UPLOAD_SIZE_MB` | `2` | Batas ukuran satu file gambar (MB). Wajib bilangan bulat > 0; nilai desimal dibulatkan ke bawah dengan peringatan; nilai tidak valid jatuh ke default. |

Sumber tunggal nilai upload adalah `lib/config-upload.ts` (Node-only, aman diimpor dari layer service backend). Nilai env tidak valid otomatis jatuh ke default dengan peringatan di log.

## Upload Gambar Artikel

### Cara mengaktifkan

Tidak ada flag khusus: upload aktif secara default. Cukup pastikan `.env` memuat `UPLOAD_DIR` dan `MAX_UPLOAD_SIZE_MB` (atau biarkan default).

- Direktori `UPLOAD_DIR` **dibuat otomatis saat runtime** lewat `pastikanDirektoriUpload()` (setara `mkdir -p`, `recursive: true`) sebelum berkas ditulis — tidak perlu membuat folder manual di server baru.
- Modul service backend yang menulis berkas wajib memakai `DIREKTORI_UPLOAD_ARTIKEL` dan `pastikanDirektoriUpload()` dari `lib/config-upload.ts`, bukan path lokal buatan sendiri, agar konfigurasi env benar-benar berlaku.
- Endpoint: `POST /api/artikel/:id/gambar` (multipart, field `gambar`, wajib login) dan `DELETE /api/artikel/:id/gambar`. File disajikan dari `URL_UPLOAD_ARTIKEL` (default `/uploads/artikel`).
- Batas ukuran & format divalidasi di server berdasarkan magic bytes: **JPEG, PNG, WebP**, maksimal **`MAX_UPLOAD_SIZE_MB` (default 2 MB)**. Validasi sisi klien hanya untuk UX (mencegah request jelas tidak valid) dan mengikuti nilai default server; kebenaran akhir tetap ditentukan validasi server.

### File upload tidak ikut ter-commit

`.gitignore` mengecualikan seluruh isi folder upload, tetapi direktori tetap terlacak lewat penanda:

```gitignore
public/uploads/**
!public/uploads/
!public/uploads/**/
!public/uploads/**/.gitkeep
```

`public/uploads/artikel/.gitkeep` menjaga struktur folder tetap ada di repository, sehingga `git status` tetap bersih setelah proses upload.

### Deployment via Docker / container (volume persisten)

Filesystem container bersifat **ephemeral**: gambar akan hilang setiap container dibuat ulang. Karena itu mount volume persisten dan arahkan `UPLOAD_DIR` ke path volume tersebut:

```yaml
services:
  app:
    environment:
      UPLOAD_DIR: /data/uploads/artikel
      MAX_UPLOAD_SIZE_MB: "2"
    volumes:
      - uploads:/data/uploads
volumes:
  uploads:
```

Catatan: bila `UPLOAD_DIR` berada **di luar** `public/`, file tidak disajikan otomatis oleh Next.js. Sajikan lewat reverse proxy (Nginx/Caddy) atau route handler khusus yang membaca dari `DIREKTORI_UPLOAD_ARTIKEL`.

### Keterbatasan serverless (Vercel)

Pada platform serverless (mis. Vercel) filesystem bersifat sementara dan read-only di sebagian runtime: file yang diunggah bisa hilang kapan saja dan tidak dibagi antar instance. Untuk produksi serverless gunakan **object storage** — Prisma Storage, S3-compatible (AWS S3, R2, MinIO), atau layanan serupa — lalu simpan URL objek pada kolom `Artikel.gambarUrl`. Konfigurasi `UPLOAD_DIR` hanya cocok untuk lokal, VPS, atau container dengan volume persisten.

## CI/CD & Deploy ke VPS

Pipeline memisahkan tahap CI (lint, type check, test, build) dan tahap deploy yang hanya berjalan saat push ke `main` setelah CI lolos. Kredensial VPS **tidak pernah** ditulis di repository; gunakan GitHub Secrets baku:

- `VPS_HOST` — IP/domain VPS
- `VPS_PORT` — port SSH (default `22`)
- `VPS_USER` — user non-root di VPS
- `VPS_SSH_KEY` — private SSH key untuk deploy
- `VPS_APP_DIR` — direktori aplikasi di VPS

Di VPS, arahkan `UPLOAD_DIR` ke direktori persisten di luar build artifact (mis. `/var/www/ai-artikel/uploads/artikel`) dan pastikan user deploy punya izin tulis ke direktori tersebut.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
