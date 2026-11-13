/**
 * Artikel ringkas untuk kebutuhan daftar.
 *
 * `gambarUrl` selalu ada (bukan opsional) agar komponen tidak perlu menebak
 * antara `undefined`, `null`, dan string kosong: `null` berarti belum ada
 * gambar.
 */
export interface ArtikelDaftar {
  id: string;
  judul: string;
  createdAt: string;
  gambarUrl: string | null;
}

/**
 * Artikel lengkap (dengan isi) untuk halaman detail dan edit.
 * Sengaja tidak `extends ArtikelDaftar` supaya kontrak tiap bentuk data
 * eksplisit dan tidak ada properti opsional yang membingungkan.
 */
export interface Artikel {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
  gambarUrl: string | null;
}
