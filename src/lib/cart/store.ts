"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Carrito del comprador.
 *
 * Vive en localStorage y no en la base: guardar carritos de invitados sería
 * infraestructura sin beneficio a esta escala, y el carrito sobrevive igual a
 * cerrar el navegador.
 *
 * Lo que manda son `variantId` y `quantity`. El resto de los campos son una
 * copia de lo que el producto mostraba al agregarlo, y existen sólo para poder
 * dibujar el carrito sin esperar al servidor. **No son fuente de verdad**: la
 * página del carrito los revalida contra la base, y el checkout de la Fase 3 va
 * a recalcular el total ignorando por completo lo que mande el navegador.
 */

export type CartItem = {
  variantId: string;
  quantity: number;

  // Copia para render inmediato. Ver la advertencia de arriba.
  productSlug: string;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  imageUrl: string | null;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Reemplaza el carrito con lo que devolvió la revalidación del servidor. */
  replace: (items: CartItem[]) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      add: (item, quantity) =>
        set((state) => {
          const existente = state.items.find(
            (i) => i.variantId === item.variantId,
          );

          // Agregar dos veces la misma variante suma, no duplica la línea.
          if (existente) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }

          return { items: [...state.items, { ...item, quantity }] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          // Bajar a cero equivale a quitar: evita líneas fantasma en cero.
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, quantity } : i,
                ),
        })),

      remove: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      clear: () => set({ items: [] }),

      replace: (items) => set({ items }),
    }),
    {
      name: "carrito",
      // Si alguna vez cambia la forma de CartItem, subir la versión descarta los
      // carritos viejos en lugar de romper con datos de otra estructura.
      version: 1,
    },
  ),
);

// `useSyncExternalStore` necesita que estas funciones sean estables entre
// renders, así que viven fuera del hook.
const sinSuscripcion = () => () => {};
const enElCliente = () => true;
const enElServidor = () => false;

/**
 * Indica si el componente ya está corriendo en el navegador.
 *
 * El carrito vive en localStorage, que en el servidor no existe: el HTML se
 * genera siempre con el carrito vacío. Dibujar el contador antes de que React
 * hidrate mostraría un cero que cambia solo un instante después, y además
 * rompería la hidratación por diferencia con el servidor.
 *
 * Se resuelve con `useSyncExternalStore` y no con un `useState` en un efecto:
 * es el mecanismo que React ofrece para devolver un valor distinto en servidor y
 * cliente, y evita el render en cascada que provoca llamar a `setState` desde un
 * efecto.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(sinSuscripcion, enElCliente, enElServidor);
}
