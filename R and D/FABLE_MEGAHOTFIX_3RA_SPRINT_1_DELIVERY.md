# Megahotfix 3ra pasada · Sprint 1 (Bloque A) — Delivery

**Fecha:** 2026-07-14
**Branch:** `fix/megahotfix-3ra-sprint1-bloque-a` (3 commits + delivery)
**Verificación:** `tsc --noEmit` limpio · suite completa 1597 tests verde (25 nuevos)

---

## A.1 · Placeholder Fitzpatrick (`e585d63`)

**Diagnóstico real:** la fuente única YA existía — cuestionario
(`historia-clinica/[category].tsx` → `saveSkinType`), picker de ATP SOL y card
UV del HOY escriben/leen todos `profiles.skin_type`. El bug era **lectura
stale**: `app/solar.tsx` leía el fototipo una sola vez al montar (`useEffect
[]`) y expo-router mantiene la pantalla montada en el stack. El cuestionario
guardaba Tipo 5 y emitía `fototipo_changed`; HOY escuchaba, SOL no → seguía
mostrando el Tipo 4 previo del picker.

**Fix:** SOL ahora escucha `fototipo_changed` y relee de BD (mismo patrón que
`HoyEditorialSection`). El picker sigue escribiendo a la misma columna, y su
propio write dispara el mismo evento (HOY refresca al instante).

**Doctrina refinada:** el caso demuestra que "placeholder única" tiene DOS
mitades: (1) una sola columna de verdad, (2) toda pantalla que la muestre debe
suscribirse al cambio o releer en focus. La mitad 2 era la rota aquí.

**Auditoría multi-fuente:** ver sección al final.

## A.2 · Agenda 56 eventos (`0e72578`)

Cuatro causas, cuatro fixes (todo en core puro testeable + cableado en
`agenda-service`):

1. **Duplicados históricos** ("sol 3× a las 6am"): filas acumuladas en
   `agenda_events` por versiones previas sin dedup. El sync solo veía 1 fila
   por key (Map last-wins) y las demás quedaban activas para siempre. Nuevo
   `planAgendaCleanup` (3 pases, corre en cada sync, soft-deactivate
   reversible):
   - mismo `intervention_key` → sobrevive 1;
   - mismo concepto (nombre normalizado) + misma hora → sobrevive 1 (prioridad
     de fuente: manual_override > manual > protocol > chronotype > intervention);
   - zombies del driver protocolo cuyo concepto ya gestiona Mi Protocolo → la
     intervención (con horas calibradas) toma el control.
   - Filas `manual`/`manual_override` del user JAMÁS se desactivan, y la
     multi-dosis legítima (agua 3× a horas distintas de protocolo) no se toca.
2. **Sol antes del amanecer:** clamp `MIN_SOLAR_TIME = 06:30` para horas de
   máquina (ancla o `computed_time`); el `custom_time` del user es sagrado.
   (Sin API sunrise por ahora — piso doctrinal 06:30; upgrade posible después.)
3. **Simultáneos** (agua+sol+sups a las 6): stagger determinístico de 15 min
   (`assignInterventionTimes`) — los `custom_time` son slots fijos, las horas
   de máquina se corren hasta hueco libre. Mismo set activo → mismas horas en
   cada corrida (idempotente contra `agenda_events`).
4. **Flapping prevention:** el guard de concepto ahora también aplica a
   reactivaciones (antes solo a inserts) — sin él, una fila desactivada por el
   cleanup revivía en el siguiente sync.

**Test guard:** 20 tests nuevos (49 en `intervention-agenda-core.test.ts`),
incluido el escenario device exacto: 5 universales P1 triplicados → quedan
exactamente 5 activos.

**Verificación en device (Enrique):** activar 5 universales P1 → la agenda
debe mostrar 5-7 eventos (5 intervenciones + Despertar/Dormir del cronotipo),
espaciados, sol ≥ 06:30. El cleanup corre solo al entrar a /agenda — los 56
eventos actuales se barren en la primera entrada tras el OTA.

## A.3 · Mi Protocolo saturado (`6e7c049`)

- `partitionSuggested` (core puro): top 12 visible (`SUGGESTED_TOP_COUNT`,
  dentro del rango 10-15 pedido). Universales P1 entran TODAS al top aunque
  excedan el cupo — jamás se pierden entre curadas; las curadas llenan los
  slots restantes en el orden del motor (score desc).
- Resto tras "Ver todas las sugerencias (N más)" — colapsable con chevron,
  mismo sistema visual (ELEVATION/tokens).
