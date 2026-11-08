export type Artikel = {
  id: string;
  judul: string;
  isi: string;
  createdAt: string;
};

export type OpsiErrorArtikel = {
  status?: number;
  url?: string;
  cause?: unknown;
};

/**
 * Error khusus lapisan data artikel.
 *
 * `url` hanya untuk keperluan log di server. Pesan (`message`) tidak pernah
 * memuat host, path penuh, atau kredensial agar aman ditampilkan ke pengguna.
 */
export class ApiArtikelError extends Error {
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, opsi: OpsiErrorArtikel = {}) {
    super(message, opsi.cause === undefined ? undefined : { cause: opsi.cause });
    this.name = "ApiArtikelError";
    this.status = opsi.status;
    this.url = opsi.url;
  }
}

const NAMA_ENV_BASE_URL = "API_BASE_URL";
const NAMA_ENV_ALLOWLIST = "API_BASE_URL_ALLOWLIST";
const BASE_URL_PENGEMBANGAN = "http://localhost:3000";

const PATH_DAFTAR_ARTIKEL = "/api/artikel";

/* -------------------------------------------------------------------------- */
/* Konfigurasi base URL                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Mem-parse base URL dari environment.
 *
 * Mengembalikan `null` bila nilai kosong, dan melempar `ApiArtikelError` bila
 * nilai ada tetapi tidak valid. Pesan error sengaja tidak memuat nilai aslinya
 * karena URL dapat mengandung informasi internal.
 */
export function parseBaseUrl(nilai: string | null | undefined): URL | null {
  const bersih = (nilai ?? "").trim();

  if (bersih === "") {
    return null;
  }

  let url: URL;
  try {
    url = new URL(bersih);
  } catch {
    throw new ApiArtikelError("Nilai API_BASE_URL bukan URL absolut yang valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiArtikelError("API_BASE_URL harus memakai protokol http atau https.");
  }

  if (url.username !== "" || url.password !== "") {
    throw new ApiArtikelError("API_BASE_URL tidak boleh memuat kredensial pengguna.");
  }

  if (url.search !== "" || url.hash !== "") {
    throw new ApiArtikelError("API_BASE_URL tidak boleh memuat query string atau fragment.");
  }

  if (url.hostname === "") {
    throw new ApiArtikelError("API_BASE_URL harus memuat hostname.");
  }

  if (url.pathname !== "/" && url.pathname !== "") {
    throw new ApiArtikelError("API_BASE_URL hanya boleh berisi origin tanpa path.");
  }

  return url;
}

function adalahAlamatIpPrivat(hostname: string): boolean {
  const oktet = hostname.split(".");

  if (oktet.length !== 4 || !oktet.every((bagian) => /^\d{1,3}$/.test(bagian))) {
    return false;
  }

  const [a, b] = oktet.map((bagian) => Number(bagian));

  if (a === 0 || a === 10 || a === 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

/** Mendeteksi host loopback, IP privat, atau domain internal. */
export function adalahHostNonPublik(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "") {
    return true;
  }

  if (host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }

  if (host === "::1" || host === "0.0.0.0") {
    return true;
  }

  if (host.endsWith(".internal") || host.endsWith(".local")) {
    return true;
  }

  return adalahAlamatIpPrivat(host);
}

function bacaAllowlistHost(): Set<string> {
  const mentah = (process.env[NAMA_ENV_ALLOWLIST] ?? "").trim();

  if (mentah === "") {
    return new Set();
  }

  return new Set(
    mentah
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter((host) => host !== ""),
  );
}

/**
 * Menentukan origin API yang boleh dipakai server-side fetch.
 *
 * Kebijakan:
 * - Base URL hanya boleh datang dari `API_BASE_URL` (env server), tidak pernah
 *   dari header request sehingga tidak ada risiko SSRF/self-fetch.
 * - Bila `API_BASE_URL_ALLOWLIST` diisi, host wajib ada di daftar tersebut.
 * - Di produksi host privat/loopback ditolak, kecuali ada di allowlist.
 * - Di luar produksi, `http://localhost:3000` dipakai sebagai fallback.
 */
export function getApiBaseUrl(): string {
  const dariEnv = parseBaseUrl(process.env[NAMA_ENV_BASE_URL]);

  if (dariEnv === null) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiArtikelError(
        "API_BASE_URL wajib dikonfigurasi pada lingkungan produksi.",
      );
    }

    const fallback = parseBaseUrl(BASE_URL_PENGEMBANGAN);

    if (fallback === null) {
      throw new ApiArtikelError("Base URL API artikel tidak dapat ditentukan.");
    }

    return fallback.origin;
  }

  const host = dariEnv.hostname.toLowerCase();
  const allowlist = bacaAllowlistHost();

  if (allowlist.size > 0 && !allowlist.has(host)) {
    throw new ApiArtikelError(
      "Host API_BASE_URL tidak terdaftar pada API_BASE_URL_ALLOWLIST.",
    );
  }

  if (
    allowlist.size === 0 &&
    process.env.NODE_ENV === "production" &&
    adalahHostNonPublik(host)
  ) {
    throw new ApiArtikelError(
      "Host API_BASE_URL mengarah ke jaringan privat dan tidak diizinkan pada produksi.",
    );
  }

  return dariEnv.origin;
}

