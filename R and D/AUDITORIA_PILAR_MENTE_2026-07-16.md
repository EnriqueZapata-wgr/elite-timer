# Auditoría Pilar MENTE — 2026-07-16

Auditor: Cowork (auditoría de código, sin cambios). Alcance: hub Mente, meditación,
respiración, journal, check-in, progreso, datos y servicios asociados.

**Veredicto rápido:** el pilar Mente está **funcional, no borrador**. Todas las pantallas
guardan datos reales, otorgan electrones y tienen empty states. La sensación de "borrador"
que reporta Enrique viene de **dos identidades visuales conviviendo** (hub editorial lima B/N
nuevo vs. pantallas de ejecución moradas viejas) y de un **hub legacy duplicado** (`/mind-hub`)
todavía vivo. El copy "En comunidad · verifica pronto" **ya no se muestra** (Sprint 2 lo mató),
y los botones lima "gordos" del hub **ya son pills translúcidas** (Sprint 2 D). Los dos issues
originales de Enrique están resueltos; lo que queda es consistencia visual y limpieza.

---

## 1. Inventario pantalla por pantalla

| Ruta / archivo | Qué hace | Estado | Identidad visual |
|---|---|---|---|
| `/mente` · `app/mente.tsx` | Hub editorial nuevo: cards Journal/Respiración/Meditación + check-in compacto + timeline "Últimas sesiones" + acceso a Progreso | **Completo** | Lima + B/N editorial |
| `/mente/progreso` · `app/mente/progreso.tsx` | Streaks por categoría + vitrina de medallas (7/30/90/365d) + copy editorial | **Completo** | Lima + B/N editorial |
| `/meditation` · `app/meditation.tsx` | Biblioteca (17 sesiones) + timer por fases con campanas, keep-awake, guarda `mind_sessions` + electrón | **Completo** | **Morado** (`#7F77DD`) |
| `/breathing` · `app/breathing.tsx` | Selector (6 técnicas) + config Box Breathing + timer con círculo animado por fase + contraindicaciones + historial | **Completo** | **Morado** + lima en pantalla de completado |
| `/journal` · `app/journal.tsx` | Composer 4 tipos (Gratitud/Visión/Estoico/Descarga) + mood before/after + recordatorio diario editable + entradas recientes con swipe-delete | **Completo** | **Morado** (`#7F77DD` / `#c084fc`) |
| `/journal-history` · `app/journal-history.tsx` | Historial dedicado: filtros rango/tipo/búsqueda, expandir/editar/eliminar, streak, FAB al composer | **Completo** | Lima + B/N editorial |
| `/checkin` · `app/checkin.tsx` | Check-in RULER 3 pasos (cuadrante → emociones con tooltips → contexto+prompt+nota) → puente Tribu si mood bajo sostenido | **Completo** | Color dinámico por cuadrante |
| `/mind-hub` · `app/mind-hub.tsx` | **Hub LEGACY** "Hábitos diarios": duplica Meditación/Respiración/Check-in/Journal + ciclo/ayuno/hidratación/ATP SOL. Stats semanales | **Redundante / a matar o repurposar** | **Morado**, GradientCards viejas |
| `CommunityPresence` · `src/components/community/CommunityPresence.tsx` | Badge "personas activas hoy" en header del hub | **Completo** (fail-soft, oculto bajo umbral) | Tint por pilar |
| `MenteHubCard` · `src/components/mente/MenteHubCard.tsx` | Card editorial del hub, CTA pill translúcida, soporta `imageBn` (placeholder MJ) | **Completo** | Lima + B/N |

**Motor N-Back** (`src/services/mente/nback-core.ts`): existe la lógica pura (Dual N-Back Jaeggi),
**pero no hay pantalla/UI** — es V1.5 (task #45). No surface en el hub, correcto por ahora.

---

## 2. Análisis específico (respuestas a las 6 preguntas)

**1) Copy "En comunidad · verifica pronto" — ¿roto todavía?**
NO. El string sigue existiendo en `src/services/community/community-presence-core.ts:26`
(`{ mode: 'placeholder', text: 'En comunidad · verifica pronto' }`), pero
`CommunityPresence.tsx` ahora hace `if (display.mode === 'placeholder') return null;`
(Sprint 2 D). El texto **es código muerto, nunca se renderiza**. Limpieza opcional P2:
borrar el string del core para que nadie lo revuelva.

**2) Botones lima "gordos" — ¿siguen?**
NO en el hub. El CTA de `MenteHubCard` se migró al patrón pill de `EditorialCard`
(comentario explícito Sprint 2 D: "antes era un bloque lima full-width por card; 3 bloques
lima en una pantalla viola la disciplina de acento del DS §1"). Lima ahora solo en badge/datos
vivos. **Persisten botones grandes de color sólido fuera del hub**: botón CONTINUAR lima
full-width en el completado de `breathing.tsx`, botones REGISTRAR/Siguiente sólidos en
`checkin.tsx`, botón Guardar sólido en `journal.tsx`. Son pantallas de acción (no el hub), así
que menos graves, pero no siguen el patrón editorial del hub.

**3) Coherencia con el sistema editorial (EditorialCard de Nutrición/Fitness)**
PARCIAL. El **hub** `/mente`, `/mente/progreso` y `/journal-history` sí usan el lenguaje
editorial B/N + lima + `ELEVATION`/`TEXT`. Las pantallas de **ejecución**
(meditación, respiración, journal composer, check-in, mind-hub) usan el **sistema viejo**:
`GradientCard`, morado `#7F77DD`, `Colors.*`. Esta es la raíz #1 de la sensación de "borrador":
entras al hub pulido lima y al tocar una card caes a una pantalla morada de otra época.

