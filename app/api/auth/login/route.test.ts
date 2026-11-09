import { beforeEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const cekRateLimitMock = vi.fn();

vi.mock("@/lib/services/auth-service", () => ({
  KredensialLoginError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "KredensialLoginError";
    }
  },
  ValidasiPenggunaError: class extends Error {
    field: string;

    constructor(field: string, message: string) {
      super(message);
      this.name = "ValidasiPenggunaError";
      this.field = field;
    }
  },
  login: (...args: unknown[]) => loginMock(...args),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  cekRateLimit: (...args: unknown[]) => cekRateLimitMock(...args),
  ambilKunciKlien: () => "1.2.3.4",
}));

import { POST } from "./route";
// Class di-import dari module yang sudah di-mock agar instanceof di route
// cocok dengan instance yang dilempar mock (vi.mock meng-hoist factory).
import {
  KredensialLoginError,
  ValidasiPenggunaError,
} from "@/lib/services/auth-service";

function requestLogin(body: string) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cekRateLimitMock.mockReturnValue({
    diizinkan: true,
    sisaKuota: 4,
    resetDetik: 60,
  });
});

describe("POST /api/auth/login", () => {
  it("mengembalikan 200 dan set cookie HttpOnly saat login sukses", async () => {
    loginMock.mockResolvedValue({
      token: "token-mentah",
      kedaluwarsa: new Date("2026-01-08T00:00:00.000Z"),
      pengguna: { id: 1, username: "budi" },
    });

    const response = await POST(
      requestLogin(JSON.stringify({ username: "budi", password: "password123" })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      pengguna: { id: 1, username: "budi" },
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("sesi_token=token-mentah");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
  });

  it("mengembalikan 401 saat kredensial salah (KredensialLoginError)", async () => {
    // Wajib instance class khusus, bukan Error biasa, karena route hanya
    // memetakan 401 untuk `instanceof KredensialLoginError`.
    loginMock.mockRejectedValue(
      new KredensialLoginError("Username atau password salah."),
    );

    const response = await POST(
      requestLogin(JSON.stringify({ username: "budi", password: "salahbanget" })),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: "Username atau password salah.",
    });
  });

  it("mengembalikan 400 saat input tidak valid (ValidasiPenggunaError)", async () => {
    loginMock.mockRejectedValue(
      new ValidasiPenggunaError("password", "Password harus 8 sampai 200 karakter."),
    );

    const response = await POST(
      requestLogin(JSON.stringify({ username: "budi", password: "pendek" })),
    );

    expect(response.status).toBe(400);
  });

  it("mengembalikan 400 untuk body rusak / bukan JSON", async () => {
    const response = await POST(requestLogin("bukan-json"));

    expect(response.status).toBe(400);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 429 saat melebihi batas rate limit", async () => {
    cekRateLimitMock.mockReturnValue({
      diizinkan: false,
      sisaKuota: 0,
      resetDetik: 30,
    });

    const response = await POST(
      requestLogin(JSON.stringify({ username: "budi", password: "password123" })),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 saat service gagal tak terduga", async () => {
    loginMock.mockRejectedValue(new Error("DB down"));
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(
      requestLogin(JSON.stringify({ username: "budi", password: "password123" })),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "Gagal memproses login.",
    });
    consoleErrorMock.mockRestore();
  });
});
