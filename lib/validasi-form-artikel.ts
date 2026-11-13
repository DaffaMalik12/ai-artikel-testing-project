import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";

/**
 * Validasi form artikel sisi klien — satu sumber untuk form tambah maupun
 * form edit supaya aturan & pesan tidak divergen terhadap konstanta batas
 * karakter (revisi QA VO-51 poin 2).
 */
export interface GalatFormArtikel {
  judul?: string;
  isi?: string;
}

export function validasiFormArtikel(
  judul: string,
  isi: string,
): GalatFormArtikel {
  const galat: GalatFormArtikel = {};

  const judulBersih = judul.trim();
  const isiBersih = isi.trim();

  if (judulBersih === "") {
    galat.judul = "Judul artikel wajib diisi.";
  } else if (judulBersih.length > JUDUL_MAKS_KARAKTER) {
    galat.judul = `Judul artikel maksimal ${JUDUL_MAKS_KARAKTER} karakter.`;
  }

  if (isiBersih === "") {
    galat.isi = "Isi artikel wajib diisi.";
  } else if (isiBersih.length > ISI_MAKS_KARAKTER) {
    galat.isi = `Isi artikel maksimal ${ISI_MAKS_KARAKTER} karakter.`;
  }

  return galat;
}

export function adaGalatFormArtikel(galat: GalatFormArtikel): boolean {
  return galat.judul !== undefined || galat.isi !== undefined;
}