**4) Integración con el catálogo de intervenciones**
DESCONECTADO por diseño. Las pantallas Mente corren sobre sus propias librerías hardcoded
(`BREATHING_LIBRARY` 6 técnicas, `MEDITATION_LIBRARY` 17 sesiones). El catálogo epigenético
(`src/constants/interventions-catalog.ts`, 4669 líneas) tiene intervenciones mente-adyacentes
(ej. `respiracion_nocturna`) que **manejan HOY/Mi Protocolo**, pero no hay puente:
una intervención de meditación/journal prescrita en Mi Protocolo no aterriza en una sesión
concreta del pilar Mente. NSDR, binaurales, N-Back y "silencio" del catálogo no tienen
pantalla de ejecución equivalente (salvo `silence-*` que sí existe en la librería de meditación).

**5) Audios faltantes (task #46)**
CONFIRMADO como deuda. `audioUrl` es un campo placeholder en ambas interfaces
(`BreathingTemplate`, `MeditationTemplate`) con comentario "sin audio real por licensing",
y **nunca se popula** (grep `audioUrl:` = 0 asignaciones). No hay binaurales delta/theta/alpha/beta
ni grabaciones NSDR. Los únicos audios son campanas/beeps genéricos
(`assets/sounds/beep.mp3`, `bell.mp3`, `complete.mp3`). Meditación y silencio funcionan
**solo con texto guiado + campana**, sin voz ni fondo sonoro.

**6) Check-in emocional + journal — ¿funcionan? ¿buen copy?**
SÍ, ambos son los módulos más pulidos del pilar. Check-in RULER (3 pasos, tooltips por emoción,
prompt del día determinista, nota → mini-journal, streak, puente Tribu). Journal con 4 tipos,
mood tracking, recordatorio con hora editable persistida, historial con swipe-delete y edición.
Copy fuerte y en voz ATP (prompts directos sin empalago). El único copy marcado "tentativo"
es `checkin-prompts.ts` ("COPY tentativo — Enrique revisa post-sprint").

---

## 3. Problemas de UX priorizados

### P0 (bloqueante de sensación de calidad — es lo que ve Enrique)
- **P0-A · Doble identidad visual del pilar.** Hub lima/B-N editorial → pantallas de ejecución
  morado `#7F77DD` con `GradientCard`. Meditación, respiración, journal y check-in no fueron
  migrados al sistema editorial cuando se rehízo el hub. Es la causa raíz del "sigue borrador".

### P1 (importante, no bloqueante)
- **P1-A · Hub legacy `/mind-hub` vivo y duplicado.** Sigue existiendo como "Hábitos diarios",
  reofrece Meditación/Respiración/Check-in/Journal (duplica `/mente`) + mezcla ciclo/ayuno/
  hidratación/sol. Decisión pendiente: matarlo o dejarlo solo como "rutina diaria" sin las 4
  cards Mente. Además `day-compiler.ts:500` todavía rutea el mood bajo a `/mind-hub`
  (debería ser `/mente` o `/checkin` — el resto del compiler ya migró a `/mente`).
- **P1-B · Botones de acción sólidos fuera del hub.** CONTINUAR lima full-width (breathing
  completado), REGISTRAR/Guardar sólidos. No siguen el patrón pill translúcido del DS.

