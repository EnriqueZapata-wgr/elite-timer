# 🔍 Audit completo ATP · post 3ra pasada test device

**Fecha:** 2026-07-14
**Autor:** Cowork (2 subagentes en paralelo)
**Alcance:** 166 rutas .tsx · 138 PNGs · package.json + código completo

---

## 🚨 HALLAZGO CRÍTICO · Swap imageBn de Fable NUNCA se aplicó

Los 6 assets MJ que Enrique generó y pushó ESTÁN en filesystem, pero NINGÚN `require()` del código los referencia:

| Asset | Existe en disco | Card que debería usarlo |
|---|---|---|
| `pillars/comunidad.png` | ✅ | Card COMUNIDAD (kit.tsx:54) |
| `pillars/comunidad-tribu.png` | ✅ | Feed futuro |
| `health-hub/diagnostico.png` | ✅ | Card A "Mi Diagnóstico" (health-hub.tsx:181) |
| `health-hub/mi-protocolo.png` | ✅ | Card B "Mi Protocolo" (health-hub.tsx:189) |
| `health-hub/fitzpatrick.png` | ✅ | Pantalla ATP SOL / Fitzpatrick |
| `health-hub/mente-avanzado.png` | ✅ | Pilar Mente (habits-portal.tsx:31) |

**Fable dijo que terminó el swap pero el código no lo tiene.** El commit debe estar pendiente o en rama sin mergear.

---

## 1️⃣ Rutas huérfanas / duplicadas

### Duplicados a limpiar (prioridad alta)
- `mind-hub` (viejo) ↔ `mente` (nuevo) — sobrevive `mente`. Borrar `app/mind-hub.tsx`.
- `historia-clinica/index` ↔ `health-hub` — consolidar (mismo scope de expediente).

### Fitness legacy · 10 pantallas sin entry point
`create-program`, `create-routine`, `routine-execution`, `execution`, `session-summary`, `shared-routine`, `smart-shopping`, `standard-programs`, `training-methods`, `history`, `fitness-hiit`, `fitness-train` — sub-rutas isla que solo se referencian entre sí. Decidir keep vs delete post-launch.

---

## 2️⃣ Cards sin imagen editorial (además del swap Fable)

| Pantalla | Card | Estado |
|---|---|---|
| Pilar **MENTE en Hábitos** (habits-portal.tsx:31) | Reutiliza `electrons/meditacion.png` | Necesita asset dedicado. `mente-avanzado.png` YA existe |
| **ATP SOL** en HOY | Usa `electrons/luz-solar.png` (icon viejo) | Necesita asset editorial pilar |
| **HOY cards MENTE** (checkin/meditación/breathwork/journal) | Todas usan electron images legacy | Rediseño editorial pendiente |
| **historia_clinica, sintomas, padecimientos** (health-hub) | Reutilizan otros assets | Assets dedicados existen sin cablear |

---

## 3️⃣ Colores incongruentes (3 offenders peores)

| Concepto | HOY | Hábitos | Electrón | Problema |
|---|---|---|---|---|
| **SUPLEMENTOS** | Morado `#9B59B6` | Naranja `#EF9F27` | Lima `#a8e02a` | 3 colores distintos |
| **FITNESS/FUERZA** | Rojo `#E74C3C` | Lima-verde `#A8E02A` | Lima | 2 paletas |
| **NUTRICIÓN/PROTEÍNA** | Naranja-rojo | Azul `#5B9BD5` | Azul claro | Hues opuestos |

Coherentes ✅: Agua/Ayuno/ATP Sol (mismos colores cross-app).

**Fix propuesto:** `src/constants/concept-colors.ts` como fuente única de verdad. `hoy-cards.ts`, `habits-portal.tsx`, `health-hub.tsx`, `electrons.ts` leen de ahí.

---

## 4️⃣ 🚨 Placeholders duplicados de datos (auditoría Enrique)

### ALTO · Cronotipo · schemas divergentes en MISMA tabla
- `quiz-service.ts:123-135` `saveUserChronotype()` → escribe `wake_time/sleep_time/peak_focus_start/end/peak_physical_start/end/wind_down_time/raw_scores`
- `onboarding-v2-service.ts:80-89` `saveChronotype()` → escribe `peak_physical` (singular!) y `wind_down` (nombre distinto), SIN `raw_scores`
- **Riesgo:** según flujo, campos quedan NULL → rompen lecturas de agenda/intervenciones circadianas

