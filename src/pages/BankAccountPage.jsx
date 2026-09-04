import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Save, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';
import { MEXICAN_BANKS } from '../data/banks';

const BankAccountPage = () => {
  const navigate = useNavigate();
  const { user, updateBank } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clabe: user?.bank_clabe || '',
    bank_name: user?.bank_name || '',
    holder: user?.bank_holder || user?.full_name || user?.name || '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const clabeClean = form.clabe.replace(/\s/g, '');
    if (!/^\d{18}$/.test(clabeClean)) {
      toast({ title: 'CLABE inválida', description: 'La CLABE debe tener exactamente 18 dígitos.' });
      return;
    }
    if (!form.bank_name) {
      toast({ title: 'Selecciona un banco', description: 'Elige el banco correspondiente a tu CLABE.' });
      return;
    }
    if (!form.holder.trim()) {
      toast({ title: 'Titular requerido', description: 'Indica el nombre del titular de la cuenta.' });
      return;
    }
    setLoading(true);
    try {
      await updateBank({
        clabe: clabeClean,
        bank_name: form.bank_name,
        holder: form.holder.trim(),
      });
      toast({ title: 'Cuenta bancaria guardada', description: 'Tus datos se guardaron de forma segura.' });
      setTimeout(() => navigate('/panel'), 500);
    } catch (err) {
      console.error('Error al actualizar cuenta bancaria:', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo guardar la cuenta bancaria.' });
    } finally {
      setLoading(false);
    }
  };

  const hasAccount = !!user?.bank_clabe;

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-brand transition-colors mb-4">
        <ArrowLeft size={12} /> Volver
      </button>

      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
          Cuenta <span className="text-red-brand">Bancaria</span>
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">Aquí recibirás los pagos de tus motos vendidas a través de Motoluv.</p>
      </div>

      {hasAccount && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-4 mb-6 flex items-start gap-3">
          <Shield size={16} className="text-emerald-400 mt-0.5" />
          <div>
            <div className="text-emerald-300 text-sm font-medium">Cuenta bancaria activa</div>
            <div className="text-zinc-400 text-xs mt-0.5">
              {user.bank_name} · CLABE terminada en ••••{String(user.bank_clabe || '').slice(-4)}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-[#111112] border border-white/5 rounded-md p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-red-brand" />
            <h2 className="font-display font-bold text-white uppercase tracking-wide text-sm">Datos de la cuenta</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">
                Banco <span className="text-red-brand">*</span>
              </label>
              <select value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} required
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors">
                <option value="">Selecciona un banco</option>
                {MEXICAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <p className="text-[11px] text-zinc-500 mt-1.5">Bancos e instituciones autorizadas para operar en México (CNBV / Banxico).</p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">
                CLABE Interbancaria <span className="text-red-brand">*</span>
              </label>
              <input value={form.clabe} onChange={(e) => update('clabe', e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={18} placeholder="18 dígitos" required
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600 font-mono tracking-wider" />
              <p className="text-[11px] text-zinc-500 mt-1.5">18 dígitos exactos. Se valida contra el estándar SPEI.</p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">
                Titular de la cuenta <span className="text-red-brand">*</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={form.holder} onChange={(e) => update('holder', e.target.value)} required
                  placeholder="Nombre completo del titular"
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-sm p-4 flex items-start gap-3">
          <Shield size={14} className="text-red-brand mt-0.5" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tus datos bancarios están cifrados y solo se usan para transferir el pago cuando concretes una venta. Motoluv NUNCA compartirá esta información con el comprador.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1 sm:flex-initial text-xs font-bold tracking-widest uppercase px-6 py-3.5 rounded-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-red flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3.5 rounded-sm disabled:opacity-70">
            <Save size={14} /> {loading ? 'Guardando...' : (hasAccount ? 'Actualizar cuenta' : 'Guardar cuenta')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankAccountPage;
