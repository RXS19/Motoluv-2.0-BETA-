import React, { useState } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock,
  Sparkles,
  Award,
  Flame,
  ArrowRight,
  QrCode,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { stripeApi, clipApi, motoApi } from '../../services/api';
import { toast } from '../../hooks/use-toast';
import { resolveSafeImageUrl, handleImageError } from '../../utils/imageFallback';
import { useAuth } from '../../context/AuthContext';

export const BOOST_PLANS = [
  {
    id: 'plan_7',
    name: 'Plan Destacado 7 Días',
    days: 7,
    price: 399,
    badge: 'Popular',
    icon: Flame,
    multiplier: '2.5x',
    features: [
      'Etiqueta ⭐ Destacada en catálogo',
      'Prioridad sobre publicaciones estándar',
      'Aparición en sección de sugerencias',
    ],
  },
  {
    id: 'plan_15',
    name: 'Plan Premium 15 Días',
    days: 15,
    price: 699,
    badge: 'Más Vendido',
    recommended: true,
    icon: Sparkles,
    multiplier: '5x',
    features: [
      'Insignia Oro Verificada en catálogo',
      'Posicionamiento en el Top 3 de búsquedas',
      'Alertas directas por WhatsApp a compradores',
      'Reporte de interesados y vistas en tiempo real',
    ],
  },
  {
    id: 'plan_30',
    name: 'Plan Élite 30 Días',
    days: 30,
    price: 999,
    badge: 'Máximo Alcance',
    icon: Award,
    multiplier: '10x',
    features: [
      'Banner principal en portada de Motoluv',
      'Campaña en redes sociales oficiales de Motoluv',
      'Sello "Vendedor Recomendado Motoluv"',
      'Asesor técnico dedicado para cierre de venta',
    ],
  },
];

