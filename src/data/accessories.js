// Motoluv official accessories catalog

export const accessories = [
  { 
    id: 'acc_1', 
    name: 'Casco Integral AGV K6 S E2206', 
    brand: 'AGV', 
    price: 9800, 
    category: 'Cascos', 
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800', 
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800'
    ],
    inStock: 8,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Negro Mate', 'Blanco Perla', 'Rojo Corsa'],
    description: 'Casco integral de alta gama desarrollado con tecnología de MotoGP. Calota de fibra de carbono y aramida ultra liviana con homologación europea ECE 22.06.',
    features: [
      'Calota externa 100% en Fibra de Carbono y Aramida',
      'Homologación europea ECE 22.06 y DOT',
      'Sistema de ventilación integrado con 5 extractores ajustables',
      'Pantalla Ultravision óptica clase 1 de 190° de campo visual',
      'Pinlock 120 Max Vision 100% anti-vaho incluido'
    ],
    specs: {
      'Peso': '1,220 gramos (+/- 50g)',
      'Material': 'Fibra de Carbono-Aramida',
      'Cierre': 'Doble Anilla D en Titanio',
      'Garantía': '2 años oficial AGV'
    }
  },
  { 
    id: 'acc_2', 
    name: 'Chamarra de Cuero Alpinestars GP Plus R v3', 
    brand: 'Alpinestars', 
    price: 8400, 
    category: 'Chamarras', 
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', 
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
    ],
    inStock: 5,
    sizes: ['M (48)', 'L (50)', 'XL (52)', 'XXL (54)'],
    colors: ['Negro / Blanco', 'Negro / Rojo Flúor', 'Negro Stealth'],
    description: 'Chamarra deportiva confeccionada en piel bovina premium de 1.3 mm altamente resistente a la abrasión con paneles elásticos de poliamida para confort ergonómico.',
    features: [
      'Piel vacuna genuina de primera calidad de 1.3 mm de grosor',
      'Protectores Nucleon Flex Plus en hombros y codos certificados CE Nivel 1',
      'Deslizaderas exteriores Dynamic Friction Shield (DFS) en hombros',
      'Paneles elásticos de acordeón en omóplatos para libertad de movimiento',
      'Cremallera de conexión con pantalones Alpinestars'
    ],
    specs: {
      'Material': 'Piel Bovina Premium 1.3mm',
      'Certificación': 'CE Categoría II PPE EN17092 Clase AA',
      'Forro': 'Malla transpirable desmontable',
      'Garantía': '1 año oficial'
    }
  },
  { 
    id: 'acc_3', 
    name: 'Guantes de Piel y Carbono Dainese Carbon 4', 
    brand: 'Dainese', 
    price: 3200, 
    category: 'Guantes', 
    image: 'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=800', 
    images: [
      'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'
    ],
    inStock: 12,
    sizes: ['S (8)', 'M (8.5)', 'L (9)', 'XL (9.5)'],
    colors: ['Negro / Rojo Lava', 'Negro / Amarillo Flúor', 'Todo Negro'],
    description: 'Guantes cortos de corte deportivo y racing con nudillos en fibra de carbono real combinados con piel de cabra súper flexible en la palma para un tacto inmejorable.',
    features: [
      'Inserciones rígidas de auténtica fibra de carbono en nudillos',
      'Palma en piel de cabra amara con refuerzos microinyectados',
      'Sistema Distortion Control (DCP) en dedo meñique anti-fracturas',
      'Perforaciones localizadas entre los dedos para ventilación continua',
      'Compatibles con pantallas táctiles Smart Touch en dedos índice y pulgar'
    ],
    specs: {
      'Material': 'Piel de Cabra & Fibra de Carbono',
      'Certificación': 'CE - Cat. II - EN 13594/2015 Nivel 1',
      'Ajuste': 'Tira de velcro microajustable en muñeca',
      'Garantía': '1 año Dainese SpA'
    }
  },
  { 
    id: 'acc_4', 
    name: 'Botas de Pista Sidi Rex Racing Air', 
    brand: 'Sidi', 
    price: 12500, 
    category: 'Botas', 
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800'
    ],
    inStock: 4,
    sizes: ['41 EU (26 MX)', '42 EU (27 MX)', '43 EU (28 MX)', '44 EU (29 MX)'],
    colors: ['Blanco / Negro / Rojo', 'Negro Mate'],
    description: 'La bota de circuito más avanzada del mundo con sistema de cierre de cables de acero micrométrico Techno-3 Push y exoesqueleto de soporte de tobillo en nylon reforzado.',
    features: [
      'Cierre triple exclusivo Techno-3 Push con cables de acero de alta tensión',
      'Sistema de soporte de tobillo asimétrico en nylon reforzado con fibra de vidrio',
      'Deslizaderas de magnesio intercambiables en punta y talón',
      'Tomas de aire ajustables con flujo directo al interior del pie',
      'Suela de goma de doble densidad con agarre para estriberas de pista'
    ],
    specs: {
      'Estructura': 'Technomicro microfibra perforada',
      'Certificación': 'CE EN 13634:2017 Nivel 2 de protección',
      'Suela': 'Compuesto vulcanizado antideslizante',
      'Garantía': '18 meses'
    }
  },
  { 
    id: 'acc_5', 
    name: 'Escape Deportivo Akrapovič Slip-On Line Titanium', 
    brand: 'Akrapovic', 
    price: 18500, 
    category: 'Escapes', 
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800', 
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800'
    ],
    inStock: 3,
    sizes: ['Compatibilidad Estándar (Slip-On)'],
    colors: ['Titanio Mate / Tapa Carbono'],
    description: 'Sistema de escape de silenciador Slip-On en titanio genuino de grado de carreras con tapa final en fibra de carbono mate. Optimiza la entrega de torque, incrementa la potencia en +3.2 HP y reduce el peso en -2.8 kg.',
    features: [
      'Construcción 100% en Aleación de Titanio ultraligera',
      'Tapa final y abrazadera en Fibra de Carbono auténtica',
      'Sonido profundo y resonante homologado para carretera (con dB Killer removible)',
      'Instalación plug & play sin necesidad de reprogramar la computadora ECU',
      'Cumple normativas de emisiones Euro 5'
    ],
    specs: {
      'Material': 'Titanio & Fibra de Carbono',
      'Aumento de Potencia': '+3.2 HP @ 9,800 RPM',
      'Reducción de Peso': '-2.8 kg vs Escape Original',
      'Homologación': 'EC / ECE Type Approved',
      'Garantía': '2 años Akrapovič México'
    }
  },
  { 
    id: 'acc_6', 
    name: 'Alforjas Laterales Impermeables Givi Canyon 35L', 
    brand: 'Givi', 
    price: 4500, 
    category: 'Maletas', 
    image: 'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=800', 
    images: [
      'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=800',
      'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=800',
      'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800'
    ],
    inStock: 10,
    sizes: ['35 Litros por Lado (Set de 2)'],
    colors: ['Negro Técnico / Reflejante'],
    description: 'Par de alforjas suaves impermeables con capacidad total de 70 litros para motos trail, enduro y adventure. Fabricadas en Poliéster 1200D de altísima tenacidad con funda interna IPX5 impermeable removable.',
    features: [
      'Capacidad de 35 Litros por alforja (70L total en el juego)',
      'Cierre enrollable Roll-Top con sellado térmico IPX5 antirroll',
      'Sistema de sujeción universal con cinchas micrométricas reforzadas',
      'Bolsillo exterior con cierre para herramientas de rápido acceso',
      'Detalles y estampados reflectantes de alta visibilidad nocturna'
    ],
    specs: {
      'Capacidad': '2x 35 Litros (70L Total)',
      'Material': 'Poliéster 1200D + Hypalon Anti-desgarre',
      'Resistencia al Agua': 'Grado IPX5 impermeable',
      'Garantía': '2 años'
    }
  },
  { 
    id: 'acc_7', 
    name: 'Casco Modular Abatible Shark Evo-ES', 
    brand: 'Shark', 
    price: 11200, 
    category: 'Cascos', 
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800', 
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800',
      'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=800'
    ],
    inStock: 7,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Gris Nardo', 'Negro Mate', 'Blanco Perla'],
    description: 'El casco modular definitivo con mentonera abatible a 180° que cuenta con doble homologación P/J (Jet e Integral). Sistema Auto-up / Auto-down para apertura suave simultánea del visor.',
    features: [
      'Doble Homologación P/J (Aprobado para circular abierto o cerrado)',
      'Mentonera giratoria de 180 grados con fijación aerodinámica posterior',
      'Mica VZ150 anti-rayaduras y anti-empañante',
      'Visor solar interno accionable con la mano izquierda',
      'Espacio lateral adaptado para lentes oftálmicos (EasyFit)'
    ],
    specs: {
      'Mecanismo': 'Abatible 180° Auto-Up',
      'Homologación': 'ECE 22.05 P/J & DOT',
      'Peso': '1,650g',
      'Garantía': '5 años garantía de fábrica Shark'
    }
  },
  { 
    id: 'acc_8', 
    name: 'Kit de Servicio de Sintético Motul 7100 4T 10W40', 
    brand: 'Motul', 
    price: 950, 
    category: 'Lubricantes', 
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800', 
    images: [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800',
      'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=800'
    ],
    inStock: 25,
    sizes: ['Kit 4 Litros + Filtro Universal'],
    colors: ['Rojo Rubí Sintético Éster'],
    description: 'Lubricante 100% sintético con tecnología de Éster diseñado para motores de 4 tiempos de alta gama. Proporciona protección suprema para el motor, caja de cambios y embrague húmedo.',
    features: [
      'Tecnología 100% Sintético Éster con película lubricante de alta estabilidad',
      'Cumple especificaciones JASO MA2 y API SP para máximo agarre de embrague',
      'Reducción drástica de fricción interna y temperatura de trabajo',
      'Incluye 4 botellas de 1 Litro + Limpiador de cadena Motul Chain Clean gratis'
    ],
    specs: {
      'Viscosidad': '10W-40 100% Synthetic Ester',
      'Normativa': 'JASO MA2 / API SP / SN',
      'Contenido': '4 Litros + Regalo de mantenimiento',
      'Garantía': 'Calidad Certificada Motul France'
    }
  }
];
