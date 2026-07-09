# 🎸 FABLE SPRINT — NUTRICIÓN completa · pilar overhaul pre-beta

**Fecha:** 2026-07-10 (post-MENTE, viernes tarde arranca)
**Estimado:** 11-15h · sprint grande + T2 posiblemente overnight
**Deadline hard:** sábado 2026-07-11 noche (beta a testers prime)
**Owner:** Fable (CCF5)
**Contexto:** Enrique aprobó "todo nutrición" post-MENTE. Objetivo: convertir NUTRICIÓN de "features distribuidas" en pilar completo que testers wellness perciban como "app terminada + inteligente + adaptable".

---

## 🎯 Filosofía del sprint

Los testers son **nutriólogas y coaches wellness**. Miran nutrición con ojo profesional. Verán:

1. Si el score es real o placebo
2. Si el modo simple sirve para clientes casuales
3. Si el modo completo tiene la profundidad para expertos
4. Si las recetas y suplementos se sienten pensados

Este sprint responde a esas 4 preguntas.

**Filosofía UX:** [[feedback_guiado_no_prisionero]] — SIMPLE default (score + proteína), COMPLETO opt-in. Nadie forzado. [[feedback_simple_vence_inteligente]].

**Filosofía nutricional:** [[reference_nutricion_atp]] — macros ATP (carbos 0-25%, grasas 50-75%, proteína 20-35%), grasas saturadas animales = saludables, trans = veneno.

---

## 📖 Estado actual verificado

**Existente (backend fuerte, frontend disperso):**
- Screens: food-scan, food-text, food-register, my-recipes, food-preferences, argos-recipes ✅
- Services: nutrition-service, meal-times-service, frequent-foods-service, recipe-context-service, supplements-service ✅
- Migraciones: 007 (supplement_protocols), 027 (nutrition_plans, food_logs, hydration_logs, fasting_logs, recipes, daily_nutrition_scores), 044 (food_preferences), 046 (user_frequent_foods), 054 (user_recipes), 055 (user_supplements, supplement_logs) ✅

