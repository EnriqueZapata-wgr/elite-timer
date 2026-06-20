# COWORK_TASK — Sprint OVERNIGHT: Cleanup obsoletas + Pulido HOY profundo

**Origen:** decisiones Enrique 2026-06-15. Día de cierre técnico. Sprint combo overnight para limpiar el codebase y pulir la pantalla HOY simultáneamente.

**Branch:** `fix/overnight-cleanup-hoy` desde `main` (todo lo mergeado hoy ya está en main).
**Estimado:** 8-10h CC overnight.
**SQL:** ❌ ninguna migración.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana.

**Filosofía:** simple beats smart. Cero scope creep. Premium + bulletproof. Ante duda → opción conservadora + flag en COWORK_REPORT.md.

**OVERNIGHT MODE:** Enrique NO disponible para preguntas. Si encuentras decisión normalmente bloqueante:
1. Toma opción más conservadora
2. Documenta en COWORK_REPORT.md como flag con justificación
3. Continúa, NO te bloquees

---

## PARTE 1 — Mata pantallas obsoletas + cleanup (3-4h)

### Archivos a ELIMINAR (motor v1 fantasma)

```
app/onboarding/edad-atp.tsx        — 1157 líneas, motor v1 fantasma
app/onboarding/chronotype.tsx      — 374 líneas, duplicado (existe app/quiz/chronotype.tsx)
src/services/edad-atp-service.ts   — motor v1, único consumer era edad-atp.tsx
src/services/edad-atp-model.ts     — motor v1
```

### Verificar antes de borrar
- `grep -rn "edad-atp-service\|edad-atp-model\|edad-atp.tsx\|onboarding/chronotype" src/ app/` → solo deben quedar referencias en archivos que también se eliminan
- Si hay imports desde otros lugares vivos → flag y NO borres, deja la deuda documentada
- `app/quiz/chronotype.tsx` (374 líneas existente) sí queda — diferente file

### Auditar resto de `app/onboarding/*` (8 archivos actuales)

```
chronotype.tsx     — DELETE (duplicado)
context.tsx        — auditar uso
edad-atp.tsx       — DELETE (motor v1 fantasma)
goal.tsx           — auditar uso
health.tsx         — auditar uso
nutrition.tsx      — auditar uso
summary.tsx        — auditar uso
voice-config.tsx   — auditar uso
```

Para cada uno verificar:
- ¿Está referenciado en `app/_layout.tsx`?
- ¿Hay navigate hacia él?
- Si NO se usa en ningún flujo activo → eliminar
- Si SÍ se usa pero parece obsoleto → flag para Enrique, NO toques

### Imports muertos en todo el proyecto

- Correr `npx tsc --noEmit` después de cada eliminación
- Limpiar imports que apunten a archivos eliminados
- Si hay import que apunta a un export que YA no existe → flag (puede indicar bug)

### Criterios de aceptación PARTE 1

- [ ] 4 archivos targeted eliminados (si verificación pasa)
- [ ] Onboarding restante auditado, eliminaciones extras documentadas
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos los tests existentes verde
- [ ] Bundle size reduction reportada en COWORK_REPORT.md

---

## PARTE 2 — Pulido HOY profundo (4-6h)

### Scope de Enrique (literal)

1. **Quitar caritas de mood** — los emoji/caras de selector de mood en HOY ya no se quieren
2. **Quitar glucosa de HOY** — no es realista en MVP (no todos tienen CGM)
3. **Tap en checkin emocional card → lleva a `/checkin-emocional`** — actualmente NO navega, debe navegar
4. **Adicionar card "Minutos cardio del día"** — del wearable (Apple Watch / Health Connect)
5. **Adicionar card "Pasos diarios"** — del wearable
6. **Revivir agenda** — actualmente solo tiene ayuno, está muerta. Agregar: comidas (del meal_times capturado), sueño (target del cronotipo), entreno (si hay protocolo activo), protocolos activos del día

### Investigación previa

- `app/(tabs)/index.tsx` = pantalla HOY (entry point)
- Buscar componente de mood selector → eliminar referencia + componente si solo se usa ahí
- Buscar quantCard de glucose → eliminar
- Buscar quantCard de checkin emocional → wrap en Pressable que navega
- Wearable data: revisar `src/services/wearable-*` o `expo-health` integration existente
- Agenda: revisar `src/services/day-compiler.ts` (línea ~136 era hydration_logs) — extender para más items

