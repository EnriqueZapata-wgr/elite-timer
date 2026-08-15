# ⚖️ DICTAMEN LEGAL · NIVEL A · BLOQUEANTES ANTES DE PRIMER COBRO

**Fecha:** 2026-07-21
**Prep por:** Cowork Comercial (research por 5 agentes paralelos)
**Para:** Enrique Zapata + Mariana Doria
**Objeto:** identificar y aterrizar todo lo que impide vender legalmente en agosto 2026
**Estado:** research completo, listo para acción

---

## ⚠️ DESCARGO OBLIGATORIO

Este documento es un **dictamen preparado por research** con fuentes oficiales (LGS, LFPC, LFPDPPP 2025, LGSM, DOF, COFEPRIS, PROFECO). **NO es asesoría legal formal.** Debe validarse con abogado(a) con cédula en México especializado(a) en healthtech + privacidad antes de firmar constitución, T&C, Aviso de Privacidad, o cualquier contrato con clínicos/afiliados.

Este dictamen sirve para: (a) tomar decisiones internas informadas antes de sentarse con abogado externo, (b) bajar el costo del abogado (llega con brief hecho), (c) accionar los cambios de código, copy y estructura que dependen exclusivamente de Enrique.

---

## RESUMEN EJECUTIVO (léelo primero)

**Diagnóstico global.** La app tal como está descrita tiene **20 bloqueantes P0** que hay que resolver antes del primer cobro Founders en agosto 2026. La mayoría son:
- **Cirugía de copy en la UI** (renombrar "Diagnóstico Funcional", quitar claims cuantitativos, corregir "Dra. Mariana")
- **Constituir la SAS + verificar régimen fiscal de socios**
- **Actualizar Aviso de Privacidad a la nueva LFPDPPP 2025** (la ley cambió, INAI extinguido — nueva autoridad SABG)
- **Firmar DPAs con Anthropic, Google, ElevenLabs, Supabase, Sentry, PostHog**
- **Cortar 3 features de alto riesgo** de la V1 pública: ayuno prolongado (72h+), sardinas 1-5 días, S.O.S. crisis de pánico con IA generativa libre
- **Implementar gates técnicos duros** en embarazo/lactancia + Wim Hof cerca del agua
- **Reformular "de por vida"** en Founders → publicidad engañosa bajo LFPC art. 32
- **Publicar metodología pública del sello BHA** o cancelarlo

**Filosofía de fondo confirmada** (Enrique dijo: "prefiero eliminar features antes que arriesgar familia"):
- Cortar: 3 features (ayuno sardinas, S.O.S. IA libre, sello BHA sin metodología)
- Mover a HUB Fx: ayunos >72h (donde Mariana o clínico titular firma)
- Reformular: 20+ frases/copy/nombres
- Gates técnicos: 5+ implementaciones nuevas

**Costo total estimado del stack legal P0** para agosto:
- Constitución SAS: **$0** (portal gob.mx)
- Notario / trámite RFC persona moral: **~$3-5K MXN**
- Abogado(a) especialista validador (2-3 sesiones): **~$15-25K MXN**
- **Total P0: ~$18-30K MXN** — compatible con crisis financiera

**Timeline crítico:**
```
HOY (2026-07-21)
  ↓
Semana 1 — Verificar RESICO PF de ambos socios + agendar cita SAT + sweep de copy
  ↓
Semana 2 — Constitución SAS + registro RFC persona moral + tramitar aviso publicidad COFEPRIS
  ↓
Semana 3 — Cambios en app (gates, renombres, disclaimers, checkboxes granulares)
  ↓
Semana 4 — DPAs firmados + Aviso Privacidad publicado + T&C v1 revisados por abogado
  ↓
AGOSTO 2026 — Primer cobro Founders legalmente habilitado ✓
```

---

## MARCO LEGAL — CAMBIOS 2025-2026 QUE DEBES SABER

**Antes de los hallazgos, tres actualizaciones críticas del entorno legal MX que impactan a ATP:**

1. **LFPDPPP fue abrogada.** El 20-mar-2025 se publicó la **Nueva LFPDPPP** (DOF). El INAI fue extinguido por reforma constitucional (DOF 20-dic-2024). La nueva autoridad de datos personales de particulares es la **Secretaría Anticorrupción y Buen Gobierno (SABG)**. El medio de impugnación cambió de juicio de nulidad a **amparo indirecto ante juzgados del 30° Circuito en Aguascalientes**. El reglamento sigue pendiente a jul-2026 (aplica supletoriamente el de 2011).

2. **LFPC reformada dic-2025.** El 12-dic-2025 se publicó en DOF la reforma que adiciona fracciones VIII y IX al art. 76 Bis LFPC (vigente desde 13-dic-2025). Obliga **notificar renovación 5 días naturales antes** + **cancelación 1-tap proporcional al mecanismo de contratación**. Multa hasta $4.27M MXN por evento.

3. **SAS: cambios operativos 2026.** El acto constitutivo sigue siendo digital y gratuito (art. 262 LGSM), pero desde 2026 el **RFC y e.firma de la SAS ya no se generan en línea** — son trámite presencial con cita SAT (ficha 7/CFF RMF 2026). Timing real: 2-4 semanas para operar, no 24h. Tope de ingresos anuales SAS 2026: **$7,678,849.94 MXN**.

---

# 🔴 P0 — BLOQUEANTES ANTES DEL PRIMER COBRO

Todos estos deben resolverse ANTES del primer cobro Founders en agosto 2026.

---

## P0-01 · Constituir la SAS antes de cobrar

**Hallazgo.** No puedes cobrar legalmente sin persona moral. Cada cobro sin sociedad constituida = tema fiscal (facturación como PF, obligación de retener), tema LFPDPPP (identidad del responsable del tratamiento), y tema PROFECO (parte contractual identificable). Enrique dijo "no me asusta lo fiscal porque son personas de confianza" — pero PROFECO y LFPDPPP no ven "confianza"; ven una empresa que cobra sin estar constituida.

**Ley aplicable.** LGSM arts. 260-273 (SAS); CFF art. 27 (RFC persona moral); LISR (régimen fiscal).

**Riesgo si se ignora.** Facturar como PF los cobros Founders te mete en régimen de PF con actividad empresarial → topes RESICO PF ($3.5M anuales), obligaciones distintas de retención, imposibilidad de ser "responsable del tratamiento" bajo LFPDPPP con la razón social "ATP" (que aún no existe).

**Acción concreta.**
1. **Antes de constituir:** verificar que Enrique Y Mariana estén en RESICO PF hoy (Constancia de Situación Fiscal). Si uno o los dos no lo está, cambiar régimen ANTES del acto constitutivo, o aceptar que la SAS tributará en régimen general (30% sobre devengado, no sobre flujo).
2. Agendar cita SAT en Querétaro para RFC persona moral (citas saturadas — agendar YA).
3. Firmar acto constitutivo en tuempresa.gob.mx.
4. Denominación sugerida: **"ATP Rendimiento Humano, S.A.S. de C.V."** (agregar C.V. permite capital variable sin reforma estatutaria).
5. Objeto social amplio (ver P0-02).
6. Enrique como administrador único; Mariana como accionista sin representación legal (esto ya es su preferencia).

