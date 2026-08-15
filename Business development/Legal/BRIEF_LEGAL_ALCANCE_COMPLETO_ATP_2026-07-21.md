# ⚖️ BRIEF LEGAL · Alcance completo de ATP — para investigación de cumplimiento en México

**Fecha:** 2026-07-21 · **Preparado por:** Cowork técnico (dirección de producto) · **Para:** Cowork legal (investigación independiente)
**Objetivo:** que quien reciba este brief pueda investigar la legislación mexicana aplicable y entregar: qué se quita, qué se mueve, qué se ajusta, qué se aclara; y la forma correcta de constituir la empresa para proteger a los fundadores y sus familias.
**Instrucción para el investigador:** este brief describe TODO el alcance (presente y planeado hasta el 100%, incluyendo genética). No asumas que algo es legal porque ya está construido, ni ilegal porque suena agresivo — investiga y dictamina.

---

## 1. QUIÉNES Y QUÉ

- **Fundadores:** Enrique Zapata (ingeniero mecatrónico, coach de rendimiento, 3× récord Guinness; autor del algoritmo y único desarrollador) y Mariana Zapata (Co-Founder & Chief Science Officer; nutrióloga clínica, candidata a PhD en Ciencias Biomédicas, formación en medicina funcional).
- **Empresa:** AÚN NO CONSTITUIDA. Parte del encargo es recomendar la figura correcta (SAS, SAPI, S de RL, etc.), estructura accionaria pensando en protección patrimonial familiar, y si conviene separar entidades (app tecnológica vs servicios clínicos vs club presencial futuro).
- **Producto:** ATP — app móvil (iOS/Android, stores globales pero mercado inicial México) + web. "Sistema operativo de rendimiento humano": fitness, nutrición, mente, salud funcional, ciclo menstrual, gamificación, con IA personalizada (ARGOS). Filosofía de medicina funcional: prioriza causas raíz, no promueve fármacos como primera opción.
- **Dominio y marca:** somosatp.com · marca "ATP" y "ARGOS" (estado de registro de marca: pendiente de verificar — incluir en el encargo).

## 2. ALCANCE FUNCIONAL COMPLETO (presente + roadmap al 100%)

