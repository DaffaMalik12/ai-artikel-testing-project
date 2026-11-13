"use client";

import Link from "next/link";

import type { ArtikelDaftar } from "@/app/types/artikel";
import { teksAtauNull } from "@/lib/utils/teks";
import { formatTanggal } from "@/lib/utils/tanggal";

export type PropsArtikelItem = {
  artikel: ArtikelDaftar;
  onHapus: (artikel: ArtikelDaftar) => void;
  sedangMenghapus?: boolean;
  sedangDihapus?: boolean;
  nonaktif?: boolean;
};

const KELAS_AKSI_DASAR =
  "inline-flex min-h-9 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-gray-900";

const KELAS_AKSI_SEKUNDER = `${KELAS_AKSI_DASAR} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800`;

const KELAS_AKSI_HAPUS = `${KELAS_AKSI_DASAR} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40`;

const KELAS_AKSI_NONAKTIF = "pointer-events-none opacity-60";

export default function ArtikelItem({
  artikel,
  onHapus,
  sedangMenghapus = false,
  sedangDihapus = false,
  nonaktif = false,
}: PropsArtikelItem) {
  const gambarUrl = teksAtauNull(artikel.gambarUrl);
  const createdAt = teksAtauNull(artikel.createdAt) ?? undefined;
  const sedangDiproses = sedangMenghapus || sedangDihapus;
  const aksiNonaktif = nonaktif || sedangDiproses;
  const tautanArtikel = `/artikel/${encodeURIComponent(artikel.id)}`;
  const kelasAksiSekunder = aksiNonaktif
    ? `${KELAS_AKSI_SEKUNDER} ${KELAS_AKSI_NONAKTIF}`
    : KELAS_AKSI_SEKUNDER;

  return (
    <li className="h-full min-w-0">
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
        <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {gambarUrl ? (
            <img
              src={gambarUrl}
              alt={`Gambar artikel ${artikel.judul}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <p className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-gray-500 dark:text-gray-400">
              Belum ada gambar
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="text-base font-semibold leading-snug text-gray-900 sm:text-lg dark:text-gray-50">
            <Link
              href={tautanArtikel}
              className="-mx-1 block break-words rounded px-1 transition-colors hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:text-blue-300 dark:focus-visible:ring-offset-gray-900"
            >
              {artikel.judul}
            </Link>
          </h3>

          <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            <time dateTime={createdAt}>{formatTanggal(artikel.createdAt)}</time>
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <Link
              href={tautanArtikel}
              aria-disabled={aksiNonaktif || undefined}
              tabIndex={aksiNonaktif ? -1 : undefined}
              className={kelasAksiSekunder}
            >
              Detail
            </Link>

            <Link
              href={`${tautanArtikel}/edit`}
              aria-disabled={aksiNonaktif || undefined}
              tabIndex={aksiNonaktif ? -1 : undefined}
              className={kelasAksiSekunder}
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={() => onHapus(artikel)}
              disabled={aksiNonaktif}
              aria-label={`Hapus artikel ${artikel.judul}`}
              className={KELAS_AKSI_HAPUS}
            >
              {sedangDiproses ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
