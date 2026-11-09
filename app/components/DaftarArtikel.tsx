"use client";

import { useEffect, useState } from "react";

import ArtikelItem from "@/app/components/ArtikelItem";
import { ambilDaftarArtikel, hapusArtikel } from "@/app/lib/artikel";
import type { ArtikelDaftar } from "@/app/types/artikel";

function pesanDariError(error: unknown, pesanDefault: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return pesanDefault;
}

function adalahErrorPembatalan(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function DaftarArtikel() {
  const [artikel, setArtikel] = useState<ArtikelDaftar[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState<boolean>(true);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [idYangDihapus, setIdYangDihapus] = useState<string | null>(null);
  const [artikelYangDikonfirmasi, setArtikelYangDikonfirmasi] =
    useState<ArtikelDaftar | null>(null);
  const [penandaMuatUlang, setPenandaMuatUlang] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    let masihAktif = true;

    async function muatArtikel() {
      setSedangMemuat(true);
      setPesanError(null);

      try {
        const data = await ambilDaftarArtikel(controller.signal);

        if (!masihAktif) {
          return;
        }

        setArtikel(data);
      } catch (error: unknown) {
        if (!masihAktif || adalahErrorPembatalan(error)) {
          return;
        }

        setArtikel([]);
        setPesanError(pesanDariError(error, "Gagal memuat daftar artikel."));
      } finally {
        if (masihAktif) {
          setSedangMemuat(false);
        }
      }
    }

    void muatArtikel();

    return () => {
      masihAktif = false;
      controller.abort();
    };
  }, [penandaMuatUlang]);

  function mintaKonfirmasiHapus(target: ArtikelDaftar) {
    setPesanError(null);
    setPesanSukses(null);
    setArtikelYangDikonfirmasi(target);
  }

  function batalkanHapus() {
    setArtikelYangDikonfirmasi(null);
  }

  async function konfirmasiHapus() {
    if (artikelYangDikonfirmasi === null) {
      return;
    }

    const target = artikelYangDikonfirmasi;
    setIdYangDihapus(target.id);
    setPesanError(null);
    setPesanSukses(null);

    try {
      await hapusArtikel(target.id);
      setArtikel((daftarSebelumnya) =>
        daftarSebelumnya.filter((item) => item.id !== target.id),
      );
      setPesanSukses(`Artikel "${target.judul}" berhasil dihapus.`);
    } catch (error: unknown) {
      setPesanError(pesanDariError(error, `Gagal menghapus artikel "${target.judul}".`));
    } finally {
      setIdYangDihapus(null);
      setArtikelYangDikonfirmasi(null);
    }
  }

  const sedangMenghapus = idYangDihapus !== null;

  return (
    <section aria-labelledby="judul-daftar-artikel">
      <h2 id="judul-daftar-artikel" className="sr-only">
        Daftar artikel
      </h2>

      <div aria-live="polite" className="mb-4 flex flex-col gap-2">
        {pesanSukses !== null ? (
          <p
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
          >
            {pesanSukses}
          </p>
        ) : null}

        {pesanError !== null ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <span>{pesanError}</span>
            <button
              type="button"
              onClick={() => setPenandaMuatUlang((nilai) => nilai + 1)}
              className="inline-flex min-h-9 items-center justify-center self-start rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-100 sm:self-auto dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
            >
              Coba lagi
            </button>
          </div>
        ) : null}
      </div>

      {sedangMemuat ? (
        <p role="status" className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Memuat daftar artikel...
        </p>
      ) : null}

      {!sedangMemuat && artikel.length === 0 && pesanError === null ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Belum ada artikel.
        </p>
      ) : null}

      {!sedangMemuat && artikel.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {artikel.map((item) => (
            <ArtikelItem
              key={item.id}
              artikel={item}
              sedangDihapus={idYangDihapus === item.id}
              onHapus={mintaKonfirmasiHapus}
            />
          ))}
        </ul>
      ) : null}

      {artikelYangDikonfirmasi !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-konfirmasi-hapus"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg dark:bg-gray-900">
            <h3
              id="judul-konfirmasi-hapus"
              className="text-base font-semibold text-gray-900 dark:text-gray-50"
            >
              Hapus artikel ini?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Artikel &quot;{artikelYangDikonfirmasi.judul}&quot; akan dihapus permanen.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={batalkanHapus}
                disabled={sedangMenghapus}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={konfirmasiHapus}
                disabled={sedangMenghapus}
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sedangMenghapus ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
