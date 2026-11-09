import { NextResponse } from "next/server";

import { ambilSesiRequest } from "@/lib/middlewares/autentikasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sesi = await ambilSesiRequest(request);

    if (sesi === null) {
      return NextResponse.json({ message: "Belum login." }, { status: 401 });
    }

    return NextResponse.json(
      { pengguna: { id: sesi.penggunaId, username: sesi.username } },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/auth/me] Gagal memeriksa sesi:", error);
    return NextResponse.json(
      { message: "Gagal memeriksa status login." },
      { status: 500 },
    );
  }
}
