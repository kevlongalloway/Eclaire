import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { API_CONFIGURED } from "./api";
import Login from "./components/Login.jsx";
import Layout from "./components/Layout.jsx";
import Overview from "./pages/Overview.jsx";
import Products from "./pages/Products.jsx";
import Orders from "./pages/Orders.jsx";

export default function App() {
  const { isAuthed } = useAuth();

  if (!API_CONFIGURED) {
    return (
      <div className="ad-center">
        <div className="ad-card ad-config-warn">
          <h1>Configuration needed</h1>
          <p>
            Set <code>VITE_API_BASE</code> to your Éclaire API worker URL and rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthed) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
