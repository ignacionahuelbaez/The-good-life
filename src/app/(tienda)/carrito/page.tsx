"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { revalidarCarrito, type Aviso } from "@/app/actions/cart";
import { CartLine } from "@/components/tienda/cart-line";
import { formatPrice } from "@/config/store";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { subtotal } from "@/lib/cart/totals";

/**
 * Página del carrito.
 *
 * Al entrar revisa el carrito contra la base: el carrito vive en el navegador y
 * puede tener días, en los que el negocio pudo cambiar precios, vender las
 * últimas unidades o despublicar un producto. Corrige lo que haga falta y avisa
 * qué cambió, para que el comprador no se entere recién al confirmar.
 */
export default function CarritoPage() {
  const items = useCart((s) => s.items);
  const replace = useCart((s) => s.replace);
  const hidratado = useCartHydrated();

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [revisando, setRevisando] = useState(true);

  // Se revisa una sola vez al entrar. Sin esto, cada cambio de cantidad
  // dispararía otra consulta y el carrito pelearía contra el comprador mientras
  // edita.
  const yaRevisado = useRef(false);

  useEffect(() => {
    if (!hidratado || yaRevisado.current) return;
    yaRevisado.current = true;

    const guardados = useCart.getState().items;
    // Con el carrito vacío no hay nada que revisar y no se toca el estado: el
    // render de más abajo atiende ese caso antes de mirar `revisando`.
    if (guardados.length === 0) return;

    revalidarCarrito(guardados)
      .then((resultado) => {
        replace(resultado.items);
        setAvisos(resultado.avisos);
        setStock(resultado.stock);
      })
      .catch(() => {
        // Si la base no responde, el carrito guardado sigue sirviendo: el
        // checkout vuelve a validar antes de crear el pedido.
        setAvisos([
          {
            productName: "",
            tipo: "precio-cambiado",
            detalle: "No pudimos verificar disponibilidad. Reintentá en un rato.",
          },
        ]);
      })
      .finally(() => setRevisando(false));
  }, [hidratado, replace]);

  const total = subtotal(items);

  if (!hidratado) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
          Carrito
        </h1>
        <p className="mt-8 text-sm text-muted">Cargando…</p>
      </section>
    );
  }

  // El carrito vacío se resuelve antes de mirar `revisando`: sin nada que
  // revisar, mostrar "revisando disponibilidad" sería mentira.
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
          Carrito
        </h1>

        {avisos.length > 0 && <Avisos avisos={avisos} />}

        <div className="mt-12 border border-dashed border-line py-20 text-center">
          <p className="text-ink">Tu carrito está vacío.</p>
          <Link
            href="/productos"
            className="mt-4 inline-block border-b border-ink pb-0.5 text-sm text-ink transition-opacity hover:opacity-70"
          >
            Ver productos
          </Link>
        </div>
      </section>
    );
  }

  if (revisando) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
          Carrito
        </h1>
        <p className="mt-8 text-sm text-muted">Revisando disponibilidad…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
        Carrito
      </h1>

      {avisos.length > 0 && <Avisos avisos={avisos} />}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <CartLine
              key={item.variantId}
              item={item}
              maxQuantity={stock[item.variantId]}
            />
          ))}
        </ul>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line p-5">
            <h2 className="text-sm font-medium tracking-wide text-ink uppercase">
              Resumen
            </h2>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="text-xl font-semibold text-ink">
                {formatPrice(total)}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted">
              El costo de envío se calcula en el checkout.
            </p>

            <Link
              href="/checkout"
              className="mt-6 block w-full bg-brand py-3 text-center text-sm font-medium tracking-wide text-brand-ink uppercase transition-opacity hover:opacity-90"
            >
              Finalizar compra
            </Link>
          </div>

          <Link
            href="/productos"
            className="mt-6 block text-center text-sm text-muted transition-colors hover:text-ink"
          >
            Seguir comprando
          </Link>
        </aside>
      </div>
    </section>
  );
}

function Avisos({ avisos }: { avisos: Aviso[] }) {
  return (
    <ul className="mt-8 space-y-2 border-l-2 border-accent bg-surface p-4">
      {avisos.map((aviso, i) => (
        <li key={i} className="text-sm text-ink">
          {textoDeAviso(aviso)}
        </li>
      ))}
    </ul>
  );
}

function textoDeAviso(aviso: Aviso): string {
  switch (aviso.tipo) {
    case "eliminado":
      return `Quitamos ${aviso.productName}: ya no está disponible.`;
    case "agotado":
      return `Quitamos ${aviso.productName}: se agotó.`;
    case "cantidad-reducida":
      return `Ajustamos la cantidad de ${aviso.productName}: ${aviso.detalle}.`;
    case "precio-cambiado":
      return aviso.detalle ?? `Cambió el precio de ${aviso.productName}.`;
  }
}
