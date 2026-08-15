# SCAN PARCIAL · Criterios 1, 2, 3 — Compliance App ATP

**Fecha:** 2026-07-21
**Alcance:** CRITERIO 1 (lenguaje médico reservado), CRITERIO 2 (claims de resultado), CRITERIO 3 (personas como avales).
**Método:** grep exhaustivo case-insensitive sobre `app/`, `src/`, `components/`, `constants/`, `services/`, `supabase/functions/`, `app.json`. Solo lectura. Se distingue user-facing (P0/P1) de comentarios/identificadores internos (P2/falso positivo).
**Nota de arquitectura:** El repo NO tiene i18n — todos los strings son español hardcodeado en TSX/TS. Detalle clave verificado: la pantalla de detalle de intervención (`app/salud/intervenciones/[key].tsx`) renderiza al usuario los campos `name`, `how`, `benefit`, `scientificInfo`, `categories`. Los campos `mechanismSummary`, `citation`, `contraindications`, `assignRule`, `paradigmConflict` del catálogo NO se muestran (research interno) → sus hits son P2/falso positivo. Las pantallas bajo `src/screens/coach/` y servicios `atp-ai-service`, `clinical-*`, `consultation-*` son el **HUB Fx / backend de coach** donde "paciente"/"clínico" están permitidos (DEJAR).

---

## CRITERIO 1 · Lenguaje médico reservado

### C1-001 · Módulo "Mi Diagnóstico Funcional" (nombre + toda la pantalla)
- **Criterio:** 1
- **Ubicación:** `app/salud/diagnostico/index.tsx` (l.2 comment, l.63 "NIVEL DE DIAGNÓSTICO", l.133/156/163/172 alerts "tu diagnóstico", l.185/187 "Generar/Actualizar mi Diagnóstico", l.193 header "Mi Diagnóstico", l.381 "tu primer diagnóstico"); `app/health-hub.tsx:43` card "MI DIAGNÓSTICO" (subtitle l.63); `src/services/dx/dx-html.ts:140` H1 del PDF "Mi Diagnóstico Funcional" (l.149 "Nivel de diagnóstico", l.74 "actualiza tu diagnóstico"); `src/services/dx/dx-pdf-service.ts:73` filename `Diagnostico-Funcional-ATP-v{n}.pdf` + l.82 dialog "Compartir Mi Diagnóstico Funcional"; `src/services/dx/dx-prompt.ts:44/117`; `src/components/tour/app-tour-core.ts:36` tour "tu diagnóstico funcional".
- **Qué encontré:** El módulo central de Salud se llama y titula "Mi Diagnóstico Funcional" en UI, PDF descargable, tour y prompt. Palabra roja #1.
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** "Mi Diagnóstico Funcional" → **"Mi Mapa Funcional"**; "NIVEL DE DIAGNÓSTICO"/"Nivel de diagnóstico" → "Nivel de evaluación"; "Generar/Actualizar mi Diagnóstico" → "Generar/Actualizar mi Mapa"; header "Mi Diagnóstico" → "Mi Mapa Funcional". El folder de ruta `/salud/diagnostico` puede quedarse (interno, no visible). Actualizar filename del PDF a `Mapa-Funcional-ATP-v{n}.pdf`.
- **Esfuerzo:** L (pantalla + PDF HTML + prompt + tour)
- **Dependencias:** Coordinar con B1. El prompt de generación (dx-prompt) también produce texto con la palabra → ver C1-004.
- **Nota/duda:** El PDF es el artefacto de mayor riesgo (documento descargable con lenguaje diagnóstico). Ver también task pendiente #71 "Card A Mi Diagnóstico Funcional".

### C1-002 · "Diagnóstico Funcional" en pantallas de intervenciones / padecimientos
- **Criterio:** 1
- **Ubicación:** `app/salud/intervenciones/index.tsx:196` ("vienen de tu Diagnóstico Funcional") y `:392` ("Genera o actualiza tu Diagnóstico"); `app/salud/intervenciones/rationale.tsx:32` ("leyendo tu diagnóstico funcional…"), `:167` ("Primero tu diagnóstico"), `:175` ("Generar mi diagnóstico"); `app/salud/padecimientos.tsx:52` DX_NOTE "Esto alimenta tu Diagnóstico Funcional".
- **Qué encontré:** Referencias user-facing a "Diagnóstico Funcional" fuera del módulo principal.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "Diagnóstico Funcional" → "Mapa Funcional"; "tu diagnóstico" → "tu evaluación".
- **Esfuerzo:** S
- **Dependencias:** B1 / C1-001.
- **Nota/duda:** —

