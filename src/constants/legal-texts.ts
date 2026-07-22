/**
 * Sprint Compliance 2 — Textos legales en STAGING (in-app).
 *
 * ⚠️ REGLA DE PUBLICACIÓN: la SAS está por constituirse. Estos textos llevan
 * el placeholder literal [RAZÓN SOCIAL] / [DOMICILIO] hasta que Enrique pase
 * la razón social; entonces se inyecta y se publican también en
 * somosatp.com/privacidad y somosatp.com/terminos. NADA se publica con el
 * nombre personal de Enrique — el responsable siempre es la SAS.
 *
 * Fuente: Business development/Legal/AVISO_DE_PRIVACIDAD_v1_2026-07-21.md (Parte 1)
 *         Business development/Legal/TERMINOS_Y_CONDICIONES_v1_2026-07-21.md
 * Si Legal cambia el texto, actualizar aquí + subir versión en consent-copy.ts.
 */

export interface LegalSection {
  heading: string;
  body: string;
}

export const AVISO_INTEGRAL_TITLE = 'Aviso de Privacidad — ATP';
export const AVISO_INTEGRAL_VERSION_LABEL = 'Versión 1.0 · 2026';

export const AVISO_INTEGRAL_SECTIONS: LegalSection[] = [
  {
    heading: '1. Identidad y domicilio del Responsable',
    body: '[RAZÓN SOCIAL, S.A.S. de C.V.] (en adelante, "ATP", "nosotros"), con domicilio en [CALLE, NÚMERO, COLONIA, C.P., QUERÉTARO, MÉXICO] y correo electrónico de contacto privacidad@somosatp.com, es responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (la "Ley"), su Reglamento y demás normativa aplicable.',
  },
  {
    heading: '2. Qué datos personales tratamos',
    body: 'a) Datos de identificación y contacto: nombre, fecha de nacimiento, correo electrónico, país/región, foto de perfil (opcional).\n\nb) Datos personales sensibles de salud (requieren tu consentimiento expreso): estado de salud presente y padecimientos (activos y resueltos); medicamentos y suplementos que consumes; resultados de estudios de laboratorio y biomarcadores que tú aportes; síntomas, hábitos y respuestas a cuestionarios funcionales; ciclo menstrual, embarazo y lactancia (si aplica); estado emocional y bienestar mental (journal, check-ins); datos sobre sexualidad y libido (si tú los aportas en cuestionarios); antecedentes familiares de salud; información genética (en versiones futuras, solo si tú la aportas y con consentimiento adicional).\n\nc) Datos biométricos ligeros: fotografías de alimentos para análisis nutricional; grabaciones de voz (solo si activas funciones de voz, con consentimiento adicional).\n\nd) Datos de uso y hábitos: actividad física, sueño, exposición solar, geoposición gruesa (solo para cálculos de UV/cronotipo; nunca ubicación precisa continua).\n\ne) Datos de conversaciones con ARGOS: el contenido de tus interacciones con nuestro asistente de inteligencia artificial.\n\nf) Datos de pago: procesados y tokenizados por terceros (Apple, Google, Stripe, Conekta). ATP no almacena números de tarjeta completos.',
  },
  {
    heading: '3. Para qué usamos tus datos (finalidades)',
    body: 'Finalidades primarias (necesarias para prestarte el servicio; sin ellas no podemos operar tu cuenta):\n1. Crear y administrar tu cuenta.\n2. Calcular tu Edad ATP y tus indicadores de bienestar con base en la información que aportas.\n3. Generar contenido educativo, sugerencias y rutinas personalizadas de estilo de vida.\n4. Operar el asistente ARGOS con el contexto de tu información.\n5. Procesar tus pagos y suscripciones.\n6. Atender tus solicitudes, dudas y ejercicio de derechos.\n7. Cumplir obligaciones legales aplicables.\n\nFinalidades secundarias (no necesarias para el servicio; puedes oponerte sin afectar tu cuenta):\n8. Enviarte comunicaciones sobre novedades, contenido y promociones de ATP.\n9. Realizar analítica agregada y anónima para mejorar el producto.\n10. Invitarte a estudios, encuestas o programas de la comunidad.\n\nPuedes negar o revocar tu consentimiento a las finalidades secundarias en cualquier momento desde Perfil → Privacidad o escribiendo a privacidad@somosatp.com, sin que ello afecte la prestación del servicio.',
  },
  {
    heading: '4. Fundamento del tratamiento de datos sensibles',
    body: 'Los datos personales sensibles de salud se tratan únicamente con tu consentimiento expreso, otorgado por medios electrónicos conforme al artículo 8 de la Ley. Al marcar las casillas de consentimiento correspondientes en la aplicación, manifiestas tu voluntad expresa de que ATP trate dichos datos para las finalidades primarias descritas. Ningún dato sensible se trata sin tu consentimiento expreso previo.',
  },
  {
    heading: '5. Transferencias y encargados (proveedores en el extranjero)',
    body: 'Para prestarte el servicio, ATP se apoya en proveedores tecnológicos que pueden tratar tus datos, incluidos datos sensibles, en Estados Unidos de América. Cada proveedor ha asumido, mediante contrato, obligaciones equivalentes a las del Responsable bajo la Ley mexicana, incluyendo confidencialidad, medidas de seguridad y la prohibición de usar tus datos para entrenar sus modelos de inteligencia artificial.\n\nProveedores: Supabase (base de datos, EE.UU.) · Anthropic — Claude (asistente ARGOS, EE.UU.) · Google — Gemini (ARGOS respaldo, EE.UU.) · ElevenLabs (funciones de voz, si las activas, EE.UU.) · Sentry (detección de errores técnicos, EE.UU.) · PostHog (analítica de uso, EE.UU.) · RevenueCat (gestión de suscripciones, EE.UU.) · Apple / Google Play (pagos in-app, EE.UU.) · Stripe / Conekta (pagos web, EE.UU./MX) · Vercel (alojamiento del sitio web, EE.UU.).\n\nLa transferencia internacional de tus datos sensibles requiere tu consentimiento específico, que otorgas mediante la casilla correspondiente. Puedes solicitar el detalle de las salvaguardas contractuales escribiendo a privacidad@somosatp.com.',
  },
  {
    heading: '6. Funciones de inteligencia artificial y decisiones automatizadas',
    body: 'ARGOS es un asistente basado en modelos de lenguaje que genera contenido educativo y sugerencias con base en tu información. ATP no toma decisiones médicas ni automatizadas que produzcan efectos jurídicos sobre ti. Tienes derecho a solicitar información sobre la lógica general de estos tratamientos y a oponerte a ellos escribiendo a privacidad@somosatp.com.',
  },
  {
    heading: '7. Menores de edad',
    body: 'ATP está dirigida exclusivamente a personas mayores de 18 años. No recabamos intencionalmente datos de menores de edad. Si detectamos una cuenta de un menor, procederemos a su cancelación.',
  },
  {
    heading: '8. Tus derechos (ARCO) y cómo ejercerlos',
    body: 'Tienes derecho a Acceder a tus datos, Rectificarlos si son inexactos, Cancelarlos cuando consideres que no se requieren, y Oponerte a su tratamiento para finalidades específicas. También puedes revocar tu consentimiento.\n\nCómo ejercerlos:\n· Dentro de la app: Perfil → Privacidad (descargar tus datos, rectificar, cancelar cuenta, oponerte a finalidades).\n· Por correo: privacidad@somosatp.com\n\nResponderemos tu solicitud en un plazo máximo de 20 días hábiles, y de proceder, la haremos efectiva dentro de los 15 días hábiles siguientes. El ejercicio de estos derechos es gratuito.\n\nSi consideras que tu derecho a la protección de datos ha sido vulnerado, puedes acudir a la autoridad competente, la Secretaría Anticorrupción y Buen Gobierno.',
  },
  {
    heading: '9. Medidas de seguridad',
    body: 'ATP implementa medidas administrativas, técnicas y físicas para proteger tus datos, incluyendo cifrado en tránsito y en reposo, control de acceso basado en roles (RLS), y registro de accesos. En caso de una vulneración de seguridad que afecte significativamente tus derechos, te lo notificaremos conforme a la Ley.',
  },
  {
    heading: '10. Conservación de datos',
    body: 'Conservamos tus datos mientras mantengas tu cuenta activa y por los plazos que exija la legislación aplicable. Al cancelar tu cuenta, tus datos se eliminan tras un periodo de gracia de 30 días (salvo obligación legal de conservación).',
  },
  {
    heading: '11. Uso de tecnologías de rastreo',
    body: 'En nuestro sitio web y app utilizamos tecnologías propias y de terceros (cookies, identificadores) para recordar tus preferencias y medir el uso. Puedes gestionar estas preferencias desde la configuración de tu dispositivo o navegador.',
  },
  {
    heading: '12. Cambios al Aviso de Privacidad',
    body: 'ATP podrá actualizar este Aviso. Cualquier cambio sustancial te será notificado por correo electrónico y/o dentro de la app con al menos 30 días de anticipación. La versión vigente estará siempre disponible en somosatp.com/privacidad.',
  },
];

