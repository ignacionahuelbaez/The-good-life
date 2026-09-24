import type { Metadata } from "next";

import { CheckoutForm } from "@/components/tienda/checkout-form";
import { getStoreSettings } from "@/lib/db/queries/settings";

export const metadata: Metadata = {
  title: "Checkout",
  // Una página de compra en curso no tiene nada que hacer en un buscador.
  robots: { index: false },
};

/** El costo de envío y los datos bancarios se leen en cada visita. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getStoreSettings();

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink uppercase">
        Finalizar compra
      </h1>

      <CheckoutForm settings={settings} />
    </section>
  );
}
