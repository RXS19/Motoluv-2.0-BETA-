import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  ShoppingBag,
  CheckCircle2,
  Heart,
  Shield,
  Bike,
  Clock,
  X,
  CreditCard,
  Building2,
  BookmarkCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apartadoApi, offerApi } from '../services/api';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardHeaderBar from '../components/dashboard/DashboardHeaderBar';
import OperationsTimelineViewer from '../components/dashboard/OperationsTimelineViewer';
import { resolveSafeImageUrl, handleImageError } from '../utils/imageFallback';
import { toast } from '../hooks/use-toast';
import { handleMotoLinkClick } from '../utils/motoNavigation';
import buyerBannerMoto from '../assets/images/buyer_banner_moto_1788022096918.jpg';

const BuyerDashboard = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'resumen';

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [apartados, setApartados] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedApartado, setSelectedApartado] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync tab with URL search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    // Reconsult data when switching tabs to guarantee fresh state
    loadData(true);
  };

  const loadData = (silent = false) => {
    if (!silent) setLoading(true);
    const p1 = apartadoApi.mine().then((data) => {
      if (Array.isArray(data)) setApartados(data);
      else setApartados([]);
    }).catch(() => setApartados([]));

    const p2 = offerApi.mine().then((data) => {
      if (Array.isArray(data)) setOffers(data);
      else setOffers([]);
    }).catch(() => setOffers([]));

    Promise.all([p1, p2]).finally(() => {
      if (!silent) setLoading(false);
    });
  };

  useEffect(() => {
    loadData();

    // Reconsult on window focus / tab visibility change to avoid stale state
    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Supabase Realtime for instant operations updates
    let channel = null;
    if (isSupabaseConfigured && supabase && user?.id) {
      channel = supabase
        .channel(`public:buyer:operations:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'apartados', filter: `buyer_id=eq.${user.id}` },
          () => loadData(true)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${user.id}` },
          () => loadData(true)
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  const firstName = user?.name
    ? user.name.split(' ')[0]
    : (user?.email ? user.email.split('@')[0] : 'Comprador');

  const activeApartadosCount = apartados.filter(a => a.status === 'REALIZADO').length;
  const inProgressInspectionsCount = apartados.filter(a => a.certification_status === 'EN_PROCESO' || a.certification_status === 'PENDIENTE').length;
  const activeOffersCount = offers.filter(o => o.status === 'ENVIADA' || o.status === 'PENDIENTE' || o.status === 'ACEPTADA').length;

  const getOfferBadge = (st) => {
    const s = (st || '').toUpperCase();
    switch (s) {
      case 'ACEPTADA':
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Aceptada</span>;
      case 'RECHAZADA':
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Rechazada</span>;
      case 'EXPIRADA':
      case 'EXPIRED':
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Expirada</span>;
      case 'ENVIADA':
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Enviada</span>;
      case 'PENDIENTE':
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>;
    }
  };

  const getApartadoBadge = (st, certSt) => {
    const c = String(certSt || '').toUpperCase();
    if (c === 'RECHAZADA' || c === 'NO_APROBADA') {
      return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Motocicleta Rechazada</span>;
    }
    const s = (st || '').toUpperCase();
    if (s === 'EXPIRADO') {
      return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">Expirado</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Realizado</span>;
  };

  // Inspections per apartado/NOD
  const buyerInspections = useMemo(() => {
    return (apartados || []).filter(
      (a) => a.certification_status || a.certification_appointment_status || a.certification_appointment_at
    );
  }, [apartados]);

  return (
    <div className="min-h-screen bg-[#080809] text-zinc-100 flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        mode="comprador"
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header Bar */}
        <DashboardHeaderBar mode="comprador" />

        {/* ================= TAB 1: RESUMEN ================= */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            {/* Greeting Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Hola, {firstName}
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  Este es el resumen de tu actividad en Motoluv.
                </p>
              </div>

              <Link
                to="/motos"
                className="px-4 py-2 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <Bike size={15} />
                <span>Explorar Motos Certificadas</span>
              </Link>
            </div>

            {/* 4 KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <KpiCard
                icon={BookmarkCheck}
                label="Apartados activos"
                value={activeApartadosCount.toString()}
                linkText="Ver detalles →"
                onClick={() => handleTabChange('solicitudes')}
              />
              <KpiCard
                icon={FileText}
                label="Ofertas enviadas"
                value={offers.length.toString()}
                linkText="Ver detalles →"
                onClick={() => handleTabChange('solicitudes')}
              />
              <KpiCard
                icon={ShieldCheck}
                label="Inspecciones técnicas"
                value={inProgressInspectionsCount.toString()}
                linkText="Ver detalles →"
                onClick={() => handleTabChange('inspecciones')}
              />
              <KpiCard
                icon={Heart}
                label="Motos guardadas"
                value={favorites.length.toString()}
                linkText="Ver detalles →"
                onClick={() => handleTabChange('guardadas')}
              />
            </div>

            {/* 2-Column Main Dashboard Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Center Column */}
              <div className="xl:col-span-2 space-y-6">
                {/* Section: Apartados */}
                <div className="bg-[#101013] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                      <BookmarkCheck size={16} className="text-red-brand" /> Mis Apartados
                    </h2>
                    {apartados.length > 0 && (
                      <button
                        onClick={() => handleTabChange('solicitudes')}
                        className="text-xs text-red-brand hover:text-red-400 font-semibold transition-colors"
                      >
                        Ver todos →
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">Cargando apartados...</div>
                  ) : apartados.length === 0 ? (
                    <div className="p-6 bg-[#141418] border border-dashed border-white/10 rounded-xl text-center space-y-3">
                      <p className="text-xs font-bold text-white">Aún no tienes actividad.</p>
                      <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                        Cuando apartes una motocicleta, aquí verás el estatus del apartado y el avance de su certificación.
                      </p>
                      <Link
                        to="/motos"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow"
                      >
                        <Bike size={14} /> Explorar catálogo
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apartados.slice(0, 3).map((ap) => (
                        <div
                          key={ap.id}
                          className="p-3.5 sm:p-4 bg-[#141418] border border-white/5 hover:border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resolveSafeImageUrl(ap.moto_image, 'moto')}
                              alt={ap.moto_model || 'Motocicleta'}
                              onError={(e) => handleImageError(e, 'moto')}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg bg-black/40 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="text-white text-sm font-bold truncate">
                                {ap.moto_brand} {ap.moto_model} {ap.moto_year || ''}
                              </h3>
                              <p className="text-zinc-400 text-xs mt-0.5">
                                Certificación: <strong className="text-zinc-200 uppercase">{String(ap.certification_status || '').toUpperCase() === 'RECHAZADA' || String(ap.certification_status || '').toUpperCase() === 'NO_APROBADA' ? 'Motocicleta Rechazada' : (ap.certification_status || 'PENDIENTE')}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                            {getApartadoBadge(ap.status, ap.certification_status)}
                            <button
                              onClick={() => setSelectedApartado(ap)}
                              className="px-3.5 py-1.5 bg-[#1b1b20] hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium rounded-lg transition-colors"
                            >
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Ofertas */}
                <div className="bg-[#101013] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                      <FileText size={16} className="text-red-brand" /> Mis Ofertas de Compra
                    </h2>
                    {offers.length > 0 && (
                      <button
                        onClick={() => handleTabChange('solicitudes')}
                        className="text-xs text-red-brand hover:text-red-400 font-semibold transition-colors"
                      >
                        Ver todas →
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">Cargando ofertas...</div>
                  ) : offers.length === 0 ? (
                    <div className="p-6 bg-[#141418] border border-dashed border-white/10 rounded-xl text-center space-y-2">
                      <p className="text-xs font-bold text-white">No tienes ofertas enviadas</p>
                      <p className="text-[11px] text-zinc-400">
                        Una vez que apartes una motocicleta y su certificación esté aprobada, podrás emitir tu oferta formal.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {offers.slice(0, 3).map((off) => (
                        <div
                          key={off.id}
                          className="p-3.5 sm:p-4 bg-[#141418] border border-white/5 hover:border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resolveSafeImageUrl(off.moto_image, 'moto')}
                              alt={off.moto_model || 'Motocicleta'}
                              onError={(e) => handleImageError(e, 'moto')}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg bg-black/40 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="text-white text-sm font-bold truncate">
                                {off.moto_brand} {off.moto_model} {off.moto_year || ''}
                              </h3>
                              <p className="text-zinc-400 text-xs mt-0.5">
                                Monto: <strong className="text-white">${Number(off.amount || 0).toLocaleString()} MXN</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                            {getOfferBadge(off.status)}
                            <button
                              onClick={() => setSelectedOffer(off)}
                              className="px-3.5 py-1.5 bg-[#1b1b20] hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium rounded-lg transition-colors"
                            >
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Motos guardadas */}
                <div className="bg-[#101013] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart size={16} className="text-red-brand fill-red-brand" />
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                        Motos guardadas
                      </h2>
                    </div>
                    {favorites.length > 0 && (
                      <button
                        onClick={() => handleTabChange('guardadas')}
                        className="text-xs text-red-brand hover:text-red-400 font-semibold transition-colors"
                      >
                        Ver todas ({favorites.length}) →
                      </button>
                    )}
                  </div>

                  {favorites.length === 0 ? (
                    <div className="p-6 bg-[#141418] border border-dashed border-white/10 rounded-xl text-center space-y-2">
                      <p className="text-xs font-bold text-white">No tienes motos guardadas</p>
                      <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                        Guarda las motocicletas que te interesen en el catálogo con el icono de corazón.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {favorites.slice(0, 4).map((moto) => (
                        <div
                          key={moto.id}
                          className="group bg-[#141418] border border-white/5 hover:border-white/15 rounded-xl p-2.5 transition-all flex flex-col justify-between"
                        >
                          <Link
                            to={`/motos/${moto.id}`}
                            onClick={(e) => moto.id && handleMotoLinkClick(e, moto.id)}
                            className="block"
                          >
                            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/40 mb-2 relative">
                              <img
                                src={resolveSafeImageUrl(moto.image || moto.images?.[0], 'moto')}
                                alt={`${moto.brand} ${moto.model}`}
                                onError={(e) => handleImageError(e, 'moto')}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <h4 className="text-white text-xs font-bold truncate group-hover:text-red-brand transition-colors">
                              {moto.brand} {moto.model}
                            </h4>
                          </Link>
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-zinc-200 font-bold text-xs">
                              ${Number(moto.price || 0).toLocaleString()} MXN
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(moto);
                              }}
                              className="text-red-brand hover:scale-110 transition-transform p-1"
                              title="Quitar de favoritas"
                            >
                              <Heart size={14} className="fill-red-brand text-red-brand" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="bg-[#101013] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Garantía y Peritaje
                  </h3>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Inspección Oficial</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Certificación vehicular técnica</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProtectionModal(true)}
                      className="px-3 py-1.5 bg-[#1b1b20] hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      Ver cobertura
                    </button>
                  </div>
                </div>

                <div className="bg-[#101013] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[190px] group">
                  {/* Motorcycle visual asset with soft gradient blend for high visibility */}
                  <div className="absolute right-0 top-0 bottom-0 w-[58%] sm:w-[55%] overflow-hidden pointer-events-none">
                    <img
                      src={buyerBannerMoto}
                      alt="Motocicletas Motoluv"
                      className="w-full h-full object-cover object-center opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#101013] via-[#101013]/40 to-transparent w-[50%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101013]/30 via-transparent to-transparent" />
                  </div>

                  <div className="relative z-10 space-y-3 max-w-[65%] sm:max-w-[60%]">
                    <h3 className="text-base font-bold text-white leading-tight">
                      ¿Buscas tu próxima motocicleta?
                    </h3>
                    <p className="text-xs text-zinc-400 leading-snug">
                      Explora el catálogo y aparta la unidad para iniciar su dictamen oficial.
                    </p>
                    <Link
                      to="/motos"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-colors shadow"
                    >
                      <span>Explorar catálogo</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MOTOS GUARDADAS ================= */}
        {activeTab === 'guardadas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-red-brand fill-red-brand" />
                  <h1 className="text-2xl font-bold text-white">Motos Guardadas</h1>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tus motocicletas favoritas para darles seguimiento.
                </p>
              </div>
              <Link to="/motos" className="text-xs text-red-brand font-semibold hover:underline flex items-center gap-1">
                + Explorar más motos en catálogo
              </Link>
            </div>

            {favorites.length === 0 ? (
              <div className="p-12 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-red-brand/10 text-red-brand flex items-center justify-center mx-auto shadow-inner">
                  <Heart size={32} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Aún no tienes actividad.</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Guarda motocicletas en el catálogo haciendo clic en el icono de corazón.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/motos"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-brand/20"
                  >
                    <Bike size={16} />
                    <span>Ver motocicletas disponibles</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {favorites.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all shadow-lg group"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-black/40 relative overflow-hidden">
                        <img
                          src={resolveSafeImageUrl(m.image || m.images?.[0], 'moto')}
                          alt={`${m.brand} ${m.model}`}
                          onError={(e) => handleImageError(e, 'moto')}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(m);
                          }}
                          className="absolute top-2.5 right-2.5 p-2 bg-red-brand/90 hover:bg-red-brand rounded-full text-white hover:scale-110 transition-all shadow-md"
                          title="Quitar de favoritas"
                        >
                          <Heart size={16} className="fill-white stroke-white" />
                        </button>
                      </div>
                      <div className="p-4">
                        <Link
                          to={`/motos/${m.id}`}
                          onClick={(e) => m.id && handleMotoLinkClick(e, m.id)}
                          className="block group-hover:text-red-brand transition-colors"
                        >
                          <h3 className="font-bold text-sm text-white truncate">
                            {m.brand} {m.model}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5">Año {m.year || 'N/A'}</p>
                        </Link>
                        <div className="mt-3 text-lg font-black text-red-brand">
                          ${Number(m.price || 0).toLocaleString()} MXN
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <Link
                        to={`/motos/${m.id}`}
                        onClick={(e) => m.id && handleMotoLinkClick(e, m.id)}
                        className="w-full block text-center py-2.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                      >
                        Ver detalles
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SOLICITUDES (APARTADOS Y OFERTAS SEPARADOS) ================= */}
        {activeTab === 'solicitudes' && (
          <div className="space-y-8">
            {/* SECCIÓN 1: APARTADOS */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BookmarkCheck size={22} className="text-red-brand" /> Mis Apartados
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Registros de motocicletas apartadas en custodia y su estado de certificación.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-zinc-500 text-xs">Cargando apartados...</div>
              ) : apartados.length === 0 ? (
                <div className="p-8 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-3">
                  <p className="text-xs font-bold text-white">Aún no tienes actividad.</p>
                  <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                    Cuando apartes una unidad, se registrará aquí para coordinar el peritaje técnico oficial.
                  </p>
                  <Link
                    to="/motos"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow"
                  >
                    <Bike size={14} /> Explorar catálogo
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {apartados.map((ap) => (
                    <div key={ap.id} className="p-5 bg-[#101013] border border-white/5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={resolveSafeImageUrl(ap.moto_image, 'moto')}
                            alt={ap.moto_model || 'Motocicleta'}
                            onError={(e) => handleImageError(e, 'moto')}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                          <div>
                            <h3 className="font-bold text-base text-white">{ap.moto_brand} {ap.moto_model} {ap.moto_year || ''}</h3>
                            <p className="text-xs text-zinc-400">
                              Fecha de apartado: {ap.created_at ? new Date(ap.created_at).toLocaleDateString('es-MX') : 'Reciente'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {getApartadoBadge(ap.status, ap.certification_status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#141418] rounded-xl text-xs">
                        <div>
                          <span className="text-zinc-500 block">Dictamen Certificación</span>
                          {(() => {
                            const raw = String(ap.certification_status || '').toUpperCase();
                            const buyerSt = (raw === 'APROBADA' || raw === 'CERTIFICADA') ? 'CERTIFICADA' : (raw === 'RECHAZADA' || raw === 'NO_APROBADA' ? 'RECHAZADA' : 'PENDIENTE');
                            return (
                              <span className={`font-bold text-sm uppercase ${
                                buyerSt === 'CERTIFICADA' ? 'text-emerald-400' : buyerSt === 'RECHAZADA' ? 'text-red-400' : 'text-amber-400'
                              }`}>
                                {buyerSt === 'RECHAZADA' ? 'Motocicleta Rechazada' : buyerSt}
                              </span>
                            );
                          })()}
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Inspección Oficial</span>
                          <span className="text-zinc-300 font-semibold">Inspección Técnica Oficial</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        {ap.moto_id && (
                          <Link
                            to={`/motos/${ap.moto_id}`}
                            onClick={(e) => handleMotoLinkClick(e, ap.moto_id)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition-colors"
                          >
                            Ver Publicación
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedApartado(ap)}
                          className="px-4 py-2 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          Ver Detalle de Apartado
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: OFERTAS */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-red-brand" /> Mis Ofertas de Compra
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Propuestas enviadas formalmente a los vendedores.
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-zinc-500 text-xs">Cargando ofertas...</div>
              ) : offers.length === 0 ? (
                <div className="p-8 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-bold text-white">Aún no tienes actividad.</p>
                  <p className="text-[11px] text-zinc-400">
                    No has emitido ofertas de compra.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((off) => (
                    <div key={off.id} className="p-5 bg-[#101013] border border-white/5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={resolveSafeImageUrl(off.moto_image, 'moto')}
                            alt={off.moto_model || 'Motocicleta'}
                            onError={(e) => handleImageError(e, 'moto')}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                          <div>
                            <h3 className="font-bold text-base text-white">{off.moto_brand} {off.moto_model} {off.moto_year || ''}</h3>
                            <p className="text-xs text-zinc-400">
                              Fecha: {off.created_at ? new Date(off.created_at).toLocaleDateString('es-MX') : 'Reciente'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {getOfferBadge(off.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#141418] rounded-xl text-xs">
                        <div>
                          <span className="text-zinc-500 block">Monto Ofertado</span>
                          <span className="text-white font-bold text-sm">${Number(off.amount || 0).toLocaleString()} MXN</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Estado de la Oferta</span>
                          <span className="text-zinc-200 font-semibold uppercase">{off.status || 'PENDIENTE'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        {off.moto_id && (
                          <Link
                            to={`/motos/${off.moto_id}`}
                            onClick={(e) => handleMotoLinkClick(e, off.moto_id)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition-colors"
                          >
                            Ver Publicación
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedOffer(off)}
                          className="px-4 py-2 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          Ver Detalle de Oferta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: INSPECCIONES ================= */}
        {activeTab === 'inspecciones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-white">Mis Inspecciones Técnicas</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Estado oficial de peritaje y certificación mecánica asociado a tus apartados.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                Dictamen Oficial
              </span>
            </div>

            {buyerInspections.length === 0 ? (
              <div className="p-12 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Aún no tienes actividad.</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Al apartar una motocicleta se programa la inspección técnica y legal.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/motos"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                  >
                    <Bike size={16} />
                    <span>Explorar Motocicletas</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {buyerInspections.map((ap) => (
                  <div key={ap.id} className="p-6 bg-[#101013] border border-white/5 rounded-2xl space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <span className="text-xs text-zinc-400">Inspección de Apartado</span>
                          <h3 className="font-bold text-base text-white">{ap.moto_brand} {ap.moto_model} {ap.moto_year || ''}</h3>
                        </div>
                      </div>
                    {(() => {
                      const raw = String(ap.certification_status || '').toUpperCase();
                      const buyerSt = (raw === 'APROBADA' || raw === 'CERTIFICADA') ? 'APROBADA' : (raw === 'RECHAZADA' ? 'RECHAZADA' : 'PENDIENTE');
                      return (
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          buyerSt === 'APROBADA'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : buyerSt === 'RECHAZADA'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {buyerSt}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#141418] rounded-xl border border-white/5">
                      <span className="text-zinc-500 block">Dictamen de Certificación</span>
                      {(() => {
                        const raw = String(ap.certification_status || '').toUpperCase();
                        const buyerSt = (raw === 'APROBADA' || raw === 'CERTIFICADA') ? 'APROBADA' : (raw === 'RECHAZADA' ? 'RECHAZADA' : 'PENDIENTE');
                        return (
                          <span className={`font-bold uppercase ${
                            buyerSt === 'APROBADA' ? 'text-emerald-400' : buyerSt === 'RECHAZADA' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {buyerSt}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="p-3 bg-[#141418] rounded-xl border border-white/5">
                      <span className="text-zinc-500 block">Protocolo de Revisión</span>
                      <span className="text-zinc-300 font-bold">
                        Inspección Técnica Motoluv
                      </span>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: MIS COMPRAS (OPERATIONS TIMELINE) ================= */}
        {activeTab === 'compras' && (
          <OperationsTimelineViewer
            items={apartados}
            mode="comprador"
            onRefresh={() => loadData(false)}
            isRefreshing={loading}
          />
        )}

        {/* ================= TAB 6: PAGOS ================= */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Pagos y Facturación</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Historial de transacciones de apartado y recibos procesados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 bg-[#101013] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-red-brand" />
                  <h3 className="font-bold text-sm text-white">Transacciones Registradas</h3>
                </div>
                {apartados.length === 0 ? (
                  <div className="p-4 bg-[#141418] rounded-xl border border-white/5 text-xs text-zinc-400 text-center">
                    Aún no tienes actividad.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apartados.map((ap) => (
                      <div key={ap.id} className="p-3 bg-[#141418] rounded-xl border border-white/5 text-xs text-zinc-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-white">{ap.moto_brand} {ap.moto_model}</span>
                          <span className="text-emerald-400 font-bold uppercase">{ap.status}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-zinc-400">
                          <span>Apartado registrado</span>
                          <span>{ap.created_at ? new Date(ap.created_at).toLocaleDateString('es-MX') : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#101013] border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Datos Fiscales</h3>
                </div>
                <p className="text-xs text-zinc-400">
                  Si requieres comprobante fiscal para tus operaciones, actualiza tus datos en el perfil.
                </p>
                <button
                  onClick={() => toast({ title: 'Facturación', description: 'Tus datos fiscales están configurados.' })}
                  className="w-full py-2.5 bg-[#1b1b20] hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 text-xs font-bold rounded-xl transition-colors"
                >
                  Configurar Datos de Facturación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: CONFIGURACIÓN ================= */}
        {activeTab === 'configuracion' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Configuración</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Datos de tu cuenta de comprador.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-6 bg-[#101013] border border-white/5 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-white">Información del Comprador</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Nombre:</span>
                    <span className="text-white font-semibold">{user?.name || user?.email?.split('@')[0] || 'Comprador'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Correo Electrónico:</span>
                    <span className="text-white font-semibold">{user?.email || 'No registrado'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Detalle de Apartado */}
      {selectedApartado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121216] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 text-left relative shadow-2xl">
            <button
              onClick={() => setSelectedApartado(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <img
                src={resolveSafeImageUrl(selectedApartado.moto_image, 'moto')}
                alt={selectedApartado.moto_model || 'Motocicleta'}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedApartado.moto_brand} {selectedApartado.moto_model} {selectedApartado.moto_year || ''}
                </h3>
                <p className="text-xs text-zinc-400">Apartado #{selectedApartado.id}</p>
              </div>
            </div>

            <div className="space-y-3 py-2 border-y border-white/5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Estado del Apartado:</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedApartado.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Dictamen de Certificación:</span>
                {(() => {
                  const raw = String(selectedApartado.certification_status || '').toUpperCase();
                  const buyerSt = (raw === 'APROBADA' || raw === 'CERTIFICADA') ? 'CERTIFICADA' : (raw === 'RECHAZADA' ? 'RECHAZADA' : 'PENDIENTE');
                  return (
                    <span className={`font-bold uppercase ${
                      buyerSt === 'CERTIFICADA' ? 'text-emerald-400' : buyerSt === 'RECHAZADA' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {buyerSt}
                    </span>
                  );
                })()}
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Inspección de Seguridad:</span>
                <span className="text-zinc-200">Protocolo Oficial Motoluv</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedApartado(null)}
              className="w-full py-2.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Oferta */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121216] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 text-left relative shadow-2xl">
            <button
              onClick={() => setSelectedOffer(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <img
                src={resolveSafeImageUrl(selectedOffer.moto_image, 'moto')}
                alt={selectedOffer.moto_model || 'Motocicleta'}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedOffer.moto_brand} {selectedOffer.moto_model} {selectedOffer.moto_year || ''}
                </h3>
                <p className="text-xs text-zinc-400">Oferta #{selectedOffer.id}</p>
              </div>
            </div>

            <div className="space-y-3 py-2 border-y border-white/5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Estado de la Oferta:</span>
                <span className={`font-bold uppercase ${selectedOffer.status === 'ACEPTADA' ? 'text-emerald-400' : selectedOffer.status === 'RECHAZADA' ? 'text-red-400' : 'text-amber-400'}`}>
                  {selectedOffer.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Monto Ofertado:</span>
                <span className="text-white font-bold">${Number(selectedOffer.amount || 0).toLocaleString()} MXN</span>
              </div>
              {selectedOffer.package && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Paquete de protección:</span>
                  <span className="text-zinc-200 uppercase font-semibold">{selectedOffer.package}</span>
                </div>
              )}
            </div>

            {selectedOffer.status === 'RECHAZADA' && selectedOffer.message && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1">
                <span className="text-red-400 font-bold block">Motivo de rechazo del vendedor:</span>
                <p className="text-zinc-300 leading-relaxed">{selectedOffer.message}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedOffer(null)}
              className="w-full py-2.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Estado de Protección */}
      {showProtectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121216] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 text-left relative shadow-2xl">
            <button
              onClick={() => setShowProtectionModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Certificación y Garantía Motoluv</h3>
                <p className="text-xs text-emerald-400 font-medium">Validación técnica y legal</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-lg">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <span>Inspección técnica de seguridad integral.</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-lg">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <span>Validación legal documental en registros oficiales.</span>
              </div>
            </div>

            <button
              onClick={() => setShowProtectionModal(false)}
              className="w-full py-2.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable KPI Metric Stat Card
const KpiCard = ({ icon: Icon, label, value, linkText, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-[#101013] border border-white/5 hover:border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all hover:bg-white/[0.02]"
    >
      <div>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 mb-3">
          <Icon size={16} />
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {value}
        </div>
        <div className="text-xs text-zinc-400 mt-1 font-medium leading-tight">{label}</div>
      </div>
      <div className="mt-3 pt-2 text-[11px] font-semibold text-zinc-400 hover:text-red-brand transition-colors">
        {linkText}
      </div>
    </div>
  );
};

export default BuyerDashboard;
