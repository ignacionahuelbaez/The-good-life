"use client";

import { useState } from "react";

import { ProductImage } from "@/components/tienda/product-image";
import type { ProductImage as ProductImageType } from "@/lib/db/types";
import type { Tint } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

/**
 * Galería de la ficha: una foto grande y las miniaturas debajo.
 *
 * Con una sola foto no dibuja miniaturas, y sin fotos delega en ProductImage,
 * que muestra el marco con el nombre.
 */
export function ProductGallery({
  images,
  productName,
  tint,
}: {
  images: ProductImageType[];
  productName: string;
  tint?: Tint;
}) {
  const [activa, setActiva] = useState(0);

  return (
    <div className="space-y-4">
      <ProductImage
        image={images[activa]}
        productName={productName}
        tint={tint}
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
      />

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-3">
          {images.map((imagen, i) => (
            <li key={imagen.id}>
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={`Ver imagen ${i + 1} de ${images.length}`}
                aria-current={i === activa}
                className={cn(
                  "block w-full border rounded-none transition-colors",
                  i === activa
                    ? "border-carbon-ink"
                    : "border-transparent hover:border-carbon-ink/30",
                )}
              >
                <ProductImage
                  image={imagen}
                  productName={productName}
                  tint={tint}
                  sizes="120px"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
