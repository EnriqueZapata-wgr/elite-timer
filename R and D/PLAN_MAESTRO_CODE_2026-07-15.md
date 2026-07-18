# 🗺️ PLAN MAESTRO DE EJECUCIÓN · Fable/Code · 2026-07-15

**Objetivo:** cerrar la brecha entre lo conceptual (89 intervenciones + motor + doctrinas · YA listo) y lo VISIBLE en la app. Enrique ha trabajado muchísimo en cerebro · ahora toca que se VEA.

**Estado base:** Sprint 1.5 device-test OK · mergeado a main. Catálogo epigenético + motor arquitectura commiteados. Fase 0 conceptual COMPLETA.

---

## 🎯 Principio de priorización

Ordenado por: **(1) lo que Enrique VE y le molesta ahora → (2) el diferenciador core (motor) → (3) lo que desbloquea beta → (4) deuda técnica.**

---

## SPRINT 2 · "Que se vea" (VISUAL + UX · Fable · ~12-18h)

**Por qué primero:** Enrique abre la app y ve bugs visuales de hace días. Esto mata la moral. Cerrar esto primero da sensación de progreso tangible + deja la app presentable para beta.

### 2.1 · Swap imageBn · las imágenes editoriales NO se ven (task #91) · P0
- Los 6 assets MJ que Enrique generó están en disco pero NINGÚN `require()` los referencia
- Cablear: `pillars/comunidad.png`, `health-hub/diagnostico.png`, `mi-protocolo.png`, `fitzpatrick.png`, `mente-avanzado.png`, `comunidad-tribu.png`
- Verificar caché de imágenes RN (clear/reinstall si necesario)
- Referencia: `R and D/COWORK_AUDIT_COMPLETO_APP_2026-07-14.md` sección 1

### 2.2 · Card A "Mi Diagnóstico Funcional" sin imagen editorial (task #71) · P0
- Cablear `health-hub/diagnostico.png` a Card A
- Si falta asset → Enrique genera con prompt MJ

