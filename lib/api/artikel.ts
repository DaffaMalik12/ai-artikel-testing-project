import type { PayloadArtikelBaru } from "@/lib/artikel-validasi";

/**
 * Klien API artikel untuk komponen client.
 *
 * Halaman berada di aplikasi yang sama, jadi selalu pakai URL relatif
 * `/api/artikel` (route handler: `app/api/artikel/route.ts`; POST menambah
 * artikel dengan body `{ judul, isi }` dan mengembalikan artikel 201).
 * URL relatif juga memastikan request tidak pernah lari ke host lain.
 */
export const ARTIKEL_API_URL = "/api/artikel";

/** Bentuk artikel yang dikembalikan `POST /api/artikel`. */
export interface Artikel {
  id: string;
  judul: string;
  isi: string;
  createdAt?: string;
  updatedAt?: string;
}

const PESAN_ERROR_UMUM = "Terjadi kesalahan pada server. Silakan coba lagi.";
const PESAN_KONEKSI =
  "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.";

export class ApiArtikelError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiArtikelError";
    this.status = status;
  }
}

export function pesanErrorDari(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallback;
}

/**
 * Body dibaca sebagai teks lebih dulu supaya respons tanpa body (204, atau
 * 201 tanpa payload) tidak memicu error parsing JSON.
 */
async function bacaBody(response: Response): Promise<unknown> {
  const teks = await response.text();

  if (teks.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(teks) as unknown;
  } catch {
    return null;
  }
}

/** Route handler mengembalikan error sebagai `{ message }`; kunci lain didukung untuk kompatibilitas. */
function ambilPesanError(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const kandidat = body as Record<string, unknown>;

    for (const kunci of ["message", "error", "pesan"]) {
      const nilai = kandidat[kunci];

      if (typeof nilai === "string" && nilai.trim() !== "") {
        return nilai;
      }
    }
  }

  return PESAN_ERROR_UMUM;
}

function ambilObjekArtikel(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const kandidat = body as Record<string, unknown>;
  const bersarang = kandidat.artikel;

  if (typeof bersarang === "object" && bersarang !== null) {
    return bersarang as Record<string, unknown>;
  }

  return kandidat;
}

export function normalisasiArtikel(body: unknown): Artikel | null {
  const sumber = ambilObjekArtikel(body);

  if (sumber === null) {
    return null;
  }

  const id = sumber.id;
  const judul = sumber.judul ?? sumber.title;
  const isi = sumber.isi ?? sumber.content;
  const createdAt = sumber.createdAt ?? sumber.created_at;
  const updatedAt = sumber.updatedAt ?? sumber.updated_at;

  if (!(typeof id === "string" || typeof id === "number")) {
    return null;
  }

  return {
    id: String(id),
    judul: typeof judul === "string" ? judul : "",
    isi: typeof isi === "string" ? isi : "",
    createdAt: typeof createdAt === "string" ? createdAt : undefined,
    updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
  };
}

/**
 * Menyimpan artikel baru lewat `POST /api/artikel`.
 *
 * Mengembalikan `null` bila server sukses tanpa mengirim body artikel —
 * pemanggil cukup memperlakukan `null` sebagai "berhasil dibuat".
 */
export async function tambahArtikel(payload: PayloadArtikelBaru): Promise<Artikel | null> {
  let response: Response;

  try {
    response = await fetch(ARTIKEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  const body = await bacaBody(response);

  if (!response.ok) {
    throw new ApiArtikelError(ambilPesanError(body), response.status);
  }

  return normalisasiArtikel(body);
}
