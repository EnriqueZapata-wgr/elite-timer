# 🔧 SPRINT 1.5 · Cierre estructural pre-beta (Fable)

**Fecha:** 2026-07-14
**De:** Enrique + Cowork
**Para:** Fable
**Contexto:** Sprint 1 Bloque A entregó fixes pero no cerraron limpio en device test. Además surgieron 3 hallazgos conceptuales grandes (doctrinas raíz) que reforman la arquitectura Protocolo↔HOY↔Agenda. Este Sprint 1.5 cierra ambas cosas: los fixes técnicos que faltaron + la refactorización arquitectural.

**Base de arranque:** branch `fix/megahotfix-3ra-sprint1-bloque-a` (encima del trabajo Sprint 1 que sobrevive). NO trabajar desde main.

**Nuevo branch:** `fix/sprint-1-5-hoy-agenda-protocolo`

**Filosofía:** cierre estructural completo · cero deuda · verificación en device después de cada bloque antes del siguiente.

---

## 📚 Doctrinas obligatorias (leer ANTES de tocar código)

Cowork guardó estas doctrinas en memoria durante el rediseño. Fable debe leerlas antes de arrancar porque cambian decisiones de diseño:

1. **`project_doctrina_hoy_agenda_protocolo_relacion`** — Mi Protocolo=HOY cards=Agenda eventos. Un solo dato origen, 3 vistas.
2. **`project_doctrina_registro_epigenetico_3_funciones`** — TODO registro es dato epigenético con 3 funciones.
3. **`project_doctrina_ninguna_pantalla_aislada`** — cada pantalla debe hacer visible origen + destino en journey.
4. **`project_doctrina_dx_intervenciones_core`** — corazón app (levantamientos → DX → intervenciones → HOY/Agenda).
5. **`feedback_cowork_audita_backfills_legacy`** — profiles huérfanos + palabras reservadas Postgres.
6. **`feedback_expo_print_requiere_native_build`** — módulos nativos requieren eas build no OTA.

---

## 🎯 4 bloques de trabajo (ordenados por dependencia)

### BLOQUE A · Fitzpatrick entry point (regresión Sprint 1) · P0 chico

**Bug:** Sprint 1 arregló el listener DeviceEventEmitter `fototipo_changed` (ATP SOL refleja el cambio inmediato ✅) pero borró/movió el botón de acceso al cuestionario Fitzpatrick. En el device de Enrique 2026-07-14: no hay entry point, ni en ATP SOL ni en Tests.