### C1-003 · Labels de navegación con "Diagnóstico"
- **Criterio:** 1
- **Ubicación:** `app/settings/salud.tsx:107` sub="Diagnóstico, datos, síntomas y expediente"; `app/(tabs)/kit.tsx:27` subtitle "Diagnóstico · datos · evaluaciones · síntomas"; `app/health-hub.tsx:63` "diagnóstico, datos, evaluaciones y expediente".
- **Qué encontré:** Subtítulos de hubs de navegación usan "Diagnóstico".
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "Diagnóstico" → "Evaluación" / "Mapa Funcional".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** —

### C1-004 · Prompts LLM + HTML del DX que producen la palabra "diagnóstico" (salida al usuario)
- **Criterio:** 1
- **Ubicación:** `src/services/dx/dx-prompt.ts:44` ('sintetizar "Mi Diagnóstico Funcional"'), `:117` ("Sintetiza mi Diagnóstico Funcional"); `src/services/interventions/intervention-rationale-core.ts:70/82/90` (usa "Diagnóstico Funcional" en el prompt/JSON); `src/services/dx/dx-html.ts:32` (disclaimer del PDF).
- **Qué encontré:** Los prompts que generan el DX y su narrativa nombran el output "Diagnóstico Funcional", lo que se refleja en el texto sintetizado y en el PDF.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** Renombrar en prompt a "Mapa Funcional". CONSERVAR los guardrails ya presentes que SÍ cumplen: `intervention-rationale-core.ts:77` "Esto NO es un diagnóstico médico ni sustituye a un profesional" y `dx-prompt.ts:64` "NO diagnostiques enfermedades ni receta fármacos" (DEJAR, son la frontera correcta).
- **Esfuerzo:** M
- **Dependencias:** B7 (ARGOS), C1-001.
- **Nota/duda:** —

### C1-005 · "condiciones/padecimientos diagnosticados" (historial del usuario)
- **Criterio:** 1
- **Ubicación:** `app/health-hub.tsx:48` "Condiciones diagnosticadas + episodios"; `src/constants/master-quiz-bank.ts:381` "¿Padecimientos crónicos diagnosticados?"; `src/constants/historia-clinica-questionnaires.ts:35/41` "Condiciones diagnosticadas que tienes o has tenido" / "¿Te han diagnosticado…?".
- **Qué encontré:** Preguntas que indagan condiciones que un médico YA le diagnosticó al usuario.
- **Severidad:** P2
- **Acción:** DEJAR (con nota)
- **Detalle:** Es toma de historia (el diagnóstico lo hizo un tercero, no ATP). Aceptable. Si se quiere higiene total: "¿Te han diagnosticado…?" puede quedar; el subtítulo de card "Condiciones diagnosticadas" → "Condiciones que te han diagnosticado".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Enrique decide si vale el pulido.

### C1-006 · System prompt de ARGOS referencia "diagnóstico" como término de la UI
- **Criterio:** 1
- **Ubicación:** `supabase/functions/argos-proxy/brain.generated.ts` (bloque "ACLARACIÓN DE FRONTERA — diagnóstico como palabra vs diagnosticar"; menciona 'aunque la pantalla diga "diagnóstico"'); `src/services/argos-service.ts:96,115,127,283,382-384`.
- **Qué encontré:** El cerebro de ARGOS está BIEN blindado ("Brújula, no diagnóstico", "NUNCA hables de diagnóstico", "Yo no diagnostico") — esos guardrails CUMPLEN. Pero el prompt asume que la UI muestra la palabra "diagnóstico" y construye su frontera alrededor de ese término.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** Tras el rename (C1-001), actualizar el bloque de frontera para hablar de "Mapa/Evaluación Funcional". CONSERVAR todos los guardrails de no-diagnóstico. `brain.generated.ts` es GENERADO → editar los archivos brain fuente y regenerar, no el .generated directo.
- **Esfuerzo:** M
- **Dependencias:** B7 + B1. Requiere ubicar el generador del brain.
- **Nota/duda:** Verificar dónde está la fuente de `brain.generated.ts`.

