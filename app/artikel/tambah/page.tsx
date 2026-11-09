import type { Metadata } from "next";
import Link from "next/link";

import ArtikelForm from "./artikel-form";

export const metadata: Metadata = {
  title: "Tambah Artikel",
  description: "Buat artikel baru dan simpan ke daftar artikel.",
};

export default function TambahArtikelPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/artikel" className="hover:text-gray-700 hover:underline dark:hover:text-gray-200">
          Daftar Artikel
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-gray-900 dark:text-gray-100">Tambah Artikel</span>
      </nav>

      <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl dark:text-gray-50">
        Tambah Artikel
      </h1>
      <p className="mt-1 mb-8 text-sm text-gray-600 dark:text-gray-400">
        Isi judul dan isi artikel, lalu simpan.
      </p>

      <ArtikelForm />
    </main>
  );
}
