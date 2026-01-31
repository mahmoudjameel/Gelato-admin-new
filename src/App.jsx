import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import CategoryManager from './pages/CategoryManager';

import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import DashboardHome from './pages/DashboardHome';
import ProductManager from './pages/ProductManager';
import BannerManager from './pages/BannerManager';
import OrderManager from './pages/OrderManager';
import StoreManager from './pages/StoreManager';
import UserManager from './pages/UserManager';
import AlertManager from './pages/AlertManager';
import PromoCodeManager from './pages/PromoCodeManager';
import DriverManager from './pages/DriverManager';
import DriverDetails from './pages/DriverDetails';

import ExtrasManager from './pages/ExtrasManager';
import CityManager from './pages/CityManager';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="loading-screen">جاري التحقق...</div>;
  if (!user) return <Login />;

  return children;
};

import LandingPage from './pages/LandingPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="categories" element={<CategoryManager />} />
          <Route path="products" element={<ProductManager />} />
          <Route path="banner" element={<BannerManager />} />
          <Route path="orders" element={<OrderManager />} />
          <Route path="users" element={<UserManager />} />
          <Route path="alerts" element={<AlertManager />} />
          <Route path="promos" element={<PromoCodeManager />} />
          <Route path="drivers" element={<DriverManager />} />
          <Route path="drivers/:driverId" element={<DriverDetails />} />

          <Route path="extras" element={<ExtrasManager />} />
          <Route path="cities" element={<CityManager />} />
          <Route path="store" element={<StoreManager />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
