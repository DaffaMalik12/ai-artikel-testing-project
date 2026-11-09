import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashKataSandi, verifikasiKataSandi } from "@/lib/utils/password";

export class KredensialLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KredensialLoginError";
  }
}

export class ValidasiPenggunaError extends Error {
  readonly field: "username" | "password";

  constructor(field: "username" | "password", message: string) {
    super(message);
    this.name = "ValidasiPenggunaError";
    this.field = field;
  }
}

/** Duplikasi data unik dipetakan ke 409 Conflict, bukan 400. */
export class UsernameSudahDigunakanError extends Error {
  constructor(message = "Username sudah digunakan.") {
    super(message);
    this.name = "UsernameSudahDigunakanError";
  }
}

export type SesiAktif = {
  penggunaId: number;
  username: string;
  kedaluwarsa: string;
};

export type PenggunaBaru = { id: number; username: string };

const DURASI_SESI_MS = 7 * 24 * 60 * 60 * 1000;
const USERNAME_MIN = 3;
const USERNAME_MAKS = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAKS = 200;

/**
 * Hash dummy berformat scrypt valid, dipakai saat username tidak terdaftar
 * agar verifikasi password tetap dijalankan dan durasi respons konsisten
 * dengan kasus username terdaftar (mencegah enumerasi username via timing).
 * Panjang hash 64 byte sama dengan PANJANG_KUNCI_BYTES pada util password.
 */
const HASH_DUMMY = `scrypt:${"a".repeat(32)}:${"a".repeat(128)}`;

/**
 * Database hanya menyimpan hash SHA-256 dari token session; token mentah
 * hanya ada di cookie HttpOnly sehingga kebocoran DB tidak bisa dipakai
 * untuk menyamar sebagai pengguna.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function validasiKredensial(
  username: unknown,
  password: unknown,
): { username: string; password: string } {
  if (typeof username !== "string" || typeof password !== "string") {
    throw new ValidasiPenggunaError("username", "Username dan password wajib diisi.");
  }

  const usernameBersih = username.trim();

  if (usernameBersih.length < USERNAME_MIN || usernameBersih.length > USERNAME_MAKS) {
    throw new ValidasiPenggunaError(
      "username",
      `Username harus ${USERNAME_MIN} sampai ${USERNAME_MAKS} karakter.`,
    );
  }

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAKS) {
    throw new ValidasiPenggunaError(
      "password",
      `Password harus ${PASSWORD_MIN} sampai ${PASSWORD_MAKS} karakter.`,
    );
  }

  return { username: usernameBersih, password };
}

export async function buatSesiBaru(
  penggunaId: number,
): Promise<{ token: string; kedaluwarsa: Date }> {
  const token = randomBytes(32).toString("hex");
  const kedaluwarsa = new Date(Date.now() + DURASI_SESI_MS);

  await prisma.sesi.create({
    data: { tokenHash: hashToken(token), kedaluwarsa, penggunaId },
  });

  return { token, kedaluwarsa };
}

export async function daftarPengguna(
  username: unknown,
  password: unknown,
): Promise<PenggunaBaru> {
  const kredensial = validasiKredensial(username, password);

  try {
    const pengguna = await prisma.pengguna.create({
      data: {
        username: kredensial.username,
        passwordHash: await hashKataSandi(kredensial.password),
      },
    });

    return { id: pengguna.id, username: pengguna.username };
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      throw new UsernameSudahDigunakanError();
    }

    throw error;
  }
}

export async function login(
  username: unknown,
  password: unknown,
): Promise<{
  token: string;
  kedaluwarsa: Date;
  pengguna: PenggunaBaru;
}> {
  const kredensial = validasiKredensial(username, password);

  const pengguna = await prisma.pengguna.findUnique({
    where: { username: kredensial.username },
  });

  // Verifikasi selalu dijalankan (hash dummy bila user tidak ada) agar
  // waktu respons kasus "username salah" dan "password salah" seragam.
  const sandiCocok = await verifikasiKataSandi(
    kredensial.password,
    pengguna === null ? HASH_DUMMY : pengguna.passwordHash,
  );

  if (pengguna === null || !sandiCocok) {
    throw new KredensialLoginError("Username atau password salah.");
  }

  // Bersihkan sesi kedaluwarsa agar tabel tidak tumbuh tanpa batas.
  await prisma.sesi.deleteMany({ where: { kedaluwarsa: { lt: new Date() } } });

  const sesi = await buatSesiBaru(pengguna.id);

  return {
    token: sesi.token,
    kedaluwarsa: sesi.kedaluwarsa,
    pengguna: { id: pengguna.id, username: pengguna.username },
  };
}

export async function ambilSesi(token: unknown): Promise<SesiAktif | null> {
  if (typeof token !== "string" || token.trim() === "") {
    return null;
  }

  const sesi = await prisma.sesi.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { pengguna: true },
  });

  if (sesi === null) {
    return null;
  }

  if (sesi.kedaluwarsa.getTime() <= Date.now()) {
    await prisma.sesi.deleteMany({ where: { tokenHash: sesi.tokenHash } });
    return null;
  }

  return {
    penggunaId: sesi.penggunaId,
    username: sesi.pengguna.username,
    kedaluwarsa: sesi.kedaluwarsa.toISOString(),
  };
}

export async function logout(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || token.trim() === "") {
    return false;
  }

  const hasil = await prisma.sesi.deleteMany({
    where: { tokenHash: hashToken(token) },
  });

  return hasil.count > 0;
}