### C1-007 · "ATP te prescribe / prescribe tus intervenciones" (motor de personalización)
- **Criterio:** 1
- **Ubicación:** `app/salud/cuestionario-maestro/index.tsx:253` "ATP te prescribe estas {N} para TU perfil"; `app/salud/mis-evaluaciones/index.tsx:74` "prescribe tus 5 intervenciones"; `src/services/salud/master-quiz-service.ts:7` ("ATP te prescribe estas 5", comentario).
- **Qué encontré:** El motor presenta sus 5 intervenciones como "prescripción" en copy visible.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "ATP te prescribe" → "ATP te sugiere" / "ATP te recomienda"; "prescribe tus 5 intervenciones" → "propone tus 5 intervenciones".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Los nombres de tipo/variable/archivo (`PrescriptionCard`, `PrescribedIntervention`, `prescription-service.ts`, `user_prescribed_interventions`, etc.) son INTERNOS → P2, DEJAR (no visibles). Solo el copy visible cambia.

### C1-008 · "prescripción/receta" — guardrails y falsos positivos
- **Criterio:** 1
- **Ubicación:** `src/constants/medical-disclaimers.ts:21` "no son prescripciones" (DEJAR, disclaimer correcto); `src/services/dx/dx-prompt.ts:64` "ni receta fármacos" (DEJAR, guardrail); `src/services/recipe-context-logic.ts:37`, `app/argos-recipes.tsx`, `app/my-recipes.tsx`, `app/argos-chat.tsx:89` — "receta" = receta de comida (FALSO POSITIVO).
- **Qué encontré:** El resto de hits de "receta/prescripción" son o disclaimers correctos o recetas de cocina.
- **Severidad:** P2
- **Acción:** DEJAR
- **Detalle:** Sin cambio.
- **Esfuerzo:** —
- **Dependencias:** —
- **Nota/duda:** —

### C1-009 · "tratamiento/tratar" (clínico)
- **Criterio:** 1
- **Ubicación:** User-facing dudosos: `app/salud/padecimientos.tsx:364` placeholder "Notas opcionales (tratamiento, contexto)…". Guardrails/OK: `src/constants/onboarding-copy.ts:87` "No diagnostica, trata ni cura enfermedades" (DEJAR, disclaimer); `src/services/argos-service.ts:284` "no sugieras tratamiento clínico" (DEJAR). Falsos positivos: `app/afiliados/aplicar.tsx:198` "tratamiento de mis datos" (legal de datos); `src/screens/coach/ClientDetailScreen.tsx:738` "TRATAMIENTO" (Fx); `master-quiz-bank.ts:364/368` y `historia-clinica-questionnaires.ts:110/111/164/183` preguntas sobre tratamientos del usuario (toma de historia).
- **Qué encontré:** No hay copy donde ATP prometa "tratar" al usuario. Solo un placeholder menor.
- **Severidad:** P2
- **Acción:** DEJAR (opcional pulir placeholder)
- **Detalle:** El placeholder puede quedar; si se pule: "(medicación, contexto)".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** —

### C1-010 · "terapia/terapéutico"
- **Criterio:** 1
- **Ubicación:** User-facing: `src/constants/interventions-catalog.ts:5496` name "Terapia de contraste (caliente/frío alternado)" (nombre de intervención, se muestra); `src/services/nutrition-service.ts:371` prompt scoring "¿Dosis terapéuticas adecuadas?"; `app/food-scan.tsx:109` atributo `dosis_terapeutica` (posible label del score de suples). OK/FP: `src/components/hoy/ActionContentRenderer.tsx:218` "No es terapia — es fisiología" (DEJAR, buen framing); `master-quiz-bank.ts:361/362/420` "terapia de reemplazo hormonal" (pregunta de historia, DEJAR); `app/journal-history.tsx:5` comentario "No app de terapia" (FP).
- **Qué encontré:** Un nombre de intervención con "Terapia" + un criterio de score con "terapéutica".
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "Terapia de contraste" → "Contraste térmico (caliente/frío)"; "Dosis terapéuticas adecuadas" → "Aporte adecuado"; verificar si `dosis_terapeutica` tiene label visible → "aporte efectivo".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Confirmar que el atributo `dosis_terapeutica` del food-scan renderiza con label al usuario.

