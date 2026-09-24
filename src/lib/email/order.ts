import "server-only";

import { formatPrice, store } from "@/config/store";
import type { Order, StoreSettings } from "@/lib/db/types";
import {
  apagado,
  boton,
  detalle,
  escapar,
  layout,
  parrafo,
  recuadro,
  titulo,
  type FilaDetalle,
} from "@/lib/email/html";
import type { Email } from "@/lib/email/send";

/** Los dos emails que salen cuando entra un pedido. */

function filas(order: Order): FilaDetalle[] {
  return order.items.map((item) => ({
    producto: item.productName,
    variante: item.variantName,
    cantidad: item.quantity,
    importe: formatPrice(item.unitPrice * item.quantity),
  }));
}

function totales(order: Order) {
  return [
    { etiqueta: "Subtotal", valor: formatPrice(order.subtotal) },
    {
      etiqueta: "Envío",
      valor:
        order.shippingCost > 0 ? formatPrice(order.shippingCost) : "Sin cargo",
    },
    { etiqueta: "Total", valor: formatPrice(order.total), fuerte: true },
  ];
}

function entrega(order: Order, settings: StoreSettings): string {
  if (order.shippingMethod === "retiro") {
    return `<strong>Retiro en el local</strong>${
      settings.pickupAddress ? `<br>${escapar(settings.pickupAddress)}` : ""
    }`;
  }
  return `<strong>Envío a domicilio</strong><br>${escapar(order.shippingAddress ?? "")}`;
}

/** Confirmación para el comprador, con las instrucciones para pagar. */
export function emailParaComprador(
  order: Order,
  settings: StoreSettings,
): Email {
  const urlSeguimiento = `${store.url}/pedido/${order.accessToken}`;

  const datosDePago = settings.bank.cbu
    ? recuadro(
        `<strong>Para pagar por transferencia</strong><br>` +
          (settings.bank.holder ? `Titular: ${escapar(settings.bank.holder)}<br>` : "") +
          (settings.bank.alias ? `Alias: <strong>${escapar(settings.bank.alias)}</strong><br>` : "") +
          `CBU: ${escapar(settings.bank.cbu)}<br><br>` +
          `Una vez hecha la transferencia, enviános el comprobante y preparamos tu pedido.`,
      )
    : "";

  const contenido = [
    titulo(`Recibimos tu pedido #${order.orderNumber}`),
    parrafo(
      `Hola ${escapar(order.customer.name.split(" ")[0])}, gracias por tu compra. ` +
        `Tu pedido quedó registrado y lo preparamos apenas confirmemos el pago.`,
    ),
    datosDePago,
    `<h2 style="margin:24px 0 12px;font-size:15px;color:#111111;">Detalle</h2>`,
    detalle(filas(order), totales(order)),
    recuadro(entrega(order, settings)),
    boton(urlSeguimiento, "Ver mi pedido"),
    apagado(
      `Si tenés alguna duda, respondé este mail y te contestamos.`,
    ),
  ].join("");

  return {
    to: order.customer.email,
    subject: `Tu pedido #${order.orderNumber} en ${store.name}`,
    html: layout({
      titulo: `Pedido #${order.orderNumber}`,
      storeName: store.name,
      contenido,
      pie: `${escapar(store.name)} · ${escapar(store.contact.email)}`,
    }),
  };
}

/**
 * Aviso para el dueño.
 *
 * Trae todo lo necesario para despachar sin abrir el panel: hasta que exista la
 * pantalla de pedidos, en la Fase 4, este email es la herramienta de trabajo.
 */
export function emailParaNegocio(order: Order, settings: StoreSettings): Email {
  const contenido = [
    titulo(`Nuevo pedido #${order.orderNumber}`),
    recuadro(
      `<strong>${escapar(order.customer.name)}</strong><br>` +
        `${escapar(order.customer.phone)}<br>` +
        `${escapar(order.customer.email)}`,
    ),
    detalle(filas(order), totales(order)),
    recuadro(entrega(order, settings)),
    order.notes
      ? recuadro(`<strong>Notas del comprador</strong><br>${escapar(order.notes)}`)
      : "",
    boton(`${store.url}/pedido/${order.accessToken}`, "Ver el pedido"),
  ].join("");

  return {
    to: store.contact.email,
    // Responder al aviso escribe directamente al comprador.
    replyTo: order.customer.email,
    subject: `Pedido #${order.orderNumber} · ${formatPrice(order.total)} · ${order.customer.name}`,
    html: layout({
      titulo: `Nuevo pedido #${order.orderNumber}`,
      storeName: store.name,
      contenido,
    }),
  };
}
