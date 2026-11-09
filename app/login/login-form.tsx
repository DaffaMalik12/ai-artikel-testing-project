"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLogin } from "@/lib/hooks/use-login";

// Harus sinkron dengan konstanta validasi di lib/services/auth-service.ts.
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

interface FieldErrors {
  username?: string;
  password?: string;
}

function validasiForm(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const panjangUsername = username.trim().length;
  if (panjangUsername < USERNAME_MIN || panjangUsername > USERNAME_MAX) {
    errors.username = `Username harus ${USERNAME_MIN} sampai ${USERNAME_MAX} karakter.`;
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.password = `Password harus ${PASSWORD_MIN} sampai ${PASSWORD_MAX} karakter.`;
  }
  return errors;
}

export default function LoginForm() {
  const router = useRouter();
  const { mutate, isLoading, error: errorApi } = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validasiForm(username, password);
    setFieldErrors(errors);
    // Validasi klien: jangan kirim request bila input tidak valid.
    if (Object.keys(errors).length > 0) {
      return;
    }

    const sukses = await mutate(username.trim(), password);
    if (sukses) {
      // Cookie sesi sudah di-set server; refresh agar state server ikut segar.
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      {errorApi && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorApi}
        </p>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            if (fieldErrors.username) {
              setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }
          }}
          aria-invalid={fieldErrors.username ? true : undefined}
          aria-describedby={fieldErrors.username ? "error-username" : undefined}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {fieldErrors.username && (
          <p id="error-username" className="mt-1 text-sm text-red-600">
            {fieldErrors.username}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "error-password" : undefined}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {fieldErrors.password && (
          <p id="error-password" className="mt-1 text-sm text-red-600">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Memproses…
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
}
