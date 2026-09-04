import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, CreditCard, CheckCircle2, Truck, QrCode, ExternalLink } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { stripeApi, clipApi } from '../services/api';
import { toast } from '../hooks/use-toast';

const StripeCheckoutModal = () => {
  const { isCheckoutOpen, setIsCheckoutOpen, selectedCart, selectedCartSubtotal, clearSelectedCart } = useCart();
  
  const itemsToBuy = selectedCart;
  const shipping = selectedCartSubtotal >= 1500 || selectedCartSubtotal === 0 ? 0 : 150;
  const totalAmount = selectedCartSubtotal + (itemsToBuy.length > 0 ? shipping : 0);

  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success'
  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState('clip'); // 'clip' | 'stripe' | 'spei'

  // Clip state
  const [clipData, setClipData] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ciudad de México');
  const [postalCode, setPostalCode] = useState('');
  
  // Card Details State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    if (isCheckoutOpen) {
      setStep('form');
      setLoading(false);
      setCompletedOrder(null);
      setClipData(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const handleProcessPayment = async (e) => {
    e.preventDefault();

    if (!email || !name || !address) {
      toast({ title: 'Campos requeridos', description: 'Por favor completa los datos de envío.', variant: 'destructive' });
      return;
    }

    if (itemsToBuy.length === 0) {
      toast({ title: 'Carrito sin selección', description: 'Selecciona al menos un artículo para procesar la compra.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      if (paymentProvider === 'clip') {
        // Create Clip request & process Clip order
        const clipReq = await clipApi.createPaymentRequest({
          amount: totalAmount,
          description: 'Compra de Accesorios Motoluv',
          customerEmail: email,
          customerName: name,
          items: itemsToBuy,
        });

        await new Promise((r) => setTimeout(r, 1500));

        const orderRes = await clipApi.processCheckout({
          amount: totalAmount,
          items: itemsToBuy,
          shippingAddress: { address, city, postalCode, phone },
          customerInfo: { name, email },
          clipReference: clipReq.clipReference,
        });

        setCompletedOrder(orderRes.order);
        setClipData(clipReq);
        setStep('success');
        clearSelectedCart();
        toast({ title: '¡Pago Procesado Exitosamente!', description: `Orden ${orderRes.order.orderId} confirmada.` });
      } else {
        // Process via Card
        if (!cardNumber || !cardExpiry || !cardCvc) {
          toast({ title: 'Datos de Tarjeta Faltantes', description: 'Ingresa los datos de tu tarjeta bancaria.', variant: 'destructive' });
          setStep('form');
          setLoading(false);
          return;
        }

        const intentRes = await stripeApi.createPaymentIntent({
          amount: totalAmount,
          currency: 'mxn',
          items: itemsToBuy,
          customerEmail: email,
          metadata: { customerName: name, city, address },
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        const orderRes = await stripeApi.processOrder({
          items: itemsToBuy,
          totalAmount,
          shippingAddress: { address, city, postalCode, phone },
          customerInfo: { name, email },
          paymentIntentId: intentRes.paymentIntentId,
        });

        setCompletedOrder(orderRes.order);
        setStep('success');
        clearSelectedCart();
        toast({ title: '¡Compra Completada Exitosamente!', description: `Orden ${orderRes.order.orderId} confirmada.` });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({ title: 'Error al procesar pago', description: err.message || 'No se pudo completar la transacción.', variant: 'destructive' });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#111112] border border-white/10 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-brand/20 border border-red-brand/40 flex items-center justify-center text-red-brand">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="font-display font-bold uppercase text-base text-white">
                Procesar <span className="text-red-brand">Compra</span>
              </h3>
              <p className="text-[11px] text-zinc-400">Encriptación bancaria SSL de 256 bits</p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-red-brand animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-red-brand">
                  <CreditCard size={28} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-display uppercase tracking-wider text-white">
                  Procesando tu orden...
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Por favor no cierres esta ventana mientras confirmamos la transacción.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-brand/10 border border-red-brand/30 text-red-brand text-xs font-mono font-bold">
                🔒 Conexión bancaria encriptada
              </div>
            </div>
          )}

          {step === 'success' && completedOrder && (
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold font-display uppercase text-white">
                  ¡Compra Confirmada!
                </h3>
                <p className="text-xs text-zinc-400">
                  Tu pedido ha sido registrado exitosamente. Hemos enviado los detalles a tu correo electrónico.
                </p>
              </div>

              {/* Order Box */}
              <div className="p-4 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                  <span className="text-zinc-400">Número de Orden:</span>
                  <span className="font-mono font-bold text-red-brand text-sm">{completedOrder.orderId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">ID de Transacción:</span>
                  <span className="font-mono text-zinc-300">{completedOrder.paymentIntentId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Entrega Estimada:</span>
                  <span className="font-bold text-emerald-400">{completedOrder.estimatedDelivery}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5 font-bold">
                  <span>Monto Total Pagado:</span>
                  <span className="text-red-brand text-base font-display">${completedOrder.totalAmount?.toLocaleString()} MXN</span>
                </div>
              </div>

              {/* Purchased items list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Resumen de Artículos Comprados:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {completedOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 rounded text-xs">
                      <span className="text-white font-medium">{it.quantity}x {it.product.name} ({it.size})</span>
                      <span className="text-zinc-400 font-mono">${(it.price * it.quantity).toLocaleString()} MXN</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-full py-3.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-md"
              >
                Volver a la Tienda
              </button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleProcessPayment} className="space-y-6">
              {/* Order Total Header */}
              <div className="p-4 bg-red-brand/10 border border-red-brand/20 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">
                    Total a pagar ({itemsToBuy.length} artículo{itemsToBuy.length > 1 ? 's' : ''})
                  </div>
                  <div className="text-2xl font-bold font-display text-red-brand">
                    ${totalAmount.toLocaleString()} MXN
                  </div>
                </div>
              </div>

              {/* Section 1: Customer & Shipping */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Truck size={14} className="text-red-brand" /> 1. Datos de Envío
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded focus:border-red-brand text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded focus:border-red-brand text-xs text-white outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Dirección de Entrega</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle, Número exterior e interior, Colonia"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded focus:border-red-brand text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Ciudad / Estado</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded focus:border-red-brand text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Código Postal</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="03900"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded focus:border-red-brand text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Method Selection */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    2. Método de Pago
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">PAGOS CIFRADOS 256-BIT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('stripe')}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      paymentProvider === 'stripe'
                        ? 'border-red-brand bg-red-brand/10 text-white shadow-lg'
                        : 'border-white/10 bg-[#0a0a0a] text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-zinc-200">
                        Tarjeta Bancaria (Débito / Crédito)
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Visa, Mastercard y American Express con encriptación bancaria</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('clip')}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      paymentProvider === 'clip'
                        ? 'border-red-brand bg-red-brand/10 text-white shadow-lg'
                        : 'border-white/10 bg-[#0a0a0a] text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-zinc-200">
                        Transferencia SPEI y Medios Digitales
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Transferencia interbancaria inmediata y pago digital en línea</p>
                  </button>
                </div>

                {paymentProvider === 'clip' ? (
                  <div className="p-4 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-white pb-2 border-b border-white/5">
                      <span>Procesamiento Digital Inmediato</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                        CUSTODIA ACTIVA
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Al dar clic en confirmar, se creará el registro de compra con custodia segura de Motoluv.
                      Recibirás tu comprobante digital y la confirmación de tu pedido al instante.
                    </p>
                    <div className="text-[11px] text-zinc-400 pt-1">
                      Transacción respaldada por la infraestructura bancaria certificada.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 font-medium block mb-1">Número de Tarjeta</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3 py-2.5 bg-[#111112] border border-white/10 rounded focus:border-red-brand text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Vencimiento (MM/AA)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-3 py-2 bg-[#111112] border border-white/10 rounded focus:border-red-brand text-xs text-white font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-[#111112] border border-white/10 rounded focus:border-red-brand text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA - NO ISOTIPOS, CLEAN UNIFIED BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 font-bold text-xs uppercase tracking-widest rounded-md shadow-lg bg-red-brand hover:bg-red-600 text-white shadow-red-900/30 transition-all disabled:opacity-50 text-center"
              >
                CONFIRMAR Y PAGAR (${totalAmount.toLocaleString()} MXN)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutModal;
