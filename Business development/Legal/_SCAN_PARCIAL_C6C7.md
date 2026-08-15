# SCAN PARCIAL · Criterios 6 y 7 — Compliance ATP
**Fecha:** 2026-07-21 · **Scope:** C6 (interpretación de datos clínicos) + C7 (evaluación de productos de terceros)
**Método:** grep + lectura de motores (labs, DX, BHA, food scan, PDF generators) en repo EliteTimer. Solo lectura.

## CONTEO POR CRITERIO
- **C6 · Interpretación de datos clínicos:** 10 hallazgos (2 P0, 4 P1, 4 P2/DEJAR)
- **C7 · Evaluación de productos de terceros:** 8 hallazgos (2 P0, 3 P1, 3 P2)
- **TOTAL:** 18

---

# CRITERIO 6 · INTERPRETACIÓN DE DATOS CLÍNICOS

## C6-001 · Reporte PDF "Mi Diagnóstico Funcional" (entregable descargable con lenguaje clínico)
- **Criterio:** 6 (d — PDF/reporte con lenguaje clínico)
- **Ubicación:** `src/services/dx/dx-html.ts:140,141,149` · `src/services/dx/dx-pdf-service.ts:73,82`
- **Qué encontré:** PDF que el usuario descarga y comparte a su médico por WhatsApp. Título `<h1>Mi Diagnóstico Funcional</h1>` (dx-html.ts:140), subtítulo "Síntesis de raíces funcionales por ARGOS" (:141), etiqueta "Nivel de diagnóstico" (:149). Filename `Diagnostico-Funcional-ATP-v${version}.pdf` (dx-pdf-service.ts:73), share dialog "Compartir Mi Diagnóstico Funcional" (:82). Estructura clínica: "Raíces detectadas" con severity pips (1-5) y "Confianza %".
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** Renombrar módulo/PDF/filename a "Mi Mapa Funcional" (B1). Sustituir toda "Diagnóstico"→"Evaluación/Mapa", "Nivel de diagnóstico"→"Nivel de tu evaluación". El disclaimer YA es bueno (`DX_PDF_DISCLAIMER` dx-html.ts:30-33 dice "No es un diagnóstico médico… compártelo con tu médico") — mantener, pero el TÍTULO lo contradice. Filename nuevo: `Mapa-Funcional-ATP-v{n}.pdf`.
- **Esfuerzo:** M
- **Dependencias:** Solapa C1 (barrido "diagnóstico"). Toca dx-html, dx-pdf-service, dx-service, pantalla diagnostico.
- **Nota/duda:** El disclaimer es sólido; el problema es puramente el naming clínico. Quick-ish si se hace junto al sweep C1.

## C6-002 · Pantalla "Mi Diagnóstico Funcional" (Card A) — score de salud con implicación clínica
- **Criterio:** 6 (b — score de salud con implicación clínica)
- **Ubicación:** `app/salud/diagnostico/index.tsx:140-193,214,314,373`
- **Qué encontré:** Pantalla que muestra "raíces detectadas por ARGOS", severity pips, "Nivel", historial de versiones, y botón "DESCARGAR / COMPARTIR PDF". Copy repetido: "Generar mi Diagnóstico", "Actualizar tu diagnóstico", "sintetice tus raíces funcionales", "Tu DX alimenta Mi Protocolo — de la raíz a la acción diaria" (:314).
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** Renombrar "Diagnóstico"→"Mapa/Evaluación" en toda la pantalla. Añadir disclaimer permanente C1/B2 en el footer del resultado ("estimación educativa… no es un diagnóstico médico"). Mantener el flujo, solo cambia copy.
- **Esfuerzo:** M
- **Dependencias:** Solapa C1. Decisión de Enrique ya cerrada (Mapa Funcional).
- **Nota/duda:** La pantalla es el corazón de C6; el "de la raíz a la acción" conecta DX→prescripción (ver C6-003).

