import type { Artikel } from "@/app/types/artikel";
import {
  ApiArtikelError,
  bacaBodyJsonRespons,
  bacaPesanErrorRespons,
  bukaBungkusData,
  normalisasiArtikel,
  normalisasiDaftarArtikel,
} from "@/lib/api/artikel";

// Re-export agar konsumen lama (`@/lib/artikel`) tetap kompatibel, namun
// definisinya tunggal di `@/lib/api/artikel`. Util tanggal sengaja TIDAK
// di-re-export dari sini agar hanya ada satu jalur impor
// (`@/lib/utils/tanggal`) — revisi QA VO-51 poin 2.
export { ApiArtikelError, normalisasiArtikel, normalisasiDaftarArtikel };

const PESAN_KONFIGURASI_API = "Konfigurasi API tidak valid.";
const PESAN_KONEKSI =
  "Tidak dapat terhubung ke server. Coba lagi beberapa saat lagi.";
const BASE_URL_PENGEMBANGAN = "http://localhost:3000";

/**
 * Memvalidasi base URL konfigurasi: hanya origin http/https tanpa path,
 * query, fragment, maupun kredensial (mencegah SSRF & salah konfigurasi).
 */
export function parseBaseUrl(nilai: string | null | undefined): URL | null {
  const teks = (nilai ?? "").trim();

  if (teks === "") {
    return null;
  }

  let url: URL;

  try {
    url = new URL(teks);
  } catch {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (url.username !== "" || url.password !== "") {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (url.search !== "" || url.hash !== "") {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (url.pathname !== "" && url.pathname !== "/") {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (url.hostname === "") {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  return url;
}

function adalahHostPrivat(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return true;
  }

  // 127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16, 172.16.0.0/12
  const pola = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

  return pola.test(host);
}

export function getApiBaseUrl(): string {
  const mentah = (process.env.API_BASE_URL ?? "").trim();
  const produksi = process.env.NODE_ENV === "production";
  const allowlist = (process.env.API_BASE_URL_ALLOWLIST ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== "");

  if (mentah === "") {
    if (produksi) {
      throw new ApiArtikelError(PESAN_KONFIGURASI_API);
    }

    return BASE_URL_PENGEMBANGAN;
  }

  const url = parseBaseUrl(mentah);

  if (url === null) {
    if (produksi) {
      throw new ApiArtikelError(PESAN_KONFIGURASI_API);
    }

    return BASE_URL_PENGEMBANGAN;
  }

  const host = url.hostname.toLowerCase();

  if (allowlist.length > 0 && !allowlist.includes(host)) {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  if (produksi && adalahHostPrivat(host) && !allowlist.includes(host)) {
    throw new ApiArtikelError(PESAN_KONFIGURASI_API);
  }

  return url.origin;
}

export async function getArtikelById(id: string): Promise<Artikel | null> {
  const idBersih = (id ?? "").trim();

  if (idBersih === "") {
    return null;
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/artikel/${encodeURIComponent(idBersih)}`;

  let respons: Response;

  try {
    respons = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (respons.status === 404) {
    return null;
  }

  if (!respons.ok) {
    const pesan = await bacaPesanErrorRespons(
      respons,
      `Gagal mengambil artikel (${respons.status}).`,
    );

    throw new ApiArtikelError(pesan, { status: respons.status });
  }

  const data = await bacaBodyJsonRespons(respons);

  return normalisasiArtikel(bukaBungkusData(data));
}

export async function getDaftarArtikel(): Promise<Artikel[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/artikel`;

  let respons: Response;

  try {
    respons = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiArtikelError(PESAN_KONEKSI);
  }

  if (!respons.ok) {
    const pesan = await bacaPesanErrorRespons(
      respons,
      `Gagal mengambil daftar artikel (${respons.status}).`,
    );

    throw new ApiArtikelError(pesan, { status: respons.status });
  }

  const data = await bacaBodyJsonRespons(respons);

  if (data === null) {
    return [];
  }

  return normalisasiDaftarArtikel(data);
}
