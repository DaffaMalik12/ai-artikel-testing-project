// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  UKURAN_GAMBAR_MAKS_BYTE,
  ValidasiGambarError,
  deteksiMimeGambarDariBytes,
  ekstensiDariMimeGambar,
  validasiBerkasGambar,
} from "./validasi-gambar";

const BYTES_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const BYTES_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const BYTES_WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("deteksiMimeGambarDariBytes", () => {
  it("mendeteksi JPEG, PNG, dan WEBP dari magic bytes", () => {
    expect(deteksiMimeGambarDariBytes(BYTES_JPEG)).toBe("image/jpeg");
    expect(deteksiMimeGambarDariBytes(BYTES_PNG)).toBe("image/png");
    expect(deteksiMimeGambarDariBytes(BYTES_WEBP)).toBe("image/webp");
  });

  it("mengembalikan null untuk data lain", () => {
    expect(deteksiMimeGambarDariBytes(new TextEncoder().encode("hai"))).toBeNull();
    expect(deteksiMimeGambarDariBytes(new Uint8Array(0))).toBeNull();
  });
});

describe("ekstensiDariMimeGambar", () => {
  it("memetakan MIME ke ekstensi", () => {
    expect(ekstensiDariMimeGambar("image/jpeg")).toBe(".jpg");
    expect(ekstensiDariMimeGambar("image/png")).toBe(".png");
    expect(ekstensiDariMimeGambar("image/webp")).toBe(".webp");
  });
});

describe("validasiBerkasGambar", () => {
  it("menerima gambar yang valid", () => {
    expect(validasiBerkasGambar(BYTES_PNG, "image/png")).toEqual({
      mime: "image/png",
      ekstensi: ".png",
    });
  });

  it("menolak file kosong", () => {
    expect(() => validasiBerkasGambar(new Uint8Array(0), "image/png")).toThrow(
      ValidasiGambarError,
    );
  });

  it("menolak file lebih dari 2 MB", () => {
    const besar = new Uint8Array(UKURAN_GAMBAR_MAKS_BYTE + 1);
    besar.set(BYTES_JPEG, 0);

    expect(() => validasiBerkasGambar(besar, "image/jpeg")).toThrow(
      ValidasiGambarError,
    );
  });

  it("menolak MIME di luar whitelist", () => {
    expect(() => validasiBerkasGambar(BYTES_PNG, "image/gif")).toThrow(
      ValidasiGambarError,
    );
  });

  it("menolak isi yang tidak cocok dengan magic bytes meski MIME diklaim gambar", () => {
    const teks = new TextEncoder().encode("bukan gambar");

    expect(() => validasiBerkasGambar(teks, "image/jpeg")).toThrow(
      ValidasiGambarError,
    );
  });
});
