# 🔧 BRIEF PARA COWORK DEVELOPER · Compliance Scan + Plan de Cirugía de la App

**Fecha:** 2026-07-21
**De:** Cowork Comercial/Legal (dictamen) → **Para:** Cowork Developer (ejecución en código)
**Objetivo doble:**
1. **Ejecutar** los cambios ya decididos (Parte A/B/C)
2. **Escanear** toda la app con la rejilla de criterios (Parte D) y **regresar un inventario completo** de todo lo que no cumple, para que Enrique decida punto por punto.

**Fuente:** `DICTAMEN_LEGAL_NIVEL_A_2026-07-21.md` (mismo folder). Léelo si necesitas el detalle legal de cada punto.

**Ventana:** primer cobro Founders en AGOSTO 2026. Estos cambios deben estar antes de TestFlight/submit.

---

## ⚠️ PRIME DIRECTIVE (no negociable)

**La firma de Mariana NO es respaldo legal.** Mariana es Chief Science Officer y valida el sustento **científico** del contenido educativo — NO es responsable clínica del producto, NO es responsable sanitaria, NO firma como avaladora legal de nada dentro de la app. Cualquier texto, pantalla, PDF, o metadata que ponga a Mariana (o a cualquier persona con cédula) como "responsable", "avala", "respalda médicamente", "supervisa clínicamente" el producto → **se elimina o se reformula**. Su nombre solo puede aparecer como autora de contenido educativo específico, nunca como escudo de responsabilidad del servicio.

**Filosofía de Enrique aplicada:** lo que tiene que irse, se va. Lo que se puede cambiar, se cambia. Lo que se reescribe, se reescribe. No optimices por conservar features — optimiza por sacar el riesgo de la familia. Cuando dudes entre "lo dejo con disclaimer" vs "lo quito", **default a quitarlo** y lo discutimos.

---

## LAS 4 DECISIONES YA CERRADAS (marco de todo el scan)

| # | Decisión | Implicación para el código |
|---|---|---|
| 1 | **Camino A — Wellness limpio** | La app V1 NO es dispositivo médico (SaMD). No diagnostica, no prescribe, no trata. Todo es "educativo / autocuidado / estilo de vida". |
| 2 | **S.O.S. Crisis de Pánico → ELIMINAR en V1** | El módulo de crisis con IA generativa libre se saca completo. |
| 3 | **Sello BHA (evaluar MARCAS) → CANCELAR** | Se elimina cualquier evaluación pública de marcas de terceros con nombre. |
| 3b | **Score de alimentos/suplementos por ATRIBUTOS → SE QUEDA** | El food scan y el score de suplementos siguen, PERO evaluando el producto/ingredientes específicos que el usuario escanea, NO rankeando marcas. Ver reglas en Parte C. |
| 4 | **Director Médico externo → NO en V1** | Mariana como CSO/validadora científica es suficiente en Camino A. Sin responsable clínico interno. |

---

# PARTE A — LO QUE SE VA (eliminar o mover fuera de V1 pública)

Cada uno de estos se **corta de la V1 pública**. Algunos se mueven al HUB Fx (backend clínico futuro, entidad separada). El dev debe reportar CÓMO está implementado hoy cada uno y proponer la vía de corte más limpia (feature flag, remove, gate).

### A1 · Módulo "S.O.S. crisis de pánico" con IA generativa
- **Qué:** meditación/intervención guiada por IA generativa libre para crisis de pánico.
- **Acción:** ELIMINAR de V1. No feature-flag apagado — sacar del build o gate detrás de flag `false` permanente documentado.
- **Reportar:** dónde vive (archivo/componente), si usa ARGOS/LLM en tiempo real, qué otros contenidos de Mente tocan "pánico/ansiedad/crisis/suicidio/autolesión".
- **Nota:** cualquier OTRO contenido de Mente que toque crisis, ideación, autolesión → aplicar regla P0-19 (banner Línea de la Vida 800-911-2000 como primera pantalla) o eliminar. Reportar todos.

