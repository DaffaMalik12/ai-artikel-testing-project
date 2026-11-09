import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/artikel";
import {
  JSON_HEADERS,
  responsGagalProxy,
  teruskanResponsArtikel,
  validasiBodyArtikel,
} from "@/lib/api/artikel-proxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id.trim()) {
    return NextResponse.json(
      { message: "ID artikel tidak valid." },
      { status: 400 },
    );
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/artikel/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    return teruskanResponsArtikel(response);
  } catch (error) {
    return responsGagalProxy(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id.trim()) {
    return NextResponse.json(
      { message: "ID artikel tidak valid." },
      { status: 400 },
    );
  }

  const validasi = await validasiBodyArtikel(request);
  if (!validasi.ok) {
    return NextResponse.json({ message: validasi.message }, { status: 400 });
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/artikel/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ judul: validasi.judul, isi: validasi.isi }),
        cache: "no-store",
      },
    );
    return teruskanResponsArtikel(response);
  } catch (error) {
    return responsGagalProxy(error);
  }
}
