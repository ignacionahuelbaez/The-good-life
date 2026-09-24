import "server-only";

import { db } from "@/lib/db/client";
import type { Product, Variant } from "@/lib/db/types";

/**
 * Consultas del catálogo.
 *
 * Éste es el único lugar que sabe cómo están guardados los productos. Todo lo que
 * sale de acá ya tiene la forma que los componentes quieren: precios resueltos,
 * imágenes y variantes ordenadas, categoría anidada.
 */

// Se pide siempre lo mismo: el catálogo es chico y traer el producto completo
// evita una segunda consulta al entrar a la ficha.
const SELECT_PRODUCTO = `
  id, slug, name, description, price, compare_at_price, featured,
  category:categories (id, slug, name, description),
  images:product_images (id, url, alt, position),
  variants:product_variants (
    id, name, option1_name, option1_value, option2_name, option2_value,
    price_override, stock, sku, position
  )
`;

type FilaCategoria = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type FilaImagen = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

type FilaVariante = {
  id: string;
  name: string;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  price_override: number | string | null;
  stock: number;
  sku: string | null;
  position: number;
};

type FilaProducto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  featured: boolean;
  // PostgREST devuelve las relaciones como objeto o arreglo según la cardinalidad.
  category: FilaCategoria | FilaCategoria[] | null;
  images: FilaImagen[];
  variants: FilaVariante[];
};

/** Postgres serializa `numeric` como texto para no perder precisión. */
function aNumero(valor: number | string): number {
  return typeof valor === "number" ? valor : Number(valor);
}

function mapearVariante(fila: FilaVariante, precioBase: number): Variant {
  const opciones = [
    fila.option1_name && fila.option1_value
      ? { name: fila.option1_name, value: fila.option1_value }
      : null,
    fila.option2_name && fila.option2_value
      ? { name: fila.option2_name, value: fila.option2_value }
      : null,
  ].filter((o): o is { name: string; value: string } => o !== null);

  return {
    id: fila.id,
    name: fila.name,
    options: opciones,
    // El precio de la variante se resuelve acá para que nadie más tenga que
    // acordarse de que price_override existe.
    price:
      fila.price_override !== null
        ? aNumero(fila.price_override)
        : precioBase,
    stock: fila.stock,
    sku: fila.sku,
  };
}

function mapearProducto(fila: FilaProducto): Product {
  const precio = aNumero(fila.price);
  const categoria = Array.isArray(fila.category)
    ? (fila.category[0] ?? null)
    : fila.category;

  return {
    id: fila.id,
    slug: fila.slug,
    name: fila.name,
    description: fila.description,
    category: categoria
      ? {
          id: categoria.id,
          slug: categoria.slug,
          name: categoria.name,
          description: categoria.description,
        }
      : null,
    price: precio,
    compareAtPrice:
      fila.compare_at_price !== null ? aNumero(fila.compare_at_price) : null,
    featured: fila.featured,
    images: [...fila.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    variants: [...fila.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => mapearVariante(v, precio)),
  };
}

/** Productos publicados, opcionalmente filtrados por categoría. */
export async function getProducts(
  opciones: { categoria?: string } = {},
): Promise<Product[]> {
  let consulta = db()
    .from("products")
    .select(SELECT_PRODUCTO)
    .eq("status", "activo")
    .order("position");

  if (opciones.categoria) {
    consulta = consulta.eq("categories.slug", opciones.categoria);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);

  const productos = (data as unknown as FilaProducto[]).map(mapearProducto);

  // El filtro por categoría de PostgREST no descarta el producto, sólo anula la
  // relación, así que se filtra acá.
  return opciones.categoria
    ? productos.filter((p) => p.category?.slug === opciones.categoria)
    : productos;
}

/** Destacados para la home. */
export async function getFeaturedProducts(limite = 8): Promise<Product[]> {
  const { data, error } = await db()
    .from("products")
    .select(SELECT_PRODUCTO)
    .eq("status", "activo")
    .eq("featured", true)
    .order("position")
    .limit(limite);

  if (error) throw new Error(`No se pudieron leer los destacados: ${error.message}`);
  return (data as unknown as FilaProducto[]).map(mapearProducto);
}

/** Un producto por su slug. Devuelve null si no existe o si es borrador. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await db()
    .from("products")
    .select(SELECT_PRODUCTO)
    .eq("slug", slug)
    .eq("status", "activo")
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el producto: ${error.message}`);
  return data ? mapearProducto(data as unknown as FilaProducto) : null;
}

/** Slugs publicados, para prerenderizar las fichas en el build. */
export async function getProductSlugs(): Promise<string[]> {
  const { data, error } = await db()
    .from("products")
    .select("slug")
    .eq("status", "activo");

  if (error) throw new Error(`No se pudieron leer los slugs: ${error.message}`);
  return data.map((p) => p.slug);
}
