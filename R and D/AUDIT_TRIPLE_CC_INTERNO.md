# 🔬 AUDIT TRIPLE · FRENTE CC (interno, visión de autor)

**Fecha:** 2026-07-18 · **Auditor:** CC/Fable (autor de MB-0..MB-3) · **Base:** main @ `9749c85`
**Método:** todo hallazgo verificado en código con archivo:línea (superpowers — cero claims de memoria); los 7 hallazgos externos confirmados/profundizados a nivel causa raíz. **NO se aplicó ningún fix** — Cowork consolida y prioriza.
**Fuera de alcance (ya cubierto):** doctrina/clínico, navegado visual.

---

## A · HALLAZGOS PROPIOS (lo que solo el autor ve)

### 🔴 P1-A1 · REGRESIÓN MÍA — HOME-1: la casita tapa contenido en /yo y /kit y el offset fijo no aguanta heroes
- **Qué:** `HomeFloatingButton` a `insets.top + 52` con visibilidad ampliada a /yo y /kit (mi HOME-1). El "OSISTEMA" reportado es **`app/(tabs)/kit.tsx:67`** — el subtitle "TU ECOSISTEMA" queda debajo de la casita, que tapa "TU EC". En /yo el botón invade la zona topBar→primera card. En pantallas `edges={[]}` con hero (my-chronotype, mente) flota sobre la imagen del hero.
- **Causa raíz (autor):** asumí "línea de header ≈ 48px" como constante universal; es cierto en pantallas con `PillarHeader`/`ScreenHeader`, falso en tabs (headers propios con subtítulos) y heroes full-bleed. El riesgo lo dejé anotado en el commit (`0838f15`) pero no lo verifiqué por superficie (sin device en el away run).
- **Opciones de fix (decisión Cowork):** (a) ocultar de nuevo en /yo y /kit (el tab bar ya da Home — el gate "ausente solo en HOY" fue literalismo del brief); (b) offset por contexto (mayor en tabs); (c) volver a bottom-left. Mi recomendación: **(a) + mantener top-left solo en pantallas de Stack profundo**, que era el problema original de navegación.

### 🔴 P1-A2 · "Configura HOY" escribe una columna MUERTA con el flag ON (pre-existente, AMPLIFICADO por mi HOY-1)
- **Qué:** `getEffectiveCardsVisible` (`src/services/hoy/visibility-service.ts:56-66`): con `INTERVENTIONS_DRIVE_HOY=true` y protocolo no vacío, la visibilidad = `baseline ∪ prescritas` e **ignora por completo `hoy_cards_visible`** (la config manual). `setCardVisible` sigue escribiendo esa columna → los toggles de "Configura HOY"/EditDayModal parecen funcionar pero no hacen nada.
- **Amplificación mía:** HOY-1 metió `meditacion`/`journal` al baseline → ahora hay **7 cards imposibles de ocultar** y el toggle miente en más casos.
- **Fix propuesto:** visibilidad efectiva = `(baseline ∪ prescritas) − hides manuales` (intersección con la config), o retirar los toggles de las cards no-configurables. Una línea de lógica + decisión de producto.

### 🟡 P2-A3 · #64 sin cerrar del todo: mi barrido de casts tuvo 2 blind spots de regex
- Mi sed de MB-0(c) solo cazó `router.(push|replace|navigate)(...)` en la MISMA línea. Se escaparon **3 casts de ruta**:
  - `app/index.tsx:75` — `<Redirect href={'/login' as any} />` (literal; el cast sobra).
  - `app/index.tsx:76` — `<Redirect href={onboardingRoute as any} />` (el estado YA es `Href` tras mi fix — cast doblemente muerto).
  - `app/programs.tsx:74` — `pathname: target as any` (object-form multilínea).
- Conteo real de ` as any` fuera de tests: **332** (el "63" de Cowork usa otro filtro). Composición dominante: `icon as any` de Ionicons (~decenas) y casts de datos Supabase `(x as any)?.campo` — deuda de tipos aparte de #64, NO tocar en el mismo fix.

### 🟡 P2-A4 · SUP-2 mío: `maxHeight: 620` es un número mágico
`app/supplements.tsx:500` — en un iPhone SE (667pt lógicos) con teclado abierto, 620 + KAV puede exceder el viewport y volver a esconder el botón en el borde. Debe ser relativo (`'85%'` o derivado de `useWindowDimensions`).

