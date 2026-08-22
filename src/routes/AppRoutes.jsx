import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Auth
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Customer
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import ProductsPage from '../pages/customer/ProductsPage';
import ProductDetailPage from '../pages/customer/ProductDetailPage';
import MilkRequestPage from '../pages/customer/MilkRequestPage';
import OrdersPage from '../pages/customer/OrdersPage';
import SubscriptionsPage from '../pages/customer/SubscriptionsPage';
import BillsPage from '../pages/customer/BillsPage';
import PaymentPage from '../pages/customer/PaymentPage';
import CustomerNotificationsPage from '../pages/customer/NotificationsPage';
import CustomerProfilePage from '../pages/customer/ProfilePage';

// Farmer
import FarmerDashboard from '../pages/farmer/FarmerDashboard';
import ProductManagementPage from '../pages/farmer/ProductManagementPage';
import DailyCapacityPage from '../pages/farmer/DailyCapacityPage';
import FarmerOrdersPage from '../pages/farmer/FarmerOrdersPage';
import SalesDashboardPage from '../pages/farmer/SalesDashboardPage';
import MonthlyBillingPage from '../pages/farmer/MonthlyBillingPage';
import FarmerExchangePage from '../pages/farmer/FarmerExchangePage';
import FarmerNotificationsPage from '../pages/farmer/FarmerNotificationsPage';
import FarmerProfilePage from '../pages/farmer/FarmerProfilePage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard'} replace />;
  }
  return children;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/customer/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<LoginPage />} />

      {/* Customer Routes */}
      <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/customer/products" element={<ProtectedRoute role="customer"><ProductsPage /></ProtectedRoute>} />
      <Route path="/customer/products/:id" element={<ProtectedRoute role="customer"><ProductDetailPage /></ProtectedRoute>} />
      <Route path="/customer/subscriptions/milk" element={<ProtectedRoute role="customer"><MilkRequestPage /></ProtectedRoute>} />
      <Route path="/customer/subscriptions" element={<ProtectedRoute role="customer"><SubscriptionsPage /></ProtectedRoute>} />
      <Route path="/customer/orders" element={<ProtectedRoute role="customer"><OrdersPage /></ProtectedRoute>} />
      <Route path="/customer/bills" element={<ProtectedRoute role="customer"><BillsPage /></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute role="customer"><PaymentPage /></ProtectedRoute>} />
      <Route path="/customer/notifications" element={<ProtectedRoute role="customer"><CustomerNotificationsPage /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute role="customer"><CustomerProfilePage /></ProtectedRoute>} />

      {/* Farmer Routes */}
      <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
      <Route path="/farmer/products" element={<ProtectedRoute role="farmer"><ProductManagementPage /></ProtectedRoute>} />
      <Route path="/farmer/capacity" element={<ProtectedRoute role="farmer"><DailyCapacityPage /></ProtectedRoute>} />
      <Route path="/farmer/orders" element={<ProtectedRoute role="farmer"><FarmerOrdersPage /></ProtectedRoute>} />
      <Route path="/farmer/sales" element={<ProtectedRoute role="farmer"><SalesDashboardPage /></ProtectedRoute>} />
      <Route path="/farmer/billing" element={<ProtectedRoute role="farmer"><MonthlyBillingPage /></ProtectedRoute>} />
      <Route path="/farmer/exchange" element={<ProtectedRoute role="farmer"><FarmerExchangePage /></ProtectedRoute>} />
      <Route path="/farmer/notifications" element={<ProtectedRoute role="farmer"><FarmerNotificationsPage /></ProtectedRoute>} />
      <Route path="/farmer/profile" element={<ProtectedRoute role="farmer"><FarmerProfilePage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
