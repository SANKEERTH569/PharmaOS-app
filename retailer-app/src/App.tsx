import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RetailerLayout } from './components/RetailerLayout';
import { RetailerLoginPage } from './pages/auth/RetailerLoginPage';
import { MarketplacePage } from './pages/retailer/MarketplacePage';
import { CartPage } from './pages/retailer/CartPage';
import { RetailerOrdersPage } from './pages/retailer/RetailerOrdersPage';
import { RetailerProfilePage } from './pages/retailer/RetailerProfilePage';
import { AgencySetupPage } from './pages/retailer/AgencySetupPage';
import { RetailerLedgerPage } from './pages/retailer/RetailerLedgerPage';
import { RetailerReturnsPage } from './pages/retailer/RetailerReturnsPage';
import { NotificationsPage } from './pages/retailer/NotificationsPage';
import { RetailerPaymentsPage } from './pages/retailer/RetailerPaymentsPage';
import { useAuthStore } from './store/authStore';
import { useDataStore } from './store/dataStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, userRole } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (userRole !== 'RETAILER') return <Navigate to="/login" replace />;
    return <RetailerLayout>{children}</RetailerLayout>;
};

const RetailerAuthOnly = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, userRole } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (userRole !== 'RETAILER') return <Navigate to="/login" replace />;
    return <>{children}</>;
};

function App() {
    const { initFromStorage, isAuthenticated, retailer } = useAuthStore();
    const { initData } = useDataStore();

    useEffect(() => {
        initFromStorage();
    }, []);

    useEffect(() => {
        if (isAuthenticated && retailer) {
            initData(retailer.id, 'RETAILER');
        }
    }, [isAuthenticated]);

    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<RetailerLoginPage />} />

                {/* Retailer Routes */}
                <Route path="/shop" element={
                    <ProtectedRoute><MarketplacePage /></ProtectedRoute>
                } />
                <Route path="/shop/setup-agencies" element={
                    <RetailerAuthOnly><AgencySetupPage /></RetailerAuthOnly>
                } />
                <Route path="/shop/cart" element={
                    <ProtectedRoute><CartPage /></ProtectedRoute>
                } />
                <Route path="/shop/orders" element={
                    <ProtectedRoute><RetailerOrdersPage /></ProtectedRoute>
                } />
                <Route path="/shop/returns" element={
                    <ProtectedRoute><RetailerReturnsPage /></ProtectedRoute>
                } />
                <Route path="/shop/ledger" element={
                    <ProtectedRoute><RetailerLedgerPage /></ProtectedRoute>
                } />
                <Route path="/shop/profile" element={
                    <ProtectedRoute><RetailerProfilePage /></ProtectedRoute>
                } />
                <Route path="/shop/notifications" element={
                    <ProtectedRoute><NotificationsPage /></ProtectedRoute>
                } />
                <Route path="/shop/payments" element={
                    <ProtectedRoute><RetailerPaymentsPage /></ProtectedRoute>
                } />

                {/* Default: redirect to shop or login */}
                <Route path="*" element={<Navigate to="/shop" replace />} />
            </Routes>
        </HashRouter>
    );
}

export default App;
