"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ambilSesi } from "@/lib/api/sesi";

interface CekSesiLoginProps {
  children: ReactNode;
}

/**
 * Wrapper client untuk halaman login:
 * - Selama pengecekan GET /api/auth/me, tampilkan status loading singkat
 *   (mencegah kedipan form bagi pengguna yang sudah login).
 * - Bila sesi aktif (200), langsung redirect ke "/".
 * - Bila belum login atau pengecekan gagal, tampilkan form (fail-open).
 */
export default function CekSesiLogin({ children }: CekSesiLoginProps) {
  const router = useRouter();
  const [sedangMemeriksa, setSedangMemeriksa] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    ambilSesi(controller.signal)
      .then((pengguna) => {
        if (controller.signal.aborted) {
          return;
        }
        if (pengguna !== null) {
          // Sudah login: jangan tampilkan form lagi.
          router.replace("/");
        } else {
          setSedangMemeriksa(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // Gagal memeriksa (jaringan/500): tetap tampilkan form agar
          // pengguna tetap bisa mencoba login.
          setSedangMemeriksa(false);
        }
      });

    return () => controller.abort();
  }, [router]);

  if (sedangMemeriksa) {
    return (
      <p
        role="status"
        className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm"
      >
        Memeriksa sesi…
      </p>
    );
  }

  return <>{children}</>;
}
