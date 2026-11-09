import { NextResponse } from "next/server";

import {
  ValidasiArtikelError,
  ambilSemuaArtikel,
  buatArtikel,
} from "@/lib/services/artikel-service";
import { ambilSesiRequest, responsBelumLogin } from "@/lib/middlewares/autentikasi";
import { ambilKunciKlien, cekRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATAS_POST_PER_MENIT = 10;
const JENDELA_RATE_LIMIT_MS = 60_000;
const LIMIT_MAKS = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let take: number | undefined;
  let skip: number | undefined;

  const limitParam = searchParams.get("limit");
  if (limitParam !== null) {
    const limit = Number(limitParam);
    if (!Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAKS) {
      return NextResponse.json(
        {
          message: `Parameter limit harus bilangan bulat antara 1 dan ${LIMIT_MAKS}.`,
        },
        { status: 400 },
      );
    }
    take = limit;
  }

  const offsetParam = searchParams.get("offset");
  if (offsetParam !== null) {
    const offset = Number(offsetParam);
    if (!Number.isInteger(offset) || offset < 0) {
      return NextResponse.json(
        { message: "Parameter offset harus bilangan bulat >= 0." },
        { status: 400 },
      );
    }
    skip = offset;
  }

  try {
    const daftarArtikel = await ambilSemuaArtikel({ take, skip });
    return NextResponse.json(daftarArtikel, { status: 200 });
  } catch (error) {
    console.error("[GET /api/artikel] Gagal mengambil daftar artikel:", error);
    return NextResponse.json(
      { message: "Gagal mengambil daftar artikel." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // Aksi tulis data wajib login: cookie session HttpOnly otomatis dikirim
  // oleh fetch same-origin dari browser. Pemeriksaan sesi dibungkus
  // try/catch agar kegagalan DB tetap mengembalikan JSON 500 standar.
  let sesi: { penggunaId: number; username: string } | null;

  try {
    sesi = await ambilSesiRequest(request);
  } catch (error) {
    console.error("[POST /api/artikel] Gagal memeriksa sesi:", error);
    return NextResponse.json(
      { message: "Gagal memeriksa status login." },
      { status: 500 },
    );
  }

  if (sesi === null) {
    return responsBelumLogin();
  }

  const hasilRateLimit = cekRateLimit(
    ambilKunciKlien(request),
    BATAS_POST_PER_MENIT,
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

  if (payload === null) {
    return NextResponse.json(
      { message: "Request body tidak valid atau bukan JSON yang sesuai." },
      { status: 400 },
    );
  }

  try {
    const artikelBaru = await buatArtikel(payload);
    return NextResponse.json(artikelBaru, { status: 201 });
  } catch (error) {
    if (error instanceof ValidasiArtikelError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("[POST /api/artikel] Gagal membuat artikel:", error);
    return NextResponse.json(
      { message: "Gagal menyimpan artikel." },
      { status: 500 },
    );
  }
}