### C1-011 · "paciente" (en app pública debe ser "usuario")
- **Criterio:** 1
- **Ubicación:** User-facing real: `src/services/nutrition-service.ts:438` prompt ARGOS "El paciente lleva hoy: …" (el modelo puede devolver "paciente"). A verificar: `src/services/clinical-study-service.ts:179/244` "## RESUMEN PARA EL PACIENTE" (parser de estudios). Prompt interno: `src/services/lab-service.ts:440` "NO mezcles valores de dos pacientes", `src/services/atp-ai-service.ts:151` "## PACIENTE". Fx/coach (DEJAR): `src/screens/coach/ClientDetailScreen.tsx:1760/2373/3470`. Falsos positivos: `src/services/edad-atp/*` "paciente HOMBRES V7" (comentario de fixture), `src/data/emotions-library.ts:166` emoción "Paciente", `src/constants/braverman-questions.ts:40` rasgo "paciente".
- **Qué encontré:** ARGOS y varios prompts LLM llaman "paciente" al usuario.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** En `nutrition-service.ts:438` "El paciente" → "El usuario". `atp-ai-service`, `clinical-study-service`, `lab-service` y pantallas coach = HUB Fx → DEJAR "paciente" (permitido en Fx). Confirmar si `clinical-study-service` alimenta algo visible al usuario final (no al coach); si sí, cambiar a "usuario".
- **Esfuerzo:** S
- **Dependencias:** Definir frontera app-pública vs Fx en clinical-study-service.
- **Nota/duda:** —

### C1-012 · "clínico/clínica" describiendo lo que ATP hace
- **Criterio:** 1
- **Ubicación:** User-facing donde ATP es sujeto: `src/services/health-score-engine.ts:129` nivel de evaluación label "Clínica" (Élite/Clínica/Completa); `src/constants/master-quiz-bank.ts:359` "Es una señal clínica que ATP vigila"; `src/services/dx/dx-html.ts:21` "Síntomas clínicos" (PDF); `app/braverman.tsx:314` "Evaluación clínica de neurotransmisores". Educacional borderline: `src/services/argos-service.ts:627` "rango clínico estándar". Fx/interno (DEJAR): `src/services/atp-ai-service.ts:147` "análisis clínico" (coach), toda la familia `clinical-*` / `historia-clinica` / `consent share_with_clinician` / tier `atp_clinician`.
- **Qué encontré:** Algunos labels/copys usan "clínico/clínica" con ATP como sujeto de un acto clínico.
- **Severidad:** P1 (los 3-4 user-facing) / P2 (resto interno)
- **Acción:** MODIFICAR user-facing, DEJAR interno
- **Detalle:** "señal clínica que ATP vigila" → "señal que ATP vigila"; nivel "Clínica" → "Avanzada"; "Síntomas clínicos" → "Síntomas"; "Evaluación clínica de neurotransmisores" → "Evaluación de patrones de neurotransmisores" (ver también C3-004).
- **Esfuerzo:** M (barrer los reales, ignorar ~600 identificadores internos)
- **Dependencias:** —
- **Nota/duda:** De ~664 hits de "clínic", la gran mayoría son nombres de archivo/variable/tipo y el HUB Fx → P2/DEJAR. Solo los listados arriba son user-facing con ATP como sujeto.

### C1-013 · "dosis" en copy user-facing (mapear a "aporte sugerido")
- **Criterio:** 1
- **Ubicación:** `src/data/food-additives-db.ts` (múltiples `risks:` "…a dosis alimentarias/altas"); `src/constants/historia-clinica-questionnaires.ts:651` "calibrar tu dosis de sol matutino"; en catálogo de intervenciones "dosis" aparece casi siempre en `mechanismSummary`/`contraindications`/`citation` (INTERNOS, no visibles).
- **Qué encontré:** "dosis" aparece en textos educativos de aditivos y en un blurb de sol. No hay prescripción personalizada de dosis en copy directo (el aporte de suplementos se maneja como cantidad en DB).
- **Severidad:** P2
- **Acción:** DEJAR (opcional)
- **Detalle:** "dosis alimentarias" en descripción de aditivos es educativo genérico (no prescripción), tolerable. Si se pule por consistencia: usar "cantidad". Reservar "aporte sugerido" para suplementación personalizada (ver B4, fuera de C1-C3).
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** El grueso de "dosis" del catálogo NO es visible.

