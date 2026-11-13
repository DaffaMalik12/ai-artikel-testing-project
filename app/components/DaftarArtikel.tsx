"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import ArtikelItem from "@/app/components/ArtikelItem";
import {
  ApiArtikelError,
  ambilDaftarArtikel,
  hapusArtikel,
} from "@/lib/api/artikel";
import type { ArtikelDaftar } from "@/app/types/artikel";

const PESAN_GAGAL_MUAT =
  "Gagal memuat daftar artikel. Coba lagi beberapa saat lagi.";
const PESAN_GAGAL_HAPUS =
  "Gagal menghapus artikel. Coba lagi beberapa saat lagi.";

const SELEKTOR_FOKUS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * State penghapusan artikel + modal konfirmasi (termasuk Escape & focus trap).
 * Dipisah ke hook agar jalur presentational dan container memakai logika yang
 * sama tanpa duplikasi.
 */
function usePenghapusArtikel(
  setDaftar: Dispatch<SetStateAction<ArtikelDaftar[]>>,
) {
  const [idYangDihapus, setIdYangDihapus] = useState<string | null>(null);
  const [idSedangDihapus, setIdSedangDihapus] = useState<string | null>(null);
  const [galatHapus, setGalatHapus] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Elemen pemicu modal, untuk memulihkan fokus saat modal ditutup.
  const pemicuRef = useRef<HTMLElement | null>(null);

  const tutupModal = useCallback(() => {
    setIdYangDihapus(null);

    const pemicu = pemicuRef.current;
    pemicuRef.current = null;

    if (pemicu !== null && typeof pemicu.focus === "function") {
      pemicu.focus();
    }
  }, []);

  // Fokuskan dialog saat dibuka agar pengguna keyboard langsung berada di modal.
  useEffect(() => {
    if (idYangDihapus !== null) {
      dialogRef.current?.focus();
    }
  }, [idYangDihapus]);

  // Escape menutup modal (kecuali sedang menghapus).
  useEffect(() => {
    if (idYangDihapus === null) {
      return;
    }

    function tanganiTombol(event: KeyboardEvent) {
      if (event.key === "Escape" && idSedangDihapus === null) {
        setGalatHapus(null);
        tutupModal();
      }
    }

    window.addEventListener("keydown", tanganiTombol);

    return () => {
      window.removeEventListener("keydown", tanganiTombol);
    };
  }, [idYangDihapus, idSedangDihapus, tutupModal]);

  // Focus trap: Tab/Shift+Tab berputar di dalam dialog (revisi QA VO-51 saran 5).
  useEffect(() => {
    if (idYangDihapus === null) {
      return;
    }

    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    function tanganiTab(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }

      const daftarFokus = Array.from(
        dialog.querySelectorAll<HTMLElement>(SELEKTOR_FOKUS),
      );

      if (daftarFokus.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const pertama = daftarFokus[0];
      const terakhir = daftarFokus[daftarFokus.length - 1];
      const aktif = document.activeElement;

      if (event.shiftKey) {
        if (
          aktif === pertama ||
          aktif === dialog ||
          !dialog.contains(aktif)
        ) {
          event.preventDefault();
          terakhir.focus();
        }

        return;
      }

      if (aktif === terakhir || aktif === dialog || !dialog.contains(aktif)) {
        event.preventDefault();
        pertama.focus();
      }
    }

    dialog.addEventListener("keydown", tanganiTab);

    return () => {
      dialog.removeEventListener("keydown", tanganiTab);
    };
  }, [idYangDihapus]);

  const mintaHapus = useCallback((id: string) => {
    if (typeof document !== "undefined") {
      const aktif = document.activeElement;
      pemicuRef.current = aktif instanceof HTMLElement ? aktif : null;
    }

    setPesanSukses(null);
    setGalatHapus(null);
    setIdYangDihapus(id);
  }, []);

  const batalkanHapus = useCallback(() => {
    if (idSedangDihapus !== null) {
      return;
    }

    setGalatHapus(null);
    tutupModal();
  }, [idSedangDihapus, tutupModal]);

  const konfirmasiHapus = useCallback(async () => {
    if (idYangDihapus === null || idSedangDihapus !== null) {
      return;
    }

    const idTarget = idYangDihapus;
    setIdSedangDihapus(idTarget);
    setGalatHapus(null);

    try {
      await hapusArtikel(idTarget);
      setDaftar((sebelumnya) =>
        sebelumnya.filter((item) => item.id !== idTarget),
      );
      setPesanSukses("Artikel berhasil dihapus.");
    } catch (kesalahan) {
      setGalatHapus(
        kesalahan instanceof ApiArtikelError
          ? kesalahan.message
          : PESAN_GAGAL_HAPUS,
      );
    } finally {
      setIdSedangDihapus(null);
      // Selalu tutup modal + pulihkan fokus ke tombol pemicu.
      tutupModal();
    }
  }, [idYangDihapus, idSedangDihapus, setDaftar, tutupModal]);

  return {
    idYangDihapus,
    idSedangDihapus,
    galatHapus,
    pesanSukses,
    mintaHapus,
    batalkanHapus,
    konfirmasiHapus,
    dialogRef,
  };
}

