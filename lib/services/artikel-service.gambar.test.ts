// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artikel: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

import { mkdir, unlink, writeFile } from "node:fs/promises";

import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";
import { prisma } from "@/lib/prisma";
import {
  ValidasiArtikelError,
  buatArtikel,
  hapusGambarArtikel,
  perbaruiArtikel,
  simpanGambarArtikel,
} from "./artikel-service";

const createMock = vi.mocked(prisma.artikel.create);
const findUniqueMock = vi.mocked(prisma.artikel.findUnique);
const updateMock = vi.mocked(prisma.artikel.update);
const mkdirMock = vi.mocked(mkdir);
const writeFileMock = vi.mocked(writeFile);
const unlinkMock = vi.mocked(unlink);

const POLA_URL = /^\/uploads\/artikel\/[0-9a-f-]{36}\.jpg$/;
const POLA_JALUR = /public[\\/]uploads[\\/]artikel[\\/][0-9a-f-]{36}\.jpg$/;

beforeEach(() => {
  vi.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
  unlinkMock.mockResolvedValue(undefined);
});

describe("simpanGambarArtikel", () => {
  it("mengembalikan null bila artikel tidak ditemukan", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      simpanGambarArtikel(99, { buffer: new Uint8Array([0xff]), ekstensi: ".jpg" }),
    ).resolves.toBeNull();

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("menyimpan file dengan nama UUID dan memperbarui gambarUrl", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: null,
      createdAt: new Date(),
    } as never);
    updateMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "x",
      createdAt: new Date(),
    } as never);

    const hasil = await simpanGambarArtikel(1, {
      buffer: new Uint8Array([0xff, 0xd8, 0xff]),
      ekstensi: ".jpg",
    });

    expect(hasil?.gambarUrl).toMatch(POLA_URL);
    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(String(writeFileMock.mock.calls[0][0])).toMatch(POLA_JALUR);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { gambarUrl: hasil?.gambarUrl },
    });
  });

  it("tidak memakai nama asli user (nama file selalu UUID)", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: null,
      createdAt: new Date(),
    } as never);
    updateMock.mockResolvedValue({} as never);

    const hasil = await simpanGambarArtikel(1, {
      buffer: new Uint8Array([0xff, 0xd8, 0xff]),
      ekstensi: ".jpg",
    });

    expect(hasil?.gambarUrl).toMatch(POLA_URL);
    expect(hasil?.gambarUrl ?? "").not.toContain("..");
    expect(hasil?.gambarUrl ?? "").not.toContain("/");
  });

  it("menghapus file lama setelah update DB sukses", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "/uploads/artikel/lama.png",
      createdAt: new Date(),
    } as never);
    updateMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "x",
      createdAt: new Date(),
    } as never);

    await simpanGambarArtikel(1, {
      buffer: new Uint8Array([0xff, 0xd8, 0xff]),
      ekstensi: ".jpg",
    });

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(String(unlinkMock.mock.calls[0][0])).toMatch(/lama\.png$/);
  });

  it("tidak menghapus file bila gambarUrl polos (bukan URL upload)", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "https://contoh.com/gambar.jpg",
      createdAt: new Date(),
    } as never);
    updateMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "x",
      createdAt: new Date(),
    } as never);

    await simpanGambarArtikel(1, {
      buffer: new Uint8Array([0xff, 0xd8, 0xff]),
      ekstensi: ".jpg",
    });

    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it("rollback file baru dan mengembalikan null bila update DB melempar P2025", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: null,
      createdAt: new Date(),
    } as never);
    updateMock.mockRejectedValue({ code: "P2025" });

    await expect(
      simpanGambarArtikel(1, {
        buffer: new Uint8Array([0xff, 0xd8, 0xff]),
        ekstensi: ".jpg",
      }),
    ).resolves.toBeNull();

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(String(unlinkMock.mock.calls[0][0])).toMatch(POLA_JALUR);
  });
});

describe("hapusGambarArtikel", () => {
  it("mengembalikan null bila artikel tidak ditemukan", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(hapusGambarArtikel(99)).resolves.toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("menghapus file dan mengosongkan gambarUrl", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: "/uploads/artikel/a.webp",
      createdAt: new Date(),
    } as never);
    updateMock.mockResolvedValue({
      id: 1,
      judul: "J",
      isi: "I",
      gambarUrl: null,
      createdAt: new Date(),
    } as never);

    const hasil = await hapusGambarArtikel(1);

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(String(unlinkMock.mock.calls[0][0])).toMatch(/a\.webp$/);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { gambarUrl: null },
    });
    expect(hasil).toEqual({ gambarUrl: null });
  });
});

describe("gambarUrl pada payload artikel (POST & PUT)", () => {
  it("buatArtikel meneruskan gambarUrl bila dikirim", async () => {
    createMock.mockResolvedValue({} as never);

    await buatArtikel({
      judul: "J",
      isi: "I",
      gambarUrl: "/uploads/artikel/a.png",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        judul: "J",
        isi: "I",
        gambarUrl: "/uploads/artikel/a.png",
      },
    });
  });

  it("buatArtikel tidak mengirim key gambarUrl bila tidak ada", async () => {
    createMock.mockResolvedValue({} as never);

    await buatArtikel({ judul: "J", isi: "I" });

    const arg = createMock.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).not.toHaveProperty("gambarUrl");
  });

  it("perbaruiArtikel tidak menimpa gambar lama bila gambarUrl tidak dikirim", async () => {
    updateMock.mockResolvedValue({} as never);

    await perbaruiArtikel(1, { judul: "J", isi: "I" });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { judul: "J", isi: "I" },
    });
  });

  it("perbaruiArtikel menyimpan gambarUrl null bila dikirim eksplisit", async () => {
    updateMock.mockResolvedValue({} as never);

    await perbaruiArtikel(1, { judul: "J", isi: "I", gambarUrl: null });

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { judul: "J", isi: "I", gambarUrl: null },
    });
  });

  it("menolak gambarUrl yang bukan teks", async () => {
    await expect(
      perbaruiArtikel(1, { judul: "J", isi: "I", gambarUrl: 123 }),
    ).rejects.toBeInstanceOf(ValidasiArtikelError);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("batas validasi payload artikel (konstanta dari artikel-validasi.ts)", () => {
  it("menerima judul tepat pada batas maksimum", async () => {
    updateMock.mockResolvedValue({} as never);

    await expect(
      perbaruiArtikel(1, { judul: "a".repeat(JUDUL_MAKS_KARAKTER), isi: "I" }),
    ).resolves.toBeDefined();
  });

  it("menolak judul melebihi batas maksimum", async () => {
    await expect(
      perbaruiArtikel(1, {
        judul: "a".repeat(JUDUL_MAKS_KARAKTER + 1),
        isi: "I",
      }),
    ).rejects.toBeInstanceOf(ValidasiArtikelError);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("menolak isi melebihi batas maksimum", async () => {
    await expect(
      perbaruiArtikel(1, {
        judul: "J",
        isi: "a".repeat(ISI_MAKS_KARAKTER + 1),
      }),
    ).rejects.toBeInstanceOf(ValidasiArtikelError);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
