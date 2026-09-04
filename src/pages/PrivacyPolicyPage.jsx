import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, FileText, Lock, Eye, Scale, HelpCircle } from 'lucide-react';
import { MotoluvLogo } from '../components/MotoluvLogo';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-red-brand selection:text-white pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070708]/90 backdrop-blur-md px-5 lg:px-12 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} className="text-red-brand" />
          <span>Volver al inicio</span>
        </Link>
        <Link to="/" className="inline-block" aria-label="Motoluv">
          <MotoluvLogo className="h-7 w-auto" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-5 lg:px-8 pt-12 md:pt-16">
        {/* Header Hero */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-3">
            Aviso de Privacidad
          </h1>
          <p className="text-zinc-400 text-sm">
            Fecha de última actualización: <span className="text-zinc-200 font-semibold">10 de junio de 2026</span>
          </p>
        </div>

        {/* Responsible entity card */}
        <div className="bg-[#111112] border border-white/10 rounded-sm p-6 mb-10 text-zinc-300 text-sm leading-relaxed">
          <p>
            <strong className="text-white">Nexus Mobility</strong>, con domicilio en Ciudad de México, en su carácter de{' '}
            <strong className="text-white">Responsable del tratamiento de sus datos personales</strong>, pone a su disposición el presente Aviso de Privacidad, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
          </p>
        </div>

        {/* Legal Sections */}
        <div className="space-y-10 text-zinc-300">
          {/* Section 1 */}
          <Section
            number="1"
            icon={FileText}
            title="Datos Personales Recabados"
          >
            <p className="leading-relaxed">
              Los datos de carácter personal que recabamos de usted a través del formulario de registro y uso en nuestro sitio web{' '}
              <a
                href="https://motoluv.onhercules.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-brand hover:underline underline-offset-2 font-medium"
              >
                https://motoluv.onhercules.app
              </a>{' '}
              y plataforma Motoluv son: <strong className="text-white">nombre completo, número de teléfono y dirección de correo electrónico</strong>, así como información comercial y técnica estrictamente necesaria para la publicación de vehículos o transacciones seguras.
            </p>
          </Section>

          {/* Section 2 */}
          <Section
            number="2"
            icon={Eye}
            title="Finalidades del Tratamiento"
          >
            <p className="mb-4 leading-relaxed">
              Sus datos personales serán tratados para las siguientes finalidades:
            </p>
            <div className="space-y-4">
              <div className="bg-[#0e0e10] border border-white/5 p-4 rounded-sm">
                <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-brand"></span>
                  Finalidades necesarias para la relación jurídica (sin las cuales no podríamos atenderle):
                </h3>
                <ul className="list-disc list-inside ml-2 space-y-1.5 text-zinc-400 text-sm">
                  <li>Incluirle en la lista de espera (waitlist) y notificarle sobre el lanzamiento y novedades oficiales de MotoLuv.</li>
                  <li>Enviarle información relevante sobre las funcionalidades, catálogo de motocicletas y disponibilidad de la plataforma.</li>
                  <li>Gestionar la creación y autenticación de su cuenta de usuario y perfiles de comprador/vendedor.</li>
                </ul>
              </div>

              <div className="bg-[#0e0e10] border border-white/5 p-4 rounded-sm">
                <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                  Finalidades voluntarias (que requieren su consentimiento expreso):
                </h3>
                <ul className="list-disc list-inside ml-2 space-y-1.5 text-zinc-400 text-sm">
                  <li>Envío de comunicaciones comerciales, promociones y boletines informativos sobre productos o servicios relacionados con MotoLuv y aliados certificados.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Section 3 */}
          <Section
            number="3"
            icon={Lock}
            title="Consentimiento"
          >
            <p className="leading-relaxed">
              Al proporcionar sus datos a través del formulario de registro y marcar la casilla correspondiente, usted otorga su consentimiento tácito para el tratamiento de sus datos conforme a las finalidades necesarias descritas. Para las finalidades voluntarias, se requerirá una acción afirmativa independiente mediante una casilla específica no pre-marcada.
            </p>
          </Section>

          {/* Section 4 */}
          <Section
            number="4"
            icon={Scale}
            title="Derechos ARCO y Revocación del Consentimiento"
          >
            <p className="leading-relaxed mb-4">
              Usted tiene el derecho de <strong className="text-white">Acceso, Rectificación, Cancelación y Oposición (Derechos ARCO)</strong> al tratamiento de sus datos personales, así como de revocar el consentimiento otorgado.
            </p>
            <div className="bg-red-brand/5 border border-red-brand/20 p-4 rounded-sm">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Para ejercer estos derechos, envíe una solicitud formal por correo electrónico a:{' '}
                <a
                  href="mailto:contacto@motoluv.mx"
                  className="text-red-brand hover:underline font-bold inline-flex items-center gap-1.5"
                >
                  <Mail size={14} /> contacto@motoluv.mx
                </a>
                , indicando claramente el derecho que desea ejercer, sus datos de contacto y adjuntando copia de una identificación oficial. Atenderemos su solicitud en un plazo máximo de <strong className="text-white">20 días hábiles</strong>.
              </p>
            </div>
          </Section>

          {/* Section 5 */}
          <Section
            number="5"
            icon={ShieldCheck}
            title="Transferencias de Datos"
          >
            <p className="leading-relaxed">
              Sus datos personales no serán transferidos a terceros sin su consentimiento, salvo las excepciones previstas en el artículo 37 de la LFPDPPP. En caso de que Nexus Mobility requiera compartir sus datos con proveedores de servicios (por ejemplo, servicios de mensajería o plataformas de envío de correos electrónicos), estos actuarán bajo nuestras instrucciones y con las mismas medidas de seguridad y confidencialidad exigidas por la ley.
            </p>
          </Section>

          {/* Section 6 */}
          <Section
            number="6"
            icon={FileText}
            title="Uso de Cookies y Tecnologías Similares"
          >
            <p className="leading-relaxed">
              Nuestro sitio web utiliza cookies y otras tecnologías de seguimiento para fines estadísticos y de mejora de la experiencia de navegación. Usted puede desactivar las cookies desde la configuración de su navegador. Le informamos que también utilizamos herramientas de analítica web (como Google Analytics) que pueden recabar datos anónimos sobre su interacción con el sitio.
            </p>
          </Section>

          {/* Section 7 */}
          <Section
            number="7"
            icon={HelpCircle}
            title="Cambios al Aviso de Privacidad"
          >
            <p className="leading-relaxed">
              Cualquier modificación a este Aviso de Privacidad se publicará en esta misma página, indicando la fecha de última actualización. Le recomendamos consultarlo periódicamente.
            </p>
          </Section>

          {/* Section 8 */}
          <Section
            number="8"
            icon={Scale}
            title="Autoridad Reguladora"
          >
            <p className="leading-relaxed">
              Para cualquier queja o denuncia relacionada con el tratamiento de sus datos personales, puede acudir ante la <strong className="text-white">Secretaría Anticorrupción y Buen Gobierno</strong> (antes INAI). Para más información, visite su sitio oficial.
            </p>
          </Section>
        </div>

        {/* Footer Contact CTA */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            © 2026 MotoLuv · Nexus Mobility. Todos los derechos reservados.
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/terminos-y-condiciones"
              className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Términos y Condiciones
            </Link>
            <Link
              to="/"
              className="btn-red text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-sm"
            >
              Volver a la plataforma
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ number, icon: Icon, title, children }) {
  return (
    <div className="bg-[#0c0c0d] border border-white/5 rounded-sm p-6 sm:p-8 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-sm bg-red-brand/10 border border-red-brand/30 flex items-center justify-center text-red-brand font-mono text-xs font-bold">
          {number}
        </div>
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
          {title}
        </h2>
      </div>
      <div className="text-zinc-400 text-sm leading-relaxed space-y-3 pl-0 sm:pl-11">
        {children}
      </div>
    </div>
  );
}
