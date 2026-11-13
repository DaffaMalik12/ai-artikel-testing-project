import type { Artikel, ArtikelDaftar } from "@/app/types/artikel";
import { teksAtauNull } from "@/lib/utils/teks";

/**
 * Satu-satunya sumber kontrak artikel untuk sisi client maupun server.
 *
 * Modul ini sengaja bebas dependensi Node (`process`, `fs`, dsb.) agar aman
 * diimpor komponen `"use client"` maupun modul server. Helper murni seperti
 * `teksAtauNull` tinggal di `lib/utils/teks.ts`, dan util tanggal di
 * `lib/utils/tanggal.ts`, agar modul ini tetap fokus pada HTTP (revisi QA
 * VO-51 poin 1 & 2).
 */
export const ENDPOINT_ARTIKEL = "/api/artikel";

const PESAN_KONEKSI =
  "Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.";

export type FieldArtikel = "judul" | "isi" | "gambarUrl";

export class ApiArtikelError extends Error {
  readonly status?: number;
  readonly field?: FieldArtikel;

  constructor(
    message: string,
    opsi: { status?: number; field?: FieldArtikel } = {},
  ) {
    super(message);
    this.name = "ApiArtikelError";
    this.status = opsi.status;
    this.field = opsi.field;
  }
}

export interface PayloadArtikel {
  judul: string;
  isi: string;
}

export function adalahObjek(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === "object" && nilai !== null && !Array.isArray(nilai);
}

/** Menerima payload langsung maupun yang dibungkus `{ data: ... }`. */
export function bukaBungkusData(nilai: unknown): unknown {
  if (adalahObjek(nilai) && adalahObjek(nilai.data)) {
    return nilai.data;
  }

  return nilai;
}

/**
 * Menyimpulkan field bermasalah dari pesan error server agar form bisa
 * menempelkan pesan validasi 400 tepat di bawah input terkait.
 */
export function simpulkanField(pesan: string): FieldArtikel | undefined {
  const teks = pesan.toLowerCase();

  if (teks.includes("judul")) {
    return "judul";
  }

  if (teks.includes("isi artikel")) {
    return "isi";
  }

  if (teks.includes("gambar")) {
    return "gambarUrl";
  }

  return undefined;
}

export async function bacaBodyJsonRespons(
  respons: Response,
): Promise<unknown> {
  if (respons.status === 204) {
    return null;
  }

  const teks = await respons.text();

  if (teks.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(teks) as unknown;
  } catch {
    throw new ApiArtikelError("Respons dari server bukan JSON yang valid.", {
      status: respons.status,
    });
  }
}

export async function bacaPesanErrorRespons(
  respons: Response,
  pesanCadangan: string,
): Promise<string> {
  try {
    const teks = await respons.text();

    if (teks.trim() !== "") {
      try {
        const data = JSON.parse(teks) as unknown;

        if (adalahObjek(data)) {
          for (const kunci of ["message", "error", "pesan"]) {
            const nilai = teksAtauNull(data[kunci]);

            if (nilai !== null) {
              return nilai;
            }
          }
        }
      } catch {
        // Body bukan JSON; pakai pesan cadangan.
      }
    }
  } catch {
    // Body tidak terbaca; pakai pesan cadangan.
  }

  return pesanCadangan;
}

/** Menormalkan satu item daftar (tanpa `isi`). */
export function normalisasiArtikelRingkas(
  item: unknown,
): ArtikelDaftar | null {
  if (!adalahObjek(item)) {
    return null;
  }

  const id = item.id;
  const judul = item.judul ?? item.title;
  const createdAt = item.createdAt ?? item.created_at;

  const idValid = typeof id === "string" || typeof id === "number";

  if (!idValid || String(id).trim() === "") {
    return null;
  }

  if (typeof judul !== "string" || judul.trim() === "") {
    return null;
  }

  return {
    id: String(id),
    judul: judul.trim(),
    createdAt: typeof createdAt === "string" ? createdAt : "",
    gambarUrl: teksAtauNull(item.gambarUrl),
  };
}

