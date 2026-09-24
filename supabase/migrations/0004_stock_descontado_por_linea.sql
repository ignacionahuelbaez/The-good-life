-- Registra cuánto stock se descontó realmente en cada línea del pedido.
--
-- Hasta acá, cancelar devolvía al inventario la cantidad *pedida*. Cuando hubo
-- sobreventa eso devolvía de más: si el pedido pedía 3 unidades y sólo había 1,
-- se descontaba 1 pero se devolvían 3, inventando dos unidades que nunca
-- existieron. Guardar lo efectivamente descontado es lo único que permite
-- revertir con exactitud.

alter table order_items
  add column stock_applied integer not null default 0
    check (stock_applied >= 0);

comment on column order_items.stock_applied is
  'Unidades efectivamente descontadas del inventario al cobrar el pedido. '
  'Puede ser menor a quantity si hubo sobreventa. Vuelve a 0 al cancelar.';

-- ---------------------------------------------------------------------------

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
      i.id           as item_id,
      i.variant_id,
      i.product_name as nombre,
      i.variant_name as variante,
      i.quantity     as cantidad,
      v.stock        as stock_previo,
      least(i.quantity, v.stock) as a_descontar
    from order_items i
    join product_variants v on v.id = i.variant_id
    where i.order_id = p_order_id
  ),
  -- Los CTE que modifican datos siempre se ejecutan, aunque el SELECT final no
  -- los referencie. El stock nunca baja de cero.
  descuento as (
    update product_variants v
       set stock = v.stock - p.a_descontar
      from previo p
     where v.id = p.variant_id
    returning v.id
  ),
  registro as (
    -- Se anota cuánto se descontó de verdad, para poder devolverlo exacto si
    -- después se cancela.
    update order_items i
       set stock_applied = p.a_descontar
      from previo p
     where i.id = p.item_id
    returning i.id
  )
  select
    p.nombre,
    p.variante,
    p.cantidad::integer,
    p.a_descontar::integer
  from previo p
  where p.stock_previo < p.cantidad;
end;
$$;

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

  if v_aplicado is not null then
    -- Se devuelve exactamente lo que se descontó, no lo que el pedido pedía.
    update product_variants v
       set stock = v.stock + i.stock_applied
      from order_items i
     where i.order_id = p_order_id
       and i.variant_id = v.id
       and i.stock_applied > 0;

    update order_items
       set stock_applied = 0
     where order_id = p_order_id;
  end if;

  update orders
     set status = 'cancelado',
         stock_applied_at = null
   where id = p_order_id;
end;
$$;