### A2 · Ayuno de sardinas (1-5 días) como protocolo ejecutable
- **Qué:** protocolo de ayuno exclusivo de sardinas 1-5 días, prescrito/asignable al usuario.
- **Acción:** quitar como **protocolo ejecutable** de la V1 pública. Puede quedar como **contenido educativo descriptivo** (artículo/lectura) SIN botón "iniciar este ayuno" ni tracking ni asignación. La versión ejecutable/supervisada se mueve a HUB Fx.
- **Reportar:** cómo está hoy (¿es un protocolo con timer? ¿asignable? ¿tiene tracking?), y qué se necesita para dejarlo solo-lectura.

### A3 · Ayunos prolongados 72h+ como protocolo ejecutable
- **Qué:** ayunos de 72 horas o más, ejecutables desde la app.
- **Acción:** mismo tratamiento que A2. Educativo sí, ejecutable no en V1 pública. Los IF cortos (16:8, 20:4, OMAD hasta ~48h) SÍ se quedan como **self-selected educativo** (no push del sistema).
- **Reportar:** inventario completo de protocolos de ayuno con su duración, si son push (asignados por sistema/ARGOS) o pull (elegidos por usuario), y cuáles cruzan 48h.

### A4 · Sello "BHA" / evaluación pública de marcas de terceros
- **Qué:** "Beat Health Additives" o cualquier sistema que califique MARCAS específicas de suplementos/alimentos de terceros con nombre.
- **Acción:** ELIMINAR toda evaluación que nombre marcas de terceros con un juicio publicable. El SCORE POR ATRIBUTOS del producto escaneado SE QUEDA (ver C7). La diferencia: "este magnesio en forma óxido = 4/10 en biodisponibilidad" (OK) vs "Suplementos XYZ = malo" (fuera).
- **Reportar:** dónde vive el BHA, si hay base de datos de marcas calificadas, si hay sellos/rankings públicos, y qué queda si se remueve la capa de marca.

### A5 · Cualquier feature que requiera cédula para operar legalmente
- **Qué:** interpretación de labs con lenguaje clínico + dosis personalizadas por usuario + generación de "diagnóstico".
- **Acción:** en Camino A, estas NO desaparecen pero se **reformulan** a educativas (ver Parte B). Si alguna NO se puede reformular a educativa sin perder sentido → reportarla como candidata a mover a HUB Fx.
- **Reportar:** toda feature donde la app dé una recomendación individualizada de dosis, fármaco, o interpretación clínica que un regulador leería como "acto médico".

---

# PARTE B — LO QUE SE MODIFICA (reescribir / renombrar / reestructurar)

### B1 · Renombrar "Mi Diagnóstico Funcional" (y toda la palabra "diagnóstico")
- **Regla:** la palabra "diagnóstico" NO aparece en ninguna parte user-facing (UI, títulos, botones, PDFs, notificaciones, onboarding, ARGOS system prompt, mensajes de ARGOS, metadata de stores).
- **REEMPLAZOS FINALES CERRADOS POR ENRIQUE (usar exactamente estos, no inventar):**

| Palabra roja | Reemplazo FINAL |
|---|---|
| **Mi Diagnóstico Funcional** (nombre del módulo) | **Mi Mapa Funcional** |
| Diagnóstico (palabra suelta) | **Evaluación** |
| Protocolo (según tipo — ver regla abajo) | **Práctica** (una sesión) · **Ruta** (multi-día/programa) |
| Prescripción / Recetar | **Sugerencia** |
| Tratamiento | **Rutina** |
| Dosis (suplemento) | **Aporte sugerido** |
| Paciente (en app pública) | **Usuario** |
| Cura / Sanar (residual, sin decisión explícita) | Optimizar · Mejorar · Restaurar |

- **Regla de "Protocolo" → Práctica vs Ruta:**
  - **Práctica** = intervención de UNA sola sesión (respiración, meditación, oil pulling, una ducha fría puntual). Ej: "Práctica de respiración", "Práctica de meditación".
  - **Ruta** = intervención multi-día o programa estructurado (ayuno de X días, plan de sueño, programa de Y semanas). Ej: "Ruta de Ayuno 16:8", "Ruta de Sueño".
  - Si un protocolo es ambiguo, el dev lo reporta y Enrique decide.
