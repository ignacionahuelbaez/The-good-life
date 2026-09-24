import { formatPrice } from "@/config/store";
import { cn } from "@/lib/utils";

/**
 * Precio de un producto.
 *
 * Cuando hay precio anterior muestra el tachado y destaca el vigente. El tachado
 * lleva `<s>` y no sólo una clase, para que un lector de pantalla anuncie que ese
 * precio ya no rige.
 */
export function Price({
  price,
  compareAtPrice,
  className,
  size = "base",
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  size?: "base" | "lg";
}) {
  const enOferta = compareAtPrice != null && compareAtPrice > price;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-semibold",
          size === "lg" ? "text-2xl" : "text-sm",
          enOferta && "text-accent",
        )}
      >
        {formatPrice(price)}
      </span>

      {enOferta && (
        <s className={cn("text-muted", size === "lg" ? "text-base" : "text-xs")}>
          {formatPrice(compareAtPrice)}
        </s>
      )}
    </p>
  );
}
