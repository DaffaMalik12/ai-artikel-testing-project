/**
 * Helper teks murni tanpa dependensi Node/React/DOM.
 *
 * Sengaja dipisahkan dari `lib/api/artikel.ts` agar komponen server maupun
 * komponen klien dapat memakainya tanpa ikut menarik modul API client (berisi
 * `fetch` multipart + `credentials`) ke bundle yang tidak membutuhkannya
 * (revisi QA VO-51 poin 3).
 */

/**
 * Menormalkan nilai apa pun menjadi string bermakna atau `null`.
 * String kosong/whitespace dianggap `null` supaya fallback (misal "Belum ada
 * gambar") tampil untuk nilai yang tidak bermakna.
 */
export function teksAtauNull(nilai: unknown): string | null {
  if (typeof nilai !== "string") {
    return null;
  }

  const teks = nilai.trim();

  return teks === "" ? null : teks;
}

/**
 * Merapikan isi artikel menjadi ringkasan satu baris untuk meta description:
 * spasi/baris baru dikolapskan dan pemotongan dilakukan pada batas kata agar
 * tidak memotong kata di tengah (revisi QA VO-51 saran 6).
 */
export function ringkasIsi(isi: string, maks = 160): string {
  const teks = isi.replace(/\s+/g, " ").trim();

  if (teks.length <= maks) {
    return teks;
  }

  const potongan = teks.slice(0, maks);
  const spasiTerakhir = potongan.lastIndexOf(" ");

  const rapi =
    spasiTerakhir > Math.floor(maks * 0.6)
      ? potongan.slice(0, spasiTerakhir)
      : potongan;

  return `${rapi.trimEnd()}…`;
}
