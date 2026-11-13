// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UnggahGambarArtikel from "./UnggahGambarArtikel";
import { UKURAN_GAMBAR_MAKS_BYTE } from "@/lib/konstanta-gambar";

const createObjectURLMock = vi.fn();
const revokeObjectURLMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  responses.forEach((respons) => fetchMock.mockResolvedValueOnce(respons));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function buatBerkas(
  nama = "gambar.png",
  tipe = "image/png",
  ukuran = 4,
): File {
  return new File([new Uint8Array(ukuran)], nama, { type: tipe });
}

function pilihBerkas(berkas: File) {
  fireEvent.change(screen.getByLabelText(/pilih gambar/i), {
    target: { files: [berkas] },
  });
}

beforeEach(() => {
  createObjectURLMock.mockReset();
  revokeObjectURLMock.mockReset();
  createObjectURLMock.mockReturnValue("blob:pratinjau");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURLMock,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UnggahGambarArtikel", () => {
  it("menampilkan fallback saat artikel belum punya gambar", () => {
    render(<UnggahGambarArtikel idArtikel="1" gambarUrlAwal={null} />);

    expect(screen.getByText(/belum ada gambar/i)).toBeTruthy();
  });

  it("memperlakukan gambarUrl kosong/whitespace sebagai belum ada gambar", () => {
    render(<UnggahGambarArtikel idArtikel="1" gambarUrlAwal="   " />);

    expect(screen.getByText(/belum ada gambar/i)).toBeTruthy();
  });

  it("menolak berkas non-gambar tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<UnggahGambarArtikel idArtikel="1" />);
    pilihBerkas(new File(["halo"], "catatan.txt", { type: "text/plain" }));

    expect(
      screen.getByText(/format gambar harus jpeg, png, atau webp/i),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak berkas gambar lebih dari 2 MB tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<UnggahGambarArtikel idArtikel="1" />);
    pilihBerkas(buatBerkas("besar.png", "image/png", UKURAN_GAMBAR_MAKS_BYTE + 1));

    expect(screen.getByText(/ukuran gambar maksimal 2 mb/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menampilkan pratinjau berkas terpilih dan merevoke object URL saat ganti berkas", () => {
    render(<UnggahGambarArtikel idArtikel="1" />);

    createObjectURLMock.mockReturnValueOnce("blob:1");
    createObjectURLMock.mockReturnValueOnce("blob:2");

    pilihBerkas(buatBerkas("a.png"));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText(/pratinjau/i)).toBeTruthy();

    pilihBerkas(buatBerkas("b.png"));
    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:1");
  });

  it("mengunggah berkas lalu menampilkan gambar hasil", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ gambarUrl: "/uploads/artikel/a.png" }),
    );

    render(<UnggahGambarArtikel idArtikel="1" />);
    pilihBerkas(buatBerkas());
    fireEvent.click(screen.getByRole("button", { name: /unggah gambar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/artikel/1/gambar");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");

    await waitFor(() =>
      expect(screen.queryByText(/belum ada gambar/i)).toBeNull(),
    );
  });

  it("menampilkan pesan error saat unggah gagal", async () => {
    stubFetch(jsonResponse({ message: "Ukuran gambar maksimal 2 MB." }, 400));

    render(<UnggahGambarArtikel idArtikel="1" />);
    pilihBerkas(buatBerkas());
    fireEvent.click(screen.getByRole("button", { name: /unggah gambar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Ukuran gambar maksimal 2 MB.");
  });

  it("menghapus gambar dan kembali ke empty state", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    render(
      <UnggahGambarArtikel
        idArtikel="1"
        gambarUrlAwal="/uploads/artikel/a.png"
      />,
    );

    expect(screen.getByAltText(/gambar artikel saat ini/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /hapus gambar/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/artikel/1/gambar");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("DELETE");

    await waitFor(() =>
      expect(screen.getByText(/belum ada gambar/i)).toBeTruthy(),
    );
    expect(
      screen.queryByRole("button", { name: /hapus gambar/i }),
    ).toBeNull();
  });

  it("menampilkan pesan error saat hapus gagal dan tetap menampilkan gambar", async () => {
    stubFetch(jsonResponse({ message: "Anda harus login." }, 401));

    render(
      <UnggahGambarArtikel
        idArtikel="1"
        gambarUrlAwal="/uploads/artikel/a.png"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /hapus gambar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Anda harus login.");
    expect(screen.getByAltText(/gambar artikel saat ini/i)).toBeTruthy();
  });

  it("mencegah unggah ganda saat tombol diklik dua kali", async () => {
    let selesaikan: ((nilai: Response) => void) | undefined;

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          selesaikan = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<UnggahGambarArtikel idArtikel="1" />);
    pilihBerkas(buatBerkas());

    const tombol = screen.getByRole("button", { name: /unggah gambar/i });
    fireEvent.click(tombol);
    fireEvent.click(tombol);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    selesaikan?.(jsonResponse({ gambarUrl: "/uploads/artikel/a.png" }));

    await waitFor(() =>
      expect(screen.queryByText(/belum ada gambar/i)).toBeNull(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("menyembunyikan tombol unggah & hapus saat artikel belum tersimpan (mode tambah)", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const onBerkasDipilih = vi.fn();

    render(
      <UnggahGambarArtikel
        idArtikel={null}
        onBerkasDipilih={onBerkasDipilih}
      />,
    );

    // Tombol unggah & hapus tidak boleh dirender agar tidak menembak
    // /api/artikel/null/gambar.
    expect(
      screen.queryByRole("button", { name: /unggah gambar/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /hapus gambar/i }),
    ).toBeNull();
    expect(screen.getByText(/belum ada gambar/i)).toBeTruthy();
    expect(
      screen.getByText(/gambar akan diunggah otomatis setelah artikel tersimpan/i),
    ).toBeTruthy();

    // Pratinjau lokal tetap boleh dipilih sebelum artikel tersimpan.
    pilihBerkas(buatBerkas("a.png"));

    expect(onBerkasDipilih).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText(/pratinjau/i)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /unggah gambar/i }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
