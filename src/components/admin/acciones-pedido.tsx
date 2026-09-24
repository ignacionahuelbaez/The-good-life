"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cambiarEstado,
  guardarNotaInterna,
  type ResultadoCambioEstado,
} from "@/app/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/**
 * Acciones sobre un pedido.
 *
 * Sólo se ofrece el paso siguiente, no todos los estados posibles: el trabajo
 * del dueño es avanzar el pedido, y una lista con los cinco estados invita a
 * equivocarse. Cancelar está siempre, pero apartado y con confirmación, porque
 * mueve inventario.
 */

const SIGUIENTE: Partial<Record<OrderStatus, { estado: OrderStatus; label: string; nota?: string }>> =
  {
    pendiente: {
      estado: "pagado",
      label: "Marcar como pagado",
      nota: "Descuenta el stock de los productos.",
    },
    pagado: { estado: "enviado", label: "Marcar como enviado" },
    enviado: { estado: "entregado", label: "Marcar como entregado" },
  };

export function AccionesPedido({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ResultadoCambioEstado | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const siguiente = SIGUIENTE[status];
  const cancelable = status !== "cancelado" && status !== "entregado";

  function ejecutar(nuevoEstado: OrderStatus) {
    setResultado(null);
    startTransition(async () => {
      const salida = await cambiarEstado(orderId, nuevoEstado);
      setResultado(salida);
      setConfirmandoCancelar(false);
      if (salida.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {siguiente && (
        <div>
          <button
            type="button"
            onClick={() => ejecutar(siguiente.estado)}
            disabled={pendiente}
            className="w-full bg-brand py-3 text-sm font-medium tracking-wide text-brand-ink uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : siguiente.label}
          </button>

          {siguiente.nota && (
            <p className="mt-2 text-center text-xs text-muted">
              {siguiente.nota}
            </p>
          )}
        </div>
      )}

      {cancelable && (
        <div>
          {confirmandoCancelar ? (
            <div className="border border-danger p-3">
              <p className="text-sm text-ink">
                ¿Cancelar el pedido?
                {status === "pagado" || status === "enviado"
                  ? " El stock descontado vuelve al inventario."
                  : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => ejecutar("cancelado")}
                  disabled={pendiente}
                  className="flex-1 bg-danger py-2 text-xs font-medium tracking-wide text-brand-ink uppercase disabled:opacity-60"
                >
                  Sí, cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoCancelar(false)}
                  className="flex-1 border border-line py-2 text-xs text-muted"
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoCancelar(true)}
              className="w-full border border-line py-2.5 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      )}

      {resultado?.error && (
        <p className="border-l-2 border-danger bg-surface p-3 text-sm text-ink">
          {resultado.error}
        </p>
      )}

      {resultado?.sobreventa && (
        <div className="border-l-2 border-accent bg-surface p-3">
          <p className="text-sm font-medium text-ink">
            Vendiste más unidades de las que había
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {resultado.sobreventa.map((linea, i) => (
              <li key={i}>
                {linea.producto}
                {linea.variante ? ` · ${linea.variante}` : ""}: el pedido pide{" "}
                {linea.pedido} y había {linea.descontado}.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            El pedido quedó cobrado igual. Avisale al comprador antes de
            despachar.
          </p>
        </div>
      )}
    </div>
  );
}

/** Nota interna del pedido. No la ve el comprador. */
export function NotaInterna({
  orderId,
  valorInicial,
}: {
  orderId: string;
  valorInicial: string;
}) {
  const [nota, setNota] = useState(valorInicial);
  const [pendiente, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  const cambio = nota !== valorInicial;

  return (
    <div>
      <label
        htmlFor="nota-interna"
        className="text-sm font-medium tracking-wide text-ink uppercase"
      >
        Nota interna
      </label>
      <p className="mt-1 text-xs text-muted">Sólo la ves vos.</p>

      <textarea
        id="nota-interna"
        value={nota}
        rows={3}
        onChange={(e) => {
          setNota(e.target.value);
          setGuardado(false);
        }}
        className="mt-2 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={!cambio || pendiente}
          onClick={() =>
            startTransition(async () => {
              const salida = await guardarNotaInterna(orderId, nota);
              if (salida.ok) setGuardado(true);
            })
          }
          className={cn(
            "border border-line px-4 py-1.5 text-xs tracking-wide uppercase transition-colors",
            cambio && !pendiente
              ? "text-ink hover:border-ink"
              : "text-muted opacity-60",
          )}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>

        {guardado && !cambio && (
          <span className="text-xs text-success">Guardado</span>
        )}
      </div>
    </div>
  );
}
