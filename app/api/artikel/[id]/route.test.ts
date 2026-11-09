import { beforeEach, describe, expect, it, vi } from "vitest";

const ambilArtikelByIdMock = vi.fn();
const perbaruiArtikelMock = vi.fn();
const hapusArtikelMock = vi.fn();
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
  ambilArtikelById: (...args: unknown[]) => ambilArtikelByIdMock(...args),
  perbaruiArtikel: (...args: unknown[]) => perbaruiArtikelMock(...args),
  hapusArtikel: (...args: unknown[]) => hapusArtikelMock(...args),
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

import { DELETE, GET, PUT } from "./route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function requestPut(body: string) {
  return new Request("http://localhost:3000/api/artikel/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function requestDelete() {
  return new Request("http://localhost:3000/api/artikel/1", { method: "DELETE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  ambilSesiRequestMock.mockResolvedValue({ penggunaId: 1, username: "admin" });
});

describe("GET /api/artikel/:id", () => {
  it("mengembalikan 200 dan artikel", async () => {
    ambilArtikelByIdMock.mockResolvedValue({ id: 1, judul: "Judul", isi: "Isi" });

    const response = await GET(
      new Request("http://localhost:3000/api/artikel/1"),
      context("1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: 1 });
  });

  it("mengembalikan 400 untuk id bukan angka", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/artikel/abc"),
      context("abc"),
    );

    expect(response.status).toBe(400);
    expect(ambilArtikelByIdMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 bila artikel tidak ada", async () => {
    ambilArtikelByIdMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/artikel/99"),
      context("99"),
    );

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/artikel/:id", () => {
  it("mengembalikan 401 bila belum login", async () => {
    ambilSesiRequestMock.mockResolvedValue(null);

    const response = await PUT(
      requestPut(JSON.stringify({ judul: "J", isi: "I" })),
      context("1"),
    );

    expect(response.status).toBe(401);
    expect(perbaruiArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 200 dan artikel terbaru bila sukses", async () => {
    perbaruiArtikelMock.mockResolvedValue({ id: 1, judul: "Baru", isi: "Isi" });

    const response = await PUT(
      requestPut(JSON.stringify({ judul: "Baru", isi: "Isi" })),
      context("1"),
    );

    expect(response.status).toBe(200);
    expect(perbaruiArtikelMock).toHaveBeenCalledWith(1, {
      judul: "Baru",
      isi: "Isi",
    });
  });

  it("mengembalikan 400 untuk id tidak valid atau body rusak", async () => {
    const responseId = await PUT(requestPut("{}"), context("abc"));
    expect(responseId.status).toBe(400);

    const responseBody = await PUT(requestPut("rusak"), context("1"));
    expect(responseBody.status).toBe(400);
  });

  it("mengembalikan 404 bila artikel tidak ada", async () => {
    perbaruiArtikelMock.mockResolvedValue(null);

    const response = await PUT(
      requestPut(JSON.stringify({ judul: "J", isi: "I" })),
      context("99"),
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/artikel/:id", () => {
  it("mengembalikan 401 bila belum login", async () => {
    ambilSesiRequestMock.mockResolvedValue(null);

    const response = await DELETE(requestDelete(), context("1"));

    expect(response.status).toBe(401);
    expect(hapusArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 204 bila penghapusan sukses", async () => {
    hapusArtikelMock.mockResolvedValue(true);

    const response = await DELETE(requestDelete(), context("1"));

    expect(response.status).toBe(204);
  });

  it("mengembalikan 404 bila artikel tidak ada", async () => {
    hapusArtikelMock.mockResolvedValue(false);

    const response = await DELETE(requestDelete(), context("99"));

    expect(response.status).toBe(404);
  });

  it("mengembalikan 400 untuk id tidak valid", async () => {
    const response = await DELETE(requestDelete(), context("abc"));

    expect(response.status).toBe(400);
    expect(hapusArtikelMock).not.toHaveBeenCalled();
  });
});
