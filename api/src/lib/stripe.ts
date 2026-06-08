/**
 * Minimal Stripe client built on `fetch` — no SDK, so it runs on Workers.
 * Only the handful of endpoints the storefront flow needs are wrapped:
 * Checkout Session create/retrieve, ad-hoc Coupons, and webhook verification.
 */

const STRIPE_API = "https://api.stripe.com/v1";

/** Flatten a nested object into Stripe's bracketed form-encoding. */
function encodeForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v != null && typeof v === "object") {
          parts.push(...encodeForm(v as Record<string, unknown>, `${k}[${i}]`));
        } else if (v != null) {
          parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(String(v))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest(
  secretKey: string,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (body) init.body = encodeForm(body).join("&");
  const res = await fetch(`${STRIPE_API}${path}`, init);
  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe error (HTTP ${res.status})`);
  }
  return json;
}

export interface CheckoutLineItem {
  name: string;
  amount: number; // unit amount in cents
  currency: string;
  quantity: number;
}

export interface CreateCheckoutArgs {
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  /** Absolute discount applied via an ad-hoc one-off coupon (cents). */
  amountOff?: number;
  freeShipping?: boolean;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(secretKey: string, args: CreateCheckoutArgs) {
  let couponId: string | undefined;
  if (args.amountOff && args.amountOff > 0) {
    const currency = args.lineItems[0]?.currency || "usd";
    const coupon = await stripeRequest(secretKey, "POST", "/coupons", {
      amount_off: args.amountOff,
      currency,
      duration: "once",
      name: "Discount",
    });
    couponId = coupon.id;
  }

  const body: Record<string, unknown> = {
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    line_items: args.lineItems.map((li) => ({
      quantity: li.quantity,
      price_data: {
        currency: li.currency,
        unit_amount: li.amount,
        product_data: { name: li.name },
      },
    })),
    shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU"] },
    metadata: args.metadata ?? {},
  };
  if (couponId) body.discounts = [{ coupon: couponId }];

  return stripeRequest(secretKey, "POST", "/checkout/sessions", body);
}

export async function retrieveCheckoutSession(secretKey: string, sessionId: string) {
  return stripeRequest(
    secretKey,
    "GET",
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items&expand[]=customer_details`,
  );
}

/* ----------------------------- webhook verify ----------------------------- */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a Stripe webhook signature (the `Stripe-Signature` header) against
 * the raw request body. Returns the parsed event, or throws on failure.
 * Mirrors Stripe's `constructEvent` using Web Crypto (HMAC-SHA256).
 */
export async function constructWebhookEvent(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<any> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  if (!timestamp || !expectedSig) throw new Error("Malformed Stripe signature header.");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > toleranceSeconds) throw new Error("Webhook timestamp outside tolerance.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  if (!timingSafeEqual(toHex(mac), expectedSig)) {
    throw new Error("Webhook signature mismatch.");
  }
  return JSON.parse(payload);
}
