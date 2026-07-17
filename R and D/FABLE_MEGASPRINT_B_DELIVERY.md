# 🏛️ MEGA-SPRINT B · Rediseño Salud Funcional — Delivery

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-b-salud-funcional` (desde `main` post Mega-Sprint A) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores · **1733 tests verdes** (171 files, +30 nuevos)
**Estado:** las 6 fases (B1-B6) implementadas. **NO se publicó OTA** (Enrique hace un device test grande de A+B+C al final). Un merge + un OTA al cierre.

> Este es el rediseño que resuelve el problema raíz de 3 intentos fallidos: el pilar tenía DOS árboles paralelos (Historia Clínica + Edad ATP) capturando el mismo dominio. Ahora es **UN árbol de 8 destinos limpios**, con `health-hub` como menú puro.

---

## 🌳 El árbol implementado (8 destinos)

```
Mi ATP → SALUD FUNCIONAL (health-hub · MENÚ PURO · cero datos)
      ├── 🧬 MI DIAGNÓSTICO      /salud/diagnostico   (+ Edad ATP como métrica)
      ├── 💊 MI PROTOCOLO         /salud/intervenciones
      ├── 📊 MIS DATOS            /salud/mis-datos      ← NUEVO
      ├── 📝 MIS EVALUACIONES     /salud/mis-evaluaciones ← NUEVO
      ├── 🩺 MIS SÍNTOMAS         /salud/mis-sintomas   ← NUEVO
      ├── 🏥 MIS PADECIMIENTOS    /salud/padecimientos
      ├── 📖 GUÍA DE LABS         /labs-guide
      └── 🗓️ MI EXPEDIENTE        /salud/mi-expediente  ← NUEVO
