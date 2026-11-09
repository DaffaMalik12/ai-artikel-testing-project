import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pengguna: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    sesi: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { hashKataSandi } from "@/lib/utils/password";
import {
  KredensialLoginError,
  UsernameSudahDigunakanError,
  ValidasiPenggunaError,
  ambilSesi,
  daftarPengguna,
  login,
  logout,
} from "./auth-service";

const findUniqueMock = vi.mocked(prisma.pengguna.findUnique);
const createPenggunaMock = vi.mocked(prisma.pengguna.create);
const createSesiMock = vi.mocked(prisma.sesi.create);
const findUniqueSesiMock = vi.mocked(prisma.sesi.findUnique);
const deleteManySesiMock = vi.mocked(prisma.sesi.deleteMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validasiKredensial (via daftarPengguna)", () => {
  it("menolak input bukan string", async () => {
    await expect(daftarPengguna(123, "password123")).rejects.toThrow(
      ValidasiPenggunaError,
    );
    await expect(daftarPengguna("budi", null)).rejects.toThrow(
      ValidasiPenggunaError,
    );
  });

  it("menolak username terlalu pendek atau terlalu panjang", async () => {
    await expect(daftarPengguna("ab", "password123")).rejects.toThrow(
      /username harus 3 sampai 50/i,
    );
    await expect(daftarPengguna("b".repeat(51), "password123")).rejects.toThrow(
      ValidasiPenggunaError,
    );
  });

  it("menolak password terlalu pendek", async () => {
    await expect(daftarPengguna("budi", "pendek")).rejects.toThrow(
      /password harus 8 sampai 200/i,
    );
  });
});

describe("daftarPengguna", () => {
  it("membuat pengguna dengan password ter-hash", async () => {
    createPenggunaMock.mockResolvedValue({
      id: 1,
      username: "budi",
      passwordHash: "hash",
      createdAt: new Date(),
    });

    const hasil = await daftarPengguna("  budi  ", "password123");

    expect(hasil).toEqual({ id: 1, username: "budi" });
    expect(createPenggunaMock).toHaveBeenCalledWith({
      data: { username: "budi", passwordHash: expect.stringMatching(/^scrypt:/) },
    });
  });

  it("melempar UsernameSudahDigunakanError (409) saat username sudah dipakai (P2002)", async () => {
    createPenggunaMock.mockRejectedValue({ code: "P2002" });

    await expect(daftarPengguna("budi", "password123")).rejects.toThrow(
      UsernameSudahDigunakanError,
    );
    await expect(daftarPengguna("budi", "password123")).rejects.toThrow(
      /username sudah digunakan/i,
    );
  });

  it("meneruskan error lain tanpa diubah", async () => {
    createPenggunaMock.mockRejectedValue(new Error("DB down"));

    await expect(daftarPengguna("budi", "password123")).rejects.toThrow("DB down");
  });
});

describe("login", () => {
  it("mengembalikan token sesi bila kredensial cocok", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      username: "budi",
      passwordHash: await hashKataSandi("password123"),
      createdAt: new Date(),
    });
    createSesiMock.mockResolvedValue({
      tokenHash: "hash",
      kedaluwarsa: new Date(),
      createdAt: new Date(),
      penggunaId: 1,
    });
    deleteManySesiMock.mockResolvedValue({ count: 0 });

    const hasil = await login("budi", "password123");

    expect(hasil.token).toMatch(/^[0-9a-f]{64}$/);
    expect(hasil.pengguna).toEqual({ id: 1, username: "budi" });
    expect(createSesiMock).toHaveBeenCalledTimes(1);
  });

  it("melempar KredensialLoginError saat password salah", async () => {
    findUniqueMock.mockResolvedValue({
      id: 1,
      username: "budi",
      passwordHash: await hashKataSandi("password123"),
      createdAt: new Date(),
    });

    await expect(login("budi", "passwordsalah")).rejects.toThrow(
      KredensialLoginError,
    );
  });

  it("melempar pesan yang sama saat username tidak terdaftar", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(login("anonim", "password123")).rejects.toThrow(
      KredensialLoginError,
    );
    await expect(login("anonim", "password123")).rejects.toThrow(
      /username atau password salah/i,
    );
  });

  it("menolak kredensial dengan format tidak valid", async () => {
    await expect(login("", "password123")).rejects.toThrow(ValidasiPenggunaError);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe("ambilSesi", () => {
  it("mengembalikan sesi aktif beserta username pengguna", async () => {
    findUniqueSesiMock.mockResolvedValue({
      tokenHash: "hash",
      kedaluwarsa: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      penggunaId: 1,
      pengguna: { id: 1, username: "budi", passwordHash: "hash", createdAt: new Date() },
    });

    const hasil = await ambilSesi("token-mentah");

    expect(hasil).toMatchObject({ penggunaId: 1, username: "budi" });
  });

  it("menghapus lalu menolak sesi yang sudah kedaluwarsa", async () => {
    findUniqueSesiMock.mockResolvedValue({
      tokenHash: "hash",
      kedaluwarsa: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      penggunaId: 1,
      pengguna: { id: 1, username: "budi", passwordHash: "hash", createdAt: new Date() },
    });
    deleteManySesiMock.mockResolvedValue({ count: 1 });

    await expect(ambilSesi("token-mentah")).resolves.toBeNull();
    expect(deleteManySesiMock).toHaveBeenCalledWith({
      where: { tokenHash: "hash" },
    });
  });

  it("mengembalikan null untuk token tidak valid", async () => {
    await expect(ambilSesi("")).resolves.toBeNull();
    await expect(ambilSesi(42)).resolves.toBeNull();
    expect(findUniqueSesiMock).not.toHaveBeenCalled();
  });

  it("mengembalikan null bila token tidak dikenal", async () => {
    findUniqueSesiMock.mockResolvedValue(null);

    await expect(ambilSesi("tidak-ada")).resolves.toBeNull();
  });
});

describe("logout", () => {
  it("menghapus sesi dan melaporkan keberhasilan", async () => {
    deleteManySesiMock.mockResolvedValue({ count: 1 });

    await expect(logout("token-mentah")).resolves.toBe(true);
  });

  it("mengembalikan false bila sesi tidak ditemukan atau token tidak valid", async () => {
    deleteManySesiMock.mockResolvedValue({ count: 0 });

    await expect(logout("token-mentah")).resolves.toBe(false);
    await expect(logout("")).resolves.toBe(false);
  });
});
