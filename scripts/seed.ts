/**
 * Carga un catálogo en la base desde un archivo JSON más una carpeta de fotos.
 *
 * Éste es el cargador de catálogo del proyecto, no un script de demo: hoy apunta
 * a `data/demo` y el día que exista el catálogo real va a apuntar a `data/catalogo`
 * sin cambiar una línea.
 *
 *   pnpm db:seed              # carga data/demo
 *   pnpm db:seed data/catalogo
 *
 * Vacía el catálogo antes de cargar, para que no queden restos mezclados. Los
 * pedidos existentes no se tocan: guardan su propia copia del nombre y del precio.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { exit } from "node:process";

const BUCKET = "productos";

type VarianteInput = {
  talle?: string;
  color?: string;
  stock?: number;
  sku?: string;
  precioOverride?: number;
};

type ProductoInput = {
  slug: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  precio: number;
  precioAnterior?: number;
  destacado?: boolean;
  estado?: "activo" | "borrador";
  imagenes?: { archivo: string; alt?: string }[];
  variantes: VarianteInput[];
};

type CatalogoInput = {
  categorias: { slug: string; nombre: string; descripcion?: string }[];
  productos: ProductoInput[];
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `\n  Falta ${name}.\n  Corré el script con: node --env-file=.env.local scripts/seed.ts\n`,
    );
    exit(1);
  }
  return value;
}

const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Falla ruidosamente: un seed a medias es peor que un seed que no corrió. */
function check(error: { message: string } | null, contexto: string): void {
  if (error) {
    console.error(`\n  Error ${contexto}: ${error.message}\n`);
    exit(1);
  }
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Sube las fotos de la carpeta al bucket y devuelve el mapa nombre → URL pública.
 * Sube todo lo que encuentra: qué foto va con qué producto lo decide el JSON.
 */
async function subirImagenes(carpeta: string): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  let archivos: string[];
  try {
    archivos = await readdir(carpeta);
  } catch {
    console.log(`  Sin carpeta de imágenes en ${carpeta}.`);
    archivos = [];
  }

  const imagenes = archivos.filter((f) => extname(f).toLowerCase() in MIME);

  // El bucket se prepara siempre, incluso sin fotos nuevas: si no, las del
  // catálogo anterior quedarían en Storage sin ninguna fila que las nombre.
  // El bucket es público porque las fotos se sirven por CDN y las optimiza
  // next/image. Nada sensible vive acá.
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await db.storage.createBucket(BUCKET, { public: true });
    check(error, `creando el bucket ${BUCKET}`);
    console.log(`  Bucket "${BUCKET}" creado.`);
  } else {
    const { data: viejas } = await db.storage.from(BUCKET).list();
    if (viejas && viejas.length > 0) {
      const { error } = await db.storage
        .from(BUCKET)
        .remove(viejas.map((f) => f.name));
      check(error, "vaciando el bucket");
      console.log(`  ${viejas.length} imágenes anteriores borradas.`);
    }
  }

  if (imagenes.length === 0) {
    console.log("  No hay fotos para subir.");
    return urls;
  }

  for (const archivo of imagenes) {
    const contenido = await readFile(join(carpeta, archivo));
    const { error } = await db.storage
      .from(BUCKET)
      .upload(archivo, contenido, {
        contentType: MIME[extname(archivo).toLowerCase()],
        upsert: true,
      });
    check(error, `subiendo ${archivo}`);

    const { data } = db.storage.from(BUCKET).getPublicUrl(archivo);
    urls.set(archivo, data.publicUrl);
  }

  console.log(`  ${imagenes.length} imágenes subidas.`);
  return urls;
}

/** Deja el catálogo vacío. Los pedidos sobreviven por sus copias de datos. */
async function vaciarCatalogo(): Promise<void> {
  // El borrado en cascada se encarga de imágenes y variantes.
  const { error: errProductos } = await db
    .from("products")
    .delete()
    .not("id", "is", null);
  check(errProductos, "vaciando productos");

  const { error: errCategorias } = await db
    .from("categories")
    .delete()
    .not("id", "is", null);
  check(errCategorias, "vaciando categorías");
}

/** Arma la etiqueta que ve el comprador a partir de los ejes cargados. */
function nombreDeVariante(v: VarianteInput): string {
  const partes = [
    v.talle && `Talle ${v.talle}`,
    v.color,
  ].filter((p): p is string => Boolean(p));

  return partes.length > 0 ? partes.join(" / ") : "Default";
}

