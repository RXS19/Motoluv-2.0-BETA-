/**
 * Utility to generate and deliver standard RFC 5545 .ics calendar files
 * for Motoluv inspection and certification appointments.
 *
 * Fully compliant with RFC 5545:
 * - Compatible with Apple Calendar (iOS / iPadOS / macOS), Google Calendar, Outlook, and Android.
 * - Proper line folding (max 75 octets per line, folded with CRLF + space).
 * - Proper character escaping (\, ;, ,, and literal newlines as \n).
 * - Stable, unique UID derived from existing appointment / apartado identifier (never replacing NOD).
 * - NOD strictly retained and highlighted in SUMMARY and DESCRIPTION.
 * - Robust cross-platform delivery (Data URL / Blob fallback for desktop, iOS Safari, macOS, Android).
 */

/**
 * Escapes characters according to RFC 5545 section 3.3.11:
 * Backslash (\), semicolon (;), comma (,), and newline (\n) must be escaped.
 */
export function escapeIcsText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Applies RFC 5545 line folding (section 3.1):
 * Lines of text SHOULD NOT be longer than 75 octets, excluding the line break.
 * Long lines are split and continued on the next line prefixed with a single space.
 */
export function foldIcsLine(line) {
  if (!line) return '';

  const maxBytes = 74; // safe limit below 75
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= maxBytes) {
    return line;
  }

  const chunks = [];
  let currentStart = 0;

  while (currentStart < line.length) {
    let currentEnd = currentStart;
    let currentByteLen = 0;
    const allowedLimit = chunks.length === 0 ? maxBytes : maxBytes - 1; // account for leading space on continuation

    while (currentEnd < line.length) {
      const codePoint = line.codePointAt(currentEnd);
      // Determine byte length of this code point in UTF-8
      const charBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
      const charLength = codePoint > 0xffff ? 2 : 1;

      if (currentByteLen + charBytes > allowedLimit) {
        break;
      }
      currentByteLen += charBytes;
      currentEnd += charLength;
    }

    // Safety fallback: ensure at least one character progresses
    if (currentEnd === currentStart) {
      const codePoint = line.codePointAt(currentStart);
      currentEnd += codePoint > 0xffff ? 2 : 1;
    }

    const chunk = line.slice(currentStart, currentEnd);
    chunks.push(chunk);
    currentStart = currentEnd;
  }

  return chunks.join('\r\n ');
}

/**
 * Formats a Date or date string into YYYYMMDD for VALUE=DATE.
 */
export function formatIcsDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Formats a Date object into UTC iCalendar format: YYYYMMDDTHHMMSSZ
 */