**Gaps a cerrar (feedback Enrique + análisis):**
- Screen Hub Nutrición (no existe pantalla que junte todo)
- Modo SIMPLE vs COMPLETO (#52 pending)
- Score nutricional funcional — algoritmo real (#72 pending)
- Suplementos refactor con dosis flexibles + adherencia (#54 pending)
- Recetas: favoritos + lista compra (partes de #56)
- Cross-referencing consistente con ARGOS

---

## 🔨 Deliverables (6 tasks)

### T1 — Screen Hub Nutrición (2-3h)

Nuevo archivo `app/nutricion.tsx` (accesible desde Mi ATP).

**Estructura visual (6 cards editoriales B/N):**

1. **Card SCORE DEL DÍA** (destacada, arriba)
   - Score nutricional (0-100) grande centrado
   - Sub: "proteína X/Ymg · agua X/Y · macros balance"
   - Color según score: <50 rojo tenue, 50-70 gris, 70+ lima

2. **Card REGISTRAR COMIDA** (compact horizontal)
   - "Registrar comida" con 3 CTA: foto | texto | plato guardado
   - Tap → `/food-scan` o `/food-text` o `/food-register`

3. **Card RECETAS**
   - Imagen editorial B/N
   - Título: "Mis recetas"
   - Sub: "N guardadas · X favoritas"
   - Tap → `/my-recipes`

4. **Card SUPLEMENTOS**
   - Imagen editorial B/N
   - Título: "Suplementos"
   - Sub: "N activos · adherencia XX% esta semana"
   - Tap → `/nutricion/suplementos`

5. **Card AYUNO** (si está activo)
   - Timer visual del ayuno en curso o "próximo ayuno"
   - Sub: "IF 16:8 activo" o similar
   - Tap → detalle ayuno existente

6. **Card ARGOS NUTRICIONAL** (compact)
   - "Hablar con ARGOS sobre nutrición"
   - Tap → abre chat ARGOS con contexto nutrición pre-cargado

**Modo SIMPLE (default):**
- Solo cards 1, 2, 5 visibles
- Sin card recetas ni suplementos (opt-in)
- Feel minimalista

**Modo COMPLETO (opt-in):**
- Las 6 cards visibles
- Feel denso, profesional

**Archivos:**
- `app/nutricion.tsx` (nuevo)
- `src/components/nutricion/NutritionScoreCard.tsx` (nuevo)
- `src/components/nutricion/HubCards.tsx` (nuevo)
- Actualizar `app/kit.tsx` para agregar link a Nutrición

### T2 — Modo SIMPLE vs COMPLETO (#52) (2-3h)

**Nueva columna en `client_profiles`:**
```sql
-- Migración 166_nutrition_mode.sql
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS nutrition_mode TEXT
  DEFAULT 'simple' CHECK (nutrition_mode IN ('simple', 'complete'));
```

**UX Settings:**
- Nuevo item en Settings > Salud > Nutrición
- Toggle "Modo completo" (default off = simple)
- Descripción: "Modo simple: solo score y proteína. Modo completo: todo el detalle de macros, micros, timing."
- Al activar completo: modal "¿seguro? más data, más ruido. Puedes volver cuando quieras."

**Impacto en pantallas:**
- Hub Nutrición cambia cards visibles según modo (T1)
- Score card en HOY muestra "modo simple" texto pequeño si aplica
- Food register captura solo cantidad + tipo básico en SIMPLE; en COMPLETO ofrece agregar timing, mood, contexto

**Cross-reference:**
- El toggle también afecta `daily_nutrition_scores` — en modo simple, el score es simplificado (solo balance macros + hidratación); en modo completo incluye micros, timing, calidad.

**Archivos:**
- Migración 166 (aplicar via MCP)
- `src/services/nutrition-mode-service.ts` (nuevo)
- Actualizar `src/services/nutrition-service.ts` para respetar modo
- `app/settings/salud/nutricion.tsx` (nuevo o extender existente)
- Tests: +6

### T3 — Score nutricional funcional (#72) (2-3h)

Actualmente el score está en tabla `daily_nutrition_scores` pero es placeholder. Este task lo hace FUNCIONAL.

**Algoritmo del score (100 puntos totales):**

En modo SIMPLE (usar cuando `nutrition_mode='simple'`):
- **Proteína** (40 pts): target por peso corporal (1.6-2.2g/kg) — hit 100%, fail 0%
- **Hidratación** (30 pts): target según peso + actividad (30ml/kg base) — hit 100%
- **Balance macros** (30 pts): dentro de rangos ATP — carbos 0-25%, grasas 50-75%, proteína 20-35% (ver [[reference_nutricion_atp]])

En modo COMPLETO (usar cuando `nutrition_mode='complete'`):
- **Proteína** (25 pts): idem
- **Hidratación** (15 pts): idem
- **Balance macros** (20 pts): idem
- **Micros clave** (15 pts): vitamina D, B12, magnesio, zinc según food_logs
- **Timing** (10 pts): comidas dentro de ventanas de ayuno
- **Calidad alimentos** (15 pts): whole foods vs procesados detectado por parser

**Implementación:**
- Cliente calcula el score al final del día (nightly cron o al leer HOY)
- Guarda en `daily_nutrition_scores.score` (0-100)
- Componente muestra score con visualización (dial, barra, número grande)
- Trends de 7 días visible en Hub Nutrición

**Feedback loop:**
- Si score < 50 tres días seguidos → sugerencia proactiva de ARGOS
- Si score = 100 día 7 → celebración cross-app

**Archivos:**
- `src/services/nutrition-score-service.ts` (nuevo con algoritmo)
- `src/services/nutrition-score-core.ts` (lógica pura testeable)
- Actualizar `nutrition-service.ts` para llamar score al final del día
- Tests: +10 (algoritmo por modo, targets por peso, balance macros)

### T4 — Suplementos refactor (#54) (2h)

Estado actual: `user_supplements` (055) tabla existe pero UI genérica.

**Nueva estructura:**
- **Mi biblioteca** de suplementos personal (los que uso)
- **Catálogo** ATP con protocolo recomendaciones (leer `supplement_protocols` 007)
- **Dosis flexibles** — no solo "500mg" sino "500mg 2× al día" o "500mg lun/mié/vie"
- **Adherencia** — trackear si tomé o no cada día

**UX:**
- Screen `/nutricion/suplementos`
- Tab "Mis suplementos" (default): lista con checkbox de "tomado hoy"
- Tab "Catálogo": browse por objetivo (dormir mejor, más energía, etc.) → protocolos ATP
- Tap suplemento → detalle con dosis, timing, evidencia científica breve, beneficios esperados

**Migración 167:**
```sql
-- 167_supplements_flexible_dose.sql
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS dose_pattern TEXT;
-- ej: "1× diario", "2× diario", "lun/mie/vie", "semanal"
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS notes TEXT;
```

**Archivos:**
- Migración 167 (aplicar via MCP)
- `app/nutricion/suplementos.tsx` (nuevo o extender)
- `src/services/supplements-adherence-service.ts` (nuevo)
- `src/constants/supplement-catalog.ts` (curated recommendations)
- Tests: +6

### T5 — Recetas polish (parcial #56) (2h)

**Scope reducido para pre-beta:**
- Favoritos: toggle "❤️" en `user_recipes`
- Vista "Favoritas" filter en `my-recipes`
- Lista de compra BÁSICA: seleccionar recetas de la semana → generar lista de ingredientes agregados

**NO scope:** marketplace público, sharing, ratings (post-beta).

**Migración 168 solo si necesario:**
```sql
-- 168_recipe_favorites.sql
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
```

**Archivos:**
- Migración 168 (si necesario)
- Actualizar `app/my-recipes.tsx` para tab favoritos
- `app/nutricion/lista-compra.tsx` (nuevo)
- `src/services/shopping-list-service.ts` (nuevo)
- Tests: +4

### T6 — Cross-referencing con ARGOS (1-2h)

ARGOS ya conoce nutrición via recipe-context-service. Este task lo hace visible:

- En Hub Nutrición: card ARGOS con contexto pre-cargado
- Screen context: al entrar a food-register, ARGOS floating detecta y sugiere "¿Necesitas ideas?"
- Post-meal insight: cuando el user registra comida, ARGOS (opt-in) puede dar insight breve ("Buena proteína hoy. Podrías agregar vegetales fibrosos.")

**Feature flag:** `argos_nutrition_insights` default off (opt-in en Settings) para no ser invasivo.

**Archivos:**
- Actualizar `argos-service.ts` para incluir nutrition context
- Post-meal insight component
- Settings toggle
- Tests: +4

---

## 🧪 Tests requeridos (+30 mínimo)

Baseline post-MENTE: ~1020. Target: ~1050.

- Score algoritmo: modo simple + completo + edge cases
- Suplementos adherencia
- Shopping list generation
- Nutrition mode toggle

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **Migraciones 166/167/168 idempotentes** — `IF NOT EXISTS`
3. **Aplicar migraciones al remoto tú mismo** via MCP + INSERT schema_migrations (anti-hueco)
4. **DeviceEventEmitter.emit('day_changed')** después de food/hydration (regla #6)
5. **`getLocalToday()` / `parseLocalDate()`** para date queries (regla #3)
6. **npx tsc --noEmit → 0 errores** antes de push
7. **6 commits granulares** — uno por task
8. **Estética editorial ATP** — B/N + acento lima
9. **Filosofía Mariana** — nutrición funcional, macros ATP, no bloqueadores químicos como default

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Marketplace público de recetas (post-beta)
- ❌ CGM integration (post-beta, #80)
- ❌ Score con IA/LLM (algoritmo determinístico ahora)
- ❌ Meal planning semanal completo (post-beta)
- ❌ Costeo de recetas (post-beta)

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_NUTRICION_COMPLETA_DELIVERY_2026-07-11.md`:

Tabla estándar + branch + migraciones aplicadas + screens tocados + copy Enrique review.

Branch sugerido: `feat/nutricion-pilar-completo`

---

## 🤝 Contexto colaborativo

- MENTE Ecosystem debe estar mergeado a main antes de arrancar este sprint (dependencia UI de "Mi ATP" hub)
- Enrique disponible para decisiones de copy / algoritmo si tienes dudas
- Cowork paralelo en Sprint ONBOARDING épico prep + beta launch runbook
- NO tocar componentes ARGOS ni MENTE (solo cross-referencing)

## 💛 Nota estratégica

Este pilar decide si nutriólogas testers se ven como usuarias legítimas o "no es para mi perfil". Score real + modo dual + suplementos serios = "sí es para mi". Score placebo + solo modo básico = "cool pero no para clínica".

Fable, la ambición es alta. Corre con criterio.

— Cowork
