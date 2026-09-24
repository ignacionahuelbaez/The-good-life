# Tienda

Ecommerce de un solo negocio: catálogo, carrito y pedidos. El pago se coordina
fuera del sitio, por WhatsApp o transferencia.

El plan de desarrollo completo, con el análisis y las fases, está en
`~/.claude/plans/objetivo-quiero-que-snazzy-stallman.md`.

**Estado: Fase 4 — la tienda vende y se opera.** Catálogo, carrito, checkout,
pedidos guardados, confirmación por WhatsApp, emails y panel de pedidos en
`/admin`. El catálogo cargado es de **demostración** (ver `data/demo/README.md`).
Lo que sigue son filtros y buscador (Fase 5), la landing (Fase 6) y el pulido
final (Fase 7).

## Requisitos

- Node.js 20.9 o superior
- pnpm
- Docker o Podman, para el Supabase local
- Una cuenta de Supabase (recién para producción)

## Puesta en marcha

El desarrollo corre contra un Supabase local: no hace falta tocar la nube ni
compartir credenciales para trabajar.

```bash
pnpm install
pnpm exec supabase start   # levanta Postgres, API y Storage en contenedores
pnpm db:seed               # carga el catálogo de demostración
pnpm dev
```

`supabase start` aplica las migraciones solo e imprime las credenciales locales,
que ya están en `.env.local`. Para apagarlo, `pnpm exec supabase stop`.

## Comandos

| Comando          | Qué hace                                        |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                          |
| `pnpm build`     | Compilación de producción                       |
| `pnpm typecheck` | Genera los tipos de rutas y verifica TypeScript |
| `pnpm lint`      | ESLint                                          |
| `pnpm db:seed`   | Carga un catálogo (por defecto `data/demo`)     |
| `pnpm db:reset`  | Reinicia la base local desde las migraciones    |
| `pnpm db:types`  | Regenera los tipos desde el esquema             |

`db:types` necesita la variable `SUPABASE_PROJECT_ID`.

## El panel de pedidos

Está en `/admin` y se entra con una sola contraseña, la de `ADMIN_PASSWORD`. No
hay pantalla para cambiarla porque no hay sistema de usuarios: para una o dos
personas del mismo negocio, eso sería construir una fase entera para nadie.

Para cambiarla:

- **En desarrollo**: editar `ADMIN_PASSWORD` en `.env.local` y reiniciar
  `pnpm dev`.
- **En producción**: cambiarla en las variables de entorno de Vercel y
  redesplegar.

La sesión se firma con la propia contraseña, así que cambiarla **cierra todas las
sesiones abiertas**. Es lo que se espera al cambiarla, y también la forma de
echar a alguien que ya no debería entrar.

La que está configurada hoy es temporal y fue generada al azar. Conviene
reemplazarla por la del negocio antes de entregar la tienda.

## Producción

1. Crear el proyecto en [supabase.com](https://supabase.com), región
   `South America (São Paulo)` por latencia.
2. Aplicar las migraciones de `supabase/migrations/` en orden desde el
   `SQL Editor`.
3. Completar la fila de `store_settings` con los datos reales del negocio:
   WhatsApp, CBU, alias, dirección de retiro y costo de envío.
4. Cargar en las variables de entorno de Vercel: `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` y, para que salgan los emails,
   `RESEND_API_KEY` y `EMAIL_FROM`.

## Estructura

```
src/
  app/                 rutas (App Router)
  components/tienda/   componentes propios de la tienda
  config/store.ts      identidad de la marca: nombre, textos, enlaces
  lib/
    cart/              store del carrito y cálculo de totales
    db/
      client.ts        cliente de Supabase, sólo servidor
      types.ts         tipos de dominio
      queries/         ÚNICO lugar que consulta la base
    variants.ts        lógica de selección de variantes
    utils.ts
data/demo/             catálogo de demostración, reemplazable
scripts/seed.ts        cargador de catálogo
supabase/migrations/   esquema versionado
```

## Convenciones

**Todo el acceso a datos vive en `src/lib/db/queries/`.** Si un archivo fuera de
esa carpeta consulta la base, está mal ubicado. Los Server Components llaman a
esas funciones; las mutaciones van por Server Actions.

**El navegador nunca habla con la base.** Las tablas tienen Row Level Security
activo y sin políticas, así que la clave anónima no lee nada. Las consultas usan
la clave de servicio y sólo corren en el servidor, protegidas por el import de
`server-only` en `lib/db/client.ts`.

**El cliente nunca manda precios.** El carrito guarda identificadores y
cantidades, más una copia de nombre y precio que sirve sólo para dibujarlo al
instante. La página del carrito relee todo desde la base y corrige lo que haga
falta. Al confirmar, el servidor usa únicamente el identificador de variante y la
cantidad: los precios, el envío y el total se recalculan desde la base, así que
un precio editado en el navegador no tiene ningún efecto.

**El pedido se guarda entero o no se guarda.** `crear_pedido` es una función de
Postgres que inserta el pedido y sus ítems en una transacción. Hacerlo con dos
consultas desde la aplicación dejaría pedidos sin ítems si la segunda falla.

**Los emails no pueden tumbar una venta.** Salen después de que el pedido ya está
guardado y su resultado no cambia el desenlace. Sin `RESEND_API_KEY` no fallan:
se guardan en `.emails/` para poder abrirlos en el navegador.

**El stock se descuenta al cobrar, no al comprar.** Sin pasarela de pago no hay
confirmación automática, así que el inventario baja recién cuando el dueño marca
el pedido como pagado. Eso deja una ventana chica de sobreventa, aceptada a
conciencia: cuando ocurre, el panel avisa de qué producto faltó y la venta se
cobra igual. `order_items.stock_applied` guarda cuántas unidades se descontaron
de verdad, para que cancelar devuelva exactamente eso y no lo que el pedido
pedía.

**El panel se protege en el layout, no en `proxy.ts`.** El proxy puede terminar
ejecutándose en un CDN, lejos del runtime que lee la base; comprobar la sesión en
`admin/(panel)/layout.tsx` la pone en el mismo lugar donde se renderizan los
datos. El login vive fuera de ese grupo para no quedar en un bucle.

**Las páginas del catálogo se regeneran cada minuto** (`export const revalidate`).
Sin eso, el HTML queda congelado en el momento del build: un cambio de precio o
de stock hecho desde el panel de Supabase no se vería hasta el próximo
despliegue. Consecuencia práctica: **después de correr `pnpm db:seed` hay que
esperar un minuto o reconstruir**, porque el seed recrea los productos con
identificadores nuevos y las páginas servidas todavía apuntan a los viejos.

**La marca se edita en un solo lugar.** Nombre, textos y enlaces en
`src/config/store.ts`; colores y tipografías en `:root`, dentro de
`src/app/globals.css`. Los componentes usan sólo nombres semánticos —
`bg-surface`, `text-muted`, `bg-brand` — nunca colores literales.

Lo que el dueño cambia seguido — CBU, número de WhatsApp, costo de envío — vive
en la tabla `store_settings`, no en el código, para no depender de un despliegue.
