import type { Context } from "hono";

/** Cloudflare bindings + vars available on the worker, declared in wrangler.toml. */
export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  // vars
  CORS_ORIGINS: string;
  PUBLIC_BASE_URL: string;
  STOREFRONT_BASE_URL?: string;
  // secrets — admin login credentials (set in the Cloudflare dashboard)
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  // secrets — transactional email (Resend). Leave blank to disable sending.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
}

/** Per-request values set by middleware (the authenticated admin session). */
export interface Variables {
  sessionTokenHash: string;
  adminUsername: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/** A store — each storefront deploy maps to one store via its slug. */
export interface Store {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

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
  store_id: string | null;
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
  store_id: string | null;
  created_at: string;
  updated_at: string;
}
