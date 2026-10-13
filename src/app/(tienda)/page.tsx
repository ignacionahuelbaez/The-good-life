import Link from "next/link";

import { ProductGrid } from "@/components/tienda/product-grid";
import { store } from "@/config/store";
import { getFeaturedProducts } from "@/lib/db/queries/products";
import { getCategories } from "@/lib/db/queries/categories";

/** Ver la nota de `revalidate` en la ficha de producto. */
export const revalidate = 60;

/**
 * Portada estilo lookbook editorial / Giopetra.
 */
export default async function HomePage() {
  const [todosLosDestacados, categorias] = await Promise.all([
    getFeaturedProducts().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const destacados =
    todosLosDestacados.length < 4
      ? todosLosDestacados
      : todosLosDestacados.slice(0, Math.floor(todosLosDestacados.length / 4) * 4);

  return (
    <div className="w-full">
      {/* Hero Principal Lookbook */}
      <section className="relative flex min-h-[75vh] sm:min-h-[85vh] w-full items-center justify-center bg-warm-fog/60 px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
            {store.name} — Nueva Temporada
          </p>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight text-carbon-ink uppercase">
            {store.tagline}
          </h1>

          <p className="mx-auto max-w-lg text-sm sm:text-base font-normal leading-relaxed text-muted">
            {store.description}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/productos"
              className="inline-flex items-center justify-center border border-carbon-ink bg-carbon-ink px-8 py-3.5 text-xs font-medium tracking-[0.05em] text-paper-white uppercase transition-colors hover:bg-transparent hover:text-carbon-ink"
            >
              Explorar Colección
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías / Navegación limpia */}
      {categorias.length > 0 && (
        <section className="border-b border-carbon-ink/10 bg-canvas py-10">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs uppercase tracking-[0.05em]">
              <span className="text-[10px] text-muted tracking-[0.1em]">Líneas:</span>
              {categorias.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?categoria=${cat.slug}`}
                  className="text-muted transition-colors hover:text-carbon-ink hover:underline underline-offset-8"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Productos Destacados */}
      {destacados.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-8 sm:py-28">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-carbon-ink/10 pb-6">
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] text-muted uppercase">
                Selección de piezas
              </p>
              <h2 className="mt-1 text-2xl font-light tracking-tight text-carbon-ink uppercase">
                Destacados
              </h2>
            </div>
            <Link
              href="/productos"
              className="text-xs uppercase tracking-[0.05em] text-muted transition-colors hover:text-carbon-ink underline underline-offset-4"
            >
              Ver todo el catálogo →
            </Link>
          </div>

          <ProductGrid products={destacados} />
        </section>
      )}

      {/* Frase / Manifiesto de marca */}
      <section className="border-t border-carbon-ink/10 bg-surface/40 py-24 px-4 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-carbon-ink">
            Atención personalizada
          </h3>
          <p className="text-sm leading-relaxed text-muted">
            Coordinamos cada pedido de forma directa a través de WhatsApp. Calidad en cada detalle, pagos simples y envíos seguros a todo el país.
          </p>
        </div>
      </section>
    </div>
  );
}
