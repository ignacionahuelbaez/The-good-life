-- Datos de desarrollo. El CLI de Supabase corre este archivo después de las
-- migraciones, en cada `supabase db reset`.
--
-- Son valores de mentira para poder probar el checkout de punta a punta. En
-- producción esta fila la completa el dueño desde el panel de Supabase, y se
-- edita ahí cada vez que cambia el CBU o el costo de envío, sin desplegar.

update store_settings set
  whatsapp_number         = '5493411234567',
  bank_holder             = 'Nombre del Titular',
  bank_cbu                = '0000003100010000000001',
  bank_alias              = 'alias.de.prueba',

  pickup_enabled          = true,
  pickup_address          = 'Córdoba 1234, Rosario. Lunes a viernes de 10 a 18.',

  shipping_enabled        = true,
  shipping_flat_cost      = 9500,
  free_shipping_threshold = 180000,

  announcement            = null
where id = true;
