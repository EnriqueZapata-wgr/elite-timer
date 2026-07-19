# ✨ MB-8 · PULIDO EDITORIAL + LEGIBILIDAD — Delivery

**Fecha:** 2026-07-19 · **Branch:** `feat/mb8-pulido` · **CI:** tsc 0 errores · 1858 tests verdes (14 nuevos) · 8 commits

## ⚠️ Nota de ramificación (para Cowork)
El brief asumía que el tramo 2 (MB-5/6/7) estaría **mergeado a main** antes de este tramo. Al arrancar, `main` seguía en `66fdfa1` (sin MB-5/6/7); `git pull` = "Already up to date". Como (a) el método manda ramificar de la anterior **terminada** para no pisarse y (b) el fix heredado de YO necesita `motherChronotype` (que vive en el tramo 2), **ramifiqué `feat/mb8-pulido` desde `feat/mb7-ciclo`**, no desde main. Orden de merge esperado: tramo 2 (mb5→mb6→mb7) y luego mb8→mb10. `feat/mb8-pulido` ya contiene todo el tramo 2.

---

## Qué se hizo

### Fix heredado (auditoría tramo 2) — YoEditorialSection
`YoEditorialSection.tsx:28` tenía "Estado temporal · ancla Oso" hardcodeado. Un Delfín con madre Lobo leía "ancla Oso" en YO. Ahora arma el subtitle en runtime con `motherChronotype(raw_scores)` → "Estado temporal · base <madre real>", espejo de agenda/motor/Mi Cronotipo. `yo.tsx` pasa `chrono.raw_scores`. Test de regresión.

### Legibilidad
- **#86 Fitzpatrick**: los 6 fototipos tenían emoji repetido en pares (I=II 👩🏻, III=IV 👩🏽) → dos opciones idénticas. Un tono distinto por tipo (gradiente claro→oscuro).
- **P2-1 Mi Expediente**: mostraba la clave snake_case cruda del lab (`vitamin_d_25oh`). Ahora pasa por `displayLabel` (mapa curado + beautify). Test: nunca guion bajo crudo.

### Cards pelonas / vacíos
- **P2-3 Hidratación**: estaba pelona (una card sola sobre negro). +hero editorial (`hidratacion-01.png` + overlay) + **contexto epigenético dinámico** según % de la meta (mecanismo, no autoridad).
- **#71 Card A "Mi Diagnóstico Funcional"**: el bloque Nivel+estado ahora vive sobre `diagnostico.png` con overlay editorial.
- **P2-4 Vacío negro Mi Expediente**: caja de solo texto → componente `EmptyState` premium (ícono + CTA "Registrar un síntoma" → `/salud/sintomas`).

### Notificaciones
- **P3-2 Toast**: el banner "N sin leer" (crítico ≥5) se quedaba fijo tapando el header y nunca se iba. Ahora **auto-dismiss tras 8s** (ocultamiento de sesión, no persiste como el tap en X que lo oculta el día) + gap mínimo bajo el safe-area.

### Salud Funcional
- **#113 Cetonas 3 fuentes**: antes solo sangre (mmol/L). Ahora sangre (mmol/L) · aliento (acetona ppm) · orina (cualitativa negativo→grande), cada una con su unidad y rangos. Nuevo `ketones-source-core` (puro, 9 tests) + migración **204** (idempotente, `source` default 'blood' → filas viejas sin pérdida). UI con selector de fuente e input adaptativo.
- **#130 Cold interventions tag fiebre**: TODAS las térmicas ya contraindicaban fiebre, pero con 3 strings distintos. Normalizados al canónico `fiebre_viral_activa_37_8_o_mas` (2 saunas). Test de regresión: toda intervención térmica contraindica fiebre con string único.
- **#114 Vocab +5 categorías**: +ocular +vagal +respiracion +atencion +contemplativo (array + labels). Dedup semántico documentado (familias nuevas, no sinónimos).

### Higiene
- **Colores hardcoded → tokens** (journal): los 4 tipos de journal + section titles usaban hex que ya eran `CATEGORY_COLORS`. Mapeados.
- **#85 Migraciones 198a/199b**: verificado el historial remoto vía MCP — `198`/`199` **YA están aplicadas con nombres planos** (no 198a/198b). El rename ya es consistente local↔remoto. **No se necesita `migration repair`.** (Bonus: `080 pregnancy_status` también está aplicada → la máscara embarazo de MB-7 NO necesita db push, corrige lo dicho en el delivery MB-7.)

## Qué NO se hizo (y por qué)
- **#130 Scoring motor ×10→×5**: FUERA DE ALCANCE sin firma de Mariana (va en MB-11). No lo toqué.
- **#125 "3 tests rojos post-firma epigenética"**: la suite completa está **verde** (1858/1858). Los 3 tests candidatos (intervention-service-core, interventions-catalog, personalize-interventions asertando la firma v4) ya reflejan la doctrina — se corrigieron en un batch previo. Nada que actualizar.
- **Barrido completo de colores hardcoded** en `index.tsx` (51 hex) y `cycle.tsx` (17): DIFERIDO. Volumen alto y DESIGN_SYSTEM pide calibrar una pantalla antes de propagar; muchos son neutros (#fff/#333) sin token 1:1. Journal quedó como muestra del patrón. Deuda de higiene documentada.
- **Vacío de `quizzes.tsx`**: no es un vacío negro real — es una lista estática de categorías siempre poblada. No aplicaba el patrón.
- **Poda de worktrees (#20)**: no verifiqué worktrees (fuera del árbol de código; requiere `git worktree list` en la máquina de Enrique).

## Dudas para Enrique
1. **Migración 204 (cetonas)**: requiere `npx supabase db push`. Es la única nueva de MB-8.
2. **Cetonas rangos de aliento (ppm)**: usé una correlación orientativa (2/10/40 ppm). Si tienes umbrales clínicos preferidos, es 1 función en `ketones-source-core`.
3. **Contexto epigenético de hidratación**: 3 mensajes por tramo de %. ¿Quieres que Mariana revise el copy?
4. **Barrido de colores**: ¿lo quieres como MB propio o se difiere a v2.1 con LIGHT mode (que obliga a tokenizar todo de golpe)?

## Checklist device (Enrique)
- [ ] YO: cuenta/estado Delfín con madre Lobo → card CRONOTIPO dice "base Lobo" (no "ancla Oso").
- [ ] Solar: los 6 fototipos se ven distintos (emoji único por tipo).
- [ ] Cetonas: registrar por sangre / aliento / orina → historial muestra la fuente y la unidad correcta. **Tras db push de 204.**
- [ ] Hidratación: hero con imagen + frase epigenética que cambia con el %.
- [ ] Diagnóstico: Card A con imagen de fondo.
- [ ] Mi Expediente vacío: EmptyState con botón; con datos, labs legibles (no snake_case).
- [ ] HOY/ARGOS: el toast "N sin leer" se desvanece solo a los ~8s y no tapa el header.

## Commits
1. Fix heredado YoEditorialSection (madre real del Delfín)
2. Fitzpatrick #86 + fiebre #130 + vocab #114
3. Mi Expediente legibilize P2-1 + toast auto-dismiss P3-2
4. Cetonas 3 fuentes #113 (+migración 204)
5. Cards pelonas: hidratación P2-3 + Card A #71
6. Vacío negro Mi Expediente → EmptyState P2-4
7. Higiene colores journal