**Redacción sugerida — objeto social broad (cubre roadmap V1→V2 y Hub Fx):**
> "La Sociedad tendrá por objeto: (i) el diseño, desarrollo, operación, licenciamiento, comercialización y explotación de plataformas tecnológicas, aplicaciones móviles y web, y sistemas de software, orientados a la salud, bienestar, rendimiento humano, fitness, nutrición, mente, sueño, salud funcional y educación; (ii) la prestación de servicios de suscripción digital (SaaS), consultoría, asesoría, coaching y capacitación en las materias anteriores; (iii) la generación, publicación y comercialización de contenido educativo, editorial, audiovisual y digital; (iv) la comercialización, promoción y distribución de productos, protocolos y programas relacionados con los pilares anteriores, ya sea de manera directa o mediante terceros afiliados; (v) la celebración de convenios con profesionales clínicos, centros y proveedores para brindar servicios complementarios a los usuarios; (vi) la adquisición, uso, explotación y licenciamiento de propiedad intelectual e industrial; y (vii) en general, la realización de todo acto, contrato u operación lícita relacionada, conexa o incidental con los fines anteriores."

Actividad preponderante SAT sugerida: "Servicios de diseño de sistemas de cómputo y servicios relacionados".

**Owner.** Enrique (constitución) + Contador especializado en RESICO PM ($1,500-3,500 MXN/mes desde mes 1).

**Timing.** 2-4 semanas realistas. Arrancar HOY.

---

## P0-02 · Convenio entre Accionistas (Shareholders' Agreement) 50/50

**Hallazgo.** 50/50 sin cláusulas de desempate = deadlock a la primera diferencia. Art. 266 LGSM establece que la Asamblea decide por mayoría → con 50/50 empatado, la sociedad se paraliza. Adicional: dos ejercicios sin publicar estados financieros disuelven la sociedad (art. 272 último párrafo).

**Ley aplicable.** LGSM arts. 266-272; CCF (obligaciones); tesis SCJN sobre pactos parasociales.

**Riesgo si se ignora.** Empresa paralizada al primer conflicto. Uno de los socios puede bloquear todo indefinidamente. Sin protocolo, en caso de fallecimiento las acciones van a herederos legales — las 2 niñas de Mariana no son herederas de Enrique en MX si no las adopta o testa a favor.

**Acción concreta.** Redactar y firmar convenio entre accionistas con:
- **Materias reservadas** que requieren unanimidad (venta de activos, endeudamiento >X, admisión de nuevos socios, cambios de estatutos)
- **Materias operativas** con voto de calidad del administrador (Enrique)
- **Mecanismo de desempate:** mediación → arbitraje CANACO → si persiste, buy-sell (shotgun o Russian roulette)
- **Vesting 3-4 años** (aunque son co-founders) — si alguno se va antes, no se lleva todo
- **Cláusula de sucesión:** si uno fallece, el otro tiene derecho de compra preferente a valor de tercero independiente
- **Non-compete + non-solicit** durante y 2 años post-salida
- **Drag-along + tag-along** para futura inversión externa

**Owner.** Cowork Comercial redacta borrador (te lo dejo el próximo sprint) → abogado externo valida ($3-5K MXN).

**Timing.** Firmar dentro de 30 días post-constitución.

---

## P0-03 · Verificar RESICO PF de ambos socios ANTES de constituir

**Hallazgo.** SAS puede tributar en RESICO PM (Cap. XII Título VII LISR, art. 206) — enorme ventaja de flujo de efectivo real vs devengado. PERO requisitos simultáneos: (a) todos socios personas físicas ✓, (b) **cada socio debe tributar en RESICO PF también**, (c) ingresos <$35M anuales ✓, (d) no actividades restringidas ✓.

**Ley aplicable.** LISR art. 206; RMF 2026.

**Riesgo si se ignora.** Si Enrique o Mariana NO están en RESICO PF hoy (p. ej., si Mariana factura como profesionista arrendadora), la SAS queda **expulsada automáticamente de RESICO PM al día uno** → tributa en régimen general (30% sobre devengado). Diferencia de flujo puede ser 20-40% vs el modelo financiero.

**Acción concreta.**
1. Enrique y Mariana descargan HOY su Constancia de Situación Fiscal actual (SAT app o Portal SAT).
2. Verificar que ambos estén en RESICO PF.
3. Si alguno no lo está: cambiar régimen ANTES del acto constitutivo de la SAS.
4. Si alguno tiene ingresos anuales >$3.5M MXN como PF (tope RESICO PF), no puede quedarse en RESICO PF → aceptar régimen general para la SAS.

**Owner.** Enrique + Mariana (5 minutos cada uno en SAT).

**Timing.** Esta semana, ANTES de agendar cita SAT para la SAS.

---

## P0-04 · Renombrar "Mi Diagnóstico Funcional" YA

**Hallazgo.** La palabra "diagnóstico" es reservada al acto médico. Usarla en UI, nombre de módulo, o cualquier comunicación al usuario auto-cataloga a ATP como prestador de servicios de salud bajo LGS arts. 32-34. Adicional, art. 79 LGS lista las profesiones con título obligatorio (incluye nutrición y medicina). Art. 250 Código Penal Federal: 1-6 años prisión + 100-300 días multa a quien sin título profesional realice actos propios de una profesión regulada.

**Ley aplicable.** LGS arts. 32-34 (servicios de salud), arts. 78-83 (profesiones), art. 79 (nutrición y dietología); Reglamento LGS Publicidad; CPF art. 250.

**Riesgo si se ignora.**
- Persona moral: multa COFEPRIS 2,000-16,000 UMA (~$248K - $1.85M MXN) por publicidad no autorizada + orden de retiro + posible clausura.
- Enrique (persona física, ingeniero sin cédula): riesgo penal art. 250 CPF si aparece como voz operativa que "diagnostica". Delito continuo.
- Mariana: sanción profesional del Colegio + suspensión de cédula si firma responsable sanitaria.

**Acción concreta — tabla de reemplazos (imperativa, aplica en toda la app):**

| Palabra actual (roja) | Reemplazo seguro |
|---|---|
| Diagnóstico | Evaluación · Análisis · Lectura funcional · Reflejo de tus datos |
| **Mi Diagnóstico Funcional** (título del módulo) | **Mi Radar Funcional** · **Mi Mapa Funcional** · **Mi Panel de Bienestar** |
| Prescripción / Recetar | Sugerencia · Recomendación educativa · Referencia |
| Tratamiento | Rutina · Práctica · Intervención de hábito · Programa de estilo de vida |
| Protocolo (clínico) | Programa · Plan de hábito · Ruta educativa |
| Cura / Sanar | Optimizar · Mejorar · Restaurar |
| Dosis (para suplementos personalizados) | Aporte sugerido · Cantidad de referencia · Rango habitual reportado |

**Redacción sugerida — disclaimer permanente en cada pantalla de resultado:**
> "Esta lectura es una **interpretación educativa** de tus datos, **no un diagnóstico médico**. Comparte estos resultados con tu profesional de salud antes de iniciar cualquier intervención."

**Owner.** Enrique (sweep de código con Claude Code) + Cowork Comercial (validar copy en landing).

**Timing.** Esta semana. Antes de TestFlight.

---

## P0-05 · Software as Medical Device (SaMD) — decisión estratégica

**Hallazgo.** COFEPRIS regula SaMD desde 2024 (aplica LGS + Reglamento de Insumos + NOM-241-SSA1-2020). Un software es SaMD si cumple al menos una de: diagnóstico, monitoreo de signos, recomendación de tratamiento, apoyo a decisiones médicas, predicción de riesgos clínicos. **ATP marca 4 de las 5** con el diseño actual. Clasificación probable: **Clase II** (medio riesgo). Requiere registro sanitario con documentación técnica, validación clínica, ISO 13485. Trámite 6-18 meses, ~$200K-$800K MXN.

**Ley aplicable.** LGS Título Décimo Segundo, Reglamento de Insumos para la Salud, NOM-241-SSA1-2020.

**Riesgo si se ignora.** Operar SaMD sin registro = infracción sanitaria (LGS 419-421, multa hasta 16,000 UMA ≈ $1.85M MXN por infracción) + orden de retirar el producto + posible aseguramiento. La sanción cae sobre la persona moral.

**Acción concreta — decisión estratégica (elige uno):**

