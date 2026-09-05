import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Shield, Users, FileText, CreditCard, ArrowRight, Search, HandCoins, UserCheck, ClipboardCheck, PackageCheck, Bike, ShoppingCart, Lock } from 'lucide-react';
import { packages, sellerPackages } from '../data/plans';
import { useAuth } from '../context/AuthContext';

const HowItWorksPage = () => {
  const { user } = useAuth();
  const defaultTab = user?.role === 'vendedor' || user?.role === 'both' ? 'vendedor' : 'comprador';
  const [pkgTab, setPkgTab] = useState(defaultTab);
  const currentPackages = pkgTab === 'vendedor' ? sellerPackages : packages;
  const whyReasons = [
    { icon: Shield, title: 'Prevención de Fraudes', desc: 'Eliminamos el riesgo de estafas y comunicaciones engañosas entre partes.' },
    { icon: Users, title: 'Negociación Profesional', desc: 'Un asesor capacitado media las negociaciones de forma imparcial.' },
    { icon: FileText, title: 'Documentación Completa', desc: 'Garantizamos que toda la documentación esté en orden antes de proceder.' },
    { icon: CreditCard, title: 'Pagos Seguros', desc: 'Todos los pagos pasan por nuestra plataforma protegida.' },
  ];

  const steps = [
    { icon: Search, title: 'Busca tu Moto', desc: 'Explora nuestro catálogo de miles de motocicletas nuevas y usadas.' },
    { icon: HandCoins, title: 'Haz una Oferta', desc: 'Selecciona un paquete de garantía y envía tu oferta.' },
    { icon: UserCheck, title: 'Asesor Asignado', desc: 'Un asesor Motoluv se encarga de toda la gestión.' },
    { icon: ClipboardCheck, title: 'Verificación', desc: 'El asesor coordina la inspección y certificación.' },
    { icon: PackageCheck, title: '¡Listo!', desc: 'Recibe tu moto con garantía Motoluv.' },
  ];

  const faqs = [
    { q: '¿Por qué no puedo contactar directamente al vendedor?', a: 'Para tu seguridad, todas las operaciones son gestionadas por un asesor Motoluv. Esto previene fraudes, asegura negociaciones justas y garantiza que la documentación esté en orden.' },
    { q: '¿Qué paquete de garantía me conviene?', a: 'El paquete Plus es el más recomendado porque incluye prioridad, chat dedicado y seguro de cancelación. Si quieres máxima protección con asistencia y cambio de propietario coordinado, el paquete Total es ideal.' },
    { q: '¿Qué hace el asesor Motoluv?', a: 'El asesor se encarga de: validar la identidad de ambas partes, verificar la documentación de la moto, coordinar la inspección, gestionar el pago y supervisar la entrega.' },
    { q: '¿Cuánto tarda el proceso?', a: 'Depende del paquete elegido. El proceso completo típicamente toma entre 3-7 días dependiendo de la coordinación.' },
    { q: '¿Qué pasa si la moto no es como se describió?', a: 'Si eligiste paquete Plus o Total, tienes seguro de cancelación. El asesor Motoluv mediará y, si corresponde, recibirás un reembolso completo.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0 hero-vignette" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 lg:px-8 py-24 text-center">
          <span className="inline-flex items-center border border-red-brand/60 text-red-brand text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full mb-8">
            Proceso Seguro
          </span>
          <h1 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-tight">
            Compra segura <br /><span className="text-red-brand">con asesor</span>
          </h1>
          <p className="text-zinc-300 mt-6 max-w-2xl mx-auto text-base leading-relaxed">
            En Motoluv, un asesor profesional gestiona toda la operación. Sin contacto directo entre comprador y vendedor para máxima seguridad.
          </p>
        </div>
      </section>

      {/* Why */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
            ¿Por qué <span className="text-red-brand">sin contacto directo</span>?
          </h2>
          <p className="text-zinc-400 mt-4">Para proteger a ambas partes, todas las operaciones son gestionadas por asesores Motoluv certificados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {whyReasons.map((r, i) => (
            <div key={i} className="bg-[#111112] border border-white/5 rounded-md p-6 hover:border-red-brand/40 transition-colors">
              <div className="w-11 h-11 rounded-md border border-red-brand/40 bg-red-brand/10 flex items-center justify-center mb-4">
                <r.icon size={18} className="text-red-brand" />
              </div>
              <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-2">{r.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
            Paquetes de <span className="text-red-brand">{pkgTab === 'vendedor' ? 'publicación' : 'garantía'}</span>
          </h2>
          <p className="text-zinc-400 mt-4 max-w-xl mx-auto">
            {pkgTab === 'vendedor'
              ? 'Elige cómo quieres publicar tu motocicleta y maximizar su visibilidad'
              : 'Elige el nivel de protección que necesitas para tu compra'}
          </p>

          {/* Tab switcher */}
          <div className="inline-flex gap-1 bg-[#0a0a0a] border border-white/5 rounded-sm p-1 mt-6">
            <button onClick={() => setPkgTab('comprador')}
              className={`px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors flex items-center gap-2 ${
                pkgTab === 'comprador' ? 'bg-red-brand text-white' : 'text-zinc-400 hover:text-red-brand'
              }`}>
              <ShoppingCart size={13} /> Comprador
            </button>
            <button onClick={() => setPkgTab('vendedor')}
              className={`px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors flex items-center gap-2 ${
                pkgTab === 'vendedor' ? 'bg-red-brand text-white' : 'text-zinc-400 hover:text-red-brand'
              }`}>
              <Bike size={13} /> Vendedor
            </button>
          </div>
        </div>

        <div className="relative">
          {/* Blurred and censored package cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 filter blur-md md:blur-lg pointer-events-none select-none opacity-40 transition-all"
            aria-hidden="true"
          >
            {currentPackages.map((p) => (
              <div
                key={p.id}
                className={`package-card relative bg-[#111112] rounded-md p-8 flex flex-col ${p.recommended ? 'border-2 border-red-brand shadow-[0_0_40px_rgba(239,68,68,0.15)]' : 'border border-white/5'}`}
              >
                {p.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-brand text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-sm">
                    Recomendado
                  </div>
                )}
                <h3 className="font-display font-bold text-white text-2xl uppercase">{p.name}</h3>
                <div className="mt-2 font-display font-bold text-red-brand text-3xl">{p.price}</div>
                <p className="text-xs text-zinc-500 mt-1">{p.subtitle}</p>

                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check size={14} className="text-red-brand mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                <div
                  className={`mt-8 inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-3 rounded-sm ${
                    p.recommended ? 'btn-red' : 'btn-outline'
                  }`}
                >
                  {pkgTab === 'vendedor' ? 'Publicar Ahora' : 'Empezar'}
                </div>
              </div>
            ))}
          </div>

          {/* Censorship blur overlay banner */}
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/40 rounded-2xl">
            <div className="max-w-md w-full text-center p-6 md:p-8 bg-[#121216]/95 border border-white/15 rounded-2xl shadow-2xl space-y-4 backdrop-blur-md">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand shadow-lg shadow-red-brand/10">
                <Lock size={24} />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-brand/15 border border-red-brand/30 text-red-400 text-[10px] font-bold uppercase tracking-widest">
                  PRÓXIMAMENTE
                </div>
                <h3 className="font-display font-bold text-white text-lg md:text-xl uppercase tracking-wide">
                  PAQUETES MOTOLUV
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                  Estamos preparando algo especial para llevar tu experiencia en Motoluv al siguiente nivel.
                  <br /><br />
                  Muy pronto descubrirás todo lo que tenemos preparado para ti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
            El <span className="text-red-brand">proceso de compra</span>
          </h2>
          <p className="text-zinc-400 mt-4">5 pasos simples, todo gestionado por tu asesor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-[#111112] border border-white/5 rounded-md p-5 text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-brand text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div className="w-10 h-10 rounded-md border border-red-brand/40 bg-red-brand/10 flex items-center justify-center mb-4 mx-auto mt-2">
                <s.icon size={16} className="text-red-brand" />
              </div>
              <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm mb-2">{s.title}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Escrow */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="bg-[#111112] border border-white/5 rounded-md p-8 md:p-12">
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl uppercase mb-3">
            ¿Cómo funciona el <span className="text-red-brand">depósito en garantía</span>?
          </h2>
          <p className="text-zinc-400 mb-8">Protección completa para los paquetes Plus y Total</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title: 'Retención Segura de Fondos', desc: 'Tu pago se mantiene de forma segura en una cuenta de depósito en garantía gestionada por Motoluv hasta que se complete la transacción.' },
              { title: 'Inspección y Verificación', desc: 'Los fondos permanecen retenidos mientras el asesor Motoluv coordina la inspección de la motocicleta y verifica su condición.' },
              { title: 'Confirmación de Entrega', desc: 'Una vez que confirmes la recepción y apruebes la motocicleta, los fondos se liberan al vendedor.' },
              { title: 'Protección de Reembolso', desc: 'Si la motocicleta no cumple con las condiciones acordadas, puedes solicitar un reembolso completo.' },
            ].map((it, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-9 h-9 rounded-md border border-red-brand/40 bg-red-brand/10 flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-red-brand" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">{it.title}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{it.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-red-brand text-sm font-medium tracking-wide">
              Tu dinero está 100% protegido durante todo el proceso
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-20">
        <div className="text-center mb-12">
          <span className="inline-flex items-center border border-red-brand/60 text-red-brand text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full mb-4">
            Preguntas
          </span>
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
            Preguntas <span className="text-red-brand">frecuentes</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-[#111112] border border-white/5 rounded-md overflow-hidden">
              <summary className="cursor-pointer px-5 py-4 flex items-center justify-between text-white font-medium text-sm hover:bg-white/[0.02] list-none">
                {f.q}
                <span className="text-red-brand font-bold text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-20 text-center">
        <h2 className="font-display font-bold text-white text-3xl md:text-5xl uppercase mb-4">
          ¿Listo para <span className="text-red-brand">comprar seguro</span>?
        </h2>
        <p className="text-zinc-400 mb-8">Un asesor Motoluv te acompañará en todo el proceso</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/motos" className="group inline-flex items-center justify-center gap-2 bg-red-brand hover:bg-red-500 text-white text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm transition-colors">
            Ver catálogo <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/registro" className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm transition-colors">
            Crear cuenta
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
