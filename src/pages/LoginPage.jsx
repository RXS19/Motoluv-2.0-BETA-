import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, login, loginWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  // Redirigir si ya tiene sesión activa
  useEffect(() => {
    if (!authLoading && user) {
      const destination = location.state?.from?.pathname || '/panel';
      navigate(destination, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ 
        title: 'Campos requeridos', 
        description: 'Por favor ingresa tu correo y contraseña.',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      const u = await login(email, password);
      toast({ 
        title: 'Bienvenido de vuelta', 
        description: `Hola ${u?.name ? u.name.split(' ')[0] : 'usuario'}, sesión iniciada correctamente.` 
      });
      const destination = location.state?.from?.pathname || '/panel';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      toast({
        title: 'Error al iniciar sesión',
        description: err?.message || 'Correo o contraseña incorrectos. Verifica tus credenciales.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    try {
      await loginWithOAuth(provider);
    } catch (err) {
      console.error('Error OAuth:', err);
      toast({ title: 'Error OAuth', description: err?.message || 'No se pudo completar el inicio de sesión con el proveedor.' });
      setOauthLoading(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase">
          Iniciar <span className="text-red-brand">sesión</span>
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">Accede a tu cuenta Motoluv</p>
      </div>

      <div className="bg-[#111112] border border-white/5 rounded-md p-6 md:p-8 space-y-5">
        {/* Social / OAuth Logins */}
        <div>
          <GoogleAuthButton
            onClick={() => handleOAuth('google')}
            isLoading={oauthLoading === 'google'}
            disabled={Boolean(oauthLoading)}
            text="Continuar con Google"
            loadingText="Conectando con Google..."
          />
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <span className="relative bg-[#111112] px-3 text-[11px] uppercase tracking-widest text-zinc-500">O ingresa con tu correo</span>
        </div>

        {/* Notice of Dual Profile Capability */}
        <div className="p-3 bg-red-brand/10 border border-red-brand/20 rounded-sm flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-red-brand mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-zinc-300 leading-snug">
            <strong className="text-white">Perfil Dual Motoluv:</strong> Tu correo te da acceso simultáneo a tu <strong className="text-red-brand">Perfil de Comprador</strong> (ofertas y compras) y tu <strong className="text-red-brand">Perfil de Vendedor</strong> (publicaciones y pagos), manteniendo tu información totalmente separada.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="tucorreo@ejemplo.mx"
                className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500 uppercase tracking-widest">Contraseña</label>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="Tu contraseña"
                className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-red group w-full inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-5 py-4 rounded-sm disabled:opacity-70">
            {loading ? 'Entrando...' : 'Entrar con correo'}
            {!loading && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500 pt-4 border-t border-white/5">
          ¿No tienes cuenta? <Link to="/registro" className="text-red-brand hover:underline font-semibold">Regístrate gratis</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
