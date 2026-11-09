/**
 * API client untuk pemeriksaan sesi (GET /api/auth/me) dan logout
 * (POST /api/auth/logout).
 *
 * Cookie `sesi_token` (HttpOnly) dikirim/dihapus otomatis oleh browser
 * berkat `credentials: "same-origin"`. Token TIDAK PERNAH disimpan di
 * localStorage / state JS.
 */

export interface Pengguna {
  id: number;
  username: string;
}

export class SesiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SesiError";
  }
}

const PESAN_GAGAL_SESI = "Gagal memeriksa sesi. Coba lagi nanti.";
const PESAN_GAGAL_KELUAR = "Gagal keluar. Coba lagi nanti.";

function parsePengguna(body: unknown): Pengguna | null {
  if (typeof body !== "object" || body === null || !("pengguna" in body)) {
    return null;
  }
  const pengguna = (body as { pengguna?: unknown }).pengguna;
  if (typeof pengguna !== "object" || pengguna === null) {
    return null;
  }
  const { id, username } = pengguna as { id?: unknown; username?: unknown };
  if (typeof id !== "number" || typeof username !== "string") {
    return null;
  }
  return { id, username };
}

/**
 * Mengembalikan data pengguna bila sesi aktif (200), `null` bila belum
 * login (401), dan melempar `SesiError` bila gagal lain (jaringan/500).
 */
export async function ambilSesi(
  signal?: AbortSignal,
): Promise<Pengguna | null> {
  let response: Response;
  try {
    response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    // Batal karena unmount: lempar apa adanya agar pemanggil mengabaikannya.
    if (signal?.aborted) {
      throw error;
    }
    throw new SesiError(PESAN_GAGAL_SESI);
  }

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new SesiError(PESAN_GAGAL_SESI);
  }

  const body: unknown = await response.json().catch(() => null);
  const pengguna = parsePengguna(body);
  if (pengguna === null) {
    throw new SesiError(PESAN_GAGAL_SESI);
  }
  return pengguna;
}

export async function logout(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    throw new SesiError(PESAN_GAGAL_KELUAR);
  }

  if (!response.ok) {
    throw new SesiError(PESAN_GAGAL_KELUAR);
  }
}
