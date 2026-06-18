import type { Discount, Product } from "../types";

/** Raw product row as stored in D1 (JSON columns are strings, booleans are 0/1). */
interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  active: number;
  stock: number;
  images: string;
  metadata: string;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    currency: row.currency ?? "usd",
    active: row.active === 1,
    stock: row.stock,
    images: safeJson<string[]>(row.images, []),
    metadata: safeJson<Record<string, unknown>>(row.metadata, {}),
    store_id: row.store_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface DiscountRow {
  id: string;
  code: string | null;
  name: string;
  description: string;
  type: string;
  value: number;
  automatic: number;
  free_shipping: number;
  active: number;
  min_subtotal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToDiscount(row: DiscountRow): Discount {
  return {
    id: row.id,
    code: row.code,
    name: row.name ?? "",
    description: row.description ?? "",
    type: row.type as Discount["type"],
    value: row.value,
    automatic: row.automatic === 1,
    free_shipping: row.free_shipping === 1,
    active: row.active === 1,
    min_subtotal: row.min_subtotal,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    usage_limit: row.usage_limit,
    usage_count: row.usage_count,
    store_id: row.store_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const nowIso = () => new Date().toISOString();
