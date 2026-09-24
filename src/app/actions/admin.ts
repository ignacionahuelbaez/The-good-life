"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  COOKIE_SESION,
  crearSesion,
  passwordCorrecta,
  sesionValida,
} from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import type { OrderStatus } from "@/lib/db/types";

/** Acciones del panel de pedidos. */

// --- Sesión ---------------------------------------------------------------

export async function iniciarSesion(
  _estadoPrevio: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");

  if (!passwordCorrecta(password)) {
    // Una demora corta encarece probar contraseñas a fuerza bruta sin molestar
    // a quien simplemente se equivocó al tipear.
    await new Promise((listo) => setTimeout(listo, 600));
    return { error: "Contraseña incorrecta." };
  }

  const { valor, expira } = crearSesion();
  const almacen = await cookies();

  almacen.set(COOKIE_SESION, valor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires: expira,
  });

  redirect("/admin");
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete({ name: COOKIE_SESION, path: "/admin" });
  redirect("/admin/login");
}

/** Corta la ejecución si quien llama no tiene sesión. */
async function exigirSesion(): Promise<void> {
  const almacen = await cookies();
  if (!sesionValida(almacen.get(COOKIE_SESION)?.value)) {
    redirect("/admin/login");
  }
}

// --- Estado de los pedidos ------------------------------------------------

export type ResultadoCambioEstado = {
  ok: boolean;
  error?: string;
  /** Productos de los que no había stock suficiente al cobrar. */
  sobreventa?: { producto: string; variante: string | null; pedido: number; descontado: number }[];
};

/**
 * Cambia el estado de un pedido.
 *
 * Pagado y cancelado mueven inventario, así que pasan por funciones de Postgres
 * que hacen el cambio de estado y el movimiento de stock en una sola
 * transacción. Los otros estados son un simple cambio de etiqueta.
 */
export async function cambiarEstado(
  orderId: string,
  nuevoEstado: OrderStatus,
): Promise<ResultadoCambioEstado> {
  await exigirSesion();

  try {
    if (nuevoEstado === "pagado") {
      const { data, error } = await db().rpc("marcar_pedido_pagado", {
        p_order_id: orderId,
      });
      if (error) throw new Error(error.message);

      const sobreventa = (data ?? []).map(
        (fila: {
          product_name: string;
          variant_name: string | null;
          pedido: number;
          descontado: number;
        }) => ({
          producto: fila.product_name,
          variante: fila.variant_name,
          pedido: fila.pedido,
          descontado: fila.descontado,
        }),
      );

      revalidarPanel(orderId);
      return { ok: true, sobreventa: sobreventa.length > 0 ? sobreventa : undefined };
    }

    if (nuevoEstado === "cancelado") {
      const { error } = await db().rpc("cancelar_pedido", {
        p_order_id: orderId,
      });
      if (error) throw new Error(error.message);

      revalidarPanel(orderId);
      return { ok: true };
    }

    const { error } = await db()
      .from("orders")
      .update({ status: nuevoEstado })
      .eq("id", orderId);
    if (error) throw new Error(error.message);

    revalidarPanel(orderId);
    return { ok: true };
  } catch (error) {
    console.error("[admin] no se pudo cambiar el estado:", error);
    return {
      ok: false,
      error: "No se pudo actualizar el pedido. Probá de nuevo.",
    };
  }
}

/** Guarda una nota interna. El comprador nunca la ve. */
export async function guardarNotaInterna(
  orderId: string,
  nota: string,
): Promise<{ ok: boolean }> {
  await exigirSesion();

  const { error } = await db()
    .from("orders")
    .update({ internal_notes: nota.trim() || null })
    .eq("id", orderId);

  if (error) {
    console.error("[admin] no se pudo guardar la nota:", error);
    return { ok: false };
  }

  revalidarPanel(orderId);
  return { ok: true };
}

function revalidarPanel(orderId: string): void {
  revalidatePath("/admin");
  revalidatePath(`/admin/pedido/${orderId}`);
}
