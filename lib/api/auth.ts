/**
 * API client untuk fitur autentikasi.
 *
 * Cookie `sesi_token` (HttpOnly) di-set otomatis oleh browser dari header
 * `Set-Cookie` server berkat `credentials: "same-origin"`. Token TIDAK
 * PERNAH disimpan di localStorage / state JS.
 */

export interface LoginSuccess {
  pengguna: {
    id: number;
    username: string;
  };
}

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

const PESAN_GAGAL_UMUM = "Gagal memproses login. Coba lagi nanti.";
const PESAN_KREDENSIAL_SALAH = "Username atau password salah.";
const PESAN_RATE_LIMIT = "Terlalu banyak percobaan login. Coba lagi nanti.";

async function ambilPesanServer(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      const { message } = body as { message: unknown };
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  } catch {
    // Body bukan JSON atau rusak — abaikan, pakai pesan bawaan.
  }
  return null;
}

function parseSukses(body: unknown): LoginSuccess | null {
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
  return { pengguna: { id, username } };
}

export async function login(
  username: string,
  password: string,
): Promise<LoginSuccess> {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
  } catch {
    // Koneksi gagal / offline.
    throw new LoginError(PESAN_GAGAL_UMUM);
  }

  if (response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const hasil = parseSukses(body);
    if (hasil === null) {
      throw new LoginError(PESAN_GAGAL_UMUM);
    }
    return hasil;
  }

  switch (response.status) {
    case 400: {
      // 400: pesan spesifik dari server (error validasi).
      const pesan = await ambilPesanServer(response);
      throw new LoginError(pesan ?? PESAN_GAGAL_UMUM);
    }
    case 401:
      throw new LoginError(PESAN_KREDENSIAL_SALAH);
    case 429:
      throw new LoginError(PESAN_RATE_LIMIT);
    default:
      throw new LoginError(PESAN_GAGAL_UMUM);
  }
}
