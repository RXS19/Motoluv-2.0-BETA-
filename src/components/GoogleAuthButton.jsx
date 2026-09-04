import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Logotipo oficial vectorial de Google "G" con proporciones exactas y colores oficiales (Google Brand Guidelines)
 * Colores: Azul (#4285F4), Verde (#34A853), Amarillo (#FBBC05), Rojo (#EA4335)
 */
export const GoogleLogoIcon = ({ className = "w-5 h-5", size = 20, ...props }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

/**
 * Botón estético y moderno para inicio de sesión con Google
 */
const GoogleAuthButton = ({
  onClick,
  isLoading = false,
  disabled = false,
  text = 'Continuar con Google',
  loadingText = 'Conectando con Google...',
  variant = 'dark-card', // 'dark-card', 'light' o 'minimal'
  className = '',
}) => {
  if (variant === 'light') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`w-full relative group bg-white hover:bg-zinc-50 active:bg-zinc-100 active:scale-[0.99] text-zinc-800 border border-zinc-200/90 hover:border-zinc-300 transition-all duration-200 py-3 px-4 rounded-md text-xs md:text-sm font-semibold tracking-wide flex items-center justify-center gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.28)] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
          ) : (
            <GoogleLogoIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
          )}
        </div>
        <span className="text-zinc-800 font-bold group-hover:text-black transition-colors">
          {isLoading ? loadingText : text}
        </span>
      </button>
    );
  }

  // Estilo 'dark-card' por defecto: diseño sobrio, estético y perfectamente integrado al estilo de Motoluv
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full relative group overflow-hidden bg-[#141417] hover:bg-[#1a1a20] active:scale-[0.99] text-zinc-100 border border-white/10 hover:border-white/25 active:border-red-brand/40 transition-all duration-200 py-3 px-4 rounded-md flex items-center justify-center gap-3 shadow-lg shadow-black/40 disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-sm flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-zinc-800 animate-spin" />
        ) : (
          <GoogleLogoIcon className="w-3.5 h-3.5" />
        )}
      </div>
      <span className="text-xs md:text-sm font-medium tracking-wide text-zinc-200 group-hover:text-white transition-colors">
        {isLoading ? loadingText : text}
      </span>
    </button>
  );
};

export default GoogleAuthButton;