**Camino A · Wellness limpio (recomendado para launch agosto):**
Redefinir ATP V1 como "herramienta de wellness y autocuidado". Quitar interpretación de labs con lenguaje clínico. Quitar dosis específicas de suplementos personalizadas. No devolver "score de salud" con nombre médico. Con esto sales del perímetro SaMD. Es lo que hacen Whoop, Oura, MyFitnessPal.

**Camino B · Registro SaMD:**
Aceptar que eres SaMD Clase II. Iniciar trámite YA (no llegas con registro para agosto, pero puedes lanzar con "aviso de funcionamiento" mientras). Costo alto.

**Camino híbrido (mi voto para tu caso):**
- **V1 público (launch agosto)** = Camino A limpio. Interpretación de labs es "lectura educativa", dosis son "rangos de referencia" no personalizadas, la "Edad ATP" es "estimación educativa".
- **HUB Fx (backend clínico con Mariana + clínicos afiliados)** = Camino B. Ahí sí interpretas labs con firma profesional, prescribes dosis, generas SOAP. Vive en entidad separada (S.C.) con médico titular responsable.

**Owner.** Enrique (decisión estratégica) + Cowork Comercial (mapa de qué modificar en app para Camino A) + Abogado sanitarista (si va Camino B, agendar YA).

**Timing.** Decisión esta semana. Cambios en app antes de agosto.

---

## P0-06 · Enrique NO aparece como voz clínica/técnica en la UI

**Hallazgo.** Enrique es ingeniero mecatrónico (sin cédula sanitaria). Si aparece como "quien interpreta labs" o "quien recomienda protocolos con dosis", Fiscalía puede tipificarle art. 250 CPF. Es delito continuo — cada usuario atendido es una consumación.

**Ley aplicable.** CPF art. 250 (usurpación de profesión); LGS art. 79.

**Riesgo si se ignora.** Penal directo a Enrique: 1-6 años prisión + 100-300 días multa.

**Acción concreta.**
- Toda recomendación clínica en la UI firma **"ATP" o "ARGOS"**, nunca "Enrique dice", "Mariana dice", "Humby recomienda" (esto último ya está flagueado en memoria interna).
- Enrique aparece públicamente como **CEO + Ingeniero mecatrónico + creador de la metodología de rendimiento** — no como voz clínica.
- Para la personalización de dosis + interpretación individual de labs → contratar **Director Médico titulado** (contrato de servicios, retenedor $15-40K MXN/mes) que valide guías clínicas embebidas. NO Mariana, que ella firma solo validación científica de contenido (marketing), no responsabilidad clínica del producto.

**Redacción sugerida en app (footer permanente):**
> "Contenido revisado por [Nombre Director Médico], Cédula Profesional [XXX]. ATP no sustituye consulta médica."

**Owner.** Enrique (contratar Director Médico) + Cowork Marketing (redacción bio pública).

**Timing.** Antes de agosto.

---

## P0-07 · Mariana NO firma como responsable sanitaria de la app

**Hallazgo (confirmación).** Tu lectura era correcta: si Mariana firma como responsable sanitaria del producto ATP, la exposición se traslada a ella persona física, no protege a la empresa. Por eso NO debe firmar como tal.

**Ley aplicable.** LGS art. 79 (responsabilidad profesional); Código de Ética del Colegio de Nutriólogos.

**Riesgo si se ignora (si Mariana firmara).**
- Sanción profesional del Colegio.
- Suspensión de cédula por publicidad o práctica desapegada.
- Responsabilidad civil directa por cualquier claim de la app que produzca daño a usuario.
- Enrique NO estaría protegido — ambos quedarían expuestos.

**Acción concreta.** Mariana firma solo:
- **Como Co-Founder y accionista al 50%** → propiedad económica, sin problema.
- **Como Chief Science Officer** → figura de comunicación / marketing.
- **Como avaladora científica del contenido específico** (marketing docs, guías educativas) → firma técnica, no legal del producto.

Mariana NO firma:
- ❌ Responsable sanitaria de la app.
- ❌ Administradora única.
- ❌ Representante legal.
- ❌ Prestadora del servicio de salud dentro de la app V1 pública.

Cuando abras HUB Fx (backend clínico) → ese servicio vive en **entidad separada (S.C. Sociedad Civil)** donde Mariana sí puede ser responsable clínica con su cédula. En V1 pública, no.

**Owner.** Enrique (decisión estructural) + Mariana (aceptar el planteamiento).

**Timing.** Antes de constitución de SAS.

---

## P0-08 · Actualizar Aviso de Privacidad a Nueva LFPDPPP 2025

**Hallazgo.** La LFPDPPP 2010 fue **abrogada**. Ley vigente hoy es la **Nueva LFPDPPP 2025** (DOF 20-mar-2025, última reforma 14-nov-2025). INAI extinguido → nueva autoridad **Secretaría Anticorrupción y Buen Gobierno (SABG)**. Amparo indirecto en juzgados del **30° Circuito en Aguascalientes**. Multas se duplican para datos sensibles → hasta ~$75.1M MXN (320,000 UMA × 2 × $117.31).

**Ley aplicable.** Nueva LFPDPPP 2025; arts. 8 (consentimiento), 36-40 (transferencias).

**Riesgo si se ignora.** Presentar quejas o notificar brechas al INAI (extinguido) equivale a no notificar. Multa por omisión escala a rango grave.

**Acción concreta.**

**1. Aviso de Privacidad Integral actualizado** — incluir:
- Identidad y domicilio del responsable (SAS constituida).
- **Oficial de Privacidad designado** (puede ser Enrique inicialmente): nombre + email `privacidad@somosatp.com`.
- Datos que se recaban (identidad, contacto, salud sensibles enumerados, biométricos, genéticos futuros, pago tokenizado, conversaciones IA).
- Finalidades separadas y granulares (necesarias vs. accesorias).
- **Fundamento legal** para tratamiento de datos sensibles.
- Transferencias internacionales enumeradas por proveedor con país y salvaguarda.
- Cambios al Aviso: notificación 30 días previa.
- Autoridad supervisora: **Secretaría Anticorrupción y Buen Gobierno**.
- Derechos ARCO con mecanismos concretos.

**2. Aviso de Privacidad Simplificado** en el signup, con link al integral.

**3. Checkboxes granulares NO pre-marcados**, por finalidad:
- Salud general (obligatorio para servicio)
- Ciclo menstrual / embarazo (opcional, gate del módulo)
- IA ARGOS con datos sensibles (opcional, gate del módulo)
- Transferencia internacional a proveedores en EE.UU. (obligatorio para servicio)
- Voz clínica futura (opcional, gate del HUB Fx)
- Marketing y comunicaciones (opcional)

**4. Log de auditoría:** timestamp, IP, versión del aviso, hash del texto aceptado.

**Redacción sugerida — checkbox datos sensibles:**
> "Acepto expresamente y por escrito que ATP trate mis **datos personales sensibles de salud** (síntomas, ciclo menstrual, embarazo, medicamentos, biomarcadores, estado emocional y, en su caso, información genética futura) para las finalidades descritas en el [Aviso de Privacidad Integral]. Entiendo que puedo revocar este consentimiento en cualquier momento desde Perfil → Privacidad."

**Owner.** Cowork Marketing (redacción de aviso) → Abogado externo (validación) → Enrique (implementación de checkboxes en app).

**Timing.** Aviso publicado antes del primer cobro. Checkboxes en app antes de TestFlight.

---

## P0-09 · Firmar DPAs con TODOS los procesadores internacionales

**Hallazgo.** Art. 36 Nueva LFPDPPP: transferencias requieren consentimiento + el receptor debe asumir **obligaciones equivalentes**. México NO tiene decisiones de adecuación tipo GDPR ni SCCs oficiales — hay que negociar cláusulas caso por caso. Sin DPAs, la infracción es grave (200-320,000 UMA), duplicada por datos sensibles → hasta $75.1M MXN.

