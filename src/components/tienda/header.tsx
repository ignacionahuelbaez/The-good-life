import Link from "next/link";

import { CartButton } from "@/components/tienda/cart-button";
import { CartDrawer } from "@/components/tienda/cart-drawer";
import { Logo } from "@/components/tienda/logo";
import { store } from "@/config/store";

/** Cabecera del sitio. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label={store.name} className="text-lg">
          <Logo />
        </Link>

        <div className="flex items-center gap-6">
          <nav aria-label="Principal">
            <ul className="flex items-center gap-6 text-sm">
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

          <CartButton />
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
