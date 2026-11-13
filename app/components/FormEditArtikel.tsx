"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import UnggahGambarArtikel from "@/app/components/UnggahGambarArtikel";
import type { Artikel } from "@/app/types/artikel";
import { ApiArtikelError, perbaruiArtikel } from "@/lib/api/artikel";
import {
  adaGalatFormArtikel,
  validasiFormArtikel,
  type GalatFormArtikel,
} from "@/lib/validasi-form-artikel";

interface PropsFormEditArtikel {
  artikel: Artikel;
  /** Pesan awal (mis. notifikasi gagal unggah dari form tambah). */
  pesanAwal?: string | null;
}

export default function FormEditArtikel({
  artikel,
  pesanAwal = null,
}: PropsFormEditArtikel) {
  const router = useRouter();

  const [judul, setJudul] = useState(artikel.judul);
  const [isi, setIsi] = useState(artikel.isi);
  const [galat, setGalat] = useState<GalatFormArtikel>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(pesanAwal);
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  const sedangProsesRef = useRef(false);

  async function tanganiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sedangProsesRef.current) {
      return;
    }

    const galatValidasi = validasiFormArtikel(judul, isi);

    if (adaGalatFormArtikel(galatValidasi)) {
      setGalat(galatValidasi);
      setGalatUmum(null);
      return;
    }

    sedangProsesRef.current = true;
    setSedangMenyimpan(true);
    setGalat({});
    setGalatUmum(null);

    try {
      await perbaruiArtikel(artikel.id, {
        judul: judul.trim(),
        isi: isi.trim(),
      });

      router.replace("/artikel");
      router.refresh();
    } catch (kesalahan) {
      if (kesalahan instanceof ApiArtikelError) {
        if (kesalahan.field === "judul" || kesalahan.field === "isi") {
          setGalat({ [kesalahan.field]: kesalahan.message });
        } else {
          setGalatUmum(kesalahan.message);
        }
      } else {
        setGalatUmum(
          "Terjadi kesalahan tak terduga. Coba lagi beberapa saat lagi.",
        );
      }
    } finally {
      sedangProsesRef.current = false;
      setSedangMenyimpan(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={tanganiSubmit} noValidate className="flex flex-col gap-5">
        {galatUmum !== null && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {galatUmum}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="judul" className="text-sm font-medium text-gray-800">
            Judul artikel
          </label>
          <input
            id="judul"
            name="judul"
            type="text"
            value={judul}
            onChange={(event) => setJudul(event.target.value)}
            disabled={sedangMenyimpan}
            aria-invalid={galat.judul !== undefined}
            aria-describedby={
              galat.judul !== undefined ? "galat-judul" : undefined
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:bg-gray-100"
          />
          {galat.judul !== undefined && (
            <p id="galat-judul" className="text-sm text-red-700">
              {galat.judul}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="isi" className="text-sm font-medium text-gray-800">
            Isi artikel
          </label>
          <textarea
            id="isi"
            name="isi"
            rows={10}
            value={isi}
            onChange={(event) => setIsi(event.target.value)}
            disabled={sedangMenyimpan}
            aria-invalid={galat.isi !== undefined}
            aria-describedby={galat.isi !== undefined ? "galat-isi" : undefined}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:bg-gray-100"
          />
          {galat.isi !== undefined && (
            <p id="galat-isi" className="text-sm text-red-700">
              {galat.isi}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sedangMenyimpan}
            aria-busy={sedangMenyimpan}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sedangMenyimpan ? "Menyimpan…" : "Simpan perubahan"}
          </button>

          <Link
            href="/artikel"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Batal
          </Link>
        </div>
      </form>

      <UnggahGambarArtikel
        idArtikel={artikel.id}
        gambarUrlAwal={artikel.gambarUrl}
        nonaktif={sedangMenyimpan}
      />
    </div>
  );
}
