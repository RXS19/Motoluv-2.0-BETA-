import React, { useState } from 'react';
import { Star, Search, Eye, ShoppingCart, ShieldCheck, CreditCard, Sparkles, Filter, Lock } from 'lucide-react';
import { accessories } from '../data/accessories';
import { useCart } from '../context/CartContext';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';

const ShopPage = () => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const { setSelectedProduct, addToCart, cartCount, setIsCartOpen, setIsCheckoutOpen } = useCart();

  const cats = ['all', ...Array.from(new Set(accessories.map((a) => a.category)))];

  const filtered = accessories.filter((a) =>
    (cat === 'all' || a.category === cat) &&
    (a.name.toLowerCase().includes(q.toLowerCase()) || a.brand.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 relative">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-white text-4xl md:text-5xl uppercase">
            Accesorios y <span className="text-red-brand">Equipamiento</span>
          </h1>
        </div>

        {/* Floating / Header Cart Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-5 py-3 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-md shadow-lg shadow-red-900/30 flex items-center gap-2.5 transition-all transform hover:scale-[1.02]"
          >
            <ShoppingCart size={16} />
            <span>Ver Carrito</span>
            {cartCount > 0 && (
              <span className="ml-1 bg-white text-red-brand text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center font-mono shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>


      <div className="relative min-h-[500px]">
        {/* Blurred and censored accessories and gear catalog */}
        <div
          className="filter blur-md md:blur-lg pointer-events-none select-none opacity-40 transition-all"
          aria-hidden="true"
        >
          {/* Search and Category Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por marca, producto (ej. AGV, Alpinestars, Casco, Escape)..."
                className="w-full pl-10 pr-4 py-3 bg-[#111112] border border-white/10 focus:border-red-brand text-white text-sm rounded-md outline-none transition-colors placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-md transition-all shrink-0 border ${
                    cat === c
                      ? 'bg-red-brand border-red-brand text-white shadow-md'
                      : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-white bg-[#111112]'
                  }`}
                >
                  {c === 'all' ? 'Todos los Productos' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="bg-[#111112] border border-white/10 hover:border-red-brand/40 rounded-lg overflow-hidden transition-all duration-300 group flex flex-col justify-between shadow-lg hover:shadow-red-950/20"
              >
                <div>
                  {/* Product Image Frame */}
                  <div 
                    onClick={() => setSelectedProduct(a)}
                    className="aspect-square bg-zinc-900 relative overflow-hidden cursor-pointer"
                  >
                    <img
                      src={resolveSafeImageUrl(a.image, 'gear')}
                      alt={a.name}
                      onError={(e) => handleImageError(e, 'gear')}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded">
                      {a.category}
                    </div>
                    
                    {/* Expand Overlay Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3.5 py-2 bg-red-brand text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <Eye size={14} /> Conocer más & Fotos
                      </span>
                    </div>
                  </div>

                  {/* Product Text Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-500 font-bold uppercase tracking-widest">{a.brand}</span>
                      <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span>{a.rating?.toFixed(1)}</span>
                      </div>
                    </div>

                    <h3 
                      onClick={() => setSelectedProduct(a)}
                      className="text-white text-sm font-bold leading-snug mb-2 cursor-pointer hover:text-red-brand transition-colors line-clamp-2"
                    >
                      {a.name}
                    </h3>

                    <p className="text-zinc-400 text-xs line-clamp-2 mb-3">
                      {a.description || 'Equipamiento de alta resistencia probado para motociclistas exigentes.'}
                    </p>
                  </div>
                </div>

                {/* Bottom Price & Action */}
                <div className="p-4 pt-0 border-t border-white/5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Precio</div>
                    <div className="font-display font-bold text-red-brand text-lg">
                      ${a.price.toLocaleString()} MXN
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedProduct(a)}
                      className="p-2.5 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded transition-colors"
                      title="Desplegar para ver más fotos e información"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => addToCart(a)}
                      className="px-3 py-2 bg-red-brand hover:bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase rounded transition-colors flex items-center gap-1"
                    >
                      <ShoppingCart size={12} /> Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-zinc-500 space-y-3">
              <p className="text-base">No se encontraron productos con el filtro seleccionado.</p>
              <button
                onClick={() => { setQ(''); setCat('all'); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Censorship blur overlay banner */}
        <div className="absolute inset-0 flex items-start justify-center p-4 pt-16 md:pt-24 bg-black/40 rounded-2xl z-20 pointer-events-auto">
          <div className="sticky top-28 max-w-md w-full text-center p-6 md:p-8 bg-[#121216]/95 border border-white/15 rounded-2xl shadow-2xl space-y-4 backdrop-blur-md">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand shadow-lg shadow-red-brand/10">
              <Lock size={24} />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-brand/15 border border-red-brand/30 text-red-400 text-[10px] font-bold uppercase tracking-widest">
                Información Censurada / En Revisión
              </div>
              <h3 className="font-display font-bold text-white text-lg md:text-xl uppercase tracking-wide">
                Accesorios y Equipamiento
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                La información de costos, inventario y disponibilidad de esta sección ha sido censurada temporalmente mientras se actualizan los nuevos esquemas oficiales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
