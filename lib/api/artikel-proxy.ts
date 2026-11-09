import { NextRequest, NextResponse } from "next/server";

import { ApiArtikelError, getApiBaseUrl } from "@/lib/artikel";
import {
  ISI_MAKS_KARAKTER,
  JUDUL_MAKS_KARAKTER,
} from "@/lib/artikel-validasi";

export const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

export type PayloadArtikel = {
  judul?: unknown;
  isi?: unknown;
};

export type HasilValidasiPayload =
  | { ok: true; judul: string; isi: string }
  | { ok: false; message: string };

export function pesanKoneksiGagal(error: unknown): string {
  if (error instanceof ApiArtikelError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Tidak dapat terhubung ke server API.";
  }
  return "Terjadi kesalahan saat menghubungi server API.";
}

export function responsGagalProxy(error: unknown): NextResponse {
  return NextResponse.json(
    { message: pesanKoneksiGagal(error) },
    { status: 502 },
  );
}

export async function validasiBodyArtikel(
  request: NextRequest,
): Promise<HasilValidasiPayload> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    // Body rusak / bukan JSON valid berbeda dari field yang kosong,
    // jadi gunakan pesan eksplisit agar tidak menyesatkan pengguna.
    return { ok: false, message: "Payload tidak valid." };
  }

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, message: "Judul dan isi artikel wajib diisi." };
  }

  const { judul, isi } = payload as PayloadArtikel;

  if (typeof judul !== "string" || typeof isi !== "string") {
    return { ok: false, message: "Judul dan isi artikel wajib diisi." };
  }

  const judulBersih = judul.trim();
  const isiBersih = isi.trim();

  if (!judulBersih) {
    return { ok: false, message: "Judul artikel wajib diisi." };
  }
  if (judulBersih.length > JUDUL_MAKS_KARAKTER) {
    return {
      ok: false,
      message: `Judul artikel maksimal ${JUDUL_MAKS_KARAKTER} karakter.`,
    };
  }
  if (!isiBersih) {
    return { ok: false, message: "Isi artikel wajib diisi." };
  }
  if (isiBersih.length > ISI_MAKS_KARAKTER) {
    return {
      ok: false,
      message: `Isi artikel maksimal ${ISI_MAKS_KARAKTER} karakter.`,
    };
  }

  return { ok: true, judul: judulBersih, isi: isiBersih };
}

export async function teruskanResponsArtikel(
  response: Response,
): Promise<NextResponse> {
  const body = await response.text();
  // Teruskan Content-Type asli dari upstream agar respons non-JSON
  // (mis. HTML error page dari reverse proxy) tidak dikirim dengan
  // header JSON yang menyesatkan parsing di sisi client.
  const contentType =
    response.headers.get("content-type") ?? "application/json";

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}
