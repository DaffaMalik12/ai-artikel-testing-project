import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/artikel";
import {
  responsGagalProxy,
  teruskanResponsArtikel,
  validasiBodyArtikel,
} from "@/lib/api/artikel-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/artikel`, {
      cache: "no-store",
    });
    return teruskanResponsArtikel(response);
  } catch (error) {
    return responsGagalProxy(error);
  }
}

export async function POST(request: NextRequest) {
  const validasi = await validasiBodyArtikel(request);
  if (!validasi.ok) {
    return NextResponse.json({ message: validasi.message }, { status: 400 });
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/artikel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judul: validasi.judul, isi: validasi.isi }),
      cache: "no-store",
    });
    return teruskanResponsArtikel(response);
  } catch (error) {
    return responsGagalProxy(error);
  }
}
