import Image from "next/image";

import type { ProductImage as ProductImageType } from "@/lib/db/types";
import type { Tint } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

/**
 * Foto de producto en proporción 3:4.
 *
 * Cuando el producto todavía no tiene foto muestra un bloque de color con su
 * nombre, en lugar de un hueco roto. No es sólo para la demo: un producto recién
 * cargado pasa por ese estado hasta que le suban las fotos.
 */
export function ProductImage({
  image,
  productName,
  tint,
  priority = false,
  sizes,
  className,
}: {
  image: ProductImageType | undefined;
  productName: string;
  /** Color del bloque cuando no hay foto. Sin esto, cae en un gris neutro. */
  tint?: Tint;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (image) {
    return (
      <div className={cn("relative aspect-3/4 overflow-hidden bg-surface", className)}>
        <Image
          src={image.url}
          alt={image.alt ?? productName}
          fill
          sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-3/4 items-center justify-center overflow-hidden bg-surface p-6",
        className,
      )}
      style={
        tint
          ? { backgroundColor: tint.background, color: tint.foreground }
          : undefined
      }
    >
      <span
        className={cn(
          "text-center text-xs tracking-wide uppercase",
          !tint && "text-muted",
        )}
      >
        {productName}
      </span>
    </div>
  );
}
