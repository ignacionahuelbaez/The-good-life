import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Acceso al panel.
 *
 * Una sola contraseña en una variable de entorno. Sin tabla de usuarios, sin
 * roles, sin recuperación de contraseña: el panel lo usan una o dos personas del
 * mismo negocio, y un sistema de cuentas para eso sería construir una fase
 * entera para nadie.
 *
 * La sesión es una cookie firmada con la propia contraseña como secreto. La
 * consecuencia buena es que cambiar la contraseña invalida todas las sesiones
 * abiertas, que es exactamente lo que se espera al cambiarla.
 */

export const COOKIE_SESION = "admin_sesion";
const DURACION_MS = 7 * 24 * 60 * 60 * 1000;

function secreto(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "Falta ADMIN_PASSWORD. Sin esa variable el panel queda inaccesible.",
    );
  }
  return password;
}

/** ¿Está configurado el panel? Permite mostrar un mensaje claro en vez de fallar. */
export function panelConfigurado(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function firmar(datos: string, clave: string): string {
  return createHmac("sha256", clave).update(datos).digest("hex");
}

/** Comparación de tiempo constante: no filtra cuántos caracteres acertó. */
function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige el mismo largo, y eso ya revela el largo. Como los dos
  // lados son hashes de largo fijo, no hay nada que filtrar.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifica la contraseña ingresada contra la configurada. */
export function passwordCorrecta(intento: string): boolean {
  // Se comparan los HMAC y no las contraseñas: iguala los largos y evita que el
  // tiempo de comparación diga cuánto del prefijo era correcto.
  const esperado = firmar("password", secreto());
  const recibido = firmar("password", intento);
  return igualSeguro(esperado, recibido);
}

/** Valor de la cookie para una sesión nueva. */
export function crearSesion(): { valor: string; expira: Date } {
  const expira = new Date(Date.now() + DURACION_MS);
  const vence = String(expira.getTime());
  return { valor: `${vence}.${firmar(vence, secreto())}`, expira };
}

/** ¿La cookie es válida y está vigente? */
export function sesionValida(cookie: string | undefined): boolean {
  if (!cookie) return false;

  const [vence, firma] = cookie.split(".");
  if (!vence || !firma) return false;

  if (!igualSeguro(firma, firmar(vence, secreto()))) return false;

  const cuando = Number(vence);
  return Number.isFinite(cuando) && cuando > Date.now();
}
