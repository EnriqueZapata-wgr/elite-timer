# 🛠️ PLAN MAESTRO · "Ahora → V2.0 100%"

**Fecha:** 2026-07-17 · **Autor:** Cowork (dirección técnica/producto) · **Decisión founder:** construir **V2.0 100% COMPLETA** → **beta con testers sobre la V2 real** → **venta founders** (ARGOS Jarvis = ancla de ATP Pro).

**Fuente de verdad de estado:** `ESTADO_100_ATP_MASTER_TRACKER_2026-07-17.md` · `TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md` · `AUDITORIA_RONDA2_CODIGO/WEB_2026-07-17.md`.

**Este documento reemplaza** la lógica "beta mínima ahora + resto post-launch" del tracker (secc. 3) y del triage (Batch 6/7 post-soft-launch). El founder decidió lo contrario: **no hay soft-launch sobre V1.2 parcial**. La beta corre sobre V2 terminada. Todo lo ⬜/🔨 entra ANTES de testers.

---

## 0. CAMBIO DE ESTRATEGIA (leer primero)

El tracker calculaba **~78% hacia beta** porque asumía que Fitness rebuild, audio Mente, ARGOS Jarvis y LIGHT iban **post** soft-launch. Con la nueva decisión eso ya no aplica: **la vara es 100% de V2**, y ahí estamos en **~62%**.

**Implicación honesta:** la fecha "1 agosto" del brief comercial **no sostiene V2 100%**. Esto es un esfuerzo de **~14-18 semanas** de dev enfocado (single dev + subagentes Fable), no de días. La beta se mueve a la ventana **~octubre-noviembre 2026**. Mejor decir esto hoy que descubrirlo en septiembre. (Si el cash aprieta, la conversación correcta no es "recortar V2", es "¿founders se pre-venden contra la V2 en construcción, con acceso escalonado?" — decisión comercial de Enrique, fuera de este plan técnico.)

---

## 1. RESUMEN EJECUTIVO

**De dónde partimos:** V1.2.x en vivo, 89 pantallas, ~68K líneas, 4 mega-batches mergeados a `main` sin regresiones estructurales (confirmado por Auditoría Ronda 2, código + web navegada). Base sólida: design system ATP (`brand.ts`) completo, day-state/agenda/pregnancy-gate bien diseñados, Salud Funcional con arquitectura navegación-vs-datos, ARGOS on-doctrine. **~62% hacia V2.0.**

**A dónde vamos:** el **sistema operativo de rendimiento humano completo** — 7 pilares production-ready + **ARGOS Jarvis** como copiloto con presencia, voz y proactividad. Todo ⬜/🔨 del tracker cerrado, todos los bugs P0-P3 muertos, LIGHT mode, Sleep Track, audio real en Mente, Fitness reconstruido de raíz.

**Filosofía: STAGED-WITH-GATES, no big-bang-then-debug.**
La evidencia del riesgo está en la casa: **5 sprints sin device-test → 30 bugs de Enrique**. Nunca más. El método es **mega-batches congruentes por raíz**, y cada batch grande **termina en un GATE**: `npx tsc --noEmit` limpio + delivery escrito + **device-test físico** antes de abrir el siguiente batch grande. Un batch no se declara "hecho" porque compila o existe — se declara hecho cuando pasa la rúbrica founder (comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real).

**Doctrinas ATP que gobiernan todo el plan:** design system lime+teal+amarillo editorial (lime-brutalist muerto), español MX, guiar todo (ejemplos + helpers), menú-vs-datos (un dato = un lugar), no-matar-placebo (riesgos+ejecución, controversias solo en Nivel 3 ARGOS), Edad ATP a YO como primer dato, dato-del-user-sagrado, sin nombres propios en copy user-facing.

**Alcance V2.0 = app consumer completa.** Explícitamente **FUERA de V2.0** (track B2B2C aparte, post-founders): **Backend Fx clínico** (24 req Mariana, HUB Fx, afiliados wallet, motor labs clínico) y las integraciones de **wearables / multimodal hardware / genética** (v2.1+, NO se venden aún — memoria `reference_v1_feature_map`). Se listan al final para que **nada se olvide**, pero no bloquean la beta founders.

---

## 2. SECUENCIA DE MEGA-BATCHES

Ordenados por **dependencia + valor**: primero se estabiliza el cimiento (infra/funcional P0) para **no arrastrar bugs a los batches grandes**; luego los dos tent-poles (Fitness rebuild, ARGOS Jarvis); luego los módulos que se apoyan en ellos; y al final el pulido transversal, LIGHT y el hardening pre-beta.

