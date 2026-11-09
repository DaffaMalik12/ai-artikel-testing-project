"use client";

import { useCallback, useRef, useState } from "react";
import { LoginError, login, type LoginSuccess } from "@/lib/api/auth";

const PESAN_GAGAL_UMUM = "Gagal memproses login. Coba lagi nanti.";

export interface UseLoginResult {
  data: LoginSuccess | null;
  error: string | null;
  isLoading: boolean;
  /**
   * Mengirim request login. Mengembalikan `true` bila sukses,
   * `false` bila gagal atau sedang ada request berjalan (double-submit).
   */
  mutate: (username: string, password: string) => Promise<boolean>;
}

export function useLogin(): UseLoginResult {
  const [data, setData] = useState<LoginSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Guard sinkron: state update React tidak instan, ref mencegah
  // double-submit secara andal selama request masih berjalan.
  const berjalanRef = useRef(false);

  const mutate = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      if (berjalanRef.current) {
        return false;
      }
      berjalanRef.current = true;
      setData(null);
      setError(null);
      setIsLoading(true);
      try {
        const hasil = await login(username, password);
        setData(hasil);
        return true;
      } catch (err) {
        setError(err instanceof LoginError ? err.message : PESAN_GAGAL_UMUM);
        return false;
      } finally {
        berjalanRef.current = false;
        setIsLoading(false);
      }
    },
    [],
  );

  return { data, error, isLoading, mutate };
}