/* -------------------------------------------------------------------------- */
/* Pemanggilan API                                                            */
/* -------------------------------------------------------------------------- */

type HasilPermintaan = {
  status: number;
  payload: unknown;
};

async function requestArtikelApi(path: string): Promise<HasilPermintaan> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiArtikelError("Tidak dapat menghubungi layanan API artikel.", {
      url,
      cause,
    });
  }

  if (response.status === 404 || response.status === 204) {
    return { status: response.status, payload: null };
  }

  if (!response.ok) {
    throw new ApiArtikelError(
      `API artikel mengembalikan status ${response.status}.`,
      { status: response.status, url },
    );
  }

  const teks = await response.text();

  if (teks.trim() === "") {
    throw new ApiArtikelError("Respons API artikel kosong.", {
      status: response.status,
      url,
    });
  }

  try {
    return { status: response.status, payload: JSON.parse(teks) as unknown };
  } catch (cause) {
    throw new ApiArtikelError("Respons API artikel bukan JSON yang valid.", {
      status: response.status,
      url,
      cause,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Normalisasi data                                                           */
/* -------------------------------------------------------------------------- */

const KUNCI_ID = ["id", "artikelId", "slug"];
const KUNCI_JUDUL = ["judul", "title", "nama"];
const KUNCI_ISI = ["isi", "content", "body"];
const KUNCI_CREATED_AT = [
  "createdAt",
  "created_at",
  "tanggalDibuat",
  "publishedAt",
  "date",
];

function ambilObjek(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function ambilArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Mengambil nilai teks/angka yang tidak kosong dari daftar kunci alternatif. */
function ambilTeks(
  record: Record<string, unknown>,
  kandidat: string[],
): string | null {
  for (const kunci of kandidat) {
    const nilai = record[kunci];

    if (typeof nilai === "string" && nilai.trim() !== "") {
      return nilai.trim();
    }

    if (typeof nilai === "number" && Number.isFinite(nilai)) {
      return String(nilai);
    }
  }

  return null;
}

/** Mendukung respons `{ data: {...} }`, `{ artikel: {...} }`, atau objek langsung. */
function ekstrakObjekData(payload: unknown): unknown {
  const record = ambilObjek(payload);

  if (record === null) {
    return payload;
  }

  const data = ambilObjek(record.data);
  if (data !== null) {
    return data;
  }

  const artikel = ambilObjek(record.artikel);
  if (artikel !== null) {
    return artikel;
  }

  return payload;
}

/**
 * Memvalidasi satu payload artikel.
 *
 * Field wajib (`id`, `judul`, `isi`) harus ada dan tidak kosong. Payload yang
 * tidak lengkap mengembalikan `null` supaya tidak pernah dirender sebagai
 * artikel dengan judul/isi placeholder.
 */
export function normalisasiArtikel(input: unknown): Artikel | null {
  const record = ambilObjek(input);

  if (record === null) {
    return null;
  }

  const id = ambilTeks(record, KUNCI_ID);
  const judul = ambilTeks(record, KUNCI_JUDUL);
  const isi = ambilTeks(record, KUNCI_ISI);

  if (id === null || judul === null || isi === null) {
    return null;
  }

  const createdAt = ambilTeks(record, KUNCI_CREATED_AT);

  return {
    id,
    judul,
    isi,
    createdAt: createdAt ?? "",
  };
}

/* -------------------------------------------------------------------------- */
/* API publik                                                                 */
/* -------------------------------------------------------------------------- */

export async function getArtikelById(id: string): Promise<Artikel | null> {
  const idBersih = (id ?? "").trim();

  if (idBersih === "") {
    return null;
  }

  const { payload } = await requestArtikelApi(
    `${PATH_DAFTAR_ARTIKEL}/${encodeURIComponent(idBersih)}`,
  );

  if (payload === null) {
    return null;
  }

  return normalisasiArtikel(ekstrakObjekData(payload));
}

export async function getDaftarArtikel(): Promise<Artikel[]> {
  const { payload } = await requestArtikelApi(PATH_DAFTAR_ARTIKEL);

  if (payload === null) {
    return [];
  }

  const langsung = ambilArray(payload);
  const dariData =
    langsung === null ? ambilArray(ambilObjek(payload)?.data) : null;
  const daftar = langsung ?? dariData;

  if (daftar === null) {
    throw new ApiArtikelError("Format daftar artikel dari API tidak dikenali.", {
      status: 200,
    });
  }

  return daftar
    .map((item) => normalisasiArtikel(item))
    .filter((item): item is Artikel => item !== null);
}

const formatterTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export function formatTanggal(
  value: string | Date | null | undefined,
  fallback = "Tanggal tidak tersedia",
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const tanggal = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(tanggal.getTime())) {
    return fallback;
  }

  return formatterTanggal.format(tanggal);
}
