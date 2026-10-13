"use client";

import Link from "next/link";

import { CartLine } from "@/components/tienda/cart-line";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatPrice } from "@/config/store";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { subtotal } from "@/lib/cart/totals";
import { useCartUI } from "@/lib/cart/ui";

/**
 * Panel lateral del carrito.
 *
 * Dibuja lo que hay guardado sin consultar al servidor: se abre apenas se agrega
 * un producto y esperar una respuesta rompería esa sensación. La revisión contra
 * el stock y los precios reales ocurre en la página del carrito, y de nuevo al
 * confirmar el pedido.
 */
export function CartDrawer() {
  const { open, setOpen } = useCartUI();
  const items = useCart((s) => s.items);
  const hidratado = useCartHydrated();

  const total = subtotal(items);
  const vacio = hidratado && items.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        title="Tu carrito"
        description="Productos que agregaste para comprar"
        footer={
          !vacio && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="text-lg font-semibold text-ink">
                  {formatPrice(total)}
                </span>
              </div>

              <p className="text-xs text-muted">
                El costo de envío se calcula en el checkout.
              </p>

              <Link
                href="/carrito"
                onClick={() => setOpen(false)}
                className="block w-full bg-carbon-ink py-3 text-center text-xs font-medium tracking-[0.025em] text-paper-white uppercase rounded-[4px] transition-opacity hover:opacity-90"
              >
                Ver carrito
              </Link>
            </div>
          )
        }
      >
        {vacio ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-xs text-ink uppercase tracking-[0.025em]">Tu carrito está vacío.</p>
            <Link
              href="/productos"
              onClick={() => setOpen(false)}
              className="mt-4 border-b border-carbon-ink pb-0.5 text-xs text-ink uppercase tracking-[0.025em] transition-opacity hover:opacity-70"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-carbon-ink/15 px-5">
            {items.map((item) => (
              <CartLine
                key={item.variantId}
                item={item}
                compact
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
