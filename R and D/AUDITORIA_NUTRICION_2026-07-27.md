# 🔍 AUDITORÍA PILAR NUTRICIÓN — 2026-07-27 (MB-8 · Track 0)

**Método:** lectura completa de las 9 pantallas + servicios del pilar, cruzados contra el **esquema real del remoto** (information_schema vía MCP, verificado hoy). Criterio de fantasmas = MB-6 (`supabase-js` no lanza en 4xx; el error viene en `{ error }`).

**Superficie auditada:** `food-scan` (1608 ln) · `fasting` (1343) · `food-text` (949) · `supplements` (823, MB-2 la retrabajó — auditada solo a nivel query) · `food-register` (523) · `nutrition` hub (480) · `my-recipes` (355) · `argos-recipes` (316) · `food-preferences` (177). Servicios: `nutrition-service`, `nutrition-score-service/core`, `nutrition-mode-core`, `fasting-service`, `hydration-service`, `meal-times-service`, `frequent-foods-service`, `argos-nutrition-insights`, `FoodReviewEditor`.

---

## 1 · MAPA DE CAMINOS DE REGISTRO

**¿Cuántas formas hay de registrar una comida? SEIS entradas, CUATRO escrituras divergentes a `food_logs`.**

### Entradas (cómo llega el usuario)
| # | Entrada | Ruta | Qué hace |
|---|---|---|---|
| 1 | Hub → "Foto" | `/food-scan` (mode food) | Cámara/galería → IA → resultado → `FoodReviewEditor` → guarda |
| 2 | `/food-scan` barra de texto | misma pantalla | Texto → **misma IA que food-text** → mismo camino que #1 |
| 3 | Hub → "Texto" | `/food-text` | Búsqueda en DB local de alimentos + gramajes manuales; sin resultado → "Estimar con IA" → `FoodReviewEditor` → guarda |
| 4 | Hub → "Guardados" | `/food-register` | Selector de tipo de comida → frecuentes de 1 toque, o rebota a #1/#3 |
| 5 | `/my-recipes` | toque en receta | Inserta el log directo desde la receta |
| 6 | HOY (4 call sites: day-compiler, hero-recommendation, score-coaching, HoyEditorialSection) | `/food-register` | Entra por #4 |

