# Arquitectura del proyecto — mapa técnico para retomar el trabajo

> Este documento describe **qué existe y cómo está construido**: stack,
> estructura de carpetas, modelo de datos, flujos principales y convenciones.
> Está escrito para que un agente de IA que nunca vio este proyecto pueda
> orientarse con el mínimo de análisis adicional.
>
> El documento hermano, `docs/decisiones-y-contexto.md`, explica **por qué**
> está construido así — el razonamiento de negocio detrás de cada decisión de
> alcance. Léelo si algo acá parece una limitación arbitraria: probablemente
> es una decisión deliberada, no un olvido. En particular, antes de proponer
> Mercado Pago, login de clientes, reservas de stock o un CMS de productos,
> conviene revisar la sección 3.11 de ese documento (lista cerrada de lo que
> se decidió no construir).

## 1. Resumen ejecutivo

Ecommerce de un solo negocio (no una plataforma multi-tenant): catálogo,
carrito, checkout, pedidos y un panel de pedidos. El pago se coordina fuera
del sitio, por WhatsApp o transferencia bancaria — no hay pasarela de pago.

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, React 19,
Tailwind CSS v4, Supabase (Postgres + Storage), Zustand (carrito), Resend
(emails), pnpm.

**Estado actual (ver sección 14 para el detalle por fase):** el motor
completo de venta y operación funciona — Fase 4 de un plan de 8 fases (0-7).
Lo que falta es sobre todo contenido real y configuración de producción, no
funcionalidad. El catálogo cargado hoy es 100% de demostración.

## 2. Filosofía arquitectónica

Una sola frase la resume: **Server Components que llaman funciones de
consulta, y Server Actions para las mutaciones.** No hay capa de
repositorios, ni tRPC, ni GraphQL, ni ORM, ni arquitectura hexagonal, ni
inyección de dependencias, ni monorepo. Esto es deliberado, no un atajo por
falta de tiempo — ver `docs/decisiones-y-contexto.md` §3.11.

Reglas que sostienen todo el sistema:

1. **El navegador nunca habla con la base.** Todas las tablas tienen Row
   Level Security activo **sin ninguna política**, así que la clave anónima
   de Supabase no lee ni escribe nada. Todo el acceso pasa por el servidor
   con la clave de servicio (`src/lib/db/client.ts`), protegida por el import
   `server-only`, que hace fallar el build si un Client Component intenta
   importarla.

2. **Único lugar que consulta la base: `src/lib/db/queries/`.** Si un
   archivo fuera de esa carpeta importa `db()` de `lib/db/client.ts`, está
   mal ubicado. Los Server Components llaman a esas funciones; las
   mutaciones van por Server Actions en `src/app/actions/`.

3. **El cliente nunca manda precios que se cobren de verdad.** El carrito en
   el navegador guarda `variantId` y `quantity`, más una copia de
   nombre/precio que sirve únicamente para dibujar el carrito al instante sin
   esperar al servidor. Al confirmar el pedido, el servidor ignora
   completamente lo que mandó el navegador salvo `variantId` y `quantity`, y
   recalcula precio, envío y total desde la base. Un precio editado con las
   herramientas de desarrollador del navegador no tiene ningún efecto.

4. **El pedido se guarda entero o no se guarda.** `crear_pedido` es una
   función de Postgres que inserta el pedido y sus ítems en una sola
   transacción — ver sección 5.

5. **Los emails nunca pueden tumbar una venta.** Salen después de que el
   pedido ya está guardado; si fallan, el pedido sigue existiendo y el dueño
   lo ve igual en el panel.

6. **El stock se descuenta al cobrar, no al comprar.** Ver sección 5 y
   `docs/decisiones-y-contexto.md` §3.6.

7. **Las páginas de catálogo se regeneran cada 60 segundos**
   (`export const revalidate = 60`), no en cada request ni sólo en el build.
   Sin esto, después de correr `pnpm db:seed` (que recrea los productos con
   IDs nuevos) las páginas servidas seguirían apuntando a IDs viejos hasta el
   próximo deploy.

8. **La marca se edita en un solo lugar.** Nombre, textos institucionales y
   enlaces en `src/config/store.ts`; colores y tipografía en tokens CSS
   (`src/app/globals.css`, bloque `:root`). Los componentes usan sólo nombres
   semánticos (`bg-surface`, `text-muted`, `bg-brand`), nunca colores
   literales — esto permitió, en una sesión posterior, cambiar toda la
   paleta del sitio editando un único archivo (ver
   `docs/decisiones-y-contexto.md` §5.3).

