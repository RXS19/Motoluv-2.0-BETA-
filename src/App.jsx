import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
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