/** Menormalkan artikel lengkap (dengan `isi`). */
export function normalisasiArtikel(payload: unknown): Artikel | null {
  const data = bukaBungkusData(payload);

  if (!adalahObjek(data)) {
    return null;
  }

  const id = data.id;
  const idValid = typeof id === "string" || typeof id === "number";

  if (!idValid || String(id).trim() === "") {
    return null;
  }

  const judul = data.judul ?? data.title;
  const isi = data.isi ?? data.content;

  if (typeof judul !== "string" || judul.trim() === "") {
    return null;
  }

  if (typeof isi !== "string" || isi.trim() === "") {
    return null;
  }

  const createdAt = data.createdAt ?? data.created_at;

  return {
    id: String(id),
    judul: judul.trim(),
    isi: isi.trim(),
    createdAt: typeof createdAt === "string" ? createdAt : "",
    gambarUrl: teksAtauNull(data.gambarUrl),
  };
}

function kandidatArray(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (adalahObjek(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }

  return null;
}

/**
 * Daftar artikel lengkap (dengan `isi`) — dipakai data layer server.
 * Format tak dikenali dianggap error kontrak, bukan daftar kosong.
 */
export function normalisasiDaftarArtikel(payload: unknown): Artikel[] {
  const kandidat = kandidatArray(payload);

  if (kandidat === null) {
    throw new ApiArtikelError("Format data artikel dari server tidak dikenali.");
  }

  return kandidat
    .map(normalisasiArtikel)
    .filter((item): item is Artikel => item !== null);
}

/** Daftar artikel ringkas (tanpa `isi`) — dipakai list client. */
export function normalisasiDaftarArtikelRingkas(
  payload: unknown,
): ArtikelDaftar[] {
  const kandidat = kandidatArray(payload);

  if (kandidat === null) {
    throw new ApiArtikelError("Format data artikel dari server tidak dikenali.");
  }

  return kandidat
    .map(normalisasiArtikelRingkas)
    .filter((item): item is ArtikelDaftar => item !== null);
}

function keArtikel(payload: unknown): Artikel {
  const hasil = normalisasiArtikel(payload);

  return (
    hasil ?? {
      id: "",
      judul: "",
      isi: "",
      createdAt: "",
      gambarUrl: null,
    }
  );
}

async function kirimJson(
  url: string,
  metode: "POST" | "PUT",
  isiBody: string,
  pesanGagal: string,
): Promise<Artikel> {
  let respons: Response;

  try {
    respons = await fetch(url, {
      method: metode,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: isiBody,
    });
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (!respons.ok) {
    const pesan = await bacaPesanErrorRespons(respons, pesanGagal);

    throw new ApiArtikelError(pesan, {
      status: respons.status,
      field: simpulkanField(pesan),
    });
  }

  return keArtikel(await bacaBodyJsonRespons(respons));
}

export async function tambahArtikel(payload: PayloadArtikel): Promise<Artikel> {
  return kirimJson(
    ENDPOINT_ARTIKEL,
    "POST",
    JSON.stringify({ judul: payload.judul, isi: payload.isi }),
    "Gagal menyimpan artikel.",
  );
}

export async function perbaruiArtikel(
  id: string,
  payload: PayloadArtikel,
): Promise<Artikel> {
  const idBersih = String(id ?? "").trim();

  if (idBersih === "") {
    throw new ApiArtikelError("ID artikel tidak valid.", { status: 400 });
  }

  return kirimJson(
    `${ENDPOINT_ARTIKEL}/${encodeURIComponent(idBersih)}`,
    "PUT",
    JSON.stringify({ judul: payload.judul, isi: payload.isi }),
    "Gagal memperbarui artikel.",
  );
}

/**
 * Pemetaan status error endpoint gambar ke pesan Indonesia yang siap
 * ditampilkan (spesifikasi tiket: 400/401/404/500).
 */
function pesanGagalGambar(status: number): string {
  switch (status) {
    case 400:
      return "Gambar tidak valid. Gunakan berkas JPEG, PNG, atau WebP maksimal 2 MB.";
    case 401:
      return "Anda harus login untuk mengubah gambar artikel.";
    case 404:
      return "Artikel tidak ditemukan.";
    case 413:
      return "Ukuran gambar maksimal 2 MB.";
    case 500:
      return "Server gagal memproses gambar artikel. Coba lagi beberapa saat lagi.";
    default:
      return "Gagal memproses gambar artikel. Coba lagi beberapa saat lagi.";
  }
}

function ambilGambarUrl(payload: unknown): string | null {
  const data = bukaBungkusData(payload);

  if (!adalahObjek(data)) {
    return teksAtauNull(payload);
  }

  return teksAtauNull(data.gambarUrl);
}

/**
 * Mengunggah gambar artikel lewat `multipart/form-data` (field `gambar`).
 * `Content-Type` sengaja TIDAK di-set manual agar browser menambahkan
 * boundary multipart yang benar.
 */
export async function unggahGambarArtikel(
  id: string,
  berkas: File,
): Promise<string> {
  const idBersih = String(id ?? "").trim();

  if (idBersih === "") {
    throw new ApiArtikelError("ID artikel tidak valid.", { status: 400 });
  }

  const form = new FormData();
  form.append("gambar", berkas);

  let respons: Response;

  try {
    respons = await fetch(
      `${ENDPOINT_ARTIKEL}/${encodeURIComponent(idBersih)}/gambar`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        body: form,
      },
    );
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (!respons.ok) {
    throw new ApiArtikelError(
      await bacaPesanErrorRespons(respons, pesanGagalGambar(respons.status)),
      { status: respons.status },
    );
  }

  const url = ambilGambarUrl(await bacaBodyJsonRespons(respons));

  if (url === null) {
    throw new ApiArtikelError(
      "Server tidak mengembalikan URL gambar. Coba unggah ulang.",
      { status: respons.status },
    );
  }

  return url;
}

export async function hapusGambarArtikel(id: string): Promise<void> {
  const idBersih = String(id ?? "").trim();

  if (idBersih === "") {
    throw new ApiArtikelError("ID artikel tidak valid.", { status: 400 });
  }

  let respons: Response;

  try {
    respons = await fetch(
      `${ENDPOINT_ARTIKEL}/${encodeURIComponent(idBersih)}/gambar`,
      {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      },
    );
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (!respons.ok) {
    throw new ApiArtikelError(
      await bacaPesanErrorRespons(respons, pesanGagalGambar(respons.status)),
      { status: respons.status },
    );
  }
}

function adalahAbort(kesalahan: unknown): boolean {
  return kesalahan instanceof DOMException && kesalahan.name === "AbortError";
}

async function ambilJsonDenganSignal(
  url: string,
  signal: AbortSignal | undefined,
  pesanGagal: string,
): Promise<Response | null> {
  let respons: Response;

  try {
    respons = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
  } catch (kesalahan) {
    if (adalahAbort(kesalahan)) {
      throw kesalahan;
    }

    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (respons.status === 404) {
    return null;
  }

  if (!respons.ok) {
    const pesan = await bacaPesanErrorRespons(respons, pesanGagal);

    throw new ApiArtikelError(pesan, { status: respons.status });
  }

  return respons;
}

export async function ambilDaftarArtikel(
  signal?: AbortSignal,
): Promise<ArtikelDaftar[]> {
  const respons = await ambilJsonDenganSignal(
    ENDPOINT_ARTIKEL,
    signal,
    "Gagal mengambil daftar artikel.",
  );

  if (respons === null) {
    return [];
  }

  const data = await bacaBodyJsonRespons(respons);

  if (data === null) {
    return [];
  }

  return normalisasiDaftarArtikelRingkas(data);
}

export async function ambilArtikelById(
  id: string,
  signal?: AbortSignal,
): Promise<ArtikelDaftar | null> {
  const idBersih = (id ?? "").trim();

  if (idBersih === "") {
    return null;
  }

  const respons = await ambilJsonDenganSignal(
    `${ENDPOINT_ARTIKEL}/${encodeURIComponent(idBersih)}`,
    signal,
    "Gagal mengambil artikel.",
  );

  if (respons === null) {
    return null;
  }

  const data = await bacaBodyJsonRespons(respons);

  if (data === null) {
    return null;
  }

  return normalisasiArtikelRingkas(bukaBungkusData(data));
}

export async function hapusArtikel(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  const idBersih = (id ?? "").trim();

  if (idBersih === "") {
    throw new ApiArtikelError("ID artikel tidak valid.", { status: 400 });
  }

  let respons: Response;

  try {
    respons = await fetch(
      `${ENDPOINT_ARTIKEL}/${encodeURIComponent(idBersih)}`,
      {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      },
    );
  } catch (kesalahan) {
    if (adalahAbort(kesalahan)) {
      throw kesalahan;
    }

    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (!respons.ok) {
    const pesan = await bacaPesanErrorRespons(
      respons,
      `Gagal menghapus artikel (${respons.status}).`,
    );

    throw new ApiArtikelError(pesan, { status: respons.status });
  }
}
