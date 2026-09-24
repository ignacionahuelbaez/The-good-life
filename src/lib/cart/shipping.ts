import type { ShippingMethod, StoreSettings } from "@/lib/db/types";

/**
 * Costo de envío.
 *
 * Tarifa plana, con envío gratis a partir de un monto si el negocio lo
 * configuró. Nada de calcular por zona ni consultar al correo: eso es una
 * integración entera para un negocio que hoy despacha a mano.
 *
 * Es función pura y se usa en los dos lados: en el checkout para mostrar el
 * total, y en el servidor para calcularlo de nuevo al crear el pedido. El valor
 * que llegue desde el navegador nunca se usa.
 */
export function costoDeEnvio(
  metodo: ShippingMethod,
  subtotal: number,
  settings: StoreSettings,
): number {
  if (metodo === "retiro") return 0;

  const { freeShippingThreshold, shippingFlatCost } = settings;

  if (freeShippingThreshold !== null && subtotal >= freeShippingThreshold) {
    return 0;
  }

  return shippingFlatCost;
}

/** Cuánto falta para alcanzar el envío gratis, o null si no aplica. */
export function faltaParaEnvioGratis(
  subtotal: number,
  settings: StoreSettings,
): number | null {
  const { freeShippingThreshold } = settings;

  if (freeShippingThreshold === null || subtotal >= freeShippingThreshold) {
    return null;
  }

  return freeShippingThreshold - subtotal;
}