### ALTO · Ventana de ayuno · configuración se ignora
- `protocol-config.tsx:184` guarda `user_day_preferences.goals.fasting_hours` (leído por Nutrición + ARGOS)
- `fasting.tsx:156` timer **siempre arranca 16:8 hardcoded**, NUNCA lee `goals.fasting_hours`
- **Riesgo:** el user configura ventana en Mi Protocolo pero al iniciar ayuno usa la default

### MEDIO · Peso / composición / estatura
- 3 servicios distintos escribiendo: `health-measurement-service.ts`, `capture-service.ts` edad_atp, `client_profiles.height_cm` en profile.tsx
- `height_cm` duplicado en `client_profiles` + `health_measurements` sin sync

### BAJO/RESUELTO · Fitzpatrick
- Hotfix aplicado en código (task #86 marcado resuelto): `solar.tsx:42-45` escucha evento `fototipo_changed`
- **VERIFICAR EN DEVICE:** si el build actual tiene el hotfix. Si no, sube a ALTO.

### BAJO · Suplementos activos
- Ya consolidado (BHA + manual escriben mismo `user_supplements`)

---

## 5️⃣ 🎈 Paja del bundle (deps + assets muertos)

### 5 dependencies 100% NO usadas (native modules innecesarios en binario)
- `expo-audio` — 0 imports (la app usa `expo-av`)
- `@react-native-community/datetimepicker` — 0 imports (reemplazado por TimeWheelPicker)
- `react-native-purchases-ui` — 0 imports
- `expo-system-ui` — 0 imports
- `@expo/ngrok` — CLI tunneling en `dependencies` (debe ser devDep)

**Acción:** `npm uninstall` + quitar plugins de `app.json`. Requiere nuevo `eas build` para que baje del binario.

### Assets huérfanos (nadie los referencia)
- `assets/backgrounds/*.jpg` — 7 fotos Unsplash originales sin procesar
- 8 variantes de logo (logo-horizontal-dark-sm/xs, logo-veertical-light [typo], etc.) — solo 1 se usa
- 6 variantes de icon color (icon-lima/black/white × sm)
- 6 SVGs de logos en assets/images/ (solo docs)

### Otras oportunidades
- `wearable-service.ts` — stub completo con 5 TODOs "activar cuando configuremos Health Connect SDK"
- Sin `babel-plugin-transform-remove-console` (los console.logs entran al bundle producción)
- Metro sin tuning de tree-shake

---

## 📊 Priorización recomendada (para Fable)

### P0 · Bloqueantes visibles al user (Sprint 1 hoy)
1. **Verify + push swap imageBn** — los 6 assets están, código no los usa. Puede que Fable tenga el commit local sin push.
2. **Cronotipo schema unificado** — colapsar `saveChronotype` de v2 a usar `saveUserChronotype` del quiz-service
3. **Ventana ayuno** — `fasting.tsx` lee `user_day_preferences.goals.fasting_hours`
4. **Verify Fitzpatrick hotfix** llegó al build device

### P1 · Consistencia visual (Sprint 2)
5. **`concept-colors.ts`** como fuente única + refactor los 4 archivos que lo leen (hoy-cards, habits-portal, health-hub, electrons)
6. **Aplicar 3 offenders:** suplementos, fitness, nutrición mismo color cross-app
7. **Pilar MENTE en Hábitos** cablear `mente-avanzado.png`
8. **ATP SOL** cablear asset editorial (si tiene) o generar

### P2 · Limpieza bundle (post-audit)
9. Uninstall 5 deps muertas + reconfig `app.json` + nuevo eas build
10. Borrar `assets/backgrounds/*.jpg` sin usar + 14 variantes logo/icon huérfanas
11. Agregar `babel-plugin-transform-remove-console`
12. Decidir wearable-service.ts (implementar Health Connect o borrar)

### P3 · Consolidación arquitectural
13. Borrar `app/mind-hub.tsx` (task #94 ya lo apunta)
14. Consolidar `historia-clinica/index` vs `health-hub`
15. Decidir fitness legacy (10 pantallas huérfanas): keep post-launch vs delete
16. Peso/composición/estatura unificar a un solo servicio

---

## 🎯 Impacto estimado post-cleanup

- **Bundle bajará** ~5-8MB por deps muertas + assets huérfanos + console stripping
- **Cero placeholders duplicados** = user ve datos coherentes cross-app
- **1 concepto = 1 color** = identidad visual coherente
- **~40 rutas huérfanas** documentadas para decisión post-launch (no bloquea)

---

*Auditoría hecha con 2 subagentes en paralelo. Total 256K tokens invertidos. Cero cambios de código ejecutados.*
