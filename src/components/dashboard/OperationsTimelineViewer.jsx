import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  BookmarkCheck,
  FileText,
  CreditCard,
  ShieldCheck,
  Repeat,
  Bike,
  ChevronRight,
  Info,
  ChevronLeft,
  Eye,
  MessageCircle,
  X,
  CalendarClock,
  Clock,
  RotateCw
} from 'lucide-react';
import { resolveSafeImageUrl } from '../../utils/imageFallback';
import { handleMotoLinkClick } from '../../utils/motoNavigation';
import { motoApi, notificationApi } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

/**
 * Extracts the primary image exclusively from a motorcycle record.
 * Handles arrays, JSON strings, and postgres format.
 */
export const getMotoAssociatedImage = (motoRecord) => {
  if (!motoRecord) return null;
  const m = Array.isArray(motoRecord) ? motoRecord[0] : motoRecord;
  if (!m) return null;

  if (Array.isArray(m.images) && m.images.length > 0) {
    const first = m.images.find((img) => img && typeof img === 'string' && img.trim());
    if (first) return first.trim();
  }
  if (typeof m.images === 'string' && m.images.trim()) {
    const trimmed = m.images.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed.find((img) => img && typeof img === 'string' && img.trim());
          if (first) return first.trim();
        }
      } catch {}
    } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parts = trimmed.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      if (parts.length > 0) return parts[0];
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
  }
  if (typeof m.image === 'string' && m.image.trim()) {
    return m.image.trim();
  }
  return null;
};

/**
 * 6-Stage Definitions for Motoluv Operations Timeline:
 * Apartado → Contrato → Pago → Autorización → Transferencia → Entrega
 */
export const TIMELINE_STAGES = [
  { id: 'apartado', label: 'Apartado', icon: BookmarkCheck },
  { id: 'contrato', label: 'Contrato', icon: FileText },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'autorizacion', label: 'Autorización', icon: ShieldCheck },
  { id: 'transferencia', label: 'Transferencia', icon: Repeat },
  { id: 'entrega', label: 'Entrega', icon: Bike },
];

/**
 * Resolves the operational progress and status for an apartado item from real Supabase data.
 * Adheres strictly to the requirement:
 * - 6 stages: Apartado → Contrato → Pago → Autorización → Transferencia → Entrega
 * - NO dates or hours shown anywhere.
 * - DO NOT use paid_at of the initial $600 apartado for Contrato/Pago/Transferencia.
 */
