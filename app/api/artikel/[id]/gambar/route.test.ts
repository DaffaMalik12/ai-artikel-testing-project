// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const simpanGambarArtikelMock = vi.fn();
const hapusGambarArtikelMock = vi.fn();
const ambilSesiRequestMock = vi.fn();

vi.mock("@/lib/services/artikel-service", () => ({
  URL_UPLOAD_ARTIKEL: "/uploads/artikel",
  simpanGambarArtikel: (...args: unknown[]) => simpanGambarArtikelMock(...args),
  hapusGambarArtikel: (...args: unknown[]) => hapusGambarArtikelMock(...args),
}));

vi.mock("@/lib/middlewares/autentikasi", async () => {
  const { NextResponse } = await import("next/server");

  return {
    ambilSesiRequest: (...args: unknown[]) => ambilSesiRequestMock(...args),
    responsBelumLogin: () =>
      NextResponse.json(
        { message: "Anda harus login untuk melakukan aksi ini." },
        { status: 401 },
      ),
  };
});

import { UKURAN_GAMBAR_MAKS_BYTE } from "@/lib/validasi-gambar";
import { DELETE, POST } from "./route";

const BYTES_JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const BYTES_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function buatBerkas(bytes: Uint8Array, nama: string, tipe: string): File {
  return new File([bytes], nama, { type: tipe });
}

function requestUpload(berkas: File | null): Request {
  const form = new FormData();

  if (berkas !== null) {
    form.append("gambar", berkas);
  }

  return new Request("http://localhost:3000/api/artikel/1/gambar", {
    method: "POST",
    body: form,
  });
}

function requestHapus(): Request {
  return new Request("http://localhost:3000/api/artikel/1/gambar", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ambilSesiRequestMock.mockResolvedValue({ penggunaId: 1, username: "admin" });
});

describe("POST /api/artikel/:id/gambar", () => {
  it("mengembalikan 401 bila belum login", async () => {
    ambilSesiRequestMock.mockResolvedValue(null);

    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(401);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 500 bila pemeriksaan sesi gagal", async () => {
    ambilSesiRequestMock.mockRejectedValue(new Error("DB down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(500);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("mengembalikan 400 bila id tidak valid", async () => {
    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("abc"),
    );

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila field gambar tidak dikirim", async () => {
    const response = await POST(requestUpload(null), context("1"));

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila file kosong", async () => {
    const response = await POST(
      requestUpload(buatBerkas(new Uint8Array(0), "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila file lebih dari 2 MB", async () => {
    const besar = new Uint8Array(UKURAN_GAMBAR_MAKS_BYTE + 1);
    besar.set(BYTES_JPEG, 0);

    const response = await POST(
      requestUpload(buatBerkas(besar, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila isi bukan gambar meski MIME diklaim gambar", async () => {
    const teks = new TextEncoder().encode("bukan gambar");

    const response = await POST(
      requestUpload(buatBerkas(teks, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila MIME tidak termasuk whitelist", async () => {
    const response = await POST(
      requestUpload(buatBerkas(BYTES_PNG, "a.gif", "image/gif")),
      context("1"),
    );

    expect(response.status).toBe(400);
    expect(simpanGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 bila artikel tidak ditemukan", async () => {
    simpanGambarArtikelMock.mockResolvedValue(null);

    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("99"),
    );

    expect(response.status).toBe(404);
  });

  it("mengembalikan 500 bila penyimpanan file gagal", async () => {
    simpanGambarArtikelMock.mockRejectedValue(new Error("disk penuh"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });

  it("mengembalikan 200 dan gambarUrl bila sukses", async () => {
    simpanGambarArtikelMock.mockResolvedValue({
      gambarUrl: "/uploads/artikel/abc.jpg",
    });

    const response = await POST(
      requestUpload(buatBerkas(BYTES_JPEG, "a.jpg", "image/jpeg")),
      context("1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      gambarUrl: "/uploads/artikel/abc.jpg",
    });
    expect(simpanGambarArtikelMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ ekstensi: ".jpg" }),
    );
  });
});

describe("DELETE /api/artikel/:id/gambar", () => {
  it("mengembalikan 401 bila belum login", async () => {
    ambilSesiRequestMock.mockResolvedValue(null);

    const response = await DELETE(requestHapus(), context("1"));

    expect(response.status).toBe(401);
    expect(hapusGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 400 bila id tidak valid", async () => {
    const response = await DELETE(requestHapus(), context("abc"));

    expect(response.status).toBe(400);
    expect(hapusGambarArtikelMock).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 bila artikel tidak ditemukan", async () => {
    hapusGambarArtikelMock.mockResolvedValue(null);

    const response = await DELETE(requestHapus(), context("99"));

    expect(response.status).toBe(404);
  });

  it("mengembalikan 500 bila penghapusan gagal", async () => {
    hapusGambarArtikelMock.mockRejectedValue(new Error("DB down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await DELETE(requestHapus(), context("1"));

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });

  it("mengembalikan 200 dengan gambarUrl null bila sukses", async () => {
    hapusGambarArtikelMock.mockResolvedValue({ gambarUrl: null });

    const response = await DELETE(requestHapus(), context("1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ gambarUrl: null });
  });
});