**Ley aplicable.** Nueva LFPDPPP arts. 36-40.

**Riesgo si se ignora.** Multa máxima + posible orden de cese de tratamiento.

**Acción concreta — DPAs firmados con:**
1. **Anthropic** (Claude Sonnet 5 para ARGOS) — verificar Zero Data Retention activo, prohibir uso para entrenamiento.
2. **Google** (Gemini fallback) — mismos términos.
3. **ElevenLabs** (voz) — prohibición explícita de retención + no entrenamiento.
4. **Supabase** (base de datos) — DPA robusto, incluye subprocesadores.
5. **Sentry** (errores) — configurar para NO enviar datos personales (scrub PII).
6. **PostHog** (analítica) — configurar self-hosted o EU region si posible; alternativamente scrub PII.
7. **RevenueCat** — DPA estándar.
8. **Vercel** — DPA (donde vive somosatp.com y funnels).
9. **Stripe** y **Conekta** — DPA + datos tokenizados.

Cada DPA debe incluir:
- Prohibición de uso para entrenamiento del modelo (crítico para IA).
- Obligaciones equivalentes a responsable mexicano.
- Devolución/destrucción al terminar.
- Notificación de subencargados.
- Notificación de brechas ≤72h.

**Owner.** Enrique (solicitar DPAs a cada vendor — la mayoría los tiene listos, es firmar).

**Timing.** Antes del primer cobro.

---

## P0-10 · Consentimiento expreso Y por escrito para datos sensibles

**Hallazgo.** Nueva LFPDPPP mantiene exigencia de consentimiento **expreso y por escrito** para datos sensibles. Definición ahora enumera explícitamente: "estado de salud presente o futuro, información genética, creencias religiosas/filosóficas/morales, opiniones políticas y preferencia sexual". Firma electrónica avanzada bajo LFEA es equivalente a firma manuscrita.

**Ley aplicable.** Nueva LFPDPPP art. 8; Ley de Firma Electrónica Avanzada.

**Riesgo si se ignora.** Multa duplicada + posible penal 6 meses–5 años si hay lucro con datos sensibles (art. 67 nueva ley).

**Acción concreta (ver P0-08 punto 3 — checkboxes granulares).** Implementación técnica:
- Checkbox NO pre-marcado.
- Separado por finalidad.
- Timestamp + IP + hash del texto guardado en log de auditoría.
- Botón "Ver aviso completo" abre integral inline.

**Owner.** Enrique (implementación en app).

**Timing.** Antes de TestFlight.

---

## P0-11 · Edad mínima 18 años + verificación reforzada

**Hallazgo.** Nueva LFPDPPP prioriza interés superior del menor. Tratamiento de datos de <18 años requiere consentimiento del tutor. Mecanismos de verificación pendientes de reglamento (aún no publicado). En app de salud+ciclo+sexualidad+embarazo el riesgo mediático de un menor accediendo es catastrófico.

**Ley aplicable.** Nueva LFPDPPP; SIPINNA guías.

**Riesgo si se ignora.** Multa + posible responsabilidad civil de padres contra ATP + escándalo mediático.

**Acción concreta (postura conservadora para V1):**
1. **Edad mínima 18 años** en Términos.
2. Verificación reforzada en signup:
   - Fecha de nacimiento obligatoria (no basta checkbox).
   - Segundo prompt: "confirmo ser mayor de 18 años".
   - Si en algún test/onboarding el usuario declara <18: bloquear con mensaje "ATP aún no está disponible para menores en tu país; suscríbete al waitlist v2".
3. Considerar más adelante flujo de consentimiento parental documentado (email al tutor + firma digital). NO lanzar con menores en V1.

**Redacción sugerida (screen de bloqueo):**
> "ATP procesa datos sensibles de salud y solo está disponible para mayores de 18 años en México. En próximas versiones habilitaremos flujos con consentimiento parental."

**Owner.** Enrique (implementación de gate + T&C).

**Timing.** Antes de TestFlight.

---

## P0-12 · Módulo ARCO in-app + Oficial de Privacidad

**Hallazgo.** Nueva LFPDPPP mantiene los 4 derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) y ahora **tipifica como infracción** actuar "con negligencia o dolo en la sustanciación de las solicitudes ARCO". Plazos: **20 días hábiles para responder + 15 días adicionales para implementar**. Ejercicio gratuito para el titular.

**Ley aplicable.** Nueva LFPDPPP.

**Riesgo si se ignora.** Multa hasta 320,000 UMA (~$37.5M MXN) o duplicada por datos sensibles.

**Acción concreta.**
1. **Módulo ARCO in-app** en Perfil → Privacidad con 4 botones:
   - Descargar mis datos (JSON+PDF)
   - Rectificar
   - Cancelar cuenta (elimina todo)
   - Oponerme a finalidad específica
2. **Email de respaldo:** `privacidad@somosatp.com` con SLA interno 15 días hábiles.
3. **Responsable designado (Oficial de Privacidad):** puede ser Enrique inicialmente. Nombre + email en Aviso.
4. **Bitácora de solicitudes ARCO** con timestamp y respuesta (evidencia ante SABG).

**Owner.** Enrique (implementación).

**Timing.** Antes del primer cobro.

---

## P0-13 · Renovación automática — aviso 5 días + cancel 1-tap

**Hallazgo.** Reforma dic-2025 art. 76 Bis fracc. VIII LFPC: **notificar consumidor con al menos 5 días naturales de anticipación** a renovación automática + cancelación **inmediata** sin trámites desproporcionados. Si contrataste en 3 clicks, no puedes exigir llamada para cancelar.

**Ley aplicable.** LFPC art. 76 Bis (reforma DOF 12-dic-2025); vigente 13-dic-2025.

**Riesgo si se ignora.** Renovación **carece de efectos legales** (impugnable) → devolver cargos íntegros + multa art. 128 hasta $4.27M MXN por evento + tope acumulado $12.78M + bandera para acción colectiva.

**Acción concreta.**
1. **Cron job** de email + push **6 días antes** de renovación (buffer horarios). Copy: monto, fecha, botón "Cancelar mi renovación".
2. **Cancelación en app en un solo tap.** Está permitido un "retention flow" que pregunte "¿por qué te vas?", pero NO puede bloquear.
3. Guardar **log de que se envió el aviso** (evidencia ante PROFECO).
4. **Apple/Google IAP:** el aviso de 5 días queda cubierto por la propia store (Apple envía aviso). Documenta en T&C: "Para suscripciones vía App Store/Google Play, el aviso previo y la cancelación se realizan conforme a las políticas de la respectiva tienda, que cumplen con este requisito."

**Owner.** Enrique (cron + implementación) + Cowork Marketing (copy del email).

**Timing.** Antes del primer cobro con renovación.

---

## P0-14 · Reformular "Founders de por vida"

**Hallazgo.** LFPC art. 32 exige publicidad "veraz, comprobable, clara y exenta de textos que induzcan a error por engañosos o abusivos". "Acceso de por vida" incondicional a un servicio digital de una startup **no es comprobable** — vida útil depende de continuidad operativa. Cae en "exagerada/artificiosa".

**Ley aplicable.** LFPC art. 32; art. 127 (sanciones); art. 26 (acción colectiva).

**Riesgo si se ignora.** Multa $760 - $2.43M MXN + **acción colectiva** vía Concilianet + si Founders M1 recauda cash y ATP cierra en 3 años, cada Founder tiene acción individual por incumplimiento + posible penal por defraudación genérica si se prueba dolo.

