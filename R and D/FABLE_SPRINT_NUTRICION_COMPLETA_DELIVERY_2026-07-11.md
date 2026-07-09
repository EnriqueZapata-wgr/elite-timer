# 🎸 DELIVERY — Sprint NUTRICIÓN completa · pilar overhaul pre-beta

**Fecha:** 2026-07-11
**Owner:** Fable (CCF5)
**Branch:** `feat/nutricion-pilar-completo` (6 commits, desde main con MENTE mergeado)
**Buzón origen:** `FABLE_SPRINT_NUTRICION_COMPLETA_2026-07-10.md`

---

## ⚠️ Scan profundo previo (como pediste) — qué cambió el plan

El scan (agente + lectura directa) confirmó **infra construida pero desconectada**:

1. **El hub YA existía** (`app/nutrition.tsx`, hero de macros + nav cards) → overhaul quirúrgico, NO pantalla nueva.
2. **El score de día tenía DOS implementaciones huérfanas sin caller**: `calculateDailyScore` (nutrition-service, upsert a `daily_nutrition_scores` que solo leía el panel coach) y `nutrition-scoring.ts` (código muerto). → Implementé el algoritmo del spec como camino canónico y lo CABLEÉ; las viejas quedan flaggeadas para limpieza v1.5 (no las toqué).
3. **`macro_mode` (client_profiles) era un precursor del modo simple/completo** → unifiqué: `nutrition_mode` es la verdad, el service sincroniza `macro_mode` (UIs legacy coherentes sin refactor).
4. **No existía ningún target por peso corporal** (proteína default 150g fijo; agua 2500ml) → el score ahora calcula proteína 1.8 g/kg desde `body_measurements`.
5. **Lista de compra IA ya existía** (argos-recipes → `generateShoppingList`) → la nueva `/lista-compra` es la versión DETERMINÍSTICA desde mis recetas; ambas conviven sin duplicar.

---

## 📊 Tabla estándar