**Leyenda esfuerzo:** S ≈ ½ sem · M ≈ 1 sem · L ≈ 2 sem · XL ≈ 3 sem (dev enfocado, incluye el device-test del gate).

**Leyenda skills de diseño instaladas:** 🍎 **apple-design** (motion/gestos/materiales/interrupción) · ✍️ **frontend-design** (dirección visual/tipografía/molde editorial) · 💎 **emil-design-eng** (pulido de componente, detalle invisible, feel del tap).

---

### 🟥 MB-0 · CIMIENTO — Infra + transversal P0 (mata la sensación "roto" de raíz)
**Esfuerzo: M** · **Va primero, sin excepción.** Estos bugs son omnipresentes; si no se matan ahora se arrastran a cada batch siguiente.

**Objetivo:** que la app deje de sentirse rota a nivel sistema y que el gate `tsc` sea autoritativo local (el sandbox OneDrive nunca lo completa).

**Construye / cierra (tracker):**
- **INFRA-P0** · SPA fallback en `vercel.json` (rewrites catch-all → `/index.html`). Mata el 404 crudo en refresh/deep-link. *Config de deploy, no código.* (Audit web P0-1)
- **KEY-1 (P0)** · `KeyboardAvoidingView` app-wide vía componente `Screen` compartido — el teclado tapa inputs en la parte baja. (Bug Enrique · omnipresente)
- **HOME-1 (P0)** · rework de `HomeFloatingButton` (`src/components/ui/HomeFloatingButton.tsx`, montado `_layout.tsx:263`): matar el `router.replace('/(tabs)')` que **reinicia la app** (→ `router.navigate`/`push`), cambiar "rayito"/`flash` icon → **casita con ícono ATP sin letras**, arriba-izquierda, **persistente en todas menos HOY**, tamaño correcto.
- **NAVY-SEALS (P1)** · quitar la autoridad de los 2 campos `benefit` user-facing (`interventions-catalog.ts:3320,:3541`). El campo `citation` NO se renderiza — solo tocar `benefit`. (Doctrina no-citar-autoridades / no-matar-placebo)
- **Morado off-brand (P2)** · `chronotype.tsx:29` `#7c3aed` → token de `brand.ts`.
- **Gate infra local:** correr `npx tsc --noEmit` en la máquina de Enrique, podar `.claude/worktrees/*` (inflan el tsc), rename migraciones `198a→198 / 198b→199` (CLI rechaza letras).

**Skill:** 🍎 + 💎 para el home button (feel del tap, posición, tamaño) y el KeyboardAvoidingView (movimiento fluido/interrumpible del scroll al aparecer teclado).

**Entregable:** `DELIVERY_MB0_CIMIENTO.md` + OTA preview.

**🚦 GATE (device físico, obligatorio):** teclado NO tapa inputs en ninguna pantalla baja · home button persistente, no reinicia, casita ATP correcta · refresh/deep-link en ruta interna ≠ `/` NO da 404 · `tsc --noEmit` = 0 errores en la máquina de Enrique.

---

### 🟥 MB-1 · CORAZÓN HOY / AGENDA / YO / EDAD-ATP (funcional P0-P1)
**Esfuerzo: M** · La columna vertebral emocional de ATP. Casi todo está hecho; son bugs de alto impacto sobre el "se siente ATP".

**Objetivo:** que el loop diario (HOY ↔ Agenda ↔ Mi Protocolo ↔ YO) y el número estrella (Edad ATP) sean impecables.

**Construye / cierra:**
- **HOY-1 (P0)** · regresar cards de **meditación + journal** a HOY (investigar si batch-1 las quitó o quedaron condicionadas al protocolo). Que sean activables.
- **EDAD-ATP (P1)** · corregir el sentido invertido "27.8 biológicos · 7.2 años SOBRE tu edad real". Verificar cálculo + palabra ("sobre" vs "debajo") + input de edad real. Es el ancla de valor — no puede mentir. (Audit web P1-1)
- **YO-1 (P1)** · regresar Edad ATP a YO como **primer dato desplegado** (perfil founder ahí). (Doctrina Edad-ATP-a-YO)
- **HOY-2 (P1)** · rediseñar "Ajustar mi protocolo" (se siente horrendo). **Mapear customer journey ANTES de rediseñar** (memoria `feedback_customer_journey`). Guiado no prisionero.
- **Cronotipo Delfín (P1)** · regresar como **estado TEMPORAL** (avisar + decir cronotipo madre para que se apegue y resuelva). No esconderlo. (Doctrina Delfín)
- **P3 agenda** · dedup semántico residual ("Desayuno proteico"+"Romper ayuno"; "Running"+"Zona 2") · eventos pasados sin estado (atenuar/colapsar).

