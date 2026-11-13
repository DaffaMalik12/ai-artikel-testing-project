import { NextRequest, NextResponse } from "next/server";

import {
  UKURAN_GAMBAR_MAKS_BYTE,
  ValidasiGambarError,
  validasiBerkasGambar,
} from "@/lib/validasi-gambar";
import {
  hapusGambarArtikel,
  simpanGambarArtikel,
} from "@/lib/services/artikel-service";
import {
  ambilSesiRequest,
  responsBelumLogin,
} from "@/lib/middlewares/autentikasi";

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

export async function POST(request: NextRequest, context: RouteContext) {
  const { sesi, gagal } = await ambilSesiAman(
    request,
    "POST /api/artikel/:id/gambar",
  );

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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Request harus berupa multipart/form-data." },
      { status: 400 },
    );
  }

  const berkas = formData.get("gambar");

  if (!(berkas instanceof File)) {
    return NextResponse.json(
      { message: "Field 'gambar' wajib diisi dengan sebuah file." },
      { status: 400 },
    );
  }

  if (berkas.size === 0) {
    return NextResponse.json(
      { message: "File gambar tidak boleh kosong." },
      { status: 400 },
    );
  }

  if (berkas.size > UKURAN_GAMBAR_MAKS_BYTE) {
    return NextResponse.json(
      { message: "Ukuran gambar maksimal 2 MB." },
      { status: 400 },
    );
  }

  const buffer = new Uint8Array(await berkas.arrayBuffer());

  let ekstensi: string;

  try {
    const tervalidasi = validasiBerkasGambar(buffer, berkas.type);
    ekstensi = tervalidasi.ekstensi;
  } catch (error) {
    if (error instanceof ValidasiGambarError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error(
      "[POST /api/artikel/:id/gambar] Gagal memvalidasi gambar:",
      error,
    );
    return NextResponse.json(
      { message: "Gagal memvalidasi gambar." },
      { status: 500 },
    );
  }

  try {
    const hasil = await simpanGambarArtikel(id, { buffer, ekstensi });

    if (hasil === null) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ gambarUrl: hasil.gambarUrl }, { status: 200 });
  } catch (error) {
    console.error(
      "[POST /api/artikel/:id/gambar] Gagal menyimpan gambar:",
      error,
    );
    return NextResponse.json(
      { message: "Gagal menyimpan gambar artikel." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { sesi, gagal } = await ambilSesiAman(
    request,
    "DELETE /api/artikel/:id/gambar",
  );

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
    const hasil = await hapusGambarArtikel(id);

    if (hasil === null) {
      return NextResponse.json(
        { message: "Artikel tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ gambarUrl: null }, { status: 200 });
  } catch (error) {
    console.error(
      "[DELETE /api/artikel/:id/gambar] Gagal menghapus gambar:",
      error,
    );
    return NextResponse.json(
      { message: "Gagal menghapus gambar artikel." },
      { status: 500 },
    );
  }
}