**Acción concreta.**
- Sustituir "de por vida" por "de por vida del servicio" con condicionantes escritos.
- Establecer política de continuidad y sucesión (qué recibe el Founder si ATP cesa).
- NUNCA usar "vitalicio" sin cualificar. Cambia "acceso vitalicio" → "acceso Founder sin renovación mensual".

**Redacción sugerida — landing + T&C Founders:**
> "El Plan Founders M1 otorga acceso al Plan Pro de ATP sin costo mensual adicional durante toda la vigencia operativa de la plataforma ATP. En caso de que ATP cese operaciones comerciales por cualquier causa, el Founder recibirá: (i) exportación completa de sus datos personales de salud en formato estándar, (ii) reembolso prorrateado calculado sobre una vida esperada de referencia de 10 años a partir de su fecha de compra. ATP se compromete a notificar cualquier cese con 90 días de anticipación."

**Owner.** Cowork Marketing (reescribe landing + T&C Founders).

**Timing.** Antes de vender el primer Founder.

---

## P0-15 · Eliminar claim "-6 años en 6 meses" y afines

**Hallazgo.** LGS arts. 300-301: publicidad de "salud, tratamiento, rehabilitación" requiere autorización previa COFEPRIS. Art. 306.I: "calidad, propiedades y beneficios deberán ser comprobables". "-6 años en 6 meses" es **atribución de propiedad terapéutica/preventiva** sin evidencia clínica publicada + sin permiso COFEPRIS → **publicidad engañosa**.

**Ley aplicable.** LGS arts. 300-306, 310; Reglamento LGS Publicidad; LFPC art. 32.

**Riesgo si se ignora.** Multa COFEPRIS $248K-$2.49M MXN por evento + PROFECO por engañosa + class action de usuarios que "no bajaron su edad".

**Acción concreta.**
1. **Eliminar el claim numérico "-6 años en 6 meses"** de toda comunicación externa. Indefendible sin cohorte publicada peer-reviewed.
2. Reformular "bajar edad biológica" → **"mejorar tus marcadores de edad funcional estimada"** o **"avanzar hacia tu mejor versión biológica"**.
3. "Edad ATP" queda como **métrica propia y educativa**, no como diagnóstico ni promesa terapéutica.
4. Cada testimonio numérico ("bajé X años") lleva disclaimer visible: **"Resultado individual, no garantizado."**
5. **Tramitar aviso o permiso de publicidad COFEPRIS** (COFEPRIS-02-002-A, gratuito para servicios profesionales) para cualquier claim de salud.

**Redacción sugerida (footer legal permanente en landing + app):**
> "Edad ATP es una **estimación educativa** basada en tu perfil de hábitos, historia y biomarcadores autorreportados. **No es un diagnóstico médico ni una promesa de resultados.** Los resultados dependen de tu adherencia, genética y contexto individual."

**Owner.** Cowork Marketing (sweep de copy en landing) + Enrique (sweep en app).

**Timing.** Antes del primer cobro.

---

## P0-16 · "Dra. Mariana" — nunca antes del PhD titulado

**Hallazgo.** Art. 250 CPF sanciona con **1-6 años de prisión + multa 100-300 días** a quien "se atribuya el carácter de profesionista", "ofrezca públicamente sus servicios como profesionista" o "use un título sin tener derecho". "Doctorante" o "candidata a PhD" NO equivale a "Doctora". Publicitar a Mariana como "Dra. Mariana Zapata Doria" antes de titulación es usurpación de profesión (delito) + publicidad engañosa.

**Ley aplicable.** CPF art. 250; LFPC art. 32.

**Riesgo si se ignora.** Denuncia penal (1-6 años) contra Mariana + responsables de la publicidad + multa PROFECO + pérdida de credibilidad si se descubre.

**Acción concreta.**
- **NUNCA usar "Dra." antes del PhD titulado.**
- Usar textualmente: **"Mariana Zapata Doria, Nutrióloga Clínica (Cédula Profesional [XXX]), candidata a Doctorado en Ciencias Biomédicas por [Universidad]"**.
- Su cédula de Nutrición Clínica ES un título profesional válido para firmar en materia nutricional.
- Enrique: mantener "3× récord Guinness World Records" con enlace a ficha oficial GWR (comprobable, sin problema).
- Evitar títulos ambiguos ("experta", "científica") sin sustento verificable.

**Redacción sugerida — About / Founders:**
> "**Mariana Zapata Doria** — Nutrióloga Clínica con Cédula Profesional [XXX], especialista en medicina funcional, **candidata a Doctorado en Ciencias Biomédicas** por [Universidad]. Chief Science Officer y co-fundadora de ATP."

**Owner.** Cowork Marketing (sweep en landing + decks + material) + Enrique (sweep en app + redes).

**Timing.** Esta semana.

---

## P0-17 · Cortar ayuno de sardinas 1-5 días + ayunos 72h+ de la V1 pública

**Hallazgo.** LGS art. 306.IV prohíbe mensajes que "induzcan a conductas, prácticas o hábitos nocivos para la salud física o mental que impliquen riesgo". IMSS boletín 410/2023 alerta contra ayuno intermitente "sin consultar profesionales de la nutrición". App que **prescribe** ayuno de 5 días sin nutriólogo firmante por usuario cae en: (i) art. 306.IV LGS (multa COFEPRIS) + (ii) art. 250 CPF si un no-titulado firma.

**Ley aplicable.** LGS art. 306.IV; IMSS boletín 410/2023; CPF art. 250; CCF art. 1913 (responsabilidad objetiva).

**Riesgo si se ignora.** Multa COFEPRIS 2,000-16,000 UMA (~$248K-$1.98M) + retiro inmediato de contenido + si ocurre daño (rabdomiólisis, hipoglucemia grave, TCA): responsabilidad civil objetiva de empresa + posible penal a autor firmante.

**Acción concreta.**
1. **Marcar ayuno de 72h+ y "ayuno de sardinas" como protocolos NO ejecutables desde la V1 pública.** Se **describen** en contenido educativo, no se **prescriben**.
2. Estos protocolos se mueven al **HUB Fx** (donde hay médico/nutriólogo real firmando por paciente).
3. Para 16:8 y 20:4 en usuarios generales: dejar como **sugerencia educativa self-selected**, nunca push del sistema.
4. Firma visible: **"Contenido revisado por Mariana Zapata Doria, Nutrióloga Clínica, Cédula Profesional [XXX]"** — sin cédula visible, cualquier prescripción alimentaria está expuesta.

**Redacción sugerida — banner al iniciar cualquier ayuno >24h:**
> "El ayuno prolongado (más de 24 horas) puede tener contraindicaciones médicas. **No lo inicies sin evaluación de tu médico o nutriólogo**, especialmente si tomas medicamentos, tienes diabetes, historia de trastorno de conducta alimentaria, estás embarazada, en lactancia o eres menor de 18 años. ATP no sustituye consulta médica."

**Owner.** Enrique (cambio en app — mover protocolos a HUB Fx).

**Timing.** Antes de TestFlight.

---

## P0-18 · Wim Hof — warnings obligatorios + gates técnicos

**Hallazgo.** Precedente activo en California: **Metzger v. Innerfire BV (2022)** por muerte por ahogamiento de menor de 17 años tras practicar el método. Documentadas **13-18 muertes** por ahogamiento (shallow water blackout) + 6 por paro cardiaco en agua fría. Demanda incluye **fraudulent concealment y false advertisement**. En MX aplica responsabilidad objetiva CCF art. 1913 + publicidad engañosa LFPC art. 32. Sin caso mexicano aún, pero mecanismo legal claro.

**Ley aplicable.** CCF art. 1913 (responsabilidad objetiva); CCF art. 1916 (daño moral); LFPC art. 32; CPF art. 60/76 (homicidio culposo por negligencia).

