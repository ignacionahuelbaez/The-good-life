/**
 * Cálculo de totales del carrito.
 *
 * Funciones puras y sin dependencias, a propósito: son las únicas que traducen
 * el carrito en plata, y un error acá se cobra de más o de menos. Se usan tanto
 * en el navegador, para mostrar, como en el servidor, donde el total se
 * recalcula desde cero al confirmar el pedido.
 */

export type LineaCalculable = {
  unitPrice: number;
  quantity: number;
};

/** Cantidad total de unidades, para el contador de la cabecera. */
export function contarUnidades(lineas: LineaCalculable[]): number {
  return lineas.reduce((total, linea) => total + linea.quantity, 0);
}

/** Precio por línea. */
export function subtotalDeLinea(linea: LineaCalculable): number {
  return linea.unitPrice * linea.quantity;
}

/** Suma de todas las líneas, sin envío. */
export function subtotal(lineas: LineaCalculable[]): number {
  return lineas.reduce((total, linea) => total + subtotalDeLinea(linea), 0);
}
