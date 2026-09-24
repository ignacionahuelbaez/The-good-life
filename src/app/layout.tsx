import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { store } from "@/config/store";

import "./globals.css";

// Una sola familia, con los pesos haciendo la jerarquía. La referencia visual del
// proyecto es enteramente sans: los títulos se distinguen por peso y espaciado,
// no por cambiar de tipografía. Además evita una segunda descarga de fuente.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Permite que las rutas hijas declaren imágenes y enlaces relativos.
  metadataBase: new URL(store.url),
  title: {
    default: `${store.name} · ${store.tagline}`,
    template: `%s · ${store.name}`,
  },
  description: store.description,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: store.name,
    title: store.name,
    description: store.description,
  },
};

/**
 * Layout raíz: sólo el documento y la tipografía.
 *
 * La cabecera y el pie de la tienda viven en `(tienda)/layout.tsx`, no acá,
 * porque el panel de pedidos no los quiere: a quien está despachando no le sirve
 * un carrito de compras ni el pie institucional.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
