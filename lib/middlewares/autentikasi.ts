import { NextResponse } from "next/server";

import { ambilSesi } from "@/lib/services/auth-service";

export const NAMA_COOKIE_SESI = "sesi_token";

export type SesiPengguna = {
  penggunaId: number;
  username: string;
};

/** Parse cookie header manual agar kompatibel dengan `Request` maupun `NextRequest`. */
export function ambilTokenSesiDariHeader(request: Request): string | null {
  const header = request.headers.get("cookie");

  if (!header) {
    return null;
  }

  for (const bagian of header.split(";")) {
    const [nama, ...sisaNilai] = bagian.trim().split("=");

    if (nama === NAMA_COOKIE_SESI && sisaNilai.length > 0) {
      const nilai = sisaNilai.join("=");

      try {
        const didekode = decodeURIComponent(nilai);
        return didekode.trim() === "" ? null : didekode;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function ambilSesiRequest(
  request: Request,
): Promise<SesiPengguna | null> {
  const token = ambilTokenSesiDariHeader(request);

  if (token === null) {
    return null;
  }

  const sesi = await ambilSesi(token);

  if (sesi === null) {
    return null;
  }

  return { penggunaId: sesi.penggunaId, username: sesi.username };
}

export function responsBelumLogin(): NextResponse {
  return NextResponse.json(
    { message: "Anda harus login untuk melakukan aksi ini." },
    { status: 401 },
  );
}