## 3. Estructura de carpetas

```
src/
  app/
    (tienda)/                 layout público (grupo de rutas, no aparece en la URL)
      page.tsx                home
      productos/page.tsx      catálogo completo
      producto/[slug]/        ficha de producto (prerenderizada, revalidate=60)
      carrito/page.tsx        carrito, revalida contra la base al entrar
      checkout/page.tsx       formulario de compra en una sola pantalla
      pedido/[token]/         seguimiento de pedido (reemplaza cuenta de usuario)
      layout.tsx               Header + <main> + Footer
    admin/
      login/page.tsx          login del panel (fuera del control de acceso)
      (panel)/                grupo de rutas protegido
        layout.tsx             VERIFICA LA SESIÓN ACÁ (no en proxy.ts) + logout
        page.tsx                lista de pedidos, filtrable por estado
        pedido/[id]/page.tsx    detalle, cambio de estado, nota interna
      layout.tsx               layout común a admin/login y admin/(panel), sin header/footer de tienda
    actions/                  Server Actions ("use server")
      checkout.ts              crearPedido — el corazón de la seguridad del proyecto
      cart.ts                  revalidarCarrito
      admin.ts                 login/logout, cambiarEstado, guardarNotaInterna
    layout.tsx                 layout raíz: sólo <html>/<body> y la fuente Inter
    not-found.tsx              404 genérico
    globals.css                tokens de diseño (:root) — ÚNICO lugar de color
  components/
    tienda/                   ProductCard, VariantPicker, CartDrawer, Logo, etc.
    admin/                    EstadoBadge, AccionesPedido, LoginForm
    ui/                       sheet.tsx (panel lateral accesible sobre Radix Dialog)
    icons.tsx                 SVG hechos a mano, sin librería de íconos
  config/
    store.ts                  identidad de marca: nombre, textos, enlaces, formatPrice()
    Logo(The good life).JPG   logo recibido, SIN USAR todavía (ver docs/decisiones-y-contexto.md §5)
  lib/
    db/
      client.ts                cliente Supabase, server-only, clave de servicio
      types.ts                 tipos de dominio (Product, Order, Variant, StoreSettings...)
      queries/                 ÚNICO lugar que consulta la base
        products.ts products, categories.ts categorías, orders.ts pedidos,
        cart.ts revalidación de carrito, settings.ts store_settings
    cart/
      store.ts                  Zustand + persist(localStorage), CartItem
      totals.ts                 cálculo puro de totales (usado en cliente y servidor)
      shipping.ts               costoDeEnvio(), faltaParaEnvioGratis()
      ui.ts                     estado de apertura del panel lateral (Zustand, sin persistir)
    email/
      send.ts                   Resend o fallback a archivo/consola, nunca lanza
      order.ts                  arma los dos emails transaccionales del pedido
      html.ts                   helpers de maquetado con tablas (compatibilidad email)
    admin/auth.ts               contraseña única + cookie firmada con HMAC
    variants.ts                 lógica pura de selección de variantes/ejes
    whatsapp.ts                 construye los links wa.me con mensaje pre-armado
    placeholder.ts              bloques de color para productos sin foto (TEMPORAL)
    utils.ts                    cn() — merge de clases Tailwind
data/
  demo/                        catálogo de demostración (explícitamente falso)
    catalogo.json               productos + categorías
    README.md                   formato del JSON y cómo reemplazarlo por el real
    imagenes/                   fotos referenciadas por catalogo.json (vacío hoy)
scripts/
  seed.ts                      carga catalogo.json + imagenes/ a Supabase (vacía y recarga)
supabase/
  migrations/                  esquema versionado, se aplica en orden
    0001_initial_schema.sql     tablas, índices, triggers, RLS
    0002_crear_pedido.sql       función crear_pedido (transacción atómica)
    0003_estado_de_pedidos.sql  marcar_pedido_pagado, cancelar_pedido
    0004_stock_descontado_por_linea.sql   corrige la devolución de stock en sobreventa
docs/
  decisiones-y-contexto.md     el "por qué" — léelo junto con este archivo
  arquitectura-del-proyecto.md  este archivo
```

## 4. Modelo de datos

