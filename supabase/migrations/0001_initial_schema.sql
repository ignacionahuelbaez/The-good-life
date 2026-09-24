-- Esquema inicial de la tienda.
--
-- Convenciones:
--   * Tablas y columnas en inglés; valores de estado en español, porque el dueño
--     del negocio los lee y edita a mano desde el panel de Supabase (§1.7 del plan).
--   * Los estados se validan con CHECK y no con tipos ENUM: agregar un estado nuevo
--     es un ALTER simple en lugar de un ALTER TYPE.
--   * Los precios son numeric(12,2) y no enteros en centavos. La carga es manual
--     durante la v1, y escribir 48500.00 en el panel es mucho menos propenso a
--     errores que escribir 4850000.
--   * RLS queda activo y SIN políticas en todas las tablas: eso deniega todo acceso
--     con la clave anónima. La aplicación consulta siempre desde el servidor con la
--     clave de servicio, que omite RLS (§1.8 del plan).

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Los pedidos arrancan en 1000 para que el primer número se vea como un pedido
-- normal y no revele el volumen real del negocio.
create sequence if not exists order_number_seq start with 1000;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  description       text,
  category_id       uuid references categories (id) on delete set null,

  -- Precio base. Cada variante puede pisarlo con price_override.
  price             numeric(12,2) not null check (price >= 0),
  -- Precio anterior, sólo para mostrar el tachado en una oferta. Nunca se cobra.
  compare_at_price  numeric(12,2) check (compare_at_price >= 0),

  status            text not null default 'borrador'
                      check (status in ('borrador', 'activo')),
  featured          boolean not null default false,
  position          integer not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Un precio tachado que no es mayor al precio real es un error de carga,
  -- y se vería como un descuento negativo en la ficha.
  constraint compare_at_price_mayor check (
    compare_at_price is null or compare_at_price > price
  )
);

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url        text not null,
  alt        text,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- Todo producto tiene al menos una variante, incluso si no ofrece opciones
-- (§1.3 del plan). En ese caso lleva una sola fila con option1_name nulo, y la
-- ficha no muestra el selector. Esto le da un único camino al carrito, al stock
-- y a los ítems del pedido.
create table product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,

  -- Etiqueta que ve el comprador, por ejemplo "Talle M / Negro".
  name          text not null default 'Default',

  option1_name  text,   -- "Talle"
  option1_value text,   -- "M"
  option2_name  text,   -- "Color"
  option2_value text,   -- "Negro"

  sku           text unique,
  price_override numeric(12,2) check (price_override >= 0),
  stock         integer not null default 0 check (stock >= 0),
  position      integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Un valor de opción sin su nombre deja la variante imposible de mostrar.
  constraint option1_completa check (
    (option1_name is null) = (option1_value is null)
  ),
  constraint option2_completa check (
    (option2_name is null) = (option2_value is null)
  ),
  -- Una segunda opción sin primera significa que la carga se salteó un eje.
  constraint option2_requiere_option1 check (
    option2_name is null or option1_name is not null
  )
);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------

create table orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    integer not null unique default nextval('order_number_seq'),

  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text not null,

  shipping_method text not null check (shipping_method in ('retiro', 'envio')),
  shipping_address text,
  shipping_cost   numeric(12,2) not null default 0 check (shipping_cost >= 0),

  subtotal        numeric(12,2) not null check (subtotal >= 0),
  total           numeric(12,2) not null check (total >= 0),

  status          text not null default 'pendiente'
                    check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),

  -- Notas del comprador en el checkout.
  notes           text,
  -- Notas internas del negocio. El comprador nunca las ve.
  internal_notes  text,

  -- Permite ver el pedido en /pedido/[token] sin cuenta de usuario (§1.4 del plan).
  -- Un UUID v4 aporta 122 bits de aleatoriedad, suficiente para que no se adivine.
  access_token    text not null unique
                    default replace(gen_random_uuid()::text, '-', ''),

  -- Marca cuándo se descontó el stock, para que marcar un pedido como pagado dos
  -- veces no lo descuente dos veces (§1.6 del plan).
  stock_applied_at timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Un envío sin dirección no se puede despachar.
  constraint envio_requiere_direccion check (
    shipping_method <> 'envio' or shipping_address is not null
  )
);

-- Los ítems guardan copia del nombre y del precio. Cuando el dueño actualice
-- precios, los pedidos viejos tienen que seguir mostrando lo que el comprador
-- efectivamente pagó, así que acá no se hace join contra products.
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders (id) on delete cascade,

  -- Se conserva el pedido aunque la variante se borre del catálogo.
  variant_id   uuid references product_variants (id) on delete set null,
  product_id   uuid references products (id) on delete set null,

  product_name text not null,
  variant_name text,
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  quantity     integer not null check (quantity > 0),

  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Configuración del negocio
-- ---------------------------------------------------------------------------

-- Fila única. Vive en la base y no en el código para que cambiar el CBU o el
-- costo de envío no requiera un despliegue.
create table store_settings (
  id                boolean primary key default true check (id),

  whatsapp_number   text,          -- formato internacional sin signos: 5493411234567
  bank_holder       text,
  bank_cbu          text,
  bank_alias        text,

  pickup_enabled    boolean not null default true,
  pickup_address    text,
  shipping_enabled  boolean not null default true,
  shipping_flat_cost numeric(12,2) not null default 0 check (shipping_flat_cost >= 0),
  free_shipping_threshold numeric(12,2) check (free_shipping_threshold >= 0),

  announcement      text,          -- barra superior; nulo la oculta

  updated_at        timestamptz not null default now()
);

insert into store_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index products_category_idx on products (category_id);
create index products_status_idx   on products (status);
create index products_featured_idx on products (featured) where featured;
create index product_images_product_idx   on product_images (product_id, position);
create index product_variants_product_idx on product_variants (product_id, position);
create index categories_position_idx on categories (position);

create index orders_status_idx     on orders (status);
create index orders_created_at_idx on orders (created_at desc);
create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------

create trigger categories_updated_at       before update on categories       for each row execute function set_updated_at();
create trigger products_updated_at         before update on products         for each row execute function set_updated_at();
create trigger product_variants_updated_at before update on product_variants for each row execute function set_updated_at();
create trigger orders_updated_at           before update on orders           for each row execute function set_updated_at();
create trigger store_settings_updated_at   before update on store_settings   for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Activado sin políticas a propósito: con la clave anónima no se lee ni escribe
-- nada. Todo el acceso pasa por el servidor con la clave de servicio.
-- Si en el futuro el navegador necesitara leer el catálogo directamente, hay que
-- agregar acá una política de lectura para products/categories/variants/images.

alter table categories       enable row level security;
alter table products         enable row level security;
alter table product_images   enable row level security;
alter table product_variants enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table store_settings   enable row level security;
