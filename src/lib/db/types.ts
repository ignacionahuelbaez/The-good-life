/**
 * Tipos de dominio: la forma en que la aplicación quiere ver los datos.
 *
 * No son los tipos de las tablas. Los tipos de tabla se generan desde el esquema
 * con `pnpm db:types` y sirven para escribir las consultas; estos describen lo
 * que las consultas devuelven ya armado, y son los que viajan hasta los
 * componentes. La traducción entre unos y otros ocurre en `src/lib/db/queries/`.
 */

export type ProductStatus = "borrador" | "activo";

export type OrderStatus =
  | "pendiente"
  | "pagado"
  | "enviado"
  | "entregado"
  | "cancelado";

export type ShippingMethod = "retiro" | "envio";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
};

/**
 * Una variante concreta que se puede comprar. Todo producto tiene al menos una,
 * incluso si no ofrece opciones (§1.3 del plan).
 */
export type Variant = {
  id: string;
  /** Etiqueta visible, por ejemplo "Talle M / Negro". */
  name: string;
  options: VariantOption[];
  /** Precio final de esta variante, con el price_override ya aplicado. */
  price: number;
  stock: number;
  sku: string | null;
};

export type VariantOption = {
  name: string;
  value: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: Category | null;
  price: number;
  compareAtPrice: number | null;
  featured: boolean;
  images: ProductImage[];
  variants: Variant[];
};

/**
 * Un producto ofrece opciones cuando sus variantes tienen ejes cargados. Si no,
 * tiene una sola variante implícita y la ficha no muestra el selector.
 */
export function hasOptions(product: Product): boolean {
  return product.variants.some((variant) => variant.options.length > 0);
}

export function inStock(product: Product): boolean {
  return product.variants.some((variant) => variant.stock > 0);
}

export type OrderItem = {
  id: string;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: string;
  orderNumber: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingMethod: ShippingMethod;
  shippingAddress: string | null;
  shippingCost: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  /** Lo que escribió el comprador en el checkout. */
  notes: string | null;
  /** Anotaciones del negocio. El comprador nunca las ve. */
  internalNotes: string | null;
  accessToken: string;
  items: OrderItem[];
  createdAt: string;
};

/** Datos operativos del negocio, editables sin desplegar. */
export type StoreSettings = {
  whatsappNumber: string | null;
  bank: {
    holder: string | null;
    cbu: string | null;
    alias: string | null;
  };
  pickupEnabled: boolean;
  pickupAddress: string | null;
  shippingEnabled: boolean;
  shippingFlatCost: number;
  freeShippingThreshold: number | null;
  announcement: string | null;
};
