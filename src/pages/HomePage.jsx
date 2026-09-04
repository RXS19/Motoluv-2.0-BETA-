import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Users, Shield, Wrench, CheckCircle, Eye, FileText, ShieldCheck } from 'lucide-react';
import MotoCard from '../components/MotoCard';
import { motoApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import heroBikeImage from '../assets/images/ducati_streetfighter_hero_1787973501846.jpg';
import bobberImage from '../assets/images/cinematic_bobber_rider_1787497883792.jpg';

const HomePage = () => {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    motoApi.list({ status: 'PUBLICADA', featured: true, limit: 12 }).then((data) => {
      // Exclusively filter and display motorcycles with the featured label and status PUBLICADA
      const onlyFeatured = (Array.isArray(data) ? data : []).filter(
        (m) => Boolean(m.featured) && m.status === 'PUBLICADA'
      );
      setFeatured(onlyFeatured.slice(0, 6));
    }).catch(() => setFeatured([]));
  }, []);

  const stats = [
    { value: '1 asesor', label: 'Por cada operación' },
    { value: 'Somos el intermediario', label: 'Certeza para comprador y vendedor' },
    { value: 'Score mecánico', label: 'En cada moto listada' },
    { value: 'Nuevo concepto', label: 'En el mercado de motos' },
  ];

  const process = [
    { n: '01', title: 'Explora el catálogo', desc: 'Encuentra motocicletas con ficha técnica completa: año, kilometraje, motor, color y ubicación. Todo en un solo lugar.' },
    { n: '02', title: 'Score mecánico en cada moto', desc: 'Cada motocicleta en Motoluv tiene una calificación técnica para que sepas exactamente qué estás viendo antes de hacer cualquier movimiento.' },
    { n: '03', title: 'Tu asesor coordina todo', desc: 'Un asesor Motoluv acompaña la operación desde el inicio. Sin contacto directo entre partes.' },
    { n: '04', title: 'Entrega protegida', desc: 'Tu asesor coordina la entrega, documentación y traspaso. Tú solo apareces cuando todo está en orden.' },
  ];

  const features = [
    { icon: Users, title: 'Acompañamiento en cada operación', desc: 'Cada compra y venta tiene un asesor Motoluv que coordina la operación de principio a fin.' },
    { icon: Wrench, title: 'Score mecánico certificado', desc: 'Mecánicos certificados Motoluv evalúan cada motocicleta. Información real antes de decidir.' },
    { icon: Shield, title: 'Sin contacto directo entre partes', desc: 'Comprador y vendedor no interactúan directamente. Proceso ordenado.' },
    { icon: CheckCircle, title: 'Usuarios con historial', desc: 'Cada usuario tiene un perfil verificado con calificaciones reales de operaciones anteriores.' },
    { icon: Eye, title: 'Proceso transparente', desc: 'Seguimiento en tiempo real de cada paso. Sabes en qué etapa está tu operación en todo momento.' },
    { icon: FileText, title: 'Ficha técnica completa', desc: 'Año, kilometraje, motor, color, ubicación, score mecánico y documentación en un solo lugar.' },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[88vh] lg:min-h-[92vh] flex items-center bg-[#0a0a0a] overflow-hidden select-none">
        {/* Background Studio Lighting & Atmosphere */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[750px] h-[600px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute right-[15%] top-1/3 -translate-y-1/2 w-[450px] h-[350px] bg-white/[0.04] rounded-full blur-[130px] pointer-events-none" />

        {/* Diagonal Studio Tube Light Bar on the right wall */}
        <div className="absolute right-[-40px] lg:right-[-20px] top-[18%] w-[8px] h-[380px] bg-white/90 rounded-full rotate-[38deg] blur-[2px] opacity-60 shadow-[0_0_35px_#ffffff,0_0_70px_rgba(255,255,255,0.5)] pointer-events-none hidden md:block" />

        {/* Background Motorcycle image positioned on the right (perspective, 55-60% width on desktop) */}
        <div className="absolute inset-0 flex justify-end items-center pointer-events-none">
          <div className="relative w-full h-full lg:w-[65%] xl:w-[60%] flex items-center justify-end">
            <img
              src={heroBikeImage}
              alt="Ducati Streetfighter Motoluv"
              className="w-full h-full object-cover object-center lg:object-right opacity-95 lg:opacity-100 brightness-[1.08] contrast-[1.04] saturate-[1.05] drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {/* Seamless dark mask matching header #0a0a0a on the left while preserving motorcycle brightness and details */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 lg:via-[#0a0a0a]/75 to-transparent w-full lg:w-[58%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/70 via-transparent to-[#0a0a0a]/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/50 via-transparent to-[#0a0a0a]/80" />
          </div>
        </div>

        {/* Hero Content Container (left 45% on desktop, fully responsive on mobile) */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full py-12 sm:py-16 lg:py-20">
          <div className="max-w-xl lg:max-w-2xl text-left">
            {/* Etiqueta / Slogan superior con el mismo formato visual de 'El proceso' */}
            <span className="inline-block text-red-brand text-[11px] tracking-widest uppercase border border-red-brand/60 rounded-full px-3 py-1.5 mb-4 sm:mb-5">
              Sube · Conecta · Rueda
            </span>

            {/* Headline Principal dominante con tipografía Oswald (font-display) */}
            <h1 className="font-display text-white text-[42px] sm:text-6xl md:text-7xl lg:text-[80px] xl:text-[88px] uppercase tracking-[-0.04em] [word-spacing:-0.08em] leading-[0.92] font-bold">
              COMPRA O VENDE
              <br />
              <span className="text-[#E10600]">TU MOTO</span>
            </h1>

            {/* Subtítulo con tipografía coordinada */}
            <p className="mt-3 sm:mt-4 text-zinc-300 text-base sm:text-lg md:text-xl leading-relaxed">
              Nosotros hacemos el resto.
            </p>

            {/* Línea divisoria sutil */}
            <div className="w-full max-w-sm sm:max-w-md h-px bg-white/15 my-5 sm:my-6" />

            {/* Feature de confianza sin isotipo y en una sola línea */}
            <div className="max-w-xl">
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-nowrap">
                Motos verificadas, operaciones acompañadas de principio a fin
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-5 sm:gap-8">
              {/* Botón Principal Rojo */}
              <Link
                to="/motos"
                className="inline-flex items-center justify-center gap-3.5 px-6 sm:px-7 py-3.5 sm:py-4 bg-[#B91C1C] hover:bg-[#DC2626] active:bg-[#991B1B] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-950/50 hover:shadow-red-700/30 group"
              >
                <span>Comprar una moto</span>
                <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform stroke-[2.2]" />
              </Link>

              {/* Segundo Botón / Enlace Subrayado */}
              <Link
                to={user ? '/panel/publicar' : '/registro'}
                className="inline-flex items-center gap-2 text-white hover:text-zinc-200 active:text-zinc-300 text-xs sm:text-sm font-medium border-b border-white/40 hover:border-white pb-0.5 transition-colors group"
              >
                <span>Vender mi moto</span>
                <ArrowRight size={16} className="text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-black bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="font-display font-bold text-white uppercase tracking-wide text-sm md:text-base">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-24">
        <div className="max-w-2xl">
          <span className="inline-block text-red-brand text-[11px] tracking-widest uppercase border border-red-brand/60 rounded-full px-3 py-1.5 mb-6">
            El proceso
          </span>
          <h2 className="font-display font-bold text-white text-4xl md:text-5xl uppercase leading-tight">
            Una nueva forma de <br /><span className="text-red-brand">comprar y vender</span>
          </h2>
          <p className="text-zinc-400 mt-6 text-base leading-relaxed">
            Motoluv cambia el modelo: un asesor acompaña cada operación para que comprador y vendedor tengan una experiencia ordenada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {process.map((p) => (
            <div
              key={p.n}
              className="bg-gradient-to-b from-[#151517] to-[#0d0d0e] hover:from-[#2a2a30] hover:to-[#18181c] border border-black rounded-md p-8 transition-all duration-300 shadow-md hover:shadow-xl cursor-default"
            >
              <div className="font-display font-bold text-red-brand text-5xl mb-6">{p.n}</div>
              <h3 className="font-display font-bold text-white uppercase tracking-wide text-lg mb-3">{p.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-24">
        <div className="max-w-2xl">
          <span className="inline-block text-red-brand text-[11px] tracking-widest uppercase border border-red-brand/60 rounded-full px-3 py-1.5 mb-6">
            Qué hace diferente Motoluv
          </span>
          <h2 className="font-display font-bold text-white text-4xl md:text-5xl uppercase leading-tight">
            Diseñado para que <br /><span className="text-red-brand">funcione bien</span>
          </h2>
          <p className="text-zinc-400 mt-6 text-base leading-relaxed">
            Cada parte del proceso Motoluv existe para que comprador y vendedor tengan una experiencia ordenada y sin fricciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-gradient-to-b from-[#151517] to-[#0d0d0e] hover:from-[#2a2a30] hover:to-[#18181c] border border-black rounded-md p-8 group transition-all duration-300 shadow-md hover:shadow-xl cursor-default"
            >
              <div className="w-11 h-11 rounded-md border border-[#E10600]/40 bg-[#E10600]/10 flex items-center justify-center mb-5 group-hover:border-[#E10600] group-hover:bg-[#E10600]/20 transition-all duration-300">
                <f.icon size={18} className="text-[#E10600]" />
              </div>
              <h3 className="font-display font-bold text-white uppercase tracking-wide text-base mb-3">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED MOTOS */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-white text-4xl md:text-5xl uppercase leading-tight">
              Motos <span className="text-red-brand">destacadas</span>
            </h2>
          </div>
          <Link to="/motos" className="group inline-flex items-center gap-2 text-white text-xs tracking-widest uppercase hover:text-red-brand transition-colors">
            Ver todas <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((m) => <MotoCard key={m.id} moto={m} />)}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            Explora todas las motocicletas verificadas disponibles en nuestro catálogo.
          </div>
        )}

        <div className="text-center mt-14">
          <Link to="/motos" className="btn-outline group inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm">
            Ver todas las motos <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-70" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `url(${bobberImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.7) contrast(1.15)',
          }}
        />
        <div className="absolute inset-0 hero-vignette opacity-80" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 lg:px-8 py-28 text-center">
          <span className="inline-block border border-red-brand/60 text-red-brand text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full mb-8">
            Sé de los primeros
          </span>
          <h2 className="font-display font-bold text-white text-4xl md:text-6xl uppercase leading-tight">
            Una plataforma <br /><span className="text-red-brand">sin precedentes</span>
          </h2>
          <p className="text-zinc-300 mt-6 max-w-xl mx-auto text-base leading-relaxed">
            Desde el catálogo hasta la entrega, todo ocurre dentro de Motoluv. Ficha técnica, score mecánico, asesor, documentación y seguimiento en un solo lugar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/registro" className="btn-red group inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm">
              Crear cuenta gratis <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/sumate" className="btn-outline inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm border-[#E10600]/60 text-white hover:border-[#E10600]">
              Súmate a nuestra red
            </Link>
            <Link to="/motos" className="btn-outline inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-8 py-4 rounded-sm">
              Explorar catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
