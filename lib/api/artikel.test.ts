import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiArtikelError,
  ambilArtikelById,
  ambilDaftarArtikel,
  hapusArtikel,
  hapusGambarArtikel,
  normalisasiDaftarArtikelRingkas,
  perbaruiArtikel,
  tambahArtikel,
  unggahGambarArtikel,
} from "./artikel";

/**
 * Status yang secara spec tidak boleh punya body. `new Response("", { status })`
 * akan melempar TypeError untuk status ini, jadi body harus `null`.
 */
const STATUS_TANPA_BODY = new Set([101, 204, 205, 304]);

function stubFetch(status: number, body: string) {
  const fetchMock = vi.fn<typeof fetch>();
  const isiBody: string | null = STATUS_TANPA_BODY.has(status) ? null : body;

  fetchMock.mockImplementation(
    async () =>
      new Response(isiBody, {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function buatBerkas(nama = "a.png", tipe = "image/png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], nama, {
    type: tipe,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tambahArtikel", () => {
  it("mengirim POST JSON dan memetakan respons ke Artikel", async () => {
    const fetchMock = stubFetch(
      201,
      JSON.stringify({
        id: 1,
        judul: "Judul",
        isi: "Isi",
        createdAt: "2024-01-15T10:00:00.000Z",
        gambarUrl: null,
      }),
    );

    await expect(tambahArtikel({ judul: "Judul", isi: "Isi" })).resolves.toEqual(
      {
        id: "1",
        judul: "Judul",
        isi: "Isi",
        createdAt: "2024-01-15T10:00:00.000Z",
        gambarUrl: null,
      },
    );

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel");
    expect(opsi?.method).toBe("POST");
    expect(opsi?.credentials).toBe("same-origin");
    expect(JSON.parse(String(opsi?.body))).toEqual({
      judul: "Judul",
      isi: "Isi",
    });
  });

  it("memetakan pesan validasi 400 ke field judul", async () => {
    stubFetch(400, JSON.stringify({ message: "Judul artikel wajib diisi." }));

    await expect(tambahArtikel({ judul: "", isi: "Isi" })).rejects.toMatchObject({
      message: "Judul artikel wajib diisi.",
      field: "judul",
      status: 400,
    });
  });

  it("memakai pesan cadangan saat body error bukan JSON", async () => {
    stubFetch(500, "<html>boom</html>");

    await expect(
      tambahArtikel({ judul: "J", isi: "I" }),
    ).rejects.toMatchObject({ message: "Gagal menyimpan artikel." });
  });

  it("melempar pesan koneksi saat fetch gagal", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(tambahArtikel({ judul: "J", isi: "I" })).rejects.toBeInstanceOf(
      ApiArtikelError,
    );
  });
});

describe("perbaruiArtikel", () => {
  it("mengirim PUT ke endpoint detail", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify({ id: 2, judul: "J2", isi: "I2" }),
    );

    await perbaruiArtikel("2", { judul: "J2", isi: "I2" });

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel/2");
    expect(opsi?.method).toBe("PUT");
  });

  it("menolak id kosong tanpa memanggil API", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      perbaruiArtikel("   ", { judul: "J", isi: "I" }),
    ).rejects.toBeInstanceOf(ApiArtikelError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("unggahGambarArtikel", () => {
  it("mengirim multipart tanpa Content-Type manual", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify({ gambarUrl: "/uploads/artikel/a.png" }),
    );

    await expect(unggahGambarArtikel("1", buatBerkas())).resolves.toBe(
      "/uploads/artikel/a.png",
    );

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel/1/gambar");
    expect(opsi?.method).toBe("POST");
    expect(opsi?.credentials).toBe("same-origin");
    expect(new Headers(opsi?.headers).has("Content-Type")).toBe(false);
    expect(opsi?.body).toBeInstanceOf(FormData);
    expect((opsi?.body as FormData).get("gambar")).toBeInstanceOf(File);
  });

  it("mendukung payload bersarang { data: { gambarUrl } }", async () => {
    stubFetch(200, JSON.stringify({ data: { gambarUrl: "/uploads/x.webp" } }));

    await expect(unggahGambarArtikel("3", buatBerkas())).resolves.toBe(
      "/uploads/x.webp",
    );
  });

  it("memetakan 401 ke pesan login", async () => {
    stubFetch(401, JSON.stringify({ message: "Silakan login." }));

    await expect(unggahGambarArtikel("1", buatBerkas())).rejects.toMatchObject({
      status: 401,
      message: "Silakan login.",
    });
  });

  it("memakai pesan bawaan untuk 400 tanpa body JSON", async () => {
    stubFetch(400, "");

    await expect(unggahGambarArtikel("1", buatBerkas())).rejects.toMatchObject({
      status: 400,
      message:
        "Gambar tidak valid. Gunakan berkas JPEG, PNG, atau WebP maksimal 2 MB.",
    });
  });

  it("memakai pesan bawaan untuk 404", async () => {
    stubFetch(404, "");

    await expect(unggahGambarArtikel("1", buatBerkas())).rejects.toMatchObject({
      status: 404,
      message: "Artikel tidak ditemukan.",
    });
  });

  it("memakai pesan bawaan untuk 500", async () => {
    stubFetch(500, "");

    await expect(unggahGambarArtikel("1", buatBerkas())).rejects.toMatchObject({
      status: 500,
    });
  });

  it("melempar error bila server tidak mengembalikan gambarUrl", async () => {
    stubFetch(200, JSON.stringify({}));

    await expect(unggahGambarArtikel("1", buatBerkas())).rejects.toBeInstanceOf(
      ApiArtikelError,
    );
  });

  it("menolak id kosong tanpa memanggil API", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(unggahGambarArtikel("  ", buatBerkas())).rejects.toBeInstanceOf(
      ApiArtikelError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("hapusGambarArtikel", () => {
  it("mengirim DELETE ke endpoint gambar", async () => {
    const fetchMock = stubFetch(204, "");

    await expect(hapusGambarArtikel("5")).resolves.toBeUndefined();

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel/5/gambar");
    expect(opsi?.method).toBe("DELETE");
    expect(opsi?.credentials).toBe("same-origin");
  });

  it("melempar error saat server menolak", async () => {
    stubFetch(401, JSON.stringify({ message: "Anda harus login." }));

    await expect(hapusGambarArtikel("5")).rejects.toMatchObject({
      status: 401,
      message: "Anda harus login.",
    });
  });
});

describe("normalisasiDaftarArtikelRingkas", () => {
  it("menyaring item tidak valid dan selalu menyertakan gambarUrl", () => {
    expect(
      normalisasiDaftarArtikelRingkas([
        { id: 1, judul: "A", gambarUrl: "/uploads/a.png" },
        { id: 2, judul: "B" },
        {},
        null,
      ]),
    ).toEqual([
      { id: "1", judul: "A", createdAt: "", gambarUrl: "/uploads/a.png" },
      { id: "2", judul: "B", createdAt: "", gambarUrl: null },
    ]);
  });

  it("memperlakukan gambarUrl kosong sebagai null", () => {
    expect(
      normalisasiDaftarArtikelRingkas([{ id: 1, judul: "A", gambarUrl: "   " }]),
    ).toEqual([{ id: "1", judul: "A", createdAt: "", gambarUrl: null }]);
  });

  it("melempar error untuk format yang tidak dikenali", () => {
    expect(() => normalisasiDaftarArtikelRingkas("bukan-array")).toThrow(
      ApiArtikelError,
    );
  });
});

describe("ambilDaftarArtikel", () => {
  it("memanggil endpoint daftar dan memetakan hasil", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify([{ id: 1, judul: "A", gambarUrl: null }]),
    );

    await expect(ambilDaftarArtikel()).resolves.toEqual([
      { id: "1", judul: "A", createdAt: "", gambarUrl: null },
    ]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/artikel");
  });

  it("mengembalikan array kosong pada respons 204", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(ambilDaftarArtikel()).resolves.toEqual([]);
  });

  it("melempar ApiArtikelError saat respons gagal", async () => {
    stubFetch(500, JSON.stringify({ message: "Server error." }));

    await expect(ambilDaftarArtikel()).rejects.toMatchObject({
      message: "Server error.",
      status: 500,
    });
  });
});

describe("ambilArtikelById", () => {
  it("mengembalikan null untuk id kosong", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(ambilArtikelById("  ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mengembalikan null saat 404", async () => {
    stubFetch(404, JSON.stringify({ message: "tidak ada" }));

    await expect(ambilArtikelById("9")).resolves.toBeNull();
  });

  it("mendukung payload bersarang { data: {...} }", async () => {
    stubFetch(
      200,
      JSON.stringify({ data: { id: "7", judul: "J", gambarUrl: "/g.png" } }),
    );

    await expect(ambilArtikelById("7")).resolves.toEqual({
      id: "7",
      judul: "J",
      createdAt: "",
      gambarUrl: "/g.png",
    });
  });

  it("meng-encode id pada URL", async () => {
    const fetchMock = stubFetch(200, JSON.stringify({ id: "a/b", judul: "J" }));

    await ambilArtikelById("a/b");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/artikel/a%2Fb");
  });
});

describe("hapusArtikel", () => {
  it("mengirim DELETE ke endpoint artikel", async () => {
    const fetchMock = stubFetch(204, "");

    await expect(hapusArtikel("3")).resolves.toBeUndefined();

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel/3");
    expect(opsi?.method).toBe("DELETE");
  });

  it("menolak id kosong tanpa memanggil API", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(hapusArtikel("  ")).rejects.toBeInstanceOf(ApiArtikelError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("melempar error saat server menolak", async () => {
    stubFetch(401, JSON.stringify({ message: "Anda harus login." }));

    await expect(hapusArtikel("3")).rejects.toMatchObject({
      status: 401,
      message: "Anda harus login.",
    });
  });
});
