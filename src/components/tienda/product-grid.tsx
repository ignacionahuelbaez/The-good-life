import { ProductCard } from "@/components/tienda/product-card";
import type { Product } from "@/lib/db/types";

/**
 * Grilla del catálogo: dos columnas en teléfono, cuatro en escritorio.
 *
 * Las primeras cuatro tarjetas cargan con prioridad porque son las que entran en
 * la primera pantalla y definen el Largest Contentful Paint.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
