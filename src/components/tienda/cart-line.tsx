"use client";

import Image from "next/image";
import Link from "next/link";

import { MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatPrice } from "@/config/store";
import { useCart, type CartItem } from "@/lib/cart/store";
import { subtotalDeLinea } from "@/lib/cart/totals";
import { cn } from "@/lib/utils";

/**
 * Una línea del carrito, con su control de cantidad.
 *
 * Se usa igual en el panel lateral y en la página; `compact` sólo ajusta el
 * tamaño de la miniatura.
 */
export function CartLine({
  item,
  maxQuantity,
  compact = false,
  onNavigate,
}: {
  item: CartItem;
  /** Stock disponible, cuando se conoce. Limita el botón de sumar. */
  maxQuantity?: number;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const topeAlcanzado =
    maxQuantity !== undefined && item.quantity >= maxQuantity;

  return (
    <li className="flex gap-4 py-4">
      <Link
        href={`/producto/${item.productSlug}`}
        onClick={onNavigate}
        className={cn(
          "relative shrink-0 overflow-hidden bg-surface",
          compact ? "aspect-3/4 w-20" : "aspect-3/4 w-24",
        )}
      >
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/producto/${item.productSlug}`}
              onClick={onNavigate}
              className="block truncate text-sm text-ink hover:opacity-70"
            >
              {item.productName}
            </Link>

            {item.variantName && (
              <p className="mt-0.5 text-xs text-muted">{item.variantName}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => remove(item.variantId)}
            aria-label={`Quitar ${item.productName}`}
            className="-mt-1 p-1 text-muted transition-colors hover:text-danger"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex items-center border border-line">
            <button
              type="button"
              onClick={() => setQuantity(item.variantId, item.quantity - 1)}
              aria-label="Quitar una unidad"
              className="p-2 text-muted transition-colors hover:text-ink"
            >
              <MinusIcon className="size-4" />
            </button>

            <span
              className="min-w-8 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {item.quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(item.variantId, item.quantity + 1)}
              disabled={topeAlcanzado}
              aria-label="Agregar una unidad"
              className="p-2 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-ink">
              {formatPrice(subtotalDeLinea(item))}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted">
                {formatPrice(item.unitPrice)} c/u
              </p>
            )}
          </div>
        </div>

        {topeAlcanzado && (
          <p className="mt-2 text-xs text-muted">
            No hay más unidades disponibles.
          </p>
        )}
      </div>
    </li>
  );
}
