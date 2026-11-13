import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";
import { prisma } from "@/lib/prisma";

export const URL_UPLOAD_ARTIKEL = "/uploads/artikel";

const DIREKTORI_UPLOAD_ARTIKEL = path.join(
  process.cwd(),
  "public",
  "uploads",
  "artikel",
);

const GAMBAR_URL_MAKS = 500;

/**
 * Error validasi payload artikel (Layer 2). Dipetakan ke HTTP 400 oleh route.
 */
export class ValidasiArtikelError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidasiArtikelError";
    this.field = field;
  }
}

export interface DataArtikelValid {
  judul: string;
  isi: string;
  gambarUrl?: string | null;
}

function validasiJudul(nilai: unknown): string {
  if (typeof nilai !== "string") {
    throw new ValidasiArtikelError("judul", "Judul artikel wajib diisi.");
  }

  const judul = nilai.trim();

  if (judul === "") {
    throw new ValidasiArtikelError("judul", "Judul artikel wajib diisi.");
  }

  if (judul.length > JUDUL_MAKS_KARAKTER) {
    throw new ValidasiArtikelError(
      "judul",
      `Judul artikel maksimal ${JUDUL_MAKS_KARAKTER} karakter.`,
    );
  }

  return judul;
}

function validasiIsi(nilai: unknown): string {
  if (typeof nilai !== "string") {
    throw new ValidasiArtikelError("isi", "Isi artikel wajib diisi.");
  }

  const isi = nilai.trim();

  if (isi === "") {
    throw new ValidasiArtikelError("isi", "Isi artikel wajib diisi.");
  }

  if (isi.length > ISI_MAKS_KARAKTER) {
    throw new ValidasiArtikelError(
      "isi",
      `Isi artikel maksimal ${ISI_MAKS_KARAKTER} karakter.`,
    );
  }

  return isi;
}

function validasiGambarUrl(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined) {
    return null;
  }

  if (typeof nilai !== "string") {
    throw new ValidasiArtikelError("gambarUrl", "gambarUrl harus berupa teks.");
  }

  const url = nilai.trim();

  if (url === "") {
    return null;
  }

  if (url.length > GAMBAR_URL_MAKS) {
    throw new ValidasiArtikelError(
      "gambarUrl",
      `gambarUrl maksimal ${GAMBAR_URL_MAKS} karakter.`,
    );
  }

  return url;
}

/**
 * Memvalidasi payload JSON artikel. `gambarUrl` bersifat opsional: hanya
 * dimasukkan ke hasil bila key tersebut memang dikirim, sehingga operasi
 * update tidak menimpa gambar lama secara tidak sengaja.
 */
export function validasiPayloadArtikel(payload: unknown): DataArtikelValid {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new ValidasiArtikelError("body", "Payload artikel tidak valid.");
  }

  const obj = payload as Record<string, unknown>;
  const hasil: DataArtikelValid = {
    judul: validasiJudul(obj.judul),
    isi: validasiIsi(obj.isi),
  };

  if (Object.prototype.hasOwnProperty.call(obj, "gambarUrl")) {
    hasil.gambarUrl = validasiGambarUrl(obj.gambarUrl);
  }

  return hasil;
}

export const validasiDataArtikel = validasiPayloadArtikel;
export const validasiInputArtikel = validasiPayloadArtikel;

export interface OpsiDaftarArtikel {
  take?: number;
  skip?: number;
}

type ArgDaftarArtikel = number | OpsiDaftarArtikel;

function normalisasiOpsiDaftar(
  arg1?: ArgDaftarArtikel,
  arg2?: number,
): OpsiDaftarArtikel {
  if (arg1 !== undefined && typeof arg1 === "object") {
    return arg1;
  }

  return {
    take: typeof arg1 === "number" ? arg1 : undefined,
    skip: arg2,
  };
}

/**
 * Mengambil daftar artikel dengan opsi pagination opsional. Mendukung dua
 * bentuk pemanggilan agar kompatibel dengan konsumen lama:
 *   ambilSemuaArtikel({ take, skip })  atau  ambilSemuaArtikel(take, skip)
 * Urutan memakai `id` (unik, monoton) agar stabil untuk pagination.
 */
export async function ambilSemuaArtikel(
  arg1?: ArgDaftarArtikel,
  arg2?: number,
) {
  const opsi = normalisasiOpsiDaftar(arg1, arg2);

  return prisma.artikel.findMany({
    orderBy: { id: "desc" },
    ...(typeof opsi.take === "number" ? { take: opsi.take } : {}),
    ...(typeof opsi.skip === "number" ? { skip: opsi.skip } : {}),
  });
}

