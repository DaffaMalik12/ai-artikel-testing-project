import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ARTIKEL_API_URL,
  ApiArtikelError,
  normalisasiArtikel,
  pesanErrorDari,
  tambahArtikel,
} from "./artikel";

const HEADER_JSON = { "Content-Type": "application/json" };

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubFetchGagal(error: unknown) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockRejectedValue(error);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tambahArtikel", () => {
  it("mengirim POST /api/artikel dengan body { judul, isi } lalu memetakan respons 201", async () => {
    const fetchMock = stubFetch(
      new Response(
        JSON.stringify({
          id: 7,
          judul: "Judul",
          isi: "Isi",
          createdAt: "2024-01-15T10:00:00.000Z",
          updatedAt: "2024-01-15T10:00:00.000Z",
        }),
        { status: 201, headers: HEADER_JSON },
      ),
    );

    const hasil = await tambahArtikel({ judul: "Judul", isi: "  isi asli\n" });

    // Endpoint relatif: request tidak boleh keluar dari origin aplikasi.
    expect(ARTIKEL_API_URL).toBe("/api/artikel");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel");
    expect(opsi?.method).toBe("POST");
    expect(opsi?.headers).toMatchObject({ "Content-Type": "application/json" });

    // Kunci body harus persis `judul` & `isi` — bentuk yang dibaca route handler.
    const body = JSON.parse(String(opsi?.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["isi", "judul"]);
    expect(body).toEqual({ judul: "Judul", isi: "  isi asli\n" });

    expect(hasil).toEqual({
      id: "7",
      judul: "Judul",
      isi: "Isi",
      createdAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-15T10:00:00.000Z",
    });
  });

  it("menganggap sukses tanpa body sebagai berhasil dibuat", async () => {
    stubFetch(new Response(null, { status: 201 }));

    await expect(tambahArtikel({ judul: "Judul", isi: "Isi" })).resolves.toBeNull();
  });

  it("meneruskan pesan validasi 400 dari route handler beserta statusnya", async () => {
    stubFetch(
      new Response(JSON.stringify({ message: "Judul artikel maksimal 200 karakter." }), {
        status: 400,
        headers: HEADER_JSON,
      }),
    );

    const error = await tambahArtikel({ judul: "Judul", isi: "Isi" }).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).message).toBe("Judul artikel maksimal 200 karakter.");
    expect((error as ApiArtikelError).status).toBe(400);
  });

  it("memakai pesan umum bila body error bukan JSON", async () => {
    stubFetch(new Response("<html>500</html>", { status: 500 }));

    const error = await tambahArtikel({ judul: "Judul", isi: "Isi" }).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).status).toBe(500);
    expect((error as ApiArtikelError).message).toMatch(/kesalahan pada server/i);
  });

  it("melempar pesan koneksi bila fetch gagal total", async () => {
    stubFetchGagal(new TypeError("Failed to fetch"));

    const error = await tambahArtikel({ judul: "Judul", isi: "Isi" }).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(ApiArtikelError);
    expect((error as ApiArtikelError).message).toMatch(/tidak dapat terhubung/i);
  });
});

describe("normalisasiArtikel", () => {
  it("memetakan respons route handler ke tipe Artikel", () => {
    expect(
      normalisasiArtikel({
        id: 1,
        judul: "J",
        isi: "I",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      }),
    ).toEqual({
      id: "1",
      judul: "J",
      isi: "I",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
    });
  });

  it("mendukung nama field alternatif title/content", () => {
    expect(normalisasiArtikel({ id: "9", title: "T", content: "C" })).toEqual({
      id: "9",
      judul: "T",
      isi: "C",
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  it("membuka pembungkus { artikel: ... }", () => {
    expect(normalisasiArtikel({ artikel: { id: "3", judul: "J", isi: "I" } })).toEqual({
      id: "3",
      judul: "J",
      isi: "I",
      createdAt: undefined,
      updatedAt: undefined,
    });
  });

  it("mengembalikan null untuk payload tanpa id atau bukan objek", () => {
    expect(normalisasiArtikel({ judul: "J", isi: "I" })).toBeNull();
    expect(normalisasiArtikel(null)).toBeNull();
    expect(normalisasiArtikel("teks")).toBeNull();
  });
});

describe("pesanErrorDari", () => {
  it("memakai pesan error bila ada", () => {
    expect(pesanErrorDari(new Error("Pesan khusus"), "fallback")).toBe("Pesan khusus");
  });

  it("memakai fallback untuk nilai non-error atau pesan kosong", () => {
    expect(pesanErrorDari("bukan error", "fallback")).toBe("fallback");
    expect(pesanErrorDari(new Error("   "), "fallback")).toBe("fallback");
  });
});
