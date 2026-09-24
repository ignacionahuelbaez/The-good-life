import type { Metadata } from "next";

import { ProductGrid } from "@/components/tienda/product-grid";
import { getProducts } from "@/lib/db/queries/products";

export const metadata: Metadata = {
  title: "Productos",
};

/** Ver la nota de `revalidate` en la ficha de producto. */
export const revalidate = 60;

/**
 * Catálogo completo.
 *
 * Sin filtros ni buscador todavía: con este tamaño de catálogo se navega más
 * rápido recorriendo la grilla. Llegan en la Fase 5, cuando el catálogo lo pida.
 */
export default async function ProductosPage() {
  const productos = await getProducts();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
          Productos
        </h1>
        <p className="mt-2 text-sm text-muted">
          {productos.length}{" "}
          {productos.length === 1 ? "producto" : "productos"}
        </p>
      </header>

      {productos.length > 0 ? (
        <ProductGrid products={productos} />
      ) : (
        <div className="rounded-lg border border-dashed border-line py-20 text-center">
          <p className="text-ink">Todavía no hay productos publicados.</p>
          <p className="mt-2 text-sm text-muted">
            Volvé en unos días: estamos preparando el catálogo.
          </p>
        </div>
      )}
    </section>
  );
}
