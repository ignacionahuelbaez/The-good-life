import type { Metadata } from "next";
import Link from "next/link";

import { ESTADOS, EstadoBadge } from "@/components/admin/estado-badge";
import { formatPrice } from "@/config/store";
import { getConteoPorEstado, getOrders } from "@/lib/db/queries/orders";
import type { OrderStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pedidos",
  robots: { index: false, follow: false },
};

/** El panel siempre muestra el estado actual: nunca se cachea. */
export const dynamic = "force-dynamic";

// En el orden en que avanza un pedido, que es el orden en que se trabaja.
const FILTROS: (OrderStatus | "todos")[] = [
  "todos",
  "pendiente",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
];

export default async function PedidosPage(props: PageProps<"/admin">) {
  const { estado } = await props.searchParams;
  const filtro = typeof estado === "string" ? estado : "todos";

  const esEstadoValido = (valor: string): valor is OrderStatus =>
    valor in ESTADOS;

  const [pedidos, conteo] = await Promise.all([
    getOrders(esEstadoValido(filtro) ? { status: filtro } : {}),
    getConteoPorEstado(),
  ]);

  const total = Object.values(conteo).reduce((suma, n) => suma + n, 0);

  return (
    <>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {FILTROS.map((valor) => {
          const activo = filtro === valor;
          const cantidad = valor === "todos" ? total : (conteo[valor] ?? 0);

          return (
            <Link
              key={valor}
              href={valor === "todos" ? "/admin" : `/admin?estado=${valor}`}
              className={cn(
                "border px-3 py-1.5 text-sm transition-colors",
                activo
                  ? "border-ink bg-ink text-brand-ink"
                  : "border-line text-muted hover:border-ink hover:text-ink",
              )}
            >
              {valor === "todos" ? "Todos" : ESTADOS[valor].label}
              <span className={cn("ml-2 text-xs", activo ? "opacity-70" : "")}>
                {cantidad}
              </span>
            </Link>
          );
        })}
      </nav>

      {pedidos.length === 0 ? (
        <p className="mt-16 border border-dashed border-line py-20 text-center text-muted">
          {filtro === "todos"
            ? "Todavía no hay pedidos."
            : "No hay pedidos en este estado."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <Link
                href={`/admin/pedido/${pedido.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 transition-opacity hover:opacity-70"
              >
                <span className="font-medium text-ink tabular-nums">
                  #{pedido.orderNumber}
                </span>

                <EstadoBadge status={pedido.status} />

                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {pedido.customer.name}
                </span>

                <span className="text-xs text-muted">
                  {formatearFecha(pedido.createdAt)}
                </span>

                <span className="text-sm font-medium text-ink tabular-nums">
                  {formatPrice(pedido.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Fecha corta: el año sólo cuando no es el actual. */
function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  const esteAno = fecha.getFullYear() === new Date().getFullYear();

  return fecha.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    ...(esteAno ? {} : { year: "numeric" }),
  });
}
