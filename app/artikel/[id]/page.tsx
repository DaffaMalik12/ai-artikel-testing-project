import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatTanggal, getArtikelById } from "@/lib/artikel";

type HalamanDetailArtikelProps = {
  params: Promise<{ id: string }>;
};

const KELAS_TOMBOL_KEMBALI =
  "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

function ringkasIsi(isi: string, maksimal = 160): string {
  const bersih = isi.replace(/\s+/g, " ").trim();

  if (bersih.length <= maksimal) {
    return bersih;
  }

  return `${bersih.slice(0, maksimal - 1).trimEnd()}…`;
}

function pecahParagraf(isi: string): string[] {
  return isi
    .split(/\n{2,}/)
    .map((paragraf) => paragraf.trim())
    .filter((paragraf) => paragraf.length > 0);
}

export async function generateMetadata({
  params,
}: HalamanDetailArtikelProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const artikel = await getArtikelById(id);

    if (artikel === null) {
      return { title: "Artikel tidak ditemukan" };
    }

    return {
      title: artikel.judul,
      description: ringkasIsi(artikel.isi) || undefined,
    };
  } catch {
    // Detail error tidak pernah dibocorkan ke metadata pengguna.
    return { title: "Detail Artikel" };
  }
}

export default async function HalamanDetailArtikel({
  params,
}: HalamanDetailArtikelProps) {
  const { id } = await params;

  const artikel = await getArtikelById(id);

  if (artikel === null) {
    notFound();
  }

  const paragrafIsi = pecahParagraf(artikel.isi);
  const adaTanggalValid = !Number.isNaN(new Date(artikel.createdAt).getTime());

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/artikel" className={KELAS_TOMBOL_KEMBALI}>
        <span aria-hidden="true">←</span>
        Kembali ke daftar artikel
      </Link>

      <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <header className="border-b border-gray-100 pb-4 dark:border-gray-800">
          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl dark:text-gray-50">
            {artikel.judul}
          </h1>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <time dateTime={adaTanggalValid ? artikel.createdAt : undefined}>
              Dibuat pada {formatTanggal(artikel.createdAt)}
            </time>
          </p>
        </header>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-800 dark:text-gray-200">
          {paragrafIsi.map((paragraf, indeks) => (
            <p key={indeks}>{paragraf}</p>
          ))}
        </div>
      </article>

      <div className="mt-8">
        <Link href="/artikel" className={KELAS_TOMBOL_KEMBALI}>
          <span aria-hidden="true">←</span>
          Kembali ke daftar artikel
        </Link>
      </div>
    </main>
  );
}