export function formatIcsDateTimeUtc(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const hh = String(dateObj.getUTCHours()).padStart(2, '0');
  const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Builds the RFC 5545 compliant VCALENDAR string.
 */
export function buildInspectionIcsContent({
  nod,
  apartadoId,
  brand = 'Motocicleta',
  model = '',
  year = '',
  workshopName = 'Taller Certificado Motoluv',
  workshopAddress = '',
  dateStr,
  timeStr,
  createdAt,
}) {
  if (!nod || typeof nod !== 'string' || !nod.trim()) {
    console.error('buildInspectionIcsContent: El folio NOD es obligatorio.');
    throw new Error('No se puede generar el evento de calendario sin un folio NOD válido.');
  }

  if (!dateStr) {
    console.error('buildInspectionIcsContent: dateStr es requerido');
    throw new Error('Fecha no especificada para la cita.');
  }

  // Parse dateStr (expected format: 'YYYY-MM-DD')
  let yearNum, monthNum, dayNum;
  if (typeof dateStr === 'string') {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      yearNum = parseInt(match[1], 10);
      monthNum = parseInt(match[2], 10);
      dayNum = parseInt(match[3], 10);
    }
  }

  if (!yearNum || !monthNum || !dayNum) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      console.error('buildInspectionIcsContent: invalid dateStr', dateStr);
      throw new Error('Formato de fecha inválido.');
    }
    yearNum = d.getFullYear();
    monthNum = d.getMonth() + 1;
    dayNum = d.getDate();
  }

  const cleanNod = nod.trim();
  const vehicleName = `${brand} ${model}`.trim() || 'Motocicleta';

  // SUMMARY & DESCRIPTION strictly incorporate the real NOD
  const rawSummary = `Inspección Motoluv [${cleanNod}] — ${vehicleName}`.trim();

  const descriptionLines = [
    `Folio NOD: ${cleanNod}`,
    `Vehículo: ${vehicleName}`,
    year ? `Año: ${year}` : null,
    `Taller: ${workshopName}`,
    workshopAddress ? `Dirección: ${workshopAddress}` : null,
    `Horario de atención: 9:00 AM a 6:00 PM`,
    `Proceso de inspección y certificación técnica Motoluv.`,
  ].filter(Boolean);

  const rawDescription = descriptionLines.join('\n');
  const rawLocation = [workshopName, workshopAddress].filter(Boolean).join(', ') || 'Taller Certificado Motoluv';

  // Stable, unique technical UID derived from existing apartado/appointment identifier + domain
  const rawIdSource = apartadoId || cleanNod;
  const sanitizedId = String(rawIdSource).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const uid = `motoluv-inspection-${sanitizedId}@motoluv.com`;

  // DTSTAMP (creation timestamp in UTC)
  const dtStampDate = createdAt ? new Date(createdAt) : new Date();
  const dtStampStr = formatIcsDateTimeUtc(isNaN(dtStampDate.getTime()) ? new Date() : dtStampDate);

  // Time handling: if time is available, use date-time format; otherwise full-day RFC 5545 format
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Motoluv Technologies//Inspeccion Certificacion v1.0//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStampStr}`,
  ];

  if (timeStr && typeof timeStr === 'string' && timeStr.match(/^\d{1,2}:\d{2}/)) {
    const [hStr, mStr] = timeStr.split(':');
    const startObj = new Date(yearNum, monthNum - 1, dayNum, parseInt(hStr, 10), parseInt(mStr, 10), 0);
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // 1 hour duration
    lines.push(`DTSTART:${formatIcsDateTimeUtc(startObj)}`);
    lines.push(`DTEND:${formatIcsDateTimeUtc(endObj)}`);
  } else {
    // Standard RFC 5545 all-day event: DTSTART inclusive, DTEND exclusive (next day)
    const startObj = new Date(yearNum, monthNum - 1, dayNum);
    const endObj = new Date(yearNum, monthNum - 1, dayNum);
    endObj.setDate(endObj.getDate() + 1);

    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startObj)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endObj)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(rawSummary)}`);
  lines.push(`DESCRIPTION:${escapeIcsText(rawDescription)}`);
  lines.push(`LOCATION:${escapeIcsText(rawLocation)}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Apply line folding to every line and join with CRLF
  const foldedContent = lines.map(foldIcsLine).join('\r\n') + '\r\n';
  return foldedContent;
}

/**
 * Universal delivery mechanism for .ics calendar files:
 * Supports iOS Safari, iPadOS, macOS Calendar, Windows Outlook, Android Google Calendar, and desktop browsers.
 */
export function deliverIcsFile(icsContent, filename = 'Motoluv-Inspeccion.ics') {
  if (typeof window === 'undefined') return;

  const mimeType = 'text/calendar;charset=utf-8';
  const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // For iOS/iPadOS Safari, data URIs with text/calendar allow direct prompts to add to Apple Calendar
  if (isIOS) {
    try {
      const base64Content = btoa(unescape(encodeURIComponent(icsContent)));
      const dataUri = `data:${mimeType};base64,${base64Content}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.setAttribute('download', cleanFilename);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);
      return;
    } catch {
      // fallback to standard blob below
    }
  }

  // Standard Blob & Object URL delivery for modern desktop and mobile browsers
  try {
    const blob = new Blob([icsContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  } catch (err) {
    console.error('Error delivering .ics file:', err);
    throw err;
  }
}

/**
 * Main export: generates RFC 5545 compliant .ics string and triggers universal download/import.
 */
export function generateAndDownloadInspectionIcs({
  nod,
  apartadoId,
  brand = 'Motocicleta',
  model = '',
  year = '',
  workshopName = 'Taller Certificado Motoluv',
  workshopAddress = '',
  dateStr,
  timeStr,
  createdAt,
}) {
  const icsContent = buildInspectionIcsContent({
    nod,
    apartadoId,
    brand,
    model,
    year,
    workshopName,
    workshopAddress,
    dateStr,
    timeStr,
    createdAt,
  });

  const sanitizedNod = String(nod).trim().replace(/[/\\?%*:|"<>]/g, '-');
  const filename = `Motoluv-${sanitizedNod}-Inspeccion.ics`;

  deliverIcsFile(icsContent, filename);
  return icsContent;
}
