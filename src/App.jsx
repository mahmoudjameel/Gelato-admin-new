import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { auth, db } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { WebAuthProvider } from './context/WebAuthContext';
import { WebCartProvider } from './context/WebCartContext';

// Lazy load للصفحات - تحميل أسرع وأقل كراش
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const CategoryManager = lazy(() => import('./pages/CategoryManager'));
const ProductLayout = lazy(() => import('./layouts/ProductLayout'));
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
const WebMenu = lazy(() => import('./pages/WebMenu'));

const PageLoader = () => (
  <div className="loading-screen" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    جاري التحميل...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("ProtectedRoute: Auth State Changed", { hasUser: !!user, uid: user?.uid });
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log("ProtectedRoute: User Data Found", { role: data.role });
            // Block customers from accessing the admin dashboard
            if (['admin', 'cashier', 'accountant'].includes(data.role)) {
              console.log("ProtectedRoute: Role Access Allowed");
              setUser(user);
            } else {
              console.log("ProtectedRoute: Role Access Denied");
              setUser(null);
            }
          } else {
            console.warn("ProtectedRoute: User Document Not Found");
            // TEMPORARY BYPASS for debugging: allow admin@admin.com
            if (user.email === 'admin@admin.com' || user.email === 'admin@cooltreat.com') {
              console.log("ProtectedRoute: BYPASS Allowed for Admin Email");
              setUser(user);
            } else {
              setUser(null);
            }
          }
        } catch (error) {
          console.error("ProtectedRoute: Error checking role:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
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
      <WebAuthProvider>
        <WebCartProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/menu" element={<WebMenu />} />
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
                  <Route path="products" element={<ProductLayout />}>
                    <Route index element={<ProductManager />} />
                    <Route path="extras" element={<ExtrasManager />} />
                    <Route path="extra-groups" element={<ExtraGroupsManager />} />
                  </Route>
                  <Route path="banner" element={<BannerManager />} />
                  <Route path="orders" element={<OrderManager />} />
                  <Route path="users" element={<UserManager />} />
                  <Route path="alerts" element={<AlertManager />} />
                  <Route path="promos" element={<PromoCodeManager />} />
                  <Route path="drivers" element={<DriverManager />} />
                  <Route path="drivers/:driverId" element={<DriverDetails />} />

                  <Route path="cities" element={<CityManager />} />
                  <Route path="store" element={<StoreManager />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </WebCartProvider>
      </WebAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
