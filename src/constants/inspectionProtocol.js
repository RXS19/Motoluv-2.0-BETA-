/**
 * Protocolo de inspección técnica vehicular de Motoluv.
 * Módulos mecánicos para la vista general y desglose de inspección detallada.
 */

export const MECHANICAL_MODULES = [
  { key: 'motor_status', name: 'Motor' },
  { key: 'transmission_status', name: 'Transmisión' },
  { key: 'brakes_status', name: 'Frenos' },
  { key: 'suspension_steering_status', name: 'Suspensión y dirección' },
  { key: 'electrical_status', name: 'Sistema eléctrico' },
  { key: 'wheels_structure_status', name: 'Ruedas y estructura' },
];

export const getModuleStatusConfig = (raw) => {
  if (!raw) {
    return {
      label: 'No disponible',
      badgeClass: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30',
      dotClass: 'bg-zinc-600',
    };
  }
  const s = String(raw).trim().toUpperCase();
  switch (s) {
    case 'ACEPTABLE':
      return {
        label: 'Aceptable',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
      };
    case 'REGULAR':
      return {
        label: 'Regular',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
      };
    case 'REQUIERE_ATENCION':
    case 'REQUIERE ATENCION':
    case 'REQUIERE ATENCIÓN':
      return {
        label: 'Requiere Atención',
        badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        dotClass: 'bg-orange-400',
      };
    case 'RECHAZO':
    case 'RECHAZADA':
      return {
        label: 'Rechazo',
        badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
        dotClass: 'bg-red-400',
      };
    default:
      return {
        label: String(raw),
        badgeClass: 'bg-zinc-800/50 text-zinc-300 border-zinc-700/30',
        dotClass: 'bg-zinc-400',
      };
  }
};

export const INSPECTION_GROUPS = [
  {
    group: 'Identificación Básica',
    points: [
      { id: '1', number: 1, label: 'Número de Identificación Vehicular (VIN) y serie legible' },
      { id: '2', number: 2, label: 'Cotejo de número de motor, placa y registro legal' },
    ],
  },
  {
    group: 'Motor',
    points: [
      { id: '3', number: 3, label: 'Compresión y encendido de motor en frío/caliente' },
      { id: '4', number: 4, label: 'Hermeticidad y ausencia de fugas (aceite y refrigerante)' },
      { id: '5', number: 5, label: 'Nivel sonoro, ralentí estable y ausencia de vibraciones anómalas' },
      { id: '6', number: 6, label: 'Sistema de escape, catalizador y control de emisiones' },
      { id: '7', number: 7, label: 'Admisión, filtro de aire y alimentación de combustible' },
    ],
  },
  {
    group: 'Transmisión',
    points: [
      { id: '8', number: 8, label: 'Accionamiento y tacto del embrague (clutch)' },
      { id: '9', number: 9, label: 'Caja de velocidades, selector y engrane de marchas' },
      { id: '10', number: 10, label: 'Transmisión secundaria (cadena, corona, piñón o cardán)' },
    ],
  },
  {
    group: 'Frenos',
    points: [
      { id: '11', number: 11, label: 'Desgaste y estado de balatas, discos y/o tambores' },
      { id: '12', number: 12, label: 'Líquido de frenos, bombas, líneas y respuesta hidráulica' },
    ],
  },
  {
    group: 'Suspensión y dirección',
    points: [
      { id: '13', number: 13, label: 'Horquillas, retenes, vástagos y amortiguación delantera' },
      { id: '14', number: 14, label: 'Monoamortiguador/doble amortiguador y rodamientos de dirección' },
    ],
  },
  {
    group: 'Sistema eléctrico',
    points: [
      { id: '15', number: 15, label: 'Batería, voltaje y sistema de carga / alternador' },
      { id: '16', number: 16, label: 'Iluminación principal, cuartos, direccionales y stop' },
      { id: '17', number: 17, label: 'Mandos, velocímetro, testigos y arnés eléctrico principal' },
    ],
  },
  {
    group: 'Ruedas y estructura',
    points: [
      { id: '18', number: 18, label: 'Profundidad de piso, fecha y estado de neumáticos' },
      { id: '19', number: 19, label: 'Rines (sin fisuras ni desbalanceo) y rodamientos de masa' },
      { id: '20', number: 20, label: 'Chasis, basculante, soportes y geometría estructural' },
    ],
  },
];

export const getPointStatusConfig = (raw) => {
  if (!raw) {
    return {
      label: 'N/D',
      badgeClass: 'bg-zinc-800 text-zinc-500 border-zinc-700/30',
      statusType: 'missing',
    };
  }
  const s = String(raw).trim().toUpperCase();
  switch (s) {
    case 'OK':
      return {
        label: 'OK',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        statusType: 'ok',
      };
    case 'OBS':
      return {
        label: 'OBS',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        statusType: 'obs',
      };
    case 'FALLA':
      return {
        label: 'FALLA',
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
        statusType: 'falla',
      };
    default:
      return {
        label: String(raw),
        badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700/30',
        statusType: 'other',
      };
  }
};

/**
 * Mapeo oficial del estado GENERAL de certificación de Motoluv:
 * APROBADA    -> CERTIFICADA
 * CERTIFICADA -> CERTIFICADA
 * RECHAZADA   -> RECHAZADA
 * NO_APROBADA -> RECHAZADA
 * null / vacío / otro -> PENDIENTE
 *
 * REGLA ESTRICTA:
 * NUNCA mostrar REGULAR, ACEPTABLE, REQUIERE_ATENCION ni RECHAZO como estado general.
 * NUNCA utilizar moto_certifications.global_status como sustituto directo del estado general.
 */
export const mapCertificationStatus = (raw) => {
  if (!raw) return 'PENDIENTE';
  const s = String(raw).trim().toUpperCase();
  if (s === 'APROBADA' || s === 'CERTIFICADA') {
    return 'CERTIFICADA';
  }
  if (s === 'RECHAZADA' || s === 'NO_APROBADA') {
    return 'RECHAZADA';
  }
  return 'PENDIENTE';
};
