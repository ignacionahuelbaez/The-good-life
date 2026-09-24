# Decisiones y contexto del proyecto — para retomar el trabajo

> Este documento no es un resumen corto. Reúne las decisiones importantes que
> se tomaron durante el desarrollo de esta tienda, con el contexto y el
> razonamiento detrás de cada una, para que otro agente de IA (o el mismo
> Claude en una sesión sin memoria de ésta) pueda entender **cómo llegó el
> proyecto a donde está y por qué**, sin tener que adivinarlo leyendo sólo el
> código.
>
> El documento hermano, `docs/arquitectura-del-proyecto.md`, describe **qué
> existe y cómo está construido**. Éste describe **por qué existe así**.

## 0. De dónde viene este documento

Existe un plan de desarrollo completo, escrito antes de la primera línea de
código, en `~/.claude/plans/objetivo-quiero-que-snazzy-stallman.md` (fuera del
repositorio, en el directorio de planes del usuario en esta máquina). Ese plan
es la fuente original de casi todas las decisiones de la sección 1. Este
documento las reproduce con su razonamiento porque el plan vive fuera del
repo y un agente en otra máquina, o trabajando desde el propio repositorio
clonado, no va a poder leerlo.

También existe memoria persistente del asistente (`~/.claude/projects/.../memory/`
en esta máquina) con las mismas decisiones más el historial de cómo se fueron
aplicando. Este documento consolida ambas fuentes más lo que se decidió en
sesiones de trabajo posteriores, para que quede todo en un solo lugar
**dentro del repositorio**, versionado junto con el código.

## 1. El encargo original

Un negocio argentino chico, real, con catálogo y marca propios, necesitaba
vender por internet. El directorio del proyecto arrancó vacío. El objetivo
explícito no era construir una plataforma reusable: era **una sola tienda,
terminada y en producción**. Que en el futuro pudiera reaprovecharse para otro
cliente era aceptable, pero no debía condicionar ninguna decisión de esta
primera versión.

El usuario ya traía tres cosas definidas antes de empezar: quería pagos
coordinados fuera del sitio (no pasarela), no quería panel de administración
en la v1, y tenía experiencia previa con Next.js/React.

## 2. Cómo se trabajó (forma de colaboración)

Antes de escribir código, el usuario pidió explícitamente un análisis crítico
y un plan **sin crear archivos todavía**, y fue textual: *"no aceptes
automáticamente todas mis ideas si encontrás una alternativa objetivamente
mejor"*. Esa separación entre planificar y ejecutar se mantuvo después de
aprobado el plan: aprobar un plan no equivale a pedir que se implemente en el
acto.

**Consecuencia práctica para quien continúe este proyecto:** ante una
decisión con varias opciones válidas, conviene proponer la más simple y
explicar el criterio — incluso si el usuario sugirió otra cosa — y no
empezar a implementar en la misma respuesta en que se presenta un diseño,
salvo que lo pida explícitamente. El usuario rechaza la sobre-ingeniería de
forma activa: prefiere la opción más simple y no diseñar para escenarios
futuros hipotéticos.

Un detalle técnico que también es de "forma de trabajo": el proyecto corre
sobre **Next.js 16**, una versión que rompe con el conocimiento de
entrenamiento de cualquier modelo (parámetros de ruta como Promises,
`middleware.ts` renombrado a `proxy.ts`, `images.domains` deprecado a favor de
`remotePatterns`, `next lint` eliminado en favor del CLI de ESLint directo,
etc.). El propio `AGENTS.md` del repo — auto-generado por `next dev`, no lo
edites a mano salvo para mantenerlo — indica leer
`node_modules/next/dist/docs/` antes de escribir código de Next. Ignorar esto
produce código que no compila o que usa patrones ya deprecados.

## 3. Decisiones fundacionales de negocio y su porqué

Estas son las decisiones que, si no se conoce el razonamiento, parecen
omisiones o errores. No lo son: fueron evaluadas y elegidas a propósito.

### 3.1 Sin pasarela de pago

El checkout genera un pedido confirmado en la base; el pago se coordina
después por WhatsApp o transferencia bancaria, fuera del sitio.

