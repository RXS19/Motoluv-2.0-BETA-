import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  moto,
  loading = false,
}) => {
  if (!isOpen || !moto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-[#141418] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-red-brand/20 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                ¿Eliminar publicación?
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Esta acción retirará la motocicleta de la plataforma.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Moto summary preview */}
        <div className="flex items-center gap-3.5 p-3.5 bg-[#0a0a0c] border border-white/5 rounded-xl">
          <img
            src={resolveSafeImageUrl(moto.image || moto.images?.[0], 'moto')}
            alt={`${moto.brand} ${moto.model}`}
            onError={(e) => handleImageError(e, 'moto')}
            className="w-16 h-16 object-cover rounded-lg bg-black/40 flex-shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {moto.brand} {moto.model} {moto.year}
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              ${Number(moto.price).toLocaleString()} MXN
            </p>
            <span className="inline-block mt-1 text-[10px] uppercase font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
              Estatus: {moto.status || 'Activa'}
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Al confirmar, la publicación se eliminará permanentemente de tu inventario, catálogo y sistema de búsqueda.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-[#1e1e24] hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(moto.id)}
            disabled={loading}
            className="px-5 py-2.5 bg-red-brand hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-red-brand/20"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Sí, eliminar publicación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
