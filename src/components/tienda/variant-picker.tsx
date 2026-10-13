"use client";

import { useMemo, useState } from "react";

import { AddToCart } from "@/components/tienda/add-to-cart";
import { Price } from "@/components/tienda/price";
import type { Product, Variant } from "@/lib/db/types";
import {
  derivarEjes,
  encontrarVariante,
  hayStockPara,
  seleccionInicial,
} from "@/lib/variants";
import { cn } from "@/lib/utils";

/**
 * Selector de variantes.
 *
 * Los ejes — Talle, Color — se derivan de las variantes cargadas en lugar de
 * guardarse aparte, así el catálogo admite un eje, dos o ninguno sin que este
 * componente se entere.
 *
 * Un valor se marca agotado cuando, combinado con lo ya elegido en los otros
 * ejes, no queda ninguna variante con stock. Eso evita el recorrido frustrante
 * de elegir un color y descubrir recién ahí que ningún talle está disponible.
 */
export function VariantPicker({ product }: { product: Product }) {
  const ejes = useMemo(() => derivarEjes(product.variants), [product.variants]);

  const [seleccion, setSeleccion] = useState<Record<string, string>>(() =>
    seleccionInicial(product.variants, ejes),
  );

  if (ejes.length === 0) {
    // Producto sin opciones: una sola variante implícita, sin selector.
    const unica = product.variants[0];
    return (
      <div className="space-y-6">
        <Price
          price={unica.price}
          compareAtPrice={product.compareAtPrice}
          size="lg"
        />
        <Disponibilidad variant={unica} />
        <AddToCart product={product} variant={unica} />
      </div>
    );
  }

  const variante = encontrarVariante(product.variants, seleccion, ejes);

  return (
    <div className="space-y-6">
      {ejes.map((eje) => (
        <fieldset key={eje.name}>
          <legend className="text-xs font-medium uppercase tracking-[0.025em] text-ink">
            {eje.name}
            {seleccion[eje.name] && (
              <span className="ml-2 font-normal text-muted lowercase">
                ({seleccion[eje.name]})
              </span>
            )}
          </legend>

          <div className="mt-3 flex flex-wrap gap-2">
            {eje.values.map((valor) => {
              const agotado = !hayStockPara(
                product.variants,
                { ...seleccion, [eje.name]: valor },
                ejes,
                eje.name,
              );
              const elegido = seleccion[eje.name] === valor;

              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() =>
                    setSeleccion((prev) => ({ ...prev, [eje.name]: valor }))
                  }
                  className={cn(
                    "min-w-12 rounded-none border px-4 py-2 text-xs font-normal tracking-[0.025em] uppercase transition-colors",
                    elegido
                      ? "border-carbon-ink bg-carbon-ink text-paper-white"
                      : "border-carbon-ink/30 text-ink hover:border-carbon-ink",
                    agotado && !elegido && "text-muted line-through opacity-60",
                  )}
                >
                  {valor}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {variante ? (
        <div className="space-y-6 border-t border-carbon-ink/15 pt-6">
          <div className="space-y-3">
            <Price
              price={variante.price}
              compareAtPrice={product.compareAtPrice}
              size="lg"
            />
            <Disponibilidad variant={variante} />
          </div>

          <AddToCart product={product} variant={variante} />
        </div>
      ) : (
        <p className="border-t border-carbon-ink/15 pt-6 text-xs text-muted">
          Esa combinación no está disponible.
        </p>
      )}
    </div>
  );
}

function Disponibilidad({ variant }: { variant: Variant | undefined }) {
  if (!variant || variant.stock === 0) {
    return <p className="text-xs tracking-[0.025em] text-muted">Sin stock por ahora.</p>;
  }

  return (
    <p className="text-xs tracking-[0.025em] text-success font-medium">
      {variant.stock <= 3 ? `Últimas ${variant.stock} unidades` : "Disponible"}
    </p>
  );
}