**Por qué:** cobrar afuera del sitio no es una versión degradada del
ecommerce — elimina la mitad más difícil de construir: webhooks, estados de
pago asíncronos, idempotencia, conciliación y reintentos. El costo real es de
conversión (menos comodidad para pagar), no de arquitectura, y para un
negocio chico que ya vendía por WhatsApp antes de tener sitio, ese costo es
bajo. La mecánica elegida — pedido guardado con número legible, botón de
WhatsApp con el mensaje ya escrito, más los datos de transferencia, y dos
emails automáticos (uno al comprador, uno al dueño) — hace que el pedido
exista en la base **aunque el comprador nunca toque el botón de WhatsApp**, y
que el dueño se entere **aunque el email se pierda**. Ninguno de los dos
canales es el único punto de falla.

**Extensibilidad ya contemplada:** si en el futuro se suma Mercado Pago, no
hace falta rehacer el modelo de pedidos — se agrega un estado de pago y una
redirección antes de la confirmación.

### 3.2 Sin panel de administración de productos en v1

El dueño no tiene, hoy, una pantalla para dar de alta, editar o borrar un
producto. Sólo tiene panel para **pedidos** (agregado en la Fase 4).

**Por qué:** cargar productos desde el panel de Supabase (o una pantalla ad
hoc) es perfecto para corregir un precio o un stock puntual, pero es horrible
para la carga inicial de decenas de productos con fotos. Construir un CRUD
completo de catálogo era una fase entera de trabajo para un valor que, al
principio, se resuelve mejor con un script.

**Mitigación real, ya construida:** `scripts/seed.ts` lee un JSON de catálogo
más una carpeta de fotos y carga todo de una — pensado tanto para la carga
inicial como para reconstruir el entorno de desarrollo. Ver
`docs/arquitectura-del-proyecto.md` para el detalle técnico.

**El filo de esta decisión, dicho en voz alta:** el seed **vacía y recarga
el catálogo entero**. No hay hoy una forma de editar un solo producto sin
tocar la base directamente (Supabase Studio) o sin re-subir el JSON completo.
Esto se discutió explícitamente en una sesión de trabajo posterior (ver
sección 6) cuando el usuario preguntó cómo se sube o modifica un producto.

### 3.3 Variantes: todo producto tiene al menos una, siempre

No hay "producto simple" vs. "producto con variantes" como dos caminos de
código distintos. Un producto sin talles ni colores tiene exactamente una
variante llamada `Default`, sin opciones cargadas.

**Por qué:** es la trampa de complejidad número uno de cualquier ecommerce
mal planeado — matrices de opciones, generación combinatoria automática,
precios e imágenes por combinación. Forzar que todo producto tenga variantes,
cargadas explícitamente a mano (`Talle M / Negro`, stock 4) en vez de
generadas, le da al carrito, al stock, a los ítems del pedido y al selector
de la ficha **un solo camino de código**. Con catálogos de decenas o pocos
cientos de productos, cargar las combinaciones a mano es más rápido que
construir el generador, y mucho más fácil de corregir cuando el dueño quiere
que un talle no exista en un solo color.

### 3.4 Sin cuentas de usuario

No hay registro, login de cliente, ni "mis pedidos". El checkout es de
invitado.

**Por qué:** una tienda chica tiene recompra baja, y un sistema de cuentas
arrastra registro, verificación, recuperación de contraseña y perfil — una
fase entera para un valor marginal en este negocio.

**Reemplazo elegido:** cada pedido tiene un `access_token` aleatorio (UUID) y
se puede ver en `/pedido/[token]` sin login. Ese link viaja en el email de
confirmación y es, además, lo que el dueño le reenvía por WhatsApp cuando el
comprador pregunta por su pedido.

### 3.5 Filtros y búsqueda: deliberadamente no construidos todavía

El catálogo se recorre por la grilla completa en `/productos`, sin filtros
por categoría, precio ni búsqueda de texto.

