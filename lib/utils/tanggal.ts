/**
 * Util format tanggal murni.
 *
 * Satu-satunya implementasi `formatTanggal`/`dapatMenampilkanWaktu` agar tidak
 * ada definisi ganda antara modul API client dan modul server (revisi QA
 * VO-51 poin 2). Bebas dependensi Node/DOM sehingga aman dipakai di server
 * maupun komponen klien.
 */
const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const PESAN_TANGGAL_TIDAK_VALID = "Tanggal tidak tersedia";

export function formatTanggal(
  nilai: string | null | undefined,
  fallback: string = PESAN_TANGGAL_TIDAK_VALID,
): string {
  const teks = (nilai ?? "").trim();

  if (teks === "") {
    return fallback;
  }

  const tanggal = new Date(teks);

  if (Number.isNaN(tanggal.getTime())) {
    return fallback;
  }

  return FORMAT_TANGGAL.format(tanggal);
}

export function dapatMenampilkanWaktu(
  nilai: string | null | undefined,
): boolean {
  const teks = (nilai ?? "").trim();

  if (teks === "") {
    return false;
  }

  return !Number.isNaN(new Date(teks).getTime());
}
