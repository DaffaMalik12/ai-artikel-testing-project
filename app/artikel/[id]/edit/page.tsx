import Link from "next/link";
import { notFound } from "next/navigation";

import FormEditArtikel from "@/app/components/FormEditArtikel";
import type { Artikel } from "@/app/types/artikel";
import {
  KUNCI_GALAT_GAMBAR,
  PESAN_GALAT_UNGGAH_GAMBAR,
} from "@/lib/konstanta-gambar";
import { getArtikelById } from "@/lib/artikel";

export const dynamic = "force-dynamic";

export default async function HalamanEditArtikel({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let artikel: Artikel | null;

  try {
    artikel = await getArtikelById(id);
  } catch (kesalahan) {
    if (kesalahan instanceof Error) {
      throw new Error(kesalahan.message);
    }

    throw kesalahan;
  }

  if (artikel === null) {
    notFound();
  }

  const adaGalatGambar = query[KUNCI_GALAT_GAMBAR] !== undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <nav aria-label="Navigasi halaman" className="mb-4 text-sm">
        <Link href="/artikel" className="text-blue-700 hover:underline">
          &larr; Kembali ke daftar artikel
        </Link>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit artikel</h1>

      <FormEditArtikel
        artikel={artikel}
        pesanAwal={adaGalatGambar ? PESAN_GALAT_UNGGAH_GAMBAR : null}
      />
    </main>
  );
}
