# COWORK_TASK — Sprint OVERNIGHT: Bugs P0 + Information Architecture (backlog 19-jun)

**Origen:** sesión Enrique 2026-06-19. Sesión de captura de bugs/feedback rendió 30 puntos. Este overnight ataca los que caben sin riesgo en 8-10h y deja flagged los que necesitan sprint dedicado.

**Branch:** `feat/bugs-p0-backlog-19jun` desde `main`.
**Estimado:** 8-10h CC overnight.
**SQL:** ⚠️ 1 migración pequeña (`ketones_logs` opcional — flag #1).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana.

**Filosofía:** estabilizar antes de seguir construyendo. La mayoría son bugs de UI/ruteo + texto + remoción. NO se mete con motor v2, parser AI, economía Protones, ni con elementos en sprints en curso.

**OVERNIGHT MODE:** Enrique NO disponible. Si encuentras decisión bloqueante:
1. Toma opción más conservadora
2. Documenta en COWORK_REPORT.md como flag
3. Continúa sin bloquearte

**REGLA NO-FRANKENSTEIN (no negociable):**
- Naming consistente
- Animaciones consistentes (durations 200-300ms, springs damping 12-18)
- Design tokens (`Spacing.*`, `Colors.*`, `Radius.*`, `Fonts.*` del brand) — NO números mágicos
- Hex sueltos solo si brand accent justificado
- NO refactors fuera de scope
- Tokens canónicos: BG/BORDER/TEXT/ELEVATION (post sprint UI Phase 1)

---

# CONTEXTO RÁPIDO

Backlog completo en `UIUX a corregir con design/BACKLOG_CORRECCIONES_ENRIQUE_2026-06-19.md`. Mapa maestro en `Business development/MAPA_MAESTRO_HASTA_LAUNCH.md`.

Este overnight cubre **Fase 0 (Hot fixes P0) + parte de Fase 1 (Information Architecture)** del mapa maestro.

---

# PARTE 1 — Bugs CRÍTICOS de DATA + UI obsoleta (2-3h)

## 1.1 CICLO — Calendario fecha + 6 días (BUG GRAVE, señalado 4×)

**Archivos probables:** `app/(tabs)/cycle.tsx`, `src/services/cycle-*`, componentes de calendario.

### Problema 1: "hoy es lunes 19 junio" incorrecto
- Real: hoy es viernes 19 junio 2026 (depende fecha del dispositivo)
- Bug: el calendario marca hoy con día de semana equivocado
- Probable causa: cálculo del día de la semana usa offset incorrecto o timezone mal manejado
- Posible: usa `getDay()` esperando lunes=0 (que es domingo=0 en JS), o problema con `new Date()` sin timezone
- **Doctrina #3 CLAUDE.md:** siempre `getLocalToday()` / `parseLocalDate()`

### Problema 2: Calendario solo 6 días/semana (lun-sáb)
- Etiqueta "Domingo" vacía
- Solo cuenta lun-sáb → 5-6 semanas/mes
- Fechas desfasadas
- Probable causa: grid del calendario excluye domingo, o hardcoded 6 columnas

### Fix esperado
- Calendario 7 días (Lun-Mar-Mié-Jue-Vie-Sáb-**Dom**)
- "Hoy" correcto basado en `new Date().toLocaleDateString('es-MX', { weekday: 'long' })` o equivalent
- Verificar contra `getLocalToday()` helper existente
- Tests: render con 31 días en julio (5 semanas con sábado/domingo arrastrando), con 28/29 días febrero

### Criterio de aceptación
- [ ] Calendario muestra 7 columnas con encabezados Lun-Mar-Mié-Jue-Vie-Sáb-Dom
- [ ] El día "hoy" coincide con la fecha real del sistema
- [ ] Test que pase con fechas mockeadas para varios meses

---

## 1.2 ATP LABS — Título doble "ATP ATP LABS"

**Archivo probable:** `app/edad-atp/labs.tsx` o componente de header.

### Problema
El PillarHeader / título de la pantalla muestra "ATP ATP LABS" en vez de "ATP LABS". Probable que el header tenga "ATP" hardcoded como prefix y el title prop también empiece con "ATP LABS".

### Fix
- Title prop debe ser solo "LABS" (PillarHeader agrega el "ATP" del kicker)
- O, si PillarHeader no agrega kicker automático: cambiar a "ATP LABS" sin duplicación

### Criterio
- [ ] Header muestra solo "ATP LABS" o "ATP" como kicker + "LABS" como title

---

## 1.3 Burbuja flotante de FEEDBACK en producción

**Archivo probable:** componente FAB feedback en `app/_layout.tsx` o algún FAB global.

### Problema
Hay una burbuja flotante de "feedback" visible en producción. Rompe percepción premium.

### Fix
Esconder tras flag `__DEV__` o `isAdmin(user?.id)`:
```typescript
{(__DEV__ || isAdmin(user?.id)) && <FeedbackFAB />}
```

Si no es FAB sino card en alguna pantalla, mismo patrón.

### Criterio
- [ ] No visible en build de producción
- [ ] Visible para admins / __DEV__

---

## 1.4 Safe area bottom — botones SO sobreponen menú inferior

**Archivo probable:** `app/(tabs)/_layout.tsx` o componente de TabBar.

### Problema
En celulares Android con botones de navegación nativos en pantalla (Back/Home/Recents), los botones del SO se sobreponen con el menú inferior de la app. Pasa porque el TabBar no calcula correctamente el safe area bottom inset.

### Fix
Usar `useSafeAreaInsets()` para calcular paddingBottom dinámico:
```typescript
const insets = useSafeAreaInsets();
const tabBarStyle = { paddingBottom: insets.bottom + 8, ... };
```

O si ya usa `useSafeAreaInsets`: aumentar el offset (probable que `+0` esté quedando corto, debe ser `+8` o `+12`).

### Criterio
- [ ] En Android con botones SO en pantalla, el TabBar queda por encima
- [ ] En iPhone con home bar, sigue alineado bien
- [ ] En Android sin botones SO (gesture nav), no agrega padding excesivo

---

## 1.5 "Inicia tu racha" — texto obsoleto en HOY

**Archivo probable:** `app/(tabs)/index.tsx` (header HOY) o componente.

### Problema
Encabezado del HOY sigue diciendo "Inicia tu racha" pero el lenguaje cambió. Buscar y reemplazar por el lenguaje actual.

### Fix
- Buscar el string "Inicia tu racha" en `app/` y `src/`
- Reemplazar por la frase nueva (preguntar Enrique si no es obvio del context — fallback: "Tu progreso de hoy" o "ATP DAILY")
- Si es difícil decidir → flag en COWORK_REPORT.md y dejar string A/B options en commit

### Criterio
- [ ] String "Inicia tu racha" no aparece en HOY
- [ ] Frase nueva consistente con lenguaje actual

---

# PARTE 2 — Bugs de FLUJO + UX issues (2-3h)

## 2.1 Checkin emocional — tap hábito NO navega a `/checkin`

**Archivo:** `app/(tabs)/index.tsx` — sección hábitos del HOY.

### Problema
Cuando el usuario tap el hábito "Checkin emocional", solo se llena el hábito (acumula electrones) pero NO navega a la pantalla `/checkin` donde puede hacer el checkin real.

### Fix
El handler del tap debe:
1. Navegar a `/checkin` primero
2. Cuando regrese y haga el checkin, el hábito se enciende automático (ver 2.2)

```typescript
onPress: () => router.push('/checkin')
// Y el hábito se actualiza vía Realtime / evento, no se hardcodea aquí
```

### Criterio
- [ ] Tap card hábito Checkin emocional → abre `/checkin`
- [ ] NO acumula electrones automático con solo el tap

---

## 2.2 Checkin manual NO enciende hábito ni cuenta electrones

**Archivo:** `app/checkin.tsx` (donde se hace el checkin real).

### Problema
Cuando el usuario completa el checkin en `/checkin`, el hábito NO se marca completado y NO se cuentan electrones. Falta emit.

### Fix
Al guardar el checkin (handleSave o equivalent), emitir:
```typescript
import { DeviceEventEmitter } from 'react-native';
// ...
DeviceEventEmitter.emit('electrons_changed');
DeviceEventEmitter.emit('day_changed');
// Marcar el hábito 'checkin_emocional' como completado en habits_logs si existe
```

Reglas #5 y #6 de CLAUDE.md: después de electrones / nutrición / ayuno, emit.

### Criterio
- [ ] Completar checkin en `/checkin` enciende el hábito en HOY
- [ ] Suma electrones acordes
- [ ] Verificar emit funciona con DeviceEventEmitter listener en HOY

---

## 2.3 Quitar acceso directo Checkin Emocional en HOY (arriba de ACTIVIDAD)

**Archivo:** `app/(tabs)/index.tsx`.

### Problema
En el sprint overnight de pulido HOY se agregó un acceso directo a Checkin Emocional arriba de la sección ACTIVIDAD (donde están las cards Cardio + Pasos). Enrique no lo quiere — debe quedar solo en el hábito normal.

### Fix
- Buscar el componente/card de "Checkin Emocional" que esté arriba de la sección ACTIVIDAD (no confundir con el hábito que está más abajo)
- Eliminarlo
- Verificar que el layout no quede roto (probable que hay que ajustar spacing)

### Criterio
- [ ] No hay card de acceso directo a Checkin Emocional arriba de ACTIVIDAD
- [ ] El hábito Checkin Emocional sigue existiendo (con su fix de navegación de 2.1)
- [ ] Layout queda limpio sin gap raro

---

## 2.4 Re-ruteo Historia Clínica

**Archivo:** `app/health-hub.tsx` (Historia Clínica).

### Problema
Hoy 3 cards en Historia Clínica mandan al lugar equivocado (ATP MI SALUD). Debe ser:

| Card | Hoy | Debe ser |
|---|---|---|
| Biomarcadores | → ATP MI SALUD | → Métricas (peso, fuerza agarre, grasa visceral, músculo, medidas) |
| Laboratorios | → ATP MI SALUD | → ATP LABS (`/edad-atp/labs`) |
| Dominios de salud | → ATP MI SALUD | **ELIMINAR la card** |

### Fix
- Card Biomarcadores: cambiar `onPress` a navegar a la ruta de métricas (probable `/edad-atp/biomarkers` o `/health-input`, verificar cuál corresponde)
- Card Laboratorios: `router.push('/edad-atp/labs')`
- Card Dominios de Salud: eliminar componente completo + import + cualquier handler asociado
- Ajustar layout (probable que las cards usen grid o flex que se ajusta solo)

### Criterio
- [ ] Tap Biomarcadores → métricas (peso/agarre/grasa/etc.)
- [ ] Tap Laboratorios → ATP LABS
- [ ] Card Dominios de salud no existe más

**⚠️ FLAG:** si la ruta exacta para Biomarcadores no es obvia (varias opciones: `/edad-atp/biomarkers`, `/health-input`, etc.), documentar en COWORK_REPORT y dejar la ruta que parezca más lógica. Enrique ajusta post-merge.

---

## 2.5 Quitar ATP SOL de Historia Clínica

**Archivo:** `app/health-hub.tsx`.

### Problema
La card ATP SOL aparece en Historia Clínica pero debería estar solo en Hábitos.

### Fix
- Eliminar la card ATP SOL de health-hub
- Verificar que ATP SOL sigue accesible desde Hábitos (probable `/habits-portal.tsx`)
- Si no está en Hábitos, NO la agregues — flag para Enrique

### Criterio
- [ ] ATP SOL no en Historia Clínica
- [ ] ATP SOL sigue accesible desde Hábitos (verificar)

---

## 2.6 Quitar Hidratación y Ayuno de Nutrición

**Archivo:** `app/(tabs)/nutrition.tsx` o `app/nutrition.tsx`.

### Problema
Las cards de Hidratación y Ayuno aparecen en Nutrición pero deberían estar solo en Hábitos.

### Fix
- Eliminar cards Hidratación + Ayuno de nutrition.tsx
- Verificar que ambas siguen accesibles desde Hábitos
- Imports muertos limpiar

### Criterio
- [ ] Hidratación y Ayuno no en Nutrición
- [ ] Ambas siguen accesibles desde Hábitos

---

# PARTE 3 — Information Architecture: Mi ATP rework (2-3h)

## 3.1 Mi ATP — Cards grandes con iconos + explicación

**Archivo:** `app/(tabs)/yo.tsx` o donde esté Mi ATP.

### Problema
Las cards "Historia Clínica" y "Hábitos" son cards genéricas chicas. Deben ser cards grandes con icono prominente + texto explicativo breve.

### Fix esperado
- Cards grandes (altura ~140-180px típica)
- Icono grande arriba (Ionicons o equivalent, tamaño 32-48)
- Título bold + descripción breve abajo
- Ejemplo:
  ```
  ┌──────────────────────────────┐
  │  🩺 HISTORIA CLÍNICA          │
  │     Tu evaluación funcional   │
  │     completa: padecimientos,  │
  │     biomarcadores, labs       │
  └──────────────────────────────┘
  ```
- Usar design tokens (ELEVATION[1] o [2], borderRadius Radius.lg, gradient sutil si aplica)
- PressableScale primitive (que viene de Phase 1 UI)

### Criterio
- [ ] Cards Historia Clínica y Hábitos son grandes
- [ ] Tienen icono + descripción
- [ ] Tap funciona normal (mismo destino que tenían)

---

## 3.2 Mi ATP — Agregar card ATP MI SALUD

**Archivo:** `app/(tabs)/yo.tsx`.

### Problema
Hoy ATP MI SALUD existe como pantalla independiente pero NO tiene una card de acceso en Mi ATP. La gente entra a ATP MI SALUD por Historia Clínica (mal ruteado).

### Fix
Agregar una card grande "ATP MI SALUD" en Mi ATP con:
- Icono apropiado (probable corazón o stetoscopio)
- Descripción breve
- Tap → navega a `/my-health`

Posición sugerida: junto a Historia Clínica y Hábitos.

### Criterio
- [ ] Mi ATP tiene 3 cards grandes: Historia Clínica, Hábitos, ATP MI SALUD
- [ ] Tap ATP MI SALUD → `/my-health`

---

## 3.3 Historia Clínica — Agregar card ATP MI SALUD

**Archivo:** `app/health-hub.tsx`.

### Problema
Después de re-rutear las cards (2.4), agregar una card explícita "ATP MI SALUD" que navega correctamente a `/my-health`.

### Fix
- Card con icono + título "ATP MI SALUD"
- Tap → `/my-health`

### Criterio
- [ ] Historia Clínica tiene card ATP MI SALUD que navega correcto

---

## 3.4 Quitar ARGOS de cards Mi ATP

**Archivo:** `app/(tabs)/yo.tsx`.

### Problema
Hoy hay cards relacionadas con ARGOS dentro de Mi ATP. Ya que ARGOS va a pasar a menú inferior (futuro sprint), las cards de ARGOS en Mi ATP son redundantes.

### Fix
- Eliminar cards/secciones de ARGOS en Mi ATP
- NO eliminar ARGOS chat (`app/argos-chat.tsx`) — sigue funcional
- Solo eliminar accesos directos desde Mi ATP

### Criterio
- [ ] Mi ATP no tiene cards de ARGOS
- [ ] `app/argos-chat.tsx` sigue funcional accesible desde donde sea que ya existía (FAB actual o futuro menú)

---

# ENTREGABLE

## Tests obligatorios

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos existentes pasan + nuevos
- [ ] Tests nuevos mínimos:
  - Calendario CICLO con 7 días en encabezado
  - "Hoy" del calendario coincide con `getLocalToday()`
  - Re-ruteo cards Historia Clínica (snapshot de routes)
  - Eliminación de cards (no rendering)

## Archivos a tocar (aproximado)

```
app/(tabs)/cycle.tsx            ← C1+C2 calendario
src/services/cycle-*            ← lógica si aplica
app/edad-atp/labs.tsx           ← L1 título
app/_layout.tsx O FeedbackFAB   ← N3 burbuja feedback
app/(tabs)/_layout.tsx          ← N4 safe area tab bar
app/(tabs)/index.tsx            ← H1 nav checkin + H5 texto + H8 quitar acceso directo
app/checkin.tsx                 ← H2 emit electrones
app/health-hub.tsx              ← HC2 re-ruteo + HC4 quitar SOL + HC3 card MI SALUD
app/nutrition.tsx               ← Nu1 quitar hidratación+ayuno
app/(tabs)/yo.tsx               ← M1 cards grandes + M2 ATP MI SALUD + N2 quitar ARGOS
```

## COWORK_REPORT.md debe incluir

1. Antes/después por cada bug
2. Decisiones autónomas (con justificación)
3. Flags pendientes Enrique:
   - Frase nueva para reemplazar "Inicia tu racha"
   - Ruta correcta para Biomarcadores (si no es obvia)
   - Frase de Mi ATP cards (descripciones breves)
4. Smoke test checklist:
   - [ ] CICLO: calendario muestra 7 días + hoy correcto
   - [ ] ATP LABS: título solo "ATP LABS"
   - [ ] Sin burbuja feedback en build prod
   - [ ] TabBar bien alineado en Android con botones SO
   - [ ] HOY: sin "inicia tu racha"
   - [ ] HOY: tap checkin emocional → abre `/checkin`
   - [ ] Hacer checkin en `/checkin` → enciende hábito + suma electrones
   - [ ] HOY: sin acceso directo de Checkin Emocional arriba de ACTIVIDAD
   - [ ] Historia Clínica: Biomarcadores → métricas, Laboratorios → ATP LABS, sin Dominios
   - [ ] Historia Clínica: sin ATP SOL
   - [ ] Nutrición: sin Hidratación ni Ayuno
   - [ ] Mi ATP: 3 cards grandes (HC, Hábitos, ATP MI SALUD)
   - [ ] Mi ATP: sin cards ARGOS

## Push pero NO merge, NO OTA

- Branch pusheado a `origin/feat/bugs-p0-backlog-19jun`
- Enrique audita + decide merge en la mañana

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA `crypto.randomUUID` → usar `generateUUID` helper
3. SIEMPRE `getLocalToday()` / `parseLocalDate()` para date queries
4. CADA CREATE TABLE → ENABLE ROW LEVEL SECURITY + policy
5. Después de mutaciones electrones / day: emit DeviceEventEmitter
6. `Constants.expoConfig.extra` (no process.env directo)
7. `npx tsc --noEmit` antes de commit
8. PowerShell 5.1 sin `&&` en comandos sugeridos
9. OTA por default (eas update) — NO en este sprint, Enrique decide cuándo
10. NO tocar motor v2, parser AI, ARGOS proxy, economía Protones, lab-parser-worker, ni nada de los sprints UI Phase 1/2 en curso

---

# PARTE 4 — ATP LABS profundo (3-4h)

## 4.1 L2 — Auditar biomarcadores extracted vs persisted

**Problema:** hay biomarcadores cruciales que el parser AI v2 SÍ extrae pero NO se están guardando ni graficando.

**Auditoría:**
1. Tomar últimos uploads con `extracted_data` rico (ej. 9238425a-... que tiene 74 biomarcadores)
2. Listar TODOS los keys de `extracted_data.values`
3. Listar TODOS los keys que se persisten en `lab_results` o `lab_values`
4. Diff: keys en extracted_data pero no en lab_*
5. Para cada faltante: agregar la columna a `lab_results` (si falta) y al mapping en `lab-canonical-map.ts`

**Migración SQL (si aplica):** crear migración 077 con ALTER TABLE `lab_results` ADD COLUMN IF NOT EXISTS para los faltantes. Idempotente.

**Criterio:**
- [ ] Doc en `cowork_handoff/AUDIT_LABS_BIOMARKERS.md` con diff completo
- [ ] Migración 077 con columnas faltantes
- [ ] Verificar que después del save, todos los biomarcadores entran a `lab_values`

## 4.2 L3 — Canonicalizar unidades, NO duplicar series

**Problema:** testosterona en ng/dL y ng/mL aparecen como 2 series separadas. No se pueden comparar lab a lab.

**Fix:**
- En `lab-values-service.ts` o donde se hace el insert: SIEMPRE convertir a unidad canónica ANTES de insertar
- Usar `normalizeLabValue()` de `lab-unit-converters.ts` que ya existe
- Si hay registros viejos con unidad no canónica → script de migración data fix

**Criterio:**
- [ ] Insert a `lab_values` siempre con unidad canónica (ej. testo siempre ng/dL)
- [ ] Pantalla de gráficas en ATP LABS muestra UNA serie por biomarker, no duplicada
- [ ] Si datos viejos están mal, script SQL los corrige (incluir en migración 077)

## 4.3 HC1 — Activar campo cetonas (espejear glucosa)

**Estado actual:** la pantalla `/ketones-log` ya existe pero está desactivada / sin tabla.

**Tareas:**
1. Crear migración SQL `ketones_logs` espejo de `glucose_logs` (id, user_id, value, measured_at, source, notes, created_at) + RLS
2. Activar la card en Historia Clínica o donde corresponda
3. UI espejo de `/glucose-log` para cetonas (mismo patrón visual + diferencia de color/icono)
4. Servicio `ketones-service.ts` espejo de `glucose-service.ts`

**Criterio:**
- [ ] Migración SQL `ketones_logs` con RLS
- [ ] Pantalla `/ketones-log` funcional
- [ ] Insert + lectura + gráficas funcionan igual que glucosa

---

# PARTE 5 — Tests + Cuestionarios + Historia Clínica funcional (3-4h)

## 5.1 T1 — Test de Cronotipos a sección Tests

**Estado actual:** existe `app/quiz/chronotype.tsx` (374 líneas) pero no está en la sección Tests.

**Tareas:**
- Crear `app/edad-atp/tests/chronotype.tsx` que re-export o wrappe el de `quiz/chronotype.tsx` (no duplicar lógica)
- Agregar entry en `app/edad-atp/tests/index.tsx` (sección Tests)
- Misma navegación que los otros tests

**Criterio:**
- [ ] Test Cronotipos accesible desde sección Tests
- [ ] Funciona igual que antes (no romper el quiz original)

## 5.2 T2 — TODOS los tests con interfaz tipo Braverman (UI/UX sexy)

**Filosofía:** 1 pregunta por pantalla, animaciones sexy, haptic en cada selección, progress bar, transición fluida entre preguntas.

**Tests a verificar/migrar:**
- `app/edad-atp/tests/balance.tsx`
- `app/edad-atp/tests/cooper.tsx`
- `app/edad-atp/tests/push-ups.tsx`
- `app/edad-atp/tests/reaction-time.tsx`
- `app/edad-atp/test-plank.tsx`
- `app/edad-atp/test-bolt.tsx`
- `app/edad-atp/test-old-man.tsx`
- `app/edad-atp/test-recovery-hr.tsx`
- `app/braverman.tsx` (referencia de calidad)

**Tareas:**
- Identificar cuál tiene la "interfaz Braverman" y replicar patrón
- Si el patrón no está claro, crear `<TestQuestionScreen>` reusable con: progress bar arriba, pregunta grande, opciones con PressableScale + haptic, animación fade transition entre preguntas
- Migrar tests uno por uno (commit por test)

**Criterio:**
- [ ] Componente `<TestQuestionScreen>` reusable creado
- [ ] Al menos 4 tests migrados al patrón (priorizando los más visibles)
- [ ] Tests restantes documentados en flag para próximo sprint si no caben

## 5.3 T3 + HC5 — Cuestionarios Historia Clínica funcional

**Filosofía:** la "Historia Clínica" hoy no tiene cuestionarios. Crear el módulo con cuestionarios funcionales en `tests/cuestionarios`.

**Cuestionarios a crear (mínimo):**
1. Padecimientos personales (HTA, DM2, hipotiroidismo, etc. — selección múltiple)
2. Padecimientos familiares (parents, abuelos)
3. Hábitos (alcohol, tabaco, ejercicio, sueño — ya parcialmente existe en hábitos quiz)
4. Tratamientos actuales (medicamentos, suplementos, terapias)
5. Salud bucal (amalgamas, caries, encías sangrantes, bruxismo)
6. Síntomas crónicos (dolores, fatiga, problemas digestivos)
7. Condiciones actuales (embarazo, peri-menopausia, etc.)

**Tareas:**
1. Crear migración SQL `historia_clinica` (user_id, jsonb categorías, last_updated)
2. Card "Crear Historia Clínica" en Historia Clínica (link a `app/tests/cuestionarios/historia-clinica/index.tsx`)
3. Pantalla index de cuestionarios HC con 7 cards (una por cuestionario)
4. Cada cuestionario usa `<TestQuestionScreen>` de 5.2
5. Resultados se guardan en `historia_clinica.{category}` jsonb

**Criterio:**
- [ ] Migración SQL `historia_clinica`
- [ ] Card "Crear Historia Clínica" en HC funcional
- [ ] Al menos 3 cuestionarios completos (los demás flagged si no caben)
- [ ] Mariana podrá validar después si las preguntas son las correctas (esperado, no bloquea)

**⚠️ FLAG:** las preguntas exactas necesitan validación de Mariana. CC propone preguntas razonables basadas en estándar de medicina funcional (no inventar). Documentar la lista exacta en COWORK_REPORT.md.

---

# PARTE 6 — HOY agenda + notificaciones (1-2h)

## 6.1 H3 — Horarios agenda deben respetar protocolo

**Problema:** Protocolo activo dice ayuno 16:8 pero agenda manda desayuno 7am cenar 7pm (que es 12 horas, no 16:8).

**Investigación:**
1. Buscar de dónde sale la agenda en `app/(tabs)/index.tsx`
2. Verificar si lee `client_profiles.meal_times` (que ya existe con timezone) o si está hardcoded
3. Verificar si lee el protocolo activo del usuario

**Fix:**
- La agenda debe derivar horarios de:
  1. `client_profiles.meal_times` si están configurados
  2. Protocolo activo (si hay ayuno 16:8 → ventana 12pm-8pm o similar)
  3. Defaults razonables (no hardcoded 7am-7pm)

**Criterio:**
- [ ] Si usuario tiene meal_times configurados, agenda los respeta
- [ ] Si hay protocolo de ayuno activo, agenda se alinea (no contradice)
- [ ] No hay horarios hardcoded 7am-7pm

## 6.2 H7 — Notificaciones ARGOS no congruentes

**Problema:** las notificaciones de ARGOS son obsoletas y no congruentes con el estado del usuario.

**Investigación:**
- Buscar `expo-notifications` setup
- Identificar dónde se generan las notificaciones
- Auditar el contenido vs lo que ARGOS hoy contextualiza

**Fix:**
- Si las notificaciones son strings hardcoded → reemplazar por mensajes dinámicos basados en estado del día (electrones, hábitos completados, agenda)
- Si son generadas por ARGOS pero con contexto viejo → actualizar el contexto que se pasa
- **FLAG si la lógica es ambigua:** documentar dónde está y proponer 2-3 mensajes contextual base, dejar Enrique decida.

**Criterio:**
- [ ] Notificaciones tienen mensajes actualizados al lenguaje actual
- [ ] Idealmente: contextual al estado del día
- [ ] Si no se puede sin decisión: flag claro en COWORK_REPORT

---

# PARTE 7 — CICLO máscara embarazo (1-2h)

## 7.1 C3 — Máscara de embarazo

**Filosofía:** cuando el usuario está embarazada, toda la dinámica de ciclo cambia: no ovula, no menstrúa, hay etapas (1er/2do/3er trimestre), proyección de parto.

**Tareas:**
1. Migración SQL: agregar a `cycle_settings` o `client_profiles` un campo `pregnancy_status` (jsonb con `is_pregnant`, `start_date`, `due_date`, `trimester` derivado)
2. UI: toggle en cycle-settings "Estoy embarazada" + date picker fecha probable de parto
3. Cuando `is_pregnant === true`:
   - Calendario muestra etapas (semanas 1-13 / 14-26 / 27-40+)
   - No hay tracking de menstruación
   - Hay tracking de síntomas embarazo (náuseas, antojos, movimientos del bebé)
4. Cuando regresa a no embarazada: reset a flow normal

**Criterio:**
- [ ] Toggle en cycle-settings funciona
- [ ] Calendario adapta al estado de embarazo
- [ ] Tabla de síntomas de embarazo
- [ ] Reset a flow normal funciona

**⚠️ FLAG:** scope clínico — qué tracking específico de embarazo (Mariana puede iterar después). Implementar lo razonable, documentar.

---

# PARTE 8 — ARGOS al menú inferior (1-2h)

## 8.1 N1 — ARGOS de FAB a 5to botón del menú

**Filosofía:** ARGOS es feature central, no debe estar como FAB flotante. Debe estar en el menú principal inferior.

**Tareas:**
1. Identificar el TabBar actual en `app/(tabs)/_layout.tsx` — debe tener 4 tabs hoy
2. Agregar 5to tab para ARGOS con icono apropiado
3. Crear `app/(tabs)/argos.tsx` que renderice el `argos-chat` o re-export
4. Eliminar/ocultar el FAB de ARGOS actual
5. Verificar que la navegación sigue funcional desde cualquier deep link existente

**Criterio:**
- [ ] TabBar tiene 5 tabs (incluyendo ARGOS)
- [ ] Tap ARGOS abre el chat
- [ ] FAB flotante de ARGOS eliminado
- [ ] No hay regresión en deep links

**⚠️ FLAG:** si el TabBar tiene un layout específico (4 columnas), cambiar a 5 puede requerir ajustar widths. Verificar visualmente.

---

# ENTREGABLE ACTUALIZADO

## Tests obligatorios

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Tests nuevos por parte trabajada

## Orden estricto de trabajo

1. **PARTE 1** (bugs P0 visibles) — PRIMERO, sin excepciones
2. **PARTE 2** (flujo + ruteo) — segundo
3. **PARTE 3** (info architecture Mi ATP) — tercero
4. **PARTE 4** (ATP LABS profundo) — cuarto
5. **PARTE 5** (Tests + Cuestionarios HC) — quinto
6. **PARTE 6** (HOY agenda + notificaciones) — sexto
7. **PARTE 7** (Ciclo máscara embarazo) — séptimo
8. **PARTE 8** (ARGOS al menú) — último

**Si en algún momento ves que la parte siguiente tomaría más de 1h y solo te quedan 30 min, NO la empieces.** Mejor commit limpio del estado actual + flag claro en COWORK_REPORT.md de hasta dónde llegaste.

## Push pero NO merge, NO OTA

- Branch pusheado a `origin/feat/bugs-p0-backlog-19jun`
- Enrique audita + decide merge en la mañana
- Si quedó incompleto: continuamos al día siguiente sin perder progreso

## COWORK_REPORT.md sección NUEVA

**"Estado de avance por parte"** con tabla:
| Parte | Items | Estado |
|---|---|---|
| 1 | C1, C2, L1, N3, N4, H5 | ✅ Completa / 🟡 Parcial / ❌ No iniciada |
| 2 | H1, H2, H8, HC2, HC4, Nu1 | ... |
| 3 | M1, M2, HC3, N2 | ... |
| 4 | L2, L3, HC1 | ... |
| 5 | T1, T2, T3, HC5 | ... |
| 6 | H3, H7 | ... |
| 7 | C3 | ... |
| 8 | N1 | ... |

## SQL migraciones esperadas (idempotentes)

- 077 lab_results columnas faltantes (PARTE 4.1)
- 078 ketones_logs (PARTE 4.3)
- 079 historia_clinica (PARTE 5.3)
- 080 pregnancy_status / cycle_settings (PARTE 7.1)

**NO ejecutarlas:** dejar archivos .sql listos, Enrique las corre via `npx supabase db push` post-merge (CLI ya linkeada).

---

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Tokens canónicos: BG / BORDER / TEXT / ELEVATION (post UI Phase 1)
- Reanimated 4 + gesture-handler + expo-blur + expo-haptics ya en deps
- DeviceEventEmitter para `day_changed`, `electrons_changed`
- PressableScale primitive del kit (post UI Phase 1)
- Supabase CLI linkeado al proyecto (db push automático cuando aplique)

---

# ORDEN SUGERIDO DE TRABAJO

1. **PRIMERO leer** archivos clave para entender estructura:
   - `app/(tabs)/index.tsx` (HOY)
   - `app/(tabs)/yo.tsx` (Mi ATP)
   - `app/health-hub.tsx` (Historia Clínica)
   - `app/(tabs)/cycle.tsx` (CICLO)
   - `app/(tabs)/_layout.tsx` (TabBar)
   - `src/constants/brand.ts` (tokens)

2. **PARTE 1** (bugs P0 visibles): C1+C2 calendario · L1 título · N3 burbuja · N4 safe area · H5 texto

3. **PARTE 2** (flujo + ruteo): H1+H2 checkin · H8 quitar acceso · HC2 re-ruteo · HC4 quitar SOL · Nu1 quitar Hidra+Ayuno

4. **PARTE 3** (info architecture): M1 cards grandes · M2 ATP MI SALUD card · HC3 ATP MI SALUD card en HC · N2 quitar ARGOS

5. **Tests + COWORK_REPORT** + push final

Cada parte → commit incremental con mensaje claro.

Buena overnight 🌙
