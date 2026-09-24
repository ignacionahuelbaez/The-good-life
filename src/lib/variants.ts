/**
 * Lógica de selección de variantes.
 *
 * Vive separada del componente porque decide qué puede comprar el cliente: un
 * error acá habilita la compra de algo sin stock, o esconde algo disponible.
 * Siendo funciones puras se puede verificar sin levantar la interfaz.
 */

import type { Variant } from "@/lib/db/types";

export type Eje = { name: string; values: string[] };

/** Saca los ejes de las variantes, conservando el orden de carga. */
export function derivarEjes(variants: Variant[]): Eje[] {
  const ejes = new Map<string, string[]>();

  for (const variante of variants) {
    for (const opcion of variante.options) {
      const valores = ejes.get(opcion.name) ?? [];
      if (!valores.includes(opcion.value)) valores.push(opcion.value);
      ejes.set(opcion.name, valores);
    }
  }

  return [...ejes].map(([name, values]) => ({ name, values }));
}

function valoresDe(variant: Variant): Record<string, string> {
  return Object.fromEntries(variant.options.map((o) => [o.name, o.value]));
}

function coincide(
  variant: Variant,
  seleccion: Record<string, string>,
  ejes: Eje[],
  ignorar?: string,
): boolean {
  const valores = valoresDe(variant);
  return ejes.every(
    (eje) => eje.name === ignorar || valores[eje.name] === seleccion[eje.name],
  );
}

/** Arranca en la primera variante con stock; si no hay ninguna, en la primera. */
export function seleccionInicial(
  variants: Variant[],
  ejes: Eje[],
): Record<string, string> {
  if (ejes.length === 0) return {};
  const preferida = variants.find((v) => v.stock > 0) ?? variants[0];
  return valoresDe(preferida);
}

/** La variante que corresponde a lo elegido, o undefined si no existe. */
export function encontrarVariante(
  variants: Variant[],
  seleccion: Record<string, string>,
  ejes: Eje[],
): Variant | undefined {
  return variants.find((v) => coincide(v, seleccion, ejes));
}

/**
 * ¿Queda stock si se elige este valor? Los demás ejes se comparan contra lo ya
 * elegido, así que "Talle L" puede estar disponible en negro y agotado en
 * chocolate, y el selector lo refleja al cambiar de color.
 */
export function hayStockPara(
  variants: Variant[],
  seleccion: Record<string, string>,
  ejes: Eje[],
  ejeEvaluado: string,
): boolean {
  return variants.some(
    (v) =>
      v.stock > 0 &&
      valoresDe(v)[ejeEvaluado] === seleccion[ejeEvaluado] &&
      coincide(v, seleccion, ejes, ejeEvaluado),
  );
}
