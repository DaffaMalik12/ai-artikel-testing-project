import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    artikel: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";
import {
  ValidasiArtikelError,
  ambilSemuaArtikel,
  buatArtikel,
  validasiInputArtikel,
} from "./artikel-service";

describe("validasiInputArtikel", () => {
  it("menerima input valid dan memangkas spasi di awal/akhir", () => {
    expect(validasiInputArtikel({ judul: "  Judul  ", isi: " Isi " })).toEqual({
      judul: "Judul",
      isi: "Isi",
    });
  });

  it("menolak payload null, array, atau bukan objek", () => {
    for (const payload of [null, [], "teks", 42]) {
      expect(() => validasiInputArtikel(payload)).toThrow(ValidasiArtikelError);
    }
  });

  it("menolak payload objek kosong", () => {
    expect(() => validasiInputArtikel({})).toThrow(ValidasiArtikelError);
  });

  it("menolak judul yang bukan string", () => {
    expect(() =>
      validasiInputArtikel({ judul: 123, isi: "Isi" }),
    ).toThrow(ValidasiArtikelError);
  });

  it("menolak judul kosong atau hanya spasi", () => {
    for (const judul of ["", "   ", "\n\t"]) {
      expect(() => validasiInputArtikel({ judul, isi: "Isi" })).toThrow(
        /judul artikel wajib diisi/i,
      );
    }
  });

  it("menolak judul melebihi batas maksimum", () => {
    expect(() =>
      validasiInputArtikel({
        judul: "J".repeat(JUDUL_MAKS_KARAKTER + 1),
        isi: "Isi",
      }),
    ).toThrow(/judul artikel maksimal/i);
  });

  it("menolak isi yang bukan string, kosong, atau melebihi batas", () => {
    expect(() =>
      validasiInputArtikel({ judul: "Judul", isi: null }),
    ).toThrow(/isi artikel wajib diisi/i);
    expect(() => validasiInputArtikel({ judul: "Judul", isi: "  " })).toThrow(
      /isi artikel wajib diisi/i,
    );
    expect(() =>
      validasiInputArtikel({
        judul: "Judul",
        isi: "I".repeat(ISI_MAKS_KARAKTER + 1),
      }),
    ).toThrow(/isi artikel maksimal/i);
  });

  it("menerima panjang tepat pada batas maksimum", () => {
    expect(
      validasiInputArtikel({
        judul: "J".repeat(JUDUL_MAKS_KARAKTER),
        isi: "I".repeat(ISI_MAKS_KARAKTER),
      }),
    ).toEqual({
      judul: "J".repeat(JUDUL_MAKS_KARAKTER),
      isi: "I".repeat(ISI_MAKS_KARAKTER),
    });
  });
});

describe("ambilSemuaArtikel", () => {
  it("meneruskan take dan skip ke prisma", async () => {
    vi.mocked(prisma.artikel.findMany).mockResolvedValue([]);

    await ambilSemuaArtikel({ take: 10, skip: 5 });

    expect(prisma.artikel.findMany).toHaveBeenCalledWith({
      orderBy: { id: "desc" },
      take: 10,
      skip: 5,
    });
  });

  it("tanpa opsi, mengambil seluruh artikel", async () => {
    vi.mocked(prisma.artikel.findMany).mockResolvedValue([]);

    await ambilSemuaArtikel();

    expect(prisma.artikel.findMany).toHaveBeenCalledWith({
      orderBy: { id: "desc" },
      take: undefined,
      skip: undefined,
    });
  });
});

describe("buatArtikel", () => {
  it("membuat artikel dengan data yang sudah divalidasi", async () => {
    vi.mocked(prisma.artikel.create).mockResolvedValue({
      id: 1,
      judul: "Judul",
      isi: "Isi",
      createdAt: new Date(),
    });

    await buatArtikel({ judul: "  Judul  ", isi: "Isi" });

    expect(prisma.artikel.create).toHaveBeenCalledWith({
      data: { judul: "Judul", isi: "Isi" },
    });
  });

  it("melempar ValidasiArtikelError untuk input tidak valid", async () => {
    await expect(buatArtikel({ judul: "", isi: "Isi" })).rejects.toThrow(
      ValidasiArtikelError,
    );
    expect(prisma.artikel.create).not.toHaveBeenCalled();
  });
});
