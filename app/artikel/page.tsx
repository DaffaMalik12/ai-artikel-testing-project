import type { Metadata } from "next";
import Link from "next/link";

import DaftarArtikel from "@/app/components/DaftarArtikel";

export const metadata: Metadata = {
  title: "Daftar Artikel",
  description: "Daftar artikel beserta aksi melihat detail, mengedit, dan menghapus.",
};

const KELAS_TOMBOL_UTAMA =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export default function HalamanDaftarArtikel() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-50">
            Daftar Artikel
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Lihat detail, edit, atau hapus artikel yang sudah dibuat.
          </p>
        </div>

        <Link href="/artikel/tambah" className={KELAS_TOMBOL_UTAMA}>
          Tambah Artikel
        </Link>
      </header>

      <DaftarArtikel />
    </main>
  );
}
