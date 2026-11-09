import { beforeEach, describe, expect, it, vi } from "vitest";

const ambilSemuaArtikelMock = vi.fn();
const buatArtikelMock = vi.fn();
const cekRateLimitMock = vi.fn();
const ambilSesiRequestMock = vi.fn();

vi.mock("@/lib/services/artikel-service", () => ({
  ValidasiArtikelError: class extends Error {
    field: string;

    constructor(field: string, message: string) {
      super(message);
      this.name = "ValidasiArtikelError";
      this.field = field;
    }
  },
  ambilSemuaArtikel: (...args: unknown[]) => ambilSemuaArtikelMock(...args),
  buatArtikel: (...args: unknown[]) => buatArtikelMock(...args),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  cekRateLimit: (...args: unknown[]) => cekRateLimitMock(...args),
  ambilKunciKlien: (request: Request) =>
    request.headers.get("x-forwarded-for") ?? "unknown",
}));

vi.mock("@/lib/middlewares/autentikasi", async () => {
  const { NextResponse } = await import("next/server");

  return {
    NAMA_COOKIE_SESI: "sesi_token",
    ambilTokenSesiDariHeader: () => null,
    ambilSesiRequest: (...args: unknown[]) => ambilSesiRequestMock(...args),
    responsBelumLogin: () =>
      NextResponse.json(
        { message: "Anda harus login untuk melakukan aksi ini." },
        { status: 401 },
      ),
  };
});

import { GET, POST } from "./route";
import { ValidasiArtikelError } from "@/lib/services/artikel-service";

function requestGet(query = "") {
  return new Request(`http://localhost:3000/api/artikel${query}`);
}

function requestPost(body: string) {
  return new Request("http://localhost:3000/api/artikel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ambilSesiRequestMock.mockResolvedValue({ penggunaId: 1, username: "admin" });
  cekRateLimitMock.mockReturnValue({
    diizinkan: true,
    sisaKuota: 9,
    resetDetik: 60,
  });
});

describe("GET /api/artikel", () => {
  it("mengembalikan 200 dan daftar artikel", async () => {
    const daftar = [{ id: 1, judul: "Judul", isi: "Isi" }];
    ambilSemuaArtikelMock.mockResolvedValue(daftar);

    const response = await GET(requestGet());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(daftar);
    expect(ambilSemuaArtikelMock).toHaveBeenCalledWith({
      take: undefined,
      skip: undefined,
    });
  });

  it("meneruskan limit dan offset yang valid ke service", async () => {
    ambilSemuaArtikelMock.mockResolvedValue([]);

    const response = await GET(requestGet("?limit=10&offset=5"));

    expect(response.status).toBe(200);
    expect(ambilSemuaArtikelMock).toHaveBeenCalledWith({ take: 10, skip: 5 });
  });

  it("mengembalikan 400 untuk limit di luar batas", async () => {
    const response = await GET(requestGet("?limit=0"));

    expect(response.status).toBe(400);
    expect(ambilSemuaArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 untuk limit bukan angka", async () => {
    const response = await GET(requestGet("?limit=abc"));

    expect(response.status).toBe(400);
    expect(ambilSemuaArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 untuk limit melebihi maksimum", async () => {
    const response = await GET(requestGet("?limit=101"));

    expect(response.status).toBe(400);
  });

  it("mengembalikan 400 untuk offset negatif", async () => {
    const response = await GET(requestGet("?offset=-1"));

    expect(response.status).toBe(400);
    expect(ambilSemuaArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 saat service gagal", async () => {
    ambilSemuaArtikelMock.mockRejectedValue(new Error("DB down"));
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await GET(requestGet());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "Gagal mengambil daftar artikel.",
    });
    consoleErrorMock.mockRestore();
  });
});

describe("POST /api/artikel", () => {
  it("mengembalikan 401 bila pengguna belum login", async () => {
    ambilSesiRequestMock.mockResolvedValue(null);

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringMatching(/login/i),
    });
    expect(buatArtikelMock).not.toHaveBeenCalled();
    expect(cekRateLimitMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 (JSON) saat pemeriksaan sesi gagal", async () => {
    ambilSesiRequestMock.mockRejectedValue(new Error("DB down"));
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "Gagal memeriksa status login.",
    });
    expect(buatArtikelMock).not.toHaveBeenCalled();
    expect(cekRateLimitMock).not.toHaveBeenCalled();
    consoleErrorMock.mockRestore();
  });

  it("mengembalikan 201 dan artikel baru bila sesi valid", async () => {
    buatArtikelMock.mockResolvedValue({
      id: 1,
      judul: "Judul",
      isi: "Isi",
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
    });

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      judul: "Judul",
      isi: "Isi",
    });
    expect(buatArtikelMock).toHaveBeenCalledWith({ judul: "Judul", isi: "Isi" });
  });

  it("mengembalikan 400 untuk body rusak / bukan JSON", async () => {
    const response = await POST(requestPost("bukan-json"));

    expect(response.status).toBe(400);
    expect(buatArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 untuk payload yang gagal validasi service", async () => {
    buatArtikelMock.mockRejectedValue(
      new ValidasiArtikelError("judul", "Judul artikel maksimal 200 karakter."),
    );

    const response = await POST(
      requestPost(JSON.stringify({ judul: "", isi: "Isi" })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Judul artikel maksimal 200 karakter.",
    });
  });

  it("mengembalikan 429 saat melebihi batas rate limit", async () => {
    cekRateLimitMock.mockReturnValue({
      diizinkan: false,
      sisaKuota: 0,
      resetDetik: 45,
    });

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(buatArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 saat service gagal", async () => {
    buatArtikelMock.mockRejectedValue(new Error("DB down"));
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(500);
    consoleErrorMock.mockRestore();
  });
});
