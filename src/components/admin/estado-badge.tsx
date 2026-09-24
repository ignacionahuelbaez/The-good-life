import type { OrderStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/** Etiquetas y colores de los estados, en un solo lugar. */
export const ESTADOS: Record<OrderStatus, { label: string; clase: string }> = {
  pendiente: {
    label: "Pendiente",
    clase: "bg-accent/10 text-accent",
  },
  pagado: {
    label: "Pagado",
    clase: "bg-success/10 text-success",
  },
  enviado: {
    label: "Enviado",
    clase: "bg-ink/10 text-ink",
  },
  entregado: {
    label: "Entregado",
    clase: "bg-surface text-muted",
  },
  cancelado: {
    label: "Cancelado",
    clase: "bg-surface text-muted line-through",
  },
};

export function EstadoBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, clase } = ESTADOS[status];

  return (
    <span
      className={cn(
        "inline-block px-2 py-1 text-[11px] font-medium tracking-wide uppercase",
        clase,
        className,
      )}
    >
      {label}
    </span>
  );
}