**Riesgo si se ignora.** Si un usuario MX hace hiperventilación + entra a agua y sufre síncope → **homicidio culposo por negligencia** contra representante legal + demanda civil por daño moral y patrimonial. El precedente Wim Hof muestra que "los warnings estaban en el sitio" no bastó ante alegatos de fraudulent concealment.

**Acción concreta.**
1. **Prohibir explícitamente en app**: "No practiques la respiración cerca del agua ni antes de entrar al agua (regadera, tina, alberca, mar). Nunca en solitario."
2. **Gate por checkbox obligatorio** antes del primer uso (no skippable).
3. **Bloquear (gate técnico)** hiperventilación en usuarios con: embarazo declarado, epilepsia, hipertensión no controlada, cardiopatía, historia de síncopes, menores de 18.
4. Máximo 3 rondas guiadas por sesión; retención pasiva máx. 90 segundos con countdown.

**Redacción sugerida — pantalla previa obligatoria:**
> "La respiración intensa (hiperventilación) puede causar mareo o pérdida de conciencia. **NUNCA la practiques dentro o cerca del agua, ni al conducir.** Detén la sesión si sientes mareo intenso, dolor en el pecho o palpitaciones. Consulta a tu médico antes si tienes cardiopatía, epilepsia, hipertensión, o estás embarazada."

**Owner.** Enrique (implementación en app).

**Timing.** Antes de TestFlight.

---

## P0-19 · S.O.S. Crisis de Pánico con IA generativa libre → cortar

**Hallazgo.** Reforma LGS Salud Mental DOF 16-may-2022 establece que todo prestador de servicios de salud mental debe informar de manera veraz y completa, con consentimiento informado. Un contenido de **IA generativa libre** dirigido a persona en crisis puede tipificarse como "ejercicio de profesión sin título" (art. 250 CPF) si se presenta como intervención de emergencia. Además: si un usuario en ideación suicida usa "S.O.S." y no recibe derivación a línea de crisis, la responsabilidad civil por daño moral en caso de outcome grave es **prácticamente indefendible**.

**Ley aplicable.** LGS Título Tercero Capítulo VII (Salud Mental); reforma DOF 16-may-2022; CPF art. 250; CCF art. 1916.

**Riesgo si se ignora.** Riesgo reputacional catastrófico + rechazo App Store/Google Play (ambas revisan módulos "mental health crisis" con lupa) + demanda civil + potencial penal.

**Acción concreta (recomendación crítica):**

**Opción A · Eliminar módulo IA generativa libre en V1.** Es la asimetría de riesgo/beneficio peor del stack: un solo caso mal manejado hunde la marca.

**Opción B · Guiones pre-aprobados + gates obligatorios:**
1. **Primera pantalla siempre** en cualquier contenido S.O.S., ansiedad, pánico, ideación: **"Si estás en crisis o piensas hacerte daño, llama YA a la Línea de la Vida: 800-911-2000 (gratis, 24/7)."**
2. La meditación NO se genera ad-hoc por IA. Guiones pre-aprobados por Mariana (o profesional de salud mental con cédula), auditados. La IA solo **reproduce** el guion elegido.
3. Botón "hablar con alguien ahora" siempre visible.

**Mi voto:** Opción A para V1. Opción B para V1.1 con validación clínica formal.

**Redacción sugerida — banner permanente en Mente > SOS:**
> "Si sientes que puedes hacerte daño, o alguien cercano corre peligro, llama de inmediato a la **Línea de la Vida: 800-911-2000** (24/7, gratis). También puedes acudir a urgencias del hospital más cercano. ATP no sustituye atención profesional en crisis."

**Owner.** Enrique (decisión + implementación).

**Timing.** Antes de TestFlight.

---

## P0-20 · Gate técnico DURO embarazo/lactancia

**Hallazgo.** Si la app pregunta "¿estás embarazada?" y el usuario dice "sí", NO bloquear protocolos de alto riesgo es responsabilidad civil directa por acto propio (CCF art. 1910). Estándar es "diligencia esperable de un prestador razonable con información". El riesgo penal más alto del stack: **homicidio culposo si outcome fatal en feto viable**.

**Ley aplicable.** LGS art. 306.IV; CCF arts. 1910, 1913, 1916; CPF (homicidio culposo).

**Riesgo si se ignora.** Demanda por daño moral y patrimonial en pérdida de embarazo, parto prematuro, u óbito atribuible a protocolo + posible penal.

**Acción concreta — GATE TÉCNICO DURO (no bypasable) en embarazo o lactancia:**

**Bloquear absolutamente:**
- Ayunos >12 horas
- Wim Hof (respiración intensa)
- Inmersión en frío <15°C
- Ayuno de sardinas
- Cualquier suplemento no verde en categoría B
- Sauna >20 min
- HIIT sin approve médico
- Cetogénica estricta

**El bloqueo es HARD gate** (no bypasable con "entendí los riesgos"), con mensaje:
> "Este protocolo no está disponible durante embarazo o lactancia. Consulta con tu ginecólogo(a) para pautas seguras en esta etapa."

**Módulo "ATP Embarazo"** trae solo protocolos validados por especialista MFM/ginecología.

**Owner.** Enrique (implementación gates + Mariana valida lista de protocolos permitidos en embarazo).

**Timing.** Antes de TestFlight.

---

## P0-21 · Sello BHA — publicar metodología o cancelar

**Hallazgo.** Difamación federal despenalizada en 2007 (art. 350 CPF derogado). Queda vía civil por **daño moral** (CCF art. 1916) + **competencia desleal** (LFPPI art. 386.IX — desprestigio de establecimiento, productos o servicios). Un sello que califica marcas con criterios subjetivos, sin metodología pública, sin derecho de réplica, sin evidencia científica citada, es **altamente demandable**.

**Ley aplicable.** CCF art. 1916; LFPPI art. 386.IX; jurisprudencia daño moral (SCJN tesis 233775).

**Riesgo si se ignora.** Demanda civil por daño moral (indemnización + retiro + rectificación pública) por parte de marcas calificadas negativamente. Demanda plausible y **ganadora** en México si BHA es subjetivo.

**Acción concreta — para que BHA sea legalmente defendible:**
1. **Publicar la metodología BHA completa** en URL pública, versionada, con criterios objetivos (ingredientes prohibidos, presencia de aceites vegetales industriales, edulcorantes, dosis efectiva de activo, transparencia del fabricante). Sin metodología pública → indefendible.
2. **Referencias científicas citadas** para cada criterio (por qué un aditivo baja el score).
3. **Derecho de réplica formal**: cada marca calificada puede solicitar reevaluación con formulario público, plazo de respuesta, publicación de la disputa.
4. **Lenguaje neutro**: "BHA score 3/10" en vez de "producto tóxico" o "no recomendado" (adjetivos son demandables; scores son opiniones informadas).
5. **Disclaimer visible**: "BHA es una evaluación propietaria de ATP basada en criterios públicos. No sustituye información nutrimental oficial ni recomendación médica. Las marcas pueden solicitar reevaluación."
6. **Guardar toda evidencia** que soporta cada calificación (screenshots de etiqueta, tabla nutrimental, ingredientes). Sin evidencia archivada, no hay defensa.

**Recomendación alternativa (Enrique dijo "podemos quitarlo"):** **NO lanzar sello BHA en V1 pública.** Diseñar bien, publicar metodología, y activar en V2 cuando esté auditable.

**Owner.** Enrique (decisión) + Cowork Marketing (metodología pública si va) + Abogado externo (redactar derecho de réplica).

**Timing.** Antes de publicar cualquier score negativo.

---

## P0-22 · Testimoniales con nombre + foto → contratos + consentimiento

**Hallazgo.** Reglamento LGS Materia de Publicidad regula testimonios en publicidad de salud; testimonios sobre efectos en salud requieren autorización COFEPRIS. Adicional: uso de imagen + datos personales sensibles requiere consentimiento expreso bajo LFPDPPP.