- **"Paciente":** solo se reemplaza por "Usuario" en la app pública V1. En el HUB Fx (backend clínico futuro) sí puede decir "paciente" porque ahí hay clínico real con cédula.
- **Reportar:** TODAS las ocurrencias de cada palabra roja (grep exhaustivo, ver Parte D criterio 1).

### B2 · Reformular la "Edad ATP" como métrica educativa
- **Regla:** "Edad ATP" se queda como nombre de marca de la métrica, pero NUNCA presentada como diagnóstico ni promesa. Siempre acompañada de "estimación educativa".
- **Acción:** agregar disclaimer permanente donde se muestra la Edad ATP: *"Edad ATP es una estimación educativa basada en tus hábitos, historia y biomarcadores autorreportados. No es un diagnóstico médico ni una promesa de resultados."*
- **Reportar:** cada pantalla donde aparece la Edad ATP y sus sub-edades.

### B3 · Interpretación de labs → "lectura educativa"
- **Regla:** la app puede mostrar los valores del usuario contra rangos funcionales y explicar qué significan **de forma educativa**, pero NO puede decir "tienes X enfermedad" ni "esto significa que estás enfermo" ni prescribir el fix como orden médica.
- **Acción:** revisar el copy de la interpretación de labs. "Tu ferritina está alta, esto puede indicar inflamación — comenta esto con tu médico" (OK educativo). "Tienes sobrecarga de hierro, toma X" (fuera, es diagnóstico+prescripción).
- **Reportar:** cómo está redactada hoy la interpretación de labs, si nombra enfermedades, si prescribe acciones como órdenes.

### B4 · Dosis de suplementos → rangos educativos, no personalizados como orden
- **Regla:** "El rango habitual reportado de vitamina D es 2,000-5,000 UI/día; ajusta con tu profesional" (OK). "Toma 5,000 UI porque tienes deficiencia" (fuera, es prescripción personalizada).
- **Acción:** revisar cómo la app entrega dosis. Convertir de "toma X" personalizado a "rango de referencia" educativo.
- **Reportar:** dónde y cómo se entregan dosis, si están personalizadas por labs/quiz del usuario (prescripción) o son rangos genéricos educativos.

### B5 · Postura fiebre sin antipirético → agregar screening de red flags
- **Regla:** la filosofía "acompañar la fiebre" queda como **opción del usuario informado**, nunca como default silente. DEBE haber screening obligatorio.
- **Acción:** implementar screening que dispare card "Busca atención médica ahora" si: >39°C, o >48h, o menor de 3 meses, o embarazada, o síntoma rojo (rigidez de nuca, dificultad respiratoria, confusión, sarpullido). Solo después del screening (si pasa) se ofrece el contenido "acompañar".
- **Reportar:** cómo está hoy el contenido de fiebre, si tiene algún screening, si menciona antipiréticos.

### B6 · Corregir "Dra. Mariana" en todas partes
- **Regla:** NUNCA "Dra." antes del PhD titulado. Formato correcto: *"Mariana Zapata Doria, Nutrióloga Clínica (Cédula [número]), candidata a Doctorado en Ciencias Biomédicas"*.
- **Reportar:** todas las ocurrencias de "Dra.", "Doctora", "Dr." (para Mariana o cualquiera sin PhD titulado) en app + PDFs + metadata.

### B7 · ARGOS system prompt + frases canónicas
- **Regla:** el system prompt de ARGOS y sus respuestas NO deben usar "diagnóstico/prescripción/tratamiento" ni presentarse como médico. Debe tener frases de derivación robustas ("esto amerita que lo veas con tu médico").
- **Acción:** auditar el system prompt de ARGOS completo. Verificar: (a) no se presenta como médico, (b) usa lenguaje educativo, (c) deriva a profesional en casos rojos, (d) no personaliza dosis como orden, (e) no nombra a Mariana/Enrique/nadie como "quien recomienda".
- **Reportar:** el system prompt actual + cualquier frase que cruce línea.

