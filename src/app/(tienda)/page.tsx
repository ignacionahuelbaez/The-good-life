import Link from "next/link";

import { ProductGrid } from "@/components/tienda/product-grid";
import { store } from "@/config/store";
import { getFeaturedProducts } from "@/lib/db/queries/products";

/** Ver la nota de `revalidate` en la ficha de producto. */
export const revalidate = 60;

/**
 * Home.
 *
 * Todavía provisoria: hero tipográfico y destacados. La landing real — con foto
 * de campaña, categorías, historia de la marca y prueba social — se construye en
 * la Fase 6, cuando haya identidad visual y fotos definitivas.
 */
export default async function HomePage() {
  const todosLosDestacados = await getFeaturedProducts();

  // La grilla es de cuatro columnas: un quinto destacado quedaría solo en su
  // fila con tres huecos al lado. Se recorta a filas completas, salvo que haya
  // menos de cuatro en total, donde no queda otra que mostrar los que existan.
  const destacados =
    todosLosDestacados.length < 4
      ? todosLosDestacados
      : todosLosDestacados.slice(0, Math.floor(todosLosDestacados.length / 4) * 4);

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">
              {store.tagline}
            </p>

            <h1 className="mt-4 text-4xl leading-none font-extrabold tracking-tight text-ink uppercase sm:text-6xl">
              {store.name}
            </h1>

            <p className="mt-6 max-w-lg text-lg text-muted">
              {store.description}
            </p>

            <Link
              href="/productos"
              className="mt-10 inline-flex items-center bg-brand px-8 py-3 text-sm font-medium tracking-wide text-brand-ink uppercase transition-opacity hover:opacity-90"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </section>

      {destacados.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-10 text-center text-lg font-bold tracking-wide text-ink uppercase">
            Destacados
          </h2>

          <ProductGrid products={destacados} />

          <div className="mt-12 text-center">
            <Link
              href="/productos"
              className="border-b border-ink pb-1 text-sm text-ink transition-opacity hover:opacity-70"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