**Ley aplicable.** Reglamento LGS Publicidad; Nueva LFPDPPP arts. 8-9.

**Riesgo si se ignora.** Multa COFEPRIS + SABG (privacidad, hasta 320,000 UMA).

**Acción concreta.**
1. **Contrato de cesión de imagen firmado** por cada testimoniante (nombre, foto, video, claim específico, vigencia, revocabilidad, medios).
2. **Consentimiento expreso ARCO + datos sensibles** (LFPDPPP).
3. Cada testimonio numérico ("bajé X años") disclaimer visible: **"Resultado individual, no garantizado."**
4. Someter testimoniales a permiso COFEPRIS junto con material publicitario del launch.

**Owner.** Cowork Marketing (contrato tipo + captura de consentimientos) + Enrique (obtener firmas).

**Timing.** Antes de publicar cualquier testimonio.

---

## P0-23 · Postura "no antipirético" en fiebre → red flags obligatorios

**Hallazgo.** LGS art. 306.V prohíbe mensaje que "desvirtúe o contravenga los principios que en materia de tratamiento de enfermedades establezca la Secretaría de Salud". Guía de Práctica Clínica SSA sobre fiebre pediátrica recomienda antipirético cuando >38.5°C o hay malestar. Un contenido que **desincentiva** antipirético sin señalar cuándo buscar atención médica cae en art. 306.IV (inducir a hábito nocivo).

**Ley aplicable.** LGS art. 306.IV y V; CCF art. 1913.

**Riesgo si se ignora.** Demanda civil por daño moral en outcome grave (convulsión febril, aborto, deshidratación). La filosofía "acompañar la fiebre" es defendible **como preferencia** del usuario, no como **default silente**.

**Acción concreta.**
1. **Fiebre dispara screening obligatorio**: temperatura, duración, edad, embarazo, síntomas rojos (rigidez de nuca, dificultad respiratoria, sarpullido, alteración mental).
2. Si **>39°C, o >48h, o menor de 3 meses, o embarazada, o síntoma rojo → card obligatoria "Busca atención médica ahora"**, no ofrecer el protocolo "acompañar".
3. Para el resto: el protocolo "acompañar" es **opt-in explícito**, con disclaimer.

**Redacción sugerida:**
> "La fiebre es una respuesta del sistema inmune. Puedes acompañarla con hidratación y descanso **cuando es leve y controlada**. **Busca atención médica de inmediato** si supera 39°C, dura más de 48h, ocurre en menor de 3 meses o en embarazo, o se acompaña de rigidez de nuca, dificultad respiratoria, confusión o sarpullido. Esta es información educativa; la decisión de tomar antipirético queda entre tú y tu médico."

**Owner.** Enrique (implementación screening) + Mariana (validar umbrales clínicos).

**Timing.** Antes de TestFlight.

---

## P0-24 · Tramitar Aviso/Permiso de Publicidad COFEPRIS

**Hallazgo.** LGS arts. 300-301: publicidad "salud, tratamiento de enfermedades, rehabilitación" requiere aviso/permiso previo COFEPRIS. Landing somosatp.com y comunicaciones ATP entran en esta categoría por los claims de salud. Trámite: **COFEPRIS-02-002-A**, gratuito para servicios profesionales.

**Ley aplicable.** LGS arts. 300-306; Reglamento LGS Publicidad.

**Riesgo si se ignora.** Multa COFEPRIS $248K-$2.49M MXN por evento; orden de retiro; en reincidencia, suspensión.

**Acción concreta.**
1. Preparar dossier de evidencia científica que respalda los claims permitidos post-sweep (matriz V7/V6 + literatura).
2. Tramitar **aviso/permiso de publicidad COFEPRIS** para landing + material del launch.
3. Puede iniciarse ANTES de la constitución de SAS (a nombre de Enrique persona física) y transferirse.

**Owner.** Enrique + Gestor especializado (~$5-10K MXN) o abogado sanitarista.

**Timing.** Iniciar esta semana. Aprobación 4-8 semanas típicamente.

---

# 🟡 P1 — ANTES DE STORES (App Store + Play Store)

## P1-25 · Registrar marca ATP + ARGOS en IMPI

**Ley:** Ley Federal de Protección a la Propiedad Industrial.
**Riesgo:** perder derecho de exclusividad si un tercero registra antes.
**Acción:** trámite IMPI ~$3-5K MXN por marca + gestor. Categoría 9 (software) + 42 (SaaS) + 44 (servicios médicos).
**Owner:** Enrique + gestor.
**Timing:** próximas 4-6 semanas.

## P1-26 · Contratar Director Médico externo (no Mariana)

**Riesgo:** sin firma profesional visible para contenido personalizado, exposición P0-04 y P0-06 resurge.
**Acción:** retenedor $15-40K MXN/mes con médico general o especialista funcional titulado. Revisa guías clínicas embebidas en algoritmo.
**Owner:** Enrique.
**Timing:** antes de HUB Fx (opcional pre-launch V1 si va Camino A limpio).

## P1-27 · DPIA documentada para HUB Fx (voz+IA)

**Ley:** Nueva LFPDPPP (evaluación de impacto para tratamientos alto riesgo).
**Acción:** documentar formalmente la evaluación de impacto de privacidad del flujo HUB Fx.
**Owner:** Cowork Marketing (borrador) + Enrique (aprueba) + Abogado (valida).
**Timing:** antes de habilitar HUB Fx (post-launch V1).

## P1-28 · Testamentos Enrique + Mariana

**Riesgo:** sin testamento, tus acciones NO van a Mariana ni a sus niñas.
**Acción:** testamento notarial ~$3-5K MXN cada uno.
**Owner:** Enrique + Mariana con notario.
**Timing:** próximas 4-6 semanas.

---

# 🟢 P2 — DEUDA TOLERABLE

## P2-29 · Vertical Clínica ATP (S.C. Sociedad Civil)

Cuando abras HUB Fx con clínicos afiliados, constituir S.C. separada donde Mariana puede ser responsable clínica. Costo ~$8-15K MXN con notario. Timing: cuando revenue de HUB Fx justifique.

## P2-30 · Registro sanitario SaMD (si va Camino B en HUB Fx)

Trámite 6-18 meses, ~$200K-$800K MXN. Solo si HUB Fx pretende ser Software as Medical Device Clase II.

## P2-31 · Fideicomiso familiar

Para blindar casa/activos personales de eventual embargo por demanda a ATP. Costoso pero es la protección de fondo. Timing: cuando revenue ATP supere $5M/año.

## P2-32 · Seguros

- **Product liability** para ATP (para la persona moral).
- **Professional liability** para Mariana en vertical clínica futura.
Presupuesto: $30-80K MXN/año combinado.

## P2-33 · Migración SAS → SAPI cuando llegue capital externo

Presupuestar $100K MXN transformación cuando cierres term sheet con VC/ángel institucional. SAS es puente. VC = SAPI sí o sí.

---

# CHECKLIST OPERATIVO — ORDENAMIENTO DÍA POR DÍA

## Semana 1 (2026-07-22 al 07-28)
- [ ] Verificar Constancia de Situación Fiscal Enrique + Mariana (RESICO PF?)
- [ ] Agendar cita SAT Querétaro para RFC persona moral SAS
- [ ] Sweep de copy P0-04 (renombrar "Diagnóstico Funcional" → "Radar Funcional")
- [ ] Sweep de copy P0-15 (eliminar "-6 años en 6 meses")
- [ ] Sweep de copy P0-16 ("Dra. Mariana" → "Nutrióloga Clínica + Cédula")
- [ ] Iniciar solicitud DPAs con Anthropic, Google, ElevenLabs, Supabase, Sentry, PostHog, RevenueCat, Stripe, Conekta
- [ ] Iniciar trámite Aviso/Permiso Publicidad COFEPRIS (P0-24)

