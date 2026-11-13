import { describe, expect, it } from "vitest";

import { dapatMenampilkanWaktu, formatTanggal } from "./tanggal";

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

describe("dapatMenampilkanWaktu", () => {
  it("mengembalikan true untuk tanggal valid", () => {
    expect(dapatMenampilkanWaktu("2024-01-15T10:00:00.000Z")).toBe(true);
  });

  it("mengembalikan false untuk nilai kosong/tidak valid", () => {
    expect(dapatMenampilkanWaktu("")).toBe(false);
    expect(dapatMenampilkanWaktu("   ")).toBe(false);
    expect(dapatMenampilkanWaktu(null)).toBe(false);
    expect(dapatMenampilkanWaktu(undefined)).toBe(false);
    expect(dapatMenampilkanWaktu("bukan-tanggal")).toBe(false);
  });
});