**Por qué:** con menos de ~40 productos, un buscador es decorativo — se
navega más rápido a ojo. El riesgo de construirlo antes de tiempo es agregar
facetas dinámicas, contadores e índices de búsqueda para un catálogo que
entra en dos pantallas. Esta fase (la Fase 5 del plan) queda **condicionada
al tamaño real del catálogo**, no a una fecha. La señal para activarla es que
el catálogo crezca más allá de ese umbral, o que la analítica (todavía no
implementada, Fase 7) muestre que la gente busca y no encuentra.

**Cuando llegue el momento, la solución ya está decidida:** `searchParams` en
la URL, leídos por Server Components, y búsqueda de texto nativa de
Postgres. Nada de Algolia ni Meilisearch — a este volumen, Postgres responde
en milisegundos sin sumar infraestructura.

### 3.6 Stock: se acepta la sobreventa ocasional, a propósito

El inventario se descuenta recién cuando el dueño marca un pedido como
**pagado**, no cuando se crea el pedido.

**Por qué:** sin pasarela de pago no hay confirmación automática de cobro.
Había tres opciones y dos eran malas: descontar al crear el pedido (los
pedidos abandonados congelarían mercadería que sí está disponible), o
reservar stock con vencimiento (maquinaria de Shopify para un problema que
este negocio no tiene). La tercera — descontar al cobrar — deja una ventana
real mientras el pedido está pendiente, en la que dos personas podrían
comprar la última unidad. Se acepta a conciencia: con este volumen es
infrecuente, y cuando pasa se resuelve con un mensaje de WhatsApp. El panel
de admin avisa explícitamente cuándo ocurrió una sobreventa al marcar un
pedido como pagado (ver `marcar_pedido_pagado` en
`docs/arquitectura-del-proyecto.md`).

**Detalle que se corrigió en el camino:** al principio, cancelar un pedido
devolvía al inventario la cantidad *pedida*, no la *efectivamente
descontada*. Si hubo sobreventa (se pidieron 3, sólo había 1, se descontó 1),
cancelar devolvía 3 — inventando 2 unidades que nunca existieron. Se corrigió
agregando `order_items.stock_applied` (migración `0004`), que registra cuánto
se descontó de verdad por línea, para poder revertir con exactitud.

### 3.7 El navegador nunca habla con la base

Todas las consultas y mutaciones pasan por Server Components y Server
Actions, usando la clave de servicio de Supabase, que nunca sale del
servidor. Row Level Security está activo en todas las tablas **sin ninguna
política**, lo que deniega todo acceso con la clave anónima.

**Por qué:** si el cliente consultara Supabase directamente, la
configuración de RLS pasaría a ser parte del diseño de cada tabla, y cada
error de política se convertiría en una filtración de datos. Centralizar el
acceso en el servidor saca esa preocupación de encima: RLS queda como red de
seguridad, no como mecanismo de diseño activo.

**Regla de oro derivada, la más importante del proyecto:** el carrito que
vive en el navegador guarda identificadores de variante y cantidades, nunca
precios de verdad. Al confirmar el pedido, el servidor relee todo desde la
base y recalcula el total. Un precio manipulado desde las herramientas de
desarrollador del navegador **no tiene ningún efecto** — se ignora
silenciosamente. Esto se verificó explícitamente como criterio de
"terminado" de la Fase 3.

### 3.8 El pedido se guarda entero, o no se guarda

Insertar el pedido y sus ítems con dos `INSERT` separados desde la
aplicación no es atómico: si el segundo falla, queda un pedido sin ítems, que
es corrupción silenciosa en el dato más importante del sistema. Por eso
`crear_pedido` es una función de Postgres que hace las dos cosas en una sola
transacción, y la lógica de negocio (revalidar precios, decidir el envío,
calcular el total) vive en la aplicación — la función sólo garantiza
atomicidad.

### 3.9 Preparado para white-label, sin construir una plataforma

Lo único que se hizo pensando en un hipotético segundo cliente fue barato:
toda la identidad de marca (nombre, colores, tipografía, textos
institucionales, WhatsApp, CBU, costos de envío) vive en `config/store.ts` y
en tokens de CSS, nunca incrustada en los componentes.

