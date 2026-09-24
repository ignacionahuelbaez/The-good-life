import { Footer } from "@/components/tienda/footer";
import { Header } from "@/components/tienda/header";

/**
 * Layout de la tienda: lo que ve el comprador.
 *
 * El grupo `(tienda)` no aparece en las URLs; existe sólo para que estas páginas
 * compartan cabecera y pie, y para que el panel de `/admin` quede fuera.
 */
export default function TiendaLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