export const resolveOperationTimeline = (item) => {
  if (!item) return null;

  // El NOD es el identificador principal de la operación. Nace con el apartado.
  // 1 NOD = 1 operación = 1 contrato.
  // NO generes NOD en frontend. NO uses item.id, folio o moto_id como sustituto.
  // Si falta un NOD válido, conserva el error o null sin inventar.
  const nod = item.nod || item.apartado?.nod || item.raw?.nod || null;

  // Acceso inequívoco a las entidades clave de la operación
  const apartado = item.apartado || item.raw?.apartado || item;
  const contract =
    item.contract ||
    (Array.isArray(item.contracts) ? item.contracts[0] : item.contracts) ||
    item.raw?.contract ||
    (Array.isArray(item.raw?.contracts) ? item.raw.contracts[0] : item.raw?.contracts) ||
    null;
  const tracking =
    item.tracking ||
    item.operation_tracking ||
    item.raw?.tracking ||
    item.raw?.operation_tracking ||
    null;

  // Certification status (NO MODIFICAR la lógica APROBADA/CERTIFICADA)
  const rawCertStatus = String(
    item.certification_status ||
    item.moto?.certification_status ||
    item.moto?.certified_status ||
    item.raw?.certification_status ||
    ''
  ).toUpperCase();
  const isRejected = rawCertStatus === 'RECHAZADA' || rawCertStatus === 'NO_APROBADA';

  const rawAppStatus = String(item.certification_appointment_status || '').toUpperCase();

  // 1. Etapa: Apartado (fuente de verdad: apartados)
  const rawItemStatus = String(apartado?.status || item.status || '').toUpperCase().trim();
  const isApartadoCompleted =
    !isRejected &&
    rawItemStatus !== 'CANCELADO' &&
    rawItemStatus !== 'CANCELADA' &&
    rawItemStatus !== 'EXPIRADO' &&
    rawItemStatus !== 'EXPIRADA';
  const apartadoSubstatus = isRejected
    ? 'Rechazada'
    : rawItemStatus === 'CANCELADO' || rawItemStatus === 'CANCELADA'
    ? 'Cancelado'
    : rawItemStatus === 'EXPIRADO' || rawItemStatus === 'EXPIRADA'
    ? 'Expirado'
    : 'Confirmado';

  // 2. Etapa: Contrato (fuente de verdad: contracts.contract_status)
  const rawContractStatus = String(
    contract?.contract_status ||
    item.contract_status ||
    ''
  ).toUpperCase().trim();

  // CUANDO contracts.contract_status = FIRMADO:
  // Contrato debe quedar COMPLETADO (✓ Contrato — Firmado)
  const isContractCompleted =
    !isRejected &&
    (rawContractStatus === 'FIRMADO' ||
      rawContractStatus === 'COMPLETADO' ||
      rawContractStatus === 'SIGNED');

  // Mientras el contrato no esté FIRMADO, conserva la lógica necesaria para representar Apartado y Contrato
  const isContractInProgress =
    !isRejected &&
    !isContractCompleted &&
    (rawContractStatus === 'EN_PROCESO' ||
      rawContractStatus === 'GENERADO' ||
      rawContractStatus === 'PENDIENTE_FIRMA' ||
      rawCertStatus === 'CERTIFICADA' ||
      rawCertStatus === 'APROBADA');

  // 3-6. Etapas: Pago, Autorización, Transferencia, Entrega
  // CUANDO contracts.contract_status = FIRMADO:
  // - El Dashboard debe dejar de inferir las etapas posteriores desde contracts, apartados, fechas o campos legacy.
  // - Desde ese punto, Pago, Autorización, Transferencia y Entrega deben depender EXCLUSIVAMENTE de operation_tracking.
  // - NO usar ningún fallback que convierta automáticamente el contrato FIRMADO en “Pago en proceso”.
  // - “Pago en proceso” únicamente puede mostrarse si operation_tracking.payment_status realmente indica EN_PROCESO.
  // - Si operation_tracking no está disponible: NO asumir Pago en proceso. NO inventar estados. Mantener estado seguro/indeterminado ('pending').
  const rawPaymentStatus = String(
    (isContractCompleted
      ? tracking?.payment_status
      : (tracking?.payment_status || item.payment_status)) || ''
  ).toUpperCase().trim();

  const rawAuthStatus = String(
    (isContractCompleted
      ? (tracking?.authorization_status || tracking?.auth_status)
      : (tracking?.authorization_status || tracking?.auth_status || item.authorization_status || item.auth_status)) || ''
  ).toUpperCase().trim();

  const rawTransferStatus = String(
    (isContractCompleted
      ? tracking?.transfer_status
      : (tracking?.transfer_status || item.transfer_status)) || ''
  ).toUpperCase().trim();

  const rawDeliveryStatus = String(
    (isContractCompleted
      ? tracking?.delivery_status
      : (tracking?.delivery_status || item.delivery_status)) || ''
  ).toUpperCase().trim();

  // 3. Etapa: Pago (fuente: operation_tracking.payment_status)
  // Mantén PAGADO como COMPLETADO
  const isPagoCompleted =
    !isRejected &&
    isContractCompleted &&
    (rawPaymentStatus === 'COMPLETADO' ||
      rawPaymentStatus === 'COMPLETADA' ||
      rawPaymentStatus === 'PAGADO' ||
      rawPaymentStatus === 'PAGADA' ||
      rawPaymentStatus === 'EN_CUSTODIA');

  const isPagoInProgress =
    !isRejected &&
    isContractCompleted &&
    !isPagoCompleted &&
    rawPaymentStatus === 'EN_PROCESO';

  // 4. Etapa: Autorización (fuente: operation_tracking.authorization_status)
  // Reconoce como COMPLETADO: authorization_status = AUTORIZADA
  const isAuthCompleted =
    !isRejected &&
    isContractCompleted &&
    (rawAuthStatus === 'COMPLETADO' ||
      rawAuthStatus === 'COMPLETADA' ||
      rawAuthStatus === 'AUTORIZADO' ||
      rawAuthStatus === 'AUTORIZADA' ||
      rawAuthStatus === 'APROBADO' ||
      rawAuthStatus === 'APROBADA' ||
      rawAuthStatus === 'APPROVED');

  const isAuthInProgress =
    !isRejected &&
    isContractCompleted &&
    !isAuthCompleted &&
    (rawAuthStatus === 'EN_PROCESO' || rawAuthStatus === 'EN_REVISION');

  // 5. Etapa: Transferencia (fuente: operation_tracking.transfer_status)
  // Reconoce como COMPLETADO: transfer_status = COMPLETADA
  const isTransferCompleted =
    !isRejected &&
    isContractCompleted &&
    (rawTransferStatus === 'COMPLETADO' ||
      rawTransferStatus === 'COMPLETADA' ||
      rawTransferStatus === 'TRANSFERIDO' ||
      rawTransferStatus === 'TRANSFERIDA');

  const isTransferInProgress =
    !isRejected &&
    isContractCompleted &&
    !isTransferCompleted &&
    rawTransferStatus === 'EN_PROCESO';

  // 6. Etapa: Entrega (fuente: operation_tracking.delivery_status)
  // Reconoce como COMPLETADO: delivery_status = COMPLETADA
  const isDeliveryCompleted =
    !isRejected &&
    isContractCompleted &&
    (rawDeliveryStatus === 'COMPLETADO' ||
      rawDeliveryStatus === 'COMPLETADA' ||
      rawDeliveryStatus === 'ENTREGADO' ||
      rawDeliveryStatus === 'ENTREGADA' ||
      rawDeliveryStatus === 'DELIVERED');

  const isDeliveryInProgress =
    !isRejected &&
    isContractCompleted &&
    !isDeliveryCompleted &&
    rawDeliveryStatus === 'EN_PROCESO';

  // Construcción de las 6 etapas (estrictamente SIN fechas ni horas)
  const steps = [
    {
      id: 'apartado',
      label: isRejected ? 'Motocicleta Rechazada' : 'Apartado',
      status: isRejected ? 'rejected' : isApartadoCompleted ? 'completed' : 'pending',
      substatus: apartadoSubstatus,
    },
    {
      id: 'contrato',
      label: 'Contrato',
      status: isRejected
        ? 'na'
        : isContractCompleted
        ? 'completed'
        : isContractInProgress
        ? 'in_progress'
        : 'pending',
      substatus: isRejected
        ? 'NA'
        : isContractCompleted
        ? 'Firmado'
        : isContractInProgress
        ? 'En proceso'
        : 'Pendiente',
    },
    {
      id: 'pago',
      label: 'Pago',
      status: isRejected
        ? 'na'
        : isPagoCompleted
        ? 'completed'
        : isPagoInProgress
        ? 'in_progress'
        : 'pending',
      substatus: isRejected
        ? 'NA'
        : isPagoCompleted
        ? (rawPaymentStatus === 'PAGADO' || rawPaymentStatus === 'PAGADA' ? 'Pagado' : 'En custodia')
        : isPagoInProgress
        ? 'En proceso'
        : 'Pendiente',
    },
    {
      id: 'autorizacion',
      label: 'Autorización',
      status: isRejected
        ? 'na'
        : isAuthCompleted
        ? 'completed'
        : isAuthInProgress
        ? 'in_progress'
        : 'pending',
      substatus: isRejected
        ? 'NA'
        : isAuthCompleted
        ? (rawAuthStatus === 'AUTORIZADA' ? 'Autorizada' : rawAuthStatus === 'COMPLETADA' || rawAuthStatus === 'COMPLETADO' ? 'Completada' : 'Autorizado')
        : isAuthInProgress
        ? 'En revisión'
        : 'Pendiente',
    },
    {
      id: 'transferencia',
      label: 'Transferencia',
      status: isRejected
        ? 'na'
        : isTransferCompleted
        ? 'completed'
        : isTransferInProgress
        ? 'in_progress'
        : 'pending',
      substatus: isRejected
        ? 'NA'
        : isTransferCompleted
        ? (rawTransferStatus === 'COMPLETADA' || rawTransferStatus === 'COMPLETADO' ? 'Completada' : 'Transferido')
        : isTransferInProgress
        ? 'En proceso'
        : 'Pendiente',
    },
    {
      id: 'entrega',
      label: 'Entrega',
      status: isRejected
        ? 'na'
        : isDeliveryCompleted
        ? 'completed'
        : isDeliveryInProgress
        ? 'in_progress'
        : 'pending',
      substatus: isRejected
        ? 'NA'
        : isDeliveryCompleted
        ? (rawDeliveryStatus === 'COMPLETADA' || rawDeliveryStatus === 'COMPLETADO' ? 'Completada' : 'Entregada')
        : isDeliveryInProgress
        ? 'En proceso'
        : 'Pendiente',
    },
  ];

  // Determinar la etapa activa actual para filtro y badge
  let activeStageKey = 'apartado';
  let badgeLabel = 'Apartado';
  let badgeColor = 'amber';

  if (isRejected) {
    activeStageKey = 'apartado';
    badgeLabel = 'Motocicleta Rechazada';
    badgeColor = 'red';
  } else if (isDeliveryCompleted) {
    activeStageKey = 'entrega';
    badgeLabel = rawDeliveryStatus === 'COMPLETADA' ? 'Completada' : 'Entregada';
    badgeColor = 'emerald';
  } else if (isDeliveryInProgress) {
    activeStageKey = 'entrega';
    badgeLabel = 'Entrega';
    badgeColor = 'blue';
  } else if (isTransferCompleted) {
    activeStageKey = 'transferencia';
    badgeLabel = rawTransferStatus === 'COMPLETADA' ? 'Completada' : 'Transferido';
    badgeColor = 'emerald';
  } else if (isTransferInProgress) {
    activeStageKey = 'transferencia';
    badgeLabel = 'Transferencia';
    badgeColor = 'blue';
  } else if (isAuthCompleted) {
    activeStageKey = 'autorizacion';
    badgeLabel = rawAuthStatus === 'AUTORIZADA' ? 'Autorizada' : 'Autorizado';
    badgeColor = 'emerald';
  } else if (isAuthInProgress) {
    activeStageKey = 'autorizacion';
    badgeLabel = 'Autorización';
    badgeColor = 'blue';
  } else if (isPagoCompleted) {
    activeStageKey = 'pago';
    badgeLabel = rawPaymentStatus === 'PAGADO' || rawPaymentStatus === 'PAGADA' ? 'Pagado' : 'En custodia';
    badgeColor = 'emerald';
  } else if (isPagoInProgress) {
    activeStageKey = 'pago';
    badgeLabel = 'Pago';
    badgeColor = 'blue';
  } else if (isContractCompleted) {
    activeStageKey = 'contrato';
    badgeLabel = 'Contrato';
    badgeColor = 'emerald';
  } else if (isContractInProgress) {
    activeStageKey = 'contrato';
    badgeLabel = 'Contrato';
    badgeColor = 'blue';
  } else {
    activeStageKey = 'apartado';
    badgeLabel = 'Apartado';
    badgeColor = 'amber';
  }

  // Format buyer initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Seller verification boolean
  const sellerIsVerified = Boolean(
    item.seller_is_verified ||
    item.moto?.seller_identity_verification_status === 'verified' ||
    item.moto?.identity_verification_status === 'verified' ||
    item.moto?.is_verified
  );

  // Normalized certification status (strictly APROBADA, RECHAZADA, or PENDIENTE)
  let certificationDisplay = 'PENDIENTE';
  if (rawCertStatus === 'APROBADA' || rawCertStatus === 'CERTIFICADA') {
    certificationDisplay = 'APROBADA';
  } else if (rawCertStatus === 'RECHAZADA' || rawCertStatus === 'NO_APROBADA') {
    certificationDisplay = 'RECHAZADA';
  }

  // Normalized appointment status
  let appointmentStatusDisplay = 'SIN CITA';
  if ((rawItemStatus === 'EXPIRADO' || rawItemStatus === 'EXPIRADA') && item.certification_appointment_at) {
    appointmentStatusDisplay = 'EXPIRADA';
  } else if ((rawItemStatus === 'CANCELADO' || rawItemStatus === 'CANCELADA') && item.certification_appointment_at) {
    appointmentStatusDisplay = 'CANCELADA';
  } else if (rawAppStatus === 'COMPLETADA') {
    appointmentStatusDisplay = 'COMPLETADA';
  } else if (rawAppStatus === 'PROGRAMADA') {
    appointmentStatusDisplay = 'PROGRAMADA';
  } else if (rawAppStatus === 'EXPIRADA' || rawAppStatus === 'EXPIRADO') {
    appointmentStatusDisplay = 'EXPIRADA';
  } else if (rawAppStatus === 'CANCELADA' || rawAppStatus === 'CANCELADO') {
    appointmentStatusDisplay = 'CANCELADA';
  } else if (rawAppStatus === 'NO_PRESENTADO') {
    appointmentStatusDisplay = 'NO_PRESENTADO';
  } else if (rawAppStatus && rawAppStatus !== 'PENDIENTE' && rawAppStatus !== 'SIN CITA' && rawAppStatus !== 'NULL' && rawAppStatus !== 'UNDEFINED') {
    appointmentStatusDisplay = rawAppStatus;
  }

  const motoObj = Array.isArray(item.moto) ? item.moto[0] : (item.moto || item.raw?.moto || null);
  const motoId = item.moto_id || motoObj?.id || item.raw?.moto_id || null;

  // Resolve image strictly from associated motorcycle: NOD -> operación -> moto_id -> motocicleta asociada -> image
  const directMotoImage = getMotoAssociatedImage(motoObj);
  const operationMotoImage =
    directMotoImage ||
    (typeof item.moto_image === 'string' && item.moto_image.trim() ? item.moto_image.trim() : null) ||
    (typeof item.raw?.moto_image === 'string' && item.raw.moto_image.trim() ? item.raw.moto_image.trim() : null);

  return {
    raw: item,
    id: item.id,
    nod,
    apartado,
    contract,
    tracking,
    moto_id: motoId,
    brand: item.moto_brand || motoObj?.brand || 'Motocicleta',
    model: item.moto_model || motoObj?.model || '',
    year: item.moto_year || motoObj?.year || '',
    price: Number(item.moto_price || motoObj?.price || item.amount || 0),
    image: operationMotoImage || null,
    buyerName: item.buyer_name || item.buyer_email || 'Comprador Motoluv',
    buyerInitials: getInitials(item.buyer_name || item.buyer_email || 'Comprador'),
    sellerIsVerified,
    certificationStatus: certificationDisplay,
    appointmentStatus: appointmentStatusDisplay,
    workshop: item.certification_workshop || '',
    steps,
    activeStageKey,
    badgeLabel,
    badgeColor,
    isRejected,
  };
};

