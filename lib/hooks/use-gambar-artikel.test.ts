// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGambarArtikel } from "./use-gambar-artikel";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buatBerkas(nama = "a.png", tipe = "image/png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], nama, {
    type: tipe,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGambarArtikel", () => {
  it("menolak unggah tanpa id artikel dan memberi pesan", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useGambarArtikel({ idArtikel: null }),
    );

    await act(async () => {
      await result.current.unggah(buatBerkas());
    });

    expect(result.current.error).toMatch(/simpan artikel terlebih dahulu/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("memperlakukan gambarUrl awal kosong sebagai null", () => {
    const { result } = renderHook(() =>
      useGambarArtikel({ idArtikel: "1", gambarUrlAwal: "   " }),
    );

    expect(result.current.url).toBeNull();
  });

  it("mengunggah gambar dan memperbarui url", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(jsonResponse({ gambarUrl: "/uploads/x.png" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGambarArtikel({ idArtikel: "1" }));

    await act(async () => {
      await result.current.unggah(buatBerkas());
    });

    expect(result.current.url).toBe("/uploads/x.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menampilkan pesan error saat unggah gagal", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(jsonResponse({ message: "Gagal." }, 500));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGambarArtikel({ idArtikel: "1" }));

    await act(async () => {
      await result.current.unggah(buatBerkas());
    });

    expect(result.current.error).toBe("Gagal.");
  });

  it("menghapus gambar dan mengosongkan url", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useGambarArtikel({ idArtikel: "1", gambarUrlAwal: "/uploads/x.png" }),
    );

    await act(async () => {
      await result.current.hapus();
    });

    expect(result.current.url).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mencegah pemanggilan ganda saat masih mengunggah", () => {
    let selesaikan: ((nilai: Response) => void) | undefined;

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          selesaikan = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGambarArtikel({ idArtikel: "1" }));
    const berkas = buatBerkas();

    act(() => {
      void result.current.unggah(berkas);
      void result.current.unggah(berkas);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    selesaikan?.(jsonResponse({ gambarUrl: "/uploads/x.png" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
