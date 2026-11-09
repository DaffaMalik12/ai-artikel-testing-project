import type { ReactNode } from "react";

import NavigasiSesi from "../components/NavigasiSesi";

/**
 * Layout segmen /artikel: menempelkan navigasi status sesi (tautan
 * "Masuk" / username + tombol "Keluar") di atas seluruh halaman artikel
 * (daftar, detail, tambah, edit) tanpa mengubah halaman existing.
 */
export default function ArtikelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-slate-900">Artikel</span>
          <NavigasiSesi />
        </div>
      </header>
      {children}
    </>
  );
}
