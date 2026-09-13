import React from 'react';

/**
 * Motoluv Official Brand Logo Component
 * Uses the exact official image asset.
 */
export const MotoluvLogo = ({ className = 'h-8 md:h-9 w-auto', alt = 'Motoluv - Sube Conecta Rueda' }) => {
  return (
    <img
      src="/motoluv-logo.jpg"
      alt={alt}
      className={`${className} object-contain`}
    />
  );
};

export default MotoluvLogo;
