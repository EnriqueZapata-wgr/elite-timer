# ATP AUDIT REPORT

**Fecha:** 2026-04-13  
**Total pantallas:** 53 archivos .tsx en app/  
**Total líneas de código:** 56,638  
**Migraciones SQL:** 49  
**Servicios:** 31  
**Componentes:** 40  
**TSC errores:** 0 (compilación limpia)

---

## RESUMEN EJECUTIVO

- **5 problemas críticos** (🔴)
- **12 problemas importantes** (🟡)
- **8 sugerencias de mejora** (🟢)

### CRÍTICOS 🔴

1. **Ruta rota: `/mobility-assessment`** — fitness-hub y fitness-mobility navegan a esta ruta pero el archivo NO existe. Crash al tocar.
2. **Ayuno NO otorga electrón** — `breakFastAt()` en fasting.tsx completa el ayuno pero nunca llama `awardBooleanElectron`. Las fuentes `fasting_12h`, `fasting_16h`, `fasting_24h` están definidas pero jamás se otorgan.
3. **Meditación NO otorga electrón** — meditation.tsx completa sesiones pero no llama `awardBooleanElectron('meditation')`. El electrón `meditation` (peso 2.5) nunca se gana.
4. **Archivo ARGOS duplicado** — `src/constants/ARGOS_FOOD_LIBRARY.ts` (42KB) y `src/constants/argos-food-library.ts` (14KB) son dos archivos diferentes. Solo el segundo se importa. El primero es peso muerto de 42KB.
5. **GradientCard duplicado** — `src/components/GradientCard.tsx` y `src/components/ui/GradientCard.tsx` son dos componentes diferentes con la misma funcionalidad. Algunos screens importan uno, otros el otro. Riesgo de inconsistencia visual.

### IMPORTANTES 🟡

1. **Journal NO otorga electrón** — journal.tsx guarda entries pero no llama `awardBooleanElectron`. No hay electrón definido para journal (podría ser `checkin` o uno nuevo).
2. **Glucosa NO otorga electrón** — glucose-log.tsx guarda pero no otorga electrones.
3. **Meditación NO guarda en mind_sessions** — solo hace `toggleCompletion` para protocolos. No hay registro de duración/historial como sí lo hace breathing.
4. **151 catch blocks vacíos** — errores se tragan silenciosamente en todo el codebase. Dificulta debugging.
5. **63 console.log en producción** — impacto en rendimiento y exposición de datos internos.
6. **Electrones cuantitativos (pasos, sueño) sin fuente real** — `steps` y `sleep` están en ELECTRON_WEIGHTS pero no hay pantalla ni integración de wearables para alimentarlos. Siempre quedan en 0.
7. **check-in emocional: electrón usa `'checkin' as any`** — la fuente se llama `checkin` en electrons.ts pero se castea con `as any`, indicando posible mismatch de tipos.
8. **Historial de sesiones de timer no se guarda** — `app/execution.tsx` (timer countdown) no persiste resultados. Al terminar un timer HIIT, no se registra en ninguna tabla.
9. **food-text.tsx: unidad siempre "g"** — la pantalla principal de registro manual solo muestra "g", no usa ARGOS para pre-llenar unidades naturales al agregar ingredientes del buscador.
10. **Pantallas sin Safe Area** — 21 pantallas no usan SafeAreaView. Contenido puede quedar detrás del notch.
11. **Pantallas sin Haptics** — 15 pantallas no tienen feedback háptico en ningún botón.
12. **Tab `yo` no navega a nada útil** — el tab "Yo" está visible pero no está claro qué muestra vs "Perfil" (oculto).

### SUGERENCIAS 🟢

