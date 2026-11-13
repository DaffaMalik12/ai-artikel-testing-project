// @vitest-environment jsdom

import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
    push: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

import ArtikelForm from "./artikel-form";
import { ISI_MAKS_KARAKTER, JUDUL_MAKS_KARAKTER } from "@/lib/artikel-validasi";
import {
  KUNCI_GALAT_GAMBAR,
  UKURAN_GAMBAR_MAKS_BYTE,
} from "@/lib/konstanta-gambar";

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

function stubFetchGagal(error: unknown) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockRejectedValue(error);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function isiFormulir(judul: string, isi: string) {
  fireEvent.change(screen.getByLabelText(/judul artikel/i), {
    target: { value: judul },
  });
  fireEvent.change(screen.getByLabelText(/isi artikel/i), {
    target: { value: isi },
  });
}

function pilihBerkas(berkas: File) {
  fireEvent.change(screen.getByLabelText(/pilih gambar/i), {
    target: { files: [berkas] },
  });
}

function buatBerkasGambar(nama = "gambar.png", tipe = "image/png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], nama, {
    type: tipe,
  });
}

function tombolSimpan(): HTMLButtonElement {
  return screen.getByRole("button", { name: /simpan artikel/i });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ArtikelForm", () => {
  it("mengirim POST /api/artikel lalu mengalihkan ke halaman daftar artikel", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ id: 1, judul: "Judul Baru", isi: "Isi" }, 201),
    );

    render(<ArtikelForm />);
    isiFormulir("  Judul Baru  ", "Isi artikel\n\nparagraf dua");
    fireEvent.click(tombolSimpan());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, opsi] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/artikel");
    expect(opsi?.method).toBe("POST");
    expect(JSON.parse(String(opsi?.body))).toEqual({
      judul: "Judul Baru",
      isi: "Isi artikel\n\nparagraf dua",
    });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("mengunggah gambar setelah artikel berhasil dibuat", async () => {
    const fetchMock = stubFetch(
      jsonResponse({ id: 9, judul: "Judul", isi: "Isi" }, 201),
      jsonResponse({ gambarUrl: "/uploads/artikel/a.png" }),
    );

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    pilihBerkas(buatBerkasGambar());
    fireEvent.click(tombolSimpan());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [urlGambar, opsiGambar] = fetchMock.mock.calls[1];
    expect(urlGambar).toBe("/api/artikel/9/gambar");
    expect(opsiGambar?.method).toBe("POST");
    expect(opsiGambar?.body).toBeInstanceOf(FormData);
    expect((opsiGambar?.body as FormData).get("gambar")).toBeInstanceOf(File);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
  });

  it("menampilkan notifikasi dan mengarahkan ke halaman edit saat unggah gambar gagal", async () => {
    stubFetch(
      jsonResponse({ id: 9, judul: "Judul", isi: "Isi" }, 201),
      jsonResponse({ message: "Gagal menyimpan gambar." }, 500),
    );

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    pilihBerkas(buatBerkasGambar());
    fireEvent.click(tombolSimpan());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/gambar gagal/i);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        `/artikel/9/edit?${KUNCI_GALAT_GAMBAR}=1`,
      ),
    );
  });

  it("menampilkan pesan jelas saat server tidak mengembalikan id artikel", async () => {
    stubFetch(new Response(null, { status: 201 }));

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    pilihBerkas(buatBerkasGambar());
    fireEvent.click(tombolSimpan());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/tidak mengembalikan ID artikel/i);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("menolak judul dan isi yang kosong tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    fireEvent.click(tombolSimpan());

    expect(screen.getByText(/judul artikel wajib diisi/i)).toBeTruthy();
    expect(screen.getByText(/isi artikel wajib diisi/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("menolak judul dan isi yang hanya berisi spasi", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    isiFormulir("   ", "  \n\t  ");
    fireEvent.click(tombolSimpan());

    expect(screen.getByText(/judul artikel wajib diisi/i)).toBeTruthy();
    expect(screen.getByText(/isi artikel wajib diisi/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menerima panjang tepat pada batas maksimum", async () => {
    stubFetch(jsonResponse({ id: 1, judul: "J", isi: "I" }, 201));

    render(<ArtikelForm />);
    isiFormulir(
      "J".repeat(JUDUL_MAKS_KARAKTER),
      "I".repeat(ISI_MAKS_KARAKTER),
    );
    fireEvent.click(tombolSimpan());

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
  });

  it("menolak panjang yang melebihi batas tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    isiFormulir(
      "J".repeat(JUDUL_MAKS_KARAKTER + 1),
      "I".repeat(ISI_MAKS_KARAKTER + 1),
    );
    fireEvent.click(tombolSimpan());

    expect(
      screen.getByText(
        new RegExp(`judul artikel maksimal ${JUDUL_MAKS_KARAKTER}`, "i"),
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        new RegExp(`isi artikel maksimal ${ISI_MAKS_KARAKTER}`, "i"),
      ),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak berkas non-gambar tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    pilihBerkas(new File(["halo"], "catatan.txt", { type: "text/plain" }));

    expect(
      screen.getByText(/format gambar harus jpeg, png, atau webp/i),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menolak berkas gambar lebih dari 2 MB tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    pilihBerkas(
      new File([new Uint8Array(UKURAN_GAMBAR_MAKS_BYTE + 1)], "besar.png", {
        type: "image/png",
      }),
    );

    expect(screen.getByText(/ukuran gambar maksimal 2 mb/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menampilkan pesan error dan tidak mengalihkan halaman saat API gagal", async () => {
    stubFetch(jsonResponse({ message: "Gagal menyimpan artikel." }, 500));

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    fireEvent.click(tombolSimpan());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Gagal menyimpan artikel.");
    expect(replaceMock).not.toHaveBeenCalled();
    expect(tombolSimpan().disabled).toBe(false);
  });

  it("memetakan pesan validasi 400 dari server ke field terkait", async () => {
    stubFetch(
      jsonResponse({ message: "Judul artikel maksimal 200 karakter." }, 400),
    );

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    fireEvent.click(tombolSimpan());

    expect(
      await screen.findByText("Judul artikel maksimal 200 karakter."),
    ).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("menampilkan pesan koneksi saat fetch gagal total", async () => {
    stubFetchGagal(new TypeError("Failed to fetch"));

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    fireEvent.click(tombolSimpan());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/tidak dapat terhubung/i);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("mencegah pengiriman ganda saat tombol diklik dua kali", async () => {
    let selesaikan: ((nilai: Response) => void) | undefined;

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          selesaikan = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");

    const tombol = tombolSimpan();
    fireEvent.click(tombol);
    fireEvent.click(tombol);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    selesaikan?.(jsonResponse({ id: 1, judul: "Judul", isi: "Isi" }, 201));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
