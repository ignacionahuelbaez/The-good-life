"use client";

import { useState } from "react";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { useCart } from "@/lib/cart/store";
import { useCartUI } from "@/lib/cart/ui";
import type { Product, Variant } from "@/lib/db/types";

/**
 * Cantidad y botón de agregar.
 *
 * Al agregar abre el panel del carrito: es la confirmación de que la acción
 * surtió efecto, y evita el mensajito que aparece y desaparece sin que el
 * comprador llegue a leerlo.
 */
export function AddToCart({
  product,
  variant,
}: {
  product: Product;
  /** La variante elegida. Sin ella la combinación no existe y no se puede comprar. */
  variant: Variant | undefined;
}) {
  const add = useCart((s) => s.add);
  const setOpen = useCartUI((s) => s.setOpen);
  const [cantidadElegida, setCantidad] = useState(1);

  const disponible = variant !== undefined && variant.stock > 0;

  // La cantidad se acota al mostrarla en lugar de corregirse con un efecto:
  // cambiar de talle puede dejarla por encima del stock del talle nuevo, y
  // derivarla evita el render en cascada de ajustar estado después del render.
  // Al volver a un talle con más stock, se recupera la cantidad original.
  const cantidad = Math.max(1, Math.min(cantidadElegida, variant?.stock ?? 1));

  function agregar() {
    if (!variant || !disponible) return;

    add(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        // "Default" es el nombre interno de la variante de un producto sin
        // opciones: mostrarlo en el carrito no le diría nada a nadie.
        variantName: variant.options.length > 0 ? variant.name : null,
        unitPrice: variant.price,
        imageUrl: product.images[0]?.url ?? null,
      },
      cantidad,
    );

    setCantidad(1);
    setOpen(true);
  }

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className="flex items-center border border-carbon-ink/30 rounded-[4px]">
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          disabled={!disponible || cantidad <= 1}
          aria-label="Quitar una unidad"
          className="p-3 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <MinusIcon className="size-4" />
        </button>

        <span className="min-w-8 text-center text-xs font-normal tabular-nums text-ink">
          {cantidad}
        </span>

        <button
          type="button"
          onClick={() => setCantidad((c) => c + 1)}
          disabled={!disponible || cantidad >= (variant?.stock ?? 0)}
          aria-label="Agregar una unidad"
          className="p-3 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={agregar}
        disabled={!disponible}
        className="flex-1 bg-carbon-ink px-8 py-3 text-xs font-medium tracking-[0.025em] text-paper-white uppercase rounded-[4px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-gray"
      >
        {disponible ? "Agregar al carrito" : "Sin stock"}
      </button>
    </div>
  );
}
