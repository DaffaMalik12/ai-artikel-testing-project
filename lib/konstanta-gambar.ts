/**
 * Konstanta & validasi gambar sisi klien.
 *
 * Nilai di sini harus sejalan dengan validasi server (whitelist MIME dan
 * batas 2 MB). Diletakkan di modul terpisah tanpa dependensi Node agar aman
 * diimpor komponen client maupun hook.
 */
export const MIME_GAMBAR_DIIZINKAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MimeGambarDiizinkan = (typeof MIME_GAMBAR_DIIZINKAN)[number];

export const UKURAN_GAMBAR_MAKS_BYTE = 2 * 1024 * 1024;

export const LABEL_UKURAN_GAMBAR_MAKS = "2 MB";
export const LABEL_FORMAT_GAMBAR = "JPEG, PNG, atau WebP";

/** Nilai atribut `accept` untuk `<input type="file">`. */
export const ACCEPT_GAMBAR = MIME_GAMBAR_DIIZINKAN.join(",");

export const PESAN_GAMBAR_TIPE = `Format gambar harus ${LABEL_FORMAT_GAMBAR}.`;
export const PESAN_GAMBAR_KOSONG = "File gambar tidak boleh kosong.";
export const PESAN_GAMBAR_UKURAN = `Ukuran gambar maksimal ${LABEL_UKURAN_GAMBAR_MAKS}.`;

/**
 * Kunci query yang dipakai halaman edit untuk menampilkan notifikasi bahwa
 * upload gambar gagal setelah artikel berhasil dibuat di form tambah.
 */
export const KUNCI_GALAT_GAMBAR = "galat-gambar";

export const PESAN_GALAT_UNGGAH_GAMBAR =
  'Artikel sudah tersimpan, tetapi gambar gagal diunggah. Silakan pilih gambar lalu tekan "Unggah gambar" di halaman ini.';

export function adalahMimeGambarDiizinkan(
  nilai: string,
): nilai is MimeGambarDiizinkan {
  return (MIME_GAMBAR_DIIZINKAN as readonly string[]).includes(nilai);
}

/**
 * Validasi cepat sisi klien sebelum memanggil API.
 * Mengembalikan pesan error siap tampil, atau `null` bila berkas valid.
 */
export function validasiBerkasGambarKlien(berkas: File): string | null {
  if (!adalahMimeGambarDiizinkan(berkas.type)) {
    return PESAN_GAMBAR_TIPE;
  }

  if (berkas.size === 0) {
    return PESAN_GAMBAR_KOSONG;
  }

  if (berkas.size > UKURAN_GAMBAR_MAKS_BYTE) {
    return PESAN_GAMBAR_UKURAN;
  }

  return null;
}
