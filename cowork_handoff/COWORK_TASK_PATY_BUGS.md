# COWORK_TASK — Sprint Paty Bugs (Pulir HOY)

**Origen:** Paty crash test #5 reportó 7 bugs en HOY que el overnight 2026-05 investigó pero no arregló. Son fixes UX/UI concretos, no diseño nuevo.

**Branch:** `fix/paty-bugs-hoy` desde `main` (todos los sprints previos ya mergeados).
**Estimado:** 4-6h CC.
**SQL:** ❌ ninguna.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida antes.

**Filosofía:** simple beats smart. Cero scope creep. Ante duda → documenta flag en COWORK_REPORT.md y aplica la opción más conservadora.

**REGLA NO-FRANKENSTEIN (no negociable):** los 7 fixes deben sentirse de UN solo cerebro de diseño, no 7 parches:
- **Naming consistente** entre componentes (`Water…`, `Now…`, `Mic…`, no `WtrButtons` + `NowDiv` + `FloatMicBtn`)
- **Animaciones consistentes** (mismas curves easing, durations 200-300ms para feedback táctil, haptic Light para acciones rápidas + Medium para mutaciones)
- **Padding/Spacing consistente** (`Spacing.sm/md/lg` del design system existente — NO números mágicos sueltos)
- **Colores consistentes** (palette de Constants existente, NO hex sueltos)
- **NO refactors fuera de scope** (si encuentras código feo cerca del fix, déjalo así — flag en report para sprint futuro)
- **NO duplicar componentes** (si `WaterQuickButtons` se ve útil para futuro `WeightQuickButtons`, déjalo genérico con prop `unit` — pero NO crees el de Weight, solo Water en este sprint)
- **Tests de snapshot UI** donde aplique para detectar regresiones visuales

**Cowork (Enrique) auditará el branch ANTES del merge.** Reporta en COWORK_REPORT.md TODA decisión de estilo que tomaste para que Cowork pueda revisarla rápido.

---

## LOS 7 BUGS

### 1. F01.10 + F03.2 — Botones agua inline en HOY (CRÍTICO)

**Estado actual:**
- `app/(tabs)/index.tsx` ~línea 624: barra agua se renderiza como `quantitativeElectrons` quantCard
- Cada quantCard es `AnimatedPressable` → onPress hace `router.push('/nutrition')`
- **NO hay botones inline** — usuario hace 3 clicks para registrar 1 vaso de agua
- Hidratar = 5-10x/día → 15-30 clicks por día solo para agua

**Fix:**
- En el quantCard SOLO de `water`, agregar 3 botones inline:
  - `-250 ml` (deshacer último vaso)
  - `+250 ml` (vaso estándar)
  - `+500 ml` (vaso grande)
- NO aplicar al resto de quants (sleep, weight, glucose, etc. siguen como están)
- Cada botón:
  - Tap → inserta/actualiza en `hydration_logs` directo (sin navegar)
  - Haptic feedback
  - Animación corta del progreso de la barra
- Mantener la opción de tap general en el card para ir a `/nutrition` (vista detallada)

**Archivos a tocar:**
- `app/(tabs)/index.tsx` (~línea 624 — agregar botones condicionales si `quant.key === 'water'`)
- `src/services/day-compiler.ts` (~línea 136 — verificar el shape de `hydration_logs`)
- Posiblemente nuevo: `components/WaterQuickButtons.tsx` (3 botones reutilizables)

