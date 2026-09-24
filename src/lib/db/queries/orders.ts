import "server-only";

import { db } from "@/lib/db/client";
import type { Order, OrderStatus } from "@/lib/db/types";

/** Consultas de pedidos. */

const SELECT_PEDIDO = `
  id, order_number, customer_name, customer_email, customer_phone,
  shipping_method, shipping_address, shipping_cost,
  subtotal, total, status, notes, internal_notes, access_token, created_at,
  order_items (
    id, product_name, variant_name, unit_price, quantity, created_at
  )
`;

type FilaItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  unit_price: number | string;
  quantity: number;
  created_at: string;
};

type FilaPedido = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_method: string;
  shipping_address: string | null;
  shipping_cost: number | string;
  subtotal: number | string;
  total: number | string;
  status: string;
  notes: string | null;
  internal_notes: string | null;
  access_token: string;
  created_at: string;
  order_items: FilaItem[];
};

function aNumero(valor: number | string): number {
  return typeof valor === "number" ? valor : Number(valor);
}

function mapear(fila: FilaPedido): Order {
  return {
    id: fila.id,
    orderNumber: fila.order_number,
    customer: {
      name: fila.customer_name,
      email: fila.customer_email,
      phone: fila.customer_phone,
    },
    shippingMethod: fila.shipping_method as Order["shippingMethod"],
    shippingAddress: fila.shipping_address,
    shippingCost: aNumero(fila.shipping_cost),
    subtotal: aNumero(fila.subtotal),
    total: aNumero(fila.total),
    status: fila.status as Order["status"],
    notes: fila.notes,
    internalNotes: fila.internal_notes,
    accessToken: fila.access_token,
    createdAt: fila.created_at,
    // Se ordenan por fecha de alta para que el detalle respete el orden en que
    // se cargaron, que es el del carrito.
    items: [...fila.order_items]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        productName: item.product_name,
        variantName: item.variant_name,
        unitPrice: aNumero(item.unit_price),
        quantity: item.quantity,
      })),
  };
}

/**
 * Busca un pedido por su token de acceso.
 *
 * Ese token es lo que reemplaza a las cuentas de usuario: viaja en el email y
 * permite ver el pedido sin registrarse. Es aleatorio y no adivinable, así que
 * conocerlo es la autorización.
 */
export async function getOrderByToken(token: string): Promise<Order | null> {
  const { data, error } = await db()
    .from("orders")
    .select(SELECT_PEDIDO)
    .eq("access_token", token)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`);
  return data ? mapear(data as unknown as FilaPedido) : null;
}

/** Un pedido por su id. Para el panel, donde no se usa el token. */
export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await db()
    .from("orders")
    .select(SELECT_PEDIDO)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el pedido: ${error.message}`);
  return data ? mapear(data as unknown as FilaPedido) : null;
}

/**
 * Pedidos para el panel, del más nuevo al más viejo.
 *
 * Sin paginar: un negocio de esta escala tarda mucho en pasar los cientos de
 * pedidos, y paginar antes de necesitarlo sería agregar navegación que nadie
 * usa. El límite alto evita que la consulta crezca sin techo.
 */
export async function getOrders(
  opciones: { status?: OrderStatus } = {},
): Promise<Order[]> {
  let consulta = db()
    .from("orders")
    .select(SELECT_PEDIDO)
    .order("order_number", { ascending: false })
    .limit(500);

  if (opciones.status) consulta = consulta.eq("status", opciones.status);

  const { data, error } = await consulta;
  if (error) throw new Error(`No se pudieron leer los pedidos: ${error.message}`);

  return (data as unknown as FilaPedido[]).map(mapear);
}

/** Cuántos pedidos hay en cada estado, para las pestañas del panel. */
export async function getConteoPorEstado(): Promise<Record<string, number>> {
  const { data, error } = await db().from("orders").select("status");
  if (error) throw new Error(`No se pudo contar los pedidos: ${error.message}`);

  const conteo: Record<string, number> = {};
  for (const fila of data) {
    conteo[fila.status] = (conteo[fila.status] ?? 0) + 1;
  }
  return conteo;
}
