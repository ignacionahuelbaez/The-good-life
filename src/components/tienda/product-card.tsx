import Link from "next/link";

import { Price } from "@/components/tienda/price";
import { ProductImage } from "@/components/tienda/product-image";
import { inStock, type Product } from "@/lib/db/types";
import { tintFor } from "@/lib/placeholder";

/** Tarjeta de producto para la grilla del catálogo. */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const disponible = inStock(product);

  // El precio más bajo entre las variantes es el que se promete en la grilla:
  // mostrar uno mayor al que después se puede elegir sería engañoso.
  const precio = Math.min(...product.variants.map((v) => v.price));

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative">
        <ProductImage
          image={product.images[0]}
          productName={product.name}
          tint={tintFor(product)}
          priority={priority}
          className="transition-opacity group-hover:opacity-90"
        />

        {!disponible && (
          // Fondo claro con un contorno tenue: así se lee tanto sobre una foto
          // oscura como sobre el bloque de color de una prenda negra.
          <span className="absolute top-3 left-3 bg-canvas px-2 py-1 text-[11px] font-medium tracking-wide text-ink uppercase ring-1 ring-ink/10">
            Agotado
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm text-ink">{product.name}</h3>
        <Price price={precio} compareAtPrice={product.compareAtPrice} />
      </div>
    </Link>
  );
}
