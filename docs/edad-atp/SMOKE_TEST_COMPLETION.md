# EDAD ATP — Smoke Test & Runbook (MEGA COMPLETION)

**Rama:** `feat/edad-atp-completion` · **Build:** Enrique hace el APK (cambios nativos: expo-sharing, expo-location).
**Pre-requisito de datos:** usuario con labs subidos (lab_uploads/lab_results) + composición (health_measurements).

---

## Cambios nativos que requieren build (no OTA)
- **expo-sharing** (compartir imagen de la tarjeta) — nuevo módulo.
- **expo-location** (Cooper GPS) — ya estaba instalado; verificar permiso de ubicación en app.json.
  - iOS: `NSLocationWhenInUseUsageDescription`.
  - Android: `ACCESS_FINE_LOCATION` (el plugin de expo-location lo añade).
- **react-native-confetti-cannon** y **react-native-view-shot**: JS puro (no requieren rebuild, pero ya van en el bundle).

---

## Checklist (instala el build y valida)

### Tab YO
1. [ ] Al abrir YO aparece la **Constellation de Edad ATP** (Integral central + 5 mini-rings) si CE ≥ 30%; si no, CTA "Calcula tu Edad ATP".
2. [ ] **ATP Score** aparece como card pequeña "ATP SCORE · Tu desempeño semanal" (no dominante).
3. [ ] Tap en la constellation (centro) → pantalla de resultado con cinemática.
4. [ ] Las cards viejas "EDAD BIOLÓGICA / RITMO 0.53x" del modelo viejo **ya NO aparecen**.

### Edad ATP — flujo completo
5. [ ] Settings → DEV → "Edad ATP (preview)" entra al hub; hay toggle "Sonidos Edad ATP".
6. [ ] Hub muestra CE + hero con la Integral (si calculada) + 5 cards con indicador "✓ datos"/"pendiente" + card "Tests funcionales".
7. [ ] Tap "Biomarcadores": **NO** hay forma vacía. Ves "✓ Disponibles (N)" con tus labs (read-only + fuente) y "⚠️ Pendientes" solo de lo que falta (los 5 PhenoAge). Botón "Editar manualmente".
8. [ ] Tap "Calcular/Recalcular mi Edad" → cinemática 4-5 s con haptics + reveal con count-up.
9. [ ] Tu **Edad Integral está en zona realista** (28-32 para tu perfil); las sub-edades no salen "18".
10. [ ] Tap en una sub-edad (constellation o lista) → drill-down con componentes (▲/◐/▼/ⓘ) + Acción ATP.
11. [ ] Edita un dato y vuelve a result → **diff animado** "X → Y · N años más joven" + confetti si mejora ≥ 1 (X3 si ≥ 5).
12. [ ] Botón "Compartir mi Edad ATP" → genera tarjeta (story 9:16) y abre el share del SO.

### Tests funcionales
13. [ ] Reaction Time: fase simple (verde) + fase choice (4 cajas); guarda RT y se ve reflejado en Test cognitivo.
14. [ ] Cooper: timer 12 min + distancia GPS (o manual) → VO2max guardado en health_measurements.
15. [ ] Push-ups: contador tap; Balance/Plank/Old-Man: cronómetro. Guardan en functional_tests.

**Si TODOS pasan → módulo Edad ATP completo para Founders M1.**

---

## Flags / pendientes conocidos
- **No existía `EDAD_ATP_UIUX_v1.md`** en el repo: la UIUX se construyó con el design system + ARQUITECTURA_v2 §6. Iterar visual con Enrique si hace falta.
- **domain_scores** siguen placeholder neutral (50) hasta los rangos de 9 bandas (Sprint 5, Mariana).
- **smoker / tratamiento HTN** del riesgo cardiovascular siguen hardcoded false (faltan en cuestionario) — has_diabetes sí se deriva de labs.
- **recovery_hr** de-scopeado (sin columna canónica).
- Trials de Reaction Time en 10/10 (subir a 30/40 tras validar UX).
- Sonidos: solo haptics; faltan assets de audio.
- `result-preview.tsx` conserva el nombre (rename a `result.tsx` diferido para no romper links).
- **Rama basada en el fix de PhenoAge** (`fix/edad-atp-phenoage-read-extracted-data`, aún sin merge): este branch lo incluye; mergea este y el fix queda cubierto.