| # | Feature | Estado | Clave | Tests |
|---|---------|--------|-------|-------|
| T1 | Hub Nutrición | ✅ Completa | Score card estrella (0-100, semáforo, sub proteína/agua, trend 7d, red flag/highlight) · 3 vías de registro (foto/texto/guardados) · ayuno solo si ACTIVO · card ARGOS chat con screen context · cards visibles según modo. Refactor sobre el hub existente. | (T2/T3) |
| T2 | Modo SIMPLE/COMPLETO (#52) | ✅ Completa | Migración **166 aplicada** (nutrition_mode + backfill desde macro_mode) · unificación con macro_mode (sync bidireccional en escritura) · toggle 'Modo completo' en Settings>Salud con confirmación opt-in · `isFeatureVisible` mapea cards del hub. | +6 |
| T3 | Score funcional (#72) | ✅ Completa | Algoritmo determinístico puro: SIMPLE 40/30/30 (proteína g/kg · hidratación · macros ATP 0-25/50-75/20-35 %kcal) · COMPLETO 25/15/20 + micros 15 (heurística keywords) + timing 10 (ventanas meal-times ±60min) + calidad 15 (scores por comida; sin dato = neutral) · red flags/highlights editoriales · persiste en `daily_nutrition_scores` (upsert) → el panel coach ahora recibe datos reales · trend 7d en hub. | +26 |
| T4 | Suplementos (#54) | ✅ Completa | Migración **167 aplicada** (dose_pattern + notes) · tabs Mis/Catálogo · catálogo curado 14 suplementos × 5 objetivos con evidencia [Nivel N] y precauciones · dosis flexibles (4 patrones) · adherencia semanal medida CONTRA el patrón. | +9 |
| T5 | Recetas (#56 parcial) | ✅ Completa | Migración **168 aplicada** (is_favorite) · corazón + filtro Favoritas en my-recipes · `/lista-compra`: selección de recetas → agregación determinística de ingredientes (suma por unidad, tolera shapes reales del jsonb) + checkboxes + Share. | +13 |
| T6 | Cross-ref ARGOS | ✅ Completa | Insight post-meal OPT-IN (default OFF, toggle en Settings) · fire-and-forget al registrar comida (food-text/food-register) con throttle 20min · card discreta en hub · prompt filosofía ATP sanitizado. | +8 |

**Tests: 1048 → 1110 (+62 · target era +30).** `tsc --noEmit` = 0 errores. Suite completa verde (125 archivos).

---

## ✅ Migraciones aplicadas al remoto (patrón anti-hueco, verificadas)

| # | Nombre | Verificación |
|---|--------|--------------|
| 166 | nutrition_mode | col_ok=1, recorded=1 (+ backfill macro_mode→complete) |
| 167 | supplements_flexible_dose | cols_ok=2, recorded=1 |
| 168 | recipe_favorites | col_ok=1, recorded=1 |

## 📱 Screens tocados (testing Enrique)

1. **`/nutrition`** — score card arriba (registra una comida y agua para verlo moverse), modo simple vs completo cambia las cards.
2. **Settings > Salud** — toggle "Modo completo" (con confirmación) + "Insights de ARGOS al comer".
3. **`/supplements`** — tab Catálogo (agrega Magnesio glicinato), frecuencia en alta manual, "Adherencia esta semana: %".
4. **`/my-recipes`** — corazón de favorito, filtro, botón Lista de compra.
5. **`/lista-compra`** (NUEVO) — selecciona recetas ARGOS guardadas (las manuales sin ingredientes no aplican, hay nota).
6. **food-text / food-register** — con el toggle de insights ON, registra comida y vuelve al hub: card de insight (~5-10s después).

## ✍️ Copy para review (Enrique / Mariana)

1. **Catálogo de suplementos completo** (`supplement-catalog.ts`) — dosis, evidencia [Nivel N] y precauciones. **CLÍNICO-COLINDANTE: Mariana debe revisar antes de beta pública.**
2. **Red flags/highlights del score** (`nutrition-score-core.ts`) — "Carbohidratos fuera del rango ATP (>25%)", "Comida real, poco procesado", etc.
3. **System prompt del insight post-meal** (`argos-nutrition-insights-core.ts`).
4. **Toggle modo completo** — "más data, más ruido…".

## 📝 Decisiones documentadas

- **Fallback de peso 70kg** cuando no hay `body_measurements` (target proteína 126g) — el score invita implícitamente a registrar peso.
- **Micros v1 = heurística por keywords** en descripciones (es-MX). El parser IA no etiqueta micros estructurados aún; cuando lo haga, `microsPresent` ya está tipado para recibirlo.
- **Calidad sin dato = mitad del bloque** (neutral) — no castiga a quien registra por texto simple.
- **Ruta `/supplements` se mantuvo** (el buzón sugería /nutricion/suplementos): protocolos y HOY ya apuntan ahí; churn de rutas sin valor.
- **Insight flag en AsyncStorage** (device-local) — sin migración extra para un opt-in v1; si se quiere sync multi-device, columna en 169+.

## 🚩 Flags (no tocados, fuera de scope)

- `nutrition-service.calculateDailyScore` + `src/utils/nutrition-scoring.ts` = implementaciones muertas del score → candidatas a borrar en cleanup v1.5.
- `food_logs.notes` se usa como JSON improvisado (fiber, quality_score, source) — considerar columnas reales si el score evoluciona.
- `smart-shopping.tsx` sigue placeholder vacío (pilar optimization).
- `food-scan.tsx` no emite `day_changed` al guardar (bug preexistente menor — el hub sí refresca por focus; lo flaggeo, no lo toqué por scope).

---

*Verificación final: tsc 0 errores · vitest 1110/1110 (125 archivos) · migraciones 166/167/168 aplicadas+verificadas · 6 commits en `feat/nutricion-pilar-completo`.*

— Fable (CCF5), 2026-07-11