### 2.3 · Historia Clínica widgets FUERA de cards (regresión · task #92) · P0
- Los "sistemas funcionales" están desglosados como listitas afuera de cards
- Aplicar patrón card contenedora (Fable ya lo hizo antes en task #67 · se rompió otra vez)

### 2.4 · Pilar MENTE borrador · botones feos + copy raro (task #94) · P1
- Sin imagen editorial B/N (usa vieja) → cablear `mente-avanzado.png`
- Botones lima gordos feos → sistema editorial que usan Nutrición/Fitness
- Copy raro "En comunidad · verifica pronto" → arreglar wiring social proof

### 2.5 · Imágenes duplicadas (reportado device) · P1
- Enrique reporta "imágenes duplicadas" · identificar cuáles cards comparten asset
- Cross-check con `concept-colors.ts` para coherencia visual

**Delivery Sprint 2:** `FABLE_SPRINT_2_VISUAL_DELIVERY.md` · device test Enrique · merge + OTA.

---

## SPRINT 3 · Motor de personalización · el DIFERENCIADOR (Fable · ~12-20h)

**Por qué segundo:** es EL edge de ATP · convierte "app con catálogo" en "app de prescripción funcional". Sin esto, el research epigenético masivo se queda como PDFs bonitos.

### 3.A · Motor Fase A · Backend + migración + tests (8-12h)
- Brief completo: `R and D/FABLE_BRIEF_MOTOR_FASE_A_2026-07-14.md`
- Migración 201 `user_prescribed_interventions` + vista + RLS
- Función `personalizeInterventions()` determinística
- Servicio `prescription-service.ts`
- 6 tests sintéticos + 10 test guards

### 3.B · Motor Fase B · UI Mi Protocolo consume prescription (4-8h)
- Brief completo: `R and D/FABLE_BRIEF_MOTOR_FASE_B_UI_2026-07-14.md`
- Componente `<PrescriptionCard>` con rationale "por qué a TI"
- Refactor Mi Protocolo → 5 prescritas + "explorar catálogo (88)"
- Botón "Recalcular mi protocolo"
- Copy "otras 83 existen pero para ti hoy no mueven la aguja"

**Delivery Sprint 3:** device test prescripción real · el momento fuerte de la beta.

---

## SPRINT 4 · Cuestionario Maestro UI (Fable · ~20-30h)

**Por qué tercero:** alimenta el motor con fenotipo completo. Sin esto el motor corre con datos parciales.

- Doc completo: `R and D/CUESTIONARIO_MAESTRO_ATP_v1.md`
- 13 dimensiones + motor ramificación dinámica (skip/deep-dive/adapt)
- Componentes: `<MasterQuizShell>`, `<MasterQuizSection>`, `<MasterQuizQuestion>`, inputs variados
- Migración `user_master_quiz` + vista `user_phenotype`
- Preview progresivo + guardar/continuar + retomable por sección

**Delivery Sprint 4:** device test cuestionario completo.

---

## SPRINT 5 · Cierre catálogo + deuda técnica (Fable · ~8-12h)

**Por qué cuarto:** limpieza que no bloquea beta pero deja todo pro.

### 5.1 · Vocab 5 categorías nuevas (task #114)
- Agregar `ocular`, `vagal`, `respiracion`, `atencion`, `contemplativo` a `intervention-vocab.ts`
- Re-mapear intervenciones relevantes a estas categorías

### 5.2 · Módulo cetonas 3 fuentes (task #113)
- Sangre (BHB) + aliento (acetona) + orina (acetoacetato)
- Migración + UI · cada fuente ilustra parte del proceso

### 5.3 · Verificar/corregir "ducha 90min" (task #117)
- Haghayegh 2019 es BAÑO tibio 10-15min tomado 90-120min pre-sueño (no ducha 90min)
- Reclasificar `bano_caliente_prevespertino` + caveats flora piel

### 5.4 · Actualizar 3 tests rojos post-firma epigenética (task #125)
- ayuno_16_8 + lentes_rojos + 3ro · tests esperan nueva doctrina (no salen por contraindicación)

### 5.5 · Renombrar pilares Mi ATP (task #89)
- SALUD FUNCIONAL / HÁBITOS FUNCIONALES / COMUNIDAD ATP
- Ver doctrina `project_doctrina_mi_atp_3_pilares`

### 5.6 · Routing HOY granular (task #90)
- Cada card HOY → pantalla específica (no hub genérico)
- Matriz completa en `R and D/FABLE_MEGAHOTFIX_3RA_PASADA_2026-07-14.md` bloque B.2

---

## FEATURES V1.5 (post-beta · no bloquean lanzamiento)

- N-Back Challenge implementación (task #45 · spec cerrado · 20-30h)
- Tools atención PVT + Stroop + TMT (task #115 · investigación lista)
- Vista "Tu registro epigenético" timeline (task #104)
- ARGOS narrativa encima del motor (Fase C)
- Coach Proactivo (task #54)

---

## 🚦 Secuencia recomendada para Fable

```
AHORA → Sprint 2 (visual · lo que Enrique ve) · 12-18h
        ↓ device test + merge + OTA
        Sprint 3.A (Motor backend) · 8-12h
        ↓ audit Cowork + merge
        Sprint 3.B (Motor UI) · 4-8h
        ↓ device test + merge + OTA · MOMENTO FUERTE BETA
        Sprint 4 (Cuestionario UI) · 20-30h
        ↓ device test + merge + OTA
        Sprint 5 (cierre + deuda) · 8-12h
        ↓ device test + merge + OTA
        → BETA READY
```

**Total estimado hasta beta ready: ~52-80h Fable · ~1.5-2 semanas calendario.**

---

## 📋 Reglas invariantes para TODOS los sprints

- str_replace quirúrgico · no reescribir archivos completos
- Cero fuga clínica (Comunidad no expone datos clínicos)
- Idempotencia migraciones (IF NOT EXISTS / ON CONFLICT DO NOTHING)
- `npx tsc --noEmit` limpio antes de push
- Tests integration reales (no solo unit que validan doctrina equivocada · aprendizaje hotfix Sprint 1.5)
- Delivery doc por sprint
- Device test Enrique después de cada sprint antes del siguiente
- `generateUUID` no `crypto.randomUUID`
- `getLocalToday()` / `parseLocalDate()` para date queries
- Módulos nativos requieren `eas build` no OTA
- Dedup semántico (familias canónicas cross-vocabulario)
- Datos machine se validan · datos user sagrados

---

## 💛 Nota para Enrique

Se SIENTE que no avanzamos porque el trabajo del cerebro (89 intervenciones, motor, doctrinas) es invisible en la app. Pero es el 70% del valor · sin él, ATP sería otra app de wellness pop. Sprint 2 (visual) es lo que te va a devolver la sensación de progreso en 12-18h. Sprint 3 (motor) es donde ATP se vuelve único. De ahí es cuesta abajo.

Vamos.

— Cowork
