import "server-only";

import { db } from "@/lib/db/client";
import type { Category } from "@/lib/db/types";

/** Categorías en el orden en que se navegan. */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("id, slug, name, description")
    .order("position");

  if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
  return data;
}

/** Una categoría por slug. Devuelve null si no existe. */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await db()
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la categoría: ${error.message}`);
  return data;
}
