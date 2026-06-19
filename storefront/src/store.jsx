import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, buildCatalog, API_CONFIGURED } from "./api.js";

/* ============================================================================
   Shared store — catalog + cart + checkout state for the whole site.
   Lifted out of the page tree so every route (Home, Shop, Product, Cart)
   reads the same catalog and cart without prop-drilling.
   ============================================================================ */

/* Demo fallback catalog (used when no API is configured). */
const MOCK_PRODUCTS = [
  {
    id: "lumiere-rope", name: "Lumière Rope Chain", price: 24800, currency: "usd",
    images: [], stock: -1, active: true,
    description: "A tightly woven rope that throws light in every direction.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '20"', default_width: "3mm" },
  },
  {
    id: "clair-cuban", name: "Clair Cuban Link", price: 31200, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Hand-polished interlocking links with real heft.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '22"', default_width: "5mm" },
  },
  {
    id: "halo-box", name: "Halo Box Chain", price: 19600, currency: "usd",
    images: [], stock: -1, active: true,
    description: "Clean geometric links that sit flat and catch a sharp glint.",
    metadata: { collection: "Signature Silver", metal: "925 Sterling Silver", lengths: ['18"', '20"', '22"'], widths: ["2mm", "3mm", "4mm", "5mm"], default_length: '18"', default_width: "2mm" },
  },
];

/* Collapse cart lines into API line items keyed by productId. */
function aggregateItems(cart, withPrice) {
  const byId = new Map();
  for (const l of cart) {
    const ex = byId.get(l.productId);
    if (ex) ex.quantity += l.qty;
    else byId.set(l.productId, withPrice
      ? { productId: l.productId, price: l.price, quantity: l.qty }
      : { productId: l.productId, quantity: l.qty });
  }
  return [...byId.values()];
}

const StoreContext = createContext(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

export function StoreProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(!API_CONFIGURED);
  const [loadError, setLoadError] = useState(null);

  const [cart, setCart] = useState([]);
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  /* Load catalog once. */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const products = API_CONFIGURED ? await api.listAllProducts() : MOCK_PRODUCTS;
        if (!alive) return;
        setGroups(buildCatalog(products));
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setGroups(buildCatalog(MOCK_PRODUCTS));
        setDemo(true);
        setLoadError(e.message);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const addToCart = useCallback((group, length, width) => {
    const resolved = group.resolve(length, width);
    if (!resolved || resolved.available === false) return;
    const productId = resolved.productId;
    const price = resolved.price != null ? resolved.price : group.price;
    const key = `${productId}|${length}|${width}`;
    setCart((c) => {
      const ex = c.find((i) => i.key === key);
      if (ex) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { key, productId, name: group.name, length, width, price, currency: group.currency, qty: 1 }];
    });
    setQuote(null); setQuoteError(null);
  }, []);

  const changeQty = useCallback((key, d) => {
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i)));
    setQuote(null); setQuoteError(null);
  }, []);

  const removeItem = useCallback((key) => {
    setCart((c) => c.filter((i) => i.key !== key));
    setQuote(null); setQuoteError(null);
  }, []);

  const applyDiscount = useCallback(async () => {
    if (demo || cart.length === 0) return;
    setQuoteError(null);
    try {
      const items = aggregateItems(cart, true);
      const data = await api.validateDiscount(code.trim() || undefined, items);
      if (code.trim() && data.valid === false) setQuoteError(data.error || "That code can’t be applied.");
      setQuote(data);
    } catch (e) {
      setQuoteError(e.message);
    }
  }, [cart, code, demo]);

  const checkout = useCallback(async () => {
    if (demo || cart.length === 0) return;
    setCheckoutBusy(true); setCheckoutError(null);
    try {
      const items = aggregateItems(cart, false);
      const origin = window.location.origin;
      const data = await api.createCheckoutSession({
        items,
        successUrl: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/cart`,
        discountCode: quote && quote.valid && quote.discount ? quote.discount.code : undefined,
      });
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e.message);
      setCheckoutBusy(false);
    }
  }, [cart, demo, quote]);

  const currency = cart[0]?.currency || "usd";
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = quote ? quote.final_amount : subtotal;
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const value = {
    groups, loading, demo, loadError,
    cart, addToCart, changeQty, removeItem,
    code, setCode, quote, quoteError, applyDiscount,
    checkout, checkoutBusy, checkoutError,
    currency, subtotal, total, count,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
