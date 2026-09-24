import "server-only";

import { db } from "@/lib/db/client";
import type { StoreSettings } from "@/lib/db/types";

/**
 * Datos operativos del negocio: WhatsApp, datos bancarios y envíos.
 *
 * Viven en la base y no en el código para que el dueño pueda cambiar el CBU o el
 * costo de envío desde el panel de Supabase, sin depender de un despliegue.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await db()
    .from("store_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    throw new Error(`No se pudo leer la configuración: ${error.message}`);
  }

  return {
    whatsappNumber: data.whatsapp_number,
    bank: {
      holder: data.bank_holder,
      cbu: data.bank_cbu,
      alias: data.bank_alias,
    },
    pickupEnabled: data.pickup_enabled,
    pickupAddress: data.pickup_address,
    shippingEnabled: data.shipping_enabled,
    shippingFlatCost: Number(data.shipping_flat_cost),
    freeShippingThreshold:
      data.free_shipping_threshold !== null
        ? Number(data.free_shipping_threshold)
        : null,
    announcement: data.announcement,
  };
}
