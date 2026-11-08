"use client";

import Link from "next/link";

type PropsErrorDetailArtikel = {
  error: Error & { digest?: string };
  reset: () => void;
};

const KELAS_TOMBOL_UTAMA =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400";

const KELAS_TOMBOL_SEKUNDER =
  "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

export default function ErrorDetailArtikel(props: PropsErrorDetailArtikel) {
  // `props.error.message` sengaja tidak dirender: pesan dari lapisan fetch
  // dapat memuat detail internal (host/path). Detail hanya dicatat di server.
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40"
      >
        <h1 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Gagal memuat detail artikel
        </h1>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Terjadi kesalahan saat mengambil data artikel. Silakan coba lagi
          beberapa saat lagi.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => props.reset()}
            className={KELAS_TOMBOL_UTAMA}
          >
            Coba lagi
          </button>
          <Link href="/artikel" className={KELAS_TOMBOL_SEKUNDER}>
            Kembali ke daftar artikel
          </Link>
        </div>
      </div>
    </main>
  );
}
