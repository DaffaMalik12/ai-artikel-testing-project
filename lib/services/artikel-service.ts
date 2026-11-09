import { prisma } from "@/lib/prisma";
import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";

export class ValidasiArtikelError extends Error {
  readonly field: "judul" | "isi";

  constructor(field: "judul" | "isi", message: string) {
    super(message);
    this.name = "ValidasiArtikelError";
    this.field = field;
  }
}

function validasiTeks(
  nilai: unknown,
  field: "judul" | "isi",
  label: string,
  maksKarakter: number,
): string {
  if (typeof nilai !== "string") {
    throw new ValidasiArtikelError(field, `${label} wajib diisi.`);
  }

  const teks = nilai.trim();

  if (teks.length === 0) {
    throw new ValidasiArtikelError(field, `${label} wajib diisi.`);
  }

  if (teks.length > maksKarakter) {
    throw new ValidasiArtikelError(
      field,
      `${label} maksimal ${maksKarakter} karakter.`,
    );
  }

  return teks;
}

export function validasiInputArtikel(payload: unknown): {
  judul: string;
  isi: string;
} {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidasiArtikelError("judul", "Judul artikel wajib diisi.");
  }

  const data = payload as Record<string, unknown>;
  const judul = validasiTeks(
    data.judul,
    "judul",
    "Judul artikel",
    JUDUL_MAKS_KARAKTER,
  );
  const isi = validasiTeks(data.isi, "isi", "Isi artikel", ISI_MAKS_KARAKTER);

  return { judul, isi };
}

function adalahPrismaKodeP2025(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2025"
  );
}

export async function ambilSemuaArtikel(opsi?: {
  take?: number;
  skip?: number;
}) {
  return prisma.artikel.findMany({
    orderBy: { id: "desc" },
    take: opsi?.take,
    skip: opsi?.skip,
  });
}

export async function ambilArtikelById(id: number) {
  return prisma.artikel.findUnique({ where: { id } });
}

export async function buatArtikel(payload: unknown) {
  const { judul, isi } = validasiInputArtikel(payload);

  return prisma.artikel.create({
    data: { judul, isi },
  });
}

/**
 * Update langsung (tanpa findUnique terlebih dahulu) agar bebas race:
 * bila artikel dihapus di antara pengecekan dan update, Prisma melempar
 * P2025 yang di sini dipetakan menjadi `null` (route mengembalikan 404).
 */
export async function perbaruiArtikel(id: number, payload: unknown) {
  const { judul, isi } = validasiInputArtikel(payload);

  try {
    return await prisma.artikel.update({
      where: { id },
      data: { judul, isi },
    });
  } catch (error) {
    if (adalahPrismaKodeP2025(error)) {
      return null;
    }

    throw error;
  }
}

export async function hapusArtikel(id: number): Promise<boolean> {
  const hasil = await prisma.artikel.deleteMany({ where: { id } });

  return hasil.count > 0;
}