Convenciones del esquema: tablas y columnas en inglés; **valores de estado en
español** porque el dueño del negocio los lee y edita a mano desde Supabase
Studio. Los estados se validan con `CHECK`, no con `ENUM`, para que agregar
un estado nuevo sea un `ALTER` simple. Los precios son `numeric(12,2)`, no
enteros en centavos — la carga es manual, y escribir `48500.00` es menos
propenso a error que `4850000`.

```
categories        id, slug, name, description, position
products          id, slug, name, description, category_id,
                   price, compare_at_price, status('borrador'|'activo'),
                   featured, position
product_images     id, product_id, url, alt, position
product_variants   id, product_id, name, option1_name, option1_value,
                   option2_name, option2_value, sku, price_override,
                   stock, position
orders             id, order_number(secuencia desde 1000), customer_{name,email,phone},
                   shipping_method('retiro'|'envio'), shipping_address, shipping_cost,
                   subtotal, total,
                   status('pendiente'|'pagado'|'enviado'|'entregado'|'cancelado'),
                   notes, internal_notes, access_token(único, no adivinable),
                   stock_applied_at(evita doble descuento)
order_items        id, order_id, variant_id, product_id,
                   product_name, variant_name, unit_price, quantity,
                   stock_applied(unidades realmente descontadas, desde migración 0004)
store_settings     fila única (id boolean primary key default true):
                   whatsapp_number, bank_holder, bank_cbu, bank_alias,
                   pickup_enabled, pickup_address,
                   shipping_enabled, shipping_flat_cost, free_shipping_threshold,
                   announcement
```

Dos detalles de diseño que evitan bugs sutiles más adelante:

- **`order_items` guarda copia del nombre y el precio, no un join contra
  `products`.** Cuando el dueño sube un precio, los pedidos viejos tienen
  que seguir mostrando lo que el comprador efectivamente pagó. Un join
  rompería el historial en la primera actualización de precio. También:
  `variant_id`/`product_id` son `on delete set null`, así que el pedido
  sobrevive aunque el producto se borre del catálogo.

- **`store_settings` vive en la base, no en el código.** Así el dueño puede
  cambiar el CBU o el costo de envío sin depender de un despliegue. Hoy
  **todos sus campos están en `null`** (ver
  `docs/decisiones-y-contexto.md` §6.2) — no hay pantalla en el admin para
  editarlos, se cargan directo en Supabase Studio o el dashboard en
  producción.

**Todo producto tiene al menos una variante, incluso sin opciones** (fila con
`option1_name` nulo, `name = 'Default'`). Esto le da al carrito, al stock y a
los ítems del pedido un solo camino de código en vez de dos — ver
`docs/decisiones-y-contexto.md` §3.3.

### Funciones de Postgres (en `supabase/migrations/`)

- **`crear_pedido(...)`** — inserta el pedido y sus `order_items` en una
  transacción; recibe los ítems como `jsonb`. Si algo falla, no queda nada
  a medio guardar.
- **`marcar_pedido_pagado(order_id)`** — cambia el estado a `pagado` y
  descuenta stock, todo en una transacción con `FOR UPDATE` (evita doble
  descuento si dos pestañas del panel marcan el mismo pedido a la vez).
  Devuelve una fila por cada línea donde no había stock suficiente — es la
  sobreventa aceptada a conciencia (ver
  `docs/decisiones-y-contexto.md` §3.6). El stock nunca baja de cero
  (`greatest`/`least` en la migración 0004), y registra en
  `order_items.stock_applied` cuánto se descontó *de verdad*, no lo que el
  pedido pedía.
- **`cancelar_pedido(order_id)`** — si el pedido ya había descontado stock
  (`stock_applied_at` no nulo), lo devuelve usando `stock_applied` (no
  `quantity`), para no inventar unidades en caso de sobreventa previa.

## 5. Flujo end-to-end de una compra

1. **Catálogo** (`(tienda)/productos/page.tsx`, `producto/[slug]/page.tsx`) —
   Server Components que llaman `getProducts()` / `getProductBySlug()` de
   `lib/db/queries/products.ts`. Las fichas se prerenderizan
   (`generateStaticParams`) y se revalidan cada 60s.