### 🟡 P2-A5 · SUP-4 mío: 4 deudas del driver de suplementos→agenda
1. **Horas fijas** (mañana 08:00 / noche 21:00) — no ancladas al cronotipo. Un León wake 06:00 recibe la toma de "mañana" 2h tarde. `validatedSchedule`/`anchorTimes` ya existen; anclar es barato.
2. **Reconcile de huérfanos con N round-trips secuenciales** (`agenda-service.ts`, un `UPDATE` por fila stale en loop `await`). Con muchas fichas editadas, latencia en cada focus de /agenda. Fix: un solo `UPDATE ... IN (ids)`.
3. **`dose_times` con HH:MM custom** nombran el evento "X · toma" — dos tomas custom del mismo suplemento se ven idénticas (solo difiere la hora). Cosmético.
4. **Folder de imagen por regex con orden traicionero:** `agendaCategoryToFolder` (`image-pick-core.ts:55-58`) evalúa `/entren/` ANTES que `/suplement/` sobre `categoría + nombre` → un suplemento llamado "Creatina pre-entreno" cae en folder `entrenar`. Edge case, pero real.

### 🟡 P2-A6 · Cobertura de tests: añadí 2 tests para ~15 commits — los cores nuevos quedaron sin red
- **El delta de Edad ATP es EL caso de libro:** el bug fue una inversión de signo, y la convención sigue **hand-rolled en 4 superficies** (`salud/diagnostico/index.tsx`, `YoEditorialSection`, `EdadAtpShareCard` — ¡con el delta calculado al revés localmente!—, `hero-recommendation`). Propongo `formatEdadDelta(cron, integral)` en un core único + tests de signo. Sin eso, la próxima pantalla que muestre el delta puede reinvertirlo.
- **Sin tests:** mapping SUP-4 etiqueta→hora/nombre (extraíble a core puro), cronotipo madre (IIFE inline en `quiz/chronotype.tsx` — intesteable donde está), filtro `pending` de HOY-2 (IIFE inline), derivaciones de `loadAll` en supplements.
- **Con test:** baseline HOY-1 (regresión) y snapshot cardio (familia). Los dos correctos pero es la cobertura mínima.

### 🟢 P3-A7 · Menores míos, anotados con honestidad
- `AgendaMiniCard` estado `past` usa `Date.now()` en render — no hay tick: un evento que "pasa" mientras la pantalla está abierta no se atenúa hasta el próximo reload.
- `food-scan` handleAddToPlan: sin guard de duplicados (escanear 2× el mismo bote = 2 fichas) y `result.supplement_name ?? productName` puede resolver a `''` (productName es string vacío, no null).
- `execution.tsx`: TODA rutina-timer completada premia electrón **cardio** — incluidas rutinas de intervalos de fuerza. Compromiso semántico consciente (cardio_sessions es la única tabla que respalda un workout por tiempo); si molesta, la alternativa es un `workout_sessions` genérico (migración).
- **Proceso / tripwire para Cowork:** `.expo/types/router.d.ts` ahora está VERSIONADO (decisión MB-0c para CI estricto). Toda rama paralela que añada rutas debe regenerarlo (`expo start`) y commitearlo, y **habrá conflictos de merge en ese archivo** entre ramas con rutas nuevas. Sugerencia: script npm `typegen` + nota en CLAUDE.md.

---

## B · LOS 7 HALLAZGOS EXTERNOS — CONFIRMACIÓN + CAUSA RAÍZ A NIVEL CÓDIGO

### B1 · Hueco negro 1-3s en hubs ✅ CONFIRMADO — P1
- **Causa raíz:** `EditorialCard.tsx:96-100` usa **RN `Image`** (no expo-image) con PNGs de **400-800KB** (`cronotipo-leon.png` 804KB, `habits-portal/*.png` 500-716KB) a full-bleed. Mientras decodifica async, la Image es transparente y **el placeholder de gradient SOLO se renderiza en la rama `!imageBn`** (`:101-106`) → con imagen asignada, el fondo es la card oscura + overlay alpha = negro. Los hubs montan 3-9 cards a la vez (decode en serie en el UI/IO thread de RN Image).
- **Fix (3 capas, ordenadas por costo/beneficio):**
  1. **2 líneas:** renderizar el placeholder de gradient SIEMPRE debajo de la Image (mover el bloque `:101-106` fuera del ternario) → el hueco deja de ser negro YA.
  2. **Migrar `EditorialCard` a `expo-image`** (ya en deps, `~3.0.11`): `placeholder` + `transition={200}` + caché memoria/disco → segunda visita instantánea.
  3. **Comprimir assets**: el script `npm run optimize-images` existe; los PNG editoriales no pasaron por él. 800KB→~150KB WebP/JPEG sin pérdida visible en B/N.

