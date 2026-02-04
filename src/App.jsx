import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// Lazy load للصفحات - تحميل أسرع وأقل كراش
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const CategoryManager = lazy(() => import('./pages/CategoryManager'));
const ProductManager = lazy(() => import('./pages/ProductManager'));
const BannerManager = lazy(() => import('./pages/BannerManager'));
const OrderManager = lazy(() => import('./pages/OrderManager'));
const StoreManager = lazy(() => import('./pages/StoreManager'));
const UserManager = lazy(() => import('./pages/UserManager'));
const AlertManager = lazy(() => import('./pages/AlertManager'));
const PromoCodeManager = lazy(() => import('./pages/PromoCodeManager'));
const DriverManager = lazy(() => import('./pages/DriverManager'));
const DriverDetails = lazy(() => import('./pages/DriverDetails'));
const ExtrasManager = lazy(() => import('./pages/ExtrasManager'));
const ExtraGroupsManager = lazy(() => import('./pages/ExtraGroupsManager'));
const CityManager = lazy(() => import('./pages/CityManager'));
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

const PageLoader = () => (
  <div className="loading-screen" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    جاري التحميل...
  </div>
);

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

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="extra-groups" element={<ExtraGroupsManager />} />
          <Route path="cities" element={<CityManager />} />
          <Route path="store" element={<StoreManager />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
