import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { panelConfigurado } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col justify-center px-4 py-24">
      <h1 className="text-xl font-bold tracking-tight text-ink uppercase">
        Panel de pedidos
      </h1>

      {panelConfigurado() ? (
        <LoginForm />
      ) : (
        <p className="mt-6 border-l-2 border-danger bg-surface p-4 text-sm text-ink">
          El panel no está configurado. Falta definir{" "}
          <code className="text-xs">ADMIN_PASSWORD</code> en las variables de
          entorno.
        </p>
      )}
    </section>
  );
}
