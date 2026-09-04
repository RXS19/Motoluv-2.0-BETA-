import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, ArrowRight, User, Phone, Mail, Building, Briefcase, MessageSquare, CheckCircle2, ChevronDown } from 'lucide-react';
import { partnerApi } from '../services/api';
import { toast } from '../hooks/use-toast';

const GIRO_OPTIONS = [
  { id: 'Talleres', label: 'Talleres' },
  { id: 'Tiendas de accesorios de motos', label: 'Tiendas de accesorios de motos' },
  { id: 'Agencias de motocicletas', label: 'Agencias de motocicletas' },
  { id: 'Financieras', label: 'Financieras' },
  { id: 'Eventos', label: 'Eventos' },
];

const PartnersPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    position: '',
    company_name: '',
    category: '',
    phone: '',
    email: '',
    message: '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company_name.trim() || !form.category || !form.phone.trim()) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor completa los campos obligatorios (Nombre, Empresa, Giro y Teléfono).',
      });
      return;
    }
    setLoading(true);
    try {
      await partnerApi.apply(form);
      setSuccess(true);
      toast({ title: '¡Solicitud enviada!', description: 'Nuestro equipo te contactará muy pronto.' });
    } catch (err) {
      toast({ title: 'Error al enviar', description: err?.response?.data?.detail || 'Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase mb-4">
          ¡Solicitud <span className="text-[#E10600]">enviada con éxito</span>!
        </h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Gracias por tu interés en sumarte a la red Motoluv. Un ejecutivo de nuestro equipo de alianzas se pondrá en contacto contigo a la brevedad.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-outline inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-sm">
            Volver al inicio
          </Link>
          <Link to="/motos" className="btn-red inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3 rounded-sm">
            Explorar Motos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div>
          <span className="inline-flex items-center gap-2 border border-[#E10600]/60 text-[#E10600] text-[11px] tracking-widest uppercase px-3.5 py-1.5 rounded-full mb-6 font-bold">
            <Handshake size={13} /> Red Motoluv
          </span>
          <h1 className="font-display font-bold text-white text-4xl md:text-5xl uppercase leading-tight">
            Súmate a <br /><span className="text-[#E10600]">nuestra red</span>
          </h1>
          <p className="text-zinc-300 mt-6 text-base leading-relaxed max-w-md">
            Conectamos talleres, tiendas de accesorios, agencias, financieras y organizadores de eventos con la comunidad biker más activa de México.
          </p>

          <div className="mt-10 space-y-6 max-w-md">
            {[
              { title: 'Talleres', desc: 'Certifica motocicletas en nuestra plataforma y recibe clientes calificados.' },
              { title: 'Tiendas de Accesorios', desc: 'Publica tu inventario de cascos, equipamiento y refacciones en la tienda Motoluv.' },
              { title: 'Agencias de Motocicletas', desc: 'Comercializa unidades seminuevas y garantizadas con respaldo técnico.' },
              { title: 'Financieras', desc: 'Ofrece financiamiento ágil a compradores pre-verificados.' },
              { title: 'Eventos', desc: 'Promociona rodadas, expos y competencias dentro de nuestra comunidad.' },
            ].map((it, i) => (
              <div key={i} className="flex gap-4 p-3.5 rounded-md bg-[#111112] border border-white/5 hover:border-[#E10600]/30 transition-colors">
                <div className="w-8 h-8 rounded-md border border-[#E10600]/40 bg-[#E10600]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#E10600] font-bold text-xs">{i + 1}</span>
                </div>
                <div>
                  <div className="text-white text-sm font-bold uppercase tracking-wide">{it.title}</div>
                  <div className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{it.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="bg-[#111112] border border-white/10 rounded-md p-6 md:p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E10600]/5 rounded-bl-full pointer-events-none" />
          <h2 className="font-display font-bold text-white text-2xl uppercase mb-2">Formulario de registro</h2>
          <p className="text-xs text-zinc-400 mb-6">Ingresa tus datos y los de tu empresa para incorporarte a la red.</p>

          <div className="space-y-4">
            <Field icon={User} label="Nombre del contacto" required value={form.name} onChange={(v) => update('name', v)} placeholder="Ej. Juan Pérez" />
            <Field icon={Briefcase} label="Cargo" required value={form.position} onChange={(v) => update('position', v)} placeholder="Ej. Gerente Comercial, Dueño, Director" />
            <Field icon={Building} label="Nombre de la empresa" required value={form.company_name} onChange={(v) => update('company_name', v)} placeholder="Ej. Motos & Accesorios del Norte" />

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block font-medium">
                Giro comercial <span className="text-[#E10600]">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  required
                  className="w-full pl-4 pr-10 py-3 bg-[#0a0a0a] border border-white/10 focus:border-[#E10600] text-white text-sm rounded-sm outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled className="text-zinc-600">Selecciona el giro de tu empresa</option>
                  {GIRO_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#111112] text-white py-1">
                      {g.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={Phone} label="Teléfono" type="tel" required value={form.phone} onChange={(v) => update('phone', v)} placeholder="+52 56 4304 8865" />
              <Field icon={Mail} label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="contacto@empresa.mx" />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block font-medium">
                Comentario o propuesta
              </label>
              <div className="relative">
                <textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  rows={3}
                  placeholder="Cuéntanos más sobre tus servicios, ubicación o propuesta de valor..."
                  className="w-full p-3.5 bg-[#0a0a0a] border border-white/10 focus:border-[#E10600] text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600 resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-red group mt-6 w-full inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-4 rounded-sm disabled:opacity-70 shadow-lg"
          >
            {loading ? 'Enviando registro...' : 'Enviar registro a la red'}
            {!loading && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
          </button>

          <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed text-center">
            Al enviar tu registro, un ejecutivo de alianzas se comunicará para validar tu perfil y activar tu negocio.
          </p>
        </form>
      </div>
    </div>
  );
};

const Field = ({ icon: Icon, label, type = 'text', value, onChange, placeholder, required }) => (
  <div>
    <label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block font-medium">
      {label} {required && <span className="text-[#E10600]">*</span>}
    </label>
    <div className="relative">
      <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-[#E10600] text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600"
      />
    </div>
  </div>
);

export default PartnersPage;

