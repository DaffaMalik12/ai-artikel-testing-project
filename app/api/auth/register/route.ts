import { NextResponse } from "next/server";

import { NAMA_COOKIE_SESI } from "@/lib/middlewares/autentikasi";
import {
  UsernameSudahDigunakanError,
  ValidasiPenggunaError,
  buatSesiBaru,
  daftarPengguna,
} from "@/lib/services/auth-service";
import { ambilKunciKlien, cekRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATAS_DAFTAR_PER_MENIT = 5;
const JENDELA_RATE_LIMIT_MS = 60_000;
const DURASI_COOKIE_DETIK = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  const hasilRateLimit = cekRateLimit(
    `daftar:${ambilKunciKlien(request)}`,
    BATAS_DAFTAR_PER_MENIT,
    JENDELA_RATE_LIMIT_MS,
  );

  if (!hasilRateLimit.diizinkan) {
    return NextResponse.json(
      { message: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { "Retry-After": String(hasilRateLimit.resetDetik) },
      },
    );
  }

  const payload = await request.json().catch(() => null);

  if (payload === null || typeof payload !== "object") {
    return NextResponse.json(
      { message: "Username dan password wajib diisi." },
      { status: 400 },
    );
  }

  const { username, password } = payload as Record<string, unknown>;

  try {
    const pengguna = await daftarPengguna(username, password);
    const sesi = await buatSesiBaru(pengguna.id);

    const response = NextResponse.json({ pengguna }, { status: 201 });
    response.cookies.set({
      name: NAMA_COOKIE_SESI,
      value: sesi.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DURASI_COOKIE_DETIK,
      expires: sesi.kedaluwarsa,
    });

    return response;
  } catch (error) {
    if (error instanceof ValidasiPenggunaError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Duplikasi data unik = konflik state, bukan input tidak valid.
    if (error instanceof UsernameSudahDigunakanError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("[POST /api/auth/register] Gagal mendaftarkan pengguna:", error);
    return NextResponse.json(
      { message: "Gagal mendaftarkan pengguna." },
      { status: 500 },
    );
  }
}
