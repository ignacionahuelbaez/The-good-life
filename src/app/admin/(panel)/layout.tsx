import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { cerrarSesion } from "@/app/actions/admin";
import { COOKIE_SESION, sesionValida } from "@/lib/admin/auth";

/**
 * Layout del panel, y también su control de acceso.
 *
 * La verificación va acá y no en `proxy.ts` porque el proxy puede terminar
 * ejecutándose en un CDN, lejos del runtime que lee la base. Comprobar la sesión
 * en el layout la pone en el mismo lugar donde se renderizan los datos, que es
 * donde importa que no se filtren.
 *
 * El login vive fuera de este grupo de rutas, en `/admin/login`, para que no
 * herede esta comprobación y no quede en un bucle de redirecciones.
 */
export default async function PanelLayout({
  children,
}: LayoutProps<"/admin">) {
  const almacen = await cookies();

  if (!sesionValida(almacen.get(COOKIE_SESION)?.value)) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-5">
        <Link
          href="/admin"
          className="text-sm font-bold tracking-tight text-ink uppercase"
        >
          Pedidos
        </Link>

        <form action={cerrarSesion}>
          <button
            type="submit"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Salir
          </button>
        </form>
      </header>

      {children}
    </div>
  );
}
