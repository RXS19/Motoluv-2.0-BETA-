import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Check, X, ArrowRight, MessageSquare, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { offerApi } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';

const OfferRow = ({ offer, isSeller, onUpdate, onOpenReject }) => {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await offerApi.respond(offer.id, 'ACEPTADA');
      toast({ title: 'Oferta Aceptada', description: 'Se ha notificado al comprador.' });
      onUpdate && onUpdate();
    } catch {
      toast({ title: 'Error al aceptar', description: 'No se pudo procesar la respuesta.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (st) => {
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
      case 'PENDING':
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>;
    }
  };

  return (
    <div className="p-4 bg-[#141418] border border-white/5 rounded-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-brand/10 text-red-brand flex items-center justify-center font-bold text-xs flex-shrink-0">
            <Tag size={16} />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">
              {offer.moto_brand || 'Moto'} {offer.moto_model || ''} {offer.moto_year || ''}
            </h4>
            <p className="text-xs text-zinc-400">
              {isSeller ? `De: ${offer.buyer_name || 'Comprador interesado'}` : `Vendedor: ${offer.seller_name || 'Vendedor'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(offer.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#181820] rounded-lg text-xs">
        <div>
          <span className="text-zinc-500 block text-[10px]">Monto Ofertado:</span>
          <span className="text-red-brand font-black text-sm">${Number(offer.amount || offer.offeredAmount || 0).toLocaleString()} MXN</span>
        </div>
        {offer.original_price && (
          <div>
            <span className="text-zinc-500 block text-[10px]">Precio Original:</span>
            <span className="text-zinc-300 font-bold text-xs">${Number(offer.original_price).toLocaleString()} MXN</span>
          </div>
        )}
        <div>
          <span className="text-zinc-500 block text-[10px]">Fecha:</span>
          <span className="text-zinc-400 text-xs">{offer.created_at || 'Reciente'}</span>
        </div>
      </div>

      {isSeller && (offer.status === 'pending' || offer.status === 'Pendiente' || !offer.status) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => onOpenReject && onOpenReject(offer)}
            disabled={loading}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow"
          >
            <Check size={13} /> Aceptar Oferta
          </button>
        </div>
      )}
    </div>
  );
};

const MyOffersPage = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [received, setReceived] = useState([]);
  const [tab, setTab] = useState('sent');
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [offerToReject, setOfferToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [previousRejectionsCount, setPreviousRejectionsCount] = useState(0);
  const [acceptFee, setAcceptFee] = useState(false);

  const load = () => {
    setLoading(true);
    const p1 = offerApi.mine().then(res => {
      if (Array.isArray(res)) setOffers(res);
      else setOffers([]);
    }).catch(() => setOffers([]));

    const p2 = (user?.role === 'vendedor' || user?.role === 'both')
      ? offerApi.received().then(res => {
          if (Array.isArray(res)) setReceived(res);
          else setReceived([]);
        }).catch(() => setReceived([]))
      : Promise.resolve();

    Promise.all([p1, p2]).finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const checkPreviousRejections = async (motoId) => {
    if (!motoId) return 0;
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error } = await supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('moto_id', String(motoId))
          .in('status', ['RECHAZADA', 'REJECTED']);
        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err) {
        console.warn('Error counting rejections from Supabase:', err);
      }
    }
    return received.filter(
      (o) =>
        String(o.moto_id || o.moto?.id) === String(motoId) &&
        (o.status === 'RECHAZADA' || o.status === 'REJECTED')
    ).length;
  };

  const handleOpenReject = async (offer) => {
    setOfferToReject(offer);
    setRejectionReason('');
    setRejectionError('');
    setAcceptFee(false);
    const motoId = offer.moto_id || offer.moto?.id;
    const count = await checkPreviousRejections(motoId);
    setPreviousRejectionsCount(count);
  };

  const handleCloseReject = () => {
    if (!rejectLoading) {
      setOfferToReject(null);
      setRejectionReason('');
      setRejectionError('');
      setAcceptFee(false);
      setPreviousRejectionsCount(0);
    }
  };

  const handleConfirmReject = async (e) => {
    if (e) e.preventDefault();
    const reasonTrimmed = rejectionReason.trim();
    if (!reasonTrimmed) {
      setRejectionError('El motivo de rechazo es obligatorio.');
      return;
    }
    if (previousRejectionsCount >= 2 && !acceptFee) {
      setRejectionError('Debes aceptar el cargo de $500 MXN para proceder con el rechazo.');
      return;
    }
    if (!offerToReject?.id) return;

    setRejectLoading(true);
    try {
      const isThird = previousRejectionsCount >= 2;
      await offerApi.respond(offerToReject.id, 'RECHAZADA', reasonTrimmed, isThird);
      toast({
        title: 'Oferta rechazada',
        description: isThird
          ? 'La oferta ha sido declinada y se aplicó el cargo de $500 MXN.'
          : 'La oferta ha sido declinada con el motivo capturado.',
      });
      handleCloseReject();
      load();
    } catch (err) {
      console.error('Error al rechazar oferta:', err);
      setRejectionError(err?.message || 'No se pudo rechazar la oferta. Por favor intenta nuevamente.');
      toast({
        title: 'Error al rechazar oferta',
        description: err?.message || 'No se pudo procesar la respuesta en Supabase.',
        variant: 'destructive',
      });
    } finally {
      setRejectLoading(false);
    }
  };

  const list = tab === 'sent' ? offers : received;
  const isSeller = tab === 'received';

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
          Mis <span className="text-red-brand">Ofertas</span>
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">Historial de propuestas económicas y solicitudes de compraventa</p>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-[#0a0a0a] border border-white/5 rounded-xl p-1 mb-6 max-w-sm">
        {[
          { id: 'sent', label: `Enviadas (${offers.length})` },
          { id: 'received', label: `Recibidas (${received.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 text-xs font-bold tracking-wider uppercase rounded-lg transition-colors ${
              tab === t.id ? 'bg-red-brand text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#101013] border border-white/5 rounded-2xl p-6">
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Cargando ofertas...</div>
        ) : list.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            {tab === 'sent' ? 'No has enviado ninguna oferta de compra todavía' : 'No has recibido ofertas en tus publicaciones'}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((o) => (
              <OfferRow
                key={o.id}
                offer={o}
                isSeller={isSeller}
                onUpdate={load}
                onOpenReject={handleOpenReject}
              />
            ))}
          </div>
        )}
      </div>

      {offerToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121216] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 text-left relative shadow-2xl">
            <button
              onClick={handleCloseReject}
              disabled={rejectLoading}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rechazar Oferta</h3>
                <p className="text-xs text-zinc-400">
                  {offerToReject.moto_brand || offerToReject.motoBrand} {offerToReject.moto_model || offerToReject.motoModel} • ${Number(offerToReject.amount || offerToReject.offeredAmount || 0).toLocaleString()} MXN
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Indica al comprador el motivo por el cual no puedes aceptar esta oferta. Este campo es <strong className="text-white">obligatorio</strong>.
            </p>

            {previousRejectionsCount >= 2 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-400">
                  Este rechazo generará un cargo de $500 MXN.
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer text-left">
                  <input
                    type="checkbox"
                    checked={acceptFee}
                    onChange={(e) => setAcceptFee(e.target.checked)}
                    disabled={rejectLoading}
                    className="mt-0.5 rounded border-white/20 bg-black/40 text-red-600 focus:ring-red-500 h-4 w-4 accent-red-600 cursor-pointer"
                  />
                  <span className="text-[11px] text-zinc-300 leading-snug font-medium">
                    Acepto el cargo de $500 MXN y confirmo que deseo rechazar esta oferta.
                  </span>
                </label>
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 uppercase tracking-wider block mb-1.5 font-bold">
                  Motivo de rechazo *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError('');
                  }}
                  placeholder="Ej. El precio ofrecido está por debajo de mi margen mínimo actual..."
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-white/15 focus:border-red-500 text-white text-xs rounded-xl outline-none resize-none transition-colors"
                  disabled={rejectLoading}
                  autoFocus
                />
                {rejectionError && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} /> {rejectionError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReject}
                  disabled={rejectLoading}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    rejectLoading ||
                    !rejectionReason.trim() ||
                    (previousRejectionsCount >= 2 && !acceptFee)
                  }
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {rejectLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { OfferRow };
export default MyOffersPage;