export const ambilDaftarArtikel = ambilSemuaArtikel;
export const daftarArtikel = ambilSemuaArtikel;

export async function buatArtikel(payload: unknown) {
  const data = validasiPayloadArtikel(payload);
  return prisma.artikel.create({ data });
}

export const tambahArtikel = buatArtikel;
export const simpanArtikel = buatArtikel;

export async function ambilArtikelById(id: number) {
  return prisma.artikel.findUnique({ where: { id } });
}

export async function perbaruiArtikel(id: number, payload: unknown) {
  const data = validasiPayloadArtikel(payload);

  try {
    return await prisma.artikel.update({ where: { id }, data });
  } catch (error) {
    if (adalahArtikelTidakDitemukan(error)) {
      return null;
    }

    throw error;
  }
}

export async function hapusArtikel(id: number): Promise<boolean> {
  const hasil = await prisma.artikel.deleteMany({ where: { id } });
  return hasil.count > 0;
}

export interface HasilGambarArtikel {
  gambarUrl: string | null;
}

export interface BerkasGambarTersimpan {
  buffer: Uint8Array;
  ekstensi: string;
}

function adalahArtikelTidakDitemukan(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2025"
  );
}

/**
 * Menghapus file gambar dari disk berdasarkan URL publiknya (best-effort:
 * kegagalan hapus tidak boleh menggagalkan operasi utama). Aman dari path
 * traversal: hanya memproses URL di dalam direktori upload dan memakai
 * `path.basename` untuk nama file, sehingga `../` tidak pernah dipakai.
 */
async function hapusFileGambar(gambarUrl: string | null): Promise<void> {
  if (gambarUrl === null) {
    return;
  }

  const prefix = `${URL_UPLOAD_ARTIKEL}/`;

  if (!gambarUrl.startsWith(prefix)) {
    return;
  }

  const namaFile = path.basename(gambarUrl.slice(prefix.length));

  if (namaFile === "" || namaFile === "." || namaFile === "..") {
    return;
  }

  try {
    await unlink(path.join(DIREKTORI_UPLOAD_ARTIKEL, namaFile));
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
      console.warn(
        "[artikel-service] Gagal menghapus berkas gambar lama:",
        error,
      );
    }
  }
}

/**
 * Menyimpan gambar artikel dengan urutan aman:
 *   1) tulis file baru (nama UUID + ekstensi, tidak memakai nama asli user),
 *   2) update kolom `gambarUrl` di DB,
 *   3) hapus file lama (best-effort) setelah DB sukses.
 * Bila update DB gagal, file baru di-rollback agar tidak meninggalkan orphan.
 */
export async function simpanGambarArtikel(
  id: number,
  berkas: BerkasGambarTersimpan,
): Promise<HasilGambarArtikel | null> {
  const artikel = await prisma.artikel.findUnique({ where: { id } });

  if (artikel === null) {
    return null;
  }

  const namaFile = `${randomUUID()}${berkas.ekstensi}`;
  const jalurFileBaru = path.join(DIREKTORI_UPLOAD_ARTIKEL, namaFile);
  const gambarUrl = `${URL_UPLOAD_ARTIKEL}/${namaFile}`;

  await mkdir(DIREKTORI_UPLOAD_ARTIKEL, { recursive: true });
  await writeFile(jalurFileBaru, berkas.buffer);

  try {
    await prisma.artikel.update({ where: { id }, data: { gambarUrl } });
  } catch (error) {
    await unlink(jalurFileBaru).catch(() => undefined);

    if (adalahArtikelTidakDitemukan(error)) {
      return null;
    }

    throw error;
  }

  await hapusFileGambar(artikel.gambarUrl ?? null);

  return { gambarUrl };
}

/**
 * Menghapus gambar artikel: set `gambarUrl = null` di DB lalu hapus file dari
 * disk (best-effort).
 */
export async function hapusGambarArtikel(
  id: number,
): Promise<HasilGambarArtikel | null> {
  const artikel = await prisma.artikel.findUnique({ where: { id } });

  if (artikel === null) {
    return null;
  }

  try {
    await prisma.artikel.update({ where: { id }, data: { gambarUrl: null } });
  } catch (error) {
    if (adalahArtikelTidakDitemukan(error)) {
      return null;
    }

    throw error;
  }

  await hapusFileGambar(artikel.gambarUrl ?? null);

  return { gambarUrl: null };
}
