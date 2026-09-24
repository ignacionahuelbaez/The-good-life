/**
 * Bloques de color para los productos que todavía no tienen foto.
 *
 * TEMPORAL. Existe para poder validar la grilla, las fichas y las proporciones
 * antes de que haya fotos definitivas. Cuando el catálogo real tenga sus
 * imágenes, este módulo deja de usarse solo: `ProductImage` sólo recurre al
 * bloque cuando no hay foto. Llegado ese momento se puede borrar este archivo y
 * simplificar el componente.
 *
 * El color sale del propio producto — el que declaran sus variantes — así que
 * dos prendas distintas se distinguen de un vistazo, igual que las distinguirían
 * dos fotos. Sin eso, una grilla de doce rectángulos grises no permite juzgar
 * nada.
 */

import type { Product } from "@/lib/db/types";

/** Aproximaciones de los colores de prenda que usa el catálogo. */
const COLORES: Record<string, string> = {
  negro: "#242424",
  blanco: "#f2f1ee",
  gris: "#9b9b98",
  arena: "#d8cab4",
  chocolate: "#5b4436",
  lavanda: "#b3abcf",
  oliva: "#6b6f4d",
};

/** Neutros para los productos que no declaran color, repartidos por nombre. */
const NEUTROS = ["#e4e1db", "#d5d1c9", "#c9c4ba", "#dcd8d0"];

export type Tint = { background: string; foreground: string };

/** Suma estable de los caracteres: el mismo producto recibe siempre el mismo tono. */
function hash(texto: string): number {
  let total = 0;
  for (let i = 0; i < texto.length; i++) total += texto.charCodeAt(i);
  return total;
}

/**
 * Luminancia relativa para decidir si el texto encima va claro u oscuro.
 * Fórmula de la WCAG, simplificada: alcanza para elegir entre dos extremos.
 */
function esOscuro(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.55;
}

/** Color del bloque de un producto, con su color de texto legible encima. */
export function tintFor(product: Product): Tint {
  const colorDeclarado = product.variants
    .flatMap((v) => v.options)
    .find((o) => o.name.toLowerCase() === "color")?.value;

  const background =
    (colorDeclarado && COLORES[colorDeclarado.toLowerCase()]) ??
    NEUTROS[hash(product.slug) % NEUTROS.length];

  return {
    background,
    foreground: esOscuro(background) ? "#f2f1ee" : "#4a4a46",
  };
}
