import { beforeEach, describe, expect, it, vi } from "vitest";

const ambilSesiMock = vi.fn();

vi.mock("@/lib/services/auth-service", () => ({
  ambilSesi: (...args: unknown[]) => ambilSesiMock(...args),
}));

import { ambilSesiRequest, ambilTokenSesiDariHeader, responsBelumLogin } from "./autentikasi";

function requestDenganCookie(cookie: string | null) {
  return new Request("http://localhost:3000/api/artikel", {
    headers: cookie === null ? undefined : { cookie },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ambilTokenSesiDariHeader", () => {
  it("mengambil nilai cookie sesi dari antara cookie lain", () => {
    expect(
      ambilTokenSesiDariHeader(
        requestDenganCookie("lain=nilai; sesi_token=abc123; lain2=x"),
      ),
    ).toBe("abc123");
  });

  it("mendukung nilai yang di-encode", () => {
    expect(
      ambilTokenSesiDariHeader(requestDenganCookie("sesi_token=a%20b")),
    ).toBe("a b");
  });

  it("mengembalikan null bila cookie tidak ada atau kosong", () => {
    expect(ambilTokenSesiDariHeader(requestDenganCookie(null))).toBeNull();
    expect(ambilTokenSesiDariHeader(requestDenganCookie("lain=x"))).toBeNull();
    expect(ambilTokenSesiDariHeader(requestDenganCookie("sesi_token="))).toBeNull();
  });
});

describe("ambilSesiRequest", () => {
  it("mengembalikan null tanpa memanggil service bila tidak ada cookie", async () => {
    await expect(ambilSesiRequest(requestDenganCookie(null))).resolves.toBeNull();
    expect(ambilSesiMock).not.toHaveBeenCalled();
  });

  it("mengembalikan sesi pengguna bila token valid", async () => {
    ambilSesiMock.mockResolvedValue({
      penggunaId: 7,
      username: "budi",
      kedaluwarsa: "2026-01-02T00:00:00.000Z",
    });

    await expect(
      ambilSesiRequest(requestDenganCookie("sesi_token=abc")),
    ).resolves.toEqual({ penggunaId: 7, username: "budi" });
  });

  it("mengembalikan null bila sesi tidak valid/kedaluwarsa", async () => {
    ambilSesiMock.mockResolvedValue(null);

    await expect(
      ambilSesiRequest(requestDenganCookie("sesi_token=abc")),
    ).resolves.toBeNull();
  });
});

describe("responsBelumLogin", () => {
  it("mengembalikan 401 dengan pesan yang jelas", async () => {
    const response = responsBelumLogin();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: expect.stringMatching(/login/i),
    });
  });
});