2. **Selección de variante** — `VariantPicker` (`components/tienda/
   variant-picker.tsx`) deriva los "ejes" (Talle, Color) de las variantes
   cargadas con `derivarEjes()` de `lib/variants.ts`, y usa
   `hayStockPara()` para marcar como agotada una combinación sin ocultarla
   (el comprador ve que su talle existe, sólo que no hay stock).

3. **Agregar al carrito** — `AddToCart` llama `useCart().add()`
   (`lib/cart/store.ts`, Zustand + `persist` en localStorage) y abre el
   panel lateral (`useCartUI`, estado separado y sin persistir porque el
   panel se dibuja en el header pero lo abre un botón en otra rama del
   árbol). El carrito en el navegador **no es fuente de verdad** — sólo
   sirve para dibujar sin esperar al servidor.

4. **Página `/carrito`** — al montar, llama al Server Action
   `revalidarCarrito()` (`app/actions/cart.ts` → `getVariantesEnCarrito()`
   en `lib/db/queries/cart.ts`) para comparar lo guardado contra la base
   real: detecta productos eliminados, agotados, con cantidad reducida por
   falta de stock, o con precio cambiado, y se lo muestra al comprador antes
   del checkout.

5. **Checkout** (`CheckoutForm` → Server Action `crearPedido()` en
   `app/actions/checkout.ts`) — **el punto crítico de seguridad de todo el
   proyecto**. Valida los campos del formulario sin librería (son 5 campos),
   vuelve a pedir `getVariantesEnCarrito()` con los `variantId` del carrito,
   y arma las líneas del pedido **enteramente con datos de la base**: precio,
   nombre, stock disponible. Cualquier precio que haya viajado desde el
   navegador se descarta. Calcula el envío con `costoDeEnvio()`
   (`lib/cart/shipping.ts`, tarifa plana con umbral de envío gratis opcional)
   y llama al RPC `crear_pedido` de Postgres.

6. **Después de guardado el pedido** — se disparan en paralelo dos emails
   (`emailParaComprador` y `emailParaNegocio` de `lib/email/order.ts`) vía
   `enviarEmail()` (`lib/email/send.ts`). Si Resend falla o no hay
   `RESEND_API_KEY`, no se lanza excepción: el email se guarda como archivo
   `.html` en `.emails/` (ignorada por git) para poder revisarlo en el
   navegador, y la venta ya guardada no se ve afectada.

7. **Confirmación y seguimiento** (`/pedido/[token]`) — página dinámica
   (`force-dynamic`, se lee en vivo) que muestra el estado del pedido, las
   instrucciones de pago (link de WhatsApp con mensaje pre-armado vía
   `linkConfirmacion()` en `lib/whatsapp.ts`, y/o datos bancarios de
   `store_settings`), y el detalle completo. El `access_token` en la URL es
   la única autorización — reemplaza el login (ver
   `docs/decisiones-y-contexto.md` §3.4).

## 6. Flujo de operación (panel `/admin`)

- **Acceso** — una sola contraseña en `ADMIN_PASSWORD` (variable de
  entorno). `lib/admin/auth.ts` firma una cookie con HMAC-SHA256 usando la
  propia contraseña como secreto: cambiar la contraseña invalida todas las
  sesiones abiertas automáticamente, que es el comportamiento esperado (no
  hace falta lista de revocación). La comparación de contraseña usa
  `timingSafeEqual` sobre los HMAC (no sobre el texto plano) para no filtrar
  por tiempo cuánto del intento era correcto.
- **Dónde se verifica la sesión** — en `admin/(panel)/layout.tsx`, no en
  `proxy.ts` (el middleware de Next 16). Motivo explícito en el propio
  código: el proxy puede terminar ejecutándose en un CDN lejos del runtime
  que lee la base; verificar en el layout la pone en el mismo lugar donde se
  renderizan los datos. `/admin/login` vive **fuera** de ese grupo de rutas
  para no quedar atrapado en un bucle de redirecciones.
- **Lista de pedidos** (`admin/(panel)/page.tsx`) — filtrable por estado vía
  `searchParams`, con contador por estado (`getConteoPorEstado()`).
  `force-dynamic`: nunca se cachea, el dueño siempre ve el estado actual.