export const TERMS_TITLE = 'Términos y Condiciones de Uso — ATP';
export const TERMS_VERSION_LABEL = 'Versión 1.0 · 2026';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '1. Aceptación y quién presta el servicio',
    body: 'Estos Términos y Condiciones (los "Términos") rigen el uso de la aplicación y sitio web ATP, operados por [RAZÓN SOCIAL, S.A.S. de C.V.] ("ATP", "nosotros"), con domicilio en [DOMICILIO, QUERÉTARO, MÉXICO] y contacto hola@somosatp.com.\n\nAl crear una cuenta, suscribirte o usar ATP, aceptas estos Términos y nuestro Aviso de Privacidad. Si no estás de acuerdo, no uses el servicio.',
  },
  {
    heading: '2. Qué es ATP (y qué NO es) — Aviso médico',
    body: 'ATP es una aplicación de bienestar, educación y estilo de vida. ATP no es medicina para enfermos: es una herramienta de optimización, autoconocimiento y rendimiento. No diagnostica ni trata enfermedades. Te ayuda a entender y optimizar tu cuerpo, y a llegar mejor preparado a tu médico. Si tienes una condición de salud, ATP trabaja junto a tu médico, no en su lugar.\n\nATP NO es un dispositivo médico. No diagnostica, no trata, no cura ni previene ninguna enfermedad. La información, evaluaciones, sugerencias, rutinas y contenidos generados por ATP y por su asistente de inteligencia artificial ARGOS son de carácter exclusivamente educativo y no sustituyen la consulta, diagnóstico o tratamiento de un profesional de la salud con cédula.\n\nLa "Edad ATP" y todos los indicadores del producto son estimaciones educativas basadas en la información que tú aportas. No constituyen un diagnóstico médico ni una promesa de resultados.\n\nAntes de iniciar cualquier programa nutricional, de ejercicio, ayuno, exposición a frío/calor, respiración o suplementación, consulta con tu médico, especialmente si tienes condiciones preexistentes, tomas medicamentos, tienes antecedentes cardiacos, epilepsia, o estás embarazada o en lactancia.\n\nSituaciones de emergencia: ATP no es un servicio de urgencias ni de atención en crisis. Si presentas una emergencia médica o de salud mental, llama de inmediato a los servicios de emergencia (911) o a la Línea de la Vida: 800-911-2000 (24/7, gratuito).',
  },
  {
    heading: '3. Elegibilidad',
    body: 'Debes ser mayor de 18 años para usar ATP. Al registrarte, confirmas que cumples este requisito.',
  },
  {
    heading: '4. Tu cuenta',
    body: 'Eres responsable de la veracidad de la información que aportas y de mantener la confidencialidad de tus credenciales. La calidad de tus estimaciones y contenido depende de la exactitud de los datos que ingresas.',
  },
  {
    heading: '5. Suscripciones, planes y pagos',
    body: 'ATP ofrece planes de suscripción (mensuales o anuales) y, por tiempo limitado, el Programa Founders (sección 6). Los precios vigentes se muestran en la app y en somosatp.com/precios, en pesos mexicanos (MXN).\n\nLos pagos se procesan mediante App Store (Apple), Google Play, o pasarelas web (Stripe/Conekta). Al suscribirte autorizas el cargo recurrente correspondiente al plan elegido.\n\nPeriodo de prueba: si contratas con periodo de prueba de 14 días, podrás cancelar sin costo durante ese periodo. El primer cargo se realizará al término de la prueba, salvo que canceles antes.\n\nRenovación automática: las suscripciones se renuevan automáticamente al final de cada periodo, al precio vigente. Te notificaremos al menos 5 días naturales antes de cada renovación, indicando monto y fecha. Puedes cancelar la renovación en cualquier momento, con un solo toque, desde la app (Ajustes → Suscripción, para compras web) o desde la gestión de suscripciones de App Store / Google Play. La cancelación surte efecto al final del periodo ya pagado; conservas el acceso hasta entonces.\n\nReembolsos: durante los 14 días de prueba, la cancelación no genera cargo. Una vez transcurridos, los pagos no son reembolsables, salvo obligación legal expresa. Los reembolsos de compras realizadas en App Store o Google Play se rigen adicionalmente por las políticas de dichas tiendas.',
  },
  {
    heading: '6. Programa Founders',
    body: 'El Plan Founders es una oferta por tiempo limitado que otorga acceso al Plan Pro de ATP sin costo mensual adicional durante toda la vigencia operativa de la plataforma ATP, más los beneficios descritos al momento de la compra, mediante un pago único.\n\nContinuidad y cese de operaciones: en caso de que ATP cese operaciones comerciales por cualquier causa, cada Founder recibirá: (i) la exportación completa de sus datos personales de salud en formato estándar; y (ii) un reembolso prorrateado calculado sobre una vida esperada de referencia de [10] años a partir de su fecha de compra. ATP se compromete a notificar cualquier cese de operaciones con al menos 90 días de anticipación.\n\nEl Plan Founders es personal e intransferible. El número de plazas es limitado.',
  },
  {
    heading: '7. Créditos digitales "H+"',
    body: 'Los H+ son créditos digitales internos de uso exclusivo dentro de ATP para consumir funciones de inteligencia artificial. Los H+: se adquieren mediante pago dentro de la aplicación (vía la tienda correspondiente); no constituyen moneda de curso legal, no son un activo virtual en términos de la Ley para Regular las Instituciones de Tecnología Financiera, no son transferibles entre cuentas, no son convertibles a dinero ni a otros activos, y no generan intereses; tienen una vigencia de 24 meses desde su compra (te avisaremos 60 días antes de su expiración); al cancelar tu suscripción, los H+ no consumidos permanecen disponibles hasta su fecha de expiración. Los reembolsos de H+ adquiridos vía App Store o Google Play se sujetan a las políticas de dichas plataformas.',
  },
  {
    heading: '8. Uso aceptable',
    body: 'No debes: usar ATP para fines ilícitos; suplantar identidad; extraer datos masivamente (scraping); intentar vulnerar la seguridad; ni revender o redistribuir el contenido sin autorización. Podemos suspender cuentas que violen estos Términos.',
  },
  {
    heading: '9. Propiedad intelectual',
    body: 'Todo el contenido, marcas ("ATP", "ARGOS", "Edad ATP", "ATP Functional Score"), algoritmos, textos, diseños y software son propiedad de ATP o de sus licenciantes. Se te otorga una licencia limitada, personal, no exclusiva e intransferible para usar el servicio conforme a estos Términos. Conservas la titularidad de los datos que tú aportas.',
  },
  {
    heading: '10. Contenido de terceros y evaluaciones de productos',
    body: 'El ATP Functional Score es una evaluación educativa y propietaria basada en criterios objetivos y públicos sobre las características y fórmula de un producto. No constituye recomendación médica ni juicio sobre marcas comerciales específicas. La metodología está disponible públicamente. Las referencias científicas citadas en el contenido educativo remiten a estudios de terceros; ATP no es responsable de la disponibilidad ni exactitud de fuentes externas.',
  },
  {
    heading: '11. Limitación de responsabilidad',
    body: 'En la máxima medida permitida por la legislación mexicana, la responsabilidad de ATP frente al usuario por cualquier reclamación relacionada con el servicio se limita al monto pagado por el usuario en los 12 meses previos al hecho que origine la reclamación.\n\nNada en estos Términos limita la responsabilidad de ATP por dolo o negligencia grave, ni los derechos irrenunciables que la Ley Federal de Protección al Consumidor otorga al consumidor.\n\nEl usuario reconoce que las intervenciones de estilo de vida (ayuno, ejercicio, exposición a frío/calor, respiración, suplementación) conllevan riesgos inherentes, que ha sido advertido de consultarlas con su médico, y que las realiza bajo su propia decisión y responsabilidad.',
  },
  {
    heading: '11-bis. Prácticas de bienestar de mayor exigencia y asunción de riesgo',
    body: 'ATP pone a tu disposición prácticas de bienestar que, por su naturaleza, requieren precauciones especiales, incluyendo entre otras: respiración intensa (hiperventilación controlada), apneas, exposición a frío (inmersión, duchas frías), exposición a calor (sauna) y ayuno prolongado. Estas prácticas conllevan riesgos inherentes que pueden incluir mareo, pérdida de conciencia, y en circunstancias extremas, lesiones graves.\n\nAntes de iniciar cualquiera de estas prácticas, ATP te solicita confirmar de manera expresa y por escrito, cada vez que aplica, que te encuentras en condiciones seguras y sin contraindicaciones. Al confirmar dichas afirmaciones, reconoces que la información es veraz, que comprendes los riesgos, que realizas la práctica por tu propia decisión y bajo tu responsabilidad, y que asumes voluntariamente los riesgos inherentes.\n\nEstas prácticas son de carácter educativo y de bienestar; no constituyen tratamiento médico ni prescripción. No las inicies sin consultar a tu médico si tienes condiciones preexistentes. En caso de embarazo, lactancia u otras condiciones de riesgo declaradas, ATP bloquea automáticamente el acceso a determinadas prácticas por tu seguridad.',
  },
  {
    heading: '12. Indemnización',
    body: 'Te obligas a mantener en paz y a salvo a ATP frente a reclamaciones de terceros derivadas de: (i) información falsa o inexacta que aportes; (ii) uso indebido del servicio; o (iii) incumplimiento de estos Términos.',
  },
  {
    heading: '13. Modificaciones a los Términos',
    body: 'Podemos modificar estos Términos notificándote con al menos 30 días de anticipación por correo y/o dentro de la app. Si no aceptas los cambios, puedes cancelar sin penalización antes de su entrada en vigor y solicitar el reembolso proporcional del periodo no utilizado, cuando aplique.',
  },
  {
    heading: '14. Terminación',
    body: 'Puedes cancelar tu cuenta en cualquier momento desde Perfil → Privacidad. Podemos suspender o terminar tu acceso si violas estos Términos, notificándote cuando sea legalmente posible.',
  },
  {
    heading: '15. Ley aplicable y jurisdicción',
    body: 'Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, el consumidor podrá acudir, a su elección, ante la Procuraduría Federal del Consumidor (PROFECO) —incluida la plataforma Concilianet— o ante los tribunales competentes de [Querétaro / Ciudad de México].',
  },
  {
    heading: '16. Contacto',
    body: 'Dudas sobre estos Términos: hola@somosatp.com · Privacidad y datos: privacidad@somosatp.com',
  },
];
