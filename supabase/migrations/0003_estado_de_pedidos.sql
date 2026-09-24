-- Cambios de estado que además mueven stock.
--
-- Marcar un pedido como pagado descuenta el inventario, y cancelarlo lo
-- devuelve. Las dos cosas tienen que pasar en la misma transacción que el cambio
-- de estado: si el estado avanza y el stock no, el inventario queda mintiendo, y
-- si el stock se mueve dos veces se descuenta de más.
--
-- `orders.stock_applied_at` es lo que evita el doble descuento: marcar dos veces
-- como pagado no vuelve a tocar el stock.

-- ---------------------------------------------------------------------------
-- Pagado: descuenta el stock
-- ---------------------------------------------------------------------------
--
-- Devuelve una fila por cada producto del que no había stock suficiente. Es la
-- sobreventa que el proyecto acepta a conciencia: sin pasarela de pago, el stock
-- recién se descuenta cuando el dueño confirma el cobro, y en esa ventana dos
-- personas pueden comprar la última unidad. Cuando pasa, la venta se cobra igual
-- y el panel avisa para que el dueño lo resuelva por WhatsApp.

create or replace function marcar_pedido_pagado(p_order_id uuid)
returns table (
  product_name text,
  variant_name text,
  pedido       integer,
  descontado   integer
)
language plpgsql
as $$
declare
  v_ya_aplicado timestamptz;
begin
  -- El FOR UPDATE bloquea la fila: dos pestañas del panel marcando el mismo
  -- pedido a la vez no pueden descontar dos veces.
  select o.stock_applied_at into v_ya_aplicado
  from orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'No existe el pedido %', p_order_id;
  end if;

  update orders
     set status = 'pagado',
         stock_applied_at = coalesce(stock_applied_at, now())
   where id = p_order_id;

  -- Ya se había descontado antes: sólo se actualiza el estado.
  if v_ya_aplicado is not null then
    return;
  end if;

  return query
  with previo as (
    -- Stock tal como está antes de tocar nada. Las líneas cuya variante fue
    -- borrada del catálogo se ignoran: no hay inventario que mover.
    select
      i.variant_id,
      i.product_name as nombre,
      i.variant_name as variante,
      i.quantity     as cantidad,
      v.stock        as stock_previo
    from order_items i
    join product_variants v on v.id = i.variant_id
    where i.order_id = p_order_id
  ),
  -- Un CTE que modifica datos siempre se ejecuta, aunque el SELECT final no lo
  -- referencie. El stock nunca baja de cero.
  descuento as (
    update product_variants v
       set stock = greatest(0, v.stock - p.cantidad)
      from previo p
     where v.id = p.variant_id
    returning v.id
  )
  select
    p.nombre,
    p.variante,
    p.cantidad::integer,
    least(p.cantidad, p.stock_previo)::integer
  from previo p
  where p.stock_previo < p.cantidad;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelado: devuelve el stock si se había descontado
-- ---------------------------------------------------------------------------

create or replace function cancelar_pedido(p_order_id uuid)
returns void
language plpgsql
as $$
declare
  v_aplicado timestamptz;
begin
  select o.stock_applied_at into v_aplicado
  from orders o where o.id = p_order_id
  for update;

  if not found then
    raise exception 'No existe el pedido %', p_order_id;
  end if;

  -- Si el stock se había descontado, vuelve al inventario. Sin esto, cancelar un
  -- pedido pagado dejaría mercadería existente marcada como vendida para siempre.
  if v_aplicado is not null then
    update product_variants v
       set stock = v.stock + i.quantity
      from order_items i
     where i.order_id = p_order_id
       and i.variant_id = v.id;
  end if;

  update orders
     set status = 'cancelado',
         stock_applied_at = null
   where id = p_order_id;
end;
$$;
