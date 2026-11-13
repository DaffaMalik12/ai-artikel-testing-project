import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { Artikel } from "@/app/types/artikel";
import { getArtikelById } from "@/lib/artikel";
import { formatTanggal } from "@/lib/utils/tanggal";
import { ringkasIsi, teksAtauNull } from "@/lib/utils/teks";

export const dynamic = "force-dynamic";

const DESKRIPSI_MAKS = 160;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const artikel = await getArtikelById(id);

    if (artikel === null) {
      return { title: "Artikel tidak ditemukan" };
    }

    return {
      title: artikel.judul,
      // Dipotong pada batas kata agar meta description tidak terputus di
      // tengah kata (revisi QA VO-51 saran 6).
      description: ringkasIsi(artikel.isi, DESKRIPSI_MAKS),
    };
  } catch {
    return { title: "Artikel" };
  }
}

export default async function HalamanDetailArtikel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // String kosong/whitespace dianggap belum ada gambar.
  const gambarUrl = teksAtauNull(artikel.gambarUrl);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <nav aria-label="Navigasi artikel" className="mb-4 text-sm">
        <Link href="/artikel" className="text-blue-700 hover:underline">
          &larr; Kembali ke daftar artikel
        </Link>
      </nav>

      <article className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {artikel.judul}
          </h1>
          <p className="text-sm text-gray-600">
            {formatTanggal(artikel.createdAt)}
          </p>
        </header>

        {gambarUrl !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gambarUrl}
            alt={`Gambar artikel ${artikel.judul}`}
            className="w-full rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
            Artikel ini belum memiliki gambar.
          </p>
        )}

        <div className="whitespace-pre-line text-base leading-relaxed text-gray-800">
          {artikel.isi}
        </div>
      </article>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/artikel/${encodeURIComponent(artikel.id)}/edit`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Edit artikel
        </Link>
      </div>
    </main>
  );
}