- **Detalle y acciones** (`admin/(panel)/pedido/[id]/page.tsx` +
  `AccionesPedido`) — sólo ofrece **el paso siguiente** del pedido
  (pendiente→pagado→enviado→entregado), no los 5 estados sueltos, para no
  invitar a saltarse pasos. Cancelar está siempre disponible pero requiere
  confirmación explícita porque mueve inventario. Al marcar "pagado", si el
  Server Action `cambiarEstado()` (`app/actions/admin.ts`) detecta
  sobreventa (el RPC devuelve filas), se lo muestra al admin con un aviso
  claro para que avise al comprador antes de despachar.
- **Nota interna** — campo de texto libre que el comprador nunca ve
  (`internal_notes`, distinto de `notes` que sí escribe el comprador en el
  checkout).
- **Contacto directo** — botón que abre WhatsApp al comprador
  (`linkAlComprador()`), y un link para ver el pedido "como lo ve el
  comprador" (abre `/pedido/[token]` en una pestaña nueva).

## 7. Sistema de carrito (`src/lib/cart/`)

- **`store.ts`** — Zustand con middleware `persist` sobre localStorage
  (clave `"carrito"`, versión 1 — subir la versión descarta carritos viejos
  con forma distinta en vez de romper). Agregar la misma variante dos veces
  suma cantidad, no duplica la línea. Bajar la cantidad a 0 elimina la línea.
  Expone `useCartHydrated()`, que usa `useSyncExternalStore` (no
  `useState`+`useEffect`) para saber si ya se está en el cliente: el HTML
  del servidor siempre renderiza el carrito vacío porque localStorage no
  existe ahí, y dibujar un contador que cambia un instante después de
  hidratar rompería la hidratación de React.
- **`totals.ts`** — funciones puras (`subtotal`, `contarUnidades`,
  `subtotalDeLinea`), usadas tanto en el cliente para mostrar como en la
  lógica que valida montos.
- **`shipping.ts`** — `costoDeEnvio()` es tarifa plana con umbral de envío
  gratis opcional, función pura usada en cliente (para mostrar) y en el
  Server Action de checkout (para cobrar). Nada de cálculo por zona ni
  integración con correo.
- **`ui.ts`** — sólo si el panel lateral está abierto; store de Zustand
  separado y sin persistir porque es estado de interfaz, no del pedido.

## 8. Sistema de variantes (`src/lib/variants.ts`)

Funciones puras, deliberadamente separadas de los componentes porque
deciden qué puede comprar el cliente — un error acá habilita comprar algo
sin stock o esconde algo disponible:

- `derivarEjes(variants)` — extrae los ejes (p. ej. "Talle", "Color") de las
  variantes cargadas, conservando el orden de carga.
- `seleccionInicial(variants, ejes)` — arranca en la primera variante con
  stock, o en la primera si ninguna tiene.
- `encontrarVariante(variants, seleccion, ejes)` — la variante exacta que
  corresponde a lo elegido.
- `hayStockPara(variants, seleccion, ejes, ejeEvaluado)` — si queda stock
  para un valor de un eje, dado lo ya elegido en los otros ejes. Permite que
  "Talle L" aparezca disponible en negro y agotado en chocolate a la vez.

## 9. Sistema de emails (`src/lib/email/`)

- **`send.ts`** — `enviarEmail()` nunca lanza excepción. Sin
  `RESEND_API_KEY`, guarda el email como archivo `.html` en `.emails/` (para
  poder abrirlo y revisarlo) y loguea en consola; con la clave, usa el SDK
  de Resend. `EMAIL_FROM` por defecto cae en `onboarding@resend.dev`, el
  remitente de prueba de Resend, que **sólo puede entregar al correo del
  dueño de la cuenta de Resend** hasta que se verifique un dominio propio.
- **`order.ts`** — arma los dos emails del pedido: `emailParaComprador()`
  (instrucciones de pago si `store_settings` las tiene cargadas, detalle,
  botón a `/pedido/[token]`) y `emailParaNegocio()` (todo lo necesario para
  despachar sin abrir el panel, con `replyTo` apuntando al comprador para
  que responder el aviso le escriba directamente a él).
- **`html.ts`** — helpers de maquetado con `<table>` (compatibilidad con
  clientes de correo viejos). **Tiene su propia paleta de colores en estilos
  inline**, independiente de los tokens CSS del sitio — no se actualizó
  cuando cambió la paleta general (ver
  `docs/decisiones-y-contexto.md` §5.3 y §5.5).

## 10. Identidad de marca y sistema visual

