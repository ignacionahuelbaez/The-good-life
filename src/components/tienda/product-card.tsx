import Link from "next/link";

import { Price } from "@/components/tienda/price";
import { ProductImage } from "@/components/tienda/product-image";
import { inStock, type Product } from "@/lib/db/types";
import { tintFor } from "@/lib/placeholder";

const COLOR_SWATCHES: Record<string, string> = {
  negro: "#242424",
  blanco: "#f2f1ee",
  gris: "#9b9b98",
  arena: "#d8cab4",
  chocolate: "#5b4436",
  lavanda: "#b3abcf",
  oliva: "#6b6f4d",
};

/** Tarjeta de producto para la grilla del catálogo. */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const disponible = inStock(product);
  const precio = Math.min(...product.variants.map((v) => v.price));

  const colors = Array.from(
    new Set(
      product.variants
        .flatMap((v) => v.options)
        .filter((o) => o.name.toLowerCase() === "color")
        .map((o) => o.value)
    )
  );

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative bg-paper-white">
        <ProductImage
          image={product.images[0]}
          productName={product.name}
          tint={tintFor(product)}
          priority={priority}
          className="rounded-none transition-opacity group-hover:opacity-95"
        />

        {!disponible && (
          <span className="absolute top-3 left-3 bg-carbon-ink px-2 py-1 text-[10px] font-medium tracking-[0.025em] text-paper-white uppercase">
            Agotado
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 px-0.5">
        {colors.length > 0 && (
          <div className="flex items-center gap-1">
            {colors.map((c) => {
              const hex = COLOR_SWATCHES[c.toLowerCase()] || "#cccccc";
              return (
                <span
                  key={c}
                  title={c}
                  className="inline-block h-3 w-3 rounded-none border border-carbon-ink/20"
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        )}

        <h3 className="text-xs font-normal tracking-[0.025em] text-ink uppercase group-hover:text-carbon-ink">
          {product.name}
        </h3>
        <Price price={precio} compareAtPrice={product.compareAtPrice} />
      </div>
    </Link>
  );
}