### B8 · Firmas de contenido → "ATP" o "ARGOS", nunca persona
- **Regla:** ninguna recomendación en la UI firma "Enrique dice", "Mariana dice", "Humby recomienda". Todo firma "ATP" o "ARGOS".
- **Reportar:** cualquier recomendación/protocolo/contenido que esté atribuido a una persona física por nombre.

---

# PARTE C — LO QUE SE PROTEGE (agregar disclaimers, gates, consentimientos)

### C1 · Disclaimer médico global permanente
- **Dónde:** onboarding (aceptación explícita) + footer de cada pantalla de resultados + T&C.
- **Texto:** *"ATP es una aplicación de bienestar y estilo de vida. No es un dispositivo médico, no diagnostica, no trata, no cura ni previene enfermedades. La información generada por ATP y ARGOS es educativa y no sustituye la consulta con un profesional de la salud. Antes de iniciar cualquier programa nutricional, de ejercicio, ayuno o suplementación, consulta con tu médico, especialmente si tienes condiciones preexistentes, tomas medicamentos, estás embarazada o en lactancia."*
- **Reportar:** si existe hoy un componente `MedicalDisclaimer` y dónde se muestra; qué falta para que esté en todos los puntos requeridos.

### C2 · Gate técnico DURO embarazo/lactancia
- **Regla:** si el usuario declaró embarazo o lactancia, BLOQUEAR (hard gate, no bypasable) estos protocolos: ayunos >12h, Wim Hof/respiración intensa, inmersión en frío <15°C, ayuno de sardinas, sauna >20 min, HIIT sin approve, cetogénica estricta, cualquier suplemento no categoría-verde-embarazo.
- **Mensaje:** *"Este protocolo no está disponible durante embarazo o lactancia. Consulta con tu ginecólogo(a) para pautas seguras en esta etapa."*
- **Reportar:** qué gates de embarazo/lactancia existen HOY, cuáles faltan, si el flag de embarazo/lactancia está disponible en el momento de cada protocolo de riesgo.

### C3 · Gate + warning Wim Hof / respiración intensa
- **Regla:** warning obligatorio (checkbox no skippable la primera vez) + gate técnico.
- **Warning:** *"La respiración intensa (hiperventilación) puede causar mareo o pérdida de conciencia. NUNCA la practiques dentro o cerca del agua, ni al conducir. Detén la sesión si sientes mareo intenso, dolor en el pecho o palpitaciones. Consulta a tu médico antes si tienes cardiopatía, epilepsia, hipertensión, o estás embarazada."*
- **Gate técnico:** bloquear en embarazo, epilepsia, hipertensión no controlada, cardiopatía, historia de síncopes, menores de 18. Máx 3 rondas guiadas/sesión, retención pasiva máx 90 seg con countdown.
- **Reportar:** cómo está hoy la respiración Wim Hof/apneas, qué warnings tiene, qué gates faltan, si captura las condiciones médicas necesarias para gatear.

### C4 · Screening obligatorio en fiebre (ver B5)
- Ya cubierto en B5. Reportar junto.

### C5 · Edad mínima 18 + verificación reforzada
- **Regla:** edad mínima 18 en Términos + gate en signup (fecha de nacimiento obligatoria + confirmación "soy mayor de 18"). Si declara <18 en cualquier punto → bloquear.
- **Reportar:** cómo se captura la edad hoy, si hay algún gate, si un menor puede crear cuenta.

### C6 · Checkboxes de consentimiento granular (Nueva LFPDPPP 2025)
- **Regla:** checkboxes NO pre-marcados, separados por finalidad: (a) salud general, (b) ciclo/embarazo, (c) IA ARGOS con datos sensibles, (d) transferencia internacional a proveedores EE.UU., (e) voz (si aplica), (f) marketing. Guardar timestamp + IP + hash del texto aceptado.
- **Reportar:** cómo está hoy el consentimiento en el signup, si es un solo "acepto todo" (hay que separar), si se loguea la aceptación.