**Fix:**
- Recuperar entry desde **ATP SOL** (header o CTA visible): botón "Actualizar tipo de piel" o similar
- Recuperar entry desde **Tests y Evaluaciones** (`app/tests/index.tsx` o wherever): al lado de Braverman + resto de quizzes funcionales
- El cuestionario Fitzpatrick sigue existiendo (task #7 completada), solo se rompió el acceso
- Escribir en la ÚNICA fuente de verdad `profiles.skin_type` (evitar bug de doble placeholder, doctrina placeholder única)
- Después de guardar → `DeviceEventEmitter.emit('fototipo_changed')` para que ATP SOL escuche

**Verificar:** entrar app → Tests → ver botón Fitzpatrick → completar cuestionario → confirmar Tipo X → ir a ATP SOL sin cerrar app → debe mostrar Tipo X inmediato

---

### BLOQUE B · Muerte pantalla ATP PROTOCOLOS + fusión conceptual Protocolo=HOY=Agenda · P0 medio

**Contexto doctrinal (crítico):**
> "Mi Protocolo activo = HOY cards = Agenda eventos. Un solo dato origen, 3 vistas con propósito distinto. NO hay 'configurar cards de HOY' separado de 'activar intervenciones'. Son lo mismo."

**Trabajo:**

1. **ELIMINAR** la pantalla `app/historia-clinica/protocolos.tsx` (o wherever viva la config electrones + horarios + gramos + activar/desactivar targets). Su función se disuelve:
   - Activar/desactivar electrones/intervenciones → ya vive en Mi Protocolo (Intervenciones)
   - Horarios → los calcula motor Agenda dinámicamente (Bloque C)
   - Gramos/targets → propiedades de intervención "Ventana de alimentación" o similar

2. **REMOVER** la mini-card "Protocolo metabólico básico · Biblioteca de referencia" del feed HOY. Es ruido legacy (doctrina DX intervenciones core deprecó protocolos de HOY). Vive en Biblioteca dentro de Salud Funcional.

3. **CONTEXTUALIZAR journey en Mi DX ↔ Mi Protocolo** (doctrina ninguna pantalla aislada):
   - En **Mi DX** agregar footer con CTA visible: *"Ver intervenciones que ATP te sugiere → [Mi Protocolo]"* — pasa el contexto DX cargado
   - En **Mi Protocolo** agregar header con contextualización: *"Estas intervenciones vienen de tu DX. Tu Nivel [X] en [sistema] indica... [Ver mi DX ↗]"*
   - En **Biblioteca legacy** (protocolo metabólico básico, anti-estrés, etc.) etiqueta clara: *"Biblioteca de referencia · No modifica tu día"*

4. **Rutas afectadas** — verificar no queden entry points muertos:
   - `app/historia-clinica/index.tsx` — quitar link a la pantalla eliminada
   - `app/(tabs)/index.tsx` — quitar mini-card protocolo del feed
   - Cualquier nav que apuntaba a `/historia-clinica/protocolos` → redirigir a `/historia-clinica/mi-protocolo`

**Verificar:** ya no existe pantalla "ATP PROTOCOLOS" · ya no aparece mini-card Protocolo Biblioteca en HOY · Mi DX tiene CTA a Mi Protocolo · Mi Protocolo tiene breadcrumb visible al DX · Biblioteca tiene etiqueta "No modifica tu día"

---

### BLOQUE C · Agenda motor inteligente (GENERATOR fix, no solo cleanup) · P0 grande

**Bug del device test:**
- Sol 06:00 (viola clamp 06:30 que se intentó en Sprint 1)
- Luz solar × 2 (dedup por intervention_key+date NO funcionó)
- Suplementos × 3 (mismo)
- Romper ayuno × 3 (mismo)
- Despertar 05:30 (no respeta cronotipo del user)
- 34 eventos totales — bajó de 56 pero sigue saturado

**Diagnóstico:** el `planAgendaCleanup` de Sprint 1 barrió los 56 viejos (funcionó) pero el **GENERATOR sigue creando duplicados nuevos + no calcula timing dinámico**. Este bloque ataca el generator.

**Trabajo:**

1. **Dedup real por `intervention_key + date` en el generator:**
   - Antes de insertar cualquier evento nuevo, query: `SELECT COUNT(*) FROM agenda_events WHERE intervention_key = $1 AND date = $2 AND source = 'intervention'`
   - Si count > 0 → NO insertar (a menos que la intervención tenga campo `repeats_per_day > 1` explícito, ej. hidratación 8 veces/día)
   - Test guard: insertar la misma intervención 3 veces en el mismo día → solo debe existir 1 evento

2. **Timing dinámico (motor lee registros previos):**

   Para cada intervención, el timing NO es hardcoded sino calculado:

   - **Romper ayuno:**
     - Query `fasting_logs` último `start_time` del user
     - Duración: `user_day_preferences.goals.fasting_hours` (default 16 si null)
     - Hora del evento: `start_time + fasting_hours`
     - Si no hay `fasting_logs` → fallback default (asume cena ~20:00 día previo + 16h = 12:00) con label "estimado"
     - Bug actual: `fasting.tsx:156` timer siempre arranca 16:8 hardcoded sin leer `goals.fasting_hours` → arreglar de paso

   - **Sol matutino:**
     - Query `user_chronotype.wake_time` (columna real, NO `schedule` — referencia doctrina `reference_schemas_criticos_faciles_de_confundir`)
     - Sunrise API si disponible (o fallback 06:30 min)
     - Hora del evento: `MAX(wake_time + 30min, sunrise, 06:30)`
     - Clamp mínimo 06:30 (falló en Sprint 1 · fix definitivo aquí)

   - **Suplementos:**
     - Agrupar por batch (matutino/tarde/noche) leyendo tag de cada supplement en `user_supplements.timing`
     - 1 evento por batch, no 1 por supplement individual
     - Los supplements individuales viven dentro del evento (agenda_events.details JSON)

   - **Hidratación:**
     - Spread inteligente entre `wake_time` y `sleep_time` (leer de `user_chronotype`)
     - Si intervención es "Hidratación matutina 500ml" → 1 evento a `wake_time + 15min`
     - Si intervención genérica "hidratación día" → 3-5 eventos distribuidos

   - **Hora de dormir + ventana de alimentación:**
     - Leer `user_chronotype.sleep_time` y `user_day_preferences.eating_window_start/end`
     - 1 evento por día

3. **Respetar cronotipo:**
   - Si `user_chronotype.type = 'oso'` → wake_time típicamente 07:00 (no forzar 05:30)
   - Si `user_chronotype.type = 'leon'` → wake_time ~06:00 OK
   - Si `user_chronotype.type = 'lobo'` → wake_time ~08:00 (no forzar 06:00)
   - **Delfín NO es cronotipo** (doctrina `project_doctrina_cronotipo_delfin_roto`). Si el user está marcado delfín, usar su cronotipo madre (León/Oso/Lobo) del quiz.

4. **Umbrales de generación (evitar cagadero):**
   - Máximo 15 eventos por día generados por motor (excluye eventos manuales del user)
   - Si el user tiene 20 intervenciones activas → priorizar universales P1 + top 10 restantes por prioridad
   - Log un warning en Sentry si se descartan eventos por umbral

**Verificar en device:**
- Activar 5 universales P1 + Ventana 16:8 configurada con `goals.fasting_hours = 16`
- Ver agenda: debe mostrar ~7 eventos naturales (sol 06:30+, hidratación, ventana alimentación, romper ayuno calculado dinámicamente, dormir según cronotipo)
- Sol nunca antes de 06:30
- Romper ayuno reflejando último fasting_log real
- Cero duplicados
- Cronotipo respetado

---

### BLOQUE D · Universales P1 siempre visibles + umbrales UX progresiva · P0 chico

**Contexto doctrinal:**
> "Sin límite duro. UX progresiva. Universales P1 SIEMPRE visibles (sol, hidratación, sueño, ventana alimentación, grounding — no negociables). Doctrina Humby aplicada."

**Trabajo:**

1. **En Mi Protocolo (sección activas):**
   - Los 7 universales P1 (definidos en `INTERVENTIONS_CATALOG` con `isUniversal: true`) SIEMPRE aparecen visibles arriba, aunque el user tenga 20 activas totales.
   - No cuentan al umbral de warning.

2. **Umbrales de warning en Mi Protocolo:**
   - 1-5 intervenciones activas (sin contar universales): sin hint, todo visible
   - 6-8 activas: hint suave debajo del listado *"Trabajas 6+ · Humby recomienda enfocarte en 5-7 para lograr consistencia"*
   - 9+ activas: warning claro *"Cargas 9+ intervenciones · considera pausar algunas para lograr consistencia. Menos, mejor."*

3. **En HOY:**
   - Las cards son mirror 1:1 de las intervenciones activas del user (fusión Bloque B)
   - Universales P1 siempre presentes como cards
   - Máximo 15 cards visibles (después del umbral, colapsar en "Ver más")

**Verificar:** con 3 activas normales → sin hint; con 7 → hint suave visible; con 10 → warning claro; universales siempre presentes independiente del count.

---

## 🔒 Invariantes técnicos (no negociables)

- str_replace quirúrgico, NO reescribir archivos completos
- Cero fuga clínica (Comunidad no expone datos clínicos)
- Palabras reservadas Postgres NO como identifiers (referencia backfill doctrina)
- Backfills filtran contra profiles huérfanos
- `extractResponseText` helper para todo lectura de Sonnet responses (bug thinking blocks)
- Idempotencia migraciones (IF NOT EXISTS / ON CONFLICT DO NOTHING)
- TypeScript sin errores antes de push (`npx tsc --noEmit`)
- Constants.expoConfig.extra (no process.env directo en cliente)
- `generateUUID` helper (nunca `crypto.randomUUID`)
- `getLocalToday()` / `parseLocalDate()` para date queries
- Después de electrones: `DeviceEventEmitter.emit('electrons_changed')`
- Después de nutrición/ayuno: `DeviceEventEmitter.emit('day_changed')`

## 🧪 Test guards obligatorios

- Dedup agenda: insertar misma intervención 3× mismo día → 1 evento
- Clamp sol: `wake_time = 05:00` → evento sol >= 06:30
- Fallback ayuno: sin `fasting_logs` → evento "Romper ayuno" con label "estimado"
- Cronotipo Lobo → wake_time evento >= 07:30
- Umbrales UX: mock user con 5/8/10 activas → assertion del hint correspondiente

## 📤 Al terminar

Delivery doc en `R and D/FABLE_SPRINT_1_5_DELIVERY.md` con:
- Qué se resolvió (por bloque A/B/C/D)
- Verificaciones hechas (tsc, tests, e2e)
- Bugs bonus descubiertos (si aplica)
- Riesgos o edge cases
- Nuevas doctrinas identificadas

Cero fuga clínica sigue siendo el invariante. Cero deuda técnica. Cada bloque cierra antes del siguiente.

Cuando arranques, avisa a Enrique. Enrique va a testear en device después de cada bloque completado.

— Enrique + Cowork
