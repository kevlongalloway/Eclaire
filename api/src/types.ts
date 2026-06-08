import type { Context } from "hono";

/** Cloudflare bindings + vars available on the worker, declared in wrangler.toml. */
export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  // vars
  CORS_ORIGINS: string;
  PUBLIC_BASE_URL: string;
  // secrets
  ADMIN_API_KEY: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export type AppContext = Context<{ Bindings: Env }>;

/** A product as returned by the public API (parsed JSON columns). */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  active: boolean;
  stock: number;
  images: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  code: string | null;
  name: string;
  description: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  automatic: boolean;
  free_shipping: boolean;
  active: boolean;
  min_subtotal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}
