/**
 * Layout común a todo `/admin`, incluido el login.
 *
 * Deliberadamente no trae la cabecera ni el pie de la tienda: quien está
 * despachando pedidos no necesita un carrito de compras a mano. El control de
 * acceso está un nivel más adentro, en `(panel)/layout.tsx`, para que el login
 * no quede atrapado en un bucle de redirecciones.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <main className="flex-1">{children}</main>;
}