const OperationsTimelineViewer = ({
  items = [],
  mode = 'vendedor', // 'vendedor' | 'comprador'
  onScheduleAppointment,
  onRefresh,
  isRefreshing = false,
}) => {
  const [activeFilter, setActiveFilter] = useState('todas');
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Map of moto_id -> image resolved strictly from the associated motorcycle
  const [associatedMotoImages, setAssociatedMotoImages] = useState({});

  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0) return;

    let isMounted = true;

    // Follow the mandatory flow: NOD -> operación -> moto_id -> motocicleta asociada -> image/images de ESA motocicleta
    items.forEach(async (item) => {
      const motoId = item?.moto_id || (Array.isArray(item?.moto) ? item.moto[0]?.id : item?.moto?.id) || item?.raw?.moto_id;
      if (!motoId) return;

      const motoKey = String(motoId);

      // 1. If motorcycle object already has the image populated directly
      const motoObj = Array.isArray(item?.moto) ? item.moto[0] : (item?.moto || item?.raw?.moto || null);
      const directImg = getMotoAssociatedImage(motoObj) || (typeof item?.moto_image === 'string' && item.moto_image.trim() ? item.moto_image.trim() : null);

      if (directImg) {
        if (!associatedMotoImages[motoKey]) {
          setAssociatedMotoImages((prev) => (prev[motoKey] ? prev : { ...prev, [motoKey]: directImg }));
        }
        return;
      }

      // 2. Fetch the exact motorcycle associated with moto_id using the project's source of truth (motoApi.get)
      try {
        const moto = await motoApi.get(motoKey);
        if (isMounted && moto) {
          const fetchedImg = getMotoAssociatedImage(moto);
          if (fetchedImg) {
            setAssociatedMotoImages((prev) => ({
              ...prev,
              [motoKey]: fetchedImg,
            }));
          }
        }
      } catch (err) {
        console.warn(`[OperationsTimelineViewer] Error fetching moto for ID ${motoKey}:`, err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [items]);

  const isSeller = mode === 'vendedor';

  // 1 NOD = 1 operación = 1 contrato
  // Extra storage for contracts and operation_tracking queried strictly by NOD if not pre-populated
  const [extraContracts, setExtraContracts] = useState({});
  const [extraTracking, setExtraTracking] = useState({});

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !Array.isArray(items) || items.length === 0) return;

    // Collect valid NODs strictly (never use item.id or moto_id)
    const nodsToQuery = [
      ...new Set(
        items
          .map((it) => it?.nod || it?.apartado?.nod || it?.raw?.nod)
          .filter(Boolean)
      ),
    ];

    if (nodsToQuery.length === 0) return;

    let isMounted = true;

    (async () => {
      try {
        const { data: cData } = await supabase
          .from('contracts')
          .select('*')
          .in('nod', nodsToQuery);
        if (isMounted && Array.isArray(cData)) {
          const map = {};
          cData.forEach((c) => {
            if (c.nod) map[c.nod] = c;
          });
          setExtraContracts((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        // Safe fallback
      }

      try {
        const { data: tData } = await supabase
          .from('operation_tracking')
          .select('*')
          .in('nod', nodsToQuery);
        if (isMounted && Array.isArray(tData)) {
          const map = {};
          tData.forEach((t) => {
            if (t.nod) map[t.nod] = t;
          });
          setExtraTracking((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        // Safe fallback
      }
    })();

    // Supabase Realtime subscription to live contract and tracking updates
    let realtimeChannel = null;
    try {
      const channelId = `ops_live_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      realtimeChannel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contracts' },
          (payload) => {
            const row = payload.new || payload.old;
            if (row?.nod && nodsToQuery.includes(row.nod) && isMounted) {
              setExtraContracts((prev) => ({ ...prev, [row.nod]: payload.new }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'operation_tracking' },
          (payload) => {
            const row = payload.new || payload.old;
            if (row?.nod && nodsToQuery.includes(row.nod) && isMounted) {
              setExtraTracking((prev) => ({ ...prev, [row.nod]: payload.new }));
            }
          }
        )
        .subscribe();
    } catch (subErr) {
      console.warn('Realtime subscription error in OperationsTimelineViewer:', subErr);
    }

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch {}
      }
    };
  }, [items]);

  // Process all items with timeline resolver, merging any extra contract or tracking data fetched by NOD
  const processedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const itemNod = item?.nod || item?.apartado?.nod || item?.raw?.nod || null;
        const contract = (itemNod && extraContracts[itemNod])
          ? extraContracts[itemNod]
          : (item?.contract || (Array.isArray(item?.contracts) ? item.contracts[0] : item?.contracts) || null);

        // 4. Prioriza siempre extraTracking[NOD] sobre cualquier tracking antiguo
        const tracking = (itemNod && extraTracking[itemNod])
          ? extraTracking[itemNod]
          : (item?.tracking || item?.operation_tracking || item?.raw?.tracking || item?.raw?.operation_tracking || null);

        const rawContractStatus = String(contract?.contract_status || item?.contract_status || '').toUpperCase().trim();
        const isSigned =
          rawContractStatus === 'FIRMADO' ||
          rawContractStatus === 'COMPLETADO' ||
          rawContractStatus === 'SIGNED';

        // 3. Para contratos firmados, usa operation_tracking como fuente de verdad para Pago, Autorización, Transferencia y Entrega
        const mergedItem = {
          ...item,
          nod: itemNod,
          apartado: item?.apartado || item,
          contract,
          tracking,
          contract_status: contract?.contract_status || item?.contract_status || null,
          payment_status: isSigned
            ? (tracking?.payment_status || null)
            : (tracking?.payment_status || item?.payment_status || null),
          authorization_status: isSigned
            ? (tracking?.authorization_status || tracking?.auth_status || null)
            : (tracking?.authorization_status || tracking?.auth_status || item?.authorization_status || null),
          transfer_status: isSigned
            ? (tracking?.transfer_status || null)
            : (tracking?.transfer_status || item?.transfer_status || null),
          delivery_status: isSigned
            ? (tracking?.delivery_status || null)
            : (tracking?.delivery_status || item?.delivery_status || null),
        };
        return resolveOperationTimeline(mergedItem);
      })
      .filter(Boolean);
  }, [items, extraContracts, extraTracking]);

  // Synchronize operation notifications whenever processedItems updates
  useEffect(() => {
    if (Array.isArray(processedItems) && processedItems.length > 0) {
      notificationApi.syncOperations(processedItems);
    }
  }, [processedItems]);

  // Keep selectedOperation up to date with processedItems when extraTracking/extraContracts updates
  const activeSelectedOperation = useMemo(() => {
    if (!selectedOperation) return null;
    return (
      processedItems.find((p) => p.nod && p.nod === selectedOperation.nod) ||
      processedItems.find((p) => p.id === selectedOperation.id) ||
      selectedOperation
    );
  }, [selectedOperation, processedItems]);

  // Dynamic counts for filter pills (6 stages + todas)
  const counts = useMemo(() => {
    const res = {
      todas: processedItems.length,
      apartado: 0,
      contrato: 0,
      pago: 0,
      autorizacion: 0,
      transferencia: 0,
      entrega: 0,
    };
    processedItems.forEach((op) => {
      if (res[op.activeStageKey] !== undefined) {
        res[op.activeStageKey]++;
      }
    });
    return res;
  }, [processedItems]);

  // Filter items based on active pill
  const filteredItems = useMemo(() => {
    if (activeFilter === 'todas') return processedItems;
    return processedItems.filter((op) => op.activeStageKey === activeFilter);
  }, [processedItems, activeFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const filterTabs = [
    { id: 'todas', label: 'Todas', count: counts.todas },
    { id: 'apartado', label: 'Apartado', count: counts.apartado },
    { id: 'contrato', label: 'Contrato', count: counts.contrato },
    { id: 'pago', label: 'Pago', count: counts.pago },
    { id: 'autorizacion', label: 'Autorización', count: counts.autorizacion },
    { id: 'transferencia', label: 'Transferencia', count: counts.transferencia },
    { id: 'entrega', label: 'Entrega', count: counts.entrega },
  ];

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isSeller ? 'Ventas en proceso' : 'Mis compras'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {isSeller
              ? 'Aquí puedes consultar el avance de todas las operaciones que ya tienen apartado.'
              : 'Aquí puedes consultar el avance de todas tus compras que ya tienen apartado.'}
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-[#141418] hover:bg-[#1c1c22] border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Actualizar estado de operaciones"
            type="button"
          >
            <RotateCw size={13} className={isRefreshing ? 'animate-spin text-red-brand' : ''} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        )}
      </div>

      {/* Filter Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-red-950/40 border border-red-800/40 text-red-400 shadow-sm'
                  : 'bg-[#121216] hover:bg-[#18181f] border border-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                  isActive ? 'bg-red-600/30 text-red-300' : 'bg-white/5 text-zinc-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Operations List */}
      {processedItems.length === 0 ? (
        <div className="p-16 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-3">
          <Clock size={36} className="text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No hay operaciones activas</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {isSeller
              ? 'Cuando un comprador aparte una de tus motocicletas, el visor de línea de tiempo aparecerá aquí.'
              : 'Cuando apartes una motocicleta en el catálogo oficial, podrás seguir el progreso paso a paso aquí.'}
          </p>
          {!isSeller && (
            <Link
              to="/motos"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-brand hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors shadow"
            >
              <Bike size={14} /> Explorar catálogo
            </Link>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 bg-[#101013] border border-white/5 rounded-2xl text-center space-y-2">
          <Info size={28} className="text-zinc-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">Sin operaciones en esta etapa</h3>
          <p className="text-xs text-zinc-400">
            No hay operaciones que coincidan con el filtro seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedItems.map((op) => {
            const rawAppStatus = op.appointmentStatus;
            const rawNodStatus = String(op.raw?.status || '').toUpperCase();
            const isAppCompleted = rawAppStatus === 'COMPLETADA';
            const isAppProgrammed = rawAppStatus === 'PROGRAMADA';
            const isAppCancelled = rawAppStatus === 'CANCELADA';
            const isAppExpired = rawAppStatus === 'EXPIRADA' || rawAppStatus === 'EXPIRADO';
            const isNodCancelled = rawNodStatus === 'CANCELADO' || rawNodStatus === 'CANCELADA';
            const isNodExpired = rawNodStatus === 'EXPIRADO' || rawNodStatus === 'EXPIRADA';
            const isAppNoShow = rawAppStatus === 'NO_PRESENTADO';
            const isDimmed = isAppCancelled || isAppExpired || isNodCancelled || isNodExpired || op.isRejected;

            return (
              <div
                key={op.id}
                className={`p-5 sm:p-6 bg-[#101013] border border-white/5 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 transition-all ${
                  isDimmed
                    ? 'opacity-70 saturate-[0.70] hover:opacity-90 hover:saturate-100'
                    : 'opacity-100 hover:border-white/10'
                }`}
              >
                {/* 1. LEFT COLUMN: Vehicle Thumbnail, Title, NOD, Price & Counterparty Info */}
                <div className="flex items-center gap-4 min-w-[280px] sm:min-w-[320px]">
                  {/* Motorcycle Image */}
                  <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-xl bg-black/50 border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                    {(() => {
                      const motoKey = op.moto_id ? String(op.moto_id) : null;
                      const resolvedImg = (motoKey && associatedMotoImages[motoKey]) || op.image;
                      return resolvedImg ? (
                        <img
                          src={resolveSafeImageUrl(resolvedImg, 'moto')}
                          alt={op.model || 'Motocicleta'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement?.querySelector('.fallback-placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null;
                    })()}
                    <div
                      className="fallback-placeholder w-full h-full items-center justify-center text-zinc-600 bg-zinc-900/50"
                      style={{
                        display: (op.moto_id && associatedMotoImages[String(op.moto_id)]) || op.image ? 'none' : 'flex',
                      }}
                    >
                      <Bike size={24} className="opacity-40" />
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate leading-snug">
                      {op.brand} {op.model} {op.year}
                    </h3>
                    <div className="text-xs font-mono text-zinc-400">
                      NOD: <span className="text-zinc-200 font-semibold">{op.nod}</span>
                    </div>
                    {/* Financial state / price - hidden for buyer when rejected */}
                    {(!op.isRejected || isSeller) && (
                      <div className="text-sm sm:text-base font-bold text-white">
                        ${op.price.toLocaleString('es-MX')} MXN
                      </div>
                    )}

                    {/* Counterparty identification depending on role */}
                    {isSeller ? (
                      /* Vendedor sees Buyer's name & initials */
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-6 h-6 rounded-full bg-[#1e1e24] border border-white/10 text-zinc-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {op.buyerInitials}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-zinc-500 block leading-tight">
                            Comprador
                          </span>
                          <span className="text-xs font-medium text-zinc-200 block leading-tight truncate">
                            {op.buyerName}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Comprador NEVER sees seller name/avatar, and if rejected, NO seller verification info at all */
                      !op.isRejected && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <ShieldCheck
                            size={14}
                            className={op.sellerIsVerified ? 'text-emerald-400' : 'text-zinc-500'}
                          />
                          <span
                            className={`text-xs font-semibold ${
                              op.sellerIsVerified ? 'text-emerald-400' : 'text-zinc-400'
                            }`}
                          >
                            {op.sellerIsVerified ? 'Vendedor verificado' : 'Vendedor no verificado'}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 2. CENTER COLUMN: Timeline */}
                <div className="flex-1 w-full py-2 px-1 sm:px-4">
                  <div className="relative flex items-center justify-between">
                    {/* Connecting background track lines - Red if rejected */}
                    <div className="absolute top-3.5 left-6 right-6 h-[2px] -translate-y-1/2 flex">
                      {op.steps.slice(0, -1).map((st, idx) => {
                        const isLineRed = op.isRejected;
                        const isLineGreen = st.status === 'completed' && !op.isRejected;
                        return (
                          <div
                            key={idx}
                            className={`flex-1 h-full transition-colors ${
                              isLineRed
                                ? 'bg-red-500'
                                : isLineGreen
                                ? 'bg-emerald-500'
                                : 'bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Step Nodes */}
                    {op.steps.map((st, index) => {
                      const isRejectedStep = st.status === 'rejected';
                      const isCompleted = st.status === 'completed' && !isRejectedStep;
                      const isInProgress = st.status === 'in_progress' && !isRejectedStep;
                      const isNa = st.status === 'na' || (op.isRejected && index > 0);

                      const StageIcon = TIMELINE_STAGES[index]?.icon || Check;

                      return (
                        <div
                          key={st.id}
                          className="relative z-10 flex flex-col items-center text-center flex-1"
                        >
                          {/* Step Circle */}
                          {isRejectedStep ? (
                            <div className="w-7 h-7 rounded-full bg-red-600 border border-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/30 ring-4 ring-red-500/20">
                              <X size={13} strokeWidth={3} />
                            </div>
                          ) : isCompleted ? (
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                              <Check size={14} strokeWidth={3} />
                            </div>
                          ) : isInProgress ? (
                            <div className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-500/15">
                              <StageIcon size={12} strokeWidth={2.5} />
                            </div>
                          ) : isNa ? (
                            op.isRejected ? (
                              <div className="w-7 h-7 rounded-full bg-red-600 border border-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/25">
                                <X size={13} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#18181d] border border-white/10 flex items-center justify-center text-zinc-500">
                                <span className="text-[10px] font-bold text-zinc-500">NA</span>
                              </div>
                            )
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#18181d] border border-white/15 flex items-center justify-center text-zinc-500">
                              <StageIcon size={12} strokeWidth={2} />
                            </div>
                          )}

                          {/* Step Label & Substatus (No Dates) */}
                          <div className="mt-2 space-y-0.5 min-h-[32px]">
                            <span
                              className={`text-xs block font-semibold leading-tight ${
                                isRejectedStep
                                  ? 'text-red-400 font-bold'
                                  : op.isRejected
                                  ? 'text-zinc-300'
                                  : isCompleted || isInProgress
                                  ? 'text-white'
                                  : isNa
                                  ? 'text-zinc-500'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {st.label}
                            </span>
                            <span
                              className={`text-[10px] block font-medium leading-tight ${
                                isRejectedStep
                                  ? 'text-red-400 font-semibold'
                                  : op.isRejected
                                  ? 'text-white font-semibold'
                                  : isCompleted
                                  ? 'text-zinc-400'
                                  : isInProgress
                                  ? 'text-blue-400 font-semibold'
                                  : isNa
                                  ? 'text-zinc-500 font-semibold'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {st.substatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. RIGHT COLUMN: Actions, Inspection and Status (NO DATES OR HOURS) */}
                <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-3 pt-3 xl:pt-0 border-t xl:border-t-0 border-white/5 min-w-[190px]">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        op.isRejected || op.badgeColor === 'red'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : op.badgeColor === 'emerald'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : op.badgeColor === 'blue'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {op.isRejected ? 'Motocicleta Rechazada' : op.badgeLabel}
                    </span>
                  </div>

                  {/* Operational Information & Buttons */}
                  {isSeller ? (
                    /* Seller Appointment Management */
                    <div className="flex flex-col items-end gap-1.5">
                      {op.isRejected ? (
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
                            <X size={13} className="text-red-400" /> Peritaje No Favorable
                          </span>
                          <span className="text-[10px] text-zinc-500 block">
                            Certificación rechazada
                          </span>
                        </div>
                      ) : isAppCompleted ? (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check size={13} /> Inspección completada
                        </span>
                      ) : isAppProgrammed ? (
                        <div className="text-right">
                          <span className="text-[11px] text-blue-400 font-semibold block">
                            Cita programada
                          </span>
                          {op.workshop && (
                            <span className="text-[10px] text-zinc-400 block truncate max-w-[170px]" title={op.workshop}>
                              {op.workshop}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500 block">
                            Cita confirmada (no editable)
                          </span>
                        </div>
                      ) : isAppExpired ? (
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[11px] text-red-400 font-semibold block">
                            CITA EXPIRADA
                          </span>
                          {op.workshop && (
                            <span className="text-[10px] text-zinc-400 block truncate max-w-[170px]" title={op.workshop}>
                              {op.workshop}
                            </span>
                          )}
                          {!isNodExpired && !isNodCancelled && (
                            <button
                              type="button"
                              onClick={() => onScheduleAppointment?.(op.raw)}
                              className="px-3 py-1.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
                            >
                              <CalendarClock size={13} /> Reagendar cita
                            </button>
                          )}
                        </div>
                      ) : isAppCancelled || isAppNoShow ? (
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[11px] text-red-400 font-semibold block">
                            {isAppCancelled ? 'CITA CANCELADA' : 'NO PRESENTADO'}
                          </span>
                          {!isNodExpired && !isNodCancelled && (
                            <button
                              type="button"
                              onClick={() => onScheduleAppointment?.(op.raw)}
                              className="px-3 py-1.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
                            >
                              <CalendarClock size={13} /> Reagendar cita
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[10px] text-zinc-400 font-medium">SIN CITA</span>
                          {!isNodExpired && !isNodCancelled && (
                            <button
                              type="button"
                              onClick={() => onScheduleAppointment?.(op.raw)}
                              className="px-3 py-1.5 bg-red-brand hover:bg-red-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer"
                            >
                              <CalendarClock size={13} /> Agendar inspección
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Buyer Certification Summary (NO workshop, NO appointment) */
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Dictamen de Certificación</span>
                      <span
                        className={`text-xs font-bold uppercase ${
                          op.certificationStatus === 'APROBADA'
                            ? 'text-emerald-400'
                            : op.certificationStatus === 'RECHAZADA'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {op.certificationStatus === 'RECHAZADA' ? 'Motocicleta Rechazada' : op.certificationStatus}
                      </span>
                    </div>
                  )}

                  {/* Detail Modal Trigger */}
                  <button
                    onClick={() => setSelectedOperation(op)}
                    className="px-3.5 py-1.5 bg-[#17171c] hover:bg-[#22222a] text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <span>Ver detalle</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note & Pagination Footer */}
      {processedItems.length > 0 && (
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-zinc-500 flex-shrink-0" />
            <span>
              Los tiempos pueden variar dependiendo de la disponibilidad de las partes y los procesos de peritaje.
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-zinc-400">
              Mostrando {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} operaciones
            </span>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg bg-[#141418] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {currentPage}
              </div>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg bg-[#141418] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DETAIL MODAL (NO DATES OR HOURS) ================= */}
      {activeSelectedOperation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121216] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-6 text-left relative shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-black/60 border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                  {(() => {
                    const modalMotoKey = activeSelectedOperation.moto_id ? String(activeSelectedOperation.moto_id) : null;
                    const modalImg = (modalMotoKey && associatedMotoImages[modalMotoKey]) || activeSelectedOperation.image;
                    return modalImg ? (
                      <img
                        src={resolveSafeImageUrl(modalImg, 'moto')}
                        alt={activeSelectedOperation.model}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Bike size={20} className="text-zinc-600 opacity-40" />
                    );
                  })()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {activeSelectedOperation.brand} {activeSelectedOperation.model} {activeSelectedOperation.year}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    NOD de Operación: <span className="text-white font-semibold">{activeSelectedOperation.nod}</span>
                  </p>
                  {(!activeSelectedOperation.isRejected || isSeller) && (
                    <p className="text-sm font-bold text-red-brand mt-0.5">
                      ${activeSelectedOperation.price.toLocaleString('es-MX')} MXN
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedOperation(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary Progress bar inside modal */}
            <div className="p-4 bg-[#18181f] border border-white/5 rounded-xl space-y-3">
              <span className="text-xs font-bold text-zinc-300 block">Etapas de la Operación</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                {activeSelectedOperation.steps.map((st) => (
                  <div key={st.id} className="space-y-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        activeSelectedOperation.isRejected || st.status === 'rejected'
                          ? 'bg-red-500'
                          : st.status === 'completed'
                          ? 'bg-emerald-500'
                          : st.status === 'in_progress'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-white/10'
                      }`}
                    />
                    <span className={`font-semibold block truncate ${
                      activeSelectedOperation.isRejected || st.status === 'rejected'
                        ? 'text-red-400 font-bold'
                        : 'text-zinc-300'
                    }`}>
                      {st.label}
                    </span>
                    <span
                      className={`text-[10px] block truncate ${
                        st.status === 'rejected'
                          ? 'text-red-400 font-semibold'
                          : activeSelectedOperation.isRejected
                          ? 'text-red-400 font-semibold'
                          : st.status === 'completed'
                          ? 'text-emerald-400'
                          : st.status === 'in_progress'
                          ? 'text-blue-400 font-semibold'
                          : 'text-zinc-500'
                      }`}
                    >
                      {st.substatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Key-Values (STRICTLY NO DATES OR HOURS) */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">NOD:</span>
                <span className="text-zinc-200 font-mono font-semibold">{activeSelectedOperation.nod}</span>
              </div>

              {/* Counterparty details - hidden for buyer if rejected */}
              {(!activeSelectedOperation.isRejected || isSeller) && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">{isSeller ? 'Comprador' : 'Vendedor'}:</span>
                  <span className="text-zinc-200 font-medium">
                    {isSeller ? (
                      activeSelectedOperation.buyerName
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck
                          size={13}
                          className={activeSelectedOperation.sellerIsVerified ? 'text-emerald-400' : 'text-zinc-400'}
                        />
                        <span className={activeSelectedOperation.sellerIsVerified ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                          {activeSelectedOperation.sellerIsVerified ? 'Vendedor verificado' : 'Vendedor no verificado'}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Certification status */}
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Dictamen de Certificación:</span>
                <span
                  className={`font-bold uppercase ${
                    activeSelectedOperation.isRejected
                      ? 'text-red-400'
                      : activeSelectedOperation.certificationStatus === 'APROBADA'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {activeSelectedOperation.isRejected
                    ? 'Motocicleta Rechazada'
                    : activeSelectedOperation.certificationStatus}
                </span>
              </div>

              {/* Seller-only inspection details (NO dates/hours) */}
              {isSeller && !activeSelectedOperation.isRejected && activeSelectedOperation.workshop && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">Taller Oficial Asignado:</span>
                  <span className="text-zinc-200 font-medium">
                    {activeSelectedOperation.workshop}
                  </span>
                </div>
              )}

              {isSeller && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-zinc-400">Estado de Cita Técnica:</span>
                  <span
                    className={`font-semibold ${
                      activeSelectedOperation.isRejected
                        ? 'text-red-400'
                        : activeSelectedOperation.appointmentStatus === 'COMPLETADA'
                        ? 'text-emerald-400'
                        : activeSelectedOperation.appointmentStatus === 'PROGRAMADA'
                        ? 'text-blue-400'
                        : activeSelectedOperation.appointmentStatus === 'CANCELADA' || activeSelectedOperation.appointmentStatus === 'EXPIRADA' || activeSelectedOperation.appointmentStatus === 'EXPIRADO'
                        ? 'text-red-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    {activeSelectedOperation.isRejected
                      ? 'PERITAJE RECHAZADO'
                      : activeSelectedOperation.appointmentStatus === 'COMPLETADA'
                      ? 'COMPLETADA'
                      : activeSelectedOperation.appointmentStatus === 'PROGRAMADA'
                      ? 'PROGRAMADA'
                      : activeSelectedOperation.appointmentStatus === 'EXPIRADA' || activeSelectedOperation.appointmentStatus === 'EXPIRADO'
                      ? 'CITA EXPIRADA'
                      : activeSelectedOperation.appointmentStatus === 'CANCELADA' || activeSelectedOperation.appointmentStatus === 'CANCELADO'
                      ? 'CITA CANCELADA'
                      : activeSelectedOperation.appointmentStatus || 'SIN CITA'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions & WhatsApp Support 5643048865 */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/525643048865"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle size={15} />
                <span>Contactar Asesor Motoluv</span>
              </a>

              {activeSelectedOperation.moto_id && (
                <Link
                  to={`/motos/${activeSelectedOperation.moto_id}`}
                  onClick={(e) => handleMotoLinkClick(e, activeSelectedOperation.moto_id)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <Eye size={14} />
                  <span>Ver Moto</span>
                </Link>
              )}

              <button
                onClick={() => setSelectedOperation(null)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTimelineViewer;
