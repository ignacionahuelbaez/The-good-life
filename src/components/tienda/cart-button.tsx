"use client";

import { BagIcon } from "@/components/icons";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { contarUnidades } from "@/lib/cart/totals";
import { useCartUI } from "@/lib/cart/ui";

/**
 * Botón del carrito en la cabecera, con el contador de unidades.
 *
 * El número aparece recién después de leer el carrito de localStorage: en el
 * servidor siempre está vacío, y dibujarlo antes mostraría un cero que cambia
 * solo un instante después.
 */
export function CartButton() {
  const setOpen = useCartUI((s) => s.setOpen);
  const items = useCart((s) => s.items);
  const hidratado = useCartHydrated();

  const unidades = hidratado ? contarUnidades(items) : 0;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative -mr-2 p-2 text-ink transition-opacity hover:opacity-70"
      aria-label={
        unidades > 0
          ? `Abrir carrito, ${unidades} ${unidades === 1 ? "unidad" : "unidades"}`
          : "Abrir carrito"
      }
    >
      <BagIcon className="size-5" />

      {unidades > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-brand-ink tabular-nums">
          {unidades > 9 ? "9+" : unidades}
        </span>
      )}
    </button>
  );
}
