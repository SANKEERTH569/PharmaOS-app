
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RetailerLayout } from './components/RetailerLayout';
import { AdminLayout } from './components/AdminLayout';
import { LoginSelectorPage } from './pages/auth/LoginSelectorPage';
import { WholesalerLoginPage } from './pages/auth/WholesalerLoginPage';
import { RetailerLoginPage } from './pages/auth/RetailerLoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { DashboardHome } from './pages/DashboardHome';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { InvoicePage } from './pages/InvoicePage';
import { CombinedPrintPage } from './pages/CombinedPrintPage';
import { DeliveryChallanPage } from './pages/DeliveryChallanPage';
import { DailyInvoicePage } from './pages/DailyInvoicePage';
import { RetailersPage } from './pages/RetailersPage';
import { RetailerDetailPage } from './pages/RetailerDetailPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { RackManagerPage } from './pages/RackManagerPage';
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
import { NotificationsPage } from './pages/retailer/NotificationsPage';
import { RetailerPaymentsPage } from './pages/retailer/RetailerPaymentsPage';
import { WholesalerReturnsPage } from './pages/WholesalerReturnsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { WholesalerManagement } from './pages/admin/WholesalerManagement';
import { RetailerManagement } from './pages/admin/RetailerManagement';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { PlanManagement } from './pages/admin/PlanManagement';
import { RevenueManagement } from './pages/admin/RevenueManagement';
import { ActivityLog } from './pages/admin/ActivityLog';
import { CouponManagement } from './pages/admin/CouponManagement';
import { IssuesControlPage } from './pages/admin/IssuesControlPage';
import { CollectionsControlPage } from './pages/admin/CollectionsControlPage';
import { SalesforceControlPage } from './pages/admin/SalesforceControlPage';
import { InventoryControlPage } from './pages/admin/InventoryControlPage';
import { ComplianceControlPage } from './pages/admin/ComplianceControlPage';
import { GstDashboardPage } from './pages/GstDashboardPage';
import { QuickSalePage } from './pages/QuickSalePage';
import { SchemesPage } from './pages/SchemesPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { CreatePurchaseOrderPage } from './pages/CreatePurchaseOrderPage';
import { WholesalerOrderPage } from './pages/WholesalerOrderPage';
import { PurchaseOrderInvoicePage } from './pages/PurchaseOrderInvoicePage';
import { MainWholesalerLoginPage } from './pages/auth/MainWholesalerLoginPage';
import { SalesmanLoginPage } from './pages/auth/SalesmanLoginPage';
import { MainWholesalerLayout } from './components/MainWholesalerLayout';
import { WholesalerDashboard } from './pages/wholesaler/WholesalerDashboard';
import { SupplyOrdersPage } from './pages/wholesaler/SupplyOrdersPage';
import { SupplyOrderInvoicePage } from './pages/wholesaler/SupplyOrderInvoicePage';
import { MainWholesalerCatalogPage } from './pages/wholesaler/MainWholesalerCatalogPage';
import { MainWholesalerSchemesPage } from './pages/wholesaler/MainWholesalerSchemesPage';
import { MainWholesalerSubWholesalersPage } from './pages/wholesaler/MainWholesalerSubWholesalersPage';
import { MainWholesalerLedgerPage } from './pages/wholesaler/MainWholesalerLedgerPage';
import { MainWholesalerPaymentsPage } from './pages/wholesaler/MainWholesalerPaymentsPage';
import { MainWholesalerGstPage } from './pages/wholesaler/MainWholesalerGstPage';
import { MainWholesalerCollectionPage } from './pages/wholesaler/MainWholesalerCollectionPage';
import { MainWholesalerSettingsPage } from './pages/wholesaler/MainWholesalerSettingsPage';
import { MainWholesalerAlertsPage } from './pages/wholesaler/MainWholesalerAlertsPage';
import { SalesmenPage } from './pages/SalesmenPage';
import { SalesmanRequestsPage } from './pages/wholesaler/SalesmanRequestsPage';
import { BeatRoutesPage } from './pages/BeatRoutesPage';
import { CallReportsPage } from './pages/CallReportsPage';
import { SalesPerformancePage } from './pages/SalesPerformancePage';
import { SalesmanLayout } from './components/SalesmanLayout';
import { SalesmanDashboard } from './pages/salesman/SalesmanDashboard';
import { SalesmanCallReportPage } from './pages/salesman/SalesmanCallReportPage';
import { SalesmanCollectPage } from './pages/salesman/SalesmanCollectPage';
import { SalesmanRegisterPage } from './pages/auth/SalesmanRegisterPage';
import { SalesmanConnectPage } from './pages/salesman/SalesmanConnectPage';
import { SupportTicketsPage } from './pages/SupportTicketsPage';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';
import { connectSocket } from './utils/socket';
import { UserRole } from './types';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: UserRole }) => {
  const { isAuthenticated, userRole } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== allowedRole) {
    // Redirect to appropriate dashboard based on actual role
    const dest = userRole === 'ADMIN' ? '/admin' : userRole === 'WHOLESALER' ? '/' : userRole === 'MAIN_WHOLESALER' ? '/wholesaler' : userRole === 'SALESMAN' ? '/salesman' : '/shop';
    return <Navigate to={dest} replace />;
  }

  if (allowedRole === 'ADMIN') {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (allowedRole === 'MAIN_WHOLESALER') {
    return <MainWholesalerLayout>{children}</MainWholesalerLayout>;
  }

  if (allowedRole === 'SALESMAN') {
    return <SalesmanLayout>{children}</SalesmanLayout>;
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
  const { isAuthenticated, wholesaler, retailer, mainWholesaler, userRole } = useAuthStore();
  const { initData } = useDataStore();

  // Connect socket for sessions restored from localStorage
  useEffect(() => {
    if (isAuthenticated && userRole && userRole !== 'ADMIN' && userRole !== 'MAIN_WHOLESALER') {
      const user = wholesaler || retailer;
      if (user) connectSocket(`${userRole.toLowerCase()}_${user.id}`);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userRole !== 'ADMIN' && userRole !== 'MAIN_WHOLESALER') {
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
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/login/main-wholesaler" element={<MainWholesalerLoginPage />} />
        <Route path="/login/salesman" element={<SalesmanLoginPage />} />

        {/* Main Wholesaler Routes */}
        <Route path="/wholesaler" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <WholesalerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/catalog" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerCatalogPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/main-schemes" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerSchemesPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/sub-wholesalers" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerSubWholesalersPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/main-ledger" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerLedgerPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/main-payments" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerPaymentsPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/orders" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <SupplyOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/orders/:soId/invoice" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <SupplyOrderInvoicePage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/gst" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerGstPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/collection" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerCollectionPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/settings" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/support-tickets" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <SupportTicketsPage />
          </ProtectedRoute>
        } />
        <Route path="/wholesaler/alerts" element={
          <ProtectedRoute allowedRole="MAIN_WHOLESALER">
            <MainWholesalerAlertsPage />
          </ProtectedRoute>
        } />

        {/* Sub-Wholesaler Routes */}
        <Route path="/" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <DashboardHome />
          </ProtectedRoute>
        } />
        <Route path="/quick-sale" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <QuickSalePage />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/invoice" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <InvoicePage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/combined-print" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <CombinedPrintPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/delivery-challan" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <DeliveryChallanPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/daily-invoice" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <DailyInvoicePage />
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
        <Route path="/gst" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <GstDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/support-tickets" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SupportTicketsPage />
          </ProtectedRoute>
        } />
        <Route path="/rack-manager" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <RackManagerPage />
          </ProtectedRoute>
        } />
        <Route path="/purchase-orders" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <PurchaseOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/purchase-orders/new" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <CreatePurchaseOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/order-from-wholesaler" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <WholesalerOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/purchase-orders/:poId/invoice" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <PurchaseOrderInvoicePage />
          </ProtectedRoute>
        } />
        <Route path="/returns" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <WholesalerReturnsPage />
          </ProtectedRoute>
        } />
        <Route path="/schemes" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SchemesPage />
          </ProtectedRoute>
        } />
        <Route path="/salesmen/requests" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SalesmanRequestsPage />
          </ProtectedRoute>
        } />
        <Route path="/salesmen" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SalesmenPage />
          </ProtectedRoute>
        } />
        <Route path="/beat-routes" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <BeatRoutesPage />
          </ProtectedRoute>
        } />
        <Route path="/call-reports" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <CallReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/sales-performance" element={
          <ProtectedRoute allowedRole="WHOLESALER">
            <SalesPerformancePage />
          </ProtectedRoute>
        } />

        {/* Salesman Routes */}
        <Route path="/salesman/connect" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanConnectPage />
          </ProtectedRoute>
        } />
        <Route path="/salesman/wholesalers" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanLayout>
              <SalesmanConnectPage embedded />
            </SalesmanLayout>
          </ProtectedRoute>
        } />
        <Route path="/salesman" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanDashboard />
          </ProtectedRoute>
        } />
        <Route path="/salesman/order" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanCallReportPage />
          </ProtectedRoute>
        } />
        <Route path="/salesman/reports" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanCallReportPage />
          </ProtectedRoute>
        } />
        <Route path="/salesman/collect" element={
          <ProtectedRoute allowedRole="SALESMAN">
            <SalesmanCollectPage />
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
        <Route path="/shop/notifications" element={
          <ProtectedRoute allowedRole="RETAILER">
            <NotificationsPage />
          </ProtectedRoute>
        } />
        <Route path="/shop/payments" element={
          <ProtectedRoute allowedRole="RETAILER">
            <RetailerPaymentsPage />
          </ProtectedRoute>
        } />

        <Route path="/register/salesman" element={<SalesmanRegisterPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/wholesalers" element={
          <ProtectedRoute allowedRole="ADMIN">
            <WholesalerManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/retailers" element={
          <ProtectedRoute allowedRole="ADMIN">
            <RetailerManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/revenue" element={
          <ProtectedRoute allowedRole="ADMIN">
            <RevenueManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/plans" element={
          <ProtectedRoute allowedRole="ADMIN">
            <PlanManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/activity" element={
          <ProtectedRoute allowedRole="ADMIN">
            <ActivityLog />
          </ProtectedRoute>
        } />
        <Route path="/admin/coupons" element={
          <ProtectedRoute allowedRole="ADMIN">
            <CouponManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/issues" element={
          <ProtectedRoute allowedRole="ADMIN">
            <IssuesControlPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/collections" element={
          <ProtectedRoute allowedRole="ADMIN">
            <CollectionsControlPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/salesforce" element={
          <ProtectedRoute allowedRole="ADMIN">
            <SalesforceControlPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/inventory" element={
          <ProtectedRoute allowedRole="ADMIN">
            <InventoryControlPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/compliance" element={
          <ProtectedRoute allowedRole="ADMIN">
            <ComplianceControlPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