interface PropsIsiDaftar {
  daftar: ArtikelDaftar[];
  penghapus: ReturnType<typeof usePenghapusArtikel>;
}

/** Bagian tampilan (banner, list/empty, modal) yang dipakai kedua jalur. */
function IsiDaftar({ daftar, penghapus }: PropsIsiDaftar) {
  const {
    idYangDihapus,
    idSedangDihapus,
    galatHapus,
    pesanSukses,
    mintaHapus,
    batalkanHapus,
    konfirmasiHapus,
    dialogRef,
  } = penghapus;

  return (
    <div className="flex flex-col gap-3">
      {pesanSukses !== null && (
        <p
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          {pesanSukses}
        </p>
      )}

      {galatHapus !== null && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
        >
          {galatHapus}
        </p>
      )}

      {daftar.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-700">
          Belum ada artikel. Silakan tambahkan artikel baru.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((item) => (
            <ArtikelItem
              key={item.id}
              artikel={item}
              onHapus={mintaHapus}
              sedangMenghapus={idSedangDihapus === item.id}
              nonaktif={idSedangDihapus !== null}
            />
          ))}
        </ul>
      )}

      {idYangDihapus !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              batalkanHapus();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-konfirmasi-hapus"
            tabIndex={-1}
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg outline-none"
          >
            <h2
              id="judul-konfirmasi-hapus"
              className="text-base font-semibold text-gray-900"
            >
              Hapus artikel ini?
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={batalkanHapus}
                disabled={idSedangDihapus !== null}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void konfirmasiHapus()}
                disabled={idSedangDihapus !== null}
                aria-busy={idSedangDihapus !== null}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {idSedangDihapus !== null ? "Menghapus…" : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Jalur container: memanggil API sendiri (loading/error/empty/success). */
function DaftarArtikelDinamis() {
  const [daftar, setDaftar] = useState<ArtikelDaftar[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percobaan, setPercobaan] = useState(0);

  const penghapus = usePenghapusArtikel(setDaftar);

  useEffect(() => {
    const kontrol = new AbortController();
    let aktif = true;

    setSedangMemuat(true);
    setError(null);

    (async () => {
      try {
        const hasil = await ambilDaftarArtikel(kontrol.signal);

        if (!aktif) {
          return;
        }

        setDaftar(hasil);
      } catch (kesalahan) {
        if (!aktif || kontrol.signal.aborted) {
          return;
        }

        setError(
          kesalahan instanceof ApiArtikelError
            ? kesalahan.message
            : PESAN_GAGAL_MUAT,
        );
      } finally {
        if (aktif) {
          setSedangMemuat(false);
        }
      }
    })();

    return () => {
      aktif = false;
      kontrol.abort();
    };
  }, [percobaan]);

  if (sedangMemuat) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <p className="text-sm text-gray-700" role="status">
          Memuat daftar artikel…
        </p>
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((kunci) => (
            <li
              key={kunci}
              className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </ul>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setPercobaan((nilai) => nilai + 1)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return <IsiDaftar daftar={daftar} penghapus={penghapus} />;
}

/**
 * Jalur presentational: data sepenuhnya dari prop (tanpa fetch, tanpa effect
 * yang bergantung pada array hasil komputasi tiap render) — revisi QA VO-51
 * poin 1.
 */
function DaftarArtikelStatis({ daftarAwal }: { daftarAwal: ArtikelDaftar[] }) {
  const [daftar, setDaftar] = useState<ArtikelDaftar[]>(daftarAwal);
  const penghapus = usePenghapusArtikel(setDaftar);

  return <IsiDaftar daftar={daftar} penghapus={penghapus} />;
}

interface PropsDaftarArtikel {
  /**
   * Bila diberikan, komponen menjadi presentational dan tidak mem-fetch.
   * Berguna untuk pengujian dan pemakaian di dalam container lain.
   */
  artikel?: ArtikelDaftar[];
}

export default function DaftarArtikel({ artikel }: PropsDaftarArtikel = {}) {
  if (artikel !== undefined) {
    return <DaftarArtikelStatis daftarAwal={artikel} />;
  }

  return <DaftarArtikelDinamis />;
}
