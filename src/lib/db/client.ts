// Este import hace que el build falle si un Componente de Cliente llega a
// importar este archivo. Es la garantía de que la clave de servicio nunca se
// filtra al navegador.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para uso exclusivo en el servidor.
 *
 * Usa la clave de servicio, que omite Row Level Security. Eso es deliberado: las
 * tablas tienen RLS activo sin políticas, así que nadie puede leerlas con la
 * clave anónima, y todo el acceso a datos pasa por Server Components y Server
 * Actions (§1.8 del plan).
 *
 * Toda consulta a la base tiene que vivir en `src/lib/db/queries/`. Si un archivo
 * fuera de esa carpeta importa este cliente, está mal ubicado.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example a .env.local y completala.`,
    );
  }
  return value;
}

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  // Se crea una sola vez por proceso; leer las variables recién acá permite que
  // el proyecto arranque aunque todavía no estén configuradas.
  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          // No hay sesiones de usuario: cada request es una llamada del servidor.
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return client;
}