---

## CRITERIO 2 · Claims de resultado prohibidos

### C2-001 · Claims cuantitativos/absolutos en `benefit` y `scientificInfo` de intervenciones (SISTÉMICO — user-facing)
- **Criterio:** 2
- **Ubicación:** `src/constants/interventions-catalog.ts` — campos `benefit`/`scientificInfo` renderizados en `app/salud/intervenciones/[key].tsx` (sección BENEFICIO) y en filas de `index.tsx`. Ejemplos representativos:
  - l.4797 "La intervención con **mejor evidencia de reducción de mortalidad cardiovascular** en humanos (… 50-63% menor riesgo)"
  - l.7000 "185 min de pie post-comida **atenuaron glucosa postprandial en 43%. Reduce mortalidad** asociada a sedentarismo"
  - l.7936 "VO2max = **predictor #1 de mortalidad** por todas las causas. Aumenta 7-9% en 8 semanas"
  - l.2172 "**Reduce glucosa postprandial 20-50%**"; l.6776 "reduce glucosa postprandial + insulina 20-25%"
  - l.6335 "**+30-40% densidad colágeno en 12 semanas**"; l.6089 "mejora contraste cromático +17-20%"
  - l.2875 "**previene hemorroides**"; l.7725 "**previene juanetes** (hallux valgus)"; l.6457 "**previene fatiga acomodativa, reduce miopía**"; l.5856 "previene supresión [melatonina]"
  - l.3658 "dispara adrenalina 200-300%"; l.5214 "dopamina + noradrenalina hasta 250-500%"; l.1298 "sueño profundo N3 aumenta 20-30%"
