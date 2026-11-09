import { beforeEach, describe, expect, it, vi } from "vitest";

const ambilSemuaArtikelMock = vi.fn();
const buatArtikelMock = vi.fn();
const cekRateLimitMock = vi.fn();

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

  it("mengembalikan 500 saat service gagal", async () => {
    ambilSemuaArtikelMock.mockRejectedValue(new Error("DB down"));

    const response = await GET(requestGet());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Gagal mengambil daftar artikel.",
    });
  });
});

describe("POST /api/artikel", () => {
  it("mengembalikan 201 dan artikel yang baru dibuat", async () => {
    const artikelBaru = { id: 1, judul: "Judul Baru", isi: "Isi" };
    buatArtikelMock.mockResolvedValue(artikelBaru);

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul Baru", isi: "Isi" })),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(artikelBaru);
    expect(buatArtikelMock).toHaveBeenCalledWith({
      judul: "Judul Baru",
      isi: "Isi",
    });
  });

  it("mengembalikan 429 saat rate limit terlampaui", async () => {
    cekRateLimitMock.mockReturnValue({
      diizinkan: false,
      sisaKuota: 0,
      resetDetik: 30,
    });

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(buatArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 saat body bukan JSON valid", async () => {
    const response = await POST(requestPost("bukan-json"));

    expect(response.status).toBe(400);
    expect(buatArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 saat validasi service gagal", async () => {
    buatArtikelMock.mockRejectedValue(
      new ValidasiArtikelError("judul", "Judul artikel maksimal 200 karakter."),
    );

    const response = await POST(
      requestPost(JSON.stringify({ judul: "x".repeat(201), isi: "Isi" })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Judul artikel maksimal 200 karakter.",
    });
  });

  it("mengembalikan 500 saat terjadi error tak terduga", async () => {
    buatArtikelMock.mockRejectedValue(new Error("Koneksi DB putus"));

    const response = await POST(
      requestPost(JSON.stringify({ judul: "Judul", isi: "Isi" })),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Gagal menyimpan artikel.",
    });
  });
});
