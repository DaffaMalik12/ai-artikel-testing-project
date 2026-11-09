"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ambilSesi, logout, type Pengguna } from "@/lib/api/sesi";

const PESAN_GAGAL_KELUAR = "Gagal keluar. Coba lagi nanti.";
const PESAN_GAGAL_SESI = "Gagal memeriksa sesi.";

export interface UseSesiResult {
  /** true selama pengecekan GET /api/auth/me pertama berjalan. */
  sedangMemuat: boolean;
  pengguna: Pengguna | null;
  /**
   * Pesan error bila pengecekan sesi gagal (jaringan/500). Beda dengan
   * "belum login": saat ini terisi, status login tidak diketahui dan
   * pengguna bisa memicu `muatUlang` untuk mencoba lagi.
   */
  errorMemuat: string | null;
  /** true selama POST /api/auth/logout berjalan. */
  sedangKeluar: boolean;
  errorKeluar: string | null;
  /** Meminta sesi diperiksa ulang (mis. setelah gagal jaringan). */
  muatUlang: () => void;
  /** Mengakhiri sesi. Mengembalikan true bila sukses. */
  keluar: () => Promise<boolean>;
}

export function useSesi(): UseSesiResult {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMemuat, setErrorMemuat] = useState<string | null>(null);
  const [sedangKeluar, setSedangKeluar] = useState(false);
  const [errorKeluar, setErrorKeluar] = useState<string | null>(null);
  const [kunciMuatUlang, setKunciMuatUlang] = useState(0);
  // Guard sinkron: mencegah klik "Keluar" ganda selama request berjalan.
  const berjalanRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setSedangMemuat(true);
    setErrorMemuat(null);

    ambilSesi(controller.signal)
      .then((hasil) => {
        if (!controller.signal.aborted) {
          setPengguna(hasil);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // Jangan menyamakan kegagalan dengan "belum login": tandai
          // error agar UI bisa menawarkan coba lagi.
          setErrorMemuat(PESAN_GAGAL_SESI);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSedangMemuat(false);
        }
      });

    return () => controller.abort();
  }, [kunciMuatUlang]);

  const muatUlang = useCallback(() => {
    setKunciMuatUlang((kunci) => kunci + 1);
  }, []);

  const keluar = useCallback(async (): Promise<boolean> => {
    if (berjalanRef.current) {
      return false;
    }
    berjalanRef.current = true;
    setSedangKeluar(true);
    setErrorKeluar(null);
    try {
      await logout();
      setPengguna(null);
      return true;
    } catch {
      setErrorKeluar(PESAN_GAGAL_KELUAR);
      return false;
    } finally {
      berjalanRef.current = false;
      setSedangKeluar(false);
    }
  }, []);

  return {
    sedangMemuat,
    pengguna,
    errorMemuat,
    sedangKeluar,
    errorKeluar,
    muatUlang,
    keluar,
  };
}
