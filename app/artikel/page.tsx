import type { Metadata } from "next";
import Link from "next/link";

import DaftarArtikel from "@/app/components/DaftarArtikel";

export const metadata: Metadata = {
  title: "Daftar Artikel",
  description:
    "Telusuri artikel yang sudah dipublikasikan lalu buka detail, edit, atau hapus.",
};

export default function HalamanDaftarArtikel() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:py-10">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-gray-800">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-50">
            Daftar Artikel
          </h1>
          <p className="max-w-prose text-sm text-gray-600 sm:text-base dark:text-gray-400">
            Kumpulan artikel terbaru. Buka detail untuk membaca, atau ubah dan
            hapus langsung dari kartu di bawah ini.
          </p>
        </div>

        <Link
          href="/artikel/tambah"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto dark:focus-visible:ring-offset-gray-950"
        >
          Tambah Artikel
        </Link>
      </header>

      {/*
        DaftarArtikel (belum diubah pada tiket ini) merender <section> berisi
        <ul class="flex flex-col gap-3">. Agar daftar tetap tampil sebagai grid
        responsif (1 kolom di mobile, 2-3 kolom di layar lebar) tanpa mengubah
        komponen tersebut, susunan kolom diterapkan dari halaman ini memakai
        arbitrary variant Tailwind pada <ul> tersebut.
      */}
      <div className="[&>section>ul]:grid [&>section>ul]:grid-cols-1 [&>section>ul]:gap-4 sm:[&>section>ul]:grid-cols-2 xl:[&>section>ul]:grid-cols-3">
        <DaftarArtikel />
      </div>
    </div>
  );
}
