import { mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Konfigurasi penyimpanan gambar artikel — satu-satunya sumber nilai upload.
 *
 * Semua nilai berasal dari environment (lihat `.env.example`) dan TIDAK ada
 * path absolut yang di-hardcode: default-nya relatif terhadap `process.cwd()`.
 * Modul ini Node-only (memakai `node:fs`), jadi hanya boleh diimpor dari kode
 * server/service backend.
 */

export const UPLOAD_DIR_BAWAAN = "public/uploads/artikel";
export const URL_UPLOAD_BAWAAN = "/uploads/artikel";
export const UKURAN_GAMBAR_MAKS_MB_BAWAAN = 2;

function bacaEnvTidakKosong(nama: string): string | null {
  const nilai = process.env[nama];

  if (typeof nilai !== "string") {
    return null;
  }

  const bersih = nilai.trim();

  return bersih === "" ? null : bersih;
}

/**
 * Membaca `MAX_UPLOAD_SIZE_MB` sebagai bilangan bulat > 0.
 *
 * Perilaku:
 * - Kosong → pakai default.
 * - Bukan angka / <= 0 → peringatan + pakai default.
 * - Desimal (mis. "2.9") → peringatan + dibulatkan ke bawah (min 1)
 *   agar konsisten dengan dokumentasi "bilangan bulat > 0".
 * - Bilangan bulat valid → dipakai apa adanya.
 */
function bacaUkuranMaksMb(): number {
  const mentah = bacaEnvTidakKosong("MAX_UPLOAD_SIZE_MB");

  if (mentah === null) {
    return UKURAN_GAMBAR_MAKS_MB_BAWAAN;
  }

  const angka = Number(mentah);

  if (!Number.isFinite(angka) || angka <= 0) {
    console.warn(
      `[config-upload] MAX_UPLOAD_SIZE_MB="${mentah}" tidak valid (harus bilangan > 0); memakai default ${UKURAN_GAMBAR_MAKS_MB_BAWAAN} MB.`,
    );

    return UKURAN_GAMBAR_MAKS_MB_BAWAAN;
  }

  if (!Number.isInteger(angka)) {
    const dibulatkan = Math.max(1, Math.floor(angka));

    console.warn(
      `[config-upload] MAX_UPLOAD_SIZE_MB="${mentah}" bukan bilangan bulat; dibulatkan ke ${dibulatkan} MB.`,
    );

    return dibulatkan;
  }

  return angka;
}

/** Nilai env `UPLOAD_DIR` apa adanya (sudah di-trim) atau default relatif. */
export const UPLOAD_DIR_RELATIF =
  bacaEnvTidakKosong("UPLOAD_DIR") ?? UPLOAD_DIR_BAWAAN;

/**
 * Path absolut direktori upload. Path absolut dari env (mis. mount volume
 * container) dibiarkan apa adanya; path relatif di-resolve dari `cwd`.
 */
export const DIREKTORI_UPLOAD_ARTIKEL = path.isAbsolute(UPLOAD_DIR_RELATIF)
  ? UPLOAD_DIR_RELATIF
  : path.join(process.cwd(), UPLOAD_DIR_RELATIF);

/** Batas ukuran berkas dalam MB dan byte (dipakai validasi server). */
export const UKURAN_GAMBAR_MAKS_MB = bacaUkuranMaksMb();
export const UKURAN_GAMBAR_MAKS_BYTE = UKURAN_GAMBAR_MAKS_MB * 1024 * 1024;

/**
 * URL publik yang dipakai browser untuk mengambil gambar. Diturunkan dari
 * `UPLOAD_DIR` bila berada di dalam `public/`, selain itu memakai default.
 */
export function urlPublikUpload(
  direktori: string = UPLOAD_DIR_RELATIF,
): string {
  const seragam = direktori
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");

  const awalanPublic = "public/";

  if (seragam.startsWith(awalanPublic)) {
    return `/${seragam.slice(awalanPublic.length)}`;
  }

  return URL_UPLOAD_BAWAAN;
}

export const URL_UPLOAD_ARTIKEL = urlPublikUpload();

/**
 * Membuat direktori upload bila belum ada (setara `mkdir -p`) dan
 * mengembalikan path absolutnya. Panggil sebelum menulis berkas agar proses
 * upload pertama tidak gagal di filesystem yang masih bersih.
 */
export async function pastikanDirektoriUpload(
  direktori: string = DIREKTORI_UPLOAD_ARTIKEL,
): Promise<string> {
  await mkdir(direktori, { recursive: true });

  return direktori;
}