### P2 (pulido / limpieza)
- **P2-A · String muerto** "En comunidad · verifica pronto" en `community-presence-core.ts:26`.
- **P2-B · `imageBn` nunca poblado** — todas las `MenteHubCard` son tipográficas puras
  (esto liga con task #91 "swap imageBn no aplicó" y task #126). Se ven terminadas, pero
  falta el asset editorial.
- **P2-C · `MEDITATION_LIBRARY`**: `body_scan` y `wim_hof` marcados `category: 'rest'` en vez de
  `'mind'` — inconsistencia menor de taxonomía (no afecta UI del pilar, sí filtros por categoría).
- **P2-D · Copy check-in marcado "tentativo"** pendiente de firma de Enrique.

---

## 4. Copy a corregir (nombres propios, snake_case, copy raro)

- **Nombres propios en copy user-facing** (doctrina "nombres solo en docs internos"):
  - `breathing-library.ts`: "Usado por Navy SEALs", "Respaldado por Stanford", "Wim Hof Lite".
    Wim Hof es marca de método reconocida (aceptable), pero "Navy SEALs"/"Stanford" son claims
    de autoridad — revisar contra doctrina de no citar autoridades como validación.
  - `journal.tsx` STOIC_QUOTES: Séneca / Marco Aurelio / Epicteto — **OK**, son citas atribuidas
    de dominio público, no recomendaciones de personas.
  - `checkin.tsx` puente Tribu usa copy aprobado `TRIBE_BRIDGE_COPY` — OK.
- **snake_case crudo user-facing:** no encontrado en render. Los `journal_type` se mapean a
  labels legibles vía `JOURNAL_TYPES`/`TYPE_META`; los cuadrantes a `QUADRANTS[].label`. Limpio.
- **Copy "raro":** ninguno activo. El único era "En comunidad · verifica pronto" (ya oculto).

---

## 5. Contenido faltante

| Contenido | Estado | Tarea |
|---|---|---|
| Binaurales delta/theta/alpha/beta | **Ausente** (no assets, `audioUrl` placeholder) | #46 |
| Grabaciones NSDR (voz guiada) | **Ausente** (solo "silencio" texto+campana) | #46 |
| Audio de voz para meditaciones | **Ausente** (todas texto+campana) | #46 |
| Fondo sonoro / música | **Ausente** | #46 |
| N-Back Challenge (pantalla) | Motor listo, **sin UI** | #45 (V1.5) |
| Assets `imageBn` editoriales MJ para cards del hub | **Ausente** (placeholder) | #91 / #126 |

---

## 6. Recomendación keep/fix/kill por pantalla

| Pantalla | Recomendación |
|---|---|
| `/mente` (hub) | **KEEP** — es el buen patrón. Ancla del pilar. |
| `/mente/progreso` | **KEEP** — completo y editorial. |
| `/journal-history` | **KEEP** — mejor pantalla del pilar. |
| `/checkin` | **KEEP + fix menor** — migrar botones sólidos al patrón pill; firmar copy prompts. |
| `/journal` (composer) | **FIX** — repintar al sistema editorial (quitar morado/GradientCard, unificar acento). Funcionalidad intacta. |
| `/meditation` | **FIX** — repintar a editorial + (deuda) sumar audio. Lógica sólida. |
| `/breathing` | **FIX** — repintar a editorial + botón CONTINUAR al patrón pill. Lógica sólida. |
| `/mind-hub` | **KILL o REPURPOSE** — quitar las 4 cards Mente (viven en `/mente`); dejar solo "rutina diaria" o eliminar y repuntar `day-compiler.ts:500` a `/mente`. |
| N-Back | **KEEP como roadmap** (V1.5). |

---

## 7. Qué necesita proveer Enrique

1. **Decisión sobre `/mind-hub`**: matar vs. repurposar a solo rutina diaria (ciclo/ayuno/
   hidratación/sol). Bloquea limpiar la duplicación y el ruteo del compiler.
2. **Audios (task #46)**: grabar/licenciar binaurales + NSDR + voz de meditación, o decidir que
   V1 lanza solo con texto+campana (funciona; es decisión de nivel WOW, no de bug).
3. **Assets `imageBn`** editoriales B/N (MJ) para las cards del hub — o confirmar que las cards
   tipográficas puras son el look final de V1.
4. **Firma del copy de prompts** de check-in (`checkin-prompts.ts`, marcado tentativo).
5. **Criterio visual**: confirmar que la ejecución (meditación/respiración/journal) debe migrar de
   morado a lima/B-N editorial — es el fix P0 que quita la sensación de "borrador".

---

## Resumen ejecutivo (<250 palabras)

**Pantallas auditadas:** 8 pantallas + 1 hub legacy + componentes (MenteHubCard, CommunityPresence)
y motor N-Back sin UI.

**Estado general: FUNCIONAL, no borrador.** Todo guarda datos reales (`mind_sessions`,
`journal_entries`, `emotional_checkins`), otorga electrones, tiene empty states y manejo de
errores. Check-in y journal son de los módulos más pulidos de toda la app. Los dos issues que
reportó Enrique **ya están resueltos**: el copy "En comunidad · verifica pronto" ya no se
renderiza (Sprint 2 lo oculta bajo umbral) y los botones lima "gordos" del hub ya son pills
translúcidas (Sprint 2 D).

**Los 3 problemas más importantes:**
1. **Doble identidad visual (P0):** el hub es editorial lima/B-N nuevo, pero al tocar una card
   caes a pantallas de ejecución moradas (`#7F77DD`, `GradientCard`) que no se migraron. Esta
   disonancia es lo que todavía se "siente borrador".
2. **Hub legacy `/mind-hub` duplicado (P1):** sigue vivo reofreciendo las 4 cards Mente y el
   `day-compiler` aún rutea mood bajo ahí. Hay que matarlo o repurposarlo.
3. **Audios ausentes (P1/deuda #46):** binaurales, NSDR y voz de meditación son placeholders
   (`audioUrl` nunca poblado); meditación corre solo con texto+campana.

Ninguno bloquea el lanzamiento funcional; el P0 es puramente estético y es la palanca real
para que el pilar deje de sentirse a medias.
