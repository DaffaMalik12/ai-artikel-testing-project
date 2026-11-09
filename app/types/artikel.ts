/** Data lengkap satu artikel sesuai kontrak `GET /api/artikel/:id`. */
export interface Artikel {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bentuk data minimal yang dibutuhkan halaman daftar artikel.
 *
 * `GET /api/artikel` mengembalikan array objek penuh, tetapi daftar hanya
 * memakai `id`, `judul`, dan `createdAt`. Memakai tipe ini membuat fungsi
 * normalisasi tidak perlu memalsukan `isi`/`updatedAt` — sumber error
 * type-check sebelumnya.
 */
export interface ArtikelDaftar {
  id: string;
  judul: string;
  createdAt: string;
}

export interface ArtikelPayload {
  judul: string;
  isi: string;
}
