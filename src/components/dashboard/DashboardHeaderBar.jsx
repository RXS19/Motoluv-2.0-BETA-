import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, User, LogOut, Shield, Repeat, Check, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

const DashboardHeaderBar = ({ mode = 'comprador' }) => {
  const { user, logout, activeView, setActiveView } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userRef = useRef(null);

  const isBuyer = mode === 'comprador';

  const getInitials = (name) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const initials = getInitials(user?.name);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-end gap-3 pb-6 border-b border-white/5">
      {/* View Switcher Pill */}
      <div className="hidden sm:flex items-center bg-[#111114] p-1 rounded-lg border border-white/5 text-xs font-medium text-zinc-400">
        <button
          onClick={() => setActiveView('comprador')}
          className={`px-3 py-1.5 rounded-md transition-all ${
            isBuyer
              ? 'bg-red-brand/15 text-red-brand font-semibold border border-red-brand/30'
              : 'hover:text-white'
          }`}
        >
          Vista Comprador
        </button>
        <button
          onClick={() => setActiveView('vendedor')}
          className={`px-3 py-1.5 rounded-md transition-all ${
            !isBuyer
              ? 'bg-red-brand/15 text-red-brand font-semibold border border-red-brand/30'
              : 'hover:text-white'
          }`}
        >
          Vista Vendedor
        </button>
      </div>

      {/* Notifications Bell */}
      <NotificationBell
        buttonClassName="relative p-2.5 bg-[#111114] hover:bg-white/5 text-zinc-300 hover:text-white rounded-lg border border-white/5 transition-colors cursor-pointer"
        iconSize={17}
      />

      {/* Primary Action: Publicar mi moto */}
      <Link
        to="/panel/publicar"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-red-brand/20"
      >
        <Plus size={14} className="stroke-[2.5]" />
        <span>Publicar mi moto</span>
      </Link>

      {/* User Avatar & Dropdown */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 p-1.5 bg-[#111114] hover:bg-white/5 border border-white/5 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#1e1e24] text-white text-xs font-bold flex items-center justify-center border border-white/10">
            {initials}
          </div>
          <ChevronDown size={13} className="text-zinc-400 mr-1" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-[#121216] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Usuario Motoluv'}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              <Link
                to="/panel/perfil"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <User size={14} className="text-red-brand" />
                <span>Mi Perfil</span>
              </Link>
              <button
                onClick={() => {
                  setActiveView(isBuyer ? 'vendedor' : 'comprador');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
              >
                <Repeat size={14} className="text-zinc-400" />
                <span>Cambiar a {isBuyer ? 'Vendedor' : 'Comprador'}</span>
              </button>
            </div>
            <div className="pt-1 border-t border-white/5">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
              >
                <LogOut size={14} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeaderBar;