## Semana 2 (2026-07-29 al 08-04)
- [ ] Constituir SAS en tuempresa.gob.mx
- [ ] Tramitar RFC persona moral SAS
- [ ] Cowork Marketing redacta borrador Aviso de Privacidad Integral + Simplificado (P0-08)
- [ ] Cowork Marketing redacta borrador Convenio entre Accionistas (P0-02)
- [ ] Cowork Marketing redacta borrador T&C v1 con reformulación Founders (P0-14)
- [ ] Enrique implementa gates técnicos embarazo/lactancia (P0-20)
- [ ] Enrique implementa warnings + gates Wim Hof (P0-18)

## Semana 3 (2026-08-05 al 08-11)
- [ ] Enrique implementa checkboxes granulares (P0-10)
- [ ] Enrique implementa módulo ARCO in-app (P0-12)
- [ ] Enrique implementa cron aviso renovación 5 días (P0-13)
- [ ] Enrique implementa gate edad 18+ verificación reforzada (P0-11)
- [ ] Enrique implementa screening obligatorio fiebre (P0-23)
- [ ] Enrique decide y ejecuta corte S.O.S. Crisis de Pánico (P0-19)
- [ ] Enrique mueve ayuno sardinas + >72h a HUB Fx (P0-17)
- [ ] Contratar abogado(a) externo(a) especialista (validación paquete completo)

## Semana 4 (2026-08-12 al 08-18)
- [ ] Firmar Aviso de Privacidad definitivo (post-abogado)
- [ ] Firmar T&C definitivos (post-abogado)
- [ ] Firmar Convenio entre Accionistas (post-abogado)
- [ ] Cerrar DPAs pendientes
- [ ] Confirmar aviso publicidad COFEPRIS
- [ ] Firmar Oficial de Privacidad designado
- [ ] Testing final compliance en TestFlight
- [ ] **VENTANA ABIERTA PARA PRIMER COBRO FOUNDERS** ✓

## Post-launch (semanas 5+)
- [ ] Registro de marcas IMPI (P1-25)
- [ ] Contratar Director Médico externo si aplica (P1-26)
- [ ] Testamentos (P1-28)
- [ ] Monitorear publicación Reglamento Nueva LFPDPPP en DOF

---

# COSTO TOTAL ESTIMADO P0 (compatible con crisis financiera)

| Concepto | Costo MXN |
|---|---|
| Constitución SAS en gob.mx | $0 |
| Trámite RFC persona moral (gestoría opcional) | $500-2,000 |
| Aviso Publicidad COFEPRIS (COFEPRIS-02-002-A, gratuito) | $0 |
| Gestor COFEPRIS (opcional) | $5,000-10,000 |
| Abogado(a) validación paquete completo (Aviso Privacidad + T&C + Convenio Accionistas + revisión SaMD) | $15,000-25,000 |
| Contador RESICO PM mes 1-3 | $4,500-10,500 |
| **TOTAL P0** | **$25,000-47,500** |

**Reserva para P1 (próximos 3 meses):**
- Marcas IMPI: $6,000-10,000
- Testamentos: $6,000-10,000
- Director Médico retenedor (si va): $15,000-40,000/mes

---

# FUENTES CITADAS (todas oficiales o firma reconocida)

## Marco general
- Ley General de Sociedades Mercantiles: https://mexico.justia.com/federales/leyes/ley-general-de-sociedades-mercantiles/capitulo-xiv
- Ley General de Salud: https://www.diputados.gob.mx/LeyesBiblio/pdf/LGS.pdf
- Reglamento LGS Materia Publicidad: https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LGS_MP.pdf
- Código Penal Federal art. 250: https://mexico.justia.com/federales/codigos/codigo-penal-federal/libro-segundo/titulo-decimotercero/capitulo-vii/
- Nueva LFPDPPP 2025: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Ley Federal de Protección al Consumidor: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf
- Ley Fintech (LRITF): https://www.diputados.gob.mx/LeyesBiblio/pdf/LRITF.pdf

## SAS 2026
- Portal oficial Secretaría de Economía: https://www.gob.mx/tuempresa/articulos/crea-tu-sociedad-por-acciones
- Cambios RMF 2026: https://amcpdf.org.mx/consideraciones-2026-para-las-sociedades-por-acciones-simplificadas-sas/
- Tope ingresos 2026: https://idconline.mx/comercio-exterior/2026/01/09/sas-2026-actualizan-tope-de-ingresos-anuales
- RESICO PM: https://rfcmexico.com/resico-personas-morales/

## COFEPRIS / Sanitario
- Regulación SaMD: https://saluddigital.com/big-data/la-regulacion-de-software-y-aplicaciones-medicas-y-los-avances-de-la-cofepris-en-mexico/
- Publicidad médica en redes 2025: https://avisopublicidadcofepris.com/post/regulacin-de-publicidad-mdica-en-redes-sociales-cofepris
- Suplementos alimenticios: https://transparencia.cofepris.gob.mx/index.php/es/marco-juridico/normas-oficiales-mexicanas/suplementos

## Privacidad
- Análisis EY: https://www.ey.com/es_mx/technical/tax/boletines-fiscales/nueva-ley-federal-proteccion-datos-personal-posesion-particulares
- Análisis Basham: https://basham.com.mx/en/nueva-ley-federal-de-proteccion-de-datos-personales-en-posesion-de-los-particulares-publicada-en-el-diario-oficial-de-la-federacion/
- Análisis Garrigues: https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce

## PROFECO / LFPC
- Reforma LFPC dic-2025: https://www.gtlaw.com/en/insights/2025/12/reformas-a-la-ley-federal-de-proteccion-al-consumidor
- PROFECO orientación: https://www.gob.mx/profeco/prensa/que-las-suscripciones-digitales-no-afecten-tu-presupuesto-profeco-te-orienta

## Precedentes protocolos
- Wim Hof litigio California: https://www.outsideonline.com/outdoor-adventure/exploration-survival/wim-hof-california-lawsuit/
- IMSS alerta ayuno intermitente: https://www.imss.gob.mx/prensa/archivo/202308/410
- Reforma LGS Salud Mental 2022: https://www.dof.gob.mx/nota_detalle.php?codigo=5652074&fecha=16/05/2022

---

# CIERRE

**El camino es claro:** cirugía de copy + constitución SAS + Aviso Privacidad nuevo + DPAs + cortar 3 features + gates técnicos + tramitar aviso COFEPRIS. Con ejecución disciplinada en las próximas 4 semanas, la ventana de agosto para primer cobro Founders **queda legalmente abierta**.

**Lo que NO se resuelve con este dictamen** (y necesita abogado externo firmando):
- Validación del Aviso de Privacidad definitivo (Basham, Galicia, Garrigues, Uhthoff, o especialista local en QRO)
- Validación T&C definitivos
- Redacción y firma del Convenio entre Accionistas
- Firma del acta constitutiva ante fedatario público (aunque SAS es online, notario aporta seguridad jurídica)
- Contratos con Director Médico externo, testimoniantes, futuros clínicos afiliados
- Trámite formal permiso publicidad COFEPRIS

**Presupuesto realista para abogado(a) externa validando el paquete completo:** $15-25K MXN si llega con este dictamen como brief pre-hecho. Sin este dictamen sería $40-80K.

**Próximo paso sugerido:** que Enrique lea este dictamen, marque decisiones (Camino A limpio vs híbrido en SaMD, Opción A vs B en S.O.S., prioridad de features a cortar), y luego pelotéamos el borrador de Aviso de Privacidad + Convenio entre Accionistas + T&C para dejar el paquete listo para validación externa.