- **`src/config/store.ts`** — único lugar con el nombre (`"The Good Life"`),
  tagline, descripción, dominio, email de contacto, locale/currency y
  `formatPrice()`. `url` y `contact.email` siguen siendo placeholders (ver
  `docs/decisiones-y-contexto.md` §6.1).
- **`src/app/globals.css`** — bloque `:root` con los tokens de color:
  `--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--brand`/
  `--brand-ink`, `--accent`, `--success`, `--danger`. Mapeados a nombres de
  Tailwind vía `@theme inline`. Paleta cálida (crema/taupe/terracota)
  inspirada en el logo de la marca — ver
  `docs/decisiones-y-contexto.md` §5 para el detalle y el porqué de cada
  valor.
- **`src/components/tienda/logo.tsx`** — wordmark tipográfico temporal,
  reemplaza al archivo `src/config/Logo(The good life).JPG` (JPG sin
  transparencia, no usado en el sitio). Es el único componente que dibuja el
  nombre como logo; header y footer lo usan en vez de texto suelto. Cuando
  exista un logo definitivo con transparencia, sólo hace falta editar este
  archivo.
- **`src/lib/placeholder.ts`** — genera bloques de color para productos sin
  foto, usando el color real declarado en las variantes del producto (para
  que dos prendas se distingan a simple vista en la grilla). Explícitamente
  **temporal**: se deja de usar solo cuando el catálogo real tenga fotos, sin
  tocar el componente que lo llama (`ProductImage`).
- **Una sola fuente:** Inter, con los pesos haciendo toda la jerarquía
  tipográfica (mayúsculas + peso, no una segunda familia). No hay modo
  oscuro, a propósito: duplicaría el trabajo de diseño y las fotos de
  producto se ven peor sobre fondo oscuro.

## 11. Autenticación admin

Ver sección 6. Resumido: sin tabla de usuarios, sin roles, una contraseña en
`ADMIN_PASSWORD`, cookie firmada con HMAC (`lib/admin/auth.ts`). No hay
pantalla para cambiar la contraseña porque no hay sistema de usuarios — se
cambia editando la variable de entorno y redesplegando (o reiniciando en
desarrollo).

## 12. Catálogo y carga de datos

- **`data/demo/`** — catálogo de demostración, explícitamente falso (ver su
  propio README). Diseñado a propósito para cubrir casos límite: variantes
  con 2 ejes, 1 eje o ninguno, productos agotados totalmente o en
  combinaciones puntuales, ofertas con precio tachado, nombres largos,
  descripciones cortas y largas, 1 vs. varias fotos. **No trae fotos** — por
  eso existe `lib/placeholder.ts`.
- **`scripts/seed.ts`** — lee un `catalogo.json` (formato documentado en
  `data/demo/README.md`) más una carpeta de imágenes, sube las fotos a
  Supabase Storage (bucket `productos`), y **vacía y recarga** categorías,
  productos y variantes. No es un script "de demo": es el cargador de
  catálogo del proyecto. Se ejecuta con `pnpm db:seed` (usa `data/demo` por
  defecto) o `pnpm db:seed data/catalogo` quando exista el catálogo real.
  Los pedidos existentes no se tocan — conservan su propia copia de nombre y
  precio (ver sección 4).
- **Reemplazo por el catálogo real** — armar `data/catalogo/catalogo.json`
  con el mismo formato, poner las fotos en `data/catalogo/imagenes/`, correr
  `pnpm db:seed data/catalogo`. `data/demo/` se borra cuando el catálogo real
  esté cargado y verificado.
- **No existe hoy una forma de editar un solo producto sin re-subir todo el
  catálogo o editar Supabase Studio a mano** — no hay pantalla de alta/baja/
  modificación de productos en el admin, por decisión de alcance (ver
  `docs/decisiones-y-contexto.md` §3.2).

## 13. Convenciones de código

- **`server-only`** en cualquier módulo que use la clave de servicio de
  Supabase — hace fallar el build si un Client Component lo importa.
- **`cn()`** (`lib/utils.ts`) — `clsx` + `tailwind-merge`, para que un
  componente acepte `className` y pueda pisar sus propias clases sin
  conflicto.
- **Nombres de función y variable en español** para la lógica de negocio
  (`crearPedido`, `revalidarCarrito`, `cambiarEstado`, `costoDeEnvio`), en
  inglés para tipos de dominio y nombres de tabla/columna (`Product`,
  `Order`, `customer_email`). Los mensajes de error y el copy de interfaz
  están en español (es-AR).
