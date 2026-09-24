-- Creación atómica de pedidos.
--
-- Guardar el pedido y sus ítems con dos INSERT separados desde la aplicación no
-- es atómico: si el segundo falla, queda un pedido sin ítems, que es corrupción
-- silenciosa justo en el dato más importante del sistema. Esta función hace las
-- dos cosas en una sola transacción.
--
-- La lógica de negocio — revalidar precios, decidir el costo de envío, calcular
-- el total — vive en la aplicación. Acá abajo sólo se garantiza que el pedido
-- entra completo o no entra.

create or replace function crear_pedido(
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_shipping_method  text,
  p_shipping_address text,
  p_shipping_cost    numeric,
  p_subtotal         numeric,
  p_total            numeric,
  p_notes            text,
  -- [{ variant_id, product_id, product_name, variant_name, unit_price, quantity }]
  p_items            jsonb
)
returns table (
  id           uuid,
  order_number integer,
  access_token text
)
language plpgsql
as $$
declare
  v_order orders%rowtype;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Un pedido no puede estar vacío';
  end if;

  insert into orders (
    customer_name, customer_email, customer_phone,
    shipping_method, shipping_address, shipping_cost,
    subtotal, total, notes
  )
  values (
    p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_method, p_shipping_address, p_shipping_cost,
    p_subtotal, p_total, nullif(trim(p_notes), '')
  )
  returning * into v_order;

  insert into order_items (
    order_id, variant_id, product_id,
    product_name, variant_name, unit_price, quantity
  )
  select
    v_order.id,
    (item ->> 'variant_id')::uuid,
    (item ->> 'product_id')::uuid,
    item ->> 'product_name',
    item ->> 'variant_name',
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer
  from jsonb_array_elements(p_items) as item;

  return query
    select v_order.id, v_order.order_number, v_order.access_token;
end;
$$;
