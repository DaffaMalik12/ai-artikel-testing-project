import { NextResponse } from "next/server";

import { NAMA_COOKIE_SESI, ambilTokenSesiDariHeader } from "@/lib/middlewares/autentikasi";
import { logout } from "@/lib/services/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = ambilTokenSesiDariHeader(request);

  if (token !== null) {
    try {
      await logout(token);
    } catch (error) {
      console.error("[POST /api/auth/logout] Gagal menghapus sesi:", error);
      return NextResponse.json(
        { message: "Gagal memproses logout." },
        { status: 500 },
      );
    }
  }

  const response = NextResponse.json(
    { message: "Berhasil logout." },
    { status: 200 },
  );
  response.cookies.set({
    name: NAMA_COOKIE_SESI,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
