import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginError, login } from "./auth";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

// Response palsu ringan: client hanya memakai `ok`, `status`, dan `json()`.
function buatResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("login (API client)", () => {
  it("memanggil POST /api/auth/login dengan payload, header, dan credentials same-origin", async () => {
    fetchMock.mockResolvedValue(
      buatResponse(200, { pengguna: { id: 1, username: "budi" } }),
    );

    const hasil = await login("budi", "password123");

    expect(hasil).toEqual({ pengguna: { id: 1, username: "budi" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(
      JSON.stringify({ username: "budi", password: "password123" }),
    );
  });

  it("melempar LoginError dengan pesan server untuk status 400", async () => {
    fetchMock.mockResolvedValue(
      buatResponse(400, { message: "Password harus 8 sampai 200 karakter." }),
    );

    await expect(login("budi", "pendek")).rejects.toThrow(LoginError);
    await expect(login("budi", "pendek")).rejects.toThrow(
      "Password harus 8 sampai 200 karakter.",
    );
  });

  it("melempar pesan kredensial salah untuk status 401", async () => {
    fetchMock.mockResolvedValue(
      buatResponse(401, { message: "Username atau password salah." }),
    );

    await expect(login("budi", "salahbanget")).rejects.toThrow(
      "Username atau password salah.",
    );
  });

  it("melempar pesan rate limit untuk status 429", async () => {
    fetchMock.mockResolvedValue(buatResponse(429, { message: "too many" }));

    await expect(login("budi", "password123")).rejects.toThrow(
      "Terlalu banyak percobaan login. Coba lagi nanti.",
    );
  });

  it("melempar pesan gagal umum untuk status 500", async () => {
    fetchMock.mockResolvedValue(buatResponse(500, { message: "DB down" }));

    await expect(login("budi", "password123")).rejects.toThrow(
      "Gagal memproses login. Coba lagi nanti.",
    );
  });

  it("melempar pesan gagal umum saat jaringan gagal", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(login("budi", "password123")).rejects.toThrow(
      "Gagal memproses login. Coba lagi nanti.",
    );
  });

  it("melempar pesan gagal umum bila response sukses tidak sesuai kontrak", async () => {
    fetchMock.mockResolvedValue(buatResponse(200, { aneh: true }));

    await expect(login("budi", "password123")).rejects.toThrow(LoginError);
  });
});
