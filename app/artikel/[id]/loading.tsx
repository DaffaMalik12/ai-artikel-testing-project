export default function LoadingDetailArtikel() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12"
    >
      <span className="sr-only">Memuat detail artikel…</span>

      <div className="h-10 w-52 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-4 h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3, 4].map((baris) => (
            <div
              key={baris}
              className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800/70"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