### Diagnóstico
- **La sospecha del brief se confirma a medias.** No son "tres productos distintos": la revisión ya converge en `FoodReviewEditor` (compartido) y `food-register` es un selector, no un tercer flujo. **Pero el camino IA-por-texto está DUPLICADO** (#2 dentro de food-scan y #3 dentro de food-text llaman al mismo `analyzeFoodText`), y lo que sí está partido en 4 es **el guardado**:

| Quién guarda | Cómo escribe `food_logs` |
|---|---|
| `food-scan` → `logFood()` (nutrition-service) | `ai_analysis` jsonb con `was_edited`/`input_type` ADENTRO del JSON |
| `food-text` → insert propio | `notes` = JSON string `{fiber_g, quality_score, source:'manual_text', was_edited}` |
| `food-register` frecuentes → insert propio | `notes` = JSON string `{source:'frequent', items}` — **sin chequear error** |
| `my-recipes` → insert propio | `notes` = JSON string `{source:'recipe', recipe_id}` — **sin chequear error** |

- **`food_logs` TIENE columnas reales `source` (default 'manual') y `was_edited` (default false)** — y NINGÚN camino las escribe. Todo registro dice `source='manual'` en la columna real mientras la verdad vive regada entre `notes` (JSON improvisado sobre una columna text) y `ai_analysis`.
- **Ningún camino es legacy retirable**: `food-register` tiene 5 rutas entrantes (4 desde HOY), `food-text` es la única puerta al builder manual con DB local, `food-scan` es la única puerta de foto. La consolidación correcta no es matar pantallas: es **unificar el guardado en un solo servicio** (`saveFoodLog`) que escriba `source`/`was_edited` en las columnas reales y un `notes` con forma única. → **Track A.**
- Menor: `food-scan` tiene su propio mini-editor de ingredientes en el paso resultado (agregar/quitar/recalcular) ADEMÁS del `FoodReviewEditor` al guardar — dos editores en serie en el mismo flujo.

---

## 2 · FANTASMAS DE ESQUEMA (método MB-6)

Esquema real verificado hoy contra remoto. Tablas del pilar que existen: `food_logs`, `fasting_logs`, `hydration_logs`, `glucose_logs`, `user_frequent_foods`, `daily_nutrition_scores`, `food_preferences`, `user_recipes`, `recipes`, `user_supplements`, `supplement_logs`, `nutrition_plans`, `user_day_preferences`, `body_measurements`, `client_profiles` (con `meal_times`, `timezone`, `nutrition_mode`, `macro_mode`). **`food_logs.quality_score` NO existe** (fantasma conocido de MB-6 — no encontré código nuevo leyéndola como columna; vive en `notes.quality_score` / `ai_analysis.score`, correcto).

### 👻 Confirmados (error silencioso hoy)
| # | Dónde | Bug | Efecto |
|---|---|---|---|
| G1 | `food-register.tsx` `addFrequentQuick` | `insert` a food_logs **sin chequear `{error}`**; el try/catch no atrapa 4xx | Falla el insert → **igual muestra "Registrado ✓"**, emite `day_changed`, trackea analytics y suma `times_used`. Registro fantasma que nunca existió |
| G2 | `food-register.tsx` `handleDeleteLog` | `delete` sin chequear error | Falla el delete → la UI refresca y el registro "reaparece" sin explicación |
| G3 | `my-recipes.tsx` `useRecipe` | `insert` a food_logs sin chequear error | Igual que G1: "Registrado" aunque no se guardó |
| G4 | `my-recipes.tsx` `createRecipe` / `deleteRecipe` | insert/delete sin chequear error | "Guardado" fantasma; delete que no borra |
| G5 | `food-preferences.tsx` `handleSave` | `upsert` sin chequear error (try/catch inútil en 4xx) | **"Guardado ✓" aunque el upsert falló** |
| G6 | `nutrition.tsx` hub `loadData` | Ninguna de las 4 queries chequea `.error`; catch global silencioso | Un 400 de esquema se pinta como **día en ceros** — indistinguible de "sin registros". Exactamente el patrón que MB-6 mandó matar |
| G7 | `food-register.tsx` carga de `todayLogs` / frecuentes | `.then(({data}) => ...)` sin mirar error (frecuentes sí lo mira) | Día en ceros silencioso |
| G8 | `fasting.tsx` `persistFastingGoal` | upsert a `user_day_preferences` sin chequear error | Goal de ayuno que "se guardó" pero no — al reabrir vuelve el viejo |

### 🧟 Código muerto / deuda que confunde
| # | Dónde | Qué |
|---|---|---|
| M1 | `nutrition-service.calculateDailyScore` | Implementación VIEJA del score, ya documentada como huérfana (delivery 2026-07-11) y **sigue viva 2 sprints después**. Lee `ai_analysis.estimated_calories` (formato viejo de prompt) y hace `fasting_logs .single()` que revienta con >1 fila/día. Sin callers → **retirar** |
| M2 | `nutrition-service.getActivePlan` / `getHydrationForUser` | `.single()` con 0 filas = error PGRST116 ignorado; funcionan de churro porque `data` es null. `.maybeSingle()` es lo correcto |
| M3 | `food-text.tsx` `isFreeTextOnly` + estilos `freeTextWarning` | Variable calculada y estilos que ya no se renderizan |
| M4 | Columnas reales `food_logs.source` / `was_edited` | Existen desde migración, nadie las escribe (ver §1) — hoy **mienten** (`'manual'`/`false` para todo) |

### ✅ Lo que ya está sano (no tocar)
- `fasting-service`: TODAS las mutaciones verifican filas (`.select()` + no_rows) — el estándar post-"Paty atrapada 90h".
- `nutrition-score-service`: chequea `foodRes.error`/`waterRes.error` y loguea (patrón MB-6 aplicado).
- `food-text`/`food-scan` guardado: chequean error y lanzan → catch → copy genérico + log (MB-SEC-1 §6).
- `hydration-service.addWater`: chequea error en las 2 ramas.

---

## 3 · EDITORIAL GRADIENTE vs LIME BRUTALIST

Vara: `docs/DESIGN_SYSTEM.md` (superficies heroicas = degradados; lime solo micro-acentos; cards = `ELEVATION[1]` #121212; kit nuevo).

| Pantalla | Estado | Detalle |
|---|---|---|
| `nutrition.tsx` hub | 🟡 A medias | GradientCard + PILLAR_GRADIENTS bien; pero `registerBtn` planos, colores inline (`#38bdf8`, `#a8e02a`), card ARGOS recetas con estilo inline completo |
| `food-register` | 🔴 Brutalist | CTA `actionBtn` **lime sólido plano** (superficie heroica prohibida), `#0a0a0a`/`#1a1a1a` hardcoded, modal ELEVATION incorrecta |
| `food-text` | 🟡 A medias | Usa SURFACES/tokens (aliases viejos), CTA azul sólido plano, `#0a0a0a`/`#1a1a1a` inline en ingredientes |
| `food-scan` | 🟢 Casi | La más pulida (glass, springs, anillo). Deuda menor de tokens |
| `fasting` | 🔴 Brutalist + contención | `Text` crudo (ni EliteText), TODO hardcoded, **INICIAR AYUNO lime sólido gigante**, ROMPER AYUNO lime sólido, 8 colores de protocolo inventados fuera de paleta. Y el problema real es de contención (30 presionables) — ver Track F |
| `my-recipes` | 🔴 Brutalist | Ámbar `#fbbf24` como color estrella (fuera de doctrina 3 colores), saveBtn ámbar sólido, filterPill lime sólido |
| `argos-recipes` | 🔴 Brutalist | `Text` crudo, GENERAR RECETA lime sólido, todo inline |
| `food-preferences` | 🟡 | Chips lime sólido activo (aceptable como micro-acento), saveBtn **azul sólido** plano |
| `supplements` | 🟢 | MB-2 reciente — no re-auditada a fondo |

**Antipatrón de opacidad apilada (el de Fitness):** `food-text` saveBtn usa `opacity: 0.4` sobre azul sólido para disabled; `my-recipes` saveBtn `opacity 0.4`; `food-scan` CTA `opacity 0.3`; `food-preferences` `opacity 0.5`. El botón "apagado como con algo encima". → Track E.

---

## 4 · ESTADOS VACÍOS (lo primero que ve un usuario nuevo)

| Pantalla | Hoy | Veredicto |
|---|---|---|
| Hub | Score card: "Registra tu primera comida para activarlo" ✅; pero el hero RESUMEN solo existe en modo completo | OK el score; el resto no acusa pero tampoco invita |
| `fasting` IDLE | **Anillo muerto "0:00" punteado** + selector de protocolo | 🔴 Exactamente el anti-patrón que F.3 manda matar. Sin "tiempo desde tu último ayuno" |
| `fasting` historial | "Aún no tienes ayunos completados" + icono | 🟡 Informa pero no invita |
| `food-text` | Barra de búsqueda con autofocus | 🟡 Aceptable (es una herramienta), sin ejemplo de qué escribir |
| `food-register` | Selector de comidas siempre visible; sin logs no hay sección | 🟢 Funciona |
| `my-recipes` | "Sin recetas guardadas" + hint de crear | 🟢 |
| `argos-recipes` | Menú directo | 🟢 |
| `glucose` nav card | "Registrar medición" | 🟢 |

---

## 5 · COPY vs REGLAS (Track E.3 + doctrina Track D)

| # | Dónde | Problema |
|---|---|---|
| C1 | `food-text` MEAL_TYPES | **"Almuerzo"** — es-MX es "Comida" (food-scan y food-register sí dicen Comida). Inconsistencia entre las 3 puertas |
| C2 | `food-scan` HUNGER_OPTIONS | "Sin hambre" con emoji 🤢 (nauseado) — no significa "sin hambre" |
| C3 | `fasting` protocolos | "Warrior" sin explicar; "OMAD" = sigla sin presentar (regla: toda sigla se explica la primera vez) |
| C4 | `fasting` hito 24h | "cetosis", "glucógeno", "autofagia" se presentan bien (con glosa) ✅ — mantener ese estándar |
| C5 | Hub HelpButton | "ARGOS estima los macros" — "macros" sin presentar la primera vez en el tip 1 (menor) |
| C6 | `my-recipes` placeholder | "Ej: Bullet Proof Coffee" — anglicismo de marca; mejor ejemplo local |
| C7 | Teclados | `food-register` editor de horarios: TextInput de hora **sin `keyboardType`** (teclado alfabético para teclear "07:30"). `my-recipes`/`food-text` sí usan number-pad ✅ |

### ⚔️ Doctrina ATP (Track D) — cruce
| # | Regla | Estado |
|---|---|---|
| D1 | Macros ATP (carbos 0-25 · grasas 50-75 · proteína 20-35) | ✅ `ATP_MACRO_RANGES` en `nutrition-score-core` es la fuente y el score los usa. No encontré targets convencionales en el pilar |
| D2 | Romper ayuno: proteína primero | 🔴 **No existe.** `breakFast` acepta `brokeFastWith` y la columna existe… y la UI jamás la manda ni guía nada. Romper ayuno es un Alert genérico |
| D3 | AHA/USDA/Harvard/ADA como autoridad | ✅ Cero menciones en el pilar (grep en app/ + src/) |
| D4 | Aceites vegetales industriales | ✅ El scanner los trata como NEGATIVE_TAGS (`aceite_industrial`, `grasas_trans`) — alineado |
| D5 | Marco comida-limpia-céntrica | 🟡 `food-text.calcQualityScore`: base 60, castiga procesados ✅, pero **+20 pts por >30g proteína** — sesgo proteíno-céntrico en un score de "calidad". Menor pero es exactamente el marco que el brief marca como bug. → Track B lo reequilibra hacia limpieza |
| D6 | Plantas tradicionales sí / extractos por BHA | ✅ El scan de suplemento va por `addSupplementToPlan` (BHA); comida por food_logs. Separación correcta |
| D7 | **FLAG para Enrique** | El prompt de IA (`buildFoodPrompt`) dice "¿Proteína suficiente (>25g ideal)?" como primer criterio de FILOSOFÍA y el score IA 90-100 pondera fuerte la proteína. No lo toco sin ustedes: es el prompt que estima todos los scores del pilar. Propuesta: reordenar el criterio a limpieza→flexibilidad→proteína en un sprint con re-validación de outputs |

### Ayuno (contexto Track F)
- `FASTING_ZONES` (8 fases con ventanas horarias) ya existe en `fasting.tsx` — **es la semilla de F.1**, pero las ventanas son heredadas (nadie las validó). Se parametrizan en un solo lugar, marcadas PROVISIONAL, y **Enrique define las definitivas**.
- Conteo de superficies presionables en `fasting.tsx` hoy: **~30 entre los 3 estados** (IDLE 13 con lista de protocolos expandida · ACTIVO 6 · HISTORIAL 8+ + modal de ayuno pasado 5). Zero: 4, 1 primario. → Track F.0.
- La lógica (fasting-service, gates de compliance, hitos, auto-close 120h) está **sana y endurecida** — el problema es 100% la capa de presentación/contención. El rediseño F no toca el servicio.

---

## 6 · PRIORIZACIÓN PROPUESTA (para lo que no alcance esta noche)

1. **G1-G8** (fantasmas silenciosos) — pérdida de datos percibida, registro diario de Enrique.
2. **Track F.0** (contención ayuno) — es la pantalla que el brief marca como corazón.
3. **Track A** (guardado unificado + columnas reales `source`/`was_edited`).
4. **F.1-F.4** (fase metabólica, edición inline, vacío que informa, tira semanal).
5. **Track E** (barrida visual + copy).
6. **M1-M3** (código muerto) — cero riesgo, alto valor de higiene.
7. **D7** (prompt IA) — requiere decisión de Enrique/Mariana, NO se toca esta noche.

---

## ANEXO · Barrido mecánico exhaustivo de queries (complemento a §2)

Se corrió un barrido query-por-query de TODO código que toca las tablas del pilar (pantallas + servicios + consumidores cruzados). Confirmó G1-G8 y M1-M4 y agregó:

### 👻 Adicionales confirmados
| # | Dónde | Bug | Estado |
|---|---|---|---|
| G9 | `supplements.tsx` (¡MB-2 la retrabajó y esto quedó!) | **6 writes sin chequear error**: toggle de toma (delete/upsert), alta, edición y baja de ficha. Alta de suplemento podía fallar y cerrar el form como si hubiera guardado; el check optimista quedaba tachado en UI y vivo en DB | ✅ **Corregido en Track B** (con revert del optimista en toggles) |
| G10 | `supplements.tsx` `loadAll` | 3 queries de carga sin chequear error → "plan vacío / 0% adherencia" silencioso | ✅ Corregido |
| G11 | `glucose-log.tsx` | Cargas de historial (inicial + refresh) sin chequear error | ✅ Corregido |
| G12 | `hydration.tsx` `loadData` | Error de lectura → 0 ml silencioso | ✅ Corregido |
| G13 | `meal-times-service` | `.single()` con 0 filas → PGRST116 espurio (salvado por catch, pero ruido + defaults) | ✅ `maybeSingle` |
| G14 | `nutrition-service.calculateDailyScore` | `fasting_logs .single()` fallaba con ≥2 ayunos/día O 0 filas → ayuno "inexistente" | ✅ Resuelto por retiro (M1) |

### 🚩 FUERA del pilar — flaggeados, NO tocados esta noche (decisión de alcance)
| Dónde | Qué | Por qué no se tocó |
|---|---|---|
| `app/(tabs)/index.tsx` (HOY) | Toggles de suplemento (delete :836, upsert :845) y cargas sin chequear error | Es pantalla de HOY, no del pilar; mismo patrón que G9 — candidato al próximo run de HOY |
| `reports-service.ts` | 5 reportes con `catch { return empty }` sin log y selects sin check → un 400 pinta reportes en ceros | Servicio transversal de reportes; arreglo mecánico pero ancho (5 funciones × N queries) |
| `weekly-insight-service.ts` | `pillarNutritionPct`/`pillarSupplementsPct`/`pillarHydrationPct` → `catch { return 0 }` sin log | Transversal (insight semanal) |
| `daily-review-service.ts` | `fetchProteinByDay`/`fetchGlucoseToday`/`fetchMealsToday` → catch a `{}` / `0` sin log | Transversal |
| `argos-service.ts` | Bloques de contexto (comida/glucosa/ayuno/suplementos) con `catch (_) {}` sin log → ARGOS con contexto incompleto en silencio | Es el chat; tocarlo de noche sin device test es más riesgo que valor |
| `day-compiler.ts` :181-199 | Selects de food/hydration/fasting/glucose/supplement sin check | Compilador de HOY — mismo run de HOY |
| `starter-recipes.ts` seed | Spread `...r` contra `recipes` (frágil ante drift de esquema) | Herramienta admin, bajo riesgo |

### ✅ Estado final del pilar tras Track B
Todos los fantasmas G1-G14 del pilar quedaron cerrados. Los transversales de la tabla anterior quedan **abiertos y priorizados para el run de HOY/reportes**.
