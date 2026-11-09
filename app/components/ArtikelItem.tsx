import Link from "next/link";

import { dapatMenampilkanWaktu, formatTanggal } from "@/app/lib/artikel";
import type { ArtikelDaftar } from "@/app/types/artikel";

interface ArtikelItemProps {
  artikel: ArtikelDaftar;
  sedangDihapus: boolean;
  onHapus: (artikel: ArtikelDaftar) => void;
}

const KELAS_TOMBOL_DASAR =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60";

const KELAS_TOMBOL_SEKUNDER = `${KELAS_TOMBOL_DASAR} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`;
const KELAS_TOMBOL_HAPUS = `${KELAS_TOMBOL_DASAR} border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40`;

export default function ArtikelItem({ artikel, sedangDihapus, onHapus }: ArtikelItemProps) {
  const tanggalTerbaca = dapatMenampilkanWaktu(artikel.createdAt);
  const slugId = encodeURIComponent(artikel.id);

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
            {artikel.judul}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dibuat:{" "}
            <time dateTime={tanggalTerbaca ? artikel.createdAt : undefined}>
              {formatTanggal(artikel.createdAt)}
            </time>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Link href={`/artikel/${slugId}`} className={KELAS_TOMBOL_SEKUNDER}>
            Detail
          </Link>
          <Link href={`/artikel/${slugId}/edit`} className={KELAS_TOMBOL_SEKUNDER}>
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onHapus(artikel)}
            disabled={sedangDihapus}
            aria-busy={sedangDihapus}
            aria-label={`Hapus artikel ${artikel.judul}`}
            className={KELAS_TOMBOL_HAPUS}
          >
            {sedangDihapus ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </li>
  );
}