### NO TOCAR en este sprint

- ❌ Sistema de Electrones / Protones H+ (sprint posterior)
- ❌ Motor v2 / matrices / parser
- ❌ ARGOS chat / sheet (Paty bug 6 ya fixed)
- ❌ Welcome+Tour (sprint posterior)

### Wearable integration — investigación + flag si no existe

Si Apple HealthKit / Health Connect NO está implementado:
- **NO lo implementes en este sprint** (es trabajo grande, requiere permisos nativos)
- En su lugar: crea los cards con estado placeholder "Conecta tu wearable" + flag prominente
- Documenta en COWORK_REPORT.md que falta sprint dedicado de wearable integration

Si SÍ está implementado (probable, hay menciones en arquitectura):
- Lee de la data existente
- Si la data es vacía hoy → placeholder "Sin datos del wearable aún"
- Si hay data → muestra valor del día

### Doctrina UX

- **Naming consistente:** `WearableCardCardio`, `WearableCardSteps` o similar. NO mix de naming
- **Spacing:** usa `Spacing.sm/md/lg` del design system (NO números mágicos)
- **Colores:** brand palette de Constants (NO hex sueltos)
- **Animaciones:** misma curve+duration que los quantCards existentes (200-300ms)
- **Haptic:** Light al tap card, Medium al complete

### Criterios de aceptación PARTE 2

- [ ] Caritas mood eliminadas (component + import + render)
- [ ] Glucosa card eliminada
- [ ] Checkin emocional navegable (tap card → router.push('/checkin-emocional'))
- [ ] Card cardio del día (con data del wearable o placeholder)
- [ ] Card pasos diarios (con data del wearable o placeholder)
- [ ] Agenda revivida (mínimo: ayuno + comidas + sueño objetivo + entreno si aplica + protocolos activos)
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos los tests verde
- [ ] Tests nuevos: cards wearable render con/sin data, agenda compila correctamente

---

## ENTREGABLE

### Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos los existentes verde + nuevos
- [ ] Tests nuevos mínimo:
  - HOY renderiza sin mood selector
  - HOY no muestra glucose card
  - Tap checkin emocional navega
  - Cards wearable render con/sin data
  - Agenda compile con todos los tipos de items

### COWORK_REPORT.md debe incluir
1. PARTE 1: archivos eliminados (con líneas), archivos auditados pero NO eliminados (con razón), bundle size delta
2. PARTE 2: antes/después de cada item del scope, screenshots conceptuales del estado HOY si puedes
3. Flags de decisiones autónomas tomadas
4. Wearable integration: ¿existía? ¿qué encontraste?
5. Smoke test checklist para Enrique:
   - [ ] HOY abre sin crashear
   - [ ] No hay caritas de mood
   - [ ] No hay glucose card
   - [ ] Tap checkin emocional → pantalla checkin
   - [ ] Cards cardio + pasos visibles
   - [ ] Agenda tiene más que ayuno
   - [ ] Onboarding (si entras a su path) no aborta
6. Cualquier deuda técnica encontrada (no resuelta) con recomendación

### Push pero NO merge, NO OTA
- Branch `origin/fix/overnight-cleanup-hoy` pusheado
- Enrique audita + valida + decide merge en la mañana

---

## RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. NUNCA usar `crypto.randomUUID` → usar `generateUUID` helper
3. `npx tsc --noEmit` antes de cada commit
4. PowerShell 5.1 sin `&&` en comandos sugeridos
5. NO migración SQL en este sprint
6. NO tocar motor v2, matrices, parser, edad-atp, ARGOS proxy
7. OTA por default — pero NO en este sprint (Enrique decide cuándo)
8. Después de mutaciones agua/comida: `DeviceEventEmitter.emit('day_changed')` + `electrons_changed` (reglas #5+#6 CLAUDE.md)

## STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- `app/(tabs)/index.tsx` = HOY
- `src/services/day-compiler.ts` = compilador electrones del día
- `argos-proxy` Edge Function YA construido — NO tocar (verificado 2026-06-15)
- DeviceEventEmitter ya en uso

---

## ORDEN SUGERIDO DE TRABAJO

1. **PARTE 1 primero** (limpia obsoletas) — base limpia para pulir
2. **PARTE 2 segunda** (pula HOY sobre código limpio)
3. Commit incremental por bug arreglado
4. tsc + tests después de cada commit
5. Push al final