### C7 · Score de alimentos/suplementos por atributos — reglas de blindaje
- **Regla (esto es lo que SE QUEDA de decisión 3b):**
  1. Score del **producto/ingrediente específico** que el usuario escanea, NO ranking público de marcas.
  2. **Score numérico** (ej. 4/10), nunca adjetivos ("tóxico", "chatarra", "malo").
  3. **Score privado** al usuario que escaneó — no publicar sellos tipo "ATP rechaza marca X".
  4. **Metodología pública** en URL (criterios + referencias científicas) — la app linkea a ella.
  5. Sugerir **alternativas más limpias por categoría** (promover buenos, no señalar malos por marca).
  6. **Disclaimer:** *"Score educativo basado en criterios públicos. No constituye recomendación médica."*
- **NOMBRE FINAL CERRADO:** el score se llama **"ATP Functional Score"**. Reglas duras: (a) **NUNCA refiere a marcas** — solo evalúa fórmulas/ingredientes/atributos; (b) **lenguaje 100% objetivo**, cero adjetivos ofensivos ("tóxico", "chatarra", "malo" → prohibidos); (c) solo criterios objetivos y medibles (forma química, biodisponibilidad, dosis efectiva, presencia de aditivos, azúcares, aceites vegetales industriales). Reemplaza toda mención a "BHA" / "Beat Health Additives".
- **Acción:** renombrar "BHA" → **"ATP Functional Score"** en todo el código/UI. Verificar que el score evalúe atributos de la fórmula (ingredientes, forma, dosis efectiva, aditivos), NUNCA la marca en sí, y que el copy sea objetivo sin lenguaje ofensivo.
- **Reportar:** cómo funciona hoy el food scan + score de suples, si nombra/rankea marcas, si el score es por atributos o por marca, si hay metodología pública.

### C8 · Módulo ARCO in-app
- **Regla:** en Perfil → Privacidad, 4 botones: Descargar mis datos (JSON+PDF), Rectificar, Cancelar cuenta (borra todo), Oponerme a finalidad. Email respaldo `privacidad@somosatp.com`.
- **Reportar:** qué existe hoy de gestión de datos del usuario (¿hay export? ¿hay delete account? — memoria menciona `account-deletion-processor` y `data-export-generator` edge functions, verificar que estén cableadas a UI).

### C9 · Aviso de renovación 5 días + cancel 1-tap
- **Regla:** cron/notificación 6 días antes de renovación con opción cancelar. Cancelación en 1 tap desde app. Para IAP, documentar que la store lo cubre.
- **Reportar:** cómo está hoy la renovación y cancelación de suscripción, si hay aviso previo, si el cancel es 1-tap o tiene fricción.

---

# PARTE D — REJILLA DE CRITERIOS PARA EL SCAN COMPLETO

**Esto es lo más importante del brief.** Yo (Cowork Legal) no conozco cada string, pantalla y protocolo de la app. Necesito que el Cowork developer **escanee TODA la app** contra estos criterios y me regrese un **inventario exhaustivo** de cada incumplimiento, para que Enrique decida punto por punto.

Ejecuta un scan sistemático (grep + revisión de componentes + revisión de contenido/protocolos + ARGOS prompts) contra CADA criterio. Para cada hallazgo, reporta en el formato de la Parte E.

### CRITERIO 1 · Lenguaje médico reservado
Busca en TODO (código, strings, i18n, PDFs generados, notificaciones, ARGOS prompts, metadata de stores, contenido educativo):
- "diagnóstico", "diagnosticar", "diagnostica"
- "prescripción", "prescribir", "receta", "recetar"
- "tratamiento", "tratar" (en sentido clínico)
- "cura", "curar", "sanar", "sana"
- "enfermedad" + verbo de acción (curar/tratar/eliminar la enfermedad)
- "terapia", "terapéutico"
- "paciente" (en la app pública el usuario NO es "paciente"; es "usuario". "Paciente" solo en HUB Fx)
- "clínico/clínica" usado para describir lo que ATP hace al usuario

### CRITERIO 2 · Claims de resultado prohibidos
Busca claims cuantitativos o de promesa terapéutica:
- "-X años" / "baja tu edad X años" / "reversión de edad"
- "en X semanas/meses" con promesa de resultado
- "garantizado", "garantía de resultados"
- "elimina", "revierte", "previene" [enfermedad/condición]
- Cualquier número de mejora prometido ("mejora X% tu Y")
- Superlativos médicos ("el más efectivo", "científicamente probado" sin cita)

