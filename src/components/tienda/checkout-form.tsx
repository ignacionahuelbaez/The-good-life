"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { crearPedido, type DatosCheckout } from "@/app/actions/checkout";
import { formatPrice } from "@/config/store";
import { costoDeEnvio, faltaParaEnvioGratis } from "@/lib/cart/shipping";
import { useCart, useCartHydrated } from "@/lib/cart/store";
import { subtotal as calcularSubtotal } from "@/lib/cart/totals";
import type { ShippingMethod, StoreSettings } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/**
 * Checkout en una sola pantalla.
 *
 * Sin pasos ni asistente: son tres datos de contacto y uno de entrega. Partirlo
 * en etapas agregaría fricción y código sin ganar nada.
 *
 * Los totales que se muestran acá son informativos. El servidor los vuelve a
 * calcular desde la base al crear el pedido, así que lo que se ve en pantalla
 * nunca es lo que se cobra: es lo que debería cobrarse, y si difiere, manda el
 * servidor.
 */
export function CheckoutForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const hidratado = useCartHydrated();

  const [enviando, startTransition] = useTransition();
  const [errores, setErrores] = useState<Record<string, string>>({});

  const [metodoEnvio, setMetodoEnvio] = useState<ShippingMethod>(
    settings.pickupEnabled ? "retiro" : "envio",
  );

  const subtotal = calcularSubtotal(items);
  const envio = costoDeEnvio(metodoEnvio, subtotal, settings);
  const total = subtotal + envio;
  const falta = metodoEnvio === "envio" ? faltaParaEnvioGratis(subtotal, settings) : null;

  function confirmar(formData: FormData) {
    setErrores({});

    const datos: DatosCheckout = {
      nombre: String(formData.get("nombre") ?? ""),
      email: String(formData.get("email") ?? ""),
      telefono: String(formData.get("telefono") ?? ""),
      metodoEnvio,
      direccion: String(formData.get("direccion") ?? ""),
      notas: String(formData.get("notas") ?? ""),
    };

    startTransition(async () => {
      const resultado = await crearPedido(useCart.getState().items, datos);

      if (!resultado.ok) {
        setErrores(resultado.errores);
        if (resultado.carritoCambio) router.push("/carrito");
        return;
      }

      // El carrito se vacía recién con el pedido ya guardado.
      clear();
      router.push(`/pedido/${resultado.accessToken}`);
    });
  }

  if (!hidratado) {
    return <p className="mt-8 text-sm text-muted">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mt-12 border border-dashed border-line py-20 text-center">
        <p className="text-ink">Tu carrito está vacío.</p>
        <Link
          href="/productos"
          className="mt-4 inline-block border-b border-ink pb-0.5 text-sm text-ink transition-opacity hover:opacity-70"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <form action={confirmar} className="mt-10 grid gap-16 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-12">
        <fieldset>
          <legend className="text-xs font-medium tracking-[0.025em] text-ink uppercase">
            Tus datos
          </legend>

          <div className="mt-5 space-y-4">
            <Campo
              name="nombre"
              label="Nombre y apellido"
              autoComplete="name"
              error={errores.nombre}
              required
            />
            <Campo
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              ayuda="Te mandamos la confirmación acá."
              error={errores.email}
              required
            />
            <Campo
              name="telefono"
              label="Teléfono"
              type="tel"
              autoComplete="tel"
              ayuda="Para coordinar la entrega por WhatsApp."
              error={errores.telefono}
              required
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium tracking-[0.025em] text-ink uppercase">
            Entrega
          </legend>

          <div className="mt-5 space-y-3">
            {settings.pickupEnabled && (
              <OpcionEntrega
                valor="retiro"
                elegido={metodoEnvio}
                onChange={setMetodoEnvio}
                titulo="Retiro en el local"
                detalle={settings.pickupAddress ?? "Coordinamos por WhatsApp."}
                costo="Sin cargo"
              />
            )}

            {settings.shippingEnabled && (
              <OpcionEntrega
                valor="envio"
                elegido={metodoEnvio}
                onChange={setMetodoEnvio}
                titulo="Envío a domicilio"
                detalle="Despachamos dentro de las 48 horas de confirmado el pago."
                costo={
                  costoDeEnvio("envio", subtotal, settings) === 0
                    ? "Sin cargo"
                    : formatPrice(settings.shippingFlatCost)
                }
              />
            )}
          </div>

          {errores.metodoEnvio && (
            <p className="mt-2 text-xs text-danger tracking-[0.025em]">{errores.metodoEnvio}</p>
          )}

          {metodoEnvio === "envio" && (
            <div className="mt-5">
              <Campo
                name="direccion"
                label="Dirección de entrega"
                autoComplete="street-address"
                ayuda="Calle, número, piso, ciudad y código postal."
                error={errores.direccion}
                required
              />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium tracking-[0.025em] text-ink uppercase">
            Notas
          </legend>
          <div className="mt-5">
            <Campo
              name="notas"
              label="Algo que quieras aclararnos"
              multilinea
              ayuda="Opcional."
            />
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-carbon-ink/15 p-6 bg-paper-white">
          <h2 className="text-xs font-medium tracking-[0.025em] text-ink uppercase">
            Tu pedido
          </h2>

          <ul className="mt-5 space-y-3 border-b border-carbon-ink/15 pb-5">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-3 text-xs tracking-[0.025em]">
                <span className="min-w-0">
                  <span className="block truncate text-ink uppercase">
                    {item.productName}
                  </span>
                  <span className="text-[11px] text-muted">
                    {item.variantName ? `${item.variantName} · ` : ""}
                    {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"}
                  </span>
                </span>
                <span className="shrink-0 text-ink">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 text-xs tracking-[0.025em]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-ink">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd className="text-ink">
                {envio > 0 ? formatPrice(envio) : "Sin cargo"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-carbon-ink/15 pt-3">
              <dt className="font-medium text-ink uppercase">Total</dt>
              <dd className="text-lg font-medium text-ink">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          {falta !== null && (
            <p className="mt-3 text-[11px] text-muted tracking-[0.025em]">
              Te faltan {formatPrice(falta)} para el envío sin cargo.
            </p>
          )}

          {errores.general && (
            <p className="mt-5 border-l-2 border-danger bg-surface p-3 text-xs text-ink tracking-[0.025em]">
              {errores.general}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 w-full bg-carbon-ink py-3 text-xs font-medium tracking-[0.025em] text-paper-white uppercase rounded-[4px] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {enviando ? "Confirmando…" : "Confirmar pedido"}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted tracking-[0.025em]">
            Coordinamos el pago por WhatsApp o transferencia en el paso
            siguiente. Todavía no se te cobra nada.
          </p>
        </div>

        <Link
          href="/carrito"
          className="mt-6 block text-center text-xs text-muted tracking-[0.025em] uppercase transition-colors hover:text-ink"
        >
          Volver al carrito
        </Link>
      </aside>
    </form>
  );
}

function Campo({
  name,
  label,
  type = "text",
  ayuda,
  error,
  required,
  autoComplete,
  multilinea,
}: {
  name: string;
  label: string;
  type?: string;
  ayuda?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  multilinea?: boolean;
}) {
  const idAyuda = ayuda ? `${name}-ayuda` : undefined;
  const idError = error ? `${name}-error` : undefined;

  const clases = cn(
    "mt-1.5 w-full border bg-canvas px-3 py-2.5 text-xs text-ink rounded-[4px] outline-none transition-colors tracking-[0.025em]",
    error ? "border-danger" : "border-carbon-ink/30 focus:border-carbon-ink",
  );

  return (
    <div>
      <label htmlFor={name} className="text-xs font-medium uppercase tracking-[0.025em] text-ink">
        {label}
        {!required && <span className="text-muted font-normal lowercase"> (opcional)</span>}
      </label>

      {multilinea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          className={clases}
          aria-describedby={cn(idAyuda, idError)}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          className={clases}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(idAyuda, idError)}
        />
      )}

      {ayuda && !error && (
        <p id={idAyuda} className="mt-1 text-[11px] text-muted tracking-[0.025em]">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1 text-[11px] text-danger tracking-[0.025em]">
          {error}
        </p>
      )}
    </div>
  );
}

function OpcionEntrega({
  valor,
  elegido,
  onChange,
  titulo,
  detalle,
  costo,
}: {
  valor: ShippingMethod;
  elegido: ShippingMethod;
  onChange: (valor: ShippingMethod) => void;
  titulo: string;
  detalle: string;
  costo: string;
}) {
  const activo = elegido === valor;

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 border p-4 rounded-none transition-colors",
        activo ? "border-carbon-ink bg-surface/50" : "border-carbon-ink/15 hover:border-carbon-ink/30",
      )}
    >
      <input
        type="radio"
        name="metodoEnvio"
        value={valor}
        checked={activo}
        onChange={() => onChange(valor)}
        className="mt-1 accent-carbon-ink"
      />

      <span className="flex-1">
        <span className="flex justify-between gap-3">
          <span className="text-xs font-medium tracking-[0.025em] text-ink uppercase">{titulo}</span>
          <span className="text-xs tracking-[0.025em] text-ink">{costo}</span>
        </span>
        <span className="mt-1 block text-[11px] text-muted tracking-[0.025em]">{detalle}</span>
      </span>
    </label>
  );
}
