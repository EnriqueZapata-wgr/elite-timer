# Anexo D · Nutrición 9→4 y Emociones 6→3

Diseño de detalle producido por agente de arquitectura, 12-ago-2026.

## 1. NUTRICIÓN

### /food-log: la captura unificada

Un solo eje distingue las 3 pantallas de captura: el SENSOR. Todo lo demás ya es común (saveFoodLog → food_logs, FoodReviewEditor con contrato verificado {initialState, onSave, onCancel}, defaultMealTypeByHour, gateo useNutritionMode).

`/food-log?sensor=foto|texto|codigo&mealType=?&intent=comida|etiqueta`

- Barra de tipo de comida persistente (no un paso previo), preseleccionada con getCurrentMeal ?? defaultMealTypeByHour (la lógica buena está escondida hoy en food-register:90-98).
- Selector de sensor (3 chips); cambiar de sensor NO desmonta tipo ni hora.
- Zona "de un toque" siempre visible: frecuentes del tipo adivinado + registros de hoy con swipe-to-delete (lo mejor de food-register, hoy en una ruta que /nutrition se salta).
- Salida única: FoodReviewEditor en COMPLETO, guardado directo en SIMPLE.

Qué conserva de cada una: de food-text el autocompletado local + macros en vivo + IA sobre texto + calcQualityScore + hora editable HH:MM (solo esta la tiene) + clamps anti-NaN. De food-scan la cámara/galería + shrinkBase64ForAI (palanca de costo) + score ring + hambre + reanalyzeFood + "guardar sin analizar" + electrón food_photo + saveMealAsRecipe. De food-barcode el lookup OpenFoodFacts + scalePer100g + visor lazy + captura manual con código + estados not_found/network_error que nunca son callejón.

Reglas duras heredadas: escribir SOLO vía saveFoodLog; source sigue distinguiendo manual_text|scan_photo|scan_text|scan_raw|barcode; wasEdited real; updateFrequentFood tras guardar; maybeGeneratePostMealInsight. Los candados de registro-comida.test.ts son la red de seguridad de la fusión.

### Suplementos: dueño único /supplements

Hoy dos caminos crean fichas en user_supplements. El escaneo (analyzeSupplementPhoto, 10 contextos, dedupe, compliance S4 sin score automático) NO muere: se muda como hoja de captura dentro de /supplements, junto al BhaScanSheet que ya vive ahí. Muere el param mode=supplement de food-scan y las 2 cards del hub.

### /cocina con 3 tabs: dueño único de recetas y lista

Tabs: **Mis recetas** (CRUD + favoritas + "traer de mis registros" + generar con ARGOS incl. advancedMode) · **Lista** (dueña de shopping_list_items; alta manual, receta→lista sin duplicar, comprado/despensa) · **Preferencias** (food-preferences, su único consumidor es el generador).

Se corta el segundo productor ilegítimo: generateShoppingList de argos-recipes (lista en memoria que muere en Share). ARGOS genera receta → user_recipes → sendRecipeToList es LA única puerta receta→lista.

### El hub /nutrition deja de leer datos ajenos

Hallazgo load-bearing: loadData hace 5 lecturas que computeAndSaveDailyScore YA hace por su cuenta. Agua → dato de /hydration, queda solo como insumo del score (tomado de ScoreBreakdown). Ayuno → muere la query. Glucosa → muere la query, la NavCard queda sin dato duro. Resultado: hub con NutritionScoreCard + insight + chat ARGOS + 4 accesos (Registrar · Cocina · Suplementos · Glucosa), cero queries propias más allá del score.

### Redirects nutrición

food-text?mealType=X → /food-log?sensor=texto&mealType=X · food-scan → /food-log?sensor=foto · food-scan?mode=label → /food-log?sensor=foto&intent=etiqueta · food-scan?mode=supplement → /supplements?capture=foto · food-barcode → /food-log?sensor=codigo · food-register → /food-log · my-recipes y argos-recipes → /cocina?tab=recetas · lista-compra → /cocina?tab=lista · food-preferences → /cocina?tab=preferencias.

