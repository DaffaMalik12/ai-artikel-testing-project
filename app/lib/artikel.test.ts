import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiArtikelError,
  ambilDaftarArtikel,
  dapatMenampilkanWaktu,
  formatTanggal,
  hapusArtikel,
  normalisasiDaftarArtikel,
} from "./artikel";

const HEADER_JSON = { "Content-Type": "application/json" };

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatTanggal", () => {
  it("memformat tanggal ISO yang valid", () => {
    expect(formatTanggal("2024-01-15T10:00:00.000Z")).toMatch(/2024/);
  });

  it("memakai fallback untuk nilai kosong atau tidak valid", () => {
    expect(formatTanggal("")).toBe("Tanggal tidak tersedia");
    expect(formatTanggal(null)).toBe("Tanggal tidak tersedia");
    expect(formatTanggal(undefined)).toBe("Tanggal tidak tersedia");
    expect(formatTanggal("bukan-tanggal")).toBe("Tanggal tidak tersedia");
  });
});

describe("dapatMenampilkanWaktu", () => {
  it("membedakan tanggal valid dari yang tidak valid", () => {
    expect(dapatMenampilkanWaktu("2024-01-15T10:00:00.000Z")).toBe(true);
    expect(dapatMenampilkanWaktu("")).toBe(false);
    expect(dapatMenampilkanWaktu("bukan-tanggal")).toBe(false);
  });
});

describe("normalisasiDaftarArtikel", () => {
  it("memetakan array artikel lengkap", () => {
    expect(
      normalisasiDaftarArtikel([
        { id: 1, judul: "Judul", isi: "Isi", createdAt: "2024-01-15T10:00:00.000Z" },
      ]),
    ).toEqual([{ id: "1", judul: "Judul", createdAt: "2024-01-15T10:00:00.000Z" }]);
  });

  it("mendukung payload terbungkus `data` dan nama field alternatif", () => {
    expect(
      normalisasiDaftarArtikel({ data: [{ id: "9", title: "T", created_at: "2024-01-01" }] }),
    ).toEqual([{ id: "9", judul: "T", createdAt: "2024-01-01" }]);
  });

  it("memakai string kosong bila createdAt tidak dikirim", () => {
    expect(normalisasiDaftarArtikel([{ id: "1", judul: "T" }])).toEqual([
      { id: "1", judul: "T", createdAt: "" },
    ]);
  });

  it("menyaring item tanpa id atau judul", () => {
    expect(
      normalisasiDaftarArtikel([
        { id: "1", judul: "Valid" },
        { id: "", judul: "Tanpa id" },
        { id: "2", judul: "   " },
        null,
        "teks",
      ]),
    ).toEqual([{ id: "1", judul: "Valid", createdAt: "" }]);
  });

  it("melempar error saat format payload tidak dikenali", () => {
    expect(() => normalisasiDaftarArtikel({})).toThrow(ApiArtikelError);
    expect(() => normalisasiDaftarArtikel(null)).toThrow(ApiArtikelError);
  });
});

describe("ambilDaftarArtikel", () => {
  it("mengirim GET ke /api/artikel dan mengembalikan hasil normalisasi", async () => {
    const fetchMock = stubFetch(
      new Response(
        JSON.stringify([
          { id: 1, judul: "Judul", isi: "Isi", createdAt: "2024-01-15T10:00:00.000Z" },
        ]),
        { status: 200, headers: HEADER_JSON },
      ),
    );

    const hasil = await ambilDaftarArtikel();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel");
    expect(opsi?.method).toBe("GET");
    expect(hasil).toEqual([
      { id: "1", judul: "Judul", createdAt: "2024-01-15T10:00:00.000Z" },
    ]);
  });

  it("mengembalikan daftar kosong bila server sukses tanpa body", async () => {
    stubFetch(new Response(null, { status: 204 }));

    await expect(ambilDaftarArtikel()).resolves.toEqual([]);
  });

  it("meneruskan pesan error dari server beserta statusnya", async () => {
    stubFetch(
      new Response(JSON.stringify({ message: "Gagal mengambil daftar artikel." }), {
        status: 500,
        headers: HEADER_JSON,
      }),
    );

    const error = await ambilDaftarArtikel().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).message).toBe("Gagal mengambil daftar artikel.");
    expect((error as ApiArtikelError).status).toBe(500);
  });

  it("memakai pesan umum bila body error bukan JSON", async () => {
    stubFetch(new Response("<html>500</html>", { status: 500 }));

    const error = await ambilDaftarArtikel().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).status).toBe(500);
  });
});

describe("hapusArtikel", () => {
  it("mengirim DELETE ke /api/artikel/:id", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await expect(hapusArtikel("12")).resolves.toBeUndefined();

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel/12");
    expect(opsi?.method).toBe("DELETE");
  });

  it("meng-encode id yang mengandung karakter khusus", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await hapusArtikel("a/b c");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/artikel/a%2Fb%20c");
  });

  it("melempar error dengan status saat penghapusan gagal", async () => {
    stubFetch(
      new Response(JSON.stringify({ message: "Artikel tidak ditemukan." }), {
        status: 404,
        headers: HEADER_JSON,
      }),
    );

    const error = await hapusArtikel("99").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).message).toBe("Artikel tidak ditemukan.");
    expect((error as ApiArtikelError).status).toBe(404);
  });

  it("menolak id kosong tanpa memanggil API", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await expect(hapusArtikel("  ")).rejects.toBeInstanceOf(ApiArtikelError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
