import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import AuthGuard from './components/AuthGuard.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import CustomerMenu from './pages/customer/CustomerMenu.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import OrderConfirmation from './pages/customer/OrderConfirmation.jsx';
import KitchenDashboard from './pages/kitchen/KitchenDashboard.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import MenuManager from './pages/admin/MenuManager.jsx';
import OrdersPanel from './pages/admin/OrdersPanel.jsx';
import TableManager from './pages/admin/TableManager.jsx';
import RestaurantSettings from './pages/admin/RestaurantSettings.jsx';
import StaffManagement from './pages/admin/StaffManagement.jsx';
import Subscription from './pages/admin/Subscription.jsx';
import Invoices from './pages/admin/Invoices.jsx';
import PlatformAdmin from './pages/platform/PlatformAdmin.jsx';

export default function App() {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Customer-facing (QR) */}
      <Route path="/r/:slug/menu" element={<CustomerMenu />} />
      <Route path="/r/:slug/checkout" element={<CheckoutPage />} />
      <Route path="/r/:slug/order-confirm" element={<OrderConfirmation />} />

      {/* Kitchen */}
      <Route element={<AuthGuard roles={['admin', 'staff', 'kitchen', 'platform_admin']} />}>
        <Route path="/r/:slug/kitchen" element={<KitchenDashboard />} />
      </Route>

      {/* Admin (includes platform_admin) */}
      <Route element={<AuthGuard roles={['admin', 'platform_admin']} />}>
        <Route path="/r/:slug/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="orders" element={<OrdersPanel />} />
          <Route path="tables" element={<TableManager />} />
          <Route path="settings" element={<RestaurantSettings />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="invoices" element={<Invoices />} />
        </Route>
      </Route>

      {/* Platform Super Admin */}
      <Route element={<AuthGuard roles={['platform_admin']} />}>
        <Route path="/platform" element={<PlatformAdmin />} />
      </Route>

      <Route path="/unauthorized" element={<div style={{padding:40,textAlign:'center'}}><h2>403 — Access Denied</h2></div>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
