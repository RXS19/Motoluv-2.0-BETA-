import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Trash2, Wrench, Activity, Zap, Sparkles, Edit3, Lock, MessageCircle } from 'lucide-react';
import { motoApi } from '../services/api';
import { toast } from '../hooks/use-toast';
import { OPERATION_STATUSES, getStatusStyle } from '../utils/status';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';
import BoostPublicationModal from '../components/dashboard/BoostPublicationModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { handleMotoLinkClick } from '../utils/motoNavigation';

const MyMotosPage = () => {
  const [motos, setMotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [selectedMotoForBoost, setSelectedMotoForBoost] = useState(null);

  // Deletion modal state
  const [motoToDelete, setMotoToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    motoApi.mine().then((res) => {
      if (Array.isArray(res)) {
        setMotos(res);
      } else {
        setMotos([]);
      }
    }).catch(() => {
      setMotos([]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const initiateDelete = (moto) => {
    const status = moto.status;
    const offersCount = moto.offersCount || 0;

    if (status === 'Apartada' || status === 'reserved' || status === 'Proceso de entrega') {
      toast({
        title: 'Acción no permitida',
        description: 'No se puede eliminar esta publicación. Esta motocicleta tiene un apartado vigente y no puede eliminarse mientras esté activo.',
        variant: 'destructive',
      });
      return;
    }
    if (offersCount > 0) {
      toast({
        title: 'Ofertas activas en proceso',
        description: 'No puedes eliminar una motocicleta que tiene ofertas activas. Debes responder o declinar las ofertas primero.',
        variant: 'destructive',
      });
      return;
    }

    setMotoToDelete(moto);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await motoApi.remove(id);
      toast({
        title: 'Publicación eliminada',
        description: 'La motocicleta ha sido removida de tu inventario correctamente.',
      });
      setShowDeleteModal(false);
      setMotoToDelete(null);
      setMotos((prev) => prev.filter((m) => m.id !== id));
      load();
    } catch (err) {
      toast({
        title: 'No se pudo eliminar',
        description: err?.message || 'Ocurrió un error al eliminar la publicación.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await motoApi.update(id, { status: newStatus });
      if (newStatus === 'Rechazada' || newStatus === 'rejected' || res?.deleted) {
        toast({
          title: 'Publicación rechazada',
          description: 'La motocicleta no aprobó la inspección técnica y ha sido eliminada automáticamente del catálogo y del sistema.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Estatus de operación actualizado', description: `Cambió a "${newStatus}".` });
      }
      load();
    } catch (err) {
      toast({ title: 'Error al actualizar estatus', description: err?.message, variant: 'destructive' });
    }
  };

  const handleBoost = (moto) => {
    setSelectedMotoForBoost(moto);
    setShowBoostModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
            Mis <span className="text-red-brand">Motocicletas</span>
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">{motos.length} publicación(es) registradas</p>
        </div>
        <div className="flex items-center gap-3">
          {motos.length > 0 && (
            <button
              onClick={() => handleBoost(motos[0])}
              className="px-5 py-3 bg-gradient-to-r from-red-brand to-orange-600 hover:from-red-600 hover:to-orange-500 text-white font-bold text-xs rounded-sm shadow-md flex items-center justify-center uppercase tracking-wider transition-all"
            >
              Destacar Publicación
            </button>
          )}
          <Link to="/panel/publicar" className="btn-red inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-3 rounded-sm">
            <Plus size={14} /> Nueva Publicación
          </Link>
        </div>
      </div>

      <div className="mb-6 p-4 bg-[#111112] border border-amber-500/30 rounded-md flex items-start gap-3 text-xs text-zinc-300">
        <div className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0 animate-pulse" />
        <div>
          <span className="font-bold text-white block mb-0.5">Control de Calidad e Inspección Previa</span>
          Toda motocicleta publicada entra en estatus <strong className="text-amber-400 font-bold">"EN REVISIÓN"</strong> para validación técnica y documental antes de mostrarse en el catálogo público de compradores.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Cargando...</div>
      ) : motos.length === 0 ? (
        <div className="bg-[#111112] border border-white/5 rounded-md p-20 text-center">
          <p className="text-zinc-400 text-sm mb-6">Aún no tienes motocicletas publicadas</p>
          <Link to="/panel/publicar" className="btn-red inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-sm">
            <Plus size={14} /> Publicar Motocicleta
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {motos.map((m) => {
            const style = getStatusStyle(m.status);
            return (
              <div key={m.id} className="bg-[#111112] border border-white/5 rounded-md overflow-hidden flex flex-col justify-between hover:border-white/15 transition-all">
                <div>
                  <div className="aspect-[4/3] bg-zinc-900 relative">
                    <img 
                      src={resolveSafeImageUrl(m.image || m.images?.[0], 'moto')} 
                      alt={m.model} 
                      onError={(e) => handleImageError(e, 'moto')}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur ${style.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}></span>
                        {style.label}
                      </span>
                      {m.is_boosted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-red-brand to-orange-500 text-white shadow">
                          <Sparkles size={10} /> Destacada
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1">
                      <Eye size={11} /> {m.views || 412}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-display font-bold text-white uppercase">{m.brand} {m.model}</div>
                    <div className="text-xs text-zinc-400 mt-1">Año {m.year} · {(m.km || 12000).toLocaleString()} km</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-red-brand font-bold text-base">${Number(m.price).toLocaleString()} MXN</div>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500"><Wrench size={10} className="inline" /> {(m.score || 9.2).toFixed(1)}</span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <Activity size={10} className="text-red-brand" /> Estatus de Operación
                        </span>
                        <span className="text-[9px] text-zinc-500 font-medium">CRM Motoluv</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-[#0a0a0a] rounded-sm border border-white/5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${style.badgeClass.replace('bg-black/80', '').replace('backdrop-blur', '').replace('border', '')}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}></span>
                          {style.label}
                        </span>
                        <span className="text-[10px] text-zinc-500">Sincronizado</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2">
                  <button
                    onClick={() => handleBoost(m)}
                    className="w-full py-2 bg-red-brand/10 hover:bg-red-brand/20 text-red-brand border border-red-brand/30 text-xs font-bold tracking-wider uppercase rounded-sm transition-colors text-center"
                  >
                    Destacar Publicación
                  </button>
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <Link
                      to={m.id ? `/motos/${m.id}` : '/motos'}
                      onClick={(e) => m.id && handleMotoLinkClick(e, m.id)}
                      className="flex-1 text-center text-xs font-bold tracking-wider uppercase py-2 rounded-sm border border-white/10 text-white hover:border-red-brand hover:text-red-brand transition-colors"
                    >
                      Ver Ficha
                    </Link>

                    {m.status === 'Publicada' || m.status === 'PUBLICADA' || m.status === 'active' ? (
                      <Link
                        to={`/panel/publicar?edit=${m.id}`}
                        className="px-3 py-2 text-center text-xs font-bold tracking-wider uppercase rounded-sm border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 transition-colors flex items-center gap-1.5"
                        title="Publicación en estado PUBLICADA: Edición bloqueada automáticamente. Contacta a Soporte."
                      >
                        <Lock size={12} /> Editar
                      </Link>
                    ) : (
                      <Link
                        to={`/panel/publicar?edit=${m.id}`}
                        className="px-3 py-2 text-center text-xs font-bold tracking-wider uppercase rounded-sm border border-white/10 text-zinc-300 hover:border-red-brand hover:text-red-brand transition-colors flex items-center gap-1.5"
                        title="Editar publicación"
                      >
                        <Edit3 size={12} /> Editar
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => initiateDelete(m)}
                      className={`w-10 h-8 rounded-sm border transition-colors flex items-center justify-center ${
                        m.status === 'Apartada' || m.status === 'reserved' || (m.offersCount || 0) > 0
                          ? 'border-white/5 text-zinc-600 hover:text-amber-400 hover:border-amber-500/40'
                          : 'border-white/10 text-zinc-400 hover:border-red-brand hover:text-red-brand'
                      }`}
                      title={
                        m.status === 'Apartada'
                          ? 'Publicación autorizada y apartada (no eliminable)'
                          : (m.offersCount || 0) > 0
                          ? 'Publicación con ofertas activas en proceso (no eliminable)'
                          : 'Eliminar publicación'
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteLoading) {
            setShowDeleteModal(false);
            setMotoToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        moto={motoToDelete}
        loading={deleteLoading}
      />

      {/* Boost Modal */}
      <BoostPublicationModal
        isOpen={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        moto={selectedMotoForBoost}
        allMotos={motos}
        onBoostSuccess={(motoId, plan) => {
          setMotos(prev => prev.map(m => m.id === motoId ? { ...m, is_boosted: true, boost_tier: plan.id } : m));
          setShowBoostModal(false);
        }}
      />
    </div>
  );
};

export default MyMotosPage;