- Doctrina Humby: hint suave (~5 activas es el punto dulce) que aparece desde
  8 activas. Sin límite duro.
- 5 tests nuevos de partición.

**Nota:** el buzón menciona "filtros que ya existen (categoría, raíz)" — esta
pantalla NO tiene filtros hoy (quizá se pensó en otra pantalla). Si los
quieres aquí, van en un sprint aparte.

## Riesgos / edge cases descubiertos

- El cleanup es cliente-only (sin migración): usuarios que no entren a /agenda
  conservan sus duplicados hasta la primera entrada. Aceptable para beta.
- Si el user editó a mano uno de los eventos duplicados (manual_override),
  ese sobrevive por diseño y el duplicado de máquina muere — puede quedar la
  versión editada con hora vieja; el user la ajusta en /agenda.
- El stagger reordena horas de máquina al cambiar el set activo (activar una
  intervención nueva puede mover otras ±15 min). Determinístico, pero visible.

## Auditoría multi-fuente (doctrina placeholder única por dato)

Barrido completo de src/ + app/ (excluye worktrees/tests). El fototipo queda
como patrón de referencia: un almacén + listener. Hallazgos, de peor a mejor:

| Dato | Almacenes | Severidad |
|---|---|---|
| Peso / composición corporal | `body_measurements` + `health_measurements` | **ALTA** |
| wake_time / sleep_time | `user_chronotype` (plano + JSON) + `user_day_preferences.goals` | **ALTA** |
| Altura (height_cm) | `client_profiles` + `health_measurements` | **ALTA/MEDIA** |
| date_of_birth / biological_sex | escribe `client_profiles`; lectura con fallback a `profiles` (legacy) | MEDIA |
| Cronotipo (animal) | `user_chronotype` único, pero 2 writers guardan columnas distintas | MEDIA |
| Ciclo menstrual | tablas dedicadas OK; `cycle.tsx` sin refresh al volver de settings | BAJA/MEDIA |

**1. Peso/composición (ALTA):** el mismo dato vive en `health_measurements`
(auto-reporte: `health-input.tsx`, capture edad-atp, onboarding v2) Y en
`body_measurements` (coach: `client-profile-service.ts:120`). Los lectores
están partidos: `nutrition-score-service`, `argos-nutrition-insights`,
`argos-service` y `health-score-service` leen SOLO `body_measurements` → **el
peso que el user captura no lo ven ARGOS ni el score de nutrición**; y
`my-health.tsx` lee solo `health_measurements` → no ve lo del coach. Solo
`dashboard-service` hace coalesce de ambos. Además `my-health.tsx:82` carga
sin `useFocusEffect` ni listener.

**2. wake/sleep (ALTA):** `protocol-config.tsx` escribe
`user_day_preferences.goals.wake_time` mientras quiz y onboarding escriben
`user_chronotype` (columnas planas); agenda/day-compiler/intervenciones leen
las planas → **editar el horario en protocol-config NO mueve las anclas de la
agenda**. Nota directa para A.2: las horas de intervenciones se calibran con
`user_chronotype`, así que un ajuste del user vía protocol-config hoy no se
respeta. Extra: dentro de `user_chronotype` conviven columnas planas y un JSON
`schedule` que no todos los writers llenan igual.

**3. Altura (ALTA/MEDIA):** onboarding v2 la escribe a DOS tablas a la vez
(`client_profiles.height_cm` + `health_measurements`); ediciones posteriores
solo tocan `health_measurements` → la de `client_profiles` queda stale para
edad-atp-v2.

**4-6.** date_of_birth con fallback a columna legacy de `profiles` (sin
writers — candidata a deprecar); cronotipo con schema drift entre quiz
(`peak_physical_start/end`, `raw_scores`) y onboarding (`peak_physical`, sin
raw); ciclo bien modelado pero `cycle.tsx` carga on-mount sin listener y no
existe evento `cycle_changed`.

**Recomendación de secuencia (para peloteo, NO ejecutado):** (1) unificar
peso en un solo almacén con vista/coalesce + evento `weight_changed`; (2)
consolidar wake/sleep en `user_chronotype` plano y que protocol-config escriba
ahí; (3) `cycle_changed` + useFocusEffect en pantallas de ciclo; (4) deprecar
`profiles.date_of_birth`. Cada uno es sprint pequeño pero toca cálculos
sensibles (ARGOS, scores, agenda) — no lo metí en este sprint crítico.