### B2 · Bottom-sheets invisibles en web ✅ CONFIRMADO — P1
- **Causa raíz:** hay DOS patrones de sheet en el código. Los correctos usan `<Modal transparent onRequestClose>` (BhaScanSheet:134, EventActionModal:30, EventFormModal:91 — Escape/back funcionan). Los rotos son **overlays `position:'absolute'` inline renderizados como último hijo del `ScrollView` raíz**: `app/supplements.tsx` (sheet Agregar/Editar — MI SUP-2 lo mejoró por dentro pero NO lo convirtió a Modal), **`app/checkin.tsx`** y **`app/profile.tsx`** (mismo patrón, grep `position:'absolute',top:0,left:0,right:0,bottom:0`). En web, un absolute dentro del content del ScrollView se posiciona contra el contenido scrolleado (queda fuera del viewport / debajo) y no captura Escape; en device es frágil (depende del scroll offset).
- **Fix:** envolver los 3 en `<Modal visible transparent animationType="slide" onRequestClose={close}>` — el contenido interno de supplements (KAV+ScrollView de SUP-2) se conserva tal cual. `onRequestClose` da Escape (web) y back (Android) gratis.

### B3 · snake_case en el racional de Mi Protocolo ✅ CONFIRMADO — P2
- **Causa raíz (es el LLM, no el render):** el path cliente YA legibiliza (`buildEpigeneticImpactSentence` usa `displayLabel`, que lowercasea la key y tiene fallback `beautify` — `personalize-interventions.ts:469-471`, `display-labels.ts`). El leak viene de **`buildRationalePrompt` (`intervention-rationale-core.ts:61+`)**: mete al payload del LLM las claves CRUDAS — `raiz: r.root_key`, `raices_que_ataca: i.roots`, y `beneficio: i.benefit` (el catálogo tiene **45 `PCR_hs`** y **17 `presion_arterial_sistolica`** en textos) — y ARGOS las eco-ea en la narrativa pese al "cero tecnicismos".
- **Fix:** mapear con `displayLabel`/`ROOT_LABELS` ANTES del `JSON.stringify` + añadir regla al system prompt ("nunca escribas claves con guiones bajos"). Bonus: `presion_arterial_sistolica` NO está en `DISPLAY_LABELS` (0 hits) — añadirla; `beautify` la salva a "presión arterial sistolica" pero sin tilde correcta.

### B4 · Agenda: 2 eventos duplicados 10:30 ✅ CONFIRMADO — P2 (y por qué mi dedup NO los toca)
- **Causa raíz:** los dos eventos ("Romper ayuno — comida limpia" + "Desayuno proteico alto", snapshot prod p15/p16) son **ambos `manual_override`** — filas del USUARIO. Mi dedup de MB-1 los hizo la misma familia canónica (`romper_ayuno` ahora incluye `/desayuno/`), y eso ya mata el caso máquina-vs-usuario (verificado en el snapshot test: la Zona 2 de máquina muere contra Running manual). Pero el cleanup **jamás desactiva filas del user** (doctrina "dato del user sagrado") → en `/agenda` siguen los dos. El day-compiler (timeline HOY) sí los colapsa visualmente desde MB-1.
- **Fix propuesto (sin violar doctrina):** en `/agenda`, cuando 2+ filas activas comparten `hora + familia canónica` y AMBAS son del user, agruparlas visualmente ("2 eventos equivalentes · unificar") con acción de merge de UN tap que desactive una (elección del user, no de la máquina). Nunca auto-borrar.

