# EDAD ATP — Calibración Hotfix · Runbook & Smoke Test

**Rama:** `fix/edad-atp-calibration-hotfix` (basada en `feat/edad-atp-completion`).
**Deploy:** OTA (`eas update --branch preview`) — sin build nativo. **Lo corre Enrique tras validar.**

## Qué arregla (4 bugs apilados que inflaban la Edad ATP)

1. **SF placeholder 50 → scoring real.** `loadUserData` lee las respuestas reales y las puntúa
   con un registro explícito por pregunta (orden sano→no-sano, manejando inversiones y "No sé").
   Un atleta con respuestas saludables ahora da SF ≥ 0.80 en vez de 0.50.
2. **Cognitivo recalibrado.** Test a 30+30 trials con filtro de outliers (10% más lento), curva
   Der & Deary 2006 (adultos sanos ya no salen 60-75) y clamp del modificador ±1.5 (era ±3).
3. **Cap inferior sub-edades.** cap = cronológica × 0.75 (era 0.6) + soft floor monótono, para que
   las sub-edades de atletas no se saturen todas en el mismo número.
4. **lab_uploads fallback robusto.** Lectura sin filtro `status`, soporte de 2 shapes
   (`{values:{k:{value}}}` y `{k:value}`), y sinónimos es/en de keys. La pantalla de biomarcadores
   también lee del PDF parseado.

## Smoke test post-OTA

1. [ ] Recalcular Edad ATP → resultado en zona **24-28** (perfil atleta como Enrique).
2. [ ] Hub biomarcadores: "✓ Disponibles (9+)" desde labs parseados (no pide manual).
3. [ ] Sub-edades muestran **24-30** (no saturadas en 21).
4. [ ] Test cognitivo: 30 trials por fase. Adulto sano → edad cognitiva ~30-40.
5. [ ] Result: ningún input requiere captura manual cuando hay labs subidos.

**Si los 5 pasan → calibración OK para beta.**

## Investigación FIX 4 (lab_results vacío)

- El parser (`lab-service.ts`) inserta en `lab_results` **y** escribe `lab_uploads.extracted_data`.
- Causa más probable de que `extracted_data` se ignorara: el query a `lab_uploads` filtraba por
  `status='extracted'`; si el upload quedó en otro estado (parse parcial), su `extracted_data`
  quedaba oculto. **Corregido** (commit 9: `not extracted_data is null`, sin filtro de status).
- Que `lab_results` esté vacío para el usuario podría ser RLS/`user_id` en el insert del parser.
  **No se tocó la lógica de auth** (flag #1): se documenta y el fallback a `extracted_data` cubre
  el caso. Si persiste, revisar en Supabase el `user_id` con que el parser insertó la fila.

## Flags / pendientes
- Scoring de cuestionarios es **lineal interim** (registro explícito por pregunta). TODO Sprint 5:
  Mariana valida los rangos de 9 bandas y la dirección/peso de cada pregunta.
- Curva RT, clamp ±1.5, cap ×0.75 y soft floor: **calibración interim**, validar con datos reales.
- No se calibraron las curvas internas de cada sub-edad-*-service (flag #4: ajuste mínimo,
  no sobre-optimizar sin datos). El soft floor centralizado evita la saturación visual.
