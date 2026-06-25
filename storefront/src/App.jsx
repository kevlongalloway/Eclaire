import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";
import Story from "./pages/Story.jsx";
import Journal from "./pages/Journal.jsx";
import Care from "./pages/Care.jsx";
import Contact from "./pages/Contact.jsx";
import OrderStatus from "./pages/OrderStatus.jsx";

/* ============================================================================
   Éclaire Atelier — storefront routes.
   A multi-page React app (react-router): each page has its own URL, with the
   header/footer shared via <Layout>. Catalog + cart live in <StoreProvider>
   (see main.jsx) so state is shared across pages.
   ============================================================================ */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:key" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="story" element={<Story />} />
        <Route path="journal" element={<Journal />} />
        <Route path="care" element={<Care />} />
        <Route path="contact" element={<Contact />} />
        <Route path="order" element={<OrderStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
