"use server";

import type { CartItem } from "@/lib/cart/store";
import { costoDeEnvio } from "@/lib/cart/shipping";
import { db } from "@/lib/db/client";
import { getVariantesEnCarrito } from "@/lib/db/queries/cart";
import { getOrderByToken } from "@/lib/db/queries/orders";
import { getStoreSettings } from "@/lib/db/queries/settings";
import type { ShippingMethod } from "@/lib/db/types";
import { emailParaComprador, emailParaNegocio } from "@/lib/email/order";
import { enviarEmail } from "@/lib/email/send";

/**
 * Creación del pedido.
 *
 * Todo lo que llega del navegador se trata como una intención, no como un dato:
 * de los ítems del carrito sólo se usan el identificador de variante y la
 * cantidad. Los precios, el costo de envío y el total se leen y calculan de nuevo
 * desde la base. Un precio modificado con las herramientas del navegador no tiene
 * ningún efecto.
 */

export type DatosCheckout = {
  nombre: string;
  email: string;
  telefono: string;
  metodoEnvio: ShippingMethod;
  direccion: string;
  notas: string;
};

export type ResultadoPedido =
  | { ok: true; accessToken: string; orderNumber: number }
  | { ok: false; errores: Record<string, string>; carritoCambio?: boolean };

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida el formulario. Sin librería: son cinco campos. */
function validar(datos: DatosCheckout): Record<string, string> {
  const errores: Record<string, string> = {};

  if (datos.nombre.trim().length < 2) {
    errores.nombre = "Necesitamos tu nombre.";
  }

  if (!EMAIL_VALIDO.test(datos.email.trim())) {
    errores.email = "Revisá el email: ahí te mandamos la confirmación.";
  }

  // Los teléfonos argentinos rondan los 10 dígitos sin el 0 ni el 15.
  const digitos = datos.telefono.replace(/\D/g, "");
  if (digitos.length < 8) {
    errores.telefono = "Necesitamos un teléfono para coordinar la entrega.";
  }

  if (datos.metodoEnvio === "envio" && datos.direccion.trim().length < 8) {
    errores.direccion = "Indicá calle, número, ciudad y código postal.";
  }

  return errores;
}

export async function crearPedido(
  items: CartItem[],
  datos: DatosCheckout,
): Promise<ResultadoPedido> {
  const errores = validar(datos);
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  if (items.length === 0) {
    return { ok: false, errores: { general: "Tu carrito está vacío." } };
  }

  const [settings, variantes] = await Promise.all([
    getStoreSettings(),
    getVariantesEnCarrito(items.map((i) => i.variantId)),
  ]);

  if (datos.metodoEnvio === "retiro" && !settings.pickupEnabled) {
    return {
      ok: false,
      errores: { metodoEnvio: "El retiro en el local no está disponible." },
    };
  }
  if (datos.metodoEnvio === "envio" && !settings.shippingEnabled) {
    return {
      ok: false,
      errores: { metodoEnvio: "Los envíos no están disponibles." },
    };
  }

  // Se arman las líneas con los datos de la base, no con los del navegador.
  const porId = new Map(variantes.map((v) => [v.variantId, v]));
  const lineas = [];

  for (const item of items) {
    const actual = porId.get(item.variantId);

    // Desapareció o se agotó entre que abrió el checkout y lo confirmó.
    if (!actual || actual.stock === 0) {
      return {
        ok: false,
        carritoCambio: true,
        errores: {
          general:
            "Algunos productos ya no están disponibles. Revisá tu carrito antes de confirmar.",
        },
      };
    }

    if (item.quantity > actual.stock) {
      return {
        ok: false,
        carritoCambio: true,
        errores: {
          general: `Quedan ${actual.stock} unidades de ${actual.productName}. Ajustá la cantidad y volvé a intentar.`,
        },
      };
    }

    lineas.push({
      variant_id: actual.variantId,
      product_id: actual.productId,
      product_name: actual.productName,
      variant_name: actual.variantName,
      unit_price: actual.unitPrice,
      quantity: item.quantity,
    });
  }

  const subtotal = lineas.reduce(
    (total, l) => total + l.unit_price * l.quantity,
    0,
  );
  const envio = costoDeEnvio(datos.metodoEnvio, subtotal, settings);
  const total = subtotal + envio;

  const { data, error } = await db().rpc("crear_pedido", {
    p_customer_name: datos.nombre.trim(),
    p_customer_email: datos.email.trim().toLowerCase(),
    p_customer_phone: datos.telefono.trim(),
    p_shipping_method: datos.metodoEnvio,
    p_shipping_address:
      datos.metodoEnvio === "envio" ? datos.direccion.trim() : null,
    p_shipping_cost: envio,
    p_subtotal: subtotal,
    p_total: total,
    p_notes: datos.notas,
    p_items: lineas,
  });

  if (error || !data?.[0]) {
    console.error("[checkout] no se pudo crear el pedido:", error);
    return {
      ok: false,
      errores: {
        general:
          "No pudimos registrar tu pedido. Probá de nuevo en un momento.",
      },
    };
  }

  const { access_token: accessToken, order_number: orderNumber } = data[0];

  // Los emails salen después de que el pedido ya está guardado, y su resultado
  // no cambia el desenlace: una venta confirmada no se pierde porque el correo
  // falle. El dueño la ve igual en su panel.
  const pedido = await getOrderByToken(accessToken);
  if (pedido) {
    await Promise.all([
      enviarEmail(emailParaComprador(pedido, settings)),
      enviarEmail(emailParaNegocio(pedido, settings)),
    ]);
  }

  return { ok: true, accessToken, orderNumber };
}