async function main(): Promise<void> {
  const carpeta = resolve(process.argv[2] ?? "data/demo");
  console.log(`\nCargando catálogo desde ${carpeta}\n`);

  const catalogo: CatalogoInput = JSON.parse(
    await readFile(join(carpeta, "catalogo.json"), "utf8"),
  );

  const urls = await subirImagenes(join(carpeta, "imagenes"));

  await vaciarCatalogo();
  console.log("  Catálogo anterior borrado.");

  // --- Categorías ---
  const { data: categorias, error: errCat } = await db
    .from("categories")
    .insert(
      catalogo.categorias.map((c, i) => ({
        slug: c.slug,
        name: c.nombre,
        description: c.descripcion ?? null,
        position: i,
      })),
    )
    .select("id, slug");
  check(errCat, "creando categorías");

  const idDeCategoria = new Map(categorias!.map((c) => [c.slug, c.id]));
  console.log(`  ${categorias!.length} categorías creadas.`);

  // --- Productos ---
  const { data: productos, error: errProd } = await db
    .from("products")
    .insert(
      catalogo.productos.map((p, i) => {
        if (p.categoria && !idDeCategoria.has(p.categoria)) {
          console.error(
            `\n  El producto "${p.slug}" apunta a la categoría "${p.categoria}", que no está declarada.\n`,
          );
          exit(1);
        }
        return {
          slug: p.slug,
          name: p.nombre,
          description: p.descripcion ?? null,
          category_id: p.categoria ? idDeCategoria.get(p.categoria)! : null,
          price: p.precio,
          compare_at_price: p.precioAnterior ?? null,
          status: p.estado ?? "activo",
          featured: p.destacado ?? false,
          position: i,
        };
      }),
    )
    .select("id, slug");
  check(errProd, "creando productos");

  const idDeProducto = new Map(productos!.map((p) => [p.slug, p.id]));
  console.log(`  ${productos!.length} productos creados.`);

  // --- Imágenes y variantes ---
  const filasImagenes: Record<string, unknown>[] = [];
  const filasVariantes: Record<string, unknown>[] = [];
  const faltantes: string[] = [];

  for (const p of catalogo.productos) {
    const productId = idDeProducto.get(p.slug)!;

    (p.imagenes ?? []).forEach((img, i) => {
      const url = urls.get(img.archivo);
      if (!url) {
        faltantes.push(`${p.slug} → ${img.archivo}`);
        return;
      }
      filasImagenes.push({
        product_id: productId,
        url,
        alt: img.alt ?? null,
        position: i,
      });
    });

    p.variantes.forEach((v, i) => {
      filasVariantes.push({
        product_id: productId,
        name: nombreDeVariante(v),
        option1_name: v.talle ? "Talle" : null,
        option1_value: v.talle ?? null,
        option2_name: v.color ? "Color" : null,
        option2_value: v.color ?? null,
        sku: v.sku ?? null,
        price_override: v.precioOverride ?? null,
        stock: v.stock ?? 0,
        position: i,
      });
    });
  }

  if (filasImagenes.length > 0) {
    const { error } = await db.from("product_images").insert(filasImagenes);
    check(error, "creando imágenes");
  }
  const { error: errVar } = await db
    .from("product_variants")
    .insert(filasVariantes);
  check(errVar, "creando variantes");

  console.log(
    `  ${filasImagenes.length} imágenes y ${filasVariantes.length} variantes vinculadas.`,
  );

  if (faltantes.length > 0) {
    console.log(
      `\n  Aviso: ${faltantes.length} fotos declaradas en el JSON no están en la carpeta.`,
    );
    console.log("  Los productos se cargaron igual y la tienda los muestra sin foto:");
    for (const f of faltantes.slice(0, 8)) console.log(`    · ${f}`);
    if (faltantes.length > 8) console.log(`    · y ${faltantes.length - 8} más`);
  }

  const esDemo = basename(carpeta) === "demo";
  console.log(
    esDemo
      ? "\n  Listo. Cargaste el catálogo de DEMOSTRACIÓN: estos productos no son reales.\n"
      : "\n  Listo.\n",
  );
}

main().catch((error: unknown) => {
  console.error("\n  El seed falló:", error);
  exit(1);
});
