"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ApiArtikelError,
  hapusGambarArtikel,
  unggahGambarArtikel,
} from "@/lib/api/artikel";
import { validasiBerkasGambarKlien } from "@/lib/konstanta-gambar";
import { teksAtauNull } from "@/lib/utils/teks";

export interface OpsiGambarArtikel {
  /** `null`/kosong berarti artikel belum tersimpan (mode form tambah). */
  idArtikel?: string | null;
  gambarUrlAwal?: string | null;
  /** Dipanggil setiap `url` berubah karena unggah/hapus/atur manual. */
  onBerubah?: (url: string | null) => void;
}

export interface HasilGambarArtikel {
  url: string | null;
  sedangMengunggah: boolean;
  sedangMenghapus: boolean;
  error: string | null;
  unggah: (berkas: File) => Promise<string | null>;
  hapus: () => Promise<boolean>;
  aturUrl: (url: string | null) => void;
  bersihkanError: () => void;
}

/**
 * State & aksi pengelolaan gambar satu artikel. Semua aksi dijaga `prosesRef`
 * agar klik ganda tidak mengirim request dua kali (anti double-submit).
 */
export function useGambarArtikel({
  idArtikel = null,
  gambarUrlAwal = null,
  onBerubah,
}: OpsiGambarArtikel = {}): HasilGambarArtikel {
  const [url, setUrl] = useState<string | null>(() =>
    teksAtauNull(gambarUrlAwal),
  );
  const [sedangMengunggah, setSedangMengunggah] = useState(false);
  const [sedangMenghapus, setSedangMenghapus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prosesRef = useRef<"unggah" | "hapus" | null>(null);
  const onBerubahRef = useRef(onBerubah);

  useEffect(() => {
    onBerubahRef.current = onBerubah;
  }, [onBerubah]);

  useEffect(() => {
    setUrl(teksAtauNull(gambarUrlAwal));
  }, [gambarUrlAwal]);

  const aturUrl = useCallback((nilaiBaru: string | null) => {
    const bersih = teksAtauNull(nilaiBaru);
    setUrl(bersih);
    onBerubahRef.current?.(bersih);
  }, []);

  const unggah = useCallback(
    async (berkas: File): Promise<string | null> => {
      if (prosesRef.current !== null) {
        return null;
      }

      const idBersih = (idArtikel ?? "").trim();

      if (idBersih === "") {
        setError("Simpan artikel terlebih dahulu sebelum mengunggah gambar.");
        return null;
      }

      const galatValidasi = validasiBerkasGambarKlien(berkas);

      if (galatValidasi !== null) {
        setError(galatValidasi);
        return null;
      }

      prosesRef.current = "unggah";
      setSedangMengunggah(true);
      setError(null);

      try {
        const urlBaru = await unggahGambarArtikel(idBersih, berkas);
        aturUrl(urlBaru);
        return urlBaru;
      } catch (kesalahan) {
        setError(
          kesalahan instanceof ApiArtikelError
            ? kesalahan.message
            : "Gagal mengunggah gambar. Coba lagi beberapa saat lagi.",
        );
        return null;
      } finally {
        prosesRef.current = null;
        setSedangMengunggah(false);
      }
    },
    [aturUrl, idArtikel],
  );

  const hapus = useCallback(async (): Promise<boolean> => {
    if (prosesRef.current !== null) {
      return false;
    }

    const idBersih = (idArtikel ?? "").trim();

    if (idBersih === "") {
      setError("Simpan artikel terlebih dahulu sebelum menghapus gambar.");
      return false;
    }

    prosesRef.current = "hapus";
    setSedangMenghapus(true);
    setError(null);

    try {
      await hapusGambarArtikel(idBersih);
      // `aturUrl` juga memanggil `onBerubah` supaya state induk konsisten.
      aturUrl(null);
      return true;
    } catch (kesalahan) {
      setError(
        kesalahan instanceof ApiArtikelError
          ? kesalahan.message
          : "Gagal menghapus gambar. Coba lagi beberapa saat lagi.",
      );
      return false;
    } finally {
      prosesRef.current = null;
      setSedangMenghapus(false);
    }
  }, [aturUrl, idArtikel]);

  const bersihkanError = useCallback(() => setError(null), []);

  return {
    url,
    sedangMengunggah,
    sedangMenghapus,
    error,
    unggah,
    hapus,
    aturUrl,
    bersihkanError,
  };
}
