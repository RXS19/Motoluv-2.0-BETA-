import React from 'react';

/**
 * Motoluv Official Brand Logo Component
 * Standardized to match the official header logo (/motoluv-logo.jpg).
 */
export const MotoluvLogo = ({ className = 'h-[42px] sm:h-[44px] md:h-[48px] w-auto max-h-[50px] object-contain', alt = 'Motoluv', ...props }) => {
  return (
    <img
      src="/motoluv-logo.jpg"
      alt={alt}
      className={`${className} transition-transform duration-200 group-hover:scale-105`}
      {...props}
    />
  );
};

export default MotoluvLogo;
