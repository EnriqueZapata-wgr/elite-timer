# 🔒 PLAN MAESTRO · "Ahora → V2.0" · **DEFINITIVO (v2 · LOCKED)**

**Fecha:** 2026-07-17 · **Autor:** Cowork (dirección técnica/producto) · **Estado:** LOCKED — integra la review de CC + las decisiones del founder. **Reemplaza** a `PLAN_MAESTRO_AHORA_A_V2_2026-07-17.md` (v1).

**Decisión founder vigente:** construir **V2.0 completa** → **beta founders sobre la V2 real** → venta. Con un puente de cash: **demo funcional de ARGOS Jarvis como PRE-VENTA de founders** antes de que V2 esté al 100% (vender el ancla, entregar completo).

**Fuente de verdad de estado:** `ESTADO_100_ATP_MASTER_TRACKER_2026-07-17.md` · `TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md` · `AUDITORIA_RONDA2_CODIGO/WEB_2026-07-17.md`.

---

## 0. QUÉ CAMBIÓ DE v1 → v2 (leer primero)

Este LOCKED integra **10 ajustes de la review de CC** y **3 decisiones + 1 add del founder**:

**Ajustes CC adoptados:**
1. **MB-0 se engorda** con 5 ítems baratos que destraban todo (tokens semánticos, CI GitHub Actions, mover los `as any` de expo-router #64, cuenta de test femenina, spike nativo).
2. **Sacar el repo de OneDrive** → carpeta local no-sincronizada. **Primerísimo paso de MB-0.** (Nos corrompió el index ~4 veces — costo único vs impuesto crónico.)
3. **Un solo build nativo planeado** post-MB-0/MB-1 con TODAS las deps previsibles. Nada de 3 builds reactivos.
4. **Smoke rolling de 10 min en CADA gate** (loop core completo), no solo las features del batch nuevo.
5. **MB-1 hereda el polish del loop diario** en SU gate (no se difiere a MB-8).
6. **ARGOS re-presupuestado a ~8 semanas.** Total honesto: **16-20 semanas → beta founders nov/dic 2026.**
7. **MB-11 Mariana con fecha dura (~fin de MB-5)** — blocker de MB-12.
8. **Fitness (MB-3) con time-box duro** — si excede la caja, se recorta biblioteca, no se extiende.
9. **J5 gate = 3 demos verificables en device.** Telemetría de costo/rate-limits movida a la frontera J3/J4.
10. **J3 con gobernanza anti-spam explícita** (caps, quiet hours, descartable, supresión).

**Decisiones del founder:**
- **LIGHT → recortado a v2.1.** Dark-only para el beta. La **capa de tokens semánticos SÍ va en MB-0** (para no cerrar la puerta), pero el ex-MB-9 (valores light + sweep) **SALE del plan V2**. Recupera ~2-3 semanas.
- **ARGOS presencia = orb/waveform abstracto animado** (idle/pensando/hablando, familia Siri / Dynamic Island). **NADA de mascota husky riggeada.** El homenaje a Argos vive en **nombre + voz + personalidad**. Se resuelve con prototipo interactivo en J2.
- **STT = Gemini audio-input** (NO OpenAI/Whisper — doctrina `no_openai`). Arquitectura de voz streaming (primer audio <2s) decidida en J1/J2.

**Add estratégico del founder:**
- **Demo ARGOS Jarvis como puente de cash** — hito paralelo tras MB-4/J2 (ver §5).

---

## 1. RESUMEN EJECUTIVO

**De dónde partimos:** V1.2.x en vivo, 89 pantallas, ~68K líneas, 4 mega-batches mergeados a `main` sin regresiones estructurales (Auditoría Ronda 2, código + web navegada). Base sólida: design system ATP (`src/constants/brand.ts`, tokens canónicos BG/BORDER/TEXT ya presentes), day-state/agenda/pregnancy-gate bien diseñados, Salud Funcional con arquitectura navegación-vs-datos, ARGOS on-doctrine, `argos-proxy` con fallback Gemini + logging. **~62% hacia V2.0.**

**A dónde vamos:** el **sistema operativo de rendimiento humano completo** — 7 pilares production-ready + **ARGOS Jarvis** como copiloto con presencia (orb animado), voz y proactividad. Todo ⬜/🔨 del tracker cerrado, bugs P0-P3 muertos, Sleep Track, audio real en Mente, Fitness reconstruido de raíz. **Dark-only** (LIGHT → v2.1).

**Fecha honesta:** **16-20 semanas de dev enfocado ≈ 4-5 meses.** Beta founders realista: **noviembre / diciembre 2026** (no 1 de agosto). Mejor decirlo hoy que descubrirlo en septiembre. **El puente de cash** entre ahora y el beta es la **pre-venta de founders contra la demo de ARGOS** (§5).

**Filosofía: STAGED-WITH-GATES + ROLLING-SMOKE.**
La evidencia del riesgo está en casa: **5 sprints sin device-test → 30 bugs de Enrique.** Nunca más. Método:
- **Mega-batches congruentes por raíz.** Cada batch grande **termina en un GATE**: `tsc --noEmit` limpio (ahora vía **CI**, no manual) + delivery escrito + **device-test físico**.
- **Rolling smoke de 10 min en CADA gate**: no solo se prueban las features del batch nuevo — se recorre **el loop core completo** (HOY → card del palomar → agenda → registrar → ver reflejo en HOY/YO). Es el anti-regresión real: atrapa lo que un batch rompió río arriba.
- Un batch se declara hecho cuando pasa la **rúbrica founder**: comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real en device.

**Doctrinas ATP que gobiernan todo:** design system lime+teal+amarillo editorial (lime-brutalist muerto), español MX, guiar todo (ejemplos + helpers), menú-vs-datos (un dato = un lugar), no-matar-placebo (riesgos+ejecución, controversias solo en Nivel 3 ARGOS), Edad ATP a YO como primer dato, dato-del-user-sagrado, sin nombres propios en copy user-facing.

**Alcance V2.0 = app consumer completa, dark-only.** Explícitamente **FUERA de V2.0** (§8): **LIGHT mode** (→ v2.1), **Backend Fx clínico** (24 req Mariana, HUB Fx, afiliados wallet, motor labs clínico) y **wearables / multimodal-hardware / genética** (v2.1+, NO se venden aún).

---

## 2. SECUENCIA DE MEGA-BATCHES (LOCKED)

Ordenados por **dependencia + valor**: primero el cimiento engordado (infra/funcional P0 + los 5 destrabadores + repo fuera de OneDrive), luego los dos tent-poles (Fitness rebuild, ARGOS Jarvis 8 sem), luego los módulos que se apoyan, y al final el pulido transversal y el hardening pre-beta. **LIGHT ya no está en la secuencia** (v2.1).

**Leyenda esfuerzo:** S ≈ ½ sem · M ≈ 1 sem · L ≈ 2 sem · XL ≈ 3 sem (dev enfocado, incluye el device-test + rolling smoke del gate).

**Skills de diseño instaladas:** 🍎 **apple-design** · ✍️ **frontend-design** · 💎 **emil-design-eng** · 🛡️ **superpowers** (disciplina/verificación) · 🔬 **impeccable** (rigor de entrega).

**Rolling smoke (definición única, aplica a TODOS los gates):** recorrer en device el **loop core** — abrir HOY → tocar una card del palomar → ver la agenda → registrar algo → volver a HOY y ver el reflejo → abrir YO y ver Edad ATP. 10 min. Se corre **además** de la checklist específica del batch. Si el loop core se siente roto, el gate NO pasa aunque las features nuevas funcionen.

---

### 🟥 MB-0 · CIMIENTO ENGORDADO — Infra + transversal P0 + 5 destrabadores
**Esfuerzo: M→L** · **Va primero, sin excepción.** Detalle ejecutable en `FABLE_MB0_CIMIENTO_2026-07-17.md`.

**Objetivo:** matar la sensación "roto" de raíz, **sacar el repo de OneDrive**, y dejar instalados los 5 destrabadores baratos que ahorran semanas río abajo (CI que hace autoritativo el `tsc`, tokens semánticos que habilitan LIGHT futuro, casts protegidos, cuenta femenina de test, decisión de stack nativo).

**Paso 0 (primerísimo):** **mover el repo fuera de OneDrive** a carpeta local no-sincronizada. Reconfigurar remotos, verificar `git status` limpio, re-clonar si el index viene sucio. Elimina de raíz la corrupción de index (~4 incidentes) y los tamaños stale de bash.

**Los 5 destrabadores:**
- **(a) Capa de tokens SEMÁNTICOS** — alias `bg`/`surface`/`text`/`accent` sobre `src/constants/brand.ts` (que ya tiene BG/BORDER/TEXT canónicos). Habilita LIGHT en v2.1 sin repintar. **No cambia valores dark, solo agrega la capa de indirección.**
- **(b) CI GitHub Actions con `npx tsc --noEmit` en cada push** — mata el problema tsc-en-OneDrive de raíz (el sandbox no completa, la máquina de Enrique era paso manual) y convierte el gate `tsc` en autoritativo y automático.
- **(c) Mover los `as any` de expo-router (#64) aquí** — normalizar los casts de rutas para que el gate `tsc` sea confiable durante las 14+ semanas siguientes (protege el gate). Regenerar tipos de expo-router.
- **(d) Crear la cuenta de test FEMENINA ya** — habilita el smoke de Ciclo/Embarazo en todo el camino (hoy es ciego en la cuenta masculina de Enrique).
- **(e) Spike de decisión de stack nativo** — decidir qué deps nativas entran al build único post-MB-1 (ver §4): `expo-audio` (expo-av deprecado en SDK54), `react-native-keyboard-controller`, lib de motion para la presencia ARGOS.

**Construye / cierra (tracker):**
- **INFRA-P0** · SPA fallback en `vercel.json` (rewrites catch-all → `/index.html`). *Config de deploy.* (Audit web P0-1)
- **KEY-1 (P0)** · `KeyboardAvoidingView` app-wide vía componente `Screen` compartido. (Bug Enrique · omnipresente) — se blinda con `react-native-keyboard-controller` en el build único.
- **HOME-1 (P0)** · rework de `HomeFloatingButton` (`src/components/ui/HomeFloatingButton.tsx`, montado `_layout.tsx:263`): matar `router.replace('/(tabs)')` (→ `router.navigate`/`push`), "rayito"/`flash` → **casita con ícono ATP sin letras**, arriba-izquierda, persistente en todas menos HOY.
- **NAVY-SEALS (P1)** · quitar autoridad de los 2 campos `benefit` (`interventions-catalog.ts:3320,:3541`). Solo `benefit`, no `citation` (no se renderiza).
- **Morado off-brand (P2)** · `chronotype.tsx:29` `#7c3aed` → token de `brand.ts`.
- **Higiene:** podar `.claude/worktrees/*` (inflan tsc), rename migraciones `198a→198 / 198b→199`.

**Skill:** 🛡️ (disciplina/verificación app-wide) · 🍎 + 💎 para home button y KeyboardAvoidingView · 🔬 en el delivery.

**Entregable:** `DELIVERY_MB0_CIMIENTO.md` + OTA preview. Commit por ítem.

**🚦 GATE (device + CI):** CI verde (`tsc --noEmit` = 0 en cada push) · teclado NO tapa inputs en pantallas bajas · home button persistente, no reinicia, casita ATP · refresh/deep-link en ruta ≠ `/` NO da 404 · repo confirmado FUERA de OneDrive · cuenta femenina existe y loguea · **rolling smoke 10 min del loop core OK**.

---

### 🟥 MB-1 · CORAZÓN HOY / AGENDA / YO / EDAD-ATP + POLISH DEL LOOP DIARIO
**Esfuerzo: M→L** · La columna vertebral emocional de ATP + **el polish del loop que el user toca 50×/día** (heredado aquí, NO diferido a MB-8).

**Objetivo:** que el loop diario (HOY ↔ Agenda ↔ Mi Protocolo ↔ YO) y el número estrella (Edad ATP) sean impecables **y se sientan premium al tacto**.

**Construye / cierra:**
- **HOY-1 (P0)** · regresar cards de **meditación + journal** a HOY (investigar si batch-1 las quitó o quedaron condicionadas al protocolo). Activables.
- **EDAD-ATP (P1)** · corregir el sentido invertido "27.8 biológicos · 7.2 años SOBRE tu edad real". Verificar cálculo + palabra + input de edad real. (Audit web P1-1)
- **YO-1 (P1)** · Edad ATP a YO como **primer dato desplegado**.
- **HOY-2 (P1)** · rediseñar "Ajustar mi protocolo". **Mapear customer journey ANTES.** Guiado no prisionero.
- **Cronotipo Delfín (P1)** · regresar como **estado TEMPORAL** (avisar + cronotipo madre). No esconderlo.
- **P3 agenda** · dedup semántico residual · eventos pasados sin estado (atenuar/colapsar).
- **POLISH DEL LOOP DIARIO (heredado del ex-MB-8):** press states `scale(0.97)` en cards tocables, **feedback en pointer-down** (no en release), transiciones de HOY. Es la superficie de mayor frecuencia — se pule aquí, en su gate.

**Skill:** 🍎 (flujo de ajuste de protocolo + press states / pointer-down feedback / transiciones) · 💎 (feel del tap).

**Entregable:** `DELIVERY_MB1_CORAZON.md` + OTA.

**🚦 GATE (device):** cards HOY meditación/journal activables y palomean electrón · Edad ATP con signo correcto y 1er dato en YO · "Ajustar protocolo" se siente ATP · agenda sin duplicados, pasados diferenciados · **el loop diario responde al tacto (scale 0.97, feedback pointer-down)** · **rolling smoke 10 min OK**.

> **↳ AQUÍ SE PLANEA EL BUILD NATIVO ÚNICO** (ver §4): tras MB-1, con las deps previsibles ya decididas en el spike (e). Un solo `eas build`, no tres reactivos.

---

### 🟥 MB-2 · SUPLEMENTOS USABLE END-TO-END (P1, un solo flujo)
**Esfuerzo: M** · Todos los bugs comparten **una raíz**: el flujo de crear/gestionar tomas.

**Objetivo:** flujo completo scan→plan→tomas múltiples→recordatorio en agenda, sin fricción.

**Construye / cierra:**
- **SUP-3 (P1) [RAÍZ]** · **múltiples tomas/día (AM+PM)**. Reactivar `Sprint SUPS_DOSIS_MULTIPLES`. Sin esto lo demás no cierra.
- **SUP-1 (P1)** · scan → **"agregar a mi plan"** → card con datos prellenados (texto libre editable) + **sello BHA auto**.
- **SUP-2 (P1)** · dropdown de introducción **trabado/hasta-abajo**.
- **SUP-4 (P1)** · momentos de toma → **cards de agenda** (reusar `agenda-local-notifications.ts`, sin `cancelAll`).
- **Perf (#35)** · suplementos lento.

**Skill:** ✍️ + 💎 (dropdown, input iOS, helper multiselect).

**Entregable:** `DELIVERY_MB2_SUPLEMENTOS.md` + OTA. **Riesgo DB:** multi-toma puede requerir migración → idempotente + RLS + `db push` + verificar schema cache.

**🚦 GATE (device):** crear suplemento con 2 tomas AM+PM · scan→plan crea card con BHA · dropdown fluido · recordatorio dispara en background · **rolling smoke 10 min OK**.

---

### 🟧 MB-3 · FITNESS · REBUILD TOTAL (XL, sprint dedicado, TIME-BOX DURO)
**Esfuerzo: XL** · "Donde nació la app", hoy ~35%. **Customer journey / CX primero.** **Time-box duro: si excede la caja XL, se recorta la biblioteca de ejercicios — NO se extiende el batch.** Fitness completo no puede consumir el timeline de ARGOS.

**Objetivo:** Fitness que invite a entrenar — rutinas, métodos propietarios, ejecución, biblioteca, timers, registro cardio/fuerza — con capa editorial ATP.

**Construye / cierra:**
- **Fase 3A · quirúrgico:** FIT-1 rename "ATP Explorar"→"ATP Fitness" (`fitness-hub.tsx:39`) · FIT-2 "timer rápido" → **pantalla de TIMERS ESTÁNDAR existente** (no el builder) · FIT-3 card cardio HOY → **registrar cardio directo**.
- **Fase 3B · rebuild de raíz (FIT-4):** arquitectura de info (menú-vs-datos), ejecución de rutina, biblioteca, métodos propietarios, registro fuerza/cardio con electrones correctos (validar pesos — cardio otorgó mal antes).
- **Fase 3C · capa editorial (P2):** molde `EditorialCard` a las 3 cards + matar vacío negro.

**Time-box / recorte:** si al final de la caja XL la **biblioteca de ejercicios** no está pulida, se entrega con un subset y se marca deuda v2.1 — el journey de entrenar (rutina→timer→registro→electrones) NO es recortable; la biblioteca sí.

**Skill:** ✍️ (molde) · 🍎 (ejecución/timers/gestos) · 💎 (contador, transición set-a-set) · 🛡️ (no rebasar la caja).

**Entregable:** `DELIVERY_MB3_FITNESS_REBUILD.md` + OTA.

**🚦 GATE (device, exhaustivo):** entrar a Fitness → elegir rutina → ejecutar con timer → registrar cardio Y fuerza → ver biblioteca → electrones correctos → cero vacío negro → editorial · **rolling smoke 10 min del loop core (que Fitness no rompió HOY/agenda)**.

---

### 🟧 MB-4 · ARGOS JARVIS (~8 SEMANAS, TRACK DEDICADO — ancla de venta)
**Esfuerzo: ~8 semanas honestas** (J1 M + J2 M + J3 L + J4 L + J5 L, re-presupuestado por CC). Es el **ancla de ATP Pro** y el **motor del puente de cash** (§5). No se diluye en batch mixto. Arranca en paralelo temprano (personalidad/system prompt tras MB-0) y aterriza sus fases pesadas a mitad de timeline. **Detalle de fases en §4.**

**Objetivo:** ARGOS = "Jarvis en el bolsillo": **presencia = orb/waveform abstracto animado** (idle/pensando/hablando), proactivo en Pro (con gobernanza anti-spam), multimodal, voz (STT Gemini, primer audio <2s). **Sin mascota husky** — homenaje en nombre+voz+personalidad.

**Cierra:** Meet ARGOS WOW (#43) · level-up personalidad · migrar Sonnet 4-20250514 → 4-6 (PROMPT_004) · rate limits per tier · síntomas pattern / cross-parameter / vigencia labs (#48/49/50).

**Skill:** ✍️ (identidad visual del orb) · 🍎 (motion del orb + stream de voz, feel de "pensando", interrupción) · 💎 (estados/microinteracción) · 🛡️ (gates por fase).

**🚦 GATES:** uno por fase (§4). **Gate J5 = 3 demos verificables** (no "un tester dice wow"). **Telemetría de costo/rate-limits en la frontera J3/J4.**

---

### 🟨 MB-5 · MENTE COMPLETA + AUDIO (ElevenLabs) (L)
**Esfuerzo: L** · Hub Mente ya muy mejorado. Falta la obra negra: **audio real**.

**Objetivo:** meditación y respiración usables de verdad (audio, no botones muertos).

**Construye / cierra:**
- **Audio Meditación** · ElevenLabs (voz guiada) + ambientes. (#19/#46)
- **Audio Respiración** · sonidos, fondos, música, editorial. (#18)
- **Binaurales + NSDR custom** (#46).
- **N-Back Challenge UI** · lógica + mig 197 + tests YA listos, solo **surface** UI. (#45)
- **Copy "@" inclusivo** · "Relajad@"→"En calma"/"A gusto". (P3-1)

**Skill:** 🍎 (player: materiales, motion del progreso, interrupción) · 💎 (play/pausa/seek).

**Entregable:** `DELIVERY_MB5_MENTE_AUDIO.md` + OTA. **Audio background + lock screen ya cubierto por el build nativo único** (`expo-audio` + UIBackgroundModes). **Riesgo:** ElevenLabs = costo → gate por H+ + comprimir/cachear audios.

**🚦 GATE (device):** reproducir meditación y respiración con audio real (background + lock screen) · N-Back jugable · sin "@" literal · **rolling smoke 10 min OK**.

> **↳ FECHA DURA MB-11 (Mariana):** al cierre de MB-5, la validación clínica de Mariana debe estar entregada (es blocker de MB-12). Ver MB-11.

---

### 🟨 MB-6 · ATP SLEEP TRACK (L)
**Esfuerzo: L** · `/sleep` ya existe editorial (vacía, pulida). Falta el motor.

**Objetivo:** sleep cycle integrado — arquitectura 5 ciclos, 4 cronotipos, datos que alimenten Edad ATP y HOY.

**Construye:** `/sleep` con datos reales (entrada manual V2, ganchos wearable v2.1) · integración cronotipo · aporte a ATP Score.

**Skill:** ✍️ (editorial, datos legibles) · 🍎 (gráficas/transiciones).

**Entregable:** `DELIVERY_MB6_SLEEP.md` + OTA.

**🚦 GATE (device):** registrar sueño · ver arquitectura de ciclos · impacto en ATP Score visible · **rolling smoke 10 min OK**.

---

### 🟨 MB-7 · CICLO / EMBARAZO (M) — usa la CUENTA FEMENINA de MB-0
**Esfuerzo: M** · Ya no hay que "planear con anticipación" la cuenta: **existe desde MB-0 (destrabador d)**, y se ha usado en el rolling smoke de todos los gates previos.

**Objetivo:** pilar Ciclo pulido + máscara "ATP Embarazo" con sensibilidad extra.

**Construye / cierra:**
- Módulo CICLO máscara **"ATP Embarazo"** (visuals + copy sensibles).
- Labs de mujeres **contextualizados por fase del ciclo**.
- Modulación **bidireccional** (folicular/ovulatoria intensificar, lútea/menstrual escuchar — no paternalismo).

**Skill:** ✍️ (sensibilidad visual/tipográfica).

**Entregable:** `DELIVERY_MB7_CICLO.md` + OTA.

**🚦 GATE (device, CUENTA FEMENINA):** calendario, síntomas, predicción, compañero, máscara embarazo, labs por fase, modulación bidireccional · **rolling smoke 10 min en cuenta femenina**.

---

### 🟩 MB-8 · PULIDO EDITORIAL + LEGIBILIDAD APP-WIDE (M)
**Esfuerzo: M** · Barrido transversal de deudas P2/P3. **Ya NO carga el polish del loop diario** (se fue a MB-1). Aquí quedan las deudas de superficie de menor frecuencia.

**Construye / cierra:**
- **Mi Expediente** snake_case → labels legibles. (P2-1)
- **Hidratación pelona** → contexto epigenético + historial del día + imagen editorial. (P2-3)
- **Vacíos negros** restantes (Evaluaciones + lo que no cerró Fitness). (P2-4)
- **Toast** "N notificaciones sin leer" → auto-dismiss + no tapar header. (P3-2)
- **Salud Funcional** · auditoría "qué sirve/qué no" (#134) · cetonas 3 fuentes (#113) · vocab 5 categorías (#114) · ducha Haghayegh (#117).
- **Cuestionario** · Fitzpatrick Tipo 5/4 dup (#86) · 3 tests rojos (#125).
- **Copy/UX globales** · español MX, siglas, ejemplos, helpers, inputs iOS.

**Skill:** ✍️ + 💎 (vacíos negros, molde, micro-copy).

**Entregable:** `DELIVERY_MB8_PULIDO.md` + OTA.

**🚦 GATE (device, sweep pantalla-por-pantalla):** ninguna pantalla con identificador crudo, vacío negro ni card pelona · toast se auto-descarta · **rolling smoke 10 min OK**.

---

### 🟩 MB-10 · ONBOARDING WOW + WELCOME TOUR POST-PAGO (M)
**Esfuerzo: M** · Depende de MB-4 (Meet ARGOS usa la personalidad Jarvis + el orb).

**Objetivo:** primera impresión premium (bienvenida + setup + tour post-pago, 7 pantallas + Meet ARGOS).

**Construye / cierra:** Meet ARGOS reescritura WOW (#43, texto de Enrique) · welcome tour (7 pantallas) · **distinguir marketing funnel (web/somosatp.com) de product onboarding (app)**.

**Skill:** 🍎 (motion/transiciones del tour) · ✍️ (dirección editorial).

**Entregable:** `DELIVERY_MB10_ONBOARDING.md` + OTA.

**🚦 GATE (device):** flujo post-pago → bienvenida → setup → Meet ARGOS (con personalidad + orb) → tour. WOW · **rolling smoke 10 min OK**.

> **Nota:** no hay MB-9 en el plan LOCKED. El ex-MB-9 (LIGHT mode) **salió a v2.1**. La numeración se conserva para trazabilidad con v1.

---

### 🟦 MB-11 · VALIDACIÓN CLÍNICA MARIANA (S, PARALELO — **FECHA DURA: fin de MB-5**)
**Esfuerzo: S** (bloqueado por agenda de Mariana, no por dev). Corre en paralelo, **pero con fecha dura**: entregado **a más tardar al cierre de MB-5**, porque es **blocker de MB-12** (no se puede declarar V2 lista sin la firma clínica). Si Mariana no puede antes de esa fecha, escala a Enrique como riesgo de timeline.

**Cierra:** validación de preguntas del Cuestionario Maestro (mig 203) · scoring del motor ×5 (#130) · flags Mariana consolidados. **Enrique autor del algoritmo; Mariana valida/firma.**

**Entregable:** `VALIDACION_MARIANA_V2.md`. Se integra a los batches que toca (Cuestionario, Salud, motor).

---

### 🟦 MB-12 · INFRA PRE-BETA + HARDENING FINAL (M) — último gate antes de testers
**Esfuerzo: M** · TRACK C + el gran device-test consolidado. **Puerta a la beta founders.**

**Cierra:** Sentry sourcemaps upload (#59) · SQL boost testers H+ (#60) · runbook launch day (#61) · comms testers + invite Skool + grupo cerrado con URL (#62/#63) · **device retest GRANDE** de todos los batches juntos, **cuenta masculina + femenina** · `eas build` de versión (bump app.json → build inmediato, regla #11). *(Los `as any` de expo-router #64 ya se cerraron en MB-0.)*

**🚦 GATE FINAL (device, todos los pilares, ambas cuentas):** la checklist "V2 lista para beta" de §6 pasa completa + **rolling smoke del loop core impecable**. Solo entonces entran testers. **MB-11 (firma Mariana) debe estar cerrado.**

---

## 3. ORDEN RECOMENDADO Y ESFUERZO (LOCKED)

| # | Mega-batch | Esfuerzo | Depende de | Paraleliza |
|---|---|---|---|---|
| MB-0 | Cimiento engordado (infra P0 + 5 destrabadores + repo fuera de OneDrive) | M→L | — | — |
| MB-1 | Corazón HOY/Agenda/YO + polish loop diario | M→L | MB-0 | — |
| — | **BUILD NATIVO ÚNICO** (todas las deps previsibles) | — | MB-1 | — |
| MB-2 | Suplementos end-to-end | M | MB-0 | — |
| MB-3 | **Fitness rebuild** (time-box duro) | **XL** | MB-0 | — |
| MB-4 | **ARGOS Jarvis** | **~8 sem** | MB-0 | ✅ track propio, arranca temprano |
| — | **Demo ARGOS → PRE-VENTA founders** (puente cash) | — | MB-4/J2 | ✅ hito comercial paralelo |
| MB-5 | Mente + audio | L | MB-0 + build | — |
| MB-6 | Sleep Track | L | MB-1 (Edad ATP) | — |
| MB-7 | Ciclo / Embarazo | M | MB-0 (cuenta fem. lista) | ⚠️ usa cuenta femenina |
| MB-8 | Pulido editorial | M | MB-3,5,6 | — |
| MB-10 | Onboarding WOW | M | MB-4 | — |
| MB-11 | Validación Mariana | S | — | ✅ paralelo · **fecha dura fin MB-5** |
| MB-12 | Infra pre-beta (gate final) | M | todos + MB-11 | — |

*(No hay MB-9: LIGHT mode salió a v2.1.)*

**Orden en una línea:**
**MB-0 Cimiento → MB-1 Corazón (+polish loop) → [BUILD NATIVO ÚNICO] → MB-2 Suplementos → MB-3 Fitness (time-box) → MB-4 ARGOS Jarvis 8 sem → [PRE-VENTA founders] → MB-5 Mente+Audio → MB-6 Sleep → MB-7 Ciclo → MB-8 Pulido → MB-10 Onboarding WOW → MB-12 Infra Pre-Beta** *(MB-11 Mariana en paralelo, fecha dura fin de MB-5)*.

### Lectura honesta del total
Con ARGOS re-presupuestado a **~8 semanas**, LIGHT fuera (recupera 2-3 sem) y los gates + rolling smoke que **sí cuestan tiempo real**:

> **~16-20 semanas de dev enfocado ≈ 4-5 meses.** **Beta founders realista: noviembre / diciembre 2026.**

La compresión (más subagentes Fable en paralelo: Fitness y ARGOS a la vez, Mente y Sleep a la vez) puede acercar el borde inferior, pero **nunca a costa de saltar gates** — la compresión se paga en gates más pesados, no en omitirlos. El **cash entre hoy y el beta se cubre con la pre-venta de founders** (§5), no comprimiendo hasta re-introducir los 30 bugs.

---

## 4. TRACK ARGOS JARVIS + BUILD NATIVO ÚNICO

### 4.1 Build nativo único (post-MB-1)
**Un solo `eas build`**, planeado, con TODAS las deps nativas previsibles decididas en el spike (e) de MB-0. **Nada de 3 builds reactivos.**

Deps del build único:
- **`expo-audio`** — `expo-av` está **deprecado en SDK54**. Audio background + lock screen (Mente MB-5 + voz ARGOS J5) requiere `UIBackgroundModes` en el config nativo.
- **`react-native-keyboard-controller`** — `KeyboardAvoidingView` es frágil app-wide; blinda KEY-1 de MB-0.
- **Lib de motion de la presencia ARGOS** (orb/waveform) — la que decida el spike (e).

**Regla no negociable:** todo nativo nuevo **SIEMPRE lazy require** (no top-level import). Deploy default sigue siendo OTA; `eas build` solo para nativo o bump de versión (regla #11: nunca bump sin build inmediato).

### 4.2 Fases ARGOS (~8 semanas)
ARGOS es la razón por la que un founder paga Pro. Base actual buena (on-doctrine, labs reales, deriva a profesional, `argos-proxy` con fallback Gemini + logging + streaming corregido).

**Fase J1 · Personalidad + System Prompt (M) 🍎✍️**
- Voz de ARGOS: Jarvis en el bolsillo — competente, cercano, humor calibrado, nunca servil. Analogías de ingeniería, desmitificación.
- System prompt con personalidad + 3 niveles (Nivel 3 = controversias solo si el user pregunta — no-matar-placebo).
- Migrar Sonnet 4-20250514 → 4-6 (PROMPT_004).
- **Decisión de arquitectura de voz streaming** (primer audio <2s) — **STT = Gemini audio-input** (no OpenAI/Whisper).
- **Gate:** conversación de prueba — ARGOS "suena a alguien", on-doctrine, no rompe placebo.

**Fase J2 · Presencia = ORB / WAVEFORM ABSTRACTO (M) ✍️🍎💎**
- **Prototipo interactivo** del orb/waveform animado: estados **idle / pensando / hablando**, familia Siri / Dynamic Island. **NO mascota husky riggeada.**
- Materiales translúcidos + motion (feel "está vivo", interrupción fluida). Editorial ATP, mata lo lime-brutalist heredado.
- **Gate (device):** orb presente, con los 3 estados, se siente premium, no roto. **← este es el activo visual de la demo de pre-venta (§5).**

**Fase J3 · Proactividad (L) 🍎 — con GOBERNANZA ANTI-SPAM explícita**
- ARGOS que **inicia**: sugiere ajustes, nota patrones, felicita brincos >15%. **Proactivo = Pro premium.**
- Síntomas pattern (#48) · cross-parameter (#49) · vigencia inteligente de labs (#50).
- **Gobernanza (requisito de gate, no opcional):**
  - **Cap de N sugerencias/día** (config, no ilimitado).
  - **Quiet hours por cronotipo** (no molestar en ventana de sueño del cronotipo del user).
  - **Una a la vez** (nunca ráfaga).
  - **Siempre descartable** (dismiss visible).
  - **Supresión adaptativa:** si el user descarta 2 seguidas, se suprime el resto del día.
- **Gate (device):** ARGOS dispara una sugerencia proactiva pertinente de datos reales **y respeta todas las reglas de gobernanza** (probar cap, quiet hours, y la supresión tras 2 descartes).

**↔ FRONTERA J3/J4 · TELEMETRÍA DE COSTO / RATE-LIMITS**
Antes de entrar a las fases caras (multimodal, voz), instrumentar **telemetría de costo por request + rate-limits per tier + logging**. Es la red de seguridad económica antes de que ARGOS empiece a consumir tokens de imagen/audio. (Movido aquí desde J5 por CC.)

**Fase J4 · Multimodal (L) 🍎💎**
- Foto de comida/etiqueta/lab → ARGOS interpreta. Reusa el path de scan de suplementos (MB-2) y foto de nutrición.
- **Gate por H+** (feature LLM cara — no gate por tier).
- **Gate (device):** mandar foto → ARGOS responde con contexto correcto.

**Fase J5 · Voz (L) 🍎💎**
- Voz de ARGOS (ElevenLabs — sinergia con MB-5). STT entrante = **Gemini**. Feel de "conversación", no TTS robótico.
- **Gate final = 3 DEMOS VERIFICABLES EN DEVICE** (no "un tester dice wow"):
  1. **Sugerencia proactiva pertinente** disparada de datos reales del user.
  2. **Foto de etiqueta → interpretación correcta.**
  3. **Conversación de voz de 5 turnos con primer audio <2s.**
- **Este es el momento que vende Pro** — y el que se demuestra en la pre-venta.

**Riesgos ARGOS:** costo LLM/voz (palanca H+, telemetría en frontera J3/J4) · latencia de voz en device real (target <2s primer audio) · fallback Gemini debe cubrir el modo voz · **no OpenAI** (stack Claude + Gemini + ElevenLabs).

---

## 5. PRE-VENTA DE FOUNDERS COMO PUENTE DE CASH (hito paralelo)

**Problema:** el beta es nov/dic → **~4-5 meses sin ingreso** y **el cash es la restricción**.

**Solución (decisión founder):** usar la **demo funcional de ARGOS + el roadmap** para **pre-vender founders ANTES de que V2 esté al 100%**. *Vender el ancla, entregar completo.*

**Cuándo:** hito comercial paralelo **tras MB-4/J2** — en cuanto el **orb tenga los 3 estados** y J1 (personalidad) esté vivo, hay material de demo suficiente para vender la promesa. No hay que esperar a J5.

**Qué se muestra:** ARGOS con personalidad (J1) + orb animado idle/pensando/hablando (J2) + el roadmap del sistema operativo completo. A medida que J3/J4/J5 aterrizan, la demo se enriquece (proactividad → multimodal → voz).

**Qué NO es:** no es soft-launch de la app parcial. Es venta de la **oferta founders** (Pro de por vida, escalera cerrada) contra la **V2 en construcción**, con la demo de ARGOS como prueba de que el ancla es real. La entrega del producto sigue siendo V2 completa en el beta.

**Marcado como:** hito **paralelo**, no bloqueante del dev. El dev sigue su secuencia; la pre-venta corre encima cuando el activo de demo existe.

---

## 6. DEFINICIÓN DE "V2 LISTA PARA BETA" (checklist de done por módulo)

Un módulo está **done** solo si: comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real en device + **el loop core sigue impecable en el rolling smoke**.

- [ ] **Infra:** **CI verde (`tsc --noEmit` = 0 en cada push)** · repo FUERA de OneDrive · sin 404 en refresh/deep-link · Sentry sourcemaps · runbook + comms + Skool · versión bumpeada con build.
- [ ] **Design system:** lime-brutalist muerto · sin vacíos negros · sin identificadores crudos · sin colores off-brand · **capa de tokens semánticos instalada (LIGHT queda listo para v2.1, no exigible en beta)**.
- [ ] **HOY:** cards meditación/journal activables · responden a Mi Protocolo · "Ajustar protocolo" ATP · electrones correctos · **press states + feedback pointer-down en el loop**.
- [ ] **Agenda:** sin duplicados semánticos · pasados diferenciados · notifs en background (device) · unificada con HOY.
- [ ] **YO:** Edad ATP 1er dato, signo correcto · cronotipo (incl. Delfín temporal) dice algo de ti.
- [ ] **Cuestionario Maestro:** validado por Mariana (MB-11) · Fitzpatrick sin dup · 3 tests rojos verdes.
- [ ] **Salud Funcional:** Mi Expediente legible · Edad ATP correcta · scoring motor ×5 validado · auditoría qué-sirve/qué-no cerrada.
- [ ] **Nutrición/Suplementos:** multi-toma AM+PM · scan→plan+BHA · dropdown fluido · tomas en agenda · hidratación con contexto.
- [ ] **Mente:** audio real meditación + respiración (background/lock) · N-Back jugable · sin "@" literal.
- [ ] **Fitness:** navegable, editorial, journey completo (rutina/timer/cardio/fuerza) · electrones correctos · sin vacío negro · *(biblioteca puede venir con subset si el time-box lo exigió — deuda v2.1 marcada)*.
- [ ] **ARGOS Jarvis:** personalidad + **orb animado (3 estados)** + proactivo (con gobernanza anti-spam) + multimodal + voz (STT Gemini, primer audio <2s) · Meet ARGOS WOW · Sonnet 4-6 · rate limits + telemetría de costo · **pasa las 3 demos verificables**.
- [ ] **Ciclo/Embarazo:** probado en cuenta femenina · máscara embarazo · labs por fase · modulación bidireccional.
- [ ] **Onboarding:** post-pago → bienvenida → setup → Meet ARGOS → tour, WOW.
- [ ] **Sleep Track:** registra sueño · alimenta ATP Score.
- [ ] **Notificaciones:** device retest background OK · toast auto-dismiss.

---

## 7. RIESGOS Y GATES

### 7.1 Rolling smoke + device-tests OBLIGATORIOS (no negociable)
Gate de device físico **con rolling smoke de 10 min del loop core** al cierre de: **MB-0, MB-1, MB-2, MB-3 (exhaustivo), MB-5, MB-6, MB-7 (cuenta femenina), MB-8 (sweep), MB-10, cada fase de ARGOS, y MB-12 (final consolidado)**. Regla: **ningún batch grande abre antes de que el anterior pase su gate.** Esto es lo que evita repetir "5 sprints → 30 bugs" — y el rolling smoke es lo que atrapa las regresiones río arriba, no solo los bugs del batch nuevo.

### 7.2 CI mata el problema tsc-en-OneDrive de raíz
El `tsc --noEmit` deja de ser paso manual en la máquina de Enrique: **corre en GitHub Actions en cada push** (MB-0, destrabador b). El sandbox OneDrive nunca completaba el tsc masivo (I/O patológico); el CI lo hace en infra limpia. **Con el repo fuera de OneDrive** (MB-0 paso 0), además desaparecen el `index.lock` huérfano / index corrupto y los tamaños stale de bash.

### 7.3 Riesgo de migración / DB
- **MB-2 Suplementos** (multi-toma = estructura nueva) y **MB-7 Ciclo** son los de mayor probabilidad de migración. Reglas: idempotente (`IF NOT EXISTS`/`ON CONFLICT`), `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` + policy, Cowork audita branch antes del merge, `npx supabase db push` al remoto.
- **Trampa conocida:** "schema cache columna X" = deploy gap → verificar migrations + db push, no editar en SQL Editor.
- **Electrón booleano nuevo** (Fitness/Sleep) requiere **3 lugares** — falta el 3ro = falla silenciosa. Emitir `DeviceEventEmitter` post-electrones/nutrición.

### 7.4 Riesgo de dependencia nativa → build
Mitigado por el **build nativo único** (§4.1): todas las deps previsibles entran juntas post-MB-1. Si aparece una dep nativa imprevista después, se acumula para un segundo build al final (MB-12) junto al bump de versión — no builds reactivos sueltos. Todo nativo **lazy require**.

### 7.5 Riesgo de scope-creep
- **LIGHT mode** → v2.1 (no entra a beta; solo la capa de tokens semánticos queda instalada).
- **Backend Fx, wearables, multimodal-hardware, genética** → track post-founders (§8). Si aparecen en un batch, se anotan, no se cuelan.
- **Fitness (MB-3)** → time-box duro; recorte de biblioteca antes que extensión.

### 7.6 Riesgo de timeline por Mariana
MB-11 es blocker de MB-12 con **fecha dura (fin de MB-5)**. Si la agenda de Mariana no lo permite, escalar a Enrique como riesgo — no arrancar MB-12 sin la firma clínica.

---

## 8. FUERA DE V2.0 (track post-founders / v2.1 — para que NADA se olvide)

No bloquean la beta founders:
- **LIGHT mode** (v2.1) · valores light sobre la capa de tokens semánticos ya instalada en MB-0 + sweep pantalla-por-pantalla. Recuperado del plan V2 por decisión founder.
- **Backend Fx clínico** · 24 req Mariana (cuestionario ramificado, detector interacciones, "nothing to write") · HUB Fx (graba/transcribe/SOAP, chat encriptado) · afiliados wallet unificado · motor de labs clínico time-series.
- **Wearables / multimodal-hardware / genética** (v2.1+, NO se venden aún).
- **Comunidad V1.5** (retos con inscripción, auth bridge Skool) · **Coach Proactivo** general (dogfood Enrique primero) · **BHA V2** crowd-sourced.

---

## 9. NOTA METODOLÓGICA

- Un batch grande NO abre hasta que el anterior pasa su **device-gate + rolling smoke**. Ley anti-30-bugs.
- **`tsc --noEmit` autoritativo = CI GitHub Actions** en cada push (no más paso manual). Repo **fuera de OneDrive**.
- Deploy default = **OTA** (`eas update --branch preview`); `eas build` solo para nativo o bump de versión (regla #11). **Un build nativo planeado** post-MB-1; máximo un segundo en MB-12.
- Cowork **audita cada branch antes del merge**; migraciones idempotentes + `db push` al remoto.
- Enrique es el **autor** del algoritmo/stack; Mariana **valida/firma** (fecha dura fin de MB-5). Único dev = Enrique (Claude Code + subagentes Fable). Sin terceros.
- **Puente de cash = pre-venta founders contra la demo de ARGOS** (§5), no compresión que re-introduzca riesgo.

*Generado por Cowork (dirección técnica/producto) · 2026-07-17 · plan definitivo LOCKED "Ahora → V2.0". Reemplaza v1.*