### 2.1 Ya construido (V1.x–V2 en curso)
1. **Cuestionario Maestro de salud** (73 preguntas): padecimientos activos/resueltos, medicamentos, embarazo/lactancia, trauma emocional, sexualidad y libido, antecedentes familiares. Datos de salud SENSIBLES.
2. **"Edad ATP":** score propietario que traduce biomarcadores y hábitos a una "edad biológica" vs cronológica. No diagnóstico médico formal, pero lo parece a ojos de un regulador.
3. **"Mi Diagnóstico Funcional" (DX):** motor que clasifica al usuario en ejes funcionales y genera un reporte descargable en PDF. Usa la palabra "diagnóstico" en UI — punto crítico a dictaminar.
4. **Interpretación de laboratorios:** el usuario sube sus análisis clínicos; la app los lee contra RANGOS FUNCIONALES (más estrechos que los rangos de referencia convencionales) y los contextualiza (en mujeres, por fase del ciclo menstrual). Guía de labs descargable.
5. **Motor de intervenciones (86+):** prescribe protocolos personalizados: ayunos (16:8, 20:4/OMAD, ayunos prolongados de varios días, "ayuno de sardinas" 1-5 días), exposición a frío (duchas frías, inmersión), calor (sauna), respiración (Wim Hof, apneas), grounding, suplementación con dosis específicas, plantas en modalidad tradicional (tés, polvos — NO extractos industrializados), protocolos de sueño/cronotipo, oil pulling, y más. Con contraindicaciones cableadas (embarazo, epilepsia, marcapasos, anticoagulantes, fiebre, etc.) validadas por Mariana.
6. **Doctrina de fiebre:** la app NO recomienda antipiréticos por default; acompaña la fiebre (hidratación, tés) y deriva la decisión de medicar al usuario y su médico, con flags por antecedentes. Dictaminar el riesgo de esta postura y su redacción.
7. **Suplementos:** escaneo de etiquetas con IA, recomendaciones personalizadas con dosis, "sello BHA" (evaluación propia de calidad de productos de terceros — riesgo de difamación comercial a dictaminar).
8. **Nutrición:** registro por texto/foto (IA interpreta), macros propietarios (carbohidratos 0-25%, grasas 50-75%), posturas contrarias a guías oficiales (la app NO cita AHA/USDA como autoridad y sostiene que los aceites vegetales industriales son dañinos). Dictaminar límites de publicidad/afirmaciones en salud.
9. **Ciclo menstrual y embarazo:** tracking, predicción, modulación de entrenamientos por fase, máscara "ATP Embarazo" con contenido específico para embarazadas. Población de riesgo — estándar de cuidado a dictaminar.
10. **Mente:** meditaciones y respiraciones guiadas (audio generado con IA/TTS), incluyendo una pieza "S.O.S. crisis de pánico". Journal. Dictaminar: ¿una guía de crisis de pánico en app constituye servicio de salud mental?
11. **ARGOS (IA):** asistente basado en LLMs (Anthropic Claude + Google Gemini) que responde preguntas de salud con el contexto completo del usuario (labs, síntomas, ciclo, medicamentos), hace recomendaciones proactivas y deriva a profesionales en casos que lo ameritan. Acepta dictado por voz. Los datos del usuario VIAJAN a APIs de terceros en EE.UU. (Anthropic, Google, ElevenLabs) — transferencias internacionales de datos sensibles a dictaminar.
12. **Economía virtual:** "electrones" (se ganan con hábitos) y "H+" (moneda virtual que SE COMPRA con dinero real vía las stores y se gasta en features de IA). Dictaminar: tratamiento fiscal, PROFECO, términos de consumo, reembolsos, y si constituye activo virtual bajo Ley Fintech (presumiblemente no, pero dictaminar).
13. **Suscripciones:** Base ~$399 MXN/mes, Pro ~$799-999, tier Clínico ~$1,499. Cobro vía App Store/Play (RevenueCat) y en web vía Stripe/Conekta. Oferta "founders" de por vida ($4,990-9,990 pago único). Trial 14 días.
14. **Comunidad:** amigos, retos, ranking, reportes de usuarios (moderación). Vinculación con plataforma externa Skool.
15. **Analítica y observabilidad:** Sentry (errores) y PostHog (eventos de uso) — datos a terceros en EE.UU. Supabase (base de datos, EE.UU.) — TODA la información de salud vive ahí.

### 2.2 Roadmap corto (V2–V2.1)
16. **Backend clínico B2B2C:** profesionales de salud (médicos funcionales, nutriólogos) atienden pacientes DENTRO de ATP: expediente, cuestionario ramificado, detector de interacciones fármaco-suplemento, transcripción automática de consultas con IA (grabación de voz → nota SOAP), chat paciente-clínico ENCRIPTADO (el clínico no ve el chat del paciente con ARGOS). Fee del clínico ~$1,499/mes + ~$200/mes por paciente; el clínico recibe 25% de comisión por sus pacientes suscritos. Dictaminar: telemedicina (NOM-024 y aplicables), responsabilidad profesional, cédulas, expediente clínico electrónico (NOM-004), y el modelo de comisiones (¿dicotomía prohibida? reglas de remuneración entre profesionales de salud y empresas).
17. **Sistema de afiliados con wallet unificado:** clínicos, centros, coaches, influencers y retiros cobran comisiones por referidos en un wallet interno con retiros de dinero real. Dictaminar: retención fiscal, dispersión de pagos, ¿requiere figura regulada?
18. **Coach proactivo:** notificaciones de salud iniciadas por la IA sin pregunta del usuario.

### 2.3 Roadmap completo (hasta 100%)
19. **Genética:** ingesta de resultados de pruebas genéticas de terceros (23andMe-style o labs mexicanos) para personalizar protocolos (nutrigenómica, farmacogenética ligera, riesgos). MÁXIMA sensibilidad: dictaminar marco de datos genéticos en México (LGS, LFPDPPP), consentimiento específico, y si interpretar genética acerca el producto a "dispositivo médico"/salubridad.
20. **Wearables:** ingesta de datos de Apple Health / Google Fit / Oura / Garmin (FC, HRV, sueño, glucosa vía CGM). Dictaminar en particular la glucosa continua (dato médico) y los términos de las plataformas.
21. **ARGOS con voz conversacional** ("super IA", V3): conversación hablada bidireccional sobre salud.
22. **CELAR Ultra Human:** club físico de longevidad en Querétaro (apertura ~jul 2027): entrenamiento, protocolos térmicos, posiblemente servicios clínicos presenciales. Entidad y licencias aparte — solo mapear, no es urgente.
23. **Retiros presenciales** ("Reset Superhumano") con protocolos intensivos (ayuno, frío, respiración).

