
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RetailerLayout } from './components/RetailerLayout';
import { LoginSelectorPage } from './pages/auth/LoginSelectorPage';
import { WholesalerLoginPage } from './pages/auth/WholesalerLoginPage';
import { RetailerLoginPage } from './pages/auth/RetailerLoginPage';
import { DashboardHome } from './pages/DashboardHome';
import { OrdersPage } from './pages/OrdersPage';
import { RetailersPage } from './pages/RetailersPage';
import { RetailerDetailPage } from './pages/RetailerDetailPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { CollectionPage } from './pages/CollectionPage';
import { LedgerPage } from './pages/LedgerPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MarketplacePage } from './pages/retailer/MarketplacePage';
import { CartPage } from './pages/retailer/CartPage';
import { RetailerOrdersPage } from './pages/retailer/RetailerOrdersPage';
import { RetailerProfilePage } from './pages/retailer/RetailerProfilePage';
import { AgencySetupPage } from './pages/retailer/AgencySetupPage';
import { RetailerLedgerPage } from './pages/retailer/RetailerLedgerPage';
import { RetailerReturnsPage } from './pages/retailer/RetailerReturnsPage';
import { WholesalerReturnsPage } from './pages/WholesalerReturnsPage';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { UserRole } from './types';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: UserRole }) => {
  const { isAuthenticated, userRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== allowedRole) {
    // Redirect to appropriate dashboard based on actual role
    return <Navigate to={userRole === 'WHOLESALER' ? '/' : '/shop'} replace />;
  }

  return allowedRole === 'WHOLESALER' ? (
    <Layout>{children}</Layout>
  ) : (
    <RetailerLayout>{children}</RetailerLayout>
  );
};

// For retailer pages that use their own full-screen layout (no RetailerLayout wrapper)
const RetailerAuthOnly = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, userRole } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== 'RETAILER') return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  const { initFromStorage, isAuthenticated, wholesaler, retailer } = useAuthStore();
  const { initData } = useDataStore();

  // Restore auth from localStorage on app load
  useEffect(() => {
    initFromStorage();
  }, []);

  // Load all data once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const id = wholesaler?.id || retailer?.id || '';
      const role = wholesaler ? 'WHOLESALER' : 'RETAILER';
      initData(id, role);
    }
  }, [isAuthenticated]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginSelectorPage />} />
        <Route path="/login/wholesaler" element={<WholesalerLoginPage />} />
        <Route path="/login/retailer" element={<RetailerLoginPage />} />

        {/* Wholesaler Routes */}
        <Route path="/" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <DashboardHome />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/retailers" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <RetailersPage />
          </ProtectedRoute>
        } />
        <Route path="/retailers/:id" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <RetailerDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/medicines" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <MedicinesPage />
          </ProtectedRoute>
        } />
        <Route path="/collection" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <CollectionPage />
          </ProtectedRoute>
        } />
        <Route path="/ledger" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <LedgerPage />
          </ProtectedRoute>
        } />
        <Route path="/payments" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <PaymentsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/returns" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <WholesalerReturnsPage />
          </ProtectedRoute>
        } />

        {/* Retailer Routes */}
        <Route path="/shop" element={
          <ProtectedRoute allowedRole="RETAILER">
            <MarketplacePage />
          </ProtectedRoute>
        } />
        <Route path="/shop/setup-agencies" element={
          <RetailerAuthOnly>
            <AgencySetupPage />
          </RetailerAuthOnly>
        } />
        <Route path="/shop/cart" element={
          <ProtectedRoute allowedRole="RETAILER">
            <CartPage />
          </ProtectedRoute>
        } />
        <Route path="/shop/orders" element={
          <ProtectedRoute allowedRole="RETAILER">
            <RetailerOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/shop/returns" element={
          <ProtectedRoute allowedRole="RETAILER">
            <RetailerReturnsPage />
          </ProtectedRoute>
        } />
        <Route path="/shop/ledger" element={
          <ProtectedRoute allowedRole="RETAILER">
            <RetailerLedgerPage />
          </ProtectedRoute>
        } />
        <Route path="/shop/profile" element={
          <ProtectedRoute allowedRole="RETAILER">
            <RetailerProfilePage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