**Lo que deliberadamente no se construyó:** ningún `storeId` en las tablas,
nada de multi-tenancy, ninguna capa de temas. Si llega un segundo cliente, se
clona el repositorio y se cambia la configuración — más rápido y más honesto
que mantener una plataforma que hoy tiene un solo usuario real.

### 3.10 Obligaciones legales argentinas, reconocidas pero no resueltas todavía

El plan identifica desde el principio: botón de arrepentimiento (Resolución
424/2020), términos y condiciones, política de privacidad, política de
cambios y devoluciones, datos fiscales del vendedor en el pie, y precios
finales con IVA incluido sin motor de impuestos (el precio cargado es el
precio cobrado, punto). **Nada de esto está construido todavía** — está
planificado para la Fase 6 (Landing y marca) y es una obligación real, no
decorativa, antes de operar de cara al público en Argentina.

### 3.11 Lo que se decidió no construir, explícitamente

Sin capa de repositorios, sin tRPC, sin GraphQL, sin arquitectura hexagonal,
sin inyección de dependencias, sin patrón de eventos, sin monorepo, sin
Storybook, sin Docker más allá del Supabase local, sin microservicios, sin
manejador de estado global más allá del carrito. Y fuera de alcance de forma
explícita y cerrada (no es una cola de trabajo pendiente, es una lista de
"no, a propósito"): Mercado Pago, cuentas de usuario, cupones, reseñas, lista
de deseos, recuperación de carritos abandonados, facturación electrónica,
edición de productos desde un panel, métricas de ventas, multi-idioma y
multi-moneda.

**Consecuencia para quien continúe el proyecto:** si el alcance se amplía,
contrastar la propuesta contra esta lista antes de construir nada. No
proponer Mercado Pago, login de clientes, reservas de stock ni un CMS de
productos sin que el usuario lo pida explícitamente — ya se evaluaron y se
descartaron para esta versión.

## 4. Cómo evolucionó el proyecto (fases)

El plan original definía 8 fases (0 a 7), cada una terminada y desplegada en
producción antes de pasar a la siguiente — sin ramas largas. Estado actual,
según el propio README del repo:

| Fase | Objetivo | Estado |
|---|---|---|
| 0 — Fundaciones y despliegue | Que exista una URL pública real | Hecha en desarrollo; **el despliegue real a producción todavía no ocurrió** (ver sección 6) |
| 1 — Catálogo real | Productos navegables con fotos y descripciones reales | El código está listo; **el contenido cargado sigue siendo el catálogo de demostración**, explícitamente falso |
| 2 — Carrito | Juntar productos antes de comprar | Hecha |
| 3 — Checkout y pedidos | Que la tienda pueda vender | Hecha — es el hito "la tienda vende" |
| 4 — Operación diaria | Que el dueño opere sin tocar la base | Hecha — panel de pedidos en `/admin` funcional |
| 5 — Descubrimiento (filtros/búsqueda) | Encontrar productos a escala | No empezada, condicional al tamaño del catálogo |
| 6 — Landing y marca | Que la tienda se vea como una marca | No empezada — **el trabajo de identidad visual de la sección 5 de este documento es un adelanto parcial de esta fase**, no la fase completa |
| 7 — Pulido y lanzamiento | Entregar | No empezada — sin tests automatizados, sin SEO avanzado, sin analítica, sin auditoría de accesibilidad |

El README del repo describe el estado actual como **"Fase 4 — la tienda
vende y se opera"**, y es preciso: el motor completo de venta y operación
funciona, sobre datos de demostración y configuración de desarrollo.

## 5. Identidad visual y de marca (sesión del 2026-09-14/15)

