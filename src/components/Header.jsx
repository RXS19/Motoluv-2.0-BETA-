import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bike, Store, Menu, X, LayoutDashboard, Tag, LogOut, Repeat, ShoppingCart, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { MotoluvLogo } from './MotoluvLogo';
import NotificationBell from './NotificationBell';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout, activeView, setActiveView } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (p) => location.pathname === p || (p !== '/' && location.pathname.startsWith(p));

  const navItems = [
    { to: '/como-funciona', label: 'Cómo Funciona' },
    { to: '/motos', label: 'Motocicletas' },
    { to: '/tienda', label: 'Tienda', icon: Store },
  ];

  const mobileNavItems = [
    { to: '/motos', label: 'Motocicletas' },
    { to: '/tienda', label: 'Tienda', icon: Store },
  ];

  const doLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const toggleProfileView = () => {
    const nextView = activeView === 'vendedor' ? 'comprador' : 'vendedor';
    setActiveView(nextView);
    setDropdownOpen(false);
    if (nextView === 'comprador') navigate('/panel/mis-ofertas');
    else navigate('/panel');
  };

  const firstName = user?.name?.split(' ')[0] || 'Usuario';
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a]/85 backdrop-blur border-b border-black">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center group" title="Motoluv">
          <div className="relative flex items-center justify-center py-1 px-2 rounded bg-black/60 border border-black group-hover:border-[#E10600]/60 transition-colors">
            <MotoluvLogo className="h-7 md:h-8 w-auto" />
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isActive(to) ? 'text-red-brand' : 'text-zinc-300 hover:text-red-brand'
              }`}
            >
              {Icon && <Icon size={16} />}
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-full border border-white/10 hover:border-red-brand/50 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Ver carrito de compra"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-brand text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {cartCount}
              </span>
            )}
          </button>

          {user && (
            <NotificationBell />
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 pr-2 pl-1 py-1 rounded-full border border-white/10 hover:border-red-brand/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-brand/20 border border-red-brand/40 flex items-center justify-center text-red-brand text-xs font-bold">
                  {initials}
                </div>
                <span className="text-sm text-white pr-2">{firstName}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#111112] border border-white/10 rounded-md shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 bg-[#0a0a0a]">
                    <div className="text-white text-sm font-medium">{user.name}</div>
                    <div className="text-zinc-500 text-xs truncate">{user.email}</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-brand/10 border border-red-brand/30 text-red-brand">
                      {activeView === 'vendedor' ? 'Perfil Vendedor' : 'Perfil Comprador'}
                    </div>
                  </div>
                  <div className="py-2">
                    <DropdownLink to="/panel/perfil" icon={User} label="Mi Perfil" onClick={() => setDropdownOpen(false)} />
                    <DropdownLink to="/panel" icon={LayoutDashboard} label="Panel de Vendedor" onClick={() => { setActiveView('vendedor'); setDropdownOpen(false); }} />
                    <DropdownLink to="/panel/mis-ofertas" icon={Tag} label="Mis Ofertas (Comprador)" onClick={() => { setActiveView('comprador'); setDropdownOpen(false); }} />
                    <DropdownLink to="/panel/mis-motos" icon={Bike} label="Mis Publicaciones" onClick={() => { setActiveView('vendedor'); setDropdownOpen(false); }} />
                  </div>
                  <div className="border-t border-white/5 py-2">
                    <button onClick={toggleProfileView} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold tracking-wider uppercase text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Repeat size={14} className="text-red-brand" /> {activeView === 'vendedor' ? 'Cambiar a Vista Comprador' : 'Cambiar a Vista Vendedor'}
                    </button>
                    <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold tracking-wider uppercase text-red-brand hover:bg-white/5 transition-colors">
                      <LogOut size={14} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/iniciar-sesion" className="text-sm text-zinc-300 hover:text-red-brand transition-colors">
                Iniciar Sesión
              </Link>
              <button
                onClick={() => navigate('/registro')}
                className="btn-red px-5 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm"
              >
                Registrarse
              </button>
            </>
          )}
        </div>

        {/* Mobile Right Controls: Cart, Notifications Bell, Hamburger Menu */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-full border border-white/10 hover:border-red-brand/50 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Ver carrito de compra"
            aria-label="Ver carrito"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-brand text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {cartCount}
              </span>
            )}
          </button>

          {user && (
            <NotificationBell
              buttonClassName="relative p-2 rounded-full border border-white/10 hover:border-red-brand/50 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              iconSize={18}
            />
          )}

          <button
            className="p-2 text-white hover:text-red-brand transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-white/5"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-tag-dropdown"
            initial={{ opacity: 0, y: -14, scale: 0.96, rotateX: -8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
              transition: {
                type: 'spring',
                stiffness: 400,
                damping: 28,
                mass: 0.8,
              },
            }}
            exit={{
              opacity: 0,
              y: -10,
              scale: 0.97,
              rotateX: -6,
              transition: { duration: 0.18, ease: 'easeInOut' },
            }}
            style={{ transformOrigin: 'top right' }}
            className="md:hidden px-3 pt-2 pb-4"
          >
            {/* Suspended Tag Container */}
            <div className="relative bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
              {/* Top Tag Rivet & Ribbon Header */}
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-brand animate-pulse" />
                  <span className="text-xs font-display font-bold tracking-wider text-zinc-200 uppercase">
                    MENÚ
                  </span>
                </div>
                {/* Metallic tag grommet / eyelet */}
                <div className="flex items-center gap-1.5" title="Tag Eyelet">
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 bg-[#07070a] flex items-center justify-center shadow-inner">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-brand/70" />
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-3 space-y-1">
                {mobileNavItems.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-red-brand/10 text-white border border-red-brand/30 shadow-sm'
                          : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {Icon && (
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              active ? 'bg-red-brand text-white' : 'bg-white/5 text-zinc-400'
                            }`}
                          >
                            <Icon size={16} />
                          </div>
                        )}
                        <span>{label}</span>
                      </div>
                      <ChevronRight
                        size={15}
                        className={`transition-transform ${active ? 'text-red-brand translate-x-0.5' : 'text-zinc-600'}`}
                      />
                    </Link>
                  );
                })}
              </div>

              {/* Perforated ticket / tag notch divider */}
              <div className="relative my-1 px-4">
                <div className="border-b border-dashed border-white/15" />
                {/* Left & Right punch-out tag notches */}
                <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-[#0a0a0a] border-r border-white/15" />
                <div className="absolute -right-2 -top-1.5 w-3 h-3 rounded-full bg-[#0a0a0a] border-l border-white/15" />
              </div>

              {/* User Section / Auth */}
              <div className="p-3">
                {user ? (
                  <div className="space-y-1.5">
                    {/* User Mini Badge */}
                    <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-red-brand/20 border border-red-brand/40 text-red-brand flex items-center justify-center font-bold text-xs shrink-0">
                          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{user.name || 'Mi Cuenta'}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={toggleProfileView}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold uppercase rounded-lg border border-white/10 flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Repeat size={10} className="text-red-brand" />
                        {activeView === 'vendedor' ? 'Vendedor' : 'Comprador'}
                      </button>
                    </div>

                    <Link
                      to="/panel/perfil"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <User size={15} className="text-red-brand" />
                        <span>Mi Perfil</span>
                      </div>
                      <ChevronRight size={13} className="text-zinc-600" />
                    </Link>

                    <Link
                      to="/panel"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard size={15} className="text-zinc-400" />
                        <span>Panel de Control</span>
                      </div>
                      <ChevronRight size={13} className="text-zinc-600" />
                    </Link>

                    <button
                      onClick={doLogout}
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut size={15} />
                        <span>Cerrar Sesión</span>
                      </div>
                      <ChevronRight size={13} className="text-red-500/50" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/registro');
                      }}
                      className="w-full py-2.5 bg-red-brand hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-brand/20 flex items-center justify-center cursor-pointer"
                    >
                      Registrarse
                    </button>
                    <Link
                      to="/iniciar-sesion"
                      onClick={() => setOpen(false)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/10 flex items-center justify-center transition-colors"
                    >
                      INICIAR SESIÓN
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const DropdownLink = ({ to, icon: Icon, label, onClick }) => (
  <Link to={to} onClick={onClick} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
    <Icon size={14} /> {label}
  </Link>
);

export default Header;
