// Platform protection packages and seller listing plans for Motoluv

export const packages = [
  {
    id: 'basico',
    name: 'Básico',
    price: 'Gratis',
    subtitle: 'Sin costo adicional',
    recommended: false,
    features: [
      'Informe de inspección completo',
      'Revisión legal exprés',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$1,800 MXN',
    subtitle: '100% reembolsable si no concretas la compra',
    recommended: true,
    features: [
      'Prioridad en gestión',
      'Acompañamiento por chat',
      'Notificaciones push prioritarias',
      'Garantía mecánica limitada',
      'Asistencia vial',
      'Revisión postventa gratuita',
    ],
  },
  {
    id: 'total',
    name: 'Total',
    price: '$3,500 MXN',
    subtitle: '100% reembolsable, descontando proceso iniciado',
    recommended: false,
    features: [
      'Informe de inspección completo',
      'Revisión legal exprés',
      'Prioridad en gestión',
      'Acompañamiento por chat',
      'Seguro de cancelación',
      'Notificaciones push prioritarias',
      'Garantía mecánica limitada',
      'Asistencia vial',
      'Revisión postventa gratuita',
      'Gestión de cambio de propietario',
    ],
  },
];

export const sellerPackages = [
  {
    id: 'publicacion',
    name: 'Publicación',
    price: 'Gratis',
    subtitle: 'Publica tu moto sin costo',
    recommended: false,
    features: [
      'Publicación en el catálogo',
      'Hasta 6 fotografías',
      'Ficha técnica completa',
      'Dashboard de gestión',
      'Recibe ofertas de compradores verificados',
    ],
  },
  {
    id: 'destacada',
    name: 'Destacada',
    price: '$499 MXN',
    subtitle: 'Duplica tu visibilidad',
    recommended: true,
    features: [
      'Todo lo del plan Publicación',
      'Badge "DESTACADA" en la tarjeta',
      'Prioridad en resultados del catálogo',
      'Aparece en la sección "Motos Destacadas"',
      'Estadísticas de vistas detalladas',
      'Renovación automática cada 30 días',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$1,299 MXN',
    subtitle: 'Máxima exposición y confianza',
    recommended: false,
    features: [
      'Todo lo del plan Destacada',
      'Score mecánico certificado presencial',
      'Sesión de fotos profesional (opcional)',
      'Asesor de ventas dedicado',
      'Publicación en redes sociales de Motoluv',
      'Soporte prioritario 24/7',
      'Boost cada 7 días automáticamente',
    ],
  },
];
