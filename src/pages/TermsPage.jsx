import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  BookOpen,
  Layers,
  UserCheck,
  ShieldCheck,
  UploadCloud,
  Bike,
  Ban,
  Copyright,
  Share2,
  ExternalLink,
  Server,
  Lock,
  Mail,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Scale,
  Gavel,
  FileCheck2,
  PhoneCall,
} from 'lucide-react';
import { MotoluvLogo } from '../components/MotoluvLogo';

export default function TermsPage() {
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
            Términos y Condiciones
          </h1>
          <p className="text-zinc-400 text-sm">
            Última actualización: <span className="text-zinc-200 font-semibold">2 de septiembre de 2026</span>
          </p>
        </div>

        {/* Preamble card */}
        <div className="bg-[#111112] border border-white/10 rounded-sm p-6 mb-10 text-zinc-300 text-sm leading-relaxed">
          <p>
            <strong className="text-white">Estos Términos</strong> regulan exclusivamente el acceso y uso del sitio web{' '}
            <a
              href="https://www.motoluv.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-brand hover:underline underline-offset-2 font-medium"
            >
              www.motoluv.mx
            </a>{' '}
            y sus funcionalidades digitales. No constituyen el contrato de compraventa de una motocicleta ni sustituyen contratos, anexos, políticas o documentos que se formalicen respecto de una operación específica.
          </p>
        </div>

        {/* Legal Sections */}
        <div className="space-y-8 text-zinc-300">
          {/* Section 1 */}
          <Section number="1" icon={CheckCircle2} title="Aceptación">
            <p className="leading-relaxed">
              El acceso, navegación, registro o utilización de cualquier funcionalidad del Sitio implica que el Usuario reconoce haber leído estos Términos y acepta quedar sujeto a ellos. Si no está de acuerdo, deberá abstenerse de utilizar el Sitio.
            </p>
          </Section>

          {/* Section 2 */}
          <Section number="2" icon={BookOpen} title="Definiciones">
            <p className="leading-relaxed">
              <strong className="text-white">“Sitio”</strong> significa{' '}
              <a
                href="https://www.motoluv.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-brand hover:underline underline-offset-2 font-medium"
              >
                www.motoluv.mx
              </a>{' '}
              y sus páginas, interfaces y funcionalidades asociadas. <strong className="text-white">“Usuario”</strong> significa cualquier persona que acceda o utilice el Sitio. <strong className="text-white">“Contenido”</strong> comprende textos, imágenes, fotografías, diseños, marcas, interfaces, bases de datos, materiales y demás elementos disponibles en el Sitio.
            </p>
          </Section>

          {/* Section 3 */}
          <Section number="3" icon={Layers} title="Objeto del Sitio">
            <p className="leading-relaxed">
              El Sitio proporciona información y herramientas digitales relacionadas con el mercado de motocicletas y con los servicios que Motoluv determine ofrecer a través de sus canales digitales. Las funcionalidades pueden cambiar, suspenderse o retirarse.
            </p>
          </Section>

          {/* Section 4 */}
          <Section number="4" icon={UserCheck} title="Requisitos y Capacidad">
            <p className="leading-relaxed">
              El Usuario declara contar con capacidad jurídica para utilizar el Sitio. Cuando actúe en representación de otra persona, declara contar con facultades suficientes. Motoluv podrá solicitar información razonablemente necesaria para habilitar determinadas funcionalidades.
            </p>
          </Section>

          {/* Section 5 */}
          <Section number="5" icon={ShieldCheck} title="Cuentas y Seguridad">
            <p className="leading-relaxed">
              Cuando el Sitio permita crear una cuenta, el Usuario deberá proporcionar información verdadera, actual y completa. Es responsable de sus credenciales y de las actividades realizadas desde su cuenta. Motoluv podrá suspender o cancelar cuentas por razones justificadas de seguridad, incumplimiento o uso indebido.
            </p>
          </Section>

          {/* Section 6 */}
          <Section number="6" icon={UploadCloud} title="Información del Usuario">
            <p className="leading-relaxed">
              El Usuario será responsable de la información, fotografías, documentos u otros materiales que cargue, envíe o publique. No deberá proporcionar información falsa, engañosa, ilícita, suplantada, fraudulenta o que infrinja derechos de terceros.
            </p>
          </Section>

          {/* Section 7 */}
          <Section number="7" icon={Bike} title="Publicaciones">
            <p className="leading-relaxed">
              Las publicaciones pueden depender de información proporcionada por usuarios o terceros. Su aparición en el Sitio no constituye, por sí sola, una declaración de Motoluv sobre titularidad, estado jurídico, estado mecánico, autenticidad o condición futura de una motocicleta. Los procesos propios de validación, inspección o certificación tendrán el alcance comunicado al Usuario.
            </p>
          </Section>

          {/* Section 8 */}
          <Section number="8" icon={Ban} title="Usos Prohibidos">
            <p className="leading-relaxed">
              Queda prohibido utilizar el Sitio para cometer o facilitar actos ilícitos; suplantar identidades; proporcionar documentación falsa; vulnerar sistemas; introducir código malicioso; extraer sistemáticamente contenido sin autorización; interferir con el funcionamiento; infringir derechos de propiedad intelectual o datos personales; o realizar cualquier uso contrario a estos Términos o a la legislación aplicable.
            </p>
          </Section>

          {/* Section 9 */}
          <Section number="9" icon={Copyright} title="Propiedad Intelectual">
            <p className="leading-relaxed">
              El nombre Motoluv, sus signos distintivos, diseños, interfaces, textos, fotografías, gráficos, software, bases de datos y demás elementos protegibles pertenecen a Motoluv o a sus respectivos titulares. El acceso al Sitio no transmite derechos de propiedad. Salvo autorización expresa, el Usuario no podrá reproducirlos, modificarlos, distribuirlos, explotarlos comercialmente ni crear obras derivadas.
            </p>
          </Section>

          {/* Section 10 */}
          <Section number="10" icon={Share2} title="Contenido del Usuario">
            <p className="leading-relaxed">
              Cuando el Usuario cargue contenido al Sitio, conserva los derechos que legalmente le correspondan. En la medida necesaria para operar y prestar las funcionalidades del Sitio, autoriza a Motoluv a utilizar técnicamente dicho contenido conforme a la finalidad para la cual fue proporcionado y a la legislación aplicable.
            </p>
          </Section>

          {/* Section 11 */}
          <Section number="11" icon={ExternalLink} title="Terceros">
            <p className="leading-relaxed">
              El Sitio puede contener enlaces, integraciones o servicios de terceros sujetos a sus propios términos. Motoluv no asume responsabilidad por contenidos o servicios de terceros fuera de su control, sin perjuicio de las responsabilidades que legalmente le correspondan.
            </p>
          </Section>

          {/* Section 12 */}
          <Section number="12" icon={Server} title="Disponibilidad">
            <p className="leading-relaxed">
              Motoluv procurará mantener el Sitio disponible, pero no garantiza disponibilidad continua o ininterrumpida. Podrán existir interrupciones por mantenimiento, actualizaciones, fallas técnicas, servicios de terceros, fuerza mayor o circunstancias fuera de su control razonable.
            </p>
          </Section>

          {/* Section 13 */}
          <Section number="13" icon={Lock} title="Seguridad">
            <p className="leading-relaxed">
              Motoluv podrá implementar medidas técnicas y organizativas razonables para proteger el Sitio. Ningún sistema conectado a Internet puede garantizar seguridad absoluta. El Usuario deberá utilizar dispositivos y credenciales responsablemente y abstenerse de intentar vulnerar las medidas de seguridad.
            </p>
          </Section>

          {/* Section 14 */}
          <Section number="14" icon={FileText} title="Datos Personales">
            <p className="leading-relaxed">
              El tratamiento de datos personales se realizará conforme al{' '}
              <Link
                to="/aviso-de-privacidad"
                className="text-red-brand hover:underline underline-offset-2 font-medium"
              >
                Aviso de Privacidad
              </Link>{' '}
              de Motoluv y a la legislación mexicana aplicable. Estos Términos no sustituyen dicho Aviso de Privacidad.
            </p>
          </Section>

          {/* Section 15 */}
          <Section number="15" icon={Mail} title="Comunicaciones Electrónicas">
            <p className="leading-relaxed">
              El Usuario acepta que determinadas comunicaciones relacionadas con el uso del Sitio puedan realizarse por medios electrónicos, de conformidad con la legislación aplicable y con los mecanismos de consentimiento que correspondan.
            </p>
          </Section>

          {/* Section 16 */}
          <Section number="16" icon={AlertTriangle} title="Responsabilidad">
            <p className="leading-relaxed">
              En la máxima medida permitida por la legislación aplicable, Motoluv no será responsable por daños derivados exclusivamente de actos u omisiones del Usuario, información falsa proporcionada por terceros, indisponibilidad causada por terceros o acontecimientos fuera de su control razonable. Esta cláusula no pretende excluir responsabilidades legalmente irrenunciables ni derechos aplicables a consumidores.
            </p>
          </Section>

          {/* Section 17 */}
          <Section number="17" icon={XCircle} title="Suspensión y Terminación">
            <p className="leading-relaxed">
              Motoluv podrá restringir, suspender o cancelar el acceso al Sitio o a determinadas funcionalidades cuando sea necesario para proteger la seguridad, cumplir una obligación legal, prevenir fraude, atender un incumplimiento o preservar la operación del Sitio.
            </p>
          </Section>

          {/* Section 18 */}
          <Section number="18" icon={RefreshCw} title="Modificaciones">
            <p className="leading-relaxed">
              Motoluv podrá modificar estos Términos para reflejar cambios legales, técnicos, operativos o en las funcionalidades del Sitio. La versión vigente será la publicada en el Sitio. Cuando una modificación requiera consentimiento adicional por ley, se solicitará mediante el mecanismo correspondiente.
            </p>
          </Section>

          {/* Section 19 */}
          <Section number="19" icon={Scale} title="Legislación Aplicable">
            <p className="leading-relaxed">
              Estos Términos se regirán por las leyes aplicables de los Estados Unidos Mexicanos. Si el Usuario tiene la calidad de consumidor frente a Motoluv, se respetarán los derechos y mecanismos de protección que resulten aplicables.
            </p>
          </Section>

          {/* Section 20 */}
          <Section number="20" icon={Gavel} title="Jurisdicción">
            <p className="leading-relaxed">
              Para controversias derivadas exclusivamente del uso del Sitio, las partes se sujetarán a las autoridades y tribunales legalmente competentes, sin perjuicio de los derechos de consumidores ni de las reglas imperativas de competencia territorial.
            </p>
          </Section>

          {/* Section 21 */}
          <Section number="21" icon={FileCheck2} title="Separabilidad">
            <p className="leading-relaxed">
              Si alguna disposición fuese declarada inválida, ilegal o inexigible, las demás disposiciones continuarán vigentes en la medida permitida por la legislación aplicable.
            </p>
          </Section>

          {/* Section 22 */}
          <Section number="22" icon={BookOpen} title="Integridad">
            <p className="leading-relaxed">
              Estos Términos constituyen las condiciones generales de uso del Sitio. Las condiciones particulares de servicios, promociones, operaciones o contratos específicos podrán estar sujetas a documentos adicionales que prevalecerán respecto de la materia específica que regulen.
            </p>
          </Section>

          {/* Section 23 */}
          <Section number="23" icon={PhoneCall} title="Contacto">
            <p className="leading-relaxed">
              Para asuntos relacionados con estos Términos, el Usuario podrá utilizar los canales de contacto publicados en{' '}
              <a
                href="https://www.motoluv.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-brand hover:underline underline-offset-2 font-medium"
              >
                www.motoluv.mx
              </a>
              . La información de contacto podrá actualizarse en el Sitio.
            </p>
          </Section>
        </div>

        {/* Final Acceptance Block */}
        <div className="mt-12 bg-gradient-to-r from-red-brand/15 via-[#16161a] to-[#16161a] border border-red-brand/30 rounded-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-sm bg-red-brand text-white flex items-center justify-center">
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
              Aceptación Final
            </h2>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed sm:pl-11">
            Al continuar utilizando el Sitio, el Usuario manifiesta que ha tenido acceso a estos Términos y que acepta sus disposiciones en la medida permitida por la legislación aplicable.
          </p>
        </div>

        {/* Footer Navigation CTA */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500">
            © 2026 MotoLuv. Todos los derechos reservados.
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/aviso-de-privacidad"
              className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Aviso de Privacidad
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