1. **Unificar GradientCard** — elegir uno de los dos y migrar todas las importaciones.
2. **Eliminar ARGOS_FOOD_LIBRARY.ts** (mayúsculas) — es el archivo no usado de 42KB.
3. **Agregar electrón para journal** — nueva fuente tipo `journal: { weight: 1.5, ... }`.
4. **Reportes incluyen datos clave** — reports-service.ts ya consulta food_logs, hydration, exercise_logs, fasting, electrons, glucose. Buena cobertura.
5. **Pantallas huérfanas para considerar eliminar:** `smart-shopping.tsx`, `standard-programs.tsx` — tienen pocas referencias.
6. **DeviceEventEmitter correcto** — 2 eventos (`day_changed`, `electrons_changed`) están bien pareados: 9 emisores, 2 listeners (HOY screen).
7. **RLS robusto** — 128 policies definidas. Todas las tablas principales tienen RLS. No se usa `service_role` en el cliente. No hay URLs http inseguras.
8. **Meditación funcional** — A pesar de lo que se pensaba, meditation.tsx tiene biblioteca completa con timer por fases. No es placeholder.

---

## DETALLE POR CATEGORÍA

### 1. ARQUITECTURA Y NAVEGACIÓN

**Tabs visibles:** Hoy (index), Yo, Kit  
**Tabs ocultas:** biblioteca, progreso, perfil

**Ruta rota:**
- `/mobility-assessment` — referenciada en fitness-hub y fitness-mobility, pero `app/mobility-assessment.tsx` NO EXISTE.

**Pantallas poco referenciadas (posibles huérfanas):**
| Pantalla | Referencias desde otros archivos |
|----------|--------------------------------|
| smart-shopping.tsx | 1 |
| standard-programs.tsx | 1 |
| health-input.tsx | 2 |
| quizzes.tsx | 3 |

### 2. PERSISTENCIA DE DATOS

**54 tablas definidas en migraciones, 48 usadas en código.**

| Acción del usuario | Tabla | ¿Se guarda? | ¿Se puede consultar después? |
|---|---|---|---|
| Toggle electrón booleano | daily_electrons, electron_logs | ✅ | ✅ (HOY, reportes) |
| Registrar comida | food_logs | ✅ | ✅ (nutrición, reportes) |
| Registrar agua | hydration_logs | ✅ | ✅ (nutrición, reportes) |
| Iniciar/romper ayuno | fasting_logs | ✅ | ✅ (historial, reportes) |
| Registrar glucosa | glucose_logs | ✅ | ✅ (historial, reportes) |
| Log ejercicio (sets) | exercise_logs, personal_records | ✅ | ✅ (PRs, reportes) |
| Completar respiración | mind_sessions | ✅ | ✅ (historial en selector) |
| Completar meditación | — | ❌ NO SE GUARDA | ❌ |
| Check-in emocional | emotional_checkins | ✅ | ✅ (historial en checkin) |
| Journal entry | journal_entries | ✅ | ✅ (historial en journal) |
| Registro ciclo diario | cycle_daily_logs | ✅ | ✅ (calendario, charts) |
| Timer HIIT completado | — | ❌ NO SE GUARDA | ❌ |
| Rutina completada | execution_logs | ✅ (via routine-execution) | Parcial |
| Cardio session | cardio_sessions | ✅ | ✅ (fitness-cardio) |

### 3. SEGURIDAD

- ✅ **RLS habilitado** en todas las tablas principales (128 policies)
- ✅ **No hay `service_role`** en el código del cliente
- ✅ **No hay URLs http** inseguras
- ✅ **No se loguean keys/tokens** en console
- ⚠️ **151 catch blocks vacíos** — errores se pierden silenciosamente

### 4. UI/UX UNIFORMIDAD

| Componente | Pantallas que lo usan |
|---|---|
| GradientCard | 23 |
| AnimatedPressable | 35 |
| SectionTitle | 17 |
| PillarHeader/ScreenHeader | 39 |

**21 pantallas sin GradientCard** (incluye layouts, auth screens, y algunas funcionales)  
**15 pantallas sin Haptics** (incluye layouts y pantallas legacy)

### 5. LENGUAJE

- Mayoría de textos en español ✅
- Algunos botones usan "OK" (anglicismo aceptable)
- No se encontraron textos ofensivos
- No se encontraron TODO/FIXME en código de producción

### 6. BRANDING "ARGOS IA"

- El prompt de nutrición se identifica como "nutriólogo experto de ATP", NO como ARGOS
- Variables internas usan `ai_analysis`, `ai_estimate` — no ARGOS
- No hay UI visible que diga "ARGOS" al usuario
- **Oportunidad:** renombrar la IA visible al usuario como "ARGOS" en textos de UI

