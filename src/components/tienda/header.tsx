import Link from "next/link";

import { CartButton } from "@/components/tienda/cart-button";
import { CartDrawer } from "@/components/tienda/cart-drawer";
import { Logo } from "@/components/tienda/logo";
import { store } from "@/config/store";

/** Cabecera del sitio. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-canvas">
      {/* Announcement Bar */}
      <div className="bg-carbon-ink py-1.5 text-center text-[10px] font-normal tracking-[0.025em] text-paper-white">
        ENVÍOS A TODO EL PAÍS — PAGOS POR TRANSFERENCIA Y WHATSAPP
      </div>

      <div className="border-b border-carbon-ink/15 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <nav aria-label="Principal" className="hidden sm:block">
            <ul className="flex items-center gap-8 text-xs font-medium uppercase tracking-[0.025em]">
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

          <Link href="/" aria-label={store.name} className="absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0">
            <Logo />
          </Link>

          <div className="flex items-center gap-4">
            <CartButton />
          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
