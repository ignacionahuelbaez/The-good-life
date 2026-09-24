import "server-only";

import { db } from "@/lib/db/client";

/**
 * Estado real de las variantes que el comprador tiene en el carrito.
 *
 * El navegador guarda una copia de los datos para poder dibujar el carrito al
 * instante, pero esa copia puede tener días. Esto devuelve lo que la base dice
 * hoy: el precio vigente, el stock que queda y si el producto sigue publicado.
 */

export type VarianteEnCarrito = {
  variantId: string;
  /** Se guarda en el pedido para poder volver al producto desde el panel. */
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  stock: number;
  imageUrl: string | null;
};

type Fila = {
  id: string;
  name: string;
  price_override: number | string | null;
  stock: number;
  option1_name: string | null;
  products: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    status: string;
    product_images: { url: string; position: number }[];
  } | null;
};

function aNumero(valor: number | string): number {
  return typeof valor === "number" ? valor : Number(valor);
}

/**
 * Busca las variantes pedidas. Las que no aparecen en el resultado fueron
 * borradas o despublicadas, y quien llama debe tratarlas como no disponibles.
 */
export async function getVariantesEnCarrito(
  variantIds: string[],
): Promise<VarianteEnCarrito[]> {
  if (variantIds.length === 0) return [];

  const { data, error } = await db()
    .from("product_variants")
    .select(
      `
      id, name, price_override, stock, option1_name,
      products!inner (
        id, slug, name, price, status,
        product_images (url, position)
      )
    `,
    )
    .in("id", variantIds)
    .eq("products.status", "activo");

  if (error) {
    throw new Error(`No se pudo revalidar el carrito: ${error.message}`);
  }

  return (data as unknown as Fila[]).flatMap((fila) => {
    const producto = fila.products;
    if (!producto) return [];

    const imagenes = [...producto.product_images].sort(
      (a, b) => a.position - b.position,
    );

    return [
      {
        variantId: fila.id,
        productId: producto.id,
        productSlug: producto.slug,
        productName: producto.name,
        // Un producto sin ejes tiene una variante llamada "Default", que es un
        // nombre interno y no debe aparecer en el carrito.
        variantName: fila.option1_name ? fila.name : null,
        unitPrice:
          fila.price_override !== null
            ? aNumero(fila.price_override)
            : aNumero(producto.price),
        stock: fila.stock,
        imageUrl: imagenes[0]?.url ?? null,
      },
    ];
  });
}
