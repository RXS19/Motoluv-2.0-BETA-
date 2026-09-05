import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { handleImageError, resolveSafeImageUrl } from '../utils/imageFallback';

const ImageLightboxModal = ({
  isOpen,
  onClose,
  images = [],
  currentIndex = 0,
  onIndexChange,
  imageType = 'moto',
  altTitle = 'Imagen ampliada',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        onIndexChange?.(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        onIndexChange?.(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onIndexChange]);

  if (!isOpen || !images || images.length === 0) return null;

  const currentSrc = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className="absolute top-5 right-5 z-50 p-2.5 rounded-full bg-white/10 hover:bg-red-brand text-white transition-all shadow-xl hover:scale-105 border border-white/10 cursor-pointer"
        aria-label="Cerrar visor"
      >
        <X size={24} />
      </button>

      {/* Contador de imágenes */}
      {images.length > 1 && (
        <div className="absolute top-5 left-5 z-50 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono font-bold text-zinc-300">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Flecha anterior */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange?.(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
          }}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/60 hover:bg-red-brand text-white flex items-center justify-center transition-all shadow-2xl border border-white/15 hover:scale-110 cursor-pointer"
          aria-label="Imagen anterior"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Flecha siguiente */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange?.(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
          }}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/60 hover:bg-red-brand text-white flex items-center justify-center transition-all shadow-2xl border border-white/15 hover:scale-110 cursor-pointer"
          aria-label="Siguiente imagen"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Imagen activa */}
      <div
        className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolveSafeImageUrl(currentSrc, imageType)}
          alt={altTitle}
          onError={(e) => handleImageError(e, imageType)}
          className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl transition-all duration-200"
        />
      </div>
    </div>
  );
};

export default ImageLightboxModal;
