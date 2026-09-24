/**
 * Identidad de la tienda.
 *
 * Este archivo es el único lugar donde se escribe el nombre de la marca, sus
 * textos y sus enlaces. Ningún componente debe incrustar copy de marca por su
 * cuenta: si mañana cambia el nombre, tiene que alcanzar con editar acá.
 *
 * Lo que vive acá es identidad y casi nunca cambia. Lo operativo que el dueño sí
 * cambia seguido — CBU, número de WhatsApp, costo de envío — vive en la tabla
 * `store_settings`, para poder editarlo sin volver a desplegar.
 *
 * TODO: reemplazar los valores marcados antes de salir a producción.
 */

export const store = {
  name: "The Good Life",

  /** Frase corta que acompaña al nombre. Aparece en el hero y en los metadatos. */
  tagline: "Productos elegidos con criterio",

  /** Una o dos oraciones sobre el negocio. Se usa en la home y como descripción SEO. */
  description:
    "Una selección chica y cuidada de productos, con atención personal y envíos a todo el país.",

  /** TODO: dominio definitivo, sin barra final. Se usa para los enlaces absolutos y el sitemap. */
  url: "https://example.com",

  /** Se usa para formatear precios. */
  locale: "es-AR",
  currency: "ARS",

  contact: {
    /** TODO: email al que llegan las notificaciones de pedidos. */
    email: "hola@example.com",
    /** Dejar en null lo que el negocio no tenga: la UI oculta lo vacío. */
    instagram: null as string | null,
    address: null as string | null,
  },

  /**
   * Enlaces de la navegación principal.
   * Sólo se listan rutas que existen. Las páginas institucionales se agregan
   * acá cuando se construyan, en la Fase 6.
   */
  nav: [{ href: "/productos", label: "Productos" }],
} as const;

/** Formatea un precio para mostrar. Los montos vienen de la base como número. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(store.locale, {
    style: "currency",
    currency: store.currency,
    // El catálogo trabaja con precios redondos; los centavos sólo agregan ruido.
    maximumFractionDigits: 0,
  }).format(amount);
}