```

---

## Fase por fase

### B1 · health-hub = menú puro ✅
Reescrito de HÍBRIDO (resumen ejecutivo + widget de 7 sistemas con síntomas + quick-add modal) a **MENÚ PURO**: 8 cards editoriales de navegación, cero consulta de datos. Ya no importa `clinical-history-service`. **Test guard** (`health-hub-purity.test`) truena si alguien vuelve a meter un symptom-service o el widget de sistemas en el hub.

### B2 · MIS DATOS ✅ + Edad ATP como métrica
- `app/salud/mis-datos` — destino ÚNICO de todo dato numérico (labs de sangre · composición · signos vitales · glucosa · cetonas) con el último valor por sección + navegación a captura.
- **DECISIÓN DE IMPLEMENTACIÓN (brief B2.2): sin migración de tablas.** El mapa reveló que las tablas YA son canónicas por tipo: `health_measurements` es compartida entre árbol A (health-input) y B (edad-atp/composition+vitals), `lab_values` es append-only y consolida todo lab vía espejos, `glucose_logs`/`ketones_logs` son islas únicas. La duplicación era de NAVEGACIÓN, no de datos → Mis Datos es la vista/navegación consolidada. **Cero riesgo de pérdida.**
- `mis-datos-core` (formateadores puros) + 6 tests.
- **B2.3 · Edad ATP como métrica:** dentro de Mi Diagnóstico aparece la edad biológica + delta + CE (gate CE≥30). El **motor V7/V6 (`edad-atp-v2-service`) queda INTOCADO** — solo se LEE `computeEdadAtpV2`/`computeCE`. Edad ATP deja de ser árbol paralelo.

### B3 · MIS SÍNTOMAS ✅ — migración con CERO pérdida (la pieza crítica)
- **Migración `202_user_symptoms.sql`:** fusiona `clinical_symptoms` (por sistema) + `clinical_symptoms_aislados` (sueltos) en `user_symptoms` con `started_at`/`resolved_at`/`is_active` + `system_key` NULLABLE + **duración** (task #135).
- **CERO PÉRDIDA + reversibilidad:** preserva los UUID originales (`ON CONFLICT (id) DO NOTHING` → idempotente), `source_kind` ('sistema'|'aislado') para reconstruir los conteos del DX + poder revertir, filtra huérfanos (`WHERE user_id IN auth.users`), RLS dueño+coach replicada. **NO se dropean las tablas viejas** (soft-deprecation; el DROP va en una migración posterior tras validar en device). `clinical_symptom_logs` (tabla hija de severidad) queda intacta.
- `user-symptoms-core` (puro) + `user-symptoms-service` (I/O fail-soft) + `app/salud/mis-sintomas` (registro + marcar resuelto → "Duró 3 días" + activos/resueltos + sistema opcional). Absorbe `sintomas.tsx` + `clinical-system.tsx` + el widget del hub.
- **DX intacto:** `dx-engine.harvestSources` ahora lee `user_symptoms` reconstruyendo los MISMOS dos conjuntos (por-sistema activos + aislados recientes limit 50) con `dxSystemSymptoms`/`dxAisladoSymptoms`; `snapshot.sintomas`/`sintomas_aislados` siguen separados → el DX calcula IGUAL. **Test guard** valida la reconstrucción.
- **Antileak:** `user_symptoms` + `clinical_symptoms_aislados` añadidas a `CLINICAL_TABLES` en los 3 tests de comunidad (la guardia anti-fuga PHI cubre la tabla nueva).
- 17 tests nuevos.

### B4 · MIS EVALUACIONES ✅ (SOLO hub agrupador · Maestro aparte)
`app/salud/mis-evaluaciones` — reúne en un hub navegable lo que estaba disperso en 4 lugares: Braverman, Cronotipo, Fitzpatrick, cuestionarios funcionales (`/quizzes`), test cognitivo, pruebas cinemáticas. + slot **"Cuestionario Maestro ATP · PRONTO"**. **NO se implementó el Maestro** (task #107 va en su propio sprint, según el ajuste de Enrique 2026-07-16) ni se rediseñó el contenido de los cuestionarios existentes.

### B5 · MI EXPEDIENTE ✅ (timeline · task #104 adelantada)
`app/salud/mi-expediente` — timeline cronológico agrupado por mes que fusiona síntomas (inicio/fin), intervenciones activadas, labs y glucosa/cetonas. `mi-expediente-core` (`buildTimeline` merge+orden, `groupByMonth`, `shortDate`) + 5 tests. ARGOS podrá leerlo (V1.1) para correlacionar patrones.

### B6 · Limpieza ✅
- **Tab YO deja de duplicar salud:** quitadas las cards EDAD ATP, COMPOSICIÓN CORPORAL, LAB MÁS RECIENTE, TESTS FUNCIONALES de `YoEditorialSection`. Se conservan CRONOTIPO (identidad, no dato de salud), DISCIPLINA, TENDENCIAS, RANK, REPORTES.
- `settings/salud` "/clinical-system" → redirige a `/health-hub`.
- **Huérfanas (reemplazadas, sin entry points):** `app/salud/sintomas.tsx` y `app/clinical-system.tsx` quedan dormidas — borrado físico en una pasada posterior (dejarlas evita tocar el registro de `_layout` en este pase; cero dead-links).
- **NO se borraron** `my-health`, `glucose-log`, `health-input`, `edad-atp/*` — siguen VIVAS como pantallas de captura alcanzadas desde Mis Datos y otros flujos legítimos (nutrition→glucosa, day-compiler→electrones). Consolidamos la NAVEGACIÓN (una puerta), no borramos las implementaciones de captura que funcionan.

---

## ⏭️ Pendiente Enrique (al cierre de A+B+C)

1. **Revisar migración `202_user_symptoms.sql`** (idempotente, cero pérdida, no dropea nada).
2. **`npx supabase db push`** — crea `user_symptoms` + backfill. Sin esto, Mis Síntomas/Mi Expediente/DX degradan fail-soft (loguean, muestran vacío).
3. **Merge** de A + B (+ C cuando esté) a main.
4. **OTA desde main** + **device test grande** de todo junto.
5. Device test específico: hub sin datos (solo 8 cards), Mis Datos con último valor, Mis Síntomas crear→resolver→duración, Edad ATP en Mi Diagnóstico, YO sin cards de salud duplicadas.

---

## 🐛 Bugs bonus + notas

- **`edad_atp_body_composition` no se usa** (la composición se guarda en `health_measurements` compartida) — dato del mapa, no un bug a arreglar aquí.
- **Los cuestionarios siguen duplicados** (historia-clinica 17 vs edad-atp/questionnaires 10) — B4 solo los AGRUPA en un hub; su fusión real va con el Cuestionario Maestro (task #107), como pidió el ajuste de Enrique.
- **Taxonomía de sistemas:** se usó la de los 7 sistemas funcionales de Mariana (la doctrinal) para el `system_key` de `user_symptoms`.

## ⚠️ Riesgos / seguimiento

- **DROP de tablas viejas pendiente:** `clinical_symptoms`, `clinical_symptoms_aislados`, `clinical_symptom_logs` quedan dormidas tras el backfill. Una migración `203` las dropea DESPUÉS de que Enrique valide en device que Mis Síntomas funciona con los datos migrados. Reversibilidad garantizada hasta entonces.
- **Borrado físico de huérfanas** (`sintomas.tsx`, `clinical-system.tsx`) en una pasada de limpieza posterior (requiere quitar su `Stack.Screen` de `_layout`).

## 🧪 Test guards entregados
- `health-hub-purity`: el hub no importa symptom-service ni renderiza el widget (menú puro).
- `user-symptoms-core`: duración, validación, reconstrucción de los 2 conjuntos del DX (no romper el diagnóstico).
- `mis-datos-core` + `mi-expediente-core`: formateadores y timeline.
- Antileak: `user_symptoms` cubierta por la guardia anti-fuga PHI.

## 🗂️ Archivos
**Nuevos:** `app/salud/{mis-datos,mis-evaluaciones,mis-sintomas,mi-expediente}/index.tsx`, `src/services/salud/{mis-datos-core,user-symptoms-core,user-symptoms-service,mi-expediente-core}.ts` (+ 4 tests), `supabase/migrations/202_user_symptoms.sql`.
**Reescritos:** `app/health-hub.tsx`.
**Modificados:** `app/salud/diagnostico/index.tsx` (Edad ATP métrica), `src/services/dx/dx-engine.ts` (lee user_symptoms), `src/components/yo/YoEditorialSection.tsx`, `app/settings/salud.tsx`, 3 antileak tests.

Commits: B1+B2+B4 → B3 → B5 → B6 → guard fix → este delivery.

— Fable 🤖 · rediseño raíz · 2 árboles → 8 destinos · cero pérdida de datos
