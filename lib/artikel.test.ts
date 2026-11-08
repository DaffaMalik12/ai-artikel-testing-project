import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiArtikelError,
  formatTanggal,
  getApiBaseUrl,
  getArtikelById,
  getDaftarArtikel,
  normalisasiArtikel,
  parseBaseUrl,
} from "./artikel";

function stubFetch(status: number, body: string) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockImplementation(
    async () =>
      new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("normalisasiArtikel", () => {
  it("mengembalikan artikel lengkap saat payload valid", () => {
    expect(
      normalisasiArtikel({
        id: 1,
        judul: "Judul Artikel",
        isi: "Isi artikel",
        createdAt: "2024-01-15T10:00:00.000Z",
      }),
    ).toEqual({
      id: "1",
      judul: "Judul Artikel",
      isi: "Isi artikel",
      createdAt: "2024-01-15T10:00:00.000Z",
    });
  });

  it("mendukung nama field alternatif", () => {
    expect(
      normalisasiArtikel({ id: "9", title: "T", content: "C" }),
    ).toEqual({ id: "9", judul: "T", isi: "C", createdAt: "" });
  });

  it("menolak payload kosong atau tanpa field wajib", () => {
    expect(normalisasiArtikel({})).toBeNull();
    expect(normalisasiArtikel({ id: "1", judul: "Judul" })).toBeNull();
    expect(normalisasiArtikel({ id: "1", isi: "Isi" })).toBeNull();
    expect(normalisasiArtikel({ id: "1", judul: "  ", isi: "Isi" })).toBeNull();
  });

  it("menolak nilai yang bukan objek", () => {
    expect(normalisasiArtikel(null)).toBeNull();
    expect(normalisasiArtikel("teks")).toBeNull();
    expect(normalisasiArtikel([{ id: "1" }])).toBeNull();
  });
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

  it("mendukung fallback kustom", () => {
    expect(formatTanggal("", "-")).toBe("-");
  });
});

describe("parseBaseUrl", () => {
  it("menerima origin http/https tanpa path", () => {
    expect(parseBaseUrl("https://api.example.com")?.origin).toBe(
      "https://api.example.com",
    );
    expect(parseBaseUrl("http://localhost:3000")?.origin).toBe(
      "http://localhost:3000",
    );
  });

  it("mengembalikan null untuk nilai kosong", () => {
    expect(parseBaseUrl("")).toBeNull();
    expect(parseBaseUrl("   ")).toBeNull();
    expect(parseBaseUrl(undefined)).toBeNull();
  });

  it("menolak URL tanpa host", () => {
    expect(() => parseBaseUrl("https://")).toThrow(ApiArtikelError);
    expect(() => parseBaseUrl("bukan-url")).toThrow(ApiArtikelError);
  });

  it("menolak query string dan fragment", () => {
    expect(() => parseBaseUrl("https://api.example.com?x=1")).toThrow(
      ApiArtikelError,
    );
    expect(() => parseBaseUrl("https://api.example.com#bagian")).toThrow(
      ApiArtikelError,
    );
  });

  it("menolak kredensial di dalam URL", () => {
    expect(() => parseBaseUrl("https://user:rahasia@api.example.com")).toThrow(
      ApiArtikelError,
    );
  });

  it("menolak protokol selain http/https", () => {
    expect(() => parseBaseUrl("ftp://api.example.com")).toThrow(
      ApiArtikelError,
    );
  });

  it("menolak base URL dengan path", () => {
    expect(() => parseBaseUrl("https://api.example.com/v1")).toThrow(
      ApiArtikelError,
    );
  });
});

describe("getApiBaseUrl", () => {
  it("memakai fallback pengembangan saat env kosong", () => {
    vi.stubEnv("API_BASE_URL", "");
    expect(getApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("menolak konfigurasi kosong pada produksi", () => {
    vi.stubEnv("API_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getApiBaseUrl()).toThrow(ApiArtikelError);
  });

  it("mengembalikan origin dari API_BASE_URL", () => {
    vi.stubEnv("API_BASE_URL", "https://api.example.com/");
    expect(getApiBaseUrl()).toBe("https://api.example.com");
  });

  it("menolak host privat pada produksi", () => {
    vi.stubEnv("API_BASE_URL", "http://192.168.1.10:8080");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getApiBaseUrl()).toThrow(ApiArtikelError);
  });

  it("mengizinkan host privat yang ada di allowlist", () => {
    vi.stubEnv("API_BASE_URL", "http://192.168.1.10:8080");
    vi.stubEnv("API_BASE_URL_ALLOWLIST", "192.168.1.10");
    vi.stubEnv("NODE_ENV", "production");
    expect(getApiBaseUrl()).toBe("http://192.168.1.10:8080");
  });

  it("menolak host di luar allowlist", () => {
    vi.stubEnv("API_BASE_URL", "https://api.example.com");
    vi.stubEnv("API_BASE_URL_ALLOWLIST", "lain.example.com");
    expect(() => getApiBaseUrl()).toThrow(ApiArtikelError);
  });
});

describe("getArtikelById", () => {
  beforeEach(() => {
    vi.stubEnv("API_BASE_URL", "https://api.example.com");
  });

  it("memakai base URL dari env dan memanggil endpoint detail", async () => {
    const fetchMock = stubFetch(
      200,
      JSON.stringify({
        id: 42,
        judul: "Judul",
        isi: "Isi",
        createdAt: "2024-01-15T10:00:00.000Z",
      }),
    );

    await expect(getArtikelById("42")).resolves.toEqual({
      id: "42",
      judul: "Judul",
      isi: "Isi",
      createdAt: "2024-01-15T10:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/api/artikel/42",
    );
  });

  it("mendukung payload bersarang { data: {...} }", async () => {
    stubFetch(200, JSON.stringify({ data: { id: "7", judul: "J", isi: "I" } }));

    await expect(getArtikelById("7")).resolves.toMatchObject({
      id: "7",
      judul: "J",
      isi: "I",
    });
  });

  it("mengembalikan null saat API merespons 404", async () => {
    stubFetch(404, JSON.stringify({ message: "tidak ada" }));
    await expect(getArtikelById("42")).resolves.toBeNull();
  });

  it("mengembalikan null saat payload tidak memuat field wajib", async () => {
    stubFetch(200, JSON.stringify({}));
    await expect(getArtikelById("42")).resolves.toBeNull();
  });

  it("melempar error saat API merespons 5xx", async () => {
    stubFetch(500, JSON.stringify({ error: "boom" }));
    await expect(getArtikelById("42")).rejects.toBeInstanceOf(ApiArtikelError);
  });

  it("melempar error saat respons bukan JSON", async () => {
    stubFetch(200, "<html>error</html>");
    await expect(getArtikelById("42")).rejects.toBeInstanceOf(ApiArtikelError);
  });

  it("melempar error saat koneksi gagal", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getArtikelById("42")).rejects.toBeInstanceOf(ApiArtikelError);
  });

  it("mengembalikan null untuk id kosong tanpa memanggil API", async () => {
    const fetchMock = stubFetch(200, "{}");
    await expect(getArtikelById("   ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getDaftarArtikel", () => {
  beforeEach(() => {
    vi.stubEnv("API_BASE_URL", "https://api.example.com");
  });

  it("menyaring item yang tidak valid", async () => {
    stubFetch(
      200,
      JSON.stringify([
        { id: 1, judul: "A", isi: "Isi A" },
        { id: 2, judul: "B" },
        {},
      ]),
    );

    await expect(getDaftarArtikel()).resolves.toEqual([
      { id: "1", judul: "A", isi: "Isi A", createdAt: "" },
    ]);
  });

  it("mendukung payload { data: [...] }", async () => {
    stubFetch(200, JSON.stringify({ data: [{ id: "3", judul: "C", isi: "I" }] }));

    await expect(getDaftarArtikel()).resolves.toEqual([
      { id: "3", judul: "C", isi: "I", createdAt: "" },
    ]);
  });

  it("mengembalikan array kosong saat respons 204", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDaftarArtikel()).resolves.toEqual([]);
  });
});