- **Componentes `"use client"` sólo donde hace falta interactividad**
  (carrito, formularios, panel lateral); todo lo demás son Server
  Components por defecto.
- **Next.js 16, no 15.** Cambios que ya afectaron el código y no hay que
  reaprender de memoria de entrenamiento: `params`/`searchParams` son
  `Promise` (ver el `await props.params` en cualquier página con ruta
  dinámica), existen los helpers globales `PageProps<'/ruta'>` /
  `LayoutProps<'/ruta'>` generados por `next typegen`, `middleware.ts` se
  llama ahora `proxy.ts`, `images.domains` está deprecado en favor de
  `images.remotePatterns`, y `next lint` fue eliminado (se usa el CLI de
  ESLint directo, ya reflejado en el script `lint` de `package.json`). Antes
  de escribir código de Next nuevo, conviene leer
  `node_modules/next/dist/docs/` — el propio `AGENTS.md` del repo (bloque
  auto-generado por `next dev`) lo indica.

## 14. Comandos y variables de entorno

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm lint` | ESLint (CLI directo, no `next lint`) |
| `pnpm db:seed [carpeta]` | Carga un catálogo (default `data/demo`) |
| `pnpm db:reset` | Reinicia la base local desde las migraciones |
| `pnpm db:types` | Regenera tipos desde el esquema (necesita `SUPABASE_PROJECT_ID`) |

Variables de entorno (`.env.local`, ver `.env.example`):

| Variable | Estado al 2026-09-15 | Efecto si falta |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | configuradas, apuntan al Supabase **local** | la app no arranca (`requireEnv` lanza) |
| `ADMIN_PASSWORD` | configurada, marcada como temporal/al azar | panel `/admin` queda inaccesible, pero muestra un mensaje claro en vez de romper |
| `RESEND_API_KEY` | **vacía** | los emails no salen; se guardan en `.emails/` y se loguean en consola, sin excepción |
| `EMAIL_FROM` | **vacía** | usa el remitente de prueba de Resend, limitado a la casilla del propio dueño de la cuenta Resend |

No hay tests automatizados implementados todavía (ni Playwright ni unitarios)
pese a que el plan original los prevé para la Fase 7 — ver sección 15.

## 15. Fases del proyecto y qué falta

Ver `docs/decisiones-y-contexto.md` §4 y §6 para el detalle narrativo. Tabla
resumen:

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Fundaciones, despliegue | Código listo; **sin desplegar a producción todavía** |
| 1 | Catálogo real | Código listo; **catálogo cargado sigue siendo demo** |
| 2 | Carrito | Hecha |
| 3 | Checkout y pedidos | Hecha |
| 4 | Panel de pedidos, operación diaria | Hecha |
| 5 | Filtros/búsqueda | No empezada (condicional al tamaño del catálogo) |
| 6 | Landing definitiva, marca, legales | No empezada (la identidad visual de `docs/decisiones-y-contexto.md` §5 es un adelanto parcial) |
| 7 | SEO, analítica, accesibilidad, tests, lanzamiento | No empezada |

**Planeado para testing (Fase 7, no implementado):** un solo test end-to-end
con Playwright sobre el recorrido de compra completo (catálogo → ficha →
variante → carrito → checkout → pedido creado), más tests unitarios sólo
para el cálculo de totales del carrito (`lib/cart/totals.ts`). El plan original
es explícito en que una batería completa de tests para una tienda de un solo
negocio sería mantenimiento que compite con vender — no construir más de
esto sin que el usuario lo pida.

## 16. Antes de tocar código

1. Lee `docs/decisiones-y-contexto.md` si vas a tocar algo relacionado con
   alcance de negocio, precios, stock, o identidad de marca — casi seguro ya
   se discutió.
2. Si vas a escribir código de Next.js, revisa
   `node_modules/next/dist/docs/` para la versión 16 — no asumas conocimiento
   de Next 15.
3. Si el cambio toca datos, revisa primero si ya existe una función en
   `src/lib/db/queries/` antes de escribir una consulta nueva en otro lugar.
4. El usuario prefiere que se le proponga la alternativa más simple, incluso
   si sugirió algo más complejo, y prefiere separar "plan" de "código" salvo
   que pida explícitamente que se implemente ya. Ver
   `docs/decisiones-y-contexto.md` §2.
