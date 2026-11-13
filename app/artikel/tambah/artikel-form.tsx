"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import UnggahGambarArtikel from "@/app/components/UnggahGambarArtikel";
import {
  ApiArtikelError,
  tambahArtikel,
  unggahGambarArtikel,
} from "@/lib/api/artikel";
import { KUNCI_GALAT_GAMBAR } from "@/lib/konstanta-gambar";
import {
  adaGalatFormArtikel,
  validasiFormArtikel,
  type GalatFormArtikel,
} from "@/lib/validasi-form-artikel";

type TahapSimpan = "idle" | "menyimpan" | "mengunggah";

const PESAN_ID_TIDAK_DIKENAL =
  "Artikel sudah tersimpan, tetapi server tidak mengembalikan ID artikel sehingga gambar belum terunggah. Form dikunci agar tidak terbuat artikel duplikat — buka daftar artikel lalu gunakan menu Edit untuk menambahkan gambar.";

export default function ArtikelForm() {
  const router = useRouter();

  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [galat, setGalat] = useState<GalatFormArtikel>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [tahap, setTahap] = useState<TahapSimpan>("idle");
  const [berkasGambar, setBerkasGambar] = useState<File | null>(null);

  // Dipakai saat server 201 tanpa `id`: artikel sudah tercipta tetapi kita
  // tidak punya handle untuk unggah gambar. Form dikunci permanen supaya
  // pengguna tidak menekan submit lagi dan membuat artikel duplikat.
  const [terkunciPermanen, setTerkunciPermanen] = useState(false);

  const sedangProsesRef = useRef(false);
  const sedangMenyimpan = tahap !== "idle";
  const formNonaktif = sedangMenyimpan || terkunciPermanen;

  const labelTombol =
    tahap === "mengunggah"
      ? "Mengunggah gambar…"
      : tahap === "menyimpan"
        ? "Menyimpan…"
        : "Simpan artikel";

  async function tanganiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sedangProsesRef.current || terkunciPermanen) {
      return;
    }

    const galatValidasi = validasiFormArtikel(judul, isi);

    if (adaGalatFormArtikel(galatValidasi)) {
      setGalat(galatValidasi);
      setGalatUmum(null);
      return;
    }

    sedangProsesRef.current = true;
    setTahap("menyimpan");
    setGalat({});
    setGalatUmum(null);

    try {
      const artikel = await tambahArtikel({
        judul: judul.trim(),
        isi: isi.trim(),
      });

      if (berkasGambar !== null && artikel.id === "") {
        // Kontrak server dilanggar (201 tanpa body): gambar tidak bisa
        // diunggah karena `id` tidak diketahui. Beri arahan jelas dan kunci
        // form agar tidak terjadi artikel duplikat.
        setGalatUmum(PESAN_ID_TIDAK_DIKENAL);
        setBerkasGambar(null);
        setTerkunciPermanen(true);
        return;
      }

      if (berkasGambar !== null) {
        // Artikel harus tersimpan lebih dulu agar punya `id` untuk endpoint gambar.
        setTahap("mengunggah");

        try {
          await unggahGambarArtikel(artikel.id, berkasGambar);
        } catch (kesalahanGambar) {
          // Artikel sudah tersimpan. Tampilkan notifikasi kegagalan (AC 3) DAN
          // arahkan ke halaman edit dengan penanda agar pengguna bisa
          // mengunggah ulang gambar tanpa membuat artikel duplikat.
          const pesanGambar =
            kesalahanGambar instanceof ApiArtikelError
              ? kesalahanGambar.message
              : "Gambar gagal diunggah.";

          setGalatUmum(
            `${pesanGambar} Artikel sudah tersimpan — silakan unggah ulang gambar dari halaman edit.`,
          );

          router.replace(
            `/artikel/${encodeURIComponent(artikel.id)}/edit?${KUNCI_GALAT_GAMBAR}=1`,
          );
          router.refresh();
          return;
        }
      }

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
      setTahap("idle");
    }
  }

  return (
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
          disabled={formNonaktif}
          aria-invalid={galat.judul !== undefined}
          aria-describedby={galat.judul !== undefined ? "galat-judul" : undefined}
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
          disabled={formNonaktif}
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

      <UnggahGambarArtikel
        idArtikel={null}
        onBerkasDipilih={setBerkasGambar}
        nonaktif={formNonaktif}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={formNonaktif}
          aria-busy={sedangMenyimpan}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {labelTombol}
        </button>

        <Link
          href="/artikel"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
