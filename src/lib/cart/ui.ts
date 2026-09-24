"use client";

import { create } from "zustand";

/**
 * Si el panel del carrito está abierto.
 *
 * Va aparte del carrito y sin persistir: es estado de interfaz, no del pedido.
 * Existe porque el panel se dibuja en la cabecera pero lo abre el botón de la
 * ficha de producto, que está en otra rama del árbol.
 */
export const useCartUI = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
