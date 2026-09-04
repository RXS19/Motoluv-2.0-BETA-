import React, { useState, useEffect } from 'react';
import { Phone, Shield, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';

const RequirePhoneModal = () => {
  const { user, loading, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if authenticated user is missing phone number
  useEffect(() => {
    if (!loading && user) {
      const currentPhone = (user.phone || '').trim();
      if (!currentPhone) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [user, loading]);

  if (!isOpen || !user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMsg('Por favor ingresa un número celular de al menos 10 dígitos.');
      return;
    }

    setSaving(true);
    try {
      // Format number nicely (e.g. standard 10 digits)
      const formatted = cleanDigits.length === 10 ? cleanDigits : `+${cleanDigits}`;
      await updateProfile({ phone: formatted });

      toast({
        title: 'Teléfono registrado',
        description: 'Tu número de teléfono ha sido vinculado y guardado exitosamente en tu cuenta.',
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Error al guardar teléfono:', err);
      setErrorMsg(err?.message || 'Error al guardar el teléfono en tu perfil.');
      toast({
        title: 'Error al sincronizar',
        description: 'No se pudo guardar el teléfono. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="require-phone-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div
        id="require-phone-modal-container"
        className="w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand">
            <Phone size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-red-brand uppercase bg-red-brand/10 border border-red-brand/20 px-2 py-0.5 rounded">
              Paso Requerido
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
              Teléfono Obligatorio
            </h2>
          </div>
        </div>

        <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-5">
          Para garantizar la seguridad de tus inspecciones, transferencias y enlaces confidenciales en <span className="text-white font-semibold">Motoluv</span>, es obligatorio registrar tu número de teléfono / WhatsApp.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Número Móvil / WhatsApp (10 dígitos) <span className="text-red-brand">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 border-r border-white/10 pr-2.5">
                🇲🇽 +52
              </span>
              <input
                id="required-phone-input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="55 1234 5678"
                autoFocus
                required
                maxLength={15}
                className="w-full pl-24 pr-4 py-3 bg-[#0a0a0c] border border-white/15 focus:border-red-brand text-white text-sm rounded-xl outline-none transition-colors placeholder:text-zinc-600 font-mono tracking-wider font-semibold"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
              <Lock size={12} className="text-emerald-400 flex-shrink-0" />
              <span>Tus datos están protegidos y encriptados con seguridad bancaria.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
              <Shield size={12} className="text-red-brand flex-shrink-0" />
              <span>Nunca se compartirá tu teléfono con terceros ni compradores.</span>
            </div>
          </div>

          <button
            id="required-phone-submit-btn"
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-red-brand to-orange-600 hover:from-red-600 hover:to-orange-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-brand/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <span>Guardando información...</span>
            ) : (
              <>
                <span>Guardar y Continuar</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequirePhoneModal;
