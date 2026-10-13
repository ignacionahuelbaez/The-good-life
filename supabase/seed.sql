-- Datos de desarrollo. El CLI de Supabase corre este archivo después de las
-- migraciones, en cada `supabase db reset`.
--
-- Son valores de mentira para poder probar el checkout de punta a punta. En
-- producción esta fila la completa el dueño desde el panel de Supabase, y se
-- edita ahí cada vez que cambia el CBU o el costo de envío, sin desplegar.

update store_settings set
  whatsapp_number         = '5493425849859',
  bank_holder             = 'Laura Victoria Barragán',
  bank_cbu                = '3840200500000034919525',
  bank_alias              = 'sivesco.arg',

  pickup_enabled          = true,
  pickup_address          = 'Juan José paso 3954, Santa Fe, CP 3000',

  shipping_enabled        = true,
  shipping_flat_cost      = 10000,
  free_shipping_threshold = 120000,

  announcement            = null
where id = true;
