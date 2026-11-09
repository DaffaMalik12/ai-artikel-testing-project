import type { Metadata } from "next";

import CekSesiLogin from "./cek-sesi-login";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-10">
      <section aria-labelledby="judul-login" className="w-full max-w-md">
        <h1
          id="judul-login"
          className="mb-6 text-center text-2xl font-bold text-slate-900"
        >
          Masuk
        </h1>
        <CekSesiLogin>
          <LoginForm />
        </CekSesiLogin>
      </section>
    </main>
  );
}