## C6-003 · System prompt del motor DX (ARGOS "con formación en medicina funcional" + summary_text libre)
- **Criterio:** 6 (a — interpreta datos y sintetiza)
- **Ubicación:** `src/services/dx/dx-prompt.ts:43-44,52,64,117`
- **Qué encontré:** System prompt: "Eres ARGOS… con formación en medicina funcional. Tu tarea: sintetizar 'Mi Diagnóstico Funcional'…". Genera `summary_text` freeform 120-220 palabras (:52). Regla 5 (:64) ya prohíbe: "NO diagnostiques enfermedades ni receta fármacos. Esto es optimización de rendimiento, no medicina clínica" (mitigación presente). User prompt cierra "Sintetiza mi Diagnóstico Funcional" (:117).
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** Quitar "Diagnóstico"→"Mapa/Evaluación" del system+user prompt (B7). Quitar/matizar "con formación en medicina funcional" (no presentarse como médico). Reforzar guardrail: prohibir explícitamente nombrar enfermedades EN summary_text y exigir frase de derivación. La regla 5 es buena base — endurecer.
- **Esfuerzo:** M
- **Dependencias:** Solapa B7 (auditoría system prompt ARGOS). Riesgo residual: LLM freeform podría nombrar enfermedad pese a la regla → considerar post-filtro.
- **Nota/duda:** ¿Añadir lista negra de términos-enfermedad como post-proceso del summary_text? Decisión Enrique.

## C6-004 · Etiqueta "Nivel de diagnóstico" (score clínico 1-5 con severity/confidence)
- **Criterio:** 6 (b)
- **Ubicación:** `src/services/dx/dx-html.ts:149` (y equivalente en pantalla)
- **Qué encontré:** `<div class="level-caption">Nivel de diagnóstico</div>` — el DX asigna un nivel 1-5 y raíces con severity(1-5)+confidence(0-1), presentado como métrica de estado.
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** "Nivel de diagnóstico" → "Nivel de tu evaluación" o "Nivel de completitud de datos" (el nivel en realidad mide cuántas fuentes aportó el usuario, no severidad clínica — aclararlo reduce implicación clínica).
- **Esfuerzo:** S
- **Dependencias:** Parte de C6-001/002.
- **Nota/duda:** Vale la pena aclarar que "Nivel" = calidad de datos, no gravedad de salud.

## C6-005 · Label "Síntomas clínicos" en fuentes del DX
- **Criterio:** 6 / 1 ("clínico" describiendo datos del usuario)
- **Ubicación:** `src/services/dx/dx-html.ts:20-21` (`DX_SOURCE_LABELS`) + `dx-prompt.ts:109`
- **Qué encontré:** `sintomas: 'Síntomas clínicos'`. Se muestra en el PDF y contexto.
- **Severidad:** P2
- **Acción:** MODIFICAR
- **Detalle:** "Síntomas clínicos" → "Síntomas".
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Menor pero suma a la percepción "clínica" del entregable.

## C6-006 · "Edad ATP" — score de salud con implicación clínica sin disclaimer permanente inline
- **Criterio:** 6 (b)
- **Ubicación:** `src/services/health-score-service.ts` · `app/edad-atp/result-preview.tsx:142,234`
- **Qué encontré:** Edad ATP se calcula desde biomarcadores/labs (health-score-service) y se presenta como "Tu Edad ATP" (result-preview.tsx:142). Hay un "gate de disclaimers médicos — modal en primera visita" (:234), pero NO un disclaimer permanente inline en cada visualización (requisito B2).
- **Severidad:** P1
- **Acción:** PROTEGER
- **Detalle:** Añadir el disclaimer B2 permanente donde se muestra la Edad ATP: "Edad ATP es una estimación educativa basada en tus hábitos, historia y biomarcadores autorreportados. No es un diagnóstico médico ni una promesa de resultados." (NO tocar el motor v2, congelado — solo el copy).
- **Esfuerzo:** S
- **Dependencias:** Solapa B2. Motor Edad ATP congelado (solo copy).
- **Nota/duda:** El modal de primera visita existe; falta el permanente en todas las pantallas de Edad ATP y sub-edades.

## C6-007 · Interpretación de labs contra rangos funcionales (etiquetas "Riesgo"/"Crítico")
- **Criterio:** 6 (a)
- **Ubicación:** `src/utils/lab-rating.ts:19-26`
- **Qué encontré:** Los valores del usuario se evalúan contra rangos funcionales y se etiquetan: Óptimo / Aceptable / **Riesgo** / **Crítico** / Fuera de rango. VERIFICADO: NO nombra enfermedades y NO prescribe fix (grep de "enfermedad/diabetes/hipotiroid/anemia" en functional-health-engine.ts y mis-datos-core.ts = 0 resultados). Es lectura educativa contra rango.
- **Severidad:** P2
- **Acción:** DEJAR (con matiz opcional)
- **Detalle:** Cumple B3 (rango educativo, sin enfermedad, sin orden). Opcional: suavizar "Crítico"→"Muy fuera de rango" para reducir tono clínico. Recomendable añadir microcopy "coméntalo con tu médico" junto a valores fuera de rango.
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Falso positivo cercano; lo dejo marcado como el único punto de "interpretación" y confirmo que HOY es compliant.