### 7. BOTONES Y FUNCIONALIDAD

- No se encontraron Pressable sin onPress
- No se encontraron onPress con solo console.log
- Todos los botones "GUARDAR" tienen INSERT/UPSERT asociado ✅

### 8. ELECTRONES — ESTADO COMPLETO

| Electrón | Peso | ¿Se otorga? | ¿Dónde? | ¿Se revoca? |
|---|---|---|---|---|
| cold_shower | 3.0 | ✅ | HOY toggle | ✅ |
| meditation | 2.5 | ❌ NUNCA | — | — |
| strength | 3.0 | ✅ | log-exercise | No aplica |
| no_alcohol | 1.0 | ✅ | HOY toggle | ✅ |
| sunlight | 1.5 | ✅ | HOY toggle | ✅ |
| grounding | 1.5 | ✅ | HOY toggle | ✅ |
| supplements | 1.0 | ✅ | HOY toggle | ✅ |
| breathwork | 1.0 | ✅ | breathing.tsx | No aplica |
| protein | 2.0 | Auto (food_logs) | day-compiler | — |
| steps | 3.0 | ❌ Sin fuente | — | — |
| water | 1.5 | Auto (hydration) | day-compiler | — |
| sleep | 3.0 | ❌ Sin fuente | — | — |
| checkin | 2.0 | ✅ | checkin.tsx (as any) | No aplica |
| lab_upload | 10.0 | ❌ No verificado | — | — |
| fasting_12h | 1.0 | ❌ NUNCA | — | — |
| fasting_16h | 2.0 | ❌ NUNCA | — | — |
| fasting_24h | 3.0 | ❌ NUNCA | — | — |

**Electrones que NUNCA se otorgan:** meditation (2.5), fasting_12h/16h/24h (1-3), steps (3.0), sleep (3.0), lab_upload (10.0) = **22.5 puntos inaccesibles**

### 9. REPORTES

reports-service.ts consulta: food_logs, hydration_logs, exercise_logs, personal_records, cardio_sessions, execution_logs, daily_plans, fasting_logs, electron_logs, glucose_logs.

**Datos que se registran pero NO aparecen en reportes:**
- Mind sessions (respiración, meditación)
- Journal entries
- Ciclo menstrual
- Check-ins emocionales

### 10. EVENTOS

| Evento | Emisores | Listeners |
|---|---|---|
| day_changed | 9 | 1 (HOY screen) |
| electrons_changed | 4 | 1 (HOY screen) |

✅ Bien pareados. No hay eventos huérfanos.

### 11. ERRORES

- **151 catch blocks vacíos** — los errores se tragan
- **63 console.log/warn/error** en producción
- **0 errores de TypeScript** (compilación limpia)

### 12. DUPLICADOS Y PESO MUERTO

| Archivo | Tamaño | Problema |
|---|---|---|
| src/constants/ARGOS_FOOD_LIBRARY.ts | 42KB | No importado, duplicado |
| src/components/GradientCard.tsx | 3.7KB | Duplicado de ui/GradientCard.tsx |
| app/(tabs)/biblioteca.tsx | ? | Tab oculto |
| app/(tabs)/progreso.tsx | ? | Tab oculto |
| app/(tabs)/perfil.tsx | ? | Tab oculto |

---

## PRIORIDADES RECOMENDADAS

### Inmediato (sesión actual)
1. 🔴 Crear `app/mobility-assessment.tsx` o quitar la navegación
2. 🔴 Otorgar electrones de ayuno en `breakFastAt()`
3. 🔴 Otorgar electrón de meditación al completar sesión
4. 🔴 Eliminar `ARGOS_FOOD_LIBRARY.ts` (mayúsculas)

### Próxima sesión
5. 🟡 Guardar meditación en mind_sessions
6. 🟡 Guardar sesiones de timer HIIT
7. 🟡 Unificar GradientCard
8. 🟡 Arreglar `'checkin' as any` casting

### Backlog
9. 🟢 Agregar electrón de journal
10. 🟢 Limpiar console.logs
11. 🟢 Agregar haptics a pantallas faltantes
12. 🟢 Integrar steps/sleep cuando haya wearables
