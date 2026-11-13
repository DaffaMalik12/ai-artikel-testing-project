import { NextRequest, NextResponse } from "next/server";

import {
  ValidasiArtikelError,
  ambilArtikelById,
  hapusArtikel,
  perbaruiArtikel,
} from "@/lib/services/artikel-service";
import { ambilSesiRequest, responsBelumLogin } from "@/lib/middlewares/autentikasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type Sesi = { penggunaId: number; username: string } | null;

async function ambilIdDariParams(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const nomor = Number(id);

  if (!Number.isInteger(nomor) || nomor < 1) {
    return null;
  }

  return nomor;
}

/**
 * Memeriksa sesi dengan penanganan error: kegagalan DB saat lookup sesi
 * harus mengembalikan JSON 500 standar, bukan error tak tertangani.
 */
async function ambilSesiAman(
  request: NextRequest,
  label: string,
): Promise<{ sesi: Sesi; gagal: boolean }> {
  try {
    return { sesi: await ambilSesiRequest(request), gagal: false };
  } catch (error) {
    console.error(`[${label}] Gagal memeriksa sesi:`, error);
    return { sesi: null, gagal: true };
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const id = await ambilIdDariParams(context);

  if (id === null) {
    return NextResponse.json(
      { message: "ID artikel tidak valid." },
      { status: 400 },
    );
  }

  try {
    // `ambilArtikelById` mengembalikan objek Prisma utuh, termasuk `gambarUrl`
    // (nullable) sehingga detail artikel selalu mengekspos gambar terbaru.
    const artikel = await ambilArtikelById(id);

    if (artikel === null) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(artikel, { status: 200 });
  } catch (error) {
    console.error("[GET /api/artikel/:id] Gagal mengambil artikel:", error);
    return NextResponse.json(
      { message: "Gagal mengambil artikel." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { sesi, gagal } = await ambilSesiAman(request, "PUT /api/artikel/:id");

  if (gagal) {
    return NextResponse.json(
      { message: "Gagal memeriksa status login." },
      { status: 500 },
    );
  }

  if (sesi === null) {
    return responsBelumLogin();
  }

  const id = await ambilIdDariParams(context);

  if (id === null) {
    return NextResponse.json(
      { message: "ID artikel tidak valid." },
      { status: 400 },
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
    // `payload` diteruskan apa adanya; `validasiPayloadArtikel` di service
    // menangani `judul`, `isi`, dan `gambarUrl` opsional (bila key dikirim).
    const artikel = await perbaruiArtikel(id, payload);

    if (artikel === null) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(artikel, { status: 200 });
  } catch (error) {
    if (error instanceof ValidasiArtikelError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("[PUT /api/artikel/:id] Gagal memperbarui artikel:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui artikel." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { sesi, gagal } = await ambilSesiAman(request, "DELETE /api/artikel/:id");

  if (gagal) {
    return NextResponse.json(
      { message: "Gagal memeriksa status login." },
      { status: 500 },
    );
  }

  if (sesi === null) {
    return responsBelumLogin();
  }

  const id = await ambilIdDariParams(context);

  if (id === null) {
    return NextResponse.json(
      { message: "ID artikel tidak valid." },
      { status: 400 },
    );
  }

  try {
    const terhapus = await hapusArtikel(id);

    if (!terhapus) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan." },
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/artikel/:id] Gagal menghapus artikel:", error);
    return NextResponse.json(
      { message: "Gagal menghapus artikel." },
      { status: 500 },
    );
  }
}
