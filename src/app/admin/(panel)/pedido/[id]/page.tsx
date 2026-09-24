import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AccionesPedido,
  NotaInterna,
} from "@/components/admin/acciones-pedido";
import { EstadoBadge } from "@/components/admin/estado-badge";
import { formatPrice } from "@/config/store";
import { getOrderById } from "@/lib/db/queries/orders";
import { getStoreSettings } from "@/lib/db/queries/settings";
import { linkAlComprador } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PedidoAdminPage(
  props: PageProps<"/admin/pedido/[id]">,
) {
  const { id } = await props.params;

  const pedido = await getOrderById(id);
  if (!pedido) notFound();

  const settings = await getStoreSettings();

  return (
    <>
      <Link
        href="/admin"
        className="mt-8 inline-block text-sm text-muted transition-colors hover:text-ink"
      >
        ← Todos los pedidos
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink tabular-nums">
          #{pedido.orderNumber}
        </h1>
        <EstadoBadge status={pedido.status} />
        <span className="text-sm text-muted">
          {new Date(pedido.createdAt).toLocaleString("es-AR", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-10">
          <section>
            <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
              Productos
            </h2>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{item.productName}</p>
                    <p className="text-xs text-muted">
                      {item.variantName ? `${item.variantName} · ` : ""}
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-ink tabular-nums">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink tabular-nums">
                  {formatPrice(pedido.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Envío</dt>
                <dd className="text-ink tabular-nums">
                  {pedido.shippingCost > 0
                    ? formatPrice(pedido.shippingCost)
                    : "Sin cargo"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="text-xl font-semibold text-ink tabular-nums">
                  {formatPrice(pedido.total)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
                Comprador
              </h2>
              <p className="mt-3 text-sm text-ink">{pedido.customer.name}</p>
              <p className="mt-1 text-sm text-muted select-all">
                {pedido.customer.phone}
              </p>
              <a
                href={`mailto:${pedido.customer.email}`}
                className="block text-sm text-muted transition-colors hover:text-ink"
              >
                {pedido.customer.email}
              </a>
            </div>

            <div>
              <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
                Entrega
              </h2>
              {pedido.shippingMethod === "retiro" ? (
                <>
                  <p className="mt-3 text-sm text-ink">Retiro en el local</p>
                  {settings.pickupAddress && (
                    <p className="mt-1 text-sm text-muted">
                      {settings.pickupAddress}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-ink">Envío a domicilio</p>
                  <p className="mt-1 text-sm text-muted select-all">
                    {pedido.shippingAddress}
                  </p>
                </>
              )}
            </div>
          </section>

          {pedido.notes && (
            <section>
              <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
                Notas del comprador
              </h2>
              <p className="mt-3 border-l-2 border-line pl-4 text-sm text-muted">
                {pedido.notes}
              </p>
            </section>
          )}

          <section>
            <NotaInterna
              orderId={pedido.id}
              valorInicial={pedido.internalNotes ?? ""}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <AccionesPedido orderId={pedido.id} status={pedido.status} />

          <div className="mt-6 space-y-2 border-t border-line pt-6">
            <a
              href={linkAlComprador(pedido.customer.phone, pedido)}
              target="_blank"
              rel="noreferrer"
              className="block w-full border border-line py-2.5 text-center text-sm text-ink transition-colors hover:border-ink"
            >
              Escribir por WhatsApp
            </a>

            <Link
              href={`/pedido/${pedido.accessToken}`}
              target="_blank"
              className="block w-full py-2 text-center text-xs text-muted transition-colors hover:text-ink"
            >
              Ver como lo ve el comprador
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