**Skill:** 🍎 para el flujo de ajuste de protocolo (interacción guiada, no modal-prisión).

**Entregable:** `DELIVERY_MB1_CORAZON.md` + OTA.

**🚦 GATE (device):** cards HOY meditación/journal activables y palomean electrón · Edad ATP con signo correcto y como 1er dato en YO · "Ajustar protocolo" se siente ATP · agenda sin duplicados semánticos, pasados diferenciados.

---

### 🟥 MB-2 · SUPLEMENTOS USABLE END-TO-END (P1, un solo flujo)
**Esfuerzo: M** · Todos los bugs de suplementos comparten **una raíz**: el flujo de crear/gestionar tomas. Se resuelven juntos o no cierran.

**Objetivo:** flujo completo scan→plan→tomas múltiples→recordatorio en agenda, sin fricción.

**Construye / cierra:**
- **SUP-3 (P1) [RAÍZ]** · habilitar **múltiples tomas/día (AM+PM)**. Reactivar/arreglar `Sprint SUPS_DOSIS_MULTIPLES`. Sin esto lo demás no cierra.
- **SUP-1 (P1)** · scan de etiqueta → botón **"agregar a mi plan"** → crea card con datos escaneados prellenados (texto libre editable) + **sello BHA auto**.
- **SUP-2 (P1)** · arreglar el dropdown de introducción **trabado/hasta-abajo** (revisar imagen adjunta de Enrique).
- **SUP-4 (P1)** · conectar momentos de toma con **cards de agenda** (recordatorios reales) — reusar el path de notif local de Batch 4 (`agenda-local-notifications.ts`, sin `cancelAll`).
- **Perf (#35)** · suplementos lento.

**Skill:** ✍️ + 💎 para el dropdown y el flujo de creación de card (input amigable iOS, helper multiselect — memoria copy_ux).

**Entregable:** `DELIVERY_MB2_SUPLEMENTOS.md` + OTA. **Riesgo DB:** puede requerir migración (multi-toma = filas/estructura) → idempotente + `db push` + verificar schema cache.

**🚦 GATE (device):** crear suplemento con 2 tomas AM+PM · scan→plan crea card con BHA · dropdown fluido · recordatorio de toma dispara en background.

---

### 🟧 MB-3 · FITNESS · REBUILD TOTAL (XL, sprint dedicado)
**Esfuerzo: XL** · "Donde nació la app" y hoy está al ~35%. Sprint propio, no diluir. **Customer journey / CX primero** (memoria `feedback_customer_journey`: módulo torpe → mapear CX, no apilar features).

**Objetivo:** Fitness que invite a entrenar — rutinas, métodos propietarios, ejecución, biblioteca, timers, registro cardio/fuerza — con capa editorial ATP.

**Construye / cierra:**
- **Fase 3A · quirúrgico (desatasca navegación):** FIT-1 rename "ATP Explorar"→"ATP Fitness" (`fitness-hub.tsx:39`) · FIT-2 "timer rápido" → abrir **pantalla de TIMERS ESTÁNDAR existente** (elegir uno, fin — NO el builder) · FIT-3 card cardio de HOY → **registrar sesión de cardio directo** (no al hub).
- **Fase 3B · rebuild de raíz (FIT-4):** arquitectura de información Fitness (menú-vs-datos), ejecución de rutina, biblioteca de ejercicios, métodos propietarios, registro de fuerza/cardio con electrones correctos (histórico: cardio otorgó mal los electrones antes — validar pesos).
- **Fase 3C · capa editorial (P2):** molde `EditorialCard` (imagen B/N + degradado + concept-color) a las 3 cards + matar el vacío negro al fondo.

**Skill:** ✍️ dirección visual del molde · 🍎 ejecución de rutina / timers / gestos de sesión · 💎 pulido de cada componente (contador, transición set-a-set).

**Entregable:** `DELIVERY_MB3_FITNESS_REBUILD.md` + OTA (+ eas build si hay dep nativa de timer/audio).

**🚦 GATE (device, exhaustivo):** journey completo — entrar a Fitness, elegir rutina, ejecutar con timer, registrar cardio Y fuerza, ver biblioteca, electrones correctos, cero vacío negro, se siente editorial. **Este gate es de los más largos** — Fitness es el origen y el más sensible.

---

### 🟧 MB-4 · ARGOS JARVIS (XL, TRACK DEDICADO — ancla de venta)
**Esfuerzo: XL** · Es el **ancla de ATP Pro**. Máxima calidad. **No se diluye en un batch mixto.** Arranca en paralelo temprano (la investigación de personalidad/system prompt puede empezar tras MB-0) y aterriza sus fases pesadas a mitad de timeline. **Detalle de fases en la §4.**

**Objetivo:** ARGOS = "Jarvis en el bolsillo" (memoria `project_argos_como_jarvis`): presencia con avatar/personalidad, proactivo en Pro, multimodal, voz.

**Cierra (tracker):** Meet ARGOS WOW (#43) · ARGOS level-up personalidad · migrar Sonnet 4-20250514 → 4-6 (PROMPT_004) · rate limits per tier · síntomas pattern / cross-parameter / vigencia labs (#48/49/50). Base ya buena: on-doctrine, usa labs reales, deriva a profesional, `argos-proxy` ya con fallback Gemini + logging.

**Skill:** ✍️ identidad visual del avatar/presencia · 🍎 motion del avatar y del stream de voz (materiales, interrupción, feel de "está pensando") · 💎 pulido de burbujas/estados/microinteracción.

**🚦 GATES:** uno por fase (ver §4). El gate final es **la demo de venta**: ARGOS con voz, proactivo, con personalidad reconocible, que un tester diga "wow".

---

### 🟨 MB-5 · MENTE COMPLETA + AUDIO (ElevenLabs) (L)
**Esfuerzo: L** · Hub Mente ya muy mejorado (editorial, rachas, pills). Falta la obra negra: **audio real**.

**Objetivo:** meditación y respiración que se puedan **usar de verdad** (audio, no botones muertos).

**Construye / cierra:**
- **Audio Meditación** · ElevenLabs (voz guiada) + sonidos/ambientes. (#19/#46)
- **Audio Respiración** · sonidos, fondos, música, editorial. (#18)
- **Binaurales + NSDR custom** (#46).
- **N-Back Challenge UI** · lógica + mig 197 + tests YA listos, solo falta UI → **surface** (barato, cierra un ⬜). (#45)
- **Copy "@" inclusivo** · "Relajad@"→"En calma"/"A gusto" (doctrina copy MX). (P3-1)

**Skill:** 🍎 player de audio (materiales translúcidos, motion del progreso, interrupción) · 💎 pulido de estados play/pausa/seek.

**Entregable:** `DELIVERY_MB5_MENTE_AUDIO.md` + OTA (+ eas build si `expo-av`/audio nativo lo pide). **Riesgo:** ElevenLabs = costo LLM/API → gate por H+ (no por tier; memoria `features_premium_como_transaccion_hplus`) + comprimir/cachear audios.

**🚦 GATE (device):** reproducir meditación y respiración con audio real (background + lock screen) · N-Back jugable · sin "@" literal.

---

### 🟨 MB-6 · ATP SLEEP TRACK (L)
**Esfuerzo: L** · `/sleep` ya existe editorial (vacía, pulida). Falta el motor.

**Objetivo:** sleep cycle integrado — arquitectura 5 ciclos, 4 cronotipos (memoria `reference_sueno_atp`), datos que alimenten Edad ATP y HOY.

**Construye:** pantalla `/sleep` con datos reales (entrada manual V2, ganchos para wearable en v2.1) · integración con cronotipo · aporte a ATP Score.

**Skill:** ✍️ dirección visual (editorial, datos legibles) · 🍎 gráficas/transiciones.

**Entregable:** `DELIVERY_MB6_SLEEP.md` + OTA.

**🚦 GATE (device):** registrar sueño, ver arquitectura de ciclos, impacto en ATP Score visible.

---

### 🟨 MB-7 · CICLO / EMBARAZO (M) — ⚠️ requiere cuenta femenina
**Esfuerzo: M** · No auditable en la cuenta de Enrique (masculina, pilar gated). **Requiere cuenta de prueba femenina para el gate** — planear con anticipación.

**Objetivo:** pilar Ciclo pulido + máscara "ATP Embarazo" con sensibilidad extra.

**Construye / cierra:**
- Módulo CICLO máscara **"ATP Embarazo"** (visuals + copy sensibles — memoria `atp_embarazo_modulo`).
- Labs de mujeres **contextualizados por fase del ciclo** (memoria `labs_con_contexto_ciclo`).
- Modulación **bidireccional** (folicular/ovulatoria intensificar, lútea/menstrual escuchar — no paternalismo). (Ya en doctrina; validar en UI.)

**Skill:** ✍️ sensibilidad visual/tipográfica (embarazo = tono delicado).

**Entregable:** `DELIVERY_MB7_CICLO.md` + OTA.

**🚦 GATE (device, CUENTA FEMENINA):** calendario, síntomas, predicción, compañero, máscara embarazo, labs contextualizados por fase. **Gate crítico** porque es ciego a la cuenta de Enrique — no saltarlo.

---

### 🟩 MB-8 · PULIDO EDITORIAL + LEGIBILIDAD APP-WIDE (M)
**Esfuerzo: M** · Barrido transversal de las deudas P2/P3 que quedan.

**Construye / cierra:**
- **Mi Expediente** snake_case → labels legibles ("colesterol_ldl"→"Colesterol LDL", etc.). (P2-1)
- **Hidratación pelona** → contexto epigenético + historial del día + imagen editorial. (P2-3)
- **Vacíos negros** restantes (Evaluaciones + lo que no cerró Fitness). (P2-4)
- **Toast** "N notificaciones sin leer" → auto-dismiss + no tapar header. (P3-2)
- **Salud Funcional** · auditoría completa "qué sirve / qué no" (#134) · cetonas 3 fuentes (#113) · vocab 5 categorías ocular/vagal/respiración/atención/contemplativo (#114) · ducha Haghayegh corregir (baño tibio + flora piel, #117).
- **Cuestionario** · Fitzpatrick Tipo 5/4 dup (#86) · 3 tests rojos post-epigenética (#125).
- **Copy/UX globales** · español MX, explicar siglas, guiar con ejemplos, helpers multiselect, inputs amigables iOS.

**Skill:** ✍️ + 💎 para vacíos negros, molde editorial y micro-copy.

**Entregable:** `DELIVERY_MB8_PULIDO.md` + OTA.

**🚦 GATE (device, sweep pantalla-por-pantalla):** ninguna pantalla con identificador crudo, vacío negro, ni card pelona · toast se auto-descarta.

---

### 🟩 MB-9 · LIGHT MODE (L/XL, bestia aparte)
**Esfuerzo: L→XL** · 0% de infra hoy (`brand.ts` solo dark). Es una **capa semántica de tema** que toca toda la app — por eso va **tarde**, cuando las pantallas ya están estables (no repintar en dark y light dos veces).

**Objetivo:** toggle dark/light con paridad visual y legibilidad en ambas.

**Construye:** capa de tokens semánticos (fondo/superficie/texto/acento) sobre `brand.ts` · migrar hardcodes de color a tokens · toggle en ajustes · verificar cada pantalla en light.

**Skill:** 💎 (el detalle invisible: contraste, sombras, elevación en light) + ✍️ dirección.

**Entregable:** `DELIVERY_MB9_LIGHT.md` + OTA.

**🚦 GATE (device):** toggle light, recorrer las 7 pilares — todo legible, editorial, sin colores rotos ni contraste insuficiente.

---

### 🟩 MB-10 · ONBOARDING WOW + WELCOME TOUR POST-PAGO (M)
**Esfuerzo: M** · Depende de MB-4 (Meet ARGOS WOW usa la personalidad Jarvis). Va después de que ARGOS tenga personalidad.

**Objetivo:** primera impresión de nivel producto premium (memoria `project_app_welcome_tour`: bienvenida + setup + tour post-pago, 7 pantallas + Meet ARGOS, WOW por calidad).

**Construye / cierra:** Meet ARGOS reescritura WOW (#43, texto de Enrique) · welcome tour post-pago (7 pantallas) · **distinguir marketing funnel (web/somosatp.com) de product onboarding (app)** — memoria `distinguir_marketing_vs_producto`.

**Skill:** 🍎 motion/transiciones del tour · ✍️ dirección editorial.

**Entregable:** `DELIVERY_MB10_ONBOARDING.md` + OTA.

**🚦 GATE (device):** flujo completo post-pago → bienvenida → setup → Meet ARGOS (con personalidad) → tour. Que se sienta WOW.

---

### 🟦 MB-11 · VALIDACIÓN CLÍNICA MARIANA (S, en PARALELO — calendar-blocked)
**Esfuerzo: S** (pero bloqueado por agenda de Mariana, no por dev). Corre **en paralelo** a los batches de código.

**Cierra:** validación final de preguntas del Cuestionario Maestro (mig 203) · scoring del motor ×5 (validar → 1 línea, #130) · flags Mariana consolidados. **Enrique es el autor del algoritmo; Mariana valida/firma** (memoria `enrique_es_el_autor`).

**Entregable:** `VALIDACION_MARIANA_V2.md`. **No tiene device-gate propio** — se integra a los batches que toca (Cuestionario, Salud, motor).

---

### 🟦 MB-12 · INFRA PRE-BETA + HARDENING FINAL (M) — último gate antes de testers
**Esfuerzo: M** · TRACK C + el gran device-test consolidado. **Es la puerta a la beta founders.**

**Cierra:** Sentry sourcemaps upload (#59) · SQL boost testers H+ (#60) · runbook launch day (#61) · comms testers + invite Skool + grupo Skool cerrado con URL (#62/#63) · regenerar tipos expo-router / quitar 8 casts `as any` (#64) · **device retest GRANDE** de todos los batches juntos · `eas build` de versión (bump app.json → build inmediato, regla #11).

**🚦 GATE FINAL (device, todos los pilares, cuenta masculina + femenina):** la checklist de "V2 lista para beta" de la §6 pasa completa. Solo entonces entran testers.

---

## 3. ORDEN RECOMENDADO Y ESFUERZO

| # | Mega-batch | Esfuerzo | Depende de | Paraleliza |
|---|---|---|---|---|
| MB-0 | Cimiento (infra P0) | M | — | — |
| MB-1 | Corazón HOY/Agenda/YO | M | MB-0 | — |
| MB-2 | Suplementos end-to-end | M | MB-0 | — |
| MB-3 | **Fitness rebuild** | **XL** | MB-0 | — |
| MB-4 | **ARGOS Jarvis** | **XL** | MB-0 | ✅ track propio, arranca temprano |
| MB-5 | Mente + audio | L | MB-0 | — |
| MB-6 | Sleep Track | L | MB-1 (Edad ATP) | — |
| MB-7 | Ciclo / Embarazo | M | MB-0 | ⚠️ cuenta femenina |
| MB-8 | Pulido editorial | M | MB-3,5,6 | — |
| MB-9 | LIGHT mode | L/XL | casi todo estable | va tarde |
| MB-10 | Onboarding WOW | M | MB-4 | — |
| MB-11 | Validación Mariana | S | — | ✅ paralelo todo el tiempo |
| MB-12 | Infra pre-beta (gate final) | M | todos | — |

**Orden en una línea:** MB-0 Cimiento → MB-1 Corazón → MB-2 Suplementos → MB-3 Fitness Rebuild → MB-4 ARGOS Jarvis → MB-5 Mente+Audio → MB-6 Sleep → MB-7 Ciclo → MB-8 Pulido → MB-9 LIGHT → MB-10 Onboarding WOW → MB-12 Infra Pre-Beta *(MB-11 Mariana corre en paralelo)*.

### Lectura honesta del total
Suma cruda: 3×M + 2×XL + 3×L + resto ≈ **19-20 semanas** si fuera 100% secuencial. Con la paralelización real (ARGOS como track propio solapado, Mariana en paralelo, pulido absorbiendo restos), y **descontando** que los gates de device y la fricción del mount OneDrive **sí cuestan tiempo real** (no idealizar), el rango honesto es:

> **~14-18 semanas de dev enfocado ≈ 3.5-4.5 meses.** Beta founders realista: **octubre-noviembre 2026**, no 1 de agosto.

Si se mete presión de cash con más subagentes Fable en paralelo (Fitness y ARGOS a la vez, Mente y Sleep a la vez), se puede comprimir hacia **~12-14 semanas** — pero **no por debajo de eso sin re-introducir el riesgo de los 30 bugs** (batches sin gate). La compresión se paga en gates más pesados, no en saltárselos.

---

## 4. TRACK ARGOS JARVIS (desarrollo dedicado — el ancla)

ARGOS es la razón por la que un founder paga Pro. Merece su propio track con **5 fases**, cada una con gate. Arranca tras MB-0 y corre en paralelo; sus fases pesadas (multimodal, voz) aterrizan a mitad de timeline. Base actual ya es buena (on-doctrine, labs reales, deriva a profesional, `argos-proxy` con fallback Gemini + logging + streaming corregido).

### Fase J1 · Personalidad + System Prompt (M) 🍎✍️
- Definir la **voz de ARGOS**: Jarvis en el bolsillo — competente, cercano, con humor calibrado, nunca servil. Tono directo/analogías de ingeniería, desmitificación (memoria `comunicacion_enrique`).
- Reescribir el system prompt con la personalidad + los 3 niveles de comunicación (Nivel 3 = controversias solo si el user pregunta — doctrina no-matar-placebo).
- Migrar modelo **Sonnet 4-20250514 → 4-6** (PROMPT_004).
- **Gate:** conversación de prueba — ARGOS "suena a alguien", on-doctrine, no rompe placebo.

### Fase J2 · Presencia + Avatar (M) ✍️🍎💎
- Avatar visual con identidad (inspiración: Argos, el husky de Enrique — memoria `perros_enrique`). Estados: idle, pensando, hablando.
- Materiales translúcidos + motion (feel de "está vivo", interrupción fluida).
- Matar el look "chafón/lime-brutalist" heredado → editorial ATP.
- **Gate (device):** avatar presente, con estados, se siente premium, no roto.

### Fase J3 · Proactividad (L) 🍎
- ARGOS que **inicia** (no solo responde): sugiere ajustes de protocolo, nota patrones, felicita brincos >15% (memoria `carrot_stick`). **Proactivo = Pro premium** (memoria `agenda_como_asistente`, `coach_proactivo`).
- Síntomas pattern detection (#48) · cross-parameter analysis (#49) · vigencia inteligente de labs (#50).
- **Gate (device):** ARGOS dispara una sugerencia proactiva pertinente basada en datos reales del user.

### Fase J4 · Multimodal (L) 🍎💎
- Entrada/salida multimodal (foto de comida/etiqueta/lab → ARGOS interpreta). Reusa el path de scan de suplementos (MB-2) y foto de nutrición.
- **Gate por H+** (feature LLM cara — no gate por tier).
- **Gate (device):** mandar foto → ARGOS responde con contexto correcto.

### Fase J5 · Voz (L) 🍎💎
- Voz de ARGOS (ElevenLabs — sinergia con MB-5). Hablar y escuchar. Feel de "conversación", no TTS robótico.
- Rate limits per tier + logging de costo.
- **Gate final = DEMO DE VENTA (device):** ARGOS con voz + proactivo + personalidad + avatar. Un tester debe decir "wow". **Este es el momento que vende Pro.**

**Riesgos ARGOS:** costo LLM/voz (palanca H+, no tier) · latencia de voz en device real · fallback Gemini debe cubrir el modo voz · **no OpenAI** (memoria `no_openai_preferencia` — stack ya alineado Claude + Gemini + ElevenLabs).

---

## 5. RIESGOS Y GATES

### 5.1 Device-tests OBLIGATORIOS (no negociable)
Gate de device físico al cierre de: **MB-0, MB-1, MB-2, MB-3 (exhaustivo), MB-5, MB-6, MB-7 (cuenta femenina), MB-8 (sweep), MB-9, MB-10, cada fase de ARGOS, y MB-12 (final consolidado)**. Regla: **ningún batch grande abre antes de que el anterior pase su gate.** Esto es lo que evita repetir "5 sprints → 30 bugs".

### 5.2 Riesgo de migración / DB
- **MB-2 Suplementos** (multi-toma = estructura nueva) y **MB-7 Ciclo** son los de mayor probabilidad de migración. Reglas: idempotente (`IF NOT EXISTS`/`ON CONFLICT`), `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` + policy, Cowork audita branch antes del merge, `npx supabase db push` al remoto.
- **Trampa conocida:** error "schema cache columna X" = deploy gap (memoria `supabase_migration_gap`) → verificar migrations + db push, no editar en SQL Editor.
- **Electrón booleano nuevo** (Fitness/Sleep pueden introducir) requiere **3 lugares** — falta el 3ro = falla silenciosa (memoria `nuevo_electron_3_lugares`). Emitir `DeviceEventEmitter` post-electrones/nutrición.

### 5.3 Dónde muerde el mount OneDrive
- **`tsc` masivo NO completa en el sandbox** (I/O patológico). El gate `tsc --noEmit` **corre en la máquina de Enrique**, no en Cowork. (Confirmado Audit Ronda 2.)
- **Riesgo crónico:** `index.lock` huérfano / index corrupto (repo en OneDrive). Fix conocido: `rm .git/index.lock` + `git reset --hard HEAD`, sin pánico (memoria `git_onedrive_riesgo`).
- **Tamaños de archivo `stale/inflados`** vía bash sobre OneDrive — cross-check antes de citar peso (memoria `bash_onedrive_tamanos`).
- **Podar `.claude/worktrees/*`** (MB-0) — el glob `**` del tsconfig los incluye e infla cualquier tsc local.

### 5.4 Riesgo de dependencia nativa → build
- MB-3 (timers), MB-5 (audio `expo-av`) y MB-4 J5 (voz) pueden requerir **native build** (regla #10). Deploy default sigue siendo **OTA** (`eas update --branch preview`); solo se hace `eas build` para cambio nativo o bump de versión (regla #11: **nunca cambiar versión en app.json sin build inmediato**).

### 5.5 Riesgo de scope-creep clínico
- Backend Fx, wearables, multimodal-hardware y genética **NO entran a V2 consumer**. Si aparecen en un batch, se anotan al track post-founders (§7), no se cuelan.

---

## 6. DEFINICIÓN DE "V2 LISTA PARA BETA" (checklist de done por módulo)

Un módulo está **done** solo si: comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real en device.

- [ ] **Infra:** 0 errores `tsc` (máquina Enrique) · sin 404 en refresh/deep-link · Sentry sourcemaps · runbook + comms + Skool listos · versión bumpeada con build.
- [ ] **Design system:** lime-brutalist muerto en toda pantalla · sin vacíos negros · sin identificadores crudos · **LIGHT mode funcional** · sin colores off-brand.
- [ ] **HOY:** cards meditación/journal activables · responden a Mi Protocolo · "Ajustar protocolo" se siente ATP · electrones correctos.
- [ ] **Agenda:** sin duplicados semánticos · pasados diferenciados · notifs disparan en background (device) · unificada con HOY.
- [ ] **YO:** Edad ATP como 1er dato, con signo correcto · cronotipo (incl. Delfín temporal) dice algo de ti.
- [ ] **Cuestionario Maestro:** validado por Mariana · Fitzpatrick sin dup · 3 tests rojos verdes.
- [ ] **Salud Funcional:** Mi Expediente legible · Edad ATP correcta · scoring motor ×5 validado · auditoría qué-sirve/qué-no cerrada.
- [ ] **Nutrición/Suplementos:** multi-toma AM+PM · scan→plan+BHA · dropdown fluido · tomas en agenda · hidratación con contexto.
- [ ] **Mente:** audio real meditación + respiración (background/lock) · N-Back jugable · sin "@" literal.
- [ ] **Fitness:** navegable, editorial, journey completo (rutina/timer/cardio/fuerza/biblioteca) · electrones correctos · sin vacío negro.
- [ ] **ARGOS Jarvis:** personalidad + avatar + proactivo + multimodal + voz · Meet ARGOS WOW · Sonnet 4-6 · rate limits · **pasa la demo de venta**.
- [ ] **Ciclo/Embarazo:** probado en cuenta femenina · máscara embarazo · labs por fase · modulación bidireccional.
- [ ] **Onboarding:** post-pago → bienvenida → setup → Meet ARGOS → tour, se siente WOW.
- [ ] **Sleep Track:** registra sueño · alimenta ATP Score.
- [ ] **Notificaciones:** device retest background OK · toast auto-dismiss.

---

## 7. FUERA DE V2.0 (track post-founders — para que NADA se olvide)

No bloquean la beta founders. Se activan después, como **track B2B2C / v2.1+**:
- **Backend Fx clínico** · 24 req Mariana (cuestionario ramificado, detector interacciones, "nothing to write") · HUB Fx (graba/transcribe/SOAP, chat encriptado) · afiliados wallet unificado · motor de labs clínico time-series.
- **Wearables / multimodal-hardware / genética** (v2.1+, NO se venden aún — memoria feature-map).
- **Comunidad V1.5** (retos con inscripción, auth bridge Skool) · **Coach Proactivo** general (dogfood Enrique primero) · **BHA V2** crowd-sourced.

---

## 8. NOTA METODOLÓGICA

- Un batch grande NO abre hasta que el anterior pasa su **device-gate**. Es la ley anti-30-bugs.
- Deploy default = **OTA** (`eas update --branch preview`); `eas build` solo para nativo o bump de versión (con build inmediato, regla #11).
- Cowork **audita cada branch antes del merge**; migraciones idempotentes + `db push` al remoto.
- `tsc --noEmit` autoritativo = **máquina de Enrique** (el sandbox OneDrive no completa).
- Enrique es el **autor** del algoritmo/stack; Mariana **valida/firma**. Único dev = Enrique (Claude Code + subagentes Fable). Sin terceros.

*Generado por Cowork (dirección técnica/producto) · 2026-07-17 · plan de trabajo robusto "Ahora → V2.0 100%".*
