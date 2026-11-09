import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artikel: {
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  ValidasiArtikelError,
  ambilArtikelById,
  hapusArtikel,
  perbaruiArtikel,
} from "./artikel-service";

const findUniqueMock = vi.mocked(prisma.artikel.findUnique);
const updateMock = vi.mocked(prisma.artikel.update);
const deleteManyMock = vi.mocked(prisma.artikel.deleteMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ambilArtikelById", () => {
  it("mengembalikan artikel bila ditemukan", async () => {
    findUniqueMock.mockResolvedValue({ id: 1, judul: "J", isi: "I", createdAt: new Date() });

    await expect(ambilArtikelById(1)).resolves.toMatchObject({ id: 1 });
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("mengembalikan null bila tidak ditemukan", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(ambilArtikelById(99)).resolves.toBeNull();
  });
});

describe("perbaruiArtikel", () => {
  it("memvalidasi payload sebelum menyentuh database", async () => {
    await expect(perbaruiArtikel(1, {})).rejects.toThrow(ValidasiArtikelError);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("melakukan update langsung tanpa findUnique pendahuluan (bebas race)", async () => {
    updateMock.mockResolvedValue({ id: 1, judul: "Baru", isi: "I", createdAt: new Date() });

    await perbaruiArtikel(1, { judul: "Baru", isi: "I" });

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { judul: "Baru", isi: "I" },
    });
  });

  it("mengembalikan null bila Prisma melempar P2025 (artikel sudah tidak ada)", async () => {
    updateMock.mockRejectedValue({ code: "P2025" });

    await expect(perbaruiArtikel(99, { judul: "J", isi: "I" })).resolves.toBeNull();
  });

  it("meneruskan error Prisma lain tanpa diubah", async () => {
    updateMock.mockRejectedValue(new Error("DB down"));

    await expect(perbaruiArtikel(1, { judul: "J", isi: "I" })).rejects.toThrow(
      "DB down",
    );
  });
});

describe("hapusArtikel", () => {
  it("mengembalikan true bila ada baris terhapus", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(hapusArtikel(1)).resolves.toBe(true);
  });

  it("mengembalikan false bila tidak ada baris terhapus", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(hapusArtikel(99)).resolves.toBe(false);
  });
});
