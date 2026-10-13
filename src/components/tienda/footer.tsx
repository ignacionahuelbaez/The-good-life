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
    <footer className="mt-24 border-t border-carbon-ink/15 bg-canvas">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 text-xs leading-relaxed text-muted max-w-xs">
              {store.description}
            </p>
          </div>

          <div className="text-xs">
            <p className="font-medium uppercase tracking-[0.025em] text-ink">Contacto</p>
            <ul className="mt-4 space-y-2 text-muted">
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

          <nav aria-label="Pie de página" className="text-xs">
            <p className="font-medium uppercase tracking-[0.025em] text-ink">Navegación</p>
            <ul className="mt-4 space-y-2">
              {store.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted transition-colors hover:text-ink uppercase"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 border-t border-carbon-ink/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted tracking-[0.025em]">
          <p>© {year} {store.name}. Todos los derechos reservados.</p>
          <p className="mt-2 sm:mt-0">Diseño editorial minimalista</p>
        </div>
      </div>
    </footer>
  );
}
