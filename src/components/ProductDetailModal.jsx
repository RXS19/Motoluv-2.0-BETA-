import React, { useState, useEffect } from 'react';
import { X, Star, ShieldCheck, Truck, ShoppingCart, ChevronRight, CheckCircle2, RotateCcw, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';

const ProductDetailModal = () => {
  const { selectedProduct, setSelectedProduct, addToCart, setIsCartOpen } = useCart();
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');

  useEffect(() => {
    if (selectedProduct) {
      const imgs = selectedProduct.images && selectedProduct.images.length > 0
        ? selectedProduct.images
        : [selectedProduct.image];
      setSelectedImage(imgs[0]);
      setSelectedSize(selectedProduct.sizes ? selectedProduct.sizes[0] : 'Única');
      setSelectedColor(selectedProduct.colors ? selectedProduct.colors[0] : 'Estándar');
      setQuantity(1);
      setActiveTab('desc');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const productImages = selectedProduct.images && selectedProduct.images.length > 0
    ? selectedProduct.images
    : [selectedProduct.image];

  const handleAddToCart = () => {
    addToCart(selectedProduct, selectedSize, selectedColor, quantity, false);
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, selectedSize, selectedColor, quantity, true);
    setSelectedProduct(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#111112] border border-white/10 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0a]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>Tienda</span>
            <ChevronRight size={12} className="text-zinc-600" />
            <span className="text-red-brand">{selectedProduct.category}</span>
          </div>
          <button
            onClick={() => setSelectedProduct(null)}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Image Gallery */}
            <div className="space-y-4">
              {/* Main Image Frame */}
              <div className="relative aspect-square w-full bg-zinc-900/80 rounded-lg overflow-hidden border border-white/5 group">
                <img
                  src={resolveSafeImageUrl(selectedImage || selectedProduct.image, 'gear')}
                  alt={selectedProduct.name}
                  onError={(e) => handleImageError(e, 'gear')}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-red-brand/90 backdrop-blur text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded">
                  {selectedProduct.brand}
                </span>
                {selectedProduct.inStock && (
                  <span className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                    En Stock ({selectedProduct.inStock})
                  </span>
                )}
              </div>

              {/* Thumbnails list */}
              {productImages.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {productImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative w-20 h-20 rounded-md overflow-hidden border-2 transition-all shrink-0 ${
                        selectedImage === imgUrl ? 'border-red-brand scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={resolveSafeImageUrl(imgUrl, 'gear')} 
                        alt={`Vista ${idx + 1}`} 
                        onError={(e) => handleImageError(e, 'gear')}
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Guarantee badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs text-zinc-400">
                <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded border border-white/5">
                  <ShieldCheck size={18} className="text-red-brand shrink-0" />
                  <span>Garantía Oficial Motoluv</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded border border-white/5">
                  <Truck size={18} className="text-red-brand shrink-0" />
                  <span>Envío Exprés 24-48h</span>
                </div>
              </div>
            </div>

            {/* Right Column: Product Info & Buy Action */}
            <div className="flex flex-col justify-between space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                  {selectedProduct.brand}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight font-display">
                  {selectedProduct.name}
                </h2>

                {/* Rating & reviews */}
                {Boolean(selectedProduct.rating) && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <div className="flex items-center gap-1 text-yellow-400 font-bold">
                      <Star size={16} className="fill-yellow-400" />
                      <span>{selectedProduct.rating.toFixed(1)}</span>
                    </div>
                    {Boolean(selectedProduct.reviewsCount) && (
                      <>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400 text-xs">
                          {selectedProduct.reviewsCount} opiniones verificadas
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Price Display */}
                <div className="mt-4 p-3 bg-red-brand/10 border border-red-brand/20 rounded-md flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-red-brand font-display">
                    ${selectedProduct.price?.toLocaleString()} MXN
                  </span>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">IVA incluido</span>
                </div>

                {/* Sizes Selection */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex justify-between">
                      <span>Selecciona Talla / Medida:</span>
                      <span className="text-red-brand font-mono">{selectedSize}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3.5 py-2 text-xs font-bold rounded border transition-all ${
                            selectedSize === sz
                              ? 'bg-red-brand border-red-brand text-white shadow-md'
                              : 'border-white/10 text-zinc-300 hover:border-white/30 hover:text-white bg-white/5'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors Selection */}
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex justify-between">
                      <span>Color:</span>
                      <span className="text-red-brand font-mono">{selectedColor}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((clr) => (
                        <button
                          key={clr}
                          onClick={() => setSelectedColor(clr)}
                          className={`px-3 py-1.5 text-xs font-medium rounded border transition-all ${
                            selectedColor === clr
                              ? 'bg-zinc-800 border-red-brand text-white ring-1 ring-red-brand'
                              : 'border-white/10 text-zinc-400 hover:border-white/30 bg-white/5'
                          }`}
                        >
                          {clr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Controls */}
                <div className="mt-5 flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Cantidad:</span>
                  <div className="flex items-center border border-white/10 rounded overflow-hidden bg-[#0a0a0a]">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-white/10 text-lg font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-sm font-bold text-white min-w-[40px] text-center font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-white/10 text-lg font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Action CTAs */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleBuyNow}
                  className="py-3.5 bg-gradient-to-r from-red-brand to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-md shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
                >
                  <Check size={16} /> Comprar ahora
                </button>
                <button
                  onClick={handleAddToCart}
                  className="py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-widest rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart size={16} /> Añadir al carrito
                </button>
              </div>
            </div>
          </div>

          {/* Details / Specifications Tabs */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex border-b border-white/10 gap-6">
              <button
                onClick={() => setActiveTab('desc')}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                  activeTab === 'desc'
                    ? 'border-red-brand text-red-brand'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Descripción & Características
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                  activeTab === 'specs'
                    ? 'border-red-brand text-red-brand'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Ficha Técnica
              </button>
              <button
                onClick={() => setActiveTab('ship')}
                className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
                  activeTab === 'ship'
                    ? 'border-red-brand text-red-brand'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Garantía y Envíos
              </button>
            </div>

            <div className="py-5">
              {activeTab === 'desc' && (
                <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
                  <p>{selectedProduct.description || 'Producto premium seleccionado para alta exigencia.'}</p>

                  {selectedProduct.features && selectedProduct.features.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Destacados clave:</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedProduct.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                            <CheckCircle2 size={14} className="text-red-brand shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-md overflow-hidden">
                  {selectedProduct.specs ? (
                    <table className="w-full text-left text-xs">
                      <tbody>
                        {Object.entries(selectedProduct.specs).map(([k, v], idx) => (
                          <tr key={k} className={idx % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                            <td className="px-4 py-3 font-bold text-zinc-400 w-1/3 border-b border-white/5">{k}</td>
                            <td className="px-4 py-3 text-white border-b border-white/5">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-zinc-500 text-xs">Especificaciones estándar certificadas.</div>
                  )}
                </div>
              )}

              {activeTab === 'ship' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
                  <div className="p-4 bg-[#0a0a0a] border border-white/5 rounded-md space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white uppercase text-xs">
                      <Truck size={16} className="text-red-brand" /> Envío Seguro en México
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Despachamos tu pedido en menos de 24 horas hábiles. Envíos garantizados con rastreo en tiempo real a todo México.
                    </p>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] border border-white/5 rounded-md space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white uppercase text-xs">
                      <RotateCcw size={16} className="text-red-brand" /> Devolución de 30 Días
                    </div>
                    <p className="text-zinc-400 leading-relaxed">
                      Si la talla o el ajuste no es de tu total agrado, cuentas con 30 días para cambio sin costo adicional.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
