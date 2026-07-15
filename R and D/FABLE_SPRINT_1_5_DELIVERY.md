# Sprint 1.5 · Cierre estructural pre-beta — Delivery

**Fecha:** 2026-07-14
**Branch:** `fix/sprint-1-5-hoy-agenda-protocolo` (desde `fix/megahotfix-3ra-sprint1-bloque-a`, como pedido)
**Commits:** A `30d0845` · B `0a9241c` · C `4253884` · D `caa7a5c`
**Verificación:** `tsc --noEmit` limpio · suite completa **1625 tests verdes** (~60 nuevos)
**Doctrinas:** las 4 de memoria Cowork no son accesibles como archivo desde mi entorno —
trabajé con el contenido operativo citado en el brief (que las destila por bloque).

---

## Bloque A · Fitzpatrick entry points (`30d0845`)

**Causa raíz de la regresión:** no fue Sprint 1 borrando el botón — el selector
de piel (con el CTA al cuestionario) vivía **dentro del branch `uvData`** de
solar.tsx. Sin GPS o sin red, ese branch no renderea → cero entry points.

- Selector movido FUERA del branch UV (accesible siempre, aún cargando/offline).
- CTA persistente "Actualizar tipo de piel" visible bajo el header de ATP SOL.
- Card "Tipo de piel Fitzpatrick" en Tests y Evaluaciones (junto a los quizzes,
  ámbar de SOL, muestra "Tipo N" al completar, refresca vía `fototipo_changed`).
- Fuente única `profiles.skin_type` en todo el flujo (sin placeholder nuevo).

**Verificar en device:** Tests → card Fitzpatrick → completar → ATP SOL sin
cerrar app → Tipo actualizado inmediato. Extra: modo avión → ATP SOL → el
selector sigue accesible.

## Bloque B · Muerte ATP PROTOCOLOS + fusión (`0a9241c`)

- `app/protocol-config.tsx` **eliminada** (591 líneas). Bonus estructural: era
  el writer que duplicaba wake/sleep en `user_day_preferences.goals` (hallazgo
  ALTA de la auditoría placeholder única) — ese dual-store muere con ella.
- El goal de ayuno tiene nuevo writer único: el picker de protocolo de
  `fasting.tsx` persiste `goals.fasting_hours` (y de paso quedó arreglado el
  bug del timer que arrancaba 16:8 hardcoded ignorando el goal).
- HOY: pill "Protocolo metabólico básico · Biblioteca" fuera del feed; botón
  del footer ahora es "Ajustar Mi Protocolo" → `/salud/intervenciones`.
- health-hub: card PROTOCOLOS eliminada (Card B "Mi Protocolo" ya cubre).
- Journey (ninguna pantalla aislada):
  - Mi DX → CTA "Ver las intervenciones que ATP te sugiere →"
  - Mi Protocolo → breadcrumb "Estas intervenciones vienen de tu Diagnóstico
    Funcional (Nivel X) — raíz principal: [la de mayor severidad] · Ver mi DX ↗"
  - protocol-explorer → etiqueta "Biblioteca de referencia · No modifica tu día"
- Cero entry points muertos a `/protocol-config` (grep limpio).

## Bloque C · Agenda motor inteligente (`4253884`)

**Diagnóstico del porqué los fixes de Sprint 1 no bastaron:** el dedup era por
NOMBRE exacto normalizado, y los duplicados del device cruzan vocabularios —
"Luz solar" (protocolo legacy) vs "Exposición solar matutina (Fitzpatrick)"
(intervención) son strings distintos y el mismo concepto. Además el evento
"Despertar" se insertaba de nuevo en cada cambio de horario (el viejo quedaba
activo), y el wake almacenado podía ser dato roto (05:30 en un oso).

1. **`canonicalConcept`** — familias semánticas (sol, hidratación, suplementos,
   romper_ayuno, dormir, despertar, lentes, pantallas, ventana, grounding) con
   reglas ordenadas. TODO el dedup (items HOY, sync, cleanup) opera sobre
   familias. "Luz solar ×2" muere aquí.
