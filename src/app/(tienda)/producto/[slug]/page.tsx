import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/tienda/product-gallery";
import { VariantPicker } from "@/components/tienda/variant-picker";
import { getProductBySlug, getProductSlugs } from "@/lib/db/queries/products";
import { tintFor } from "@/lib/placeholder";

/**
 * Las fichas se prerenderizan, pero se regeneran como máximo cada minuto.
 *
 * Sin esto, el HTML queda congelado en el momento del build: un cambio de precio
 * o de stock hecho desde el panel de Supabase no se vería hasta el próximo
 * despliegue, y peor, si se recarga el catálogo entero los identificadores de
 * variante cambian y la página serviría botones que apuntan a productos
 * inexistentes. Un minuto es un buen equilibrio entre frescura y no reconstruir
 * de más.
 */
export const revalidate = 60;

/** Prerenderiza las fichas en el build: son las páginas más visitadas. */
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/producto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const producto = await getProductBySlug(slug);

  if (!producto) return { title: "Producto no encontrado" };

  // La primera línea alcanza como resumen; el resto son fichas técnicas.
  const resumen = producto.description?.split("\n")[0];

  return {
    title: producto.name,
    description: resumen,
    openGraph: {
      title: producto.name,
      description: resumen,
      images: producto.images[0] ? [producto.images[0].url] : undefined,
    },
  };
}

export default async function ProductoPage(
  props: PageProps<"/producto/[slug]">,
) {
  const { slug } = await props.params;
  const producto = await getProductBySlug(slug);

  if (!producto) notFound();

  const parrafos = (producto.description ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery
          images={producto.images}
          productName={producto.name}
          tint={tintFor(producto)}
        />

        <div className="lg:py-4">
          {producto.category && (
            <p className="text-xs tracking-wide text-muted uppercase">
              {producto.category.name}
            </p>
          )}

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {producto.name}
          </h1>

          <div className="mt-8">
            <VariantPicker product={producto} />
          </div>

          {parrafos.length > 0 && (
            <div className="mt-10 space-y-4 border-t border-line pt-8 text-sm leading-relaxed text-muted">
              {parrafos.map((parrafo, i) => (
                <p key={i}>{parrafo}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
