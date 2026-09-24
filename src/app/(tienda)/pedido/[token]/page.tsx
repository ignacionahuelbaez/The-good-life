import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPrice, store } from "@/config/store";
import { getOrderByToken } from "@/lib/db/queries/orders";
import { getStoreSettings } from "@/lib/db/queries/settings";
import type { OrderStatus } from "@/lib/db/types";
import { linkConfirmacion } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Tu pedido",
  // El pedido de una persona no se indexa, aunque el token no sea adivinable.
  robots: { index: false, follow: false },
};

/** El estado del pedido cambia desde el panel: siempre se lee en vivo. */
export const dynamic = "force-dynamic";

/**
 * Confirmación y seguimiento del pedido.
 *
 * Es la página que reemplaza a la cuenta de usuario: se llega por el enlace del
 * email, y el token aleatorio de la URL es la autorización. También es donde el
 * comprador se entera de cómo pagar, así que eso va primero y bien visible.
 */
export default async function PedidoPage(props: PageProps<"/pedido/[token]">) {
  const { token } = await props.params;

  const pedido = await getOrderByToken(token);
  if (!pedido) notFound();

  const settings = await getStoreSettings();
  const pendiente = pedido.status === "pendiente";

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs tracking-widest text-muted uppercase">
        Pedido #{pedido.orderNumber}
      </p>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {pendiente ? "Recibimos tu pedido" : tituloSegunEstado(pedido.status)}
      </h1>

      <p className="mt-3 text-muted">
        {pendiente
          ? "Te mandamos una copia por email. Para confirmarlo, avisanos que ya hiciste el pago."
          : descripcionSegunEstado(pedido.status)}
      </p>

      {pendiente && (
        <div className="mt-10 border border-ink p-6">
          <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
            Cómo completar tu compra
          </h2>

          {settings.whatsappNumber && (
            <>
              <p className="mt-4 text-sm text-muted">
                El camino más rápido: escribinos y coordinamos el pago y la
                entrega.
              </p>

              <a
                href={linkConfirmacion(settings.whatsappNumber, pedido)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full bg-brand py-3.5 text-center text-sm font-medium tracking-wide text-brand-ink uppercase transition-opacity hover:opacity-90"
              >
                Confirmar por WhatsApp
              </a>
            </>
          )}

          {settings.bank.cbu && (
            <div className="mt-6 border-t border-line pt-6">
              <p className="text-sm text-ink">O transferí a:</p>

              <dl className="mt-3 space-y-1.5 text-sm">
                {settings.bank.holder && (
                  <Dato etiqueta="Titular" valor={settings.bank.holder} />
                )}
                {settings.bank.alias && (
                  <Dato etiqueta="Alias" valor={settings.bank.alias} />
                )}
                <Dato etiqueta="CBU" valor={settings.bank.cbu} />
                <Dato
                  etiqueta="Importe"
                  valor={formatPrice(pedido.total)}
                />
              </dl>

              <p className="mt-4 text-xs text-muted">
                Después de transferir, mandanos el comprobante por WhatsApp o
                respondiendo el email de confirmación.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
          Detalle
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
              <p className="shrink-0 text-sm text-ink">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-ink">{formatPrice(pedido.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd className="text-ink">
              {pedido.shippingCost > 0
                ? formatPrice(pedido.shippingCost)
                : "Sin cargo"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="text-xl font-semibold text-ink">
              {formatPrice(pedido.total)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
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
              <p className="mt-1 text-sm text-muted">
                {pedido.shippingAddress}
              </p>
            </>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
            Contacto
          </h2>
          <p className="mt-3 text-sm text-ink">{pedido.customer.name}</p>
          <p className="mt-1 text-sm text-muted">{pedido.customer.email}</p>
          <p className="text-sm text-muted">{pedido.customer.phone}</p>
        </div>
      </div>

      {pedido.notes && (
        <div className="mt-8">
          <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
            Tus notas
          </h2>
          <p className="mt-3 text-sm text-muted">{pedido.notes}</p>
        </div>
      )}

      <p className="mt-12 border-t border-line pt-6 text-xs text-muted">
        Guardá este enlace: podés volver a esta página cuando quieras para ver el
        estado de tu pedido. También te lo mandamos por email a{" "}
        {pedido.customer.email}.
      </p>

      <Link
        href="/productos"
        className="mt-6 inline-block border-b border-ink pb-0.5 text-sm text-ink transition-opacity hover:opacity-70"
      >
        Seguir comprando en {store.name}
      </Link>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{etiqueta}</dt>
      {/* `select-all` deja copiar el CBU de un solo clic. */}
      <dd className="text-right font-medium text-ink select-all">{valor}</dd>
    </div>
  );
}

function tituloSegunEstado(status: OrderStatus): string {
  switch (status) {
    case "pagado":
      return "Tu pago está confirmado";
    case "enviado":
      return "Tu pedido está en camino";
    case "entregado":
      return "Tu pedido fue entregado";
    case "cancelado":
      return "Tu pedido fue cancelado";
    default:
      return "Recibimos tu pedido";
  }
}

function descripcionSegunEstado(status: OrderStatus): string {
  switch (status) {
    case "pagado":
      return "Ya lo estamos preparando. Te avisamos cuando salga.";
    case "enviado":
      return "Te escribimos por WhatsApp con los datos del envío.";
    case "entregado":
      return "¡Gracias por tu compra!";
    case "cancelado":
      return "Si creés que fue un error, escribinos y lo revisamos.";
    default:
      return "";
  }
}
