import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Shield, ChevronRight, RefreshCw, GripHorizontal } from 'lucide-react';
import { chatApi } from '../services/api';
import { OFFICIAL_LU_AVATAR, handleImageError } from '../utils/imageFallback';

const LuChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isWavingAnimation, setIsWavingAnimation] = useState(false);
  
  // Floating & Draggable State
  const [position, setPosition] = useState(null); // { x, y }
  const isDraggingRef = useRef(false);
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initial greeting logic
  useEffect(() => {
    const greeted = sessionStorage.getItem('motoluv_lu_greeted');
    if (!greeted) {
      setMessages([
        {
          id: 'welcome_1',
          sender: 'lu',
          text: '¡Hola! Soy Lu, tu asistente oficial de Motoluv. ¿En qué puedo ayudarte hoy?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setHasGreeted(true);
      setMessages([
        {
          id: 'welcome_prev',
          sender: 'lu',
          text: '¡Hola de nuevo! 🏍️ ¿Tienes alguna duda sobre nuestras motos, tienda o la red de aliados?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  // Global Mouse & Touch listeners for smooth dragging
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDraggingRef.current) return;
      
      if (e.touches && e.cancelable) {
        e.preventDefault();
      }

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = Math.abs(clientX - (dragStartOffsetRef.current.initialClientX || clientX));
      const deltaY = Math.abs(clientY - (dragStartOffsetRef.current.initialClientY || clientY));
      
      if (deltaX > 4 || deltaY > 4) {
        dragMovedRef.current = true;
      }

      let newX = clientX - dragStartOffsetRef.current.x;
      let newY = clientY - dragStartOffsetRef.current.y;

      const width = containerRef.current ? containerRef.current.offsetWidth : 60;
      const height = containerRef.current ? containerRef.current.offsetHeight : 60;

      // Bound within viewport with safe margins
      newX = Math.max(10, Math.min(window.innerWidth - width - 10, newX));
      newY = Math.max(10, Math.min(window.innerHeight - height - 10, newY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev || !containerRef.current) return prev;
        const width = containerRef.current.offsetWidth || 60;
        const height = containerRef.current.offsetHeight || 60;
        return {
          x: Math.max(10, Math.min(window.innerWidth - width - 10, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - height - 10, prev.y)),
        };
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Clamp position when opening chat so the full chatbox fits within viewport
  useEffect(() => {
    if (isOpen && position) {
      const chatWidth = window.innerWidth < 640 ? Math.min(window.innerWidth - 20, 360) : 400;
      const chatHeight = 520;
      const clampedX = Math.max(10, Math.min(window.innerWidth - chatWidth - 10, position.x));
      const clampedY = Math.max(10, Math.min(window.innerHeight - chatHeight - 10, position.y));
      if (clampedX !== position.x || clampedY !== position.y) {
        setPosition({ x: clampedX, y: clampedY });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isWavingAnimation]);

  const handleStartDrag = (e) => {
    if (isOpen) {
      // In open chatbox, ignore clicks on buttons, inputs or form controls
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('form')) {
        return;
      }
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      dragStartOffsetRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        initialClientX: clientX,
        initialClientY: clientY,
      };
      isDraggingRef.current = true;
      dragMovedRef.current = false;
    }
  };

  const toggleChat = (e) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }

    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && !hasGreeted) {
      setIsWavingAnimation(true);
      sessionStorage.setItem('motoluv_lu_greeted', 'true');
      setHasGreeted(true);
      setTimeout(() => {
        setIsWavingAnimation(false);
      }, 3500);
    }
  };

  const generateClientFallbackReply = (query) => {
    const lower = (query || '').toLowerCase();
    
    // Security check: Block attempts to retrieve confidential user data
    if (
      lower.includes('clabe') ||
      lower.includes('contraseña') ||
      lower.includes('password') ||
      lower.includes('jwt') ||
      lower.includes('token') ||
      lower.includes('cuenta bancaria') ||
      lower.includes('tarjeta') ||
      lower.includes('cvv') ||
      lower.includes('secret')
    ) {
      return 'Por nuestro Aviso de Privacidad y estricta seguridad, jamás puedo solicitar ni compartir información confidencial como números CLABE, contraseñas o datos de pago. 🔒 Si necesitas asistencia con tu cuenta, escribe a contacto@motoluv.mx';
    }

    if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas') || lower.includes('que tal') || lower.includes('saludos')) {
      return '¡Hola! 🐾 Soy Lu, el asistente oficial de Motoluv. ¿En qué te puedo asesorar hoy? Puedo ayudarte a explorar motocicletas verificadas, conocer los paquetes de inspección, equiparte en la tienda oficial o registrarte en nuestra red de aliados. 🏍️';
    }
    if (lower.includes('moto') || lower.includes('comprar') || lower.includes('catalogo') || lower.includes('catálogo') || lower.includes('inventario') || lower.includes('vender')) {
      return 'En Motoluv contamos con un inventario verificado con Inspección Técnica y certificación mecánica completa 🏁.\n\n• Puedes explorar todas las marcas y modelos disponibles en el catálogo de motocicletas.\n• Si quieres vender, activa tu perfil de vendedor y publica tu moto con fotos y especificaciones.';
    }
    if (lower.includes('tienda') || lower.includes('casco') || lower.includes('accesorio') || lower.includes('chaqueta') || lower.includes('guantes') || lower.includes('intercom')) {
      return '¡Claro! En nuestra Tienda Oficial de equipamiento encontrarás cascos de marcas líderes, chaquetas con armadura de protección, guantes tácticos y accesorios con envío a todo México 🛡️.';
    }
    if (lower.includes('red') || lower.includes('sumate') || lower.includes('súmate') || lower.includes('socio') || lower.includes('taller') || lower.includes('agencia') || lower.includes('financiera') || lower.includes('evento')) {
      return '¡Únete a nuestra Red de Socios! 🤝 Si tienes un taller mecánico certificado, tienda de accesorios, agencia de motocicletas, financiera o eres organizador de rodadas, ingresa a la sección de aliados para registrar tu negocio.';
    }
    if (lower.includes('paquete') || lower.includes('inspeccion') || lower.includes('inspección') || lower.includes('seguridad') || lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('cuánto') || lower.includes('tarifa') || lower.includes('comision') || lower.includes('comisión')) {
      return 'En Motoluv protegemos cada transacción con procesos certificados 🔒. Nuestros paquetes de servicio:\n\n• Básico: Inspección técnica mecánica y contrato digital.\n• Plus: Inspección técnica + custodia segura de fondos y validación documental.\n• Total: Cobertura Plus + gestión integral de trámites y traslado logístico entre centros autorizados.\n\nPuedes revisar todos los detalles de cada servicio directamente en la plataforma al gestionar tu compra o venta.';
    }
    if (lower.includes('telefono') || lower.includes('teléfono') || lower.includes('contacto') || lower.includes('whatsapp') || lower.includes('celular')) {
      return 'El teléfono / WhatsApp es un dato obligatorio en tu cuenta para coordinar inspecciones mecánicas y entregas seguras. Puedes verificarlo y editarlo en tu perfil.';
    }
    
    return '¡Con gusto te oriento! 🐾 En Motoluv puedes comprar motos seminuevas certificadas, equiparte con los mejores accesorios o sumar tu negocio a nuestra red de aliados. ¿Te gustaría ver el catálogo de motos o conocer la tienda?';
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyFormatted = messages
        .filter((m) => m.id !== 'welcome_1' && m.id !== 'welcome_prev')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

      const res = await chatApi.send(query, historyFormatted);
      const replyText = res?.reply || generateClientFallbackReply(query);

      const luMsg = {
        id: `lu_${Date.now()}`,
        sender: 'lu',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, luMsg]);
    } catch (err) {
      console.warn('Chat API fallback to instant client-engine:', err);
      const fallbackReply = generateClientFallbackReply(query);
      setMessages((prev) => [
        ...prev,
        {
          id: `lu_fb_${Date.now()}`,
          sender: 'lu',
          text: fallbackReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    '🏍️ Ver motos en catálogo',
    '🛡️ Tienda de accesorios',
    '🤝 Súmate a nuestra red',
    '🔍 Paquetes de inspección',
  ];

  const containerStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : { bottom: '20px', right: '20px' };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className="fixed z-50 flex flex-col items-end select-none"
    >
      {/* First Contact Greeting Speech Bubble when closed */}
      {!isOpen && isWavingAnimation && (
        <div className="mb-3 p-3 bg-[#111112] border border-[#E10600]/60 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce max-w-xs text-white text-xs pointer-events-none">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E10600] flex-shrink-0">
            <img 
              src={OFFICIAL_LU_AVATAR} 
              alt="Lu" 
              onError={(e) => handleImageError(e, 'avatar')}
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <div className="font-bold text-[#E10600]">¡Hola! Soy Lu 🐾</div>
            <div className="text-zinc-300">¡Haz clic o arrástrame para chatear! 👋</div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button (Avatar only) */}
      {!isOpen && (
        <button
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          onClick={toggleChat}
          className="group relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#E10600] bg-black shadow-2xl transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none ring-2 ring-black/50 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Abrir chat con Lu"
          title="Haz clic para abrir • Arrastra para mover"
        >
          <img 
            src={OFFICIAL_LU_AVATAR} 
            alt="Lu" 
            onError={(e) => handleImageError(e, 'avatar')}
            className="w-full h-full object-cover pointer-events-none" 
          />
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full" />
        </button>
      )}

      {/* Chat Window Widget */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-[#0d0d0e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header - Draggable Area */}
          <div
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            className="p-3.5 bg-[#111112] border-b border-white/10 flex items-center justify-between relative cursor-grab active:cursor-grabbing select-none"
            title="Arrastra para mover el chat"
          >
            <div className="flex items-center gap-2.5 pointer-events-none">
              <GripHorizontal size={16} className="text-zinc-500 hover:text-white transition-colors" />
              <div className={`relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#E10600] bg-black ${isWavingAnimation ? 'animate-bounce' : ''}`}>
                <img 
                  src={OFFICIAL_LU_AVATAR} 
                  alt="Lu" 
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-full h-full object-cover" 
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
              </div>
              <div>
                <div className="text-white text-sm font-bold font-display uppercase tracking-wider flex items-center gap-1.5">
                  Lu
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isWavingAnimation ? '¡Saludando! 👋' : 'En línea'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleChat}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* First-Contact Waving Banner inside Chat Header */}
          {isWavingAnimation && (
            <div className="bg-[#E10600]/15 border-b border-[#E10600]/30 px-4 py-2 flex items-center justify-between text-xs text-white animate-pulse">
              <span className="flex items-center gap-2">
                🐾 ¡Lu te saluda e inicia la conversación!
              </span>
              <span className="text-sm">👋</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-[#0a0a0a]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {m.sender === 'lu' && (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E10600] flex-shrink-0 mt-0.5">
                    <img 
                      src={OFFICIAL_LU_AVATAR} 
                      alt="Lu" 
                      onError={(e) => handleImageError(e, 'avatar')}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}

                <div>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#E10600] text-white rounded-tr-none'
                        : 'bg-[#161618] border border-white/10 text-zinc-200 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className={`text-[9px] text-zinc-500 mt-1 ${m.sender === 'user' ? 'text-right pr-1' : 'pl-1'}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 max-w-[85%] items-center">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#E10600] flex-shrink-0">
                  <img 
                    src={OFFICIAL_LU_AVATAR} 
                    alt="Lu" 
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-full h-full object-cover animate-spin" 
                  />
                </div>
                <div className="p-3 rounded-2xl bg-[#161618] border border-white/10 text-zinc-400 text-xs flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin text-[#E10600]" />
                  Lu está pensando...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-2 bg-[#0d0d0e] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.replace(/^[^\wáéíóúñÁÉÍÓÚÑ]+/, ''))}
                disabled={loading}
                className="px-2.5 py-1 bg-[#161618] hover:bg-[#E10600]/20 border border-white/10 hover:border-[#E10600]/40 text-zinc-300 hover:text-white text-[10px] rounded-full whitespace-nowrap transition-colors flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-[#111112] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe a Lu..."
              disabled={loading}
              className="flex-1 bg-[#0a0a0a] border border-white/10 focus:border-[#E10600] text-white text-xs rounded-xl px-3.5 py-2.5 outline-none transition-colors placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-[#E10600] hover:bg-red-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-md"
              aria-label="Enviar mensaje"
            >
              <Send size={14} />
            </button>
          </form>

          {/* Footer Security Notice */}
          <div className="px-3 py-1 bg-[#0a0a0a] border-t border-white/5 text-[9px] text-zinc-500 text-center flex items-center justify-center gap-1">
            <Shield size={10} className="text-emerald-500" />
            Asistente Oficial Motoluv • Tu información está protegida
          </div>
        </div>
      )}
    </div>
  );
};

export default LuChatbot;

