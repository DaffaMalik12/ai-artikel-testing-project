import Link from "next/link";

export default function ArtikelTidakDitemukan() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
        Artikel tidak ditemukan
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Artikel yang Anda cari mungkin sudah dihapus atau tautannya salah.
      </p>

      <div className="mt-6 flex justify-center">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <span aria-hidden="true">←</span>
          Kembali ke daftar artikel
        </Link>
      </div>
    </main>
  );
}
