import React from 'react';
import { X, ShoppingBag, Trash2, ShieldCheck, CreditCard, CheckSquare, Square } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';

const CartDrawer = () => {
  const {
    cart,
    selectedCart,
    removeFromCart,
    toggleItemSelection,
    selectAllItems,
    updateQuantity,
    selectedCartSubtotal,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const allSelected = cart.length > 0 && cart.every((item) => item.selected !== false);
  const noneSelected = selectedCart.length === 0;

  const shipping = selectedCartSubtotal >= 1500 || selectedCartSubtotal === 0 ? 0 : 150;
  const total = selectedCartSubtotal + (selectedCart.length > 0 ? shipping : 0);

  const handleProceedToCheckout = () => {
    if (noneSelected) return;
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#111112] border-l border-white/10 text-white flex flex-col shadow-2xl">
          {/* Drawer Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="text-red-brand" size={20} />
              <h3 className="font-display font-bold uppercase text-lg text-white">Tu Carrito</h3>
              <span className="bg-red-brand/20 text-red-brand border border-red-brand/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((a, c) => a + c.quantity, 0)} artículos
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
              aria-label="Cerrar carrito"
            >
              <X size={20} />
            </button>
          </div>

          {/* Select All Bar */}
          {cart.length > 0 && (
            <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-zinc-400">
              <button
                onClick={() => selectAllItems(!allSelected)}
                className="flex items-center gap-2 hover:text-white transition-colors font-medium"
              >
                {allSelected ? (
                  <CheckSquare size={16} className="text-red-brand" />
                ) : (
                  <Square size={16} className="text-zinc-500" />
                )}
                <span>{allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}</span>
              </button>
              <span className="text-[11px] font-mono">
                {selectedCart.length} de {cart.length} seleccionados
              </span>
            </div>
          )}

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base">Tu carrito está vacío</h4>
                  <p className="text-zinc-500 text-xs mt-1">Explora nuestra tienda de accesorios y equipamiento oficial.</p>
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const isSelected = item.selected !== false;
                return (
                  <div
                    key={item.cartItemId}
                    className={`p-3 bg-[#0a0a0a] border rounded-lg flex items-center gap-3 relative transition-all ${
                      isSelected ? 'border-red-brand/40 bg-red-brand/[0.02]' : 'border-white/5 opacity-60'
                    }`}
                  >
                    {/* Checkbox for item selection */}
                    <button
                      onClick={() => toggleItemSelection(item.cartItemId)}
                      className="p-1 hover:text-white transition-colors shrink-0"
                      title={isSelected ? 'Deseleccionar artículo' : 'Seleccionar artículo para comprar'}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-red-brand" />
                      ) : (
                        <Square size={18} className="text-zinc-600" />
                      )}
                    </button>

                    <img
                      src={resolveSafeImageUrl(item.product.image, 'gear')}
                      alt={item.product.name}
                      onError={(e) => handleImageError(e, 'gear')}
                      className="w-16 h-16 object-cover rounded bg-zinc-900 border border-white/10 shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                          {item.product.brand}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>Talla: <strong className="text-white">{item.size}</strong></span>
                          <span>•</span>
                          <span>Color: <strong className="text-white">{item.color}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        {/* Qty controller */}
                        <div className="flex items-center border border-white/10 rounded bg-[#111112]">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-white font-mono">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="font-display font-bold text-red-brand text-xs sm:text-sm">
                          ${(item.price * item.quantity).toLocaleString()} MXN
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-zinc-600 hover:text-red-brand transition-colors p-1 self-start"
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-white/10 bg-[#0a0a0a] space-y-4">
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal seleccionados:</span>
                  <span className="text-white font-mono font-bold">${selectedCartSubtotal.toLocaleString()} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedCart.length === 0
                      ? '$0 MXN'
                      : shipping === 0
                      ? '¡GRATIS!'
                      : `$${shipping} MXN`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>Total compra:</span>
                  <span className="text-red-brand font-display text-lg">${total.toLocaleString()} MXN</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                disabled={noneSelected}
                className="w-full py-3.5 bg-red-brand hover:bg-red-600 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-widest rounded-md shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all"
              >
                <CreditCard size={16} />
                <span>
                  {noneSelected
                    ? 'Selecciona un artículo para comprar'
                    : `Procesar Compra (${selectedCart.length} item${selectedCart.length > 1 ? 's' : ''})`}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest text-center">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>Pagos Seguros y Encriptados</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