### B5 · Morado como color de ACCIÓN en Mente y food-scan ✅ CONFIRMADO — P2
- **Matiz importante:** `#7F77DD` NO es legacy suelto — es `CATEGORY_COLORS.mind` (brand.ts:63), token oficial de CATEGORÍA. La violación de doctrina es usarlo como color de **ACCIÓN** (CTAs, botones, estados activos): `app/breathing.tsx` **30 usos** (`PURPLE = CATEGORY_COLORS.mind`, `:39`), `app/meditation.tsx` **16**, `app/food-scan.tsx:49` (`const PURPLE = CATEGORY_COLORS.mind` para el modo supplement — ni siquiera es Mente), más `journal.tsx:33`. El #138 solo tocó el hero de Mente, correcto el diagnóstico externo.
- **Fix:** en esas pantallas, CTAs/estados activos → `ATP_BRAND.teal`/`lime` (doctrina acción); el morado queda SOLO como tinte de categoría (iconos, bordes suaves). Es un barrido mecánico por pantalla (~50 sitios), no un rediseño. Los usos legítimos de categoría (Lobo, luteal, cognición, gradients) NO se tocan.

### B6 · Cronotipo/Oso flaco + casita tapa "TU ECOSISTEMA" ✅ CONFIRMADO — P1/P2
- **La casita:** es mi P1-A1 (arriba) — el texto tapado es `kit.tsx:67`.
- **Destino flaco:** `my-chronotype.tsx` tiene hero + ventana wake/sleep + mecanismo + tips + nota agenda (5 bloques — no vacío, pero poco DATO personal). Barato de engordar: la tabla `user_chronotype` ya tiene `peak_focus_start/end` y `peak_physical_start` que la pantalla NO lee (select `:110-114` solo trae chronotype/wake/sleep) → añadir "TU VENTANA DE FOCO" y "TU PICO FÍSICO" con datos reales del user, cero migración.

### B7 · `as any` residuales ✅ CONFIRMADO — P2/P3
Ver P2-A3: los **3 de routing** son `app/index.tsx:75`, `app/index.tsx:76` y `app/programs.tsx:74` — cerrarlos cierra #64 de verdad. El resto (Ionicons + datos Supabase) es deuda de tipos aparte; recomiendo NO mezclarla en el mismo fix (el barrido de Ionicons es mecánico pero ruidoso; los de Supabase piden types generados de la DB — `generate_typescript_types` del MCP existe).

---

## C · RESUMEN PRIORIZADO PARA EL CONSOLIDADO

| # | Hallazgo | Prio | Esfuerzo | Origen |
|---|---|---|---|---|
| A1/B6 | Casita HOME-1 tapa contenido en /yo y /kit (regresión mía) | **P1** | S | CC |
| B1 | Hueco negro hubs: placeholder siempre + expo-image + comprimir | **P1** | S+M | Externo ✓ |
| B2 | 3 sheets inline → Modal (supplements, checkin, profile) | **P1** | S | Externo ✓ |
| A2 | Config manual de HOY muerta con flag ON (toggles mienten) | **P1** | S | CC |
| B3 | Rationale: displayLabel ANTES del prompt + regla system | P2 | S | Externo ✓ |
| B5 | Morado acción→teal/lime en breathing/meditation/food-scan/journal | P2 | M | Externo ✓ |
| B4 | Dupes user-vs-user 10:30: merge asistido en /agenda | P2 | M | Externo ✓ |
| A3/B7 | 3 casts de ruta restantes (#64) | P2 | XS | Ambos ✓ |
| A4 | maxHeight 620 → relativo | P2 | XS | CC |
| A5 | SUP-4: horas por cronotipo · UPDATE batch · nombre toma custom · orden regex folder | P2 | S | CC |
| A6 | `formatEdadDelta` core único + tests (anti-reinversión de signo) + extraer cores SUP-4/madre | P2 | S | CC |
| B6b | Engordar my-chronotype con peak windows (columnas ya existen) | P3 | S | Externo ✓ |
| A7 | past sin tick · dupe-guard scan · semántica cardio en timers · tripwire router.d.ts | P3 | S | CC |

**Notas de no-acción deliberada:** no repetí lo clínico/doctrinal ni el navegado; no toqué código (este reporte es insumo del consolidado). Los fixes S de la tabla son quirúrgicos y varios comparten archivo — conviene agruparlos por pantalla en la lista final.

*CC/Fable · main @ 9749c85 · toda cita archivo:línea verificada en esta pasada.*
