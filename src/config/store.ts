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
  tagline: "Esenciales atemporales y diseño consciente",

  /** Una o dos oraciones sobre el negocio. Se usa en la home y como descripción SEO. */
  description:
    "Prendas y objetos curados para un estilo de vida contemporáneo y consciente.",

  /** Dominio de la tienda. */
  url: "https://thegoodlife.com",

  /** Se usa para formatear precios. */
  locale: "es-AR",
  currency: "ARS",

  contact: {
    email: "contacto@thegoodlife.com",
    instagram: "thegoodlife.ar",
    address: "Palermo Soho, Buenos Aires",
  },

  /**
   * Enlaces de la navegación principal.
   */
  nav: [
    { href: "/productos", label: "Colección" },
  ],
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