Callers: nutrition.tsx (7 puntos), fasting.tsx:1393, my-recipes:234, centro/[appKey]:305, _layout.tsx:264-305 (food-text es modal desde abajo: /food-log hereda ese estilo).

## 2. EMOCIONES

### /checkin con exploración como MODO y navegación como PASO

emotion-exploration renderiza el MISMO MoodPlane sin persistir, y su CTA remonta el plano y tira el zoom al hacer push. Fusionar mejora el flujo:

`/checkin?mode=log|explore&emotionId=?&gate=?`

- mode=explore: sin barra de progreso, hint 144 palabras, zoomOut, hoja QUADRANT_FEEL, "seguir explorando", nada se escribe.
- "ES LO QUE SIENTO" hace setMode('log') con la emoción seleccionada y entryGate='mapa': misma cámara, mismo zoom, cero remonte. gate sigue escribiendo el valor legal de la migración 238.
- Pasos: 1 plano → [BodyCheck opcional] → 2 contexto → cierre → **paso 3 navegar** (la sub-máquina frame→map con NAV_ZOOM_FACTOR 2.4, CHAIN_STEP_MS 1200, STAY siempre visible, logNavigationMove, re-check-in de vuelta de herramienta con pendingRecheck).
- Crisis intacta: isCrisisHotline o hasCrisisTrajectory → CrisisSupportBanner; con crisis no hay frase de cierre ni streak ni reframing.

Riesgo único: al volver de /breathing o /meditation el useFocusEffect debe reencontrar el paso 3 vivo. Se resuelve con sub-máquina en ref + borrador en AsyncStorage. Spike de 1 día; si falla, navegación queda como ruta hija (4 rutas en vez de 3: mejor 4 sanas que perder el re-check-in).

### /emotion-history con perfil en tabs

emotion-profile solo se alcanza desde emotion-history:174 (hijo de facto) y ambos llaman loadHistoryData por separado. Tabs: **Mosaico** (default: mosaico, filtros, correlaciones, patrones, eficacia de navegación) · **Perfil** (arquetipo, quadrantMix, top, share, estado insuficiente con barra). UNA llamada a loadHistoryData; Perfil filtra sobre el mismo payload.

/emotions (hub 91L) queda igual con 3 cards: /checkin · /checkin?mode=explore · /emotion-history. Journal, breathing, meditation, mente-* no se tocan.

### Redirects emociones

emotion-exploration → /checkin?mode=explore · emotion-navigation?emotionId=X → /checkin?emotionId=X&step=navegar · emotion-profile → /emotion-history?tab=perfil. Callers: emotions.tsx:61-63, emotion-profile:230, emotion-history:174, checkin:452,475.

## 3. Decisiones abiertas

1. "Etiqueta" como sub-modo de Foto (intent=etiqueta): SÍ, matarlo perdería LABEL_CONTEXT y cleanliness_score.
2. ARGOS puede escribir la lista: SÍ, pero SOLO vía shopping-list-service (bulk add idempotente). Un dueño de tabla, dos entradas de UI.
3. Preferencias como tab de /cocina (su único consumidor es el generador de recetas); deep link desde Ajustes si hace falta.
4. Navegación emocional como paso interno: SÍ, con spike de 1 día sobre pendingRecheck.

## 4. Esfuerzo

- **Nutrición ~3.5 semanas** en 4 PRs (food-log · cocina · supplements · hub+redirects). /food-log es el 70%: 5-6d máquina de 3 sensores, 2d zona de un toque + horarios, 2d paridad de guardado contra registro-comida.test.ts, 2d QA sensor × modo × tema. Limpieza del hub: 0.5d y es la más rentable (mata 4 queries redundantes).
- **Emociones ~1.5-2 semanas** en 3 PRs. Empezar por Historia+Perfil (1.5d, bajo riesgo, valida el patrón de tabs), luego exploración como modo (2d), luego navegación como paso (3-4d, ahí vive todo el riesgo).
