/**
 * Validasi & penyiapan payload untuk halaman "Tambah Artikel".
 *
 * Modul ini sengaja murni TypeScript — tanpa import React/Next.js maupun
 * `node:*` — supaya aman diimpor komponen client dan bisa diuji langsung
 * dengan vitest (environment node).
 *
 * Batas panjang mengikuti route handler yang sudah ada di
 * `app/api/artikel/route.ts` (JUDUL_MAX_LENGTH = 200, ISI_MAX_LENGTH = 10000).
 * Validasi di client hanya untuk umpan balik cepat; server tetap penentu akhir.
 */

export const JUDUL_MAKS_KARAKTER = 200;
export const ISI_MAKS_KARAKTER = 10000;

/** Payload `POST /api/artikel` — kontrak yang sama dengan route handler. */
export interface PayloadArtikelBaru {
  judul: string;
  isi: string;
}

export interface ErrorFieldArtikel {
  judul?: string;
  isi?: string;
}

export const PESAN_JUDUL_WAJIB = "Judul artikel wajib diisi (tidak boleh hanya spasi).";
export const PESAN_ISI_WAJIB = "Isi artikel wajib diisi (tidak boleh hanya spasi).";

export function validasiArtikel(judul: string, isi: string): ErrorFieldArtikel {
  const error: ErrorFieldArtikel = {};

  if (judul.trim() === "") {
    error.judul = PESAN_JUDUL_WAJIB;
  } else if (judul.length > JUDUL_MAKS_KARAKTER) {
    error.judul = `Judul artikel maksimal ${JUDUL_MAKS_KARAKTER} karakter.`;
  }

  if (isi.trim() === "") {
    error.isi = PESAN_ISI_WAJIB;
  } else if (isi.length > ISI_MAKS_KARAKTER) {
    error.isi = `Isi artikel maksimal ${ISI_MAKS_KARAKTER} karakter.`;
  }

  return error;
}

export function adaErrorValidasi(error: ErrorFieldArtikel): boolean {
  return error.judul !== undefined || error.isi !== undefined;
}

/**
 * Menyiapkan payload untuk API.
 *
 * Judul dipangkas karena spasi tepi pada judul tidak bermakna.
 * Isi artikel dipertahankan apa adanya: newline, indentasi, dan spasi tepi
 * adalah bagian dari konten yang ditulis pengguna.
 */
export function siapkanPayload(judul: string, isi: string): PayloadArtikelBaru {
  return {
    judul: judul.trim(),
    isi,
  };
}