## 3. DATOS PERSONALES QUE TRATAMOS (mapa para el aviso de privacidad)
Identidad y contacto · datos de salud sensibles (padecimientos, medicamentos, labs, síntomas, salud mental, sexualidad, ciclo menstrual, embarazo) · biométricos ligeros (foto para análisis de comida; futuro: voz) · genéticos (futuro) · hábitos y geoposición gruesa (UV/cronotipo) · datos de pago (tokenizados por terceros) · conversaciones con IA · datos de menores: la app NO está dirigida a menores (dictaminar edad mínima y verificación).
**Procesadores actuales:** Supabase, Anthropic, Google (Gemini), ElevenLabs, Sentry, PostHog, RevenueCat, Apple, Google Play, Stripe, Conekta, Vercel. Todos con transferencia internacional.

## 4. LO QUE YA EXISTE DE PROTECCIÓN (para no partir de cero)
- Disclaimers médicos por pantalla (doc de Mariana: `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md`) + componente MedicalDisclaimer en la app.
- Lenguaje UI calibrado a guidelines de Apple/Google (ROADMAP_COMPLIANCE_STORES.md).
- Contraindicaciones cableadas por intervención + gates por sexo/embarazo/condiciones.
- ARGOS deriva a profesional de salud en casos que lo ameritan (frases canónicas en el system prompt).
- Validación clínica formal firmada por Mariana (paquetes de validación documentados).

## 5. ENCARGO CONCRETO AL COWORK LEGAL (mínimo a cubrir)
1. **Figura societaria y estructura** para protección patrimonial de ambas familias; ¿una entidad o varias (tech / clínica / club)? ¿Dónde vive la IP (marca, algoritmo, contenido)?
2. **Frontera regulatoria sanitaria (COFEPRIS/LGS):** ¿algo del alcance nos convierte en servicio de salud, consultorio digital o dispositivo médico (SaMD)? ¿Qué palabras nos cruzan la línea ("diagnóstico", "prescripción", "tratamiento") y por cuáles sustituirlas? ¿La interpretación de labs y la futura genética dónde caen?
3. **Telemedicina y ejercicio profesional** (backend clínico): NOMs aplicables (004 expediente, 024 sistemas de información en salud), cédulas, responsabilidad civil profesional de Mariana y de los clínicos de la red, y legalidad del esquema de comisiones 25%.
4. **Protección de datos (LFPDPPP + reforma vigente):** aviso de privacidad para datos sensibles/genéticos, consentimientos específicos (IA, transferencias internacionales, grabación de consultas), derechos ARCO operativos, y qué exige el tratamiento por LLMs extranjeros.
5. **Consumidor (PROFECO) y publicidad en salud:** claims permitidos, testimonios, la Edad ATP como promesa, moneda virtual H+, renovaciones automáticas, cancelaciones, oferta founders "de por vida".
6. **Responsabilidad civil por consejos de la app:** protocolos de riesgo (ayunos prolongados, frío extremo, fiebre sin antipirético default, Wim Hof y desmayos) — ¿los disclaimers actuales bastan? ¿Se requiere consentimiento informado explícito por protocolo? ¿Seguro de responsabilidad?
7. **Sello BHA** (juzgar productos de terceros): riesgo de acciones por parte de marcas evaluadas.
8. **Laboral/mercantil:** relación entre fundadores, y contratos con afiliados/clínicos/influencers.
9. **Priorización:** entregar el resultado como (a) BLOQUEANTES antes de vender, (b) ajustes antes de stores, (c) deuda legal tolerable con fecha.

## 6. RESTRICCIONES DE FILOSOFÍA (contexto, no negociables para los fundadores)
La app NO va a promover fármacos como primera opción ni a citar como autoridad a organismos que los fundadores consideran capturados por la industria. El encargo NO es cambiar la filosofía: es encontrar la FORMA legal de sostenerla (redacción, disclaimers, estructura) y decir con claridad cuándo la forma no alcanza y hay que ceder contenido específico.