## C6-008 · Guía de Laboratorios PDF (educativa, compartible al médico)
- **Criterio:** 6 (d)
- **Ubicación:** `src/services/labs-guide-html.ts` · `src/constants/labs-guide-content.ts:34-38`
- **Qué encontré:** PDF descargable con paquetes de labs, precios MXN, dónde hacerlos, cómo prepararse. Disclaimer BUENO: "Esta guía es informativa y educativa: no es una orden médica ni sustituye el criterio de tu profesional de salud." (labs-guide-content.ts:34). No interpreta valores, no nombra enfermedades.
- **Severidad:** P2
- **Acción:** DEJAR
- **Detalle:** Compliant B3. Sin cambios de compliance (la tarea #93 de contenido es aparte). Confirmar que el disclaimer esté visible también in-app (labs-guide.tsx), no solo en PDF.
- **Esfuerzo:** S (solo verificar in-app)
- **Dependencias:** —
- **Nota/duda:** Modelo de cómo debería verse el disclaimer del DX.

## C6-009 · Dosis de suplementos = REGISTRO del usuario, no prescripción personalizada
- **Criterio:** 6 (c — dosis personalizadas vs rangos genéricos)
- **Ubicación:** `src/services/supplements-service.ts:14-30` · `src/constants/interventions-catalog.ts` (menciones "dosis")
- **Qué encontré:** El motor de suplementos maneja SOLO las tomas que el usuario mismo registra (`dose_times`, `dose_index`) — es registro/adherencia, no un motor que prescriba dosis personalizadas ("toma 5000 UI"). Las menciones de "dosis" en interventions-catalog.ts están en `mechanismSummary`/`citation` (dosis-respuesta científica educativa) y en `assignRule` (flags), no como orden personalizada de mg/UI al usuario.
- **Severidad:** P2
- **Acción:** DEJAR
- **Detalle:** Cumple B4 (no hay prescripción de dosis personalizada). Doctrina BHA "registro, no recomendación" consistente. Mantener vigilancia si Mi Protocolo empieza a sugerir dosis numéricas.
- **Esfuerzo:** —
- **Dependencias:** —
- **Nota/duda:** Confirmado: NO hay "toma X mg porque tienes deficiencia Y" en V1. Bien.

## C6-010 · Food scan muestra score sin disclaimer educativo/médico
- **Criterio:** 6 (b/d) — solapa C7
- **Ubicación:** `app/food-scan.tsx:617-625` (getScore/getScoreLabel); grep de disclaimer/médico/educativo en food-scan.tsx = **0 resultados**
- **Qué encontré:** El food scan muestra un score (0-100) con label evaluativo del producto/comida escaneada, SIN ningún disclaimer educativo ni "no es consejo médico" en pantalla.
- **Severidad:** P1
- **Acción:** PROTEGER
- **Detalle:** Añadir disclaimer al resultado del food scan: "Score educativo basado en criterios de calidad nutricional. No constituye recomendación médica." (alinea con C7 regla 6).
- **Esfuerzo:** S
- **Dependencias:** Ver C7-006/007 (labels y metodología).
- **Nota/duda:** El BHA sí tiene disclaimer; el food scan NO.

---

# CRITERIO 7 · EVALUACIÓN DE PRODUCTOS DE TERCEROS

## C7-001 · Sello BINARIO "BIOHACKER APPROVED / NO APROBADO" (sello publicable aprobado/rechazado)
- **Criterio:** 7
- **Ubicación:** `src/components/supplements/BhaScanSheet.tsx:131,221,224` · `src/services/bha-core.ts:17,60,112` · `bha-service.ts:104`
- **Qué encontré:** El scan emite veredicto BINARIO `'approved' | 'rejected'` (bha-core.ts:17,60). UI muestra sello grande verde/rojo con ✅/❌ y texto "BIOHACKER APPROVED" o "NO APROBADO" (BhaScanSheet.tsx:224). Se persiste como `user_supplements.bha_status` (bha-service.ts:104). Esto es exactamente un sello publicable tipo "aprobado/rechazado por ATP" — viola C7 reglas #2 y #3 (debe ser SCORE NUMÉRICO, nunca aprobado/rechazado).
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** Convertir el veredicto binario a **"ATP Functional Score" numérico** (ej. 0-10 o 0-100) por atributos de la fórmula. Eliminar el sello ✅/❌ y los textos APPROVED/NO APROBADO. Cambia: tipo `BhaVerdict`→score numérico (bha-core), prompt (pedir score numérico + reasons), parseo, columna DB `bha_status`→`atp_functional_score`, UI del sheet.
- **Esfuerzo:** M/L
- **Dependencias:** Requiere migración SQL (columna). Decisión Enrique: escala del score (0-10 vs 0-100) y umbrales. Input Mariana para pesos de criterios.
- **Nota/duda:** El veredicto binario es el hallazgo más grave de C7. La lógica de evaluación por atributos ya existe (bien) — solo cambia la SALIDA de binaria a numérica.

## C7-002 · Nombre "BHA" / "Biohacker Approved" en todo el código y UI
- **Criterio:** 7
- **Ubicación:** `src/services/bha-core.ts` · `bha-service.ts` · `components/supplements/BhaScanSheet.tsx` · `app/supplements.tsx` · `app/food-scan.tsx:436,1364` · `src/services/economy/economy-config.ts` · `src/lib/analytics.ts` (evento `BHA_SCAN_COMPLETED`)
- **Qué encontré:** "BHA"/"Biohacker Approved" cableado en servicios, UI ("Escanear con BHA", "el sello Biohacker Approved evalúa…" BhaScanSheet.tsx:148,152), config de economía (costo H+ `bha_scan`), analytics.
- **Severidad:** P0
- **Acción:** MODIFICAR
- **Detalle:** Renombrar globalmente "BHA"/"Biohacker Approved" → **"ATP Functional Score"** (C7 nombre cerrado). Mantener las action-keys internas (`bha_scan` en proton_action_costs) o migrar con cuidado para no romper cobros server-side.
- **Esfuerzo:** M
- **Dependencias:** Coordinar rename de `bha_scan` action-key con argos-proxy/economy (no romper cobro H+). Va junto a C7-001.
- **Nota/duda:** Nota: el brief cita "Beat Health Additives" pero el código dice "Biohacker Approved" — mismo sello, confirmar naming final con Enrique.

## C7-003 · El scan envía la MARCA declarada al LLM
- **Criterio:** 7 (no referir marcas)
- **Ubicación:** `src/services/bha-core.ts:75-81` (`buildBhaUserText`) · `bha-service.ts:52,74-77`
- **Qué encontré:** `buildBhaUserText(productName, brand)` inyecta al prompt: "Marca declarada: {brand}." — el nombre de marca de tercero se pasa al modelo que emite el veredicto. C7 regla dura (a): "NUNCA refiere a marcas — solo evalúa fórmulas/ingredientes/atributos".
- **Severidad:** P1
- **Acción:** MODIFICAR
- **Detalle:** Quitar `brand` del prompt de evaluación (que el score dependa SOLO de la etiqueta/ingredientes). La marca puede seguir guardándose como metadato privado del registro del usuario, pero no debe entrar al cálculo del score.
- **Esfuerzo:** S
- **Dependencias:** —
- **Nota/duda:** Aunque hoy la evaluación es por atributos, pasar la marca abre la puerta a scoring condicionado por marca. Cortar de raíz.

## C7-004 · Base de aditivos con MARCAS de terceros en comentario (archivo muerto)
- **Criterio:** 7
- **Ubicación:** `src/data/food-additives-db.ts:1-6` (header)
- **Qué encontré:** Comentario de cabecera: "Incluye aditivos comunes en productos procesados mexicanos (FEMSA, Bimbo, Lala, Herdez, La Costeña, Barcel, Gamesa, etc.)". VERIFICADO: el archivo NO se importa en ningún lado (grep de imports = 0) → código muerto.
- **Severidad:** P2
- **Acción:** ELIMINAR
- **Detalle:** Eliminar los nombres de marca del comentario. Dado que el archivo está sin uso, evaluar borrarlo por completo (o dejarlo sin referencias a marcas si se planea reusar). Ningún nombre de marca de tercero debe vivir en el repo asociado a juicios.
- **Esfuerzo:** S
- **Dependencias:** Confirmar que sigue sin uso antes de borrar.
- **Nota/duda:** No es user-facing hoy, pero es exactamente el tipo de "base de datos de marcas" que C7 prohíbe. Limpiar.

## C7-005 · food-additives-db clasifica `toxicity: high` + campo `risks` (adjetivos)
- **Criterio:** 7 (adjetivos sobre productos)
- **Ubicación:** `src/data/food-additives-db.ts:10-27` (interface + entradas)
- **Qué encontré:** Cada aditivo tiene `toxicity: 'low'|'medium'|'high'` y `risks: string`. Si se cablea a UI, "toxicity: high" = adjetivo tipo "tóxico" prohibido por C7 (b). Hoy es dead code.
- **Severidad:** P2
- **Acción:** MODIFICAR / ELIMINAR
- **Detalle:** Si se reusa la DB, renombrar `toxicity`→un score/atributo objetivo (ej. `concern_level` numérico) y evitar lenguaje adjetival en `risks`. Si se borra el archivo (C7-004), este punto queda resuelto.
- **Esfuerzo:** S
- **Dependencias:** Ligado a C7-004.
- **Nota/duda:** —

## C7-006 · Food scan: labels evaluativos con tono directivo/adjetival
- **Criterio:** 7 (b) / 6
- **Ubicación:** `app/food-scan.tsx:622-625` (`getScoreLabel`)
- **Qué encontré:** Labels según score: food → "Excelente/Buena elección/Aceptable/Podría mejorar/**Fuera del plan**"; label(etiqueta) → "Producto limpio/Aceptable/Procesado/**Ultra-procesado**/**Evitar**"; suplemento → "…/**Baja calidad**/**Evitar**". Score por atributos (nutrición/limpieza del producto escaneado), NO por marca (correcto), pero "Evitar"/"Baja calidad" son adjetivos/directivas borderline.
- **Severidad:** P2
- **Acción:** MODIFICAR
- **Detalle:** Suavizar a lenguaje objetivo: "Evitar"→"Score bajo / Alto en procesados", "Baja calidad"→"Formulación básica". Mantener el score numérico como protagonista. Añadir disclaimer (C6-010).
- **Esfuerzo:** S
- **Dependencias:** C6-010.
- **Nota/duda:** El score es por atributos del producto escaneado (OK C7); solo el copy de labels necesita objetivarse.

## C7-007 · No existe metodología pública enlazada para BHA/food score
- **Criterio:** 7 (metodología pública)
- **Ubicación:** grep de "metodolog/methodology/criterios públicos" en src+app = 0 resultados relevantes
- **Qué encontré:** Ni el BHA ni el food scan enlazan a una metodología pública (URL con criterios + referencias). C7 regla #4 la exige. Los criterios viven solo en el prompt interno (`BHA_CRITERIA_PROMPT`, bha-core.ts:38-72).
- **Severidad:** P1
- **Acción:** PROTEGER
- **Detalle:** Publicar página de metodología (criterios + referencias científicas) en somosatp.com y enlazarla desde el resultado del scan. Añadir disclaimer C7 #6: "Score educativo basado en criterios públicos. No constituye recomendación médica."
- **Esfuerzo:** S/M (S en app, la página es contenido web aparte)
- **Dependencias:** Requiere crear la página web (lane marketing/web).
- **Nota/duda:** El disclaimer actual del BHA (BhaScanSheet.tsx:156,271-272 "No es recomendación de compra ni consejo médico") es parcial — falta el link a metodología y el texto exacto.

## C7-008 · Score privado al usuario (bien) — pero roadmap contempla ranking público de productos
- **Criterio:** 7
- **Ubicación:** `bha-service.ts:96-108` (persistBhaSeal, por-suplemento del usuario) · roadmap tasks #53 "BHA V2 base crowd-sourced + comparativo productos", #55 "Ranking cron automatización"
- **Qué encontré:** HOY el sello es PRIVADO al usuario que escaneó (se guarda en su `user_supplements`); NO hay base pública de marcas calificadas ni sellos publicables tipo "ATP rechaza marca X" — esto CUMPLE C7 regla #3. PERO el roadmap (#53, #55) apunta a base crowd-sourced + comparativo/ranking de productos.
- **Severidad:** P1 (preventivo)
- **Acción:** DEJAR (con bloqueo explícito para V1)
- **Detalle:** Confirmar que #53 "comparativo productos" y #55 "ranking" NO entren a V1 pública (serían ranking comparativo de marcas = prohibido C7). Marcar como decisión de Enrique / diferir a después del blindaje legal.
- **Esfuerzo:** —
- **Dependencias:** Decisión Enrique.
- **Nota/duda:** Es el punto donde C7 podría romperse en el futuro. Congelar el comparativo por marca.

---

# TOP 5 MÁS GRAVES (C6/C7)
1. **C7-001 (P0)** — Sello binario "BIOHACKER APPROVED / NO APROBADO": sello publicable aprobado/rechazado sobre productos de terceros. Debe volverse ATP Functional Score numérico.
2. **C6-001 (P0)** — PDF descargable "Mi Diagnóstico Funcional" que el usuario manda a su médico: título+filename+share con "Diagnóstico" y estructura clínica (raíces/severity). Rename a Mapa Funcional.
3. **C6-002 (P0)** — Pantalla Card A "Mi Diagnóstico Funcional": score de salud con implicación clínica ("raíces detectadas", severity, "de la raíz a la acción"). Rename + disclaimer permanente.
4. **C7-002 (P0)** — Naming "BHA / Biohacker Approved" cableado en servicios, UI, economía y analytics. Rename global a "ATP Functional Score" (coordinar action-key `bha_scan` con cobro H+).
5. **C6-003 (P1)** — System prompt del motor DX: ARGOS "con formación en medicina funcional" + genera síntesis freeform ("summary_text") que podría nombrar enfermedades. Regla anti-diagnóstico existe pero conviene endurecer + post-filtro.

# DECISIONES QUE NECESITA ENRIQUE
- **C7-001:** escala del ATP Functional Score (0-10 vs 0-100) y umbrales verde/amarillo/rojo.
- **C7-002:** naming final confirmado (código dice "Biohacker Approved", brief dice "Beat Health Additives") → todos a "ATP Functional Score".
- **C7-008 / tasks #53,#55:** ¿se congela el comparativo/ranking de productos por marca para V1? (recomendado sí).
- **C6-003:** ¿se agrega post-filtro de términos-enfermedad al summary_text del DX, además de la regla del prompt?
- **C6-001/002:** confirmar "Mi Mapa Funcional" como reemplazo (ya cerrado en B1) y aplicarlo al PDF + filename + share dialog.

# QUICK WINS (esfuerzo S que bajan riesgo)
- **C6-005:** "Síntomas clínicos" → "Síntomas".
- **C6-006:** disclaimer B2 permanente inline en Edad ATP (solo copy, motor congelado).
- **C6-010:** disclaimer educativo en resultado del food scan.
- **C7-003:** quitar `brand` del prompt de evaluación del scan.
- **C7-004:** borrar nombres de marca (FEMSA/Bimbo/…) del comentario de food-additives-db (archivo muerto).
- **C7-006:** objetivar labels "Evitar"/"Baja calidad" del food scan.

# LO QUE NECESITA A MARIANA (input técnico, NO firma)
- **C7-001:** pesos/criterios del ATP Functional Score por atributos (forma química, biodisponibilidad, dosis efectiva, aditivos, azúcares, aceites vegetales) para la escala numérica.
- **C7-007:** contenido de la metodología pública (criterios + referencias científicas) del score.
- **C6-007 (opcional):** validar si "Crítico"/"Riesgo" como labels de rango funcional se mantienen o se suavizan.

# NOTAS DE ALCANCE (confirmaciones positivas)
- Interpretación de labs (lab-rating.ts) NO nombra enfermedades ni prescribe → cumple B3 hoy.
- Dosis de suplementos = registro del usuario, NO prescripción personalizada → cumple B4 hoy.
- Sello BHA es privado al usuario, sin base pública de marcas calificadas → cumple C7 #3 hoy (el riesgo está en el roadmap, C7-008).
- Guía de Laboratorios PDF tiene disclaimer educativo correcto → cumple B3.