### CRITERIO 3 · Personas como responsables/avales
Busca atribuciones a personas:
- "Dra.", "Doctora", "Dr." aplicado a Mariana o cualquiera sin PhD titulado
- "avalado por", "respaldado por", "supervisado por" + nombre de persona
- "recomendado por [nombre]", "[nombre] recomienda/dice/sugiere"
- Mariana o Enrique presentados como responsables clínicos/sanitarios/legales
- Cualquier nombre propio de persona en copy de recomendación user-facing
- "Humby" u otros apodos/nombres en copy (ya flagueado antes)

### CRITERIO 4 · Protocolos de alto riesgo sin gate/warning
Inventaría TODOS los protocolos de intervención y marca cuáles son de riesgo:
- Ayunos (lista completa con duración; marca los >48h)
- Respiración con hiperventilación/apneas (Wim Hof y similares)
- Exposición a frío extremo (inmersión, duchas frías <15°C)
- Calor extremo (sauna, duración)
- Suplementación con dosis altas
- Cualquier protocolo con contraindicación conocida (embarazo, epilepsia, cardiopatía, marcapasos, anticoagulantes, etc.)
Para cada uno reporta: ¿tiene warning? ¿tiene gate técnico? ¿captura las condiciones para gatear? ¿es push o pull?

### CRITERIO 5 · Contenido de salud mental / crisis
Busca TODO lo que toque:
- Pánico, ansiedad, crisis, ataque de pánico
- Ideación suicida, autolesión, "hacerme daño"
- Depresión, trauma (el cuestionario tiene "trauma emocional")
- Cualquier intervención de emergencia emocional
Para cada uno: ¿usa IA generativa libre o guion pre-aprobado? ¿tiene banner Línea de la Vida 800-911-2000? ¿deriva a profesional?

### CRITERIO 6 · Interpretación de datos clínicos
Busca dónde la app:
- Lee labs y los interpreta (¿nombra enfermedades? ¿prescribe fix?)
- Genera un "score de salud" con implicación clínica
- Da dosis personalizadas basadas en datos del usuario (prescripción) vs rangos genéricos (educativo)
- Genera PDFs/reportes descargables con lenguaje clínico

### CRITERIO 7 · Evaluación de productos de terceros
Busca:
- Cualquier calificación de marcas específicas con nombre
- Sellos publicables tipo "aprobado/rechazado por ATP"
- Rankings comparativos de marcas
- Adjetivos sobre productos de terceros ("tóxico", "malo")
Confirma si el food/supp score evalúa atributos (OK) o marcas (fuera).

### CRITERIO 8 · Datos personales y consentimiento
Busca:
- Cómo se captura consentimiento (¿un solo "acepto" o granular?)
- Si se loguea la aceptación (timestamp/IP/versión)
- Aviso de Privacidad actual (¿existe? ¿menciona INAI extinto? ¿lista proveedores?)
- Menciones a "INAI" (extinto — debe decir Secretaría Anticorrupción y Buen Gobierno)
- Export de datos / delete account cableados a UI
- Captura de edad / gate 18+

### CRITERIO 9 · Transferencia internacional de datos
Busca:
- Qué datos van a qué APIs (Anthropic, Google, ElevenLabs, Supabase, Sentry, PostHog, RevenueCat, Stripe, Conekta, Vercel)
- Si el usuario consintió específicamente la transferencia internacional
- Si Sentry/PostHog están capturando PII (deben scrub-ear datos personales)
- Config de retención de datos en cada proveedor

### CRITERIO 10 · Suscripción y cobro
Busca:
- Copy de "de por vida" / "vitalicio" (Founders — debe reformularse)
- Flujo de renovación automática (¿aviso 5 días? ¿cancel 1-tap?)
- Copy de reembolso / garantía
- Moneda virtual H+ (copy — no debe decir "moneda/cripto/activo/convertible")
- Precios mostrados en MXN exactos en compra de H+

