import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import LuChatbot from './LuChatbot';
import ProductDetailModal from './ProductDetailModal';
import CartDrawer from './CartDrawer';
import StripeCheckoutModal from './StripeCheckoutModal';
import RequirePhoneModal from './RequirePhoneModal';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <LuChatbot />
      <ProductDetailModal />
      <CartDrawer />
      <StripeCheckoutModal />
      <RequirePhoneModal />
    </div>
  );
};

export default Layout;
