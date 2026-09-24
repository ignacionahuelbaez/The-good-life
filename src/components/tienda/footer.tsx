import Link from "next/link";

import { Logo } from "@/components/tienda/logo";
import { store } from "@/config/store";

/**
 * Pie del sitio.
 *
 * Las páginas legales y el botón de arrepentimiento — obligatorio para el
 * comercio electrónico en Argentina — se suman en la Fase 6, junto con los datos
 * fiscales del negocio.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-2 text-sm text-muted">{store.description}</p>
          </div>

          <div className="text-sm">
            <p className="font-medium text-ink">Contacto</p>
            <ul className="mt-2 space-y-1 text-muted">
              <li>
                <a
                  href={`mailto:${store.contact.email}`}
                  className="transition-colors hover:text-ink"
                >
                  {store.contact.email}
                </a>
              </li>
              {store.contact.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${store.contact.instagram}`}
                    className="transition-colors hover:text-ink"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{store.contact.instagram}
                  </a>
                </li>
              )}
              {store.contact.address && <li>{store.contact.address}</li>}
            </ul>
          </div>

          <nav aria-label="Pie de página" className="text-sm">
            <p className="font-medium text-ink">Tienda</p>
            <ul className="mt-2 space-y-1">
              {store.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          © {year} {store.name}
        </p>
      </div>
    </footer>
  );
}