### CRITERIO 11 · Metadata de stores
Busca en app.json / store listings:
- Descripción con lenguaje médico prohibido
- Claims de resultado
- Categoría (debe ser Salud y bienestar / Estilo de vida, no médica)
- Edad de clasificación
- Permisos declarados y sus justificaciones

### CRITERIO 12 · Módulo Ciclo/Embarazo
Busca:
- "ATP Embarazo" — qué protocolos ofrece, si están validados para embarazo
- Si el estado embarazo/lactancia gatea correctamente los protocolos de riesgo
- Copy sensible en embarazo

---

# PARTE E — FORMATO DEL INVENTARIO QUE DEBES REGRESAR

Para CADA hallazgo del scan (Parte D), regresa una fila con esta estructura. Agrupa por criterio. Sé exhaustivo — no omitas "porque es menor". Enrique quiere ver TODO y decidir.

```
ID: [C1-001, C1-002, C4-001, etc. — criterio + consecutivo]
Criterio: [1-12]
Ubicación: [archivo:línea o componente o pantalla o protocolo]
Qué encontré: [descripción del incumplimiento, con el texto/código actual]
Severidad propuesta: [P0 bloqueante cobro / P1 antes de stores / P2 tolerable]
Acción propuesta: [ELIMINAR / MODIFICAR / PROTEGER / DEJAR (si es falso positivo)]
Detalle de la acción: [qué exactamente — nuevo texto sugerido, gate a agregar, etc.]
Esfuerzo: [S/M/L — para priorizar]
Dependencias: [si toca varios lugares, si necesita decisión de Enrique, si necesita input de Mariana para umbrales clínicos]
Nota/duda: [cualquier cosa que Enrique deba decidir]
```

**Al final del inventario, incluye:**
1. **Resumen por criterio:** cuántos hallazgos por cada uno (C1: X, C2: Y...).
2. **Top 10 más graves** (los P0 de mayor riesgo).
3. **Lista de decisiones que Enrique debe tomar** (donde tú no puedes decidir solo — ej. "el protocolo X ¿se corta o se mueve a HUB Fx?").
4. **Quick wins** (cambios S de esfuerzo que resuelven P0 — sweep de palabras, etc.).
5. **Lo que necesita a Mariana** para umbrales clínicos (ej. lista de suplementos permitidos en embarazo, umbrales de fiebre) — SIN que ella firme como responsable, solo como input técnico de contenido.

---

# REGLAS DE EJECUCIÓN (para el dev)

1. **NO borres código destructivamente sin reporte previo.** Primero inventario, después Enrique decide, después ejecutas. Excepción: el sweep de palabras (Criterio 1) puedes proponerlo con diff para approve rápido.
2. **Feature flags sobre borrado** cuando sea reversible — así lo que se corta de V1 puede volver en HUB Fx o V2 sin re-programar.
3. **Los umbrales clínicos** (qué gatear en embarazo, umbrales de fiebre, condiciones de Wim Hof) los define Mariana como CONTENIDO, no como firma legal. Pídele la lista, no la firma.
4. **Todo cambio de copy** que sea user-facing y tenga implicación legal → pásalo al Cowork Comercial/Legal para validar la redacción antes de merge (yo tengo las redacciones aprobadas del dictamen).
5. **Reporta el estado del `MedicalDisclaimer` component** y de las edge functions de privacidad (`account-deletion-processor`, `data-export-generator`) — necesito saber qué ya existe.
6. **No toques** la lógica del motor Edad ATP v2 (está congelado) — solo el COPY que lo presenta.

---

# ENTREGABLE ESPERADO

Un documento `INVENTARIO_COMPLIANCE_[fecha].md` en `Business development/Legal/` con:
- El inventario completo formato Parte E
- Los 5 resúmenes del final de Parte E
- Tu recomendación de orden de ejecución

Con eso, Enrique y yo decidimos punto por punto, y arrancamos la cirugía + el Sprint 2 (Aviso de Privacidad + T&C + Convenio Accionistas).

---

**Contacto:** dudas sobre el "por qué legal" de cualquier punto → está en `DICTAMEN_LEGAL_NIVEL_A_2026-07-21.md`, mismo folder. Cada punto de este brief mapea a un P0/P1/P2 del dictamen.
