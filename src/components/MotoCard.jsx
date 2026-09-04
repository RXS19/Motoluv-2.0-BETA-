import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, MapPin, Star, Wrench, Heart } from 'lucide-react';
import { getStatusStyle } from '../utils/status';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';
import { trackMotoClick } from '../utils/motoNavigation';

const MotoCard = ({ moto, showScore = true, showStatus = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const style = getStatusStyle(moto.status);
  const fav = isFavorite(moto.id);

  const isOwner = Boolean(
    user && (
      user.id === moto.owner_id ||
      user.id === moto.ownerId ||
      user.id === moto.seller_id ||
      user.id === moto.sellerId
    )
  );

  // Requirement 2:
  // La etiqueta “PUBLICADA” debe verla únicamente el dueño de la publicación dentro de su dashboard.
  // Nunca mostrar esa etiqueta en el sitio público ni a otros usuarios.
  // No ocultarla solo con CSS: la condición debe depender del usuario autenticado.
  const shouldRenderStatusBadge = Boolean(
    style.label === 'PUBLICADA'
      ? (showStatus && isOwner)
      : (user && (isOwner || user.id === moto.buyer_id || moto.is_linked_buyer || showStatus))
  );

  // Score is ONLY visible if user is logged in
  const canSeeScore = Boolean(user && showScore);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(moto);
  };

  const handleCardClick = async (e) => {
    // Si el click fue en un botón o elemento interactivo, no navegar
    if (e.target && typeof e.target.closest === 'function') {
      const isInteractive = e.target.closest('button, [data-prevent-nav]');
      if (isInteractive) return;
    }

    e.preventDefault();
    if (!moto?.id) return;

    try {
      await trackMotoClick(moto.id);
    } catch (err) {
      console.warn('Error al registrar click en moto:', err);
    }

    navigate(`/motos/${moto.id}`);
  };

  return (
    <Link
      to={`/motos/${moto.id}`}
      onClick={handleCardClick}
      className="moto-card group block bg-gradient-to-b from-[#151517] to-[#0d0d0e] hover:from-[#242428] hover:to-[#141416] border border-black rounded-md overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl relative"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
        <img 
          src={resolveSafeImageUrl(moto.image)} 
          alt={`${moto.brand} ${moto.model}`} 
          onError={(e) => handleImageError(e, 'moto')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />

        {/* Top Right: Apartada Badge & Favorite Heart Button */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {(moto.apartado_status === 'APARTADA' || moto.is_apartada) && (
            <span className="bg-white text-black text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm shadow-md pointer-events-none select-none">
              APARTADA
            </span>
          )}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            title={fav ? 'Quitar de tus motos guardadas' : 'Guardar en tus motos guardadas'}
            className={`p-2 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center ${
              fav
                ? 'bg-red-brand text-white scale-105 shadow-red-brand/40'
                : 'bg-black/60 text-white/90 hover:text-white hover:bg-black/90 hover:scale-110 border border-white/10'
            }`}
          >
            <Heart
              size={16}
              className={`transition-all duration-200 ${
                fav ? 'fill-white stroke-white' : 'stroke-current stroke-2 hover:fill-red-brand/40'
              }`}
            />
          </button>
        </div>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10 pointer-events-none">
          {moto.featured && (
            <div className="bg-red-brand text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm flex items-center gap-1 shadow">
              <Wrench size={10} /> DESTACADA
            </div>
          )}
          {shouldRenderStatusBadge && (
            <div className={`bg-black/80 backdrop-blur px-2.5 py-1 rounded-sm border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow ${style.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`}></span>
              {style.label}
            </div>
          )}
        </div>

        {canSeeScore && (moto.score !== undefined && moto.score !== null) && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-sm flex items-center gap-1.5 shadow">
            <Wrench size={11} className="text-red-brand" /> Score {Number(moto.score).toFixed(1)}/5
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="font-display font-bold text-white uppercase tracking-wide">
            <span>{moto.brand}</span> <span className="text-white/90">{moto.model}</span>
          </div>
          <div className="font-display font-bold text-red-brand whitespace-nowrap">
            ${moto.price.toLocaleString()}
          </div>
        </div>

        <div className="mt-1 text-xs text-zinc-400">Año {moto.year}</div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            {moto.km !== undefined && (
              <span className="flex items-center gap-1">
                <Wrench size={11} /> {moto.km.toLocaleString()} km
              </span>
            )}
            {moto.city && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {moto.city}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Eye size={11} /> {moto.views}
          </span>
        </div>

        {canSeeScore && moto.rating && (
          <div className="mt-3 pt-3 border-t border-black flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1"><Wrench size={11} /> Score Mecánico</span>
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12} className={i < moto.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'} />
              ))}
            </span>
          </div>
        )}

        {/* Apartado Badge Callout */}
        <div className="mt-3 pt-2.5 flex items-center justify-between text-xs bg-red-brand/10 -mx-4 -mb-4 px-4 py-2.5 border-t border-black">
          <span className="text-zinc-300 font-medium text-[11px]">Separación del inventario por <strong className="text-white">24 hrs</strong></span>
          <span className="text-red-brand font-bold uppercase tracking-wider text-[10px] bg-red-brand/10 border border-red-brand/30 px-2 py-0.5 rounded-sm">
            APARTAR
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MotoCard;
