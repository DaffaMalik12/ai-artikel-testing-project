"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import ArtikelItem from "@/app/components/ArtikelItem";
import { ambilDaftarArtikel, hapusArtikel } from "@/app/lib/artikel";
import type { ArtikelDaftar } from "@/app/types/artikel";

const JUMLAH_SKELETON = 6;

const SELEKTOR_ELEMEN_FOKUS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const KELAS_TOMBOL_UTAMA =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950";

const KELAS_TOMBOL_NETRAL =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900";

const KELAS_TOMBOL_DESTRUKTIF =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-gray-900";

const KELAS_GRID_DAFTAR =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

type NotifikasiAksi = {
  tipe: "sukses" | "gagal";
  teks: string;
};

function pesanDariError(error: unknown, pesanDefault: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return pesanDefault;
}

function adalahErrorPembatalan(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function ambilElemenFokus(kontainer: HTMLElement): HTMLElement[] {
  return Array.from(
    kontainer.querySelectorAll<HTMLElement>(SELEKTOR_ELEMEN_FOKUS),
  );
}

export default function DaftarArtikel() {
  const [artikel, setArtikel] = useState<ArtikelDaftar[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState<boolean>(true);
  const [pesanErrorMuat, setPesanErrorMuat] = useState<string | null>(null);
  const [notifikasi, setNotifikasi] = useState<NotifikasiAksi | null>(null);
  const [idYangDihapus, setIdYangDihapus] = useState<string | null>(null);
  const [artikelYangDikonfirmasi, setArtikelYangDikonfirmasi] =
    useState<ArtikelDaftar | null>(null);
  const [penandaMuatUlang, setPenandaMuatUlang] = useState<number>(0);

  const refDialog = useRef<HTMLDivElement>(null);
  const refTombolPemicu = useRef<HTMLElement | null>(null);
  const refPernahTerbuka = useRef<boolean>(false);
  const refLiveStatus = useRef<HTMLDivElement>(null);
  const refJudulDaftar = useRef<HTMLHeadingElement>(null);

  const sedangMenghapus = idYangDihapus !== null;
  const dialogTerbuka = artikelYangDikonfirmasi !== null;

  // Dibaca dari dalam event listener tanpa memicu re-run efek focus trap.
  // Dimutasi di dalam efek (bukan saat render) agar aman pada mode concurrent.
  const refSedangMenghapus = useRef<boolean>(sedangMenghapus);

  useEffect(() => {
    refSedangMenghapus.current = sedangMenghapus;
  }, [sedangMenghapus]);

  useEffect(() => {
    const controller = new AbortController();
    let masihAktif = true;

    async function muatArtikel() {
      setSedangMemuat(true);
      setPesanErrorMuat(null);

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
        setPesanErrorMuat(pesanDariError(error, "Gagal memuat daftar artikel."));
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

  // Fokus awal masuk ke dialog + focus trap (Tab/Shift+Tab) + Escape.
  useEffect(() => {
    if (!dialogTerbuka) {
      return;
    }

    const dialog = refDialog.current;

    if (dialog === null) {
      return;
    }

    dialog.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Escape diabaikan selama proses hapus berjalan.
        if (refSedangMenghapus.current) {
          return;
        }

        event.preventDefault();
        setArtikelYangDikonfirmasi(null);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elemenFokus = ambilElemenFokus(dialog);

      if (elemenFokus.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const pertama = elemenFokus[0];
      const terakhir = elemenFokus[elemenFokus.length - 1];
      const aktif = document.activeElement;
      const diDalamDialog = aktif !== null && dialog.contains(aktif);
      // Fokus awal berada pada kontainer dialog (tabIndex={-1}); perlakukan
      // sebagai batas agar trap tidak bocor ke elemen di belakang overlay.
      const diKontainer = aktif === dialog;

      if (event.shiftKey) {
        if (!diDalamDialog || diKontainer || aktif === pertama) {
          event.preventDefault();
          terakhir.focus();
        }
        return;
      }

      if (!diDalamDialog || diKontainer || aktif === terakhir) {
        event.preventDefault();
        pertama.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogTerbuka]);

  // Pemulihan fokus setelah modal ditutup.
  useEffect(() => {
    if (dialogTerbuka) {
      refPernahTerbuka.current = true;
      return;
    }

    if (!refPernahTerbuka.current) {
      return;
    }

    refPernahTerbuka.current = false;

    const pemicu = refTombolPemicu.current;

    // Kasus normal (Batal/Escape): fokus kembali ke tombol pemicu.
    if (pemicu !== null && pemicu.isConnected) {
      pemicu.focus();
      return;
    }

    // Kasus hapus sukses: kartu pemicu sudah ter-unmount dari DOM, jadi fokus
    // dialihkan ke notifikasi (live region persisten) yang memuat konfirmasi.
    const status = refLiveStatus.current;

    if (status !== null) {
      status.focus();
      return;
    }

    // Jaring pengaman terakhir agar fokus tidak jatuh ke <body>.
    refJudulDaftar.current?.focus();
  }, [dialogTerbuka]);

  function muatUlang() {
    // Ubah state secara sinkron agar panel error lama tidak sempat tampil satu
    // render lagi sebelum efek pemuatan berikutnya berjalan (anti-flicker).
    setSedangMemuat(true);
    setPesanErrorMuat(null);
    setNotifikasi(null);
    setPenandaMuatUlang((nilai) => nilai + 1);
  }

  function mintaKonfirmasiHapus(target: ArtikelDaftar) {
    if (typeof document !== "undefined") {
      const aktif = document.activeElement;
      refTombolPemicu.current = aktif instanceof HTMLElement ? aktif : null;
    }

    setNotifikasi(null);
    setArtikelYangDikonfirmasi(target);
  }

  function batalkanHapus() {
    if (sedangMenghapus) {
      return;
    }

    setArtikelYangDikonfirmasi(null);
  }

  function handleKlikBackdrop(event: MouseEvent<HTMLDivElement>) {
    // Hanya klik pada backdrop (bukan isi dialog) yang menutup modal.
    if (event.target !== event.currentTarget) {
      return;
    }

    batalkanHapus();
  }

  async function konfirmasiHapus() {
    if (artikelYangDikonfirmasi === null || sedangMenghapus) {
      return;
    }

    const target = artikelYangDikonfirmasi;
    setIdYangDihapus(target.id);
    setNotifikasi(null);

    try {
      await hapusArtikel(target.id);
      setArtikel((daftarSebelumnya) =>
        daftarSebelumnya.filter((item) => item.id !== target.id),
      );
      setNotifikasi({
        tipe: "sukses",
        teks: `Artikel "${target.judul}" berhasil dihapus.`,
      });
    } catch (error: unknown) {
      setNotifikasi({
        tipe: "gagal",
        teks: pesanDariError(error, `Gagal menghapus artikel "${target.judul}".`),
      });
    } finally {
      setIdYangDihapus(null);
      setArtikelYangDikonfirmasi(null);
    }
  }

  const tampilkanSkeleton = sedangMemuat;
  const tampilkanErrorMuat = !sedangMemuat && pesanErrorMuat !== null;
  const tampilkanEmpty =
    !sedangMemuat && pesanErrorMuat === null && artikel.length === 0;
  const tampilkanDaftar = !sedangMemuat && artikel.length > 0;
  const adaNotifikasiSukses = notifikasi !== null && notifikasi.tipe === "sukses";
  const adaNotifikasiGagal = notifikasi !== null && notifikasi.tipe === "gagal";
  const adaIsiAlert = adaNotifikasiGagal || tampilkanErrorMuat;

  return (
    <section aria-labelledby="judul-daftar-artikel" className="w-full">
      <h2
        id="judul-daftar-artikel"
        ref={refJudulDaftar}
        tabIndex={-1}
        className="sr-only focus:outline-none"
      >
        Daftar artikel
      </h2>

      {/*
        Live region persisten (selalu ada di DOM) untuk status netral dan
        notifikasi sukses. Isi pesan dirender kondisional di dalamnya agar
        screen reader tetap mengumumkan perubahan.
      */}
      <div
        ref={refLiveStatus}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className={`rounded-lg focus:outline-none ${
          adaNotifikasiSukses ? "mb-4" : ""
        }`}
      >
        {sedangMemuat ? (
          <span className="sr-only">Memuat daftar artikel...</span>
        ) : null}

        {notifikasi !== null && notifikasi.tipe === "sukses" ? (
          <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{notifikasi.teks}</span>
          </p>
        ) : null}
      </div>

      {/*
        Live region persisten untuk kegagalan (hapus maupun pemuatan awal),
        selalu berada di DOM agar pesan langsung diumumkan saat muncul.
      */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={`flex flex-col gap-3 ${adaIsiAlert ? "mb-4" : ""}`}
      >
        {notifikasi !== null && notifikasi.tipe === "gagal" ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>{notifikasi.teks}</span>
          </p>
        ) : null}

        {tampilkanErrorMuat ? (
          <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-6 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/40">
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                  Gagal memuat daftar artikel
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {pesanErrorMuat}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={muatUlang}
              className="inline-flex min-h-10 items-center justify-center self-start rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:self-auto dark:border-red-800 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-900/40 dark:focus-visible:ring-offset-gray-950"
            >
              Coba lagi
            </button>
          </div>
        ) : null}
      </div>

      {tampilkanSkeleton ? (
        <ul aria-hidden="true" className={KELAS_GRID_DAFTAR}>
          {Array.from({ length: JUMLAH_SKELETON }).map((_, indeks) => (
            <li
              key={indeks}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="aspect-video w-full animate-pulse bg-gray-200 dark:bg-gray-800" />
              <div className="flex flex-col gap-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-1 flex gap-2">
                  <div className="h-8 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                  <div className="h-8 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                  <div className="h-8 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tampilkanEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Belum ada artikel
            </h3>
            <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
              Mulai tulis artikel pertama Anda dan artikel itu akan tampil di daftar ini.
            </p>
          </div>
          <Link href="/artikel/tambah" className={KELAS_TOMBOL_UTAMA}>
            Tambah Artikel
          </Link>
        </div>
      ) : null}

      {tampilkanDaftar ? (
        <ul className={KELAS_GRID_DAFTAR}>
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

      {dialogTerbuka ? (
        <div
          onClick={handleKlikBackdrop}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-gray-950/60 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8"
        >
          <div
            ref={refDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-konfirmasi-hapus"
            aria-describedby="deskripsi-konfirmasi-hapus"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 focus:outline-none sm:p-7 dark:bg-gray-900 dark:ring-white/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </span>
              <div className="flex flex-col gap-1">
                <h3
                  id="judul-konfirmasi-hapus"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-50"
                >
                  Hapus artikel ini?
                </h3>
                <p
                  id="deskripsi-konfirmasi-hapus"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  Artikel &ldquo;{artikelYangDikonfirmasi?.judul}&rdquo; akan dihapus
                  permanen dan tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={batalkanHapus}
                disabled={sedangMenghapus}
                className={KELAS_TOMBOL_NETRAL}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={konfirmasiHapus}
                disabled={sedangMenghapus}
                aria-busy={sedangMenghapus}
                className={KELAS_TOMBOL_DESTRUKTIF}
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
