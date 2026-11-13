import Link from "next/link";

import type { ArtikelDaftar } from "@/app/types/artikel";
import { formatTanggal } from "@/lib/utils/tanggal";
import { teksAtauNull } from "@/lib/utils/teks";

interface PropsArtikelItem {
  artikel: ArtikelDaftar;
  onHapus?: (id: string) => void;
  sedangMenghapus?: boolean;
  nonaktif?: boolean;
}

const KELAS_TOMBOL_AKSI =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Tidak memakai hook/state, sehingga tidak perlu direktif `"use client"`;
 * komponen ini otomatis menjadi bagian bundle klien saat diimpor oleh
 * `DaftarArtikel` (revisi QA VO-51 saran 4).
 */
export default function ArtikelItem({
  artikel,
  onHapus,
  sedangMenghapus = false,
  nonaktif = false,
}: PropsArtikelItem) {
  // Normalisasi string kosong/whitespace jadi `null` agar fallback tampil.
  const gambarUrl = teksAtauNull(artikel.gambarUrl);
  // ID di-encode agar aman untuk karakter khusus pada URL.
  const idTautan = encodeURIComponent(artikel.id);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-start">
      <div className="h-44 w-full shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-24 sm:w-32">
        {gambarUrl !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gambarUrl}
            alt={`Gambar artikel ${artikel.judul}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-600">
            Belum ada gambar
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">
            <Link
              href={`/artikel/${idTautan}`}
              className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              {artikel.judul}
            </Link>
          </h2>
          <p className="text-sm text-gray-600">
            {formatTanggal(artikel.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/artikel/${idTautan}`} className={KELAS_TOMBOL_AKSI}>
            Detail
          </Link>
          <Link href={`/artikel/${idTautan}/edit`} className={KELAS_TOMBOL_AKSI}>
            Edit
          </Link>
          {onHapus !== undefined && (
            <button
              type="button"
              onClick={() => onHapus(artikel.id)}
              disabled={nonaktif || sedangMenghapus}
              aria-busy={sedangMenghapus}
              aria-label={`Hapus artikel ${artikel.judul}`}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sedangMenghapus ? "Menghapus…" : "Hapus"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
