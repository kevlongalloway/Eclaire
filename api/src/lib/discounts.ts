import { rowToDiscount } from "./db";
import type { Discount, Env } from "../types";

export interface QuoteItem {
  productId: string;
  price: number; // unit price in cents (authoritative price is re-read server-side)
  quantity: number;
}

export interface DiscountQuote {
  valid: boolean;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  is_free_shipping: boolean;
  automatic_discounts: { name: string; description: string }[];
  discount: { code: string; name: string; description: string } | null;
  error?: string;
}

function withinWindow(d: Discount, now: number): boolean {
  if (d.starts_at && Date.parse(d.starts_at) > now) return false;
  if (d.ends_at && Date.parse(d.ends_at) < now) return false;
  return true;
}

function usable(d: Discount, now: number, subtotal: number): boolean {
  if (!d.active) return false;
  if (!withinWindow(d, now)) return false;
  if (d.usage_limit != null && d.usage_count >= d.usage_limit) return false;
  if (d.min_subtotal != null && subtotal < d.min_subtotal) return false;
  return true;
}

/** Amount taken off the subtotal by a single discount (never below zero). */
function amountOff(d: Discount, subtotal: number): number {
  if (d.type === "percentage") {
    return Math.min(subtotal, Math.round((subtotal * d.value) / 100));
  }
  if (d.type === "fixed") {
    return Math.min(subtotal, Math.max(0, d.value));
  }
  return 0; // free_shipping has no monetary line effect here
}

/**
 * Re-prices a cart against the live catalog, stacks any active automatic sales,
 * then applies an optional code. Returns the envelope the storefront expects.
 * `code` may be undefined (just surface automatic sales / compute totals).
 */
export async function quoteCart(
  env: Env,
  items: QuoteItem[],
  code?: string,
  storeId?: string | null,
): Promise<DiscountQuote> {
  const now = Date.now();
  // Resolve which store's discounts apply. When unspecified, fall back to the
  // default store so single-store deployments keep working unchanged.
  const scopeId = storeId || "store_default";

  // Re-read authoritative unit prices so a tampered client can't move totals.
  let subtotal = 0;
  if (items.length) {
    const ids = items.map((i) => i.productId);
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT id, price FROM products WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .all<{ id: string; price: number }>();
    const priceById = new Map(results.map((r) => [r.id, r.price]));
    for (const it of items) {
      const unit = priceById.get(it.productId) ?? it.price ?? 0;
      subtotal += unit * Math.max(1, it.quantity || 1);
    }
  }

  // Load every active automatic sale for this store and the requested code (if
  // any). Legacy rows with a NULL store_id are treated as the default store.
  const { results: autoRows } = await env.DB.prepare(
    `SELECT * FROM discounts WHERE automatic = 1 AND active = 1 AND COALESCE(store_id, 'store_default') = ?`,
  )
    .bind(scopeId)
    .all();
  const automatic = autoRows
    .map((r) => rowToDiscount(r as never))
    .filter((d) => usable(d, now, subtotal));

  let discountAmount = 0;
  let freeShipping = false;
  const autoSummaries: { name: string; description: string }[] = [];
  for (const d of automatic) {
    discountAmount += amountOff(d, subtotal - discountAmount);
    if (d.free_shipping || d.type === "free_shipping") freeShipping = true;
    autoSummaries.push({ name: d.name, description: d.description });
  }

  let codeDiscount: DiscountQuote["discount"] = null;
  let valid = !code; // no code requested ⇒ trivially "valid"
  let error: string | undefined;

  if (code) {
    const row = await env.DB.prepare(
      `SELECT * FROM discounts WHERE code = ? COLLATE NOCASE AND COALESCE(store_id, 'store_default') = ?`,
    )
      .bind(code.trim(), scopeId)
      .first();
    if (!row) {
      error = "That code isn't valid.";
    } else {
      const d = rowToDiscount(row as never);
      if (!usable(d, now, subtotal)) {
        error =
          d.min_subtotal != null && subtotal < d.min_subtotal
            ? "Your cart doesn't meet the minimum for this code."
            : "That code is no longer available.";
      } else {
        valid = true;
        discountAmount += amountOff(d, subtotal - discountAmount);
        if (d.free_shipping || d.type === "free_shipping") freeShipping = true;
        codeDiscount = { code: d.code ?? code, name: d.name, description: d.description };
      }
    }
  }

  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  return {
    valid,
    original_amount: subtotal,
    discount_amount: discountAmount,
    final_amount: subtotal - discountAmount,
    is_free_shipping: freeShipping,
    automatic_discounts: autoSummaries,
    discount: codeDiscount,
    ...(error ? { error } : {}),
  };
}
