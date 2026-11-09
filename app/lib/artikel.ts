import type { ArtikelDaftar } from "@/app/types/artikel";

export const ENDPOINT_ARTIKEL = "/api/artikel";

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const PESAN_TANGGAL_TIDAK_VALID = "Tanggal tidak tersedia";

/**
 * Error lapisan data artikel.
 *
 * `status` dipakai halaman untuk membedakan 404 dari kegagalan lain, dan
 * `message` selalu berupa pesan yang aman ditampilkan ke pengguna.
 */
export class ApiArtikelError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiArtikelError";
    this.status = status;
  }
}

export function formatTanggal(nilai: string | null | undefined): string {
  const teks = (nilai ?? "").trim();

  if (teks === "") {
    return PESAN_TANGGAL_TIDAK_VALID;
  }

  const tanggal = new Date(teks);

  if (Number.isNaN(tanggal.getTime())) {
    return PESAN_TANGGAL_TIDAK_VALID;
  }

  return FORMAT_TANGGAL.format(tanggal);
}

export function dapatMenampilkanWaktu(nilai: string | null | undefined): boolean {
  const teks = (nilai ?? "").trim();

  if (teks === "") {
    return false;
  }

  return !Number.isNaN(new Date(teks).getTime());
}

function normalisasiArtikelItem(item: unknown): ArtikelDaftar | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }

  const kandidat = item as Record<string, unknown>;
  const id = kandidat.id;
  const judul = kandidat.judul ?? kandidat.title;
  const createdAt = kandidat.createdAt ?? kandidat.created_at;

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
  };
}

/**
 * Menerima array artikel langsung maupun yang dibungkus `{ data: [...] }`.
 * Format tak dikenali dianggap error konfigurasi, bukan daftar kosong, supaya
 * kegagalan kontrak API tidak tampil sebagai "belum ada artikel".
 */
export function normalisasiDaftarArtikel(payload: unknown): ArtikelDaftar[] {
  let kandidat: unknown[] | null = null;

  if (Array.isArray(payload)) {
    kandidat = payload;
  } else if (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    kandidat = (payload as { data: unknown[] }).data;
  }

  if (kandidat === null) {
    throw new ApiArtikelError("Format data artikel dari server tidak dikenali.");
  }

  return kandidat
    .map(normalisasiArtikelItem)
    .filter((item): item is ArtikelDaftar => item !== null);
}

async function bacaBodyJson(respons: Response): Promise<unknown> {
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
    throw new ApiArtikelError("Respons dari server bukan JSON yang valid.");
  }
}

async function bacaPesanError(respons: Response, pesanDefault: string): Promise<string> {
  try {
    const teks = await respons.text();

    if (teks.trim() !== "") {
      try {
        const data = JSON.parse(teks) as unknown;

        if (typeof data === "object" && data !== null) {
          const kandidat = data as Record<string, unknown>;

          for (const kunci of ["message", "error", "pesan"]) {
            const nilai = kandidat[kunci];

            if (typeof nilai === "string" && nilai.trim() !== "") {
              return nilai;
            }
          }
        }
      } catch {
        // Body bukan JSON; pakai pesan default.
      }
    }
  } catch {
    // Body tidak terbaca; pakai pesan default.
  }

  return pesanDefault;
}

export async function ambilDaftarArtikel(signal?: AbortSignal): Promise<ArtikelDaftar[]> {
  const respons = await fetch(ENDPOINT_ARTIKEL, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!respons.ok) {
    const pesan = await bacaPesanError(
      respons,
      `Gagal memuat daftar artikel (status ${respons.status}).`,
    );

    throw new ApiArtikelError(pesan, respons.status);
  }

  const payload = await bacaBodyJson(respons);

  if (payload === null) {
    return [];
  }

  return normalisasiDaftarArtikel(payload);
}

export async function hapusArtikel(id: string): Promise<void> {
  if (id.trim() === "") {
    throw new ApiArtikelError("ID artikel tidak valid.");
  }

  const respons = await fetch(`${ENDPOINT_ARTIKEL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!respons.ok) {
    const pesan = await bacaPesanError(
      respons,
      `Gagal menghapus artikel (status ${respons.status}).`,
    );

    throw new ApiArtikelError(pesan, respons.status);
  }
}