2. **Presupuesto por familia** — hidratación hasta 5/día, suplementos hasta
   3/día, resto 1/día ("nunca 2 eventos de la misma intervención el mismo
   día"). Si la familia la gestiona Mi Protocolo, la fila de intervención
   (timing calibrado) gana sobre el zombie del protocolo. Filas del user
   (manual/manual_override) jamás se tocan y ocupan presupuesto primero.
3. **Cronotipo validado** (`validatedSchedule`) — wake/sleep a >60 min del
   default del tipo = dato roto → snap al default (oso con 05:30 → 07:00; lobo
   → 08:00). Delfín valida contra su madre oso (doctrina). Integrado en
   `anchorTimes` → HOY y agenda consistentes.
4. **Cronotipo reconcile** — cambiar el horario ACTUALIZA la fila
   Despertar/Dormir existente en vez de insertar otra.
5. **Romper ayuno dinámico** — `computeBreakFastTime`: último `fasting_log`
   real + horas del protocolo (key `ayuno_16_8` > `goals.fasting_hours` > 16).
   Sin logs → 12:00 con label "· estimado" en el nombre. El evento se llama
   "Romper ayuno (16:8)" (agendable), ya no el nombre del catálogo.
   `custom_time` del user sigue siendo sagrado.
6. **Hidratación matutina** a wake+15 (antes del ancla genérica wake+30).
7. **Techo 15 eventos de máquina/día** — universales P1 jamás se descartan;
   los descartes van a `logWarn` (Sentry), nunca en silencio.
8. Clamp solar 06:30 se mantiene (ahora con anclas validadas ya no se viola
   ni siquiera con wake almacenado 05:00).

**Verificar en device (checklist del doc):** 5 universales P1 + ayuno 16:8 →
~7 eventos naturales; sol ≥06:30; romper ayuno reflejando el último fasting
real; cero duplicados; Despertar según cronotipo (oso → 07:00).

## Bloque D · Universales visibles + UX progresiva (`caa7a5c`)

- Mi Protocolo (activas): universales P1 SIEMPRE arriba con badge BASE,
  aunque haya 20 activas.
- Umbrales (universales NO cuentan): 1-5 → nada · 6-8 → hint suave Humby ·
  9+ → warning claro "Menos, mejor." (copy del doc).
- HOY: items de intervención con el mismo orden y techo que la agenda
  (universales exentas del cap de 15).

**Verificar en device:** 3 activas → sin hint; 7 → hint suave; 10 → warning;
universales presentes siempre.

---

## Bugs bonus descubiertos

1. **024/Sprint-1 no eran la causa del entry point** — era el branch `uvData`.
2. **`fasting.tsx` timer 16:8 hardcoded** (línea 156) — arreglado en B.
3. **Generator de "Despertar" era una fábrica de duplicados** al cambiar
   horario (insert-only con key nombre+hora) — arreglado en C.

## Riesgos / edge cases

- `validatedSchedule` con tolerancia ±60 min: un oso legítimo que despierta
  05:45 vería su ancla snapeada a 07:00. Escape: `custom_time` por
  intervención (sagrado). Si molesta en beta, se sube la tolerancia.
- El evento de suplementos por batch con detalle de cada supplement dentro
  (`agenda_events.details` JSON) **requiere migración** (la columna no
  existe) — quedó fuera; hoy el presupuesto de familia permite hasta 3
  eventos de suplementos legítimos y mata los duplicados. Follow-up si lo
  quieres con migración 200+.
- Sunrise API real no integrada (fallback doctrinal 06:30, como permite el doc).
- Al morir protocol-config, la edición de peso/proteína/agua targets vive en
  las pantallas de acción (WaterGoalEditor en hidratación/nutrición); el
  editor de horarios wake/sleep ya no tiene UI propia — el horario vive en
  `user_chronotype` (quiz/onboarding). Si quieres UI de ajuste manual de
  horario, va en el pilar YO (sprint aparte).

## Nuevas doctrinas identificadas (candidatas a memoria Cowork)

- **Dedup semántico, no textual:** todo dedup de conceptos de usuario debe
  operar sobre familias canónicas (sinónimos cross-vocabulario), nunca sobre
  strings exactos. El caso "Luz solar ≠ Exposición solar" costó 2 sprints.
- **Datos de máquina se validan contra su doctrina** (wake 05:30 en oso =
  roto → default), pero datos del user (custom_time) son sagrados. La línea
  user/máquina decide quién se corrige solo.
