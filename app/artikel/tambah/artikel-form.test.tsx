// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>();
  fetchMock.mockResolvedValue(response);
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
  fireEvent.change(screen.getByLabelText(/judul artikel/i), { target: { value: judul } });
  fireEvent.change(screen.getByLabelText(/isi artikel/i), { target: { value: isi } });
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
    // `fetch` yang dimock (bukan `tambahArtikel`), sehingga rantai
    // form -> lib/api/artikel -> POST /api/artikel benar-benar diuji.
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ id: 1, judul: "Judul Baru", isi: "Isi" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
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
    stubFetch(new Response(null, { status: 201 }));

    render(<ArtikelForm />);
    isiFormulir("J".repeat(JUDUL_MAKS_KARAKTER), "I".repeat(ISI_MAKS_KARAKTER));
    fireEvent.click(tombolSimpan());

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
  });

  it("menolak panjang yang melebihi batas tanpa memanggil API", () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    render(<ArtikelForm />);
    isiFormulir("J".repeat(JUDUL_MAKS_KARAKTER + 1), "I".repeat(ISI_MAKS_KARAKTER + 1));
    fireEvent.click(tombolSimpan());

    expect(
      screen.getByText(new RegExp(`judul artikel maksimal ${JUDUL_MAKS_KARAKTER}`, "i")),
    ).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`isi artikel maksimal ${ISI_MAKS_KARAKTER}`, "i")),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("menampilkan pesan error dan tidak mengalihkan halaman saat API gagal", async () => {
    stubFetch(
      new Response(JSON.stringify({ message: "Gagal menyimpan artikel." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

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
      new Response(JSON.stringify({ message: "Judul artikel maksimal 200 karakter." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ArtikelForm />);
    isiFormulir("Judul", "Isi artikel");
    fireEvent.click(tombolSimpan());

    expect(await screen.findByText("Judul artikel maksimal 200 karakter.")).toBeTruthy();
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

    selesaikan?.(new Response(null, { status: 201 }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/artikel"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
