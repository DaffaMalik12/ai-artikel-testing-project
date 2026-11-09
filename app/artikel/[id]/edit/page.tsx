'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Artikel = {
  id: string;
  judul: string;
  isi: string;
};

export default function EditArtikelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [muatError, setMuatError] = useState<string | null>(null);
  const [simpanError, setSimpanError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let aktif = true;

    async function muatArtikel() {
      try {
        setLoading(true);
        setMuatError(null);

        const res = await fetch(`/api/artikel/${id}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Artikel tidak ditemukan.'
              : 'Gagal memuat data artikel.',
          );
        }

        const data: Artikel = await res.json();
        if (!aktif) return;

        setJudul(data.judul);
        setIsi(data.isi);
      } catch (err) {
        if (!aktif) return;
        setMuatError(
          err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat.',
        );
      } finally {
        if (aktif) setLoading(false);
      }
    }

    muatArtikel();

    return () => {
      aktif = false;
    };
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setSimpanError(null);

      const res = await fetch(`/api/artikel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judul, isi }),
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan perubahan artikel.');
      }

      router.push('/artikel');
      router.refresh();
    } catch (err) {
      setSimpanError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan.',
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <p className="text-sm text-gray-500" role="status">
          Memuat artikel…
        </p>
      </main>
    );
  }

  if (muatError) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {muatError}
        </p>
        <Link
          href="/artikel"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Kembali ke daftar artikel
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Edit Artikel</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {simpanError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {simpanError}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="judul" className="block text-sm font-medium text-gray-700">
            Judul
          </label>
          <input
            id="judul"
            name="judul"
            type="text"
            value={judul}
            onChange={(event) => setJudul(event.target.value)}
            required
            disabled={saving}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="isi" className="block text-sm font-medium text-gray-700">
            Isi Artikel
          </label>
          <textarea
            id="isi"
            name="isi"
            rows={12}
            value={isi}
            onChange={(event) => setIsi(event.target.value)}
            required
            disabled={saving}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/artikel"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </main>
  );
}