Esta sección documenta una sesión de trabajo posterior a que el motor de la
tienda ya estuviera terminado, enfocada exclusivamente en estética, a pedido
explícito del usuario ("quiero que nos enfoquemos únicamente en la parte
estética por ahora").

### 5.1 Punto de partida

- **Rubro:** ropa deportiva femenina (activewear) — tops, calzas, buzos,
  remeras y shorts.
- **Referencia visual dada por el usuario:** `giopetra.com`, y en esta sesión
  puntualmente `giopetra.com/deportes/pilates/reformers1/` — como referencia
  de **nivel** de diseño, composición, sensación de marca y uso de fotografía
  y espacios, explícitamente **no para copiar contenido**.
- **Nombre real de la marca**, dado en esta sesión: **"The Good Life"**.
  Antes de esto, `src/config/store.ts` tenía `"Nombre de la Tienda"` como
  placeholder con un TODO explícito.
- **Logo recibido:** un archivo `src/config/Logo(The good life).JPG` — un
  monograma en gris-taupe (aprox. `#b5b2a8`) sobre fondo crema/hueso (aprox.
  `#f0ede4`), formado por las palabras "THE GOOD" en mayúscula bold, una "G"
  grande estilizada, "life" en minúscula liviana, y un punto final. El
  archivo **es un JPG sin transparencia** — el fondo crema viene "quemado" en
  la imagen.

### 5.2 Decisiones tomadas (con las alternativas que se descartaron)

Se plantearon dos decisiones de diseño al usuario antes de tocar código,
porque ambas condicionaban toda la paleta:

**Decisión A — hacia dónde va la paleta general.** Dos opciones sobre la
mesa: (a) blanco puro + negro, estilo editorial estricto (la línea que ya
traía el proyecto, inspirada en la lectura inicial de giopetra.com), o (b)
una paleta cálida derivada de los colores del logo (crema, taupe, terracota).
**El usuario eligió (b), la cálida basada en el logo.** Consecuencia: todo el
sitio — no sólo el header — pasó de blanco/negro a tonos crema/taupe.

**Decisión B — qué hacer con el archivo JPG del logo, que no tiene fondo
transparente.** Dos opciones: (a) igualar el fondo del sitio exactamente al
crema del JPG para que el logo se pudiera insertar como imagen sin que se
notara un recuadro, o (b) no usar el archivo todavía — recrear el nombre
como wordmark tipográfico, y dejar la estructura lista para reemplazarlo el
día que exista una versión con transparencia. **El usuario eligió (b)**, con
una justificación explícita que conviene preservar textualmente porque es una
instrucción de alcance, no sólo de gusto: *"Considerá el logo actual como un
recurso temporal. No quiero construir la identidad visual alrededor de ese
JPG porque probablemente cambie. Usá un wordmark limpio y minimalista por
ahora, y dejá preparada la estructura para reemplazarlo fácilmente por el
logo definitivo cuando exista."*

**Consecuencia para quien continúe el proyecto:** no había que ni hay que
integrar el JPG actual al sitio. El único lugar que debe tocarse cuando
llegue el logo definitivo (PNG o SVG, con transparencia) es
`src/components/tienda/logo.tsx` — ver sección 5.3.

### 5.3 Qué se implementó

1. **`src/config/store.ts`** — `name` pasó de `"Nombre de la Tienda"` a
   `"The Good Life"`. El TODO correspondiente se resolvió. `url` y
   `contact.email` siguen siendo placeholders (`example.com`,
   `hola@example.com`) — no se tocaron porque no son parte de la estética, y
   quedaron como pendiente explícito en la sección 6.

2. **`src/app/globals.css`** — los tokens de `:root` pasaron de blanco/negro
   a una paleta cálida:
   - `--canvas` (fondo): `#f6f1e7` (antes `#ffffff`)
   - `--surface` (tarjetas): `#ede6d6` (antes `#f6f5f3`)
   - `--ink` (texto principal): `#2e2a22` (antes `#111111`) — gris-taupe
     oscuro, no negro puro
   - `--muted` (texto secundario): `#8a8170` (antes `#6b6b6b`)
   - `--line` (trazos): `#e1d9c7` (antes `#e5e3df`)
   - `--brand` / `--brand-ink`: mismo valor que `--ink`/`--canvas` — sigue
     sin existir un color de marca separado del logo, igual que antes
   - `--accent` y `--danger`: `#b5502e`, terracota (antes `#b3261e`, rojo
     puro) — el precio de oferta y los avisos pasaron de rojo a terracota
   - `--success`: `#4d7a4f` (antes `#15803d`), verde algo más cálido

   Ningún componente de la tienda tenía colores Tailwind hardcodeados
   (`bg-white`, `text-black`, hex sueltos) — todos usaban ya los nombres
   semánticos (`bg-canvas`, `text-ink`, etc.), así que el cambio de paleta
   se propagó automáticamente a **toda** la tienda y **todo** el admin sin
   tocar un componente más. La única excepción, dejada aparte a propósito,
   son las plantillas de email (`src/lib/email/html.ts`), que llevan su
   propia paleta en estilos inline porque los clientes de correo no leen
   `globals.css` — quedaron con su paleta anterior (blanco/negro/gris), y
   homologarlas es trabajo aparte, no hecho en esta sesión.

3. **`src/components/tienda/logo.tsx`** (nuevo) — wordmark tipográfico que
   imita la forma del logo real ("THE GOOD" mayúscula bold + "life" minúscula
   liviana + punto final en el color de marca), sin usar la imagen. Es
   explícitamente temporal y está comentado como tal en el propio archivo.
   **Es el único componente que dibuja el nombre de la marca como logo** —
   tanto el header como el footer lo importan en vez de imprimir
   `store.name` como texto suelto. El día que exista un PNG/SVG definitivo
   con transparencia, alcanza con reemplazar el contenido de este único
   archivo por un `<Image>`; ningún otro archivo necesita cambiar.

4. **`src/components/tienda/header.tsx`** y **`footer.tsx`** — se
   actualizaron para usar `<Logo />` en vez de `{store.name}` en texto plano.

### 5.4 Cómo se verificó

Se levantó el servidor de desarrollo local y se tomaron capturas de pantalla
con Playwright (instalado ad hoc en el directorio de scratch de la sesión,
no es una dependencia del proyecto) de: home, catálogo, ficha de producto,
panel lateral del carrito, y login de `/admin`. Todas mostraron la paleta
cálida aplicada de forma coherente, incluido el precio de oferta en
terracota y el estado "Disponible" en el verde nuevo. `pnpm typecheck` y
`pnpm lint` corrieron limpios después del cambio.

No se usó la skill de `claude-in-chrome` porque la extensión no estaba
conectada en esta sesión; se resolvió instalando Playwright vía `npx` como
alternativa de verificación visual.

### 5.5 Qué quedó explícitamente fuera de esta sesión

A pedido del usuario ("enfocarnos únicamente en la parte estética"), no se
tocó: el tagline ni la descripción genéricos de `store.ts` (siguen sin
relación directa con el rubro), el dominio ni el email de contacto, las
plantillas de email, ni el archivo JPG del logo (sigue en
`src/config/Logo(The good life).JPG`, sin usarse).

## 6. Qué falta para poder entregar la tienda (discutido el 2026-09-15)

Después del trabajo de estética, el usuario preguntó explícitamente cuándo
la página está lista para entregar y qué falta. La respuesta, con contexto,
quedó así — es una checklist operativa, no de código:

### 6.1 Identidad en `src/config/store.ts`

`name` ya está resuelto (sección 5). Siguen pendientes, marcados con TODO en
el propio archivo: `url` (dominio definitivo) y `contact.email` (a dónde
llegan los avisos de "nuevo pedido" — ver `emailParaNegocio` en
`src/lib/email/order.ts`).

### 6.2 Datos operativos en la tabla `store_settings`

Verificado directamente en esta sesión: la fila única de `store_settings`
está en su estado por defecto — **todos los campos operativos están en
`null`**: número de WhatsApp, titular/CBU/alias bancario, dirección de
retiro. Sin esto, la página de seguimiento de pedido (`/pedido/[token]`) y el
email de confirmación al comprador **no van a poder mostrar cómo pagar**,
porque esas secciones sólo se renderizan si el dato existe (ver
`emailParaComprador` y la página de pedido). No hay pantalla en el admin para
editar esto todavía — se carga directo en Supabase Studio (local) o en el
dashboard de Supabase (producción), tal como indica el README en su sección
"Producción".

### 6.3 Infraestructura para producción

- El proyecto corre hoy contra un **Supabase local** (contenedores Docker vía
  `pnpm exec supabase start`). Para producción hace falta crear un proyecto
  real en supabase.com (el README recomienda la región São Paulo por
  latencia), aplicar las migraciones de `supabase/migrations/` en orden, y
  apuntar `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` a ese proyecto.
- `RESEND_API_KEY` y `EMAIL_FROM` están **vacíos** en el `.env.local` actual
  → los emails no salen de verdad hoy, quedan guardados como archivo en
  `.emails/` (carpeta ignorada por git) o logueados en consola. Ver sección
  6.5 para el detalle de cómo probarlos igual.
- `ADMIN_PASSWORD` está configurada, pero es — según el propio README —
  "temporal y generada al azar". Hay que reemplazarla por la contraseña real
  del negocio antes de entregar, y recordar que cambiarla cierra todas las
  sesiones abiertas del panel (es una consecuencia esperada del diseño, no un
  bug).
- No hay configuración de despliegue (Vercel u otro hosting) todavía, ni
  dominio apuntando a nada.

### 6.4 Catálogo

Sigue siendo 100% el catálogo de demostración de `data/demo/`, explícitamente
marcado como falso en su propio README. Falta el catálogo real (fotos +
productos) para cargar con `pnpm db:seed data/catalogo` una vez que exista
`data/catalogo/catalogo.json` y sus imágenes.

### 6.5 Sobre probar el flujo de compra con emails propios

El usuario preguntó si podía usar su propio correo para simular una compra
real y cambiarlo después por el del cliente. Se le aclaró:

- El **email del comprador** (a quien llega "recibimos tu pedido") es el que
  se escribe en el formulario de checkout en cada compra — no está
  hardcodeado en ningún lado, se puede usar cualquier dirección en cada
  prueba sin tocar código.
- El **email del negocio** (a quien llega "nuevo pedido") es
  `store.contact.email`, una sola línea en `src/config/store.ts` — se puede
  poner el correo propio para probar y cambiarlo después al del cliente.
- **Limitación real de Resend a tener en cuenta:** sin un dominio propio
  verificado en `EMAIL_FROM`, Resend usa su remitente de prueba
  (`onboarding@resend.dev`), que **sólo puede entregar al correo con el que
  uno se registró en Resend**. Para que las pruebas de punta a punta manden
  emails de verdad (no sólo se guarden como archivo en `.emails/`), hace
  falta una cuenta gratuita de Resend con el correo propio, esa clave en
  `RESEND_API_KEY`, y usar ese mismo correo tanto como "comprador" en el
  checkout como en `store.contact.email` durante las pruebas. Verificar un
  dominio propio (necesario para poder mandarle a cualquier dirección, como
  en producción real) es un paso aparte, pendiente antes de entregar.

### 6.6 No bloqueante, pero pendiente

Páginas legales obligatorias en Argentina (botón de arrepentimiento,
términos, privacidad, devoluciones — ver sección 3.10), landing definitiva,
SEO/analítica, tests automatizados. Todo esto corresponde a las Fases 6 y 7,
todavía no iniciadas.

## 7. Preguntas abiertas / próximos pasos naturales

Ninguno de estos está decidido todavía; son continuaciones lógicas que
surgieron en la conversación pero no se ejecutaron:

- Si el logo definitivo con transparencia llega, reemplazar el contenido de
  `src/components/tienda/logo.tsx` por la imagen real.
- Cargar el catálogo real siguiendo `data/demo/README.md` como plantilla de
  formato.
- Completar `store_settings` con los datos operativos reales del negocio.
- Decidir y configurar Resend con dominio verificado.
- Si operar sin pantalla de alta/edición de productos resulta incómodo en el
  día a día, se ofreció como posibilidad construir una pantalla mínima de
  CRUD de productos en el admin — **no está en el plan original** (el plan la
  deja fuera de alcance de forma explícita, sección 3.11), así que antes de
  construirla habría que confirmarlo con el usuario, no asumirlo.
- Homologar la paleta de los emails transaccionales (`src/lib/email/html.ts`)
  con la paleta cálida nueva del sitio — quedó fuera de la sesión de estética
  a propósito.
