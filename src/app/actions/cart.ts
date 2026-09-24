"use server";

import type { CartItem } from "@/lib/cart/store";
import { getVariantesEnCarrito } from "@/lib/db/queries/cart";

/**
 * Revalida el carrito contra la base.
 *
 * El carrito vive en el navegador y puede tener días: mientras tanto el negocio
 * pudo cambiar precios, vender las últimas unidades o despublicar un producto.
 * Esto compara lo guardado contra la base, devuelve el carrito corregido y la
 * lista de lo que cambió, para poder avisárselo al comprador en vez de que lo
 * descubra en el checkout.
 */

export type Aviso = {
  productName: string;
  tipo: "eliminado" | "agotado" | "cantidad-reducida" | "precio-cambiado";
  detalle?: string;
};

export type ResultadoRevalidacion = {
  items: CartItem[];
  avisos: Aviso[];
  /** Stock disponible por variante, para limitar los controles de cantidad. */
  stock: Record<string, number>;
};

export async function revalidarCarrito(
  items: CartItem[],
): Promise<ResultadoRevalidacion> {
  if (items.length === 0) return { items: [], avisos: [], stock: {} };

  const variantes = await getVariantesEnCarrito(
    items.map((item) => item.variantId),
  );
  const porId = new Map(variantes.map((v) => [v.variantId, v]));

  const corregidos: CartItem[] = [];
  const avisos: Aviso[] = [];
  const stock: Record<string, number> = {};

  for (const item of items) {
    const actual = porId.get(item.variantId);

    // No está más: el producto se borró o se despublicó.
    if (!actual) {
      avisos.push({ productName: item.productName, tipo: "eliminado" });
      continue;
    }

    if (actual.stock === 0) {
      avisos.push({ productName: actual.productName, tipo: "agotado" });
      continue;
    }

    const cantidad = Math.min(item.quantity, actual.stock);
    if (cantidad < item.quantity) {
      avisos.push({
        productName: actual.productName,
        tipo: "cantidad-reducida",
        detalle: `quedan ${actual.stock}`,
      });
    }

    if (actual.unitPrice !== item.unitPrice) {
      avisos.push({
        productName: actual.productName,
        tipo: "precio-cambiado",
      });
    }

    stock[actual.variantId] = actual.stock;
    corregidos.push({
      variantId: actual.variantId,
      quantity: cantidad,
      productSlug: actual.productSlug,
      productName: actual.productName,
      variantName: actual.variantName,
      unitPrice: actual.unitPrice,
      imageUrl: actual.imageUrl,
    });
  }

  return { items: corregidos, avisos, stock };
}
