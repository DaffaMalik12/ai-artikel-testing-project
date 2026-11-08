"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { pesanErrorDari, tambahArtikel } from "@/lib/api/artikel";
import {
  ISI_MAKS_KARAKTER,
  JUDUL_MAKS_KARAKTER,
  siapkanPayload,
  validasiArtikel,
  type ErrorFieldArtikel,
} from "@/lib/artikel-validasi";

const PESAN_SIMPAN_GAGAL = "Gagal menyimpan artikel. Silakan coba lagi.";

const KELAS_FIELD_DASAR =
  "mt-1 block w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-800";

const KELAS_FIELD_NORMAL =
  "border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-gray-700";

const KELAS_FIELD_ERROR =
  "border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-700";

const KELAS_TOMBOL_UTAMA =
  "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400";

const KELAS_TOMBOL_SEKUNDER =
  "inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

export default function ArtikelForm() {
  const router = useRouter();
  const refJudul = useRef<HTMLInputElement>(null);
  const refIsi = useRef<HTMLTextAreaElement>(null);

  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ErrorFieldArtikel>({});
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  function handleJudulChange(event: ChangeEvent<HTMLInputElement>) {
    setJudul(event.target.value);
    setFieldErrors((sebelumnya) => ({ ...sebelumnya, judul: undefined }));
  }

  function handleIsiChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setIsi(event.target.value);
    setFieldErrors((sebelumnya) => ({ ...sebelumnya, isi: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sedangMenyimpan) {
      return;
    }

    setPesanError(null);

    const errors = validasiArtikel(judul, isi);
    setFieldErrors(errors);

    if (errors.judul !== undefined) {
      refJudul.current?.focus();
      return;
    }

    if (errors.isi !== undefined) {
      refIsi.current?.focus();
      return;
    }

    setSedangMenyimpan(true);

    try {
      // `siapkanPayload` memangkas judul saja; isi artikel dikirim apa adanya.
      await tambahArtikel(siapkanPayload(judul, isi));

      // `replace` agar tombol back tidak kembali ke formulir yang sudah terkirim.
      router.replace("/artikel");
      router.refresh();
    } catch (error) {
      setSedangMenyimpan(false);

      const pesan = pesanErrorDari(error, PESAN_SIMPAN_GAGAL);

      // Pesan 400 dari server menyebut "judul" atau "isi"; arahkan ke field terkait.
      if (/judul/i.test(pesan)) {
        setFieldErrors((sebelumnya) => ({ ...sebelumnya, judul: pesan }));
        refJudul.current?.focus();
        return;
      }

      if (/\bisi\b/i.test(pesan)) {
        setFieldErrors((sebelumnya) => ({ ...sebelumnya, isi: pesan }));
        refIsi.current?.focus();
        return;
      }

      setPesanError(pesan);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={sedangMenyimpan} className="space-y-6">
      {pesanError !== null && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {pesanError}
        </p>
      )}

      <div>
        <label htmlFor="judul" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Judul Artikel
        </label>
        <input
          id="judul"
          name="judul"
          ref={refJudul}
          type="text"
          value={judul}
          onChange={handleJudulChange}
          maxLength={JUDUL_MAKS_KARAKTER}
          required
          disabled={sedangMenyimpan}
          aria-invalid={fieldErrors.judul !== undefined}
          aria-describedby={fieldErrors.judul !== undefined ? "judul-error" : "judul-hint"}
          placeholder="Contoh: Cara Menulis Artikel yang Baik"
          className={`${KELAS_FIELD_DASAR} ${
            fieldErrors.judul !== undefined ? KELAS_FIELD_ERROR : KELAS_FIELD_NORMAL
          }`}
        />
        {fieldErrors.judul !== undefined ? (
          <p id="judul-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {fieldErrors.judul}
          </p>
        ) : (
          <p id="judul-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {judul.length}/{JUDUL_MAKS_KARAKTER} karakter.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="isi" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Isi Artikel
        </label>
        <textarea
          id="isi"
          name="isi"
          ref={refIsi}
          value={isi}
          onChange={handleIsiChange}
          rows={12}
          maxLength={ISI_MAKS_KARAKTER}
          required
          disabled={sedangMenyimpan}
          aria-invalid={fieldErrors.isi !== undefined}
          aria-describedby={fieldErrors.isi !== undefined ? "isi-error" : "isi-hint"}
          placeholder="Tulis isi artikel di sini..."
          className={`${KELAS_FIELD_DASAR} resize-y ${
            fieldErrors.isi !== undefined ? KELAS_FIELD_ERROR : KELAS_FIELD_NORMAL
          }`}
        />
        {fieldErrors.isi !== undefined ? (
          <p id="isi-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {fieldErrors.isi}
          </p>
        ) : (
          <p id="isi-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isi.length}/{ISI_MAKS_KARAKTER} karakter. Spasi saja tidak dihitung sebagai isi.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/artikel" className={KELAS_TOMBOL_SEKUNDER}>
          Batal
        </Link>
        <button type="submit" disabled={sedangMenyimpan} className={KELAS_TOMBOL_UTAMA}>
          {sedangMenyimpan ? "Menyimpan..." : "Simpan Artikel"}
        </button>
      </div>
    </form>
  );
}
