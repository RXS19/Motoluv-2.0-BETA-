import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Clock } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/**
 * Formats a YYYY-MM-DD string into a friendly localized Spanish date
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Seleccionar fecha';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = daysOfWeek[d.getDay()];
  const monthName = MONTH_NAMES[month];
  return `${dayName}, ${day} de ${monthName} de ${year}`;
}

export default function ScheduleDropdownDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  createdAt,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial view year and month from selected value, or minDate, or today
  const initialDateStr = value || minDate;
  const initialMatch = initialDateStr?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [viewYear, setViewYear] = useState(() => {
    return initialMatch ? parseInt(initialMatch[1], 10) : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    return initialMatch ? parseInt(initialMatch[2], 10) - 1 : new Date().getMonth();
  });

  // Keep view in sync when value or minDate changes
  useEffect(() => {
    const targetStr = value || minDate;
    const match = targetStr?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      setViewYear(parseInt(match[1], 10));
      setViewMonth(parseInt(match[2], 10) - 1);
    }
  }, [value, minDate]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate calendar grid for current viewMonth & viewYear
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Shift Monday to index 0 (Sunday becomes 6)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Build array of valid quick options within [minDate, maxDate]
  const quickDays = [];
  if (minDate && maxDate) {
    const minMatch = minDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const maxMatch = maxDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (minMatch && maxMatch) {
      const start = new Date(parseInt(minMatch[1], 10), parseInt(minMatch[2], 10) - 1, parseInt(minMatch[3], 10));
      const end = new Date(parseInt(maxMatch[1], 10), parseInt(maxMatch[2], 10) - 1, parseInt(maxMatch[3], 10));

      let curr = new Date(start);
      let dayIndex = 0;
      while (curr <= end && dayIndex <= 5) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const dayLabel = dayIndex === 0 ? 'Día 0 (Apartado)' : dayIndex === 3 ? 'Día 3 (Límite)' : `Día ${dayIndex}`;
        quickDays.push({
          dateStr,
          dayIndex,
          label: dayLabel,
          displayShort: `${curr.getDate()} ${MONTH_NAMES[curr.getMonth()].slice(0, 3)}`,
        });
        curr.setDate(curr.getDate() + 1);
        dayIndex++;
      }
    }
  }

  // Get active day badge label if selected value is in quickDays
  const activeQuick = quickDays.find((q) => q.dateStr === value);

  return (
    <div className="relative" ref={containerRef}>
      {/* Hidden input for form validation */}
      <input
        type="text"
        className="sr-only"
        value={value || ''}
        required
        readOnly
        tabIndex={-1}
      />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-[#0a0a0c] border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
          isOpen
            ? 'border-red-brand ring-1 ring-red-brand/40 shadow-lg shadow-red-brand/10'
            : 'border-white/15 hover:border-white/30'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-lg bg-red-brand/10 border border-red-brand/20 flex items-center justify-center flex-shrink-0 text-red-brand">
            <CalendarIcon size={16} />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold block truncate">
                {value ? formatDisplayDate(value) : 'Selecciona una fecha'}
              </span>
              {activeQuick && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-brand/20 text-red-400 border border-red-brand/30">
                  {activeQuick.label}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 block truncate">
              {value ? 'Horario continuo: 9:00 AM a 6:00 PM' : 'Haz clic para desplegar el calendario'}
            </span>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-brand' : ''
          }`}
        />
      </button>

      {/* Dropdown Calendar Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full sm:w-[360px] bg-[#121216] border border-white/15 rounded-2xl shadow-2xl p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Selection Pills within authorized window */}
          {quickDays.length > 0 && (
            <div className="mb-3.5 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                <span className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock size={12} className="text-red-brand" />
                  <span>Días autorizados (+3 días)</span>
                </span>
                <span className="text-[10px] text-zinc-500">Ventana oficial</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {quickDays.map((qd) => {
                  const isSelected = value === qd.dateStr;
                  return (
                    <button
                      key={qd.dateStr}
                      type="button"
                      onClick={() => {
                        onChange(qd.dateStr);
                        setIsOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center transition-all cursor-pointer border text-xs flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-red-brand text-white border-red-brand shadow-md font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">
                        {qd.dayIndex === 0 ? 'Día 0' : qd.dayIndex === 3 ? 'Día 3' : `Día ${qd.dayIndex}`}
                      </span>
                      <span className="font-semibold text-xs mt-0.5">{qd.displayShort}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Mes anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Mes siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((day) => (
              <span key={day} className="text-[11px] font-bold text-zinc-500 py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading days */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(dayNumber).padStart(2, '0');
              const dateIsoStr = `${viewYear}-${mStr}-${dStr}`;

              const isAllowed = (!minDate || dateIsoStr >= minDate) && (!maxDate || dateIsoStr <= maxDate);
              const isSelected = value === dateIsoStr;
              const isApartadoDay = minDate && dateIsoStr === minDate;
              const isLimitDay = maxDate && dateIsoStr === maxDate;

              return (
                <button
                  key={dayNumber}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => {
                    if (isAllowed) {
                      onChange(dateIsoStr);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-8 rounded-lg text-xs font-medium relative flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-red-brand text-white font-bold shadow-md shadow-red-brand/30 ring-2 ring-red-brand/50'
                      : isAllowed
                      ? 'text-zinc-200 bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer'
                      : 'text-zinc-600 opacity-25 cursor-not-allowed'
                  }`}
                  title={
                    isApartadoDay
                      ? 'Día 0: Fecha del apartado'
                      : isLimitDay
                      ? 'Día 3: Fecha límite de inspección'
                      : isAllowed
                      ? 'Fecha disponible'
                      : 'Fecha fuera de la ventana permitida (3 días)'
                  }
                >
                  <span>{dayNumber}</span>
                  {/* Subtle marker for valid window boundaries */}
                  {isAllowed && !isSelected && isApartadoDay && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                  {isAllowed && !isSelected && isLimitDay && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Día 0: Apartado</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              <span>Día 3: Límite</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-300 hover:text-white font-semibold underline underline-offset-2 ml-1 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
