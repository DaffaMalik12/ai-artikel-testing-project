import { describe, expect, it } from "vitest";

import {
  ISI_MAKS_KARAKTER,
  JUDUL_MAKS_KARAKTER,
  adaErrorValidasi,
  siapkanPayload,
  validasiArtikel,
} from "./artikel-validasi";

describe("validasiArtikel", () => {
  it("menerima judul dan isi yang valid", () => {
    const error = validasiArtikel("Judul Artikel", "Isi artikel yang cukup panjang.");

    expect(error).toEqual({});
    expect(adaErrorValidasi(error)).toBe(false);
  });

  it("menolak judul atau isi yang kosong", () => {
    const error = validasiArtikel("", "");

    expect(error.judul).toMatch(/wajib diisi/i);
    expect(error.isi).toMatch(/wajib diisi/i);
    expect(adaErrorValidasi(error)).toBe(true);
  });

  it("menolak judul atau isi yang hanya berisi spasi dan newline", () => {
    const error = validasiArtikel("   ", "  \n\t  ");

    expect(error.judul).toMatch(/wajib diisi/i);
    expect(error.isi).toMatch(/wajib diisi/i);
  });

  it("menerima panjang tepat pada batas maksimum", () => {
    const error = validasiArtikel(
      "J".repeat(JUDUL_MAKS_KARAKTER),
      "I".repeat(ISI_MAKS_KARAKTER),
    );

    expect(error).toEqual({});
  });

  it("menolak panjang satu karakter melebihi batas", () => {
    const error = validasiArtikel(
      "J".repeat(JUDUL_MAKS_KARAKTER + 1),
      "I".repeat(ISI_MAKS_KARAKTER + 1),
    );

    expect(error.judul).toBe(`Judul artikel maksimal ${JUDUL_MAKS_KARAKTER} karakter.`);
    expect(error.isi).toBe(`Isi artikel maksimal ${ISI_MAKS_KARAKTER} karakter.`);
  });
});

describe("siapkanPayload", () => {
  it("memangkas spasi pada judul", () => {
    expect(siapkanPayload("  Judul Artikel  ", "Isi").judul).toBe("Judul Artikel");
  });

  it("mempertahankan isi artikel apa adanya", () => {
    const isi = "  baris pertama\n\n  baris kedua  \n";

    expect(siapkanPayload("Judul", isi).isi).toBe(isi);
  });

  it("hanya mengirim kunci `judul` dan `isi` sesuai kontrak POST /api/artikel", () => {
    expect(Object.keys(siapkanPayload("Judul", "Isi")).sort()).toEqual(["isi", "judul"]);
  });
});
