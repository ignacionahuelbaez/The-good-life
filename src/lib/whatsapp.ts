import { formatPrice } from "@/config/store";
import type { Order } from "@/lib/db/types";

/**
 * Enlaces de WhatsApp con el mensaje ya escrito.
 *
 * Es el puente entre la tienda y la venta: sin pasarela de pago, el pedido se
 * confirma por este mensaje. Que el texto venga armado con el número de pedido
 * es lo que evita la conversación de "hola, ¿qué compraste?".
 */

/** El comprador le escribe al negocio para confirmar su pedido. */
export function linkConfirmacion(
  numero: string,
  order: Pick<Order, "orderNumber" | "total">,
): string {
  const mensaje = `Hola, quiero confirmar mi pedido #${order.orderNumber} por ${formatPrice(order.total)}.`;
  return construir(numero, mensaje);
}

/** El negocio le escribe al comprador. Se usa desde el panel de pedidos. */
export function linkAlComprador(
  telefono: string,
  order: Pick<Order, "orderNumber">,
): string {
  const mensaje = `Hola, te escribo por tu pedido #${order.orderNumber}.`;
  return construir(telefono, mensaje);
}

function construir(numero: string, mensaje: string): string {
  // wa.me sólo acepta dígitos: se limpian espacios, guiones y el signo más.
  const limpio = numero.replace(/\D/g, "");
  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}
