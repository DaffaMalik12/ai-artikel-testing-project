"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";

import { useGambarArtikel } from "@/lib/hooks/use-gambar-artikel";
import {
  ACCEPT_GAMBAR,
  LABEL_FORMAT_GAMBAR,
  LABEL_UKURAN_GAMBAR_MAKS,
  validasiBerkasGambarKlien,
} from "@/lib/konstanta-gambar";
import { teksAtauNull } from "@/lib/utils/teks";

interface PropsUnggahGambarArtikel {
  /** `null` berarti artikel belum tersimpan (mode form tambah). */
  idArtikel?: string | null;
  gambarUrlAwal?: string | null;
  nonaktif?: boolean;
  onBerkasDipilih?: (berkas: File | null) => void;
  onGambarBerubah?: (url: string | null) => void;
}

export default function UnggahGambarArtikel({
  idArtikel = null,
  gambarUrlAwal = null,
  nonaktif = false,
  onBerkasDipilih,
  onGambarBerubah,
}: PropsUnggahGambarArtikel) {
  const idInput = useId();
  const idJudul = useId();
  const idPesan = useId();
  const idStatus = useId();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjauLokal, setPratinjauLokal] = useState<string | null>(null);
  const [errorLokal, setErrorLokal] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const { url, sedangMengunggah, sedangMenghapus, error, unggah, hapus } =
    useGambarArtikel({
      idArtikel,
      gambarUrlAwal,
      onBerubah: onGambarBerubah,
    });

  const sedangSibuk = sedangMengunggah || sedangMenghapus;
  const terkunci = nonaktif || sedangSibuk;
  const pesanGalat = errorLokal ?? error;
  const artikelTersimpan = (idArtikel ?? "").trim() !== "";

  // Preview lokal memakai object URL yang wajib di-revoke saat berkas berubah.
  useEffect(() => {
    if (berkas === null || typeof URL.createObjectURL !== "function") {
      setPratinjauLokal(null);
      return;
    }

    const objectUrl = URL.createObjectURL(berkas);
    setPratinjauLokal(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [berkas]);

  // Fallback gambar hanya bila URL benar-benar kosong/whitespace.
  const gambarTampil = pratinjauLokal ?? teksAtauNull(url);

  function resetPilihan() {
    setBerkas(null);
    setErrorLokal(null);

    if (inputRef.current !== null) {
      inputRef.current.value = "";
    }
  }

  function tanganiPilihBerkas(event: ChangeEvent<HTMLInputElement>) {
    const berkasBaru = event.target.files?.[0] ?? null;

    setPesanSukses(null);

    if (berkasBaru === null) {
      resetPilihan();
      onBerkasDipilih?.(null);
      return;
    }

    const galat = validasiBerkasGambarKlien(berkasBaru);

    if (galat !== null) {
      resetPilihan();
      setErrorLokal(galat);
      onBerkasDipilih?.(null);
      return;
    }

    setErrorLokal(null);
    setBerkas(berkasBaru);
    onBerkasDipilih?.(berkasBaru);
  }

  async function tanganiUnggah() {
    if (berkas === null || sedangSibuk) {
      return;
    }

    setPesanSukses(null);
    const hasil = await unggah(berkas);

    if (hasil !== null) {
      resetPilihan();
      setPesanSukses("Gambar artikel berhasil diunggah.");
      onBerkasDipilih?.(null);
    }
  }

  async function tanganiHapus() {
    if (sedangSibuk) {
      return;
    }

    setPesanSukses(null);
    const berhasil = await hapus();

    if (berhasil) {
      resetPilihan();
      setPesanSukses("Gambar artikel dihapus.");
    }
  }

  return (
    <section
      aria-labelledby={idJudul}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h3 id={idJudul} className="text-sm font-semibold text-gray-900">
        Gambar artikel
      </h3>

      <div className="flex flex-col gap-1">
        <label htmlFor={idInput} className="text-sm font-medium text-gray-800">
          Pilih gambar ({LABEL_FORMAT_GAMBAR}, maksimal{" "}
          {LABEL_UKURAN_GAMBAR_MAKS})
        </label>
        <input
          ref={inputRef}
          id={idInput}
          name="gambar"
          type="file"
          accept={ACCEPT_GAMBAR}
          onChange={tanganiPilihBerkas}
          disabled={terkunci}
          aria-describedby={pesanGalat !== null ? idPesan : undefined}
          aria-invalid={pesanGalat !== null}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50">
        {gambarTampil !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gambarTampil}
            alt={
              pratinjauLokal !== null
                ? "Pratinjau gambar artikel yang akan diunggah"
                : "Gambar artikel saat ini"
            }
            className="max-h-64 w-full object-contain"
          />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-gray-600">
            Belum ada gambar untuk artikel ini.
          </p>
        )}
      </div>

      {sedangSibuk && (
        <p role="status" className="text-sm text-gray-700">
          {sedangMengunggah ? "Mengunggah gambar…" : "Menghapus gambar…"}
        </p>
      )}

      {pesanGalat !== null && (
        <p id={idPesan} role="alert" className="text-sm text-red-700">
          {pesanGalat}
        </p>
      )}

      {pesanSukses !== null && (
        <p id={idStatus} role="status" className="text-sm text-green-700">
          {pesanSukses}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {artikelTersimpan && (
          <button
            type="button"
            onClick={tanganiUnggah}
            disabled={berkas === null || terkunci}
            aria-busy={sedangMengunggah}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sedangMengunggah ? "Mengunggah…" : "Unggah gambar"}
          </button>
        )}

        {berkas !== null && (
          <button
            type="button"
            onClick={() => {
              resetPilihan();
              onBerkasDipilih?.(null);
              setPesanSukses(null);
            }}
            disabled={terkunci}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batalkan pilihan
          </button>
        )}

        {artikelTersimpan && gambarTampil !== null && (
          <button
            type="button"
            onClick={tanganiHapus}
            disabled={terkunci}
            aria-busy={sedangMenghapus}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sedangMenghapus ? "Menghapus…" : "Hapus gambar"}
          </button>
        )}
      </div>

      {!artikelTersimpan && (
        <p className="text-xs text-gray-600">
          Gambar akan diunggah otomatis setelah artikel tersimpan.
        </p>
      )}
    </section>
  );
}
