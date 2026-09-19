import React, { useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import MotoDetailPage from './pages/MotoDetailPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PartnersPage from './pages/PartnersPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ShopPage from './pages/ShopPage';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import CreateMotoPage from './pages/CreateMotoPage';
import MyOffersPage from './pages/MyOffersPage';
import MyMotosPage from './pages/MyMotosPage';
import ProfilePage from './pages/ProfilePage';
import BankAccountPage from './pages/BankAccountPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { Toaster } from './components/ui/toaster';
import { initGA, trackPageView } from './lib/analytics';

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const page = location.pathname + location.search;
    trackPageView(page);
  }, [location.pathname, location.search]);

  return null;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname, search]);

  return null;
}

function OAuthRedirectHandler() {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  // Detectar si la carga de la página proviene de un retorno de OAuth (hash/tokens en URL o flujo iniciado)
  const wasOAuthReturnRef = useRef(
    typeof window !== 'undefined' && Boolean(
      (window.location.hash && (
        window.location.hash.includes('access_token') ||
        window.location.hash.includes('refresh_token') ||
        window.location.hash.includes('id_token') ||
        window.location.hash.includes('token_type=bearer') ||
        window.location.hash.includes('error_description')
      )) ||
      (window.location.search && /[?&]code=/.test(window.location.search)) ||
      (() => {
        try {
          return Boolean(
            localStorage.getItem('motoluv_oauth_flow') ||
            sessionStorage.getItem('motoluv_oauth_flow')
          );
        } catch {
          return false;
        }
      })()
    )
  );

  useEffect(() => {
    if (redirectedRef.current) return;
    if (loading) return;

    const hasAuth = Boolean(user || session);
    if (!hasAuth) return;

    const currentHash = location.hash || (typeof window !== 'undefined' ? window.location.hash : '');
    const currentSearch = location.search || (typeof window !== 'undefined' ? window.location.search : '');
    const hasOAuthHash =
      currentHash.includes('access_token') ||
      currentHash.includes('refresh_token') ||
      currentHash.includes('id_token') ||
      currentHash.includes('token_type=bearer') ||
      currentHash.includes('error_description') ||
      /[?&]code=/.test(currentSearch);

    // Cuando exista sesión y el retorno OAuth dejó al usuario en / o en una URL con hash de OAuth
    if ((wasOAuthReturnRef.current && location.pathname === '/') || hasOAuthHash) {
      redirectedRef.current = true;
      navigate('/panel', { replace: true });
    }
  }, [user, session, loading, location.pathname, location.hash, location.search, navigate]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <BrowserRouter>
                <AnalyticsTracker />
                <ScrollToTop />
                <OAuthRedirectHandler />
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/motos" element={<CatalogPage />} />
                    <Route path="/motos/:id" element={<MotoDetailPage />} />
                    <Route path="/como-funciona" element={<HowItWorksPage />} />
                    <Route path="/sumate" element={<PartnersPage />} />
                    <Route path="/partners" element={<PartnersPage />} />
                    <Route path="/tienda" element={<ShopPage />} />
                    <Route path="/registro" element={<RegisterPage />} />
                    <Route path="/iniciar-sesion" element={<LoginPage />} />
                    <Route path="/aviso-de-privacidad" element={<PrivacyPolicyPage />} />
                    <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />
                    <Route path="/privacidad" element={<PrivacyPolicyPage />} />
                    <Route path="/terminos-y-condiciones" element={<TermsPage />} />
                    <Route path="/terminos" element={<TermsPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/panel" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                    <Route path="/panel/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/panel/cuenta-bancaria" element={<ProtectedRoute role="vendedor"><BankAccountPage /></ProtectedRoute>} />
                    <Route path="/panel/publicar" element={<ProtectedRoute role="vendedor"><CreateMotoPage /></ProtectedRoute>} />
                    <Route path="/panel/mis-motos" element={<ProtectedRoute role="vendedor"><MyMotosPage /></ProtectedRoute>} />
                    <Route path="/panel/mis-ofertas" element={<ProtectedRoute><MyOffersPage /></ProtectedRoute>} />
                  </Route>
                </Routes>
              </BrowserRouter>
              <Toaster />
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

function DashboardRouter() {
  const { user, activeView } = useAuth();
  if (!user) return null;
  const isSeller = activeView === 'vendedor' || (!activeView && (user.role === 'vendedor' || user.role === 'both'));
  return isSeller ? <SellerDashboard /> : <BuyerDashboard />;
}

export default App;
