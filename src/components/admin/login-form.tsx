"use client";

import { useActionState } from "react";

import { iniciarSesion } from "@/app/actions/admin";

export function LoginForm() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, null);

  return (
    <form action={accion} className="mt-8">
      <label htmlFor="password" className="text-sm text-ink">
        Contraseña
      </label>

      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-ink"
        aria-describedby={estado?.error ? "password-error" : undefined}
        aria-invalid={estado?.error ? true : undefined}
      />

      {estado?.error && (
        <p id="password-error" className="mt-2 text-sm text-danger">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="mt-6 w-full bg-brand py-3 text-sm font-medium tracking-wide text-brand-ink uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
