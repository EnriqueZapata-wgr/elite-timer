# 🌙 DELIVERY · MB-8 — Pilar NUTRICIÓN (overnight 2026-07-27)

**Rama:** `feat/mb8-nutricion` (desde main con MB-7). **7 commits, uno por track, en orden.** `npx tsc --noEmit` = 0 · 2236 tests verdes (216 files) · eslint 0 errores (cayeron además los 3 preexistentes). **NO mergeado, versión intacta, sin db push, sin migraciones** (no hicieron falta: todo el esquema que el pilar necesita ya existía — incluidas `food_logs.source`/`was_edited`, que existían y nadie usaba).

| Commit | Track |
|---|---|
| `37617bd` | 0 · Auditoría (`R and D/AUDITORIA_NUTRICION_2026-07-27.md`) |
| `1e18682` | A · Guardado único (`food-log-service`) |
| `eb4283b` | B · Fantasmas G1-G14 + anexo de barrido |
| `f633019` | C · SIMPLE guarda de un toque |
| `5061ca9` | D · Romper ayuno = proteína primero |
| `2b62aa0` | E · Hub navegable + opacidad + copy |
| `1554ae9` | F · Ayuno estilo Zero (contención 30→8) |

---

## 🚪 Caminos de registro: cuántos había y con cuáles me quedé

**Había 6 entradas y 4 escrituras divergentes.** Me quedé con **las 3 puertas** (foto / texto / guardados — ninguna era legacy retirable: `food-register` tiene 4 rutas entrantes desde HOY, `food-text` es la única puerta al builder manual, `food-scan` la única de foto) y **UNA sola escritura**: `src/services/food-log-service.ts`. Los 4 caminos (scan, texto, frecuentes, recetas) convergen ahí; `source` y `was_edited` van a sus columnas reales y `notes` quedó con una sola forma `{fiber_g?, quality_score?, items?, recipe_id?}` — compatible con los lectores existentes (score service). **Cero pérdida de datos: sin migración, solo escritura nueva; lo viejo se sigue leyendo igual.** La revisión ya convergía en `FoodReviewEditor` (quedó como el paso único de ajuste). Duplicación restante flaggeada: el paso resultado de food-scan trae su propio mini-editor de ingredientes ADEMÁS del editor de revisión (dos editores en serie; no lo toqué — quitar `reanalyzeFood` es decisión de producto).

## 👻 Fantasmas: encontrados 14 en el pilar — TODOS cerrados; transversales abiertos

- **Cerrados (G1-G14):** "Registrado ✓" en falso en frecuentes y recetas; "Guardado ✓" en falso en preferencias; borrados no verificados; hub que pintaba un 400 como día en ceros; goal de ayuno que no persistía; **6 writes de `supplements.tsx` sin chequear error (sobrevivieron a MB-2)** — ahora con revert del optimista; `.single()` frágiles → `maybeSingle` (plan, hidratación, meal_times); y se retiró `calculateDailyScore` (huérfana flaggeada desde julio 11, con el `.single()` que fallaba con ≥2 ayunos/día).
- **Abiertos (fuera del pilar, flaggeados en el anexo de la auditoría):** los toggles de suplemento de HOY (`app/(tabs)/index.tsx`), `reports-service` / `weekly-insight-service` / `daily-review-service` (catch→ceros sin log) y los bloques de contexto de `argos-service`. Son el material natural del run de HOY/reportes.

## ⚔️ Qué choca con la doctrina y TE NECESITA (no lo resolví solo)

1. **D7 · El prompt de IA de comida (`buildFoodPrompt`, nutrition-service) es proteíno-primero:** "¿Proteína suficiente (>25g ideal)?" encabeza la FILOSOFÍA y el score IA pondera fuerte proteína. Es el prompt que califica TODAS las comidas del pilar. Propongo reordenarlo a limpieza→flexibilidad→proteína en un sprint con re-validación de outputs (no de noche). *Lo que sí ajusté:* el `quality_score` local del registro manual ahora lo manda la limpieza (procesados) con bono proteico chico — revisable en el commit B.
2. **F.1 · Ventanas de las fases metabólicas = PROVISIONALES.** Viven en `src/constants/fasting-phases.ts` (un solo archivo, 8 fases con narrativa "qué pasa ahora"). Heredé las ventanas que ya traía la app (4/8/12/16/24/36/48 h) — **tú las cierras contra tu protocolo**; cambiar horas/copy = editar solo ese archivo.
3. **E.2 · Interpretación del "cero datos duros" en el hub:** quité RESUMEN DEL DÍA (duplicaba el registro), el valor de glucosa y las horas de ayuno de las nav cards; **el score card LO DEJÉ** — es la síntesis de coaching de MB-1.5, no un dato crudo. Si lo quieres fuera también, es un borrado de 10 líneas.
4. **F.2 · Cambio de meta con ayuno activo pasa por el mismo gate de seguridad** que iniciar (subir a >48h a media marcha pide la atestación §2.4). Verifica que ese flujo te guste en device.

