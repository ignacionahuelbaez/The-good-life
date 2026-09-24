# Catálogo de demostración

**Nada de lo que hay acá es real.** Son datos inventados para poder diseñar y
probar la tienda mientras el catálogo definitivo todavía no existe.

## Por qué existe

Diseñar sobre datos de relleno genéricos esconde los problemas que después
aparecen todos juntos: nombres que rompen la grilla, productos sin stock,
descripciones de largos muy distintos. Este catálogo los provoca a propósito.

Los productos fueron elegidos para cubrir todos los casos que el diseño tiene que
resistir:

| Caso                               | Producto                                      |
| ---------------------------------- | --------------------------------------------- |
| Dos ejes de opción (talle y color) | Top Duna, Calza Duna                          |
| Un solo eje (sólo talle)           | Top Brisa, Short Duna                         |
| Sin opciones                       | Botella Térmica Terra                         |
| Agotado por completo               | Calza Ciclista Brisa                          |
| Agotado en algunas combinaciones   | Top Duna (M lavanda), Remera Brisa (L negro)   |
| En oferta, con precio tachado      | Calza Oxford Terra, Campera Nube              |
| Nombre largo que fuerza el diseño  | Calza Oxford Terra de Tiro Alto con Bolsillos |
| Descripción corta y descripción larga | Top Terra vs. Calza Duna                   |
| Varias fotos en la galería         | Calza Duna (3 fotos)                          |
| Una sola foto                      | Remera Brisa, Short Duna                      |

## Sobre las fotos

**El catálogo demo no trae fotos, a propósito.** Las imágenes definitivas se
suman cuando la dirección visual esté aprobada; hasta entonces no tiene sentido
producirlas ni traer fotos de terceros que después haya que descartar.

Mientras tanto la tienda muestra un bloque con el color real de cada prenda, que
sale de sus propias variantes (ver `src/lib/placeholder.ts`). Alcanza para juzgar
la grilla, la composición y las proporciones, que es lo que esta etapa necesita
validar.

El JSON ya declara los nombres de archivo de cada foto. El día que existan,
alcanza con ponerlas en `imagenes/` con esos nombres y volver a correr el seed:
los bloques de color desaparecen solos.

## Cómo se reemplaza por el catálogo real

1. Armar `data/catalogo/catalogo.json` con el mismo formato que este archivo.
2. Poner las fotos en `data/catalogo/imagenes/`, con los nombres que declara el JSON.
3. Correr el seed apuntando a la carpeta nueva:

   ```bash
   pnpm db:seed data/catalogo
   ```

El seed **vacía el catálogo antes de cargar**, así que no quedan restos de la
demo mezclados con los productos reales. Los pedidos ya existentes no se tocan:
conservan su copia del nombre y del precio.

Cuando el catálogo real esté cargado y verificado, esta carpeta se borra.

## Formato

```jsonc
{
  "categorias": [
    { "slug": "tops", "nombre": "Tops", "descripcion": "opcional" }
  ],
  "productos": [
    {
      "slug": "top-duna",           // único, es la URL del producto
      "nombre": "Top Duna",
      "categoria": "tops",          // slug de una categoría de arriba
      "descripcion": "...",         // los saltos de línea separan párrafos
      "precio": 58000,              // sin puntos ni símbolo
      "precioAnterior": 72000,      // opcional, sólo para ofertas; debe ser mayor
      "destacado": true,            // aparece en la home
      "estado": "activo",           // "activo" o "borrador"; por defecto activo
      "imagenes": [
        { "archivo": "top-duna-1.jpg", "alt": "descripción para lectores de pantalla" }
      ],
      "variantes": [
        { "talle": "S", "color": "Negro", "stock": 6, "sku": "TDU-S-NEG" }
      ]
    }
  ]
}
```

Sobre las variantes:

- `talle` y `color` son opcionales, pero **no se puede poner `color` sin `talle`**.
- Un producto sin opciones lleva una sola variante: `{ "stock": 15, "sku": "..." }`.
- `precio` puede pisarse por variante con `precioOverride`, aunque conviene evitarlo.
- Las fotos que el JSON declare y no estén en la carpeta se omiten con un aviso:
  el producto se carga igual y la tienda muestra su marco vacío.