const BoostPublicationModal = ({ isOpen, onClose, moto, allMotos = [], onBoostSuccess }) => {
  const { user } = useAuth();
  const [selectedMoto, setSelectedMoto] = useState(moto || allMotos[0] || null);
  const [selectedPlanId, setSelectedPlanId] = useState('plan_15');
  const [paymentProvider, setPaymentProvider] = useState('clip'); // 'clip' | 'stripe'
  const [step, setStep] = useState('plan'); // 'plan' | 'payment' | 'processing' | 'success'
  const [loading, setLoading] = useState(false);
  const [transactionData, setTransactionData] = useState(null);

  // Form details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  if (!isOpen) return null;

  const currentMoto = selectedMoto || moto || allMotos[0];
  const activePlan = BOOST_PLANS.find((p) => p.id === selectedPlanId) || BOOST_PLANS[1];

  const handleProceedToPayment = () => {
    if (!currentMoto) {
      toast({ title: 'Selecciona una moto', description: 'Debes elegir la publicación que deseas destacar.', variant: 'destructive' });
      return;
    }
    setStep('payment');
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStep('processing');

    try {
      if (paymentProvider === 'clip') {
        const clipReq = await clipApi.createPaymentRequest({
          amount: activePlan.price,
          description: `Destacar publicación: ${currentMoto.brand} ${currentMoto.model} (${activePlan.name})`,
          customerEmail,
          customerName,
          items: [{ name: activePlan.name, price: activePlan.price, quantity: 1 }],
        });

        await new Promise((r) => setTimeout(r, 1400));

        const res = await clipApi.processCheckout({
          amount: activePlan.price,
          items: [{ name: activePlan.name, price: activePlan.price, quantity: 1 }],
          shippingAddress: { address: 'Servicio Digital Destacado Motoluv', city: 'CDMX', postalCode: '03900', phone: customerPhone },
          customerInfo: { name: customerName, email: customerEmail },
          clipReference: clipReq.clipReference,
        });

        const txInfo = {
          orderId: res.order.orderId,
          paymentIntentId: clipReq.clipReference,
          provider: 'Pago Digital y SPEI',
          planName: activePlan.name,
          amount: activePlan.price,
          motoName: `${currentMoto.brand} ${currentMoto.model} ${currentMoto.year || ''}`,
          days: activePlan.days,
          date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
        };

        setTransactionData(txInfo);
        setStep('success');

        if (currentMoto.id) {
          try {
            await motoApi.update(currentMoto.id, { is_boosted: true, boost_tier: activePlan.id });
          } catch (e) {
            console.log('Moto updated locally');
          }
        }

        onBoostSuccess && onBoostSuccess(currentMoto.id || currentMoto, activePlan);
        toast({ title: '¡Publicación Destacada!', description: `Tu moto ahora cuenta con ${activePlan.name}.` });
      } else {
        if (!cardNumber || !cardExpiry || !cardCvc) {
          toast({ title: 'Datos de tarjeta requeridos', description: 'Por favor ingresa los datos de tu tarjeta para procesar.', variant: 'destructive' });
          setStep('payment');
          setLoading(false);
          return;
        }

        const intentRes = await stripeApi.createPaymentIntent({
          amount: activePlan.price,
          currency: 'mxn',
          items: [{ name: activePlan.name, price: activePlan.price, quantity: 1 }],
          customerEmail,
          metadata: { motoId: currentMoto.id, moto: `${currentMoto.brand} ${currentMoto.model}`, plan: activePlan.name },
        });

        await new Promise((r) => setTimeout(r, 1400));

        const res = await stripeApi.processOrder({
          items: [{ name: activePlan.name, price: activePlan.price, quantity: 1 }],
          totalAmount: activePlan.price,
          shippingAddress: { address: 'Servicio Digital Destacado Motoluv', city: 'CDMX', postalCode: '03900', phone: customerPhone },
          customerInfo: { name: customerName, email: customerEmail },
          paymentIntentId: intentRes.paymentIntentId,
        });

        const txInfo = {
          orderId: res.order.orderId,
          paymentIntentId: intentRes.paymentIntentId,
          provider: 'Tarjeta Bancaria (Débito/Crédito)',
          planName: activePlan.name,
          amount: activePlan.price,
          motoName: `${currentMoto.brand} ${currentMoto.model} ${currentMoto.year || ''}`,
          days: activePlan.days,
          date: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
        };

        setTransactionData(txInfo);
        setStep('success');

        if (currentMoto.id) {
          try {
            await motoApi.update(currentMoto.id, { is_boosted: true, boost_tier: activePlan.id });
          } catch (e) {
            console.log('Moto updated locally');
          }
        }

        onBoostSuccess && onBoostSuccess(currentMoto.id || currentMoto, activePlan);
        toast({ title: '¡Publicación Destacada!', description: `Tu moto ahora cuenta con ${activePlan.name}.` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al procesar el pago', description: err.message || 'No se pudo completar el cobro.', variant: 'destructive' });
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col text-white text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0d0d10] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand">
              <Zap size={18} className="fill-red-brand" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>Destacar Publicación</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-brand text-white">
                  Más Visitas
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Multiplica las ofertas de compradores certificados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* STEP 1: Select Moto & Plan */}
          {step === 'plan' && (
            <div className="space-y-6">
              {/* Selected Moto Selector / Preview */}
              <div className="p-4 bg-[#16161c] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Motocicleta a destacar
                  </span>
                  {allMotos.length > 1 && (
                    <span className="text-[11px] text-zinc-500">Selecciona entre tus motos</span>
                  )}
                </div>

                {allMotos.length > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allMotos.map((m) => {
                      const isChosen = (selectedMoto?.id || currentMoto?.id) === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMoto(m)}
                          className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isChosen
                              ? 'bg-red-brand/10 border-red-brand text-white shadow-md'
                              : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:border-white/20'
                          }`}
                        >
                          <img
                            src={resolveSafeImageUrl(m.image || m.images?.[0], 'moto')}
                            alt={m.model}
                            onError={(e) => handleImageError(e, 'moto')}
                            className="w-12 h-12 rounded-lg object-cover bg-black/40 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold truncate">
                              {m.brand} {m.model} {m.year}
                            </h5>
                            <p className="text-[11px] text-zinc-400">
                              ${Number(m.price).toLocaleString()} MXN
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : currentMoto ? (
                  <div className="flex items-center gap-3.5 p-2 bg-white/[0.02] rounded-lg">
                    <img
                      src={resolveSafeImageUrl(currentMoto.image || currentMoto.images?.[0], 'moto')}
                      alt={currentMoto.model}
                      onError={(e) => handleImageError(e, 'moto')}
                      className="w-14 h-14 rounded-lg object-cover bg-black/40 flex-shrink-0"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {currentMoto.brand} {currentMoto.model} {currentMoto.year}
                      </h4>
                      <p className="text-xs text-red-brand font-semibold">
                        ${Number(currentMoto.price).toLocaleString()} MXN
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No hay publicaciones activas.</p>
                )}
              </div>

              {/* Plan Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Selecciona tu paquete de alcance
                  </h4>
                  <span className="text-[11px] text-red-brand font-semibold">Garantía de visibilidad</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {BOOST_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const Icon = plan.icon;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all relative ${
                          isSelected
                            ? 'bg-red-brand/10 border-red-brand shadow-lg ring-1 ring-red-brand/50'
                            : 'bg-[#16161c] border-white/5 hover:border-white/20'
                        }`}
                      >
                        {plan.recommended && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-red-brand text-white text-[9px] font-bold uppercase rounded-full shadow">
                            Recomendado
                          </span>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-red-brand text-white' : 'bg-white/5 text-zinc-400'}`}>
                              <Icon size={18} />
                            </div>
                            <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {plan.multiplier}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-bold text-xs text-white leading-tight">{plan.name}</h5>
                            <div className="mt-1 flex items-baseline gap-1">
                              <span className="text-lg font-black text-white">${plan.price}</span>
                              <span className="text-[10px] text-zinc-400">MXN</span>
                            </div>
                          </div>

                          <ul className="space-y-1.5 pt-2 border-t border-white/5 text-[11px] text-zinc-300">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-snug">
                                <CheckCircle2 size={12} className="text-red-brand flex-shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 pt-2">
                          <div className={`w-full py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                            isSelected
                              ? 'bg-red-brand text-white shadow-md'
                              : 'bg-white/5 text-zinc-400'
                          }`}>
                            {isSelected ? 'Seleccionado' : 'Elegir'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action */}
              <button
                onClick={handleProceedToPayment}
                className="w-full py-3.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-brand/20 flex items-center justify-center gap-2"
              >
                <span>Continuar al pago con {activePlan.name} (${activePlan.price} MXN)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 2: Gateway Selection (Clip vs Stripe) & Payment Details */}
          {step === 'payment' && (
            <form onSubmit={handleProcessPayment} className="space-y-6">
              {/* Back to Plan Selection */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setStep('plan')}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  ← Cambiar paquete
                </button>
              </div>

              {/* Plan Summary Bar */}
              <div className="p-3.5 bg-[#16161c] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 block">Publicación & Plan</span>
                  <span className="text-xs font-bold text-white">
                    {currentMoto?.brand} {currentMoto?.model} • <span className="text-red-brand">{activePlan.name}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-zinc-500 block">Total a Pagar</span>
                  <span className="text-base font-black text-white">${activePlan.price} MXN</span>
                </div>
              </div>

              {/* Gateway Choice */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Elige tu Método de Pago
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Card */}
                  <div
                    onClick={() => setPaymentProvider('stripe')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentProvider === 'stripe'
                        ? 'bg-red-brand/10 border-red-brand shadow-md ring-1 ring-red-brand/50'
                        : 'bg-[#16161c] border-white/5 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-200">
                        Tarjeta Bancaria (Débito y Crédito)
                      </span>
                      {paymentProvider === 'stripe' && (
                        <span className="w-2 h-2 rounded-full bg-red-brand"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-snug">
                      Procesamiento bancario seguro con tarjetas Visa, Mastercard y American Express.
                    </p>
                  </div>

                  {/* Option 2: Digital / SPEI */}
                  <div
                    onClick={() => setPaymentProvider('clip')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentProvider === 'clip'
                        ? 'bg-red-brand/10 border-red-brand shadow-md ring-1 ring-red-brand/50'
                        : 'bg-[#16161c] border-white/5 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-200">
                        Pago Digital y SPEI
                      </span>
                      {paymentProvider === 'clip' && (
                        <span className="w-2 h-2 rounded-full bg-red-brand"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-snug">
                      Transferencia electrónica bancaria SPEI y pagos con acreditación inmediata.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Nombre del Titular</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#16161c] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-red-brand"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 font-medium block mb-1">Correo para Comprobante</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#16161c] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-red-brand"
                    />
                  </div>
                </div>

                {/* Gateway-specific card input */}
                {paymentProvider === 'clip' ? (
                  <div className="p-4 bg-[#16161c] border border-white/10 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Transferencia y Pago Digital Inmediato</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        CUSTODIA ACTIVA
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      El pago se procesa a través de la infraestructura cifrada bancaria.
                      Se enviará el comprobante digital fiscal y tu publicación quedará destacada al instante.
                    </p>
                    <div className="text-[11px] text-zinc-400">
                      Protegido con encriptación bancaria y certificación de seguridad digital.
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#16161c] border border-white/10 rounded-xl space-y-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 font-medium block mb-1">Número de Tarjeta</label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3 py-2 bg-[#111114] border border-white/10 rounded-lg text-xs text-white font-mono outline-none focus:border-red-brand"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Vencimiento (MM/AA)</label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="12/28"
                          className="w-full px-3 py-2 bg-[#111114] border border-white/10 rounded-lg text-xs text-white font-mono outline-none focus:border-red-brand"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="w-full px-3 py-2 bg-[#111114] border border-white/10 rounded-lg text-xs text-white font-mono outline-none focus:border-red-brand"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button - NO ISOTIPOS, Clean unified action */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg text-center"
              >
                Pagar ${activePlan.price} MXN
              </button>
            </form>
          )}

          {/* STEP 3: Processing State */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-red-brand animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-red-brand">
                  <Zap size={22} className="fill-red-brand" />
                </div>
              </div>
              <h4 className="text-base font-bold text-white">Procesando pago...</h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                Activando insignia destacada y configurando algoritmo de alcance para tu moto.
              </p>
            </div>
          )}

          {/* STEP 4: Success State */}
          {step === 'success' && transactionData && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">¡Publicación Destacada Activa!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tu motocicleta ahora tiene máxima visibilidad en Motoluv.
                </p>
              </div>

              {/* Receipt Box */}
              <div className="p-4 bg-[#16161c] border border-white/5 rounded-xl space-y-2.5 text-xs text-left">
                <div className="flex justify-between pb-2 border-b border-white/5">
                  <span className="text-zinc-400">Orden / Recibo:</span>
                  <span className="font-mono text-red-brand font-bold">{transactionData.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pasarela:</span>
                  <span className="text-white font-medium">{transactionData.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Moto Destacada:</span>
                  <span className="text-white font-medium">{transactionData.motoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Paquete:</span>
                  <span className="text-emerald-400 font-bold">{transactionData.planName}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-zinc-300 font-bold">Monto Cobrado:</span>
                  <span className="text-white font-bold">${transactionData.amount} MXN</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-red-brand hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Volver al Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoostPublicationModal;