**Doctrina técnica:**
- Después de cada insert/update: `DeviceEventEmitter.emit('day_changed')` y `DeviceEventEmitter.emit('electrons_changed')` (reglas #5 + #6 CLAUDE.md)
- Esto resuelve también F03.7 (sync HOY ↔ Nutrición) — ver bug 2

**Criterio de aceptación:**
- Tap `+250` → barra agua sube + electrón se actualiza inmediatamente
- Tap `-250` con 0 ml → no permite negativo
- Tap `+500` → registra 500 ml en `hydration_logs`
- Tap en el card (área no de botones) → navega a Nutrición

---

### 2. F03.7 — Sync hidratación HOY ↔ Nutrición

**Estado actual:**
- Si registras agua en Nutrición, HOY no se actualiza hasta hacer pull-to-refresh
- Bidireccional roto

**Fix:**
- Suscribir HOY y Nutrición a `DeviceEventEmitter` event `electrons_changed` (y `day_changed`)
- En ambas pantallas, listener que invalide cache + refetch
- Verificar que TODAS las mutaciones a `hydration_logs` emitan el event (esto debe ya estar implementado por regla #5 — auditar y agregar donde falte)

**Archivos a tocar:**
- `app/(tabs)/index.tsx` (suscribir listener si no existe)
- `app/(tabs)/nutrition.tsx` (suscribir listener si no existe)
- Cualquier servicio que mute `hydration_logs` sin emitir event

**Criterio de aceptación:**
- Registrar agua en Nutrición → HOY muestra el nuevo valor sin tocar nada
- Registrar agua en HOY (con botones de bug 1) → Nutrición muestra valor sin tocar nada
- Ambos sin pull-to-refresh

---

### 3. F04.8 — Indicador AHORA en agenda

**Estado actual:**
- `app/(tabs)/index.tsx` líneas 730, 742-750
- Lógica: `const isCurrent = Math.abs(itemMin - nowMin) < 30;`
- Solo muestra AHORA si hay un item de agenda dentro de ±30 min de la hora actual
- Si agenda está esparcida (item 7am + item 12pm) y son las 9am → no se ve nada
- Paty se quejó porque "no sé qué hora es la app", "no sé dónde estoy en mi día"

**FIX DECIDIDO POR ENRIQUE (mi recomendación):**
**Opción C — AHORA como divisor SIEMPRE entre pasado y futuro.**
- Renderizar una línea horizontal con texto "AHORA · 10:42 am" entre los items
- La línea se posiciona en el momento exacto donde "cae" la hora actual en el orden del día
- Si todos los items son del futuro → "AHORA" arriba de todos
- Si todos son del pasado → "AHORA" abajo de todos
- Si la hora actual cae entre dos items (ej. 9am entre item 7am y 12pm) → divisor entre esos dos

**Diseño visual:**
```
[card item 7am]
─────── AHORA · 10:42 am ───────
[card item 12pm]
[card item 3pm]
```

**Archivos a tocar:**
- `app/(tabs)/index.tsx` (refactor del map de items para insertar el divisor en posición correcta)
- Posiblemente nuevo: `components/NowDivider.tsx`

**Criterio de aceptación:**
- Sin items hoy → "AHORA · HH:MM" arriba solo
- 1 item futuro → AHORA arriba del item
- 1 item pasado → AHORA abajo del item
- Mix → AHORA entre el último pasado y el primer futuro
- Hora real (timezone local, no UTC)

---

### 4. F01.4 — Fondo dinámico mañana

**Estado actual:**
- Pendiente debug del overnight, sin detalle
- Probablemente: el fondo (gradient/wallpaper) de HOY debe cambiar según hora del día (mañana/tarde/noche), pero no lo hace

**Investigación inicial requerida:**
- Buscar en `app/(tabs)/index.tsx` el gradient/background del header de HOY
- Buscar si hay lógica de "morning/afternoon/evening" que detecta la hora
- Si la lógica existe pero no funciona → arreglar
- Si NO existe → diseñar:
  - Mañana (5am-12pm): gradient cálido/dorado (sunrise vibe)
  - Tarde (12pm-6pm): gradient azul claro (cielo diurno)
  - Noche (6pm-5am): gradient azul oscuro/púrpura (nocturno)
- Cambio suave (animated transition) entre franjas

**Criterio de aceptación:**
- Abrir app a las 6am → fondo mañana
- Abrir app a las 2pm → fondo tarde
- Abrir app a las 9pm → fondo noche
- Cambio en tiempo real si el usuario tiene la app abierta cuando cruza una franja

**Si NO encuentras la lógica fácilmente, marca el bug como flag en COWORK_REPORT.md y deja UN comentario claro de qué buscaste y qué falta. NO inventes una refactorización grande.**

---

### 5. F07.1 — FAB micrófono se atora

**Estado actual:**
- Pendiente debug, sin detalle
- Probablemente: el FAB (Floating Action Button) del micrófono se queda en estado "recording" después de soltar
- O el permission state se queda colgado

**Investigación requerida:**
- Buscar el componente FAB mic — probable en `components/FloatingMicButton.tsx` o similar
- Auditar lifecycle:
  - PressIn → start recording → state.isRecording = true
  - PressOut → stop recording → state.isRecording = false
  - ¿Se está limpiando el state en `useEffect` cleanup?
  - ¿Hay leak de Permission listener?

**Fix esperado:**
- `useEffect` que limpia recording state al unmount
- onPressOut **siempre** limpia state (incluso si recording falla)
- Try/catch alrededor de `Audio.Recording.stopAndUnloadAsync()`
- Si el bug persiste tras eso → flag para Enrique con repro steps

**Criterio de aceptación:**
- Tap-and-hold mic → graba → soltar → graba se detiene + audio se procesa
- Si el grabador falla a mitad → estado se limpia, FAB vuelve a inactivo
- 10 grabaciones consecutivas sin atorarse

---

### 6. F07.3 — Pop-up ARGOS no expandible

**Estado actual:**
- Pendiente UX redesign
- El popup/sheet de ARGOS tiene altura fija
- Usuario no puede arrastrar para hacerlo más alto/leer mensajes largos

**Fix:**
- Convertir el sheet a un BottomSheet expandible (snap points)
- Snap points sugeridos: `25%`, `50%`, `90%` de la altura
- Drag handle visible arriba
- Tap fuera → cierra (snap a 0)

**Archivos a tocar:**
- Buscar dónde se renderiza el popup ARGOS — probable `app/argos-chat.tsx` o componente reutilizable
- Posiblemente usar `@gorhom/bottom-sheet` si ya está en deps; si no, fallback con `react-native-reanimated`

**Criterio de aceptación:**
- Sheet abre al snap point medio
- Drag arriba → expande al 90%
- Drag abajo → reduce al 25%
- Mensajes largos scrollean dentro del sheet
- Cerrar = drag completo abajo o tap fuera

---

### 7. F01.10 ↔ F03.2 ↔ F03.7 — ya cubiertos en bugs 1 + 2

(F01.10 y F03.2 son el mismo bug visto desde 2 pantallas. F03.7 es el sync que se arregla con el flujo del bug 1.)

---

## ENTREGABLE

### Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos los tests existentes siguen pasando
- [ ] Tests nuevos:
  - Quick buttons agua (insert/update/delete en hydration_logs)
  - Event emission para sync HOY ↔ Nutrición
  - NowDivider positioning (sin items / 1 item / mix)
  - Fondo dinámico por hora (mock Date)

### COWORK_REPORT.md debe incluir
1. Antes/después por cada bug (qué se cambió, en qué archivos)
2. Smoke test checklist para Enrique:
   - [ ] Tap +250 agua → barra sube
   - [ ] Tap -250 → no permite negativo
   - [ ] Tap +500 → 500 ml registrados
   - [ ] Tap card (área no botones) → navega a Nutrición
   - [ ] Registrar agua en Nutrición → HOY sincroniza
   - [ ] AHORA visible cuando no hay items
   - [ ] AHORA divisor correcto entre pasado y futuro
   - [ ] Abrir app a distintas horas → fondo cambia
   - [ ] Tap-and-hold mic 10x → no se atora
   - [ ] ARGOS sheet drag → expande/reduce
3. Cualquier flag o decisión autónoma que tomaste
4. Bugs que NO pudiste arreglar (F01.4 o F07.1 si no encontraste root cause) — con detalle del por qué

### Push pero NO merge, NO OTA
- Branch pusheado a `origin/fix/paty-bugs-hoy`
- Enrique valida con smoke test antes del merge

---

## RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA usar `crypto.randomUUID` → usar `generateUUID` helper
3. Después de mutaciones agua: `DeviceEventEmitter.emit('day_changed')` y `electrons_changed` (reglas #5 + #6)
4. `npx tsc --noEmit` antes de commit
5. PowerShell 5.1 sin `&&` en comandos sugeridos para Enrique
6. NO migración SQL en este sprint
7. NO tocar motor v2, matrices, parser AI ni edad-atp
8. OTA por default — pero NO en este sprint (Enrique decide cuándo)

## STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- `app/(tabs)/index.tsx` = pantalla HOY (entry point del bug)
- `app/(tabs)/nutrition.tsx` = pantalla Nutrición
- `app/argos-chat.tsx` = chat ARGOS
- `src/services/day-compiler.ts` = compilador de electrones del día
- `hydration_logs` = tabla Supabase de registros de agua
- DeviceEventEmitter ya en uso para `day_changed` y `electrons_changed`

---

## ORDEN SUGERIDO DE TRABAJO

1. **Bug 1 + 2 juntos** (botones agua + sync) — son del mismo subsistema, máximo impacto, claro fix
2. **Bug 3 (AHORA divisor)** — refactor visible, alta percepción de pulido
3. **Bug 6 (ARGOS sheet)** — UX win rápido si el bottom-sheet lib ya está
4. **Bug 4 (fondo dinámico)** — investigación primero, fix si es trivial
5. **Bug 5 (FAB mic)** — debugging, puede tomar tiempo, dejar al final
