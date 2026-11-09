"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSesi } from "@/lib/hooks/use-sesi";

export default function NavigasiSesi() {
  const router = useRouter();
  const {
    pengguna,
    sedangMemuat,
    errorMemuat,
    muatUlang,
    sedangKeluar,
    errorKeluar,
    keluar,
  } = useSesi();

  async function tanganiKeluar() {
    const sukses = await keluar();
    if (sukses) {
      // Cookie sesi sudah dihapus server; segarkan state server di halaman ini.
      router.refresh();
    }
  }

  return (
    <nav
      aria-label="Status sesi"
      aria-busy={sedangMemuat || undefined}
      className="flex flex-wrap items-center gap-3"
    >
      {sedangMemuat ? (
        <span className="text-sm text-slate-400" aria-hidden="true">
          Memuat…
        </span>
      ) : errorMemuat ? (
        // Kegagalan cek sesi ≠ belum login: tawarkan coba lagi, jangan
        // langsung menampilkan tautan "Masuk" yang bisa menyesatkan.
        <>
          <p role="alert" className="text-sm text-red-600">
            {errorMemuat}
          </p>
          <button
            type="button"
            onClick={muatUlang}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Coba lagi
          </button>
        </>
      ) : pengguna ? (
        <>
          <span className="text-sm text-slate-600">
            Halo,{" "}
            <span className="font-semibold text-slate-900">
              {pengguna.username}
            </span>
          </span>
          <button
            type="button"
            onClick={tanganiKeluar}
            disabled={sedangKeluar}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keluar
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Masuk
        </Link>
      )}
      {errorKeluar && (
        <p role="alert" className="text-sm text-red-600">
          {errorKeluar}
        </p>
      )}
    </nav>
  );
}
