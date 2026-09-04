import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  FileText,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Settings,
  Headphones,
  Bike,
  Tag,
  Clock,
  CheckCircle2,
  Repeat,
  User,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardSidebar = ({ activeTab = 'resumen', setActiveTab, mode = 'comprador' }) => {
  const { user, activeView, setActiveView } = useAuth();
  const location = useLocation();

  const isBuyer = mode === 'comprador';

  // Get user initials for avatar
  const getInitials = (name) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : (isBuyer ? 'Comprador' : 'Vendedor'));
  const initials = getInitials(user?.name);

  // Buyer nav items from reference
  const buyerNav = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, path: '/panel' },
    { id: 'guardadas', label: 'Motos guardadas', icon: Heart, path: '/panel?tab=guardadas' },
    { id: 'solicitudes', label: 'Mis solicitudes', icon: FileText, path: '/panel/mis-ofertas' },
    { id: 'inspecciones', label: 'Mis inspecciones', icon: ShieldCheck, path: '/panel?tab=inspecciones' },
    { id: 'compras', label: 'Mis compras', icon: ShoppingBag, path: '/panel?tab=compras' },
    { id: 'pagos', label: 'Pagos y facturación', icon: CreditCard, path: '/panel?tab=pagos' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, path: '/panel/perfil' },
  ];

  // Seller nav items from reference
  const sellerNav = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, path: '/panel' },
    { id: 'publicaciones', label: 'Mis publicaciones', icon: Bike, path: '/panel/mis-motos' },
    { id: 'ofertas', label: 'Ofertas recibidas', icon: Tag, path: '/panel/mis-ofertas' },
    { id: 'inspecciones', label: 'Inspecciones', icon: ShieldCheck, path: '/panel?tab=inspecciones' },
    { id: 'proceso', label: 'Ventas en proceso', icon: Clock, path: '/panel?tab=proceso' },
    { id: 'completadas', label: 'Ventas completadas', icon: CheckCircle2, path: '/panel?tab=completadas' },
    { id: 'pagos', label: 'Pagos y facturación', icon: CreditCard, path: '/panel/cuenta-bancaria' },
    { id: 'configuracion', label: 'Configuración', icon: Settings, path: '/panel/perfil' },
  ];

  const currentNav = isBuyer ? buyerNav : sellerNav;

  const handleModeSwitch = () => {
    const nextMode = isBuyer ? 'vendedor' : 'comprador';
    setActiveView && setActiveView(nextMode);
  };

  return (
    <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 flex flex-col justify-between py-6 px-4 bg-[#0a0a0c] border-r border-white/5 min-h-[calc(100vh-80px)]">
      <div className="space-y-6">
        {/* User Identity Box */}
        <div className="p-3 bg-[#111114] border border-white/5 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#1e1e24] border border-white/10 flex items-center justify-center text-white font-bold text-sm tracking-wider flex-shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold truncate leading-tight">
                {displayName}
              </div>
              <div className="text-xs font-medium text-red-brand mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-brand"></span>
                <span>{isBuyer ? 'Comprador' : 'Vendedor'}</span>
              </div>
            </div>
          </div>

          {/* Quick Toggle View */}
          <button
            onClick={handleModeSwitch}
            title={`Cambiar a vista de ${isBuyer ? 'Vendedor' : 'Comprador'}`}
            className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-red-brand/10 text-red-brand font-semibold border border-red-brand/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={isActive ? 'text-red-brand' : 'text-zinc-400'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-brand text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Support Card Bottom */}
      <div className="mt-8 pt-4 border-t border-white/5">
        <div className="p-4 bg-[#111114] border border-white/5 rounded-xl relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-brand/10 text-red-brand rounded-lg flex-shrink-0">
              <Headphones size={18} />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold leading-tight">
                ¿Necesitas ayuda?
              </h4>
              <p className="text-zinc-400 text-[11px] mt-1 leading-snug">
                Nuestro equipo está para ayudarte.
              </p>
              <a
                href="https://wa.me/525643048865?text=Hola%20Motoluv,%20necesito%20asistencia%20en%20mi%20panel"
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-red-brand hover:text-red-400 transition-colors"
              >
                <span>Contactar soporte</span>
                <ArrowRight size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