- **Qué encontré:** Decenas de intervenciones prometen resultados cuantitativos específicos, "previene [condición]", "reduce mortalidad" y superlativos ("mejor evidencia", "predictor #1") en texto visible.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** Suavizar a lenguaje educativo con hedge: quitar porcentajes específicos y "previene [enfermedad]"; reformular "reduce mortalidad" → "se asocia en estudios con mejor salud cardiovascular"; "predictor #1 de mortalidad" → "marcador de condición física asociado a longevidad en la literatura"; "previene hemorroides/juanetes" → "puede favorecer/apoyar…". Mantener tono sin matar placebo (doctrina) pero sin promesa terapéutica.
- **Esfuerzo:** L (barrido de ~59 intervenciones; conviene subagente)
- **Dependencias:** Input de Mariana para redacciones científicamente defendibles (como CONTENIDO, no firma). Se cruza con doctrina "no matar placebo" (task #124).
- **Nota/duda:** `mechanismSummary`/`citation` NO son visibles → no tocar por compliance (solo `benefit`/`scientificInfo`/`name`/`how`).

### C2-002 · Edad ATP "X años más joven que tu edad real"
- **Criterio:** 2
- **Ubicación:** `src/components/edad-atp/EdadAtpShareCard.tsx:26` "`${delta} años más joven que tu edad real`"; `src/components/edad-atp/RecalculateDiff.tsx:16` "`${delta} años más joven`".
- **Qué encontré:** Display del delta de la métrica como "X años más joven", incluido en la **share card** (contenido que sale de la app a redes).
- **Severidad:** P2
- **Acción:** PROTEGER (no eliminar la métrica)
- **Detalle:** No es promesa a futuro (muestra un cálculo), pero "más joven que tu edad real" implica claim de edad-salud. Acompañar SIEMPRE con el disclaimer de B2 ("Edad ATP es una estimación educativa… no es diagnóstico ni promesa de resultados"), especialmente en la share card. No modificar el motor (congelado), solo el encuadre.
- **Esfuerzo:** S
- **Dependencias:** B2 (fuera de C1-C3 estricto, pero el hallazgo es C2).
- **Nota/duda:** —

### C2-003 · "garantizado" / "de por vida" — NO encontrados en copy user-facing del código escaneado
- **Criterio:** 2
- **Ubicación:** Todos los hits de "garantiza/garantizado" en `app|src` son comentarios de código (idempotencia, fallback) → FALSO POSITIVO. Grep de "de por vida|vitalicio|para siempre|baja tu edad|revierte|rejuvenece" en `app/paywall.tsx`, `app/onboarding`, `app/edad-atp` = 0 en copy.
- **Qué encontré:** El copy comercial de Founders/"de por vida" (brief C10) NO vive en el código de la app escaneado — probablemente en la web (somosatp.com) fuera de este repo.
- **Severidad:** P2 (informativo)
- **Acción:** DEJAR
- **Detalle:** Confirmar copy Founders en el repo/web de marketing, no en la app.
- **Esfuerzo:** —
- **Dependencias:** Scan del funnel web (otro alcance).
- **Nota/duda:** —

---

## CRITERIO 3 · Personas como responsables/avales

### C3-001 · "Dra. Mariana Zapata, PhD" como autora del disclaimer de interpretación (P0 — viola PRIME DIRECTIVE)
- **Criterio:** 3 (+ C1 por "Dra.")
- **Ubicación:** `src/constants/medical-disclaimers.ts:30` — `interpretation: 'Esta interpretación es preparada por la Dra. Mariana Zapata, PhD. Es educativa y orientativa. No constituye diagnóstico, tratamiento, ni reemplaza consulta con genetista clínico.'`
- **Qué encontré:** El disclaimer de interpretación de genética/labs atribuye la interpretación a "la Dra. Mariana Zapata, PhD" — la pone como autora/avaladora médica del contenido. Doble falta: título "Dra." indebido + persona como responsable.
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** Quitar la persona. Reemplazo sugerido: *"Esta interpretación es educativa y orientativa, basada en criterios de medicina funcional de ATP. No constituye diagnóstico, tratamiento, ni reemplaza consulta con un profesional de la salud."* Si se quiere acreditar a Mariana como autora de contenido educativo (permitido), usar el formato B6 SOLO en créditos de contenido, nunca como aval del servicio: "Mariana Zapata Doria, Nutrióloga Clínica (Cédula […]), candidata a Doctorado en Ciencias Biomédicas".
- **Esfuerzo:** S
- **Dependencias:** Redacción final a validar con Cowork Legal.
- **Nota/duda:** Es el hallazgo más grave de C1-C3. Toca directo la PRIME DIRECTIVE (Mariana ≠ responsable clínica).

### C3-002 · Comentario "pendiente firma final por Dra. Mariana Zapata, PhD" (modelo mental erróneo)
- **Criterio:** 3
- **Ubicación:** `src/constants/medical-disclaimers.ts:6-8` (comentario de cabecera del archivo).
- **Qué encontré:** El comentario asume que Mariana "firma" la versión final de los disclaimers — refleja el modelo que el dictamen prohíbe.
- **Severidad:** P2 (comentario, no user-facing)
- **Acción:** MODIFICAR
- **Detalle:** Reescribir el comentario para reflejar que Mariana valida ciencia como CONTENIDO, no firma legal. Alinear con doctrina antes de que alguien lo tome como fuente.
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** —

### C3-003 · Nombres "Enrique-Mariana" en campos user-facing del Ayuno de Sardinas
- **Criterio:** 3
- **Ubicación:** `src/constants/interventions-catalog.ts:8694` `how:` "⏳ Detalles Enrique-Mariana pendientes. Formato genérico base…"; `:8698` `assignRule:` "PENDIENTE spec Enrique…"; `:8834` `citation:` "⏳ PENDIENTE · Enrique-Mariana protocolo específico ATP con dosis exactas…".
- **Qué encontré:** El campo `how` (VISIBLE al usuario) del ayuno de sardinas contiene nombres propios + placeholder "pendiente". `assignRule` y `citation` son internos (P2) pero también nombran personas.
- **Severidad:** P1 (el `how` es visible; también placeholder feo)
- **Acción:** ELIMINAR nombres / MODIFICAR
- **Detalle:** Quitar "Enrique-Mariana" del `how`; poner instrucción neutra firmada por ATP. NOTA: este protocolo es **A2 del brief** (sardinas → sacar como ejecutable de V1, dejar solo educativo) → el fix se puede resolver de raíz al de-ejecutabilizarlo.
- **Esfuerzo:** S
- **Dependencias:** Decisión A2 (cortar/mover a Fx). Cruza con C4 (otro alcance).
- **Nota/duda:** —

### C3-004 · "Dr. Eric R. Braverman" + "Evaluación clínica" en pantalla Braverman
- **Criterio:** 3 (+ C1 por "clínica")
- **Ubicación:** `app/braverman.tsx:314` "Evaluación clínica de neurotransmisores del Dr. Eric R. Braverman…"; `:369` "Basado en 'The Edge Effect' del Dr. Eric R. Braverman".
- **Qué encontré:** Cita a un autor externo real (Braverman ES médico) como origen del test. "Dr." de autor externo es defendible como atribución bibliográfica; el problema mayor es "Evaluación **clínica**" (C1) con ATP como sujeto.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "Evaluación clínica de neurotransmisores" → "Evaluación de patrones de neurotransmisores". La cita "Basado en 'The Edge Effect' del Dr. Eric R. Braverman" puede quedar (atribución de fuente externa, no aval del servicio ATP).
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Confirmar con Legal si prefieren quitar "Dr." también de la cita externa (bajo riesgo).

### C3-005 · Citas "Dr. Boz" / "Dr. Braverman" en campos internos del catálogo
- **Criterio:** 3
- **Ubicación:** `src/constants/interventions-catalog.ts:8814` citation "Dr. Boz (Annette Bosworth MD)…"; `src/constants/braverman-questions.ts:3/61` "Dr. Eric R. Braverman, 'The Edge Effect'".
- **Qué encontré:** Nombres de autores externos en campos `citation`/comentarios NO visibles.
- **Severidad:** P2
- **Acción:** DEJAR
- **Detalle:** No visible al usuario. Sin cambio.
- **Esfuerzo:** —
- **Dependencias:** —
- **Nota/duda:** —

### C3-006 · "Humby" — solo en identificadores/comentarios internos (verificar contextNote)
- **Criterio:** 3
- **Ubicación:** `app/salud/intervenciones/index.tsx:283/291/511/515` (estilos `humbyHint`/`humbyWarn`), `src/services/interventions/personalize-interventions.ts:74/555`, `personalize-types.ts:150`, `intervention-service*.ts` (comentarios "doctrina Humby"), `prescription-service.ts:89`.
- **Qué encontré:** "Humby" aparece como nombre de estilo/variable y en comentarios de doctrina. El texto que renderiza `humbyHint` proviene del `contextNote` del motor (no es la palabra "Humby").
- **Severidad:** P2 (falso positivo en copy — el barrido de nombres propios ya se hizo, task #131)
- **Acción:** DEJAR / VERIFICAR
- **Detalle:** Confirmar que el string de `contextNote`/`warning` generado por el motor (`personalize-interventions.ts` sección "contextNote doctrina Humby 9+") NO contiene "Humby" en el texto final visible. Los identificadores pueden quedar.
- **Esfuerzo:** S (verificación)
- **Dependencias:** —
- **Nota/duda:** —

### C3-007 · URL de compartir con dominio personal de Enrique
- **Criterio:** 3
- **Ubicación:** `src/services/share-service.ts:12` `const SHARE_BASE_URL = 'https://enriquezapata.com.mx/r'`.
- **Qué encontré:** Los links de referido/compartir usan el dominio personal `enriquezapata.com.mx` (aparece en la URL que el usuario comparte). `app.json:93` owner "ezapata" es campo interno de Expo (FALSO POSITIVO).
- **Severidad:** P2
- **Acción:** MODIFICAR (recomendado)
- **Detalle:** Migrar a `somosatp.com/r` para consistencia de marca y despersonalización. No es aval médico, pero es nombre propio en artefacto compartible.
- **Esfuerzo:** S (requiere redirect configurado en el dominio)
- **Dependencias:** DNS/redirect de somosatp.com.
- **Nota/duda:** —

---

## RESUMEN / CONTEO POR CRITERIO

| Criterio | Hallazgos | P0 | P1 | P2/DEJAR |
|---|---|---|---|---|
| **C1** · Lenguaje médico reservado | 13 | 1 (C1-001) | 7 (C1-002,003,004,006,007,010,011,012) | 5 |
| **C2** · Claims de resultado | 3 | 0 | 1 (C2-001) | 2 |
| **C3** · Personas como avales | 7 | 1 (C3-001) | 3 (C3-003,004; + C3-007 recomendado) | 3 |
| **TOTAL** | **23** | **2** | **11** | **10** |

**Conteo compacto: C1: 13 · C2: 3 · C3: 7 (total 23 hallazgos).**

---

## TOP 5 MÁS GRAVES

1. **C3-001 (P0)** — `medical-disclaimers.ts:30` "Esta interpretación es preparada por la **Dra. Mariana Zapata, PhD**". Viola directo la PRIME DIRECTIVE (persona como avaladora médica) + título "Dra." indebido. Fix S, alto impacto legal.
2. **C1-001 (P0)** — Módulo **"Mi Diagnóstico Funcional"** en UI + **PDF descargable** + tour + prompt. Palabra roja #1 en el artefacto de mayor exposición (documento con lenguaje diagnóstico). Rename a "Mi Mapa Funcional". Esfuerzo L.
3. **C2-001 (P1, sistémico)** — Decenas de `benefit`/`scientificInfo` con claims cuantitativos ("reduce mortalidad", "previene hemorroides/juanetes", "50-63% menor riesgo", "predictor #1 de mortalidad", "+30-40% colágeno en 12 semanas") visibles en detalle de intervención. Riesgo de claim terapéutico masivo.
4. **C1-006 (P1)** — System prompt de ARGOS (`brain.generated.ts`) construido alrededor del término "diagnóstico" de la UI. Guardrails cumplen, pero hay que sincronizar vocab post-rename y regenerar desde la fuente.
5. **C3-003 (P1)** — Ayuno de sardinas: campo `how` VISIBLE con "⏳ Detalles Enrique-Mariana pendientes" (nombres propios + placeholder). Se resuelve de raíz al de-ejecutabilizarlo (A2).

---

## QUICK WINS (esfuerzo S que cierran riesgo alto)
- C3-001: reescribir 1 string del disclaimer de interpretación → mata el P0 de aval.
- C1-007: "ATP te prescribe" → "ATP te sugiere" (2 pantallas).
- C1-002 / C1-003: barrido de "Diagnóstico Funcional"/"Diagnóstico" en subtítulos e intervenciones.
- C1-010: renombrar "Terapia de contraste" → "Contraste térmico".
- C3-004: "Evaluación clínica de neurotransmisores" → "Evaluación de patrones de neurotransmisores".

## LO QUE NECESITA A MARIANA (como CONTENIDO, no firma)
- C2-001: redacciones alternativas científicamente defendibles para suavizar los `benefit`/`scientificInfo` sin perder sustento (porcentajes → lenguaje asociativo).

## DECISIONES QUE ENRIQUE DEBE TOMAR
- C1-001: confirmar "Mi Mapa Funcional" como nombre final del módulo y del PDF.
- C1-005: ¿pulir "condiciones diagnosticadas" (historia del usuario) o dejar?
- C3-007: ¿migrar links de compartir de `enriquezapata.com.mx` a `somosatp.com`?
- C3-004: ¿quitar también "Dr." de la cita externa a Braverman, o dejar como atribución bibliográfica?

---

## PENDIENTES DE VERIFICACIÓN (no bloqueantes de este scan)
- Ubicar la fuente que genera `supabase/functions/argos-proxy/brain.generated.ts` (para C1-006).
- Confirmar si `clinical-study-service.ts` "RESUMEN PARA EL PACIENTE" alimenta algo visible al usuario final (vs solo al coach en Fx).
- Confirmar que el atributo `dosis_terapeutica` del food-scan renderiza con label visible.
- Confirmar texto final del `contextNote` del motor de intervenciones (C3-006, que no contenga "Humby").

*(Scan limitado a C1/C2/C3. C4-C12 fuera de este documento.)*