## ⏳ Ayuno (Track F): la cuenta antes y después

**Antes: ~30 superficies presionables** (selector + 8 protocolos expandidos + checklist de zonas + preview de zonas + 2 flujos de picker + recientes). **Después: 7 en reposo / 8 en activo, 1 primario por estado** (Zero: 4/1 — la diferencia son historial, cancelar-destructivo y la pastilla de fase, que es la joya, no ruido). Anillo y botón no se mueven entre estados; TERMINAR ya no confirma con diálogo (aterriza en el cierre guiado de proteína); número héroe 44pt; INICIO/META editables donde se ven; tira de 7 días; marcador que viaja; vacío que informa ("Desde tu último ayuno" / invitación en el primer uso). NO se construyó Protein Score ni densidad de upsell.

## ☕ CHECKLIST DE DEVICE TEST (para caminarlo desayunando)

**Track A/C — registra tu desayuno real:**
- [ ] Nutrición → Foto → foto del desayuno → Analizar → **Guardar** (en modo SIMPLE guarda directo; "Revisar y ajustar" es el link de abajo). Verifica que aparece en Registrar → Desayuno.
- [ ] Nutrición → Texto → busca un alimento → agrégalo → Guardar comida (editor) → guarda.
- [ ] Registrar → Desayuno → un frecuente de 1 toque. **Apaga el wifi y repite:** debe decir "Error al registrar", NO "Registrado" (G1).
- [ ] (Cowork/SQL) `select source, was_edited from food_logs order by created_at desc limit 5` → debe traer `scan_photo`/`manual_text`/`frequent`, ya no `manual` para todo.

**Track B — fantasmas:**
- [ ] Preferencias → cambia dieta → Guardar → reabre: persiste (G5).
- [ ] Suplementos → tacha una toma sin conexión → el check se revierte solo (G9).

**Track D — rompe tu ayuno de hoy:**
- [ ] Con ayuno activo → TERMINAR → sale la hoja "Rómpelo con proteína primero" → elige "Huevos" → "Registrar lo que comiste" te lleva al scan. (SQL: `broke_fast_with` ya no es null.)

**Track E — hub:**
- [ ] Nutrición: score card arriba, CERO macros/calorías sueltas, glucosa y ayuno sin números en las cards.
- [ ] Botón "Analizar con IA" sin foto: se ve apagado-recedido, no "brillante con velo".

**Track F — la pantalla nueva de ayuno:**
- [ ] Sin ayuno: anillo punteado con "DESDE TU ÚLTIMO AYUNO" + horas reales (no un 0:00 muerto).
- [ ] Badge de meta sobre el anillo → hoja de protocolos; elige otra meta → se recuerda.
- [ ] INICIAR (degradado) → el layout NO salta; el header dice "Estás ayunando"; pastilla de fase bajo el anillo → tócala: qué pasa ahora / qué sigue / mapa.
- [ ] "Editar inicio" → muévelo 3 h atrás → progreso y hora meta recalculan en vivo; el marcador del anillo se mueve.
- [ ] Tira de 7 días abajo con tus ayunos de la semana.
- [ ] TERMINAR (relleno tenue, mismo lugar) → cierra SIN diálogo → hoja de proteína.

## 🧭 Dónde paré

**No paré: los 7 tracks aterrizaron completos.** Deuda consciente que dejé flaggeada en vez de tocar de madrugada: argos-recipes sigue brutalist (pantalla baja de tráfico), el mini-editor duplicado del resultado de food-scan (decisión de producto), y los fantasmas transversales de HOY/reportes (run que les toca). El SPEC marca además el bloque transversal de Zero (calendario, tendencias, stats, retos) como material del run de HOY/perfil.
