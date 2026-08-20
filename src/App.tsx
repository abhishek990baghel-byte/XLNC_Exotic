import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/MaterialsList';
import MaterialForm from './pages/MaterialForm';
import MaterialDetail from './pages/MaterialDetail';
import BulkUpload from './pages/BulkUpload';
import ScanCart from './pages/ScanCart';
import SalesList from './pages/SalesList';
import SalesForm from './pages/SalesForm';
import InvoicePrint from './pages/InvoicePrint';
import PurchasesList from './pages/PurchasesList';
import SettingsPage from './pages/SettingsPage';
import LedgerPage from './pages/LedgerPage';
import AuditLogPage from './pages/AuditLogPage';
import BarcodePrintPage from './pages/BarcodePrintPage';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';

import { AuthProvider, useAuth } from './context/AuthContext';
import { stockNotificationService } from './services/notificationService';

import { Toaster } from 'react-hot-toast';

function ProtectedApp() {
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (user) {
      stockNotificationService.startMonitoring(60000);
      return () => {
        stockNotificationService.stopMonitoring();
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300 text-sm font-semibold tracking-wide">Connecting to Live PostgreSQL Database...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={role === 'admin' ? <Dashboard /> : <Navigate to="/materials" />} />
          <Route path="materials" element={<MaterialsList />} />
          <Route path="materials/new" element={role === 'admin' ? <MaterialForm /> : <Navigate to="/materials" />} />
          <Route path="materials/bulk-upload" element={role === 'admin' ? <BulkUpload /> : <Navigate to="/materials" />} />
          <Route path="materials/print-barcodes" element={<BarcodePrintPage />} />
          <Route path="materials/:id/edit" element={role === 'admin' ? <MaterialForm /> : <Navigate to="/materials" />} />
          <Route path="materials/:id" element={<MaterialDetail />} />
          <Route path="scan" element={<ScanCart />} />
          <Route path="sales" element={role === 'admin' ? <SalesList /> : <Navigate to="/materials" />} />
          <Route path="sales/new" element={role === 'admin' ? <SalesForm /> : <Navigate to="/materials" />} />
          <Route path="sales/:id/print" element={role === 'admin' ? <InvoicePrint /> : <Navigate to="/materials" />} />
          <Route path="purchases" element={role === 'admin' ? <PurchasesList /> : <Navigate to="/materials" />} />
          <Route path="ledger" element={role === 'admin' ? <LedgerPage /> : <Navigate to="/materials" />} />
          <Route path="settings" element={role === 'admin' ? <SettingsPage /> : <Navigate to="/materials" />} />
          <Route path="users" element={role === 'admin' ? <UserManagement /> : <Navigate to="/materials" />} />
          <Route path="audit" element={role === 'admin' ? <AuditLogPage /> : <Navigate to="/materials" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
