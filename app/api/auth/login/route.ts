import { NextResponse } from "next/server";

import { NAMA_COOKIE_SESI } from "@/lib/middlewares/autentikasi";
import {
  KredensialLoginError,
  ValidasiPenggunaError,
  login,
} from "@/lib/services/auth-service";
import { ambilKunciKlien, cekRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATAS_LOGIN_PER_MENIT = 5;
const JENDELA_RATE_LIMIT_MS = 60_000;
const DURASI_COOKIE_DETIK = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  const hasilRateLimit = cekRateLimit(
    `login:${ambilKunciKlien(request)}`,
    BATAS_LOGIN_PER_MENIT,
    JENDELA_RATE_LIMIT_MS,
  );

  if (!hasilRateLimit.diizinkan) {
    return NextResponse.json(
      { message: "Terlalu banyak percobaan login. Coba lagi nanti." },
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
    const { token, kedaluwarsa, pengguna } = await login(username, password);

    const response = NextResponse.json({ pengguna }, { status: 200 });
    response.cookies.set({
      name: NAMA_COOKIE_SESI,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DURASI_COOKIE_DETIK,
      expires: kedaluwarsa,
    });

    return response;
  } catch (error) {
    if (error instanceof ValidasiPenggunaError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof KredensialLoginError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    console.error("[POST /api/auth/login] Gagal memproses login:", error);
    return NextResponse.json(
      { message: "Gagal memproses login." },
      { status: 500 },
    );
  }
}
