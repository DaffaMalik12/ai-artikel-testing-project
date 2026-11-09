import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  LoginError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "LoginError";
    }
  },
  login: (...args: unknown[]) => loginMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// Di-import setelah vi.mock agar instanceof cocok dengan class yang
// dipakai hook (vi.mock meng-hoist factory ke atas file).
import { LoginError } from "@/lib/api/auth";
import LoginForm from "./login-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function isiForm(username?: string, password?: string) {
  if (username !== undefined) {
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: username },
    });
  }
  if (password !== undefined) {
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: password },
    });
  }
}

function klikSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /masuk/i }));
}

describe("LoginForm", () => {
  it("menampilkan error inline dan tidak memanggil API saat input tidak valid", () => {
    render(<LoginForm />);
    isiForm("ab", "pendek");
    klikSubmit();

    expect(screen.getByText(/username harus 3 sampai 50/i)).toBeTruthy();
    expect(screen.getByText(/password harus 8 sampai 200/i)).toBeTruthy();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("memanggil API lalu berpindah halaman saat login sukses", async () => {
    loginMock.mockResolvedValue({ pengguna: { id: 1, username: "budi" } });
    render(<LoginForm />);
    isiForm("budi", "password123");
    klikSubmit();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith("budi", "password123");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("menampilkan pesan error API saat kredensial salah (401)", async () => {
    loginMock.mockRejectedValue(
      new LoginError("Username atau password salah."),
    );
    render(<LoginForm />);
    isiForm("budi", "passwordsalah");
    klikSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Username atau password salah.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("menampilkan pesan error rate limit (429) dari API", async () => {
    loginMock.mockRejectedValue(
      new LoginError("Terlalu banyak percobaan login. Coba lagi nanti."),
    );
    render(<LoginForm />);
    isiForm("budi", "password123");
    klikSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Terlalu banyak percobaan login");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("menonaktifkan tombol submit saat request berjalan (anti double-submit)", async () => {
    loginMock.mockImplementation(
      () => new Promise<never>(() => undefined), // tidak pernah selesai
    );
    render(<LoginForm />);
    isiForm("budi", "password123");
    klikSubmit();

    const tombol = await screen.findByRole("button", { name: /memproses/i });
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    expect(loginMock).toHaveBeenCalledTimes(1);

    // Percobaan submit lagi saat loading tidak menambah pemanggilan API.
    fireEvent.click(tombol);
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
  });
});
