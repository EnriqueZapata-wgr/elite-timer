# 🏛️ MEGA-SPRINT B · Rediseño Salud Funcional (Fable)

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-b-salud-funcional` desde `main` (post Mega-Sprint A)
**Filosofía:** rediseño arquitectural grande · consolida 29 pantallas + 2 árboles en 8 destinos limpios. Un mega-sprint congruente.
**Estimado:** 20-30h (es el más grande · tiene migraciones)
**Base:** `MAPA_ARQUITECTURA_SALUD_FUNCIONAL_ACTUAL_2026-07-16.md` + `ARQUITECTURA_SALUD_FUNCIONAL_REDISENO_v1.md`

---

## 🎯 El problema que resuelve (leer primero)

El pilar tiene DOS árboles paralelos ("Historia Clínica" vía Mi ATP + "Edad ATP" vía YO) capturando el MISMO dominio con vocabularios y tablas distintas. "Historia Clínica" nombra 4 cosas. Síntomas viven en 2 tablas. health-hub mezcla menú con datos. **Falló 3 veces (task #67, #92) porque atacaban lo visual, no la duplicación estructural.**

## 📚 Doctrinas obligatorias

1. **`project_doctrina_menu_navegacion_vs_consulta_datos`** — LA doctrina raíz. Menú = navegación pura. Datos = dentro de destinos. Un dato = un lugar.
2. **`project_doctrina_placeholder_unica_por_dato`** — un dato vigente = un lugar.
3. **`project_doctrina_ninguna_pantalla_aislada`** — cada pantalla muestra origen + destino.
4. **`feedback_dedup_semantico_no_textual`** — familias canónicas.
5. **`project_doctrina_registro_epigenetico_3_funciones`** — para Mi Expediente timeline.

---

## 🌳 EL ÁRBOL FINAL (8 destinos · cerrado con Enrique)

```
Mi ATP → SALUD FUNCIONAL (hub · MENÚ PURO · cards editoriales, CERO datos)
      ├── 🧬 MI DIAGNÓSTICO      (raíces + niveles + Edad ATP como métrica)
      ├── 💊 MI PROTOCOLO         (5 prescritas motor + activas)
      ├── 📊 MIS DATOS            (labs+biomarcadores+composición+vitals+glucosa+cetonas · 1 lugar)
      ├── 📝 MIS EVALUACIONES     (Braverman+Cronotipo+Fitzpatrick+Cuestionario Maestro+tests · 1 lugar)
      ├── 🩺 MIS SÍNTOMAS         (1 modelo unificado + duración inicio/fin)
      ├── 🏥 MIS PADECIMIENTOS    (condiciones + episodios)
      ├── 📖 GUÍA DE LABS         (editorial)
      └── 🗓️ MI EXPEDIENTE        (timeline cronológico · registro epigenético)

Tab YO → ya NO tiene cards que dupliquen salud (Edad ATP absorbida)
```

---

## 🔨 FASE B1 · health-hub = menú puro (más rápido · empezar aquí)

### B1.1 · Sacar datos de consulta del hub
- `app/health-hub.tsx`: ELIMINAR del hub:
  - El resumen ejecutivo del expediente (headline calculado de síntomas)
  - **El widget de 7 sistemas funcionales colapsables con síntomas + quick-add** (esto viola la doctrina · el dato vive en Mis Síntomas)
- DEJAR solo: cards editoriales de navegación a los 8 destinos.

### B1.2 · Renombrar el hub y las cards (sin colisión "Historia Clínica")
- Título del hub: "Historia Clínica" → **"SALUD FUNCIONAL"**
- Cards del hub = los 8 destinos con sus nombres nuevos (Mi Diagnóstico, Mi Protocolo, Mis Datos, Mis Evaluaciones, Mis Síntomas, Mis Padecimientos, Guía de Labs, Mi Expediente)
- Eliminar la card "HISTORIA CLÍNICA" que llevaba a `/historia-clinica` (se absorbe en Mis Evaluaciones)
- Cada card editorial con imagen + título + subtítulo + navegación (cero datos)

### B1.3 · Migrar `clinical-system.tsx`
- Ya no se accede desde el widget del hub (que se eliminó)
- Se absorbe en MIS SÍNTOMAS (vista por sistema opcional) · ver Fase B3

---

## 🔨 FASE B2 · MIS DATOS (unificar captura numérica)

### B2.1 · Crear destino único `app/salud/mis-datos/index.tsx`
Absorbe y reemplaza:
- `health-input.tsx` ("Evaluación" · composición/medidas/cardiovascular/fuerza/bienestar/sueño)
- `my-health.tsx` (ATP Mi Salud · labs + estudios)
- `edad-atp/biomarkers.tsx` (labs sangre)
- `edad-atp/composition.tsx` (composición)
- `edad-atp/vitals.tsx` (presión/FC/VO2max)
- `edad-atp/labs.tsx` (subir/consultar labs)
- `glucose-log.tsx` (glucosa)
- `ketones-log.tsx` (cetonas)

Organización interna (secciones dentro de un solo destino):
- **Labs de sangre** (subir PDF/foto/manual + valores + rangos funcionales)
- **Composición corporal** (peso, %grasa, músculo, FFMI)
- **Signos vitales** (presión, FC reposo, VO2max)
- **Glucosa** (registro + rangos)
- **Cetonas** (registro + rangos · nota: task #113 amplía a 3 fuentes sangre/aliento/orina · puede ir aquí)

### B2.2 · Consolidar tablas
- Hoy: `health_measurements` + `edad_atp_biomarkers` + `edad_atp_*` + `lab_values` + `glucose_logs` + `ketones_logs`
- **Decisión de implementación:** evaluar migración a esquema unificado VS vista consolidada que lee de las tablas existentes. Preferir vista si la migración es riesgosa (menos ruptura). Documentar la decisión.
- La captura escribe a UNA tabla canónica por tipo · sin duplicar entre árbol A y B.

### B2.3 · Edad ATP como métrica (no puerta)
- El score CE/edad biológica de `edad-atp` se muestra como MÉTRICA dentro de MI DIAGNÓSTICO (card/número), no como árbol separado
- El motor de cálculo Edad ATP (`edad-atp-v2-service`, matriz V7/V6) se MANTIENE intacto (es congelado · doctrina) · solo cambia DÓNDE se muestra el resultado
- `edad-atp/index.tsx` deja de ser hub navegable · sus sub-pantallas de captura se absorben en Mis Datos

---

## 🔨 FASE B3 · MIS SÍNTOMAS (unificar modelo + duración)

### B3.1 · Migración: unificar síntomas
- Hoy: `clinical_symptoms` (por sistema, con `system_key`) + `clinical_symptoms_aislados` (sueltos)
- **Nueva tabla unificada** `user_symptoms` (o consolidar en una de las existentes):
  ```sql
  -- campos clave
  id, user_id, name, severity, system_key (NULLABLE · opcional),
  started_at TIMESTAMPTZ,      -- inicio (task #135)
  resolved_at TIMESTAMPTZ NULL, -- fin (task #135)
  is_active BOOLEAN,           -- activo/resuelto
  note TEXT, created_at
  -- duración calculada: resolved_at - started_at
  ```
- Migrar datos de ambas tablas viejas · backfill filtrando huérfanos (doctrina)
- `dx-engine.ts` lee la tabla unificada (hoy lee ambas · actualizar)

### B3.2 · Destino `app/salud/mis-sintomas/index.tsx`
- Registro de síntoma: nombre + severidad + inicio + (system_key opcional)
- **Botón "marcar como resuelto"** → setea `resolved_at` + `is_active=false` → muestra duración ("Gripa · 3 días")
- Vista por sistema opcional (absorbe `clinical-system.tsx`): filtrar síntomas por sistema funcional
- Timeline de síntomas (activos + resueltos con duración)
- Absorbe: `sintomas.tsx` + `clinical-system.tsx` + el widget del hub

---

## 🔨 FASE B4 · MIS EVALUACIONES (SOLO el hub · NO implementar Maestro aún)

⚠️ **AJUSTE Enrique 2026-07-16:** el Cuestionario Maestro (13 dimensiones · task #107 · 20-30h por sí solo) se implementa en su PROPIO mega-sprint después. NO meterlo en B (haría B de 40-60h). En B, Mis Evaluaciones solo AGRUPA lo existente en un hub limpio.

### B4.1 · Destino `app/salud/mis-evaluaciones/index.tsx` (hub agrupador)
Reúne en un solo hub (navegación) las evaluaciones que YA existen:
- Braverman (intocado)
- Cronotipo (intocado)
- Fitzpatrick (intocado)
- Los cuestionarios funcionales actuales (los que hay hoy · sin rediseñar aún)
- Tests cognitivos + cinemáticos (absorbe de edad-atp)

### B4.2 · Placeholder para el Maestro
- Dejar un slot/card visible "Cuestionario Maestro · próximamente" o similar (el Maestro llega en su sprint dedicado)
- NO eliminar los cuestionarios duplicados todavía (eso se hace cuando el Maestro los reemplace · su sprint)
- Objetivo de B4: que las evaluaciones dejen de estar dispersas en 4 lugares → 1 hub · sin rediseñar el contenido de los cuestionarios aún

**El rediseño de cuestionarios + Cuestionario Maestro = mega-sprint aparte (task #107) · después de B.**

---

## 🔨 FASE B5 · MI EXPEDIENTE (timeline · task #104)

### B5.1 · Destino `app/salud/mi-expediente/index.tsx`
- Timeline cronológico del registro epigenético: intervenciones activadas/completadas + síntomas (inicio/fin) + labs subidos + mediciones + eventos de salud
- Eje temporal · scroll cronológico
- ARGOS puede leer para correlacionar patrones (V1.1: "en tu mes previo a PCR elevada tenías 40% días sin sol")
- Exportable al médico (con permiso · post-beta)
- Doctrina `registro_epigenetico_3_funciones`

---

## 🔨 FASE B6 · Limpieza final

- Matar pantallas absorbidas: `health-input.tsx`, `my-health.tsx`, `clinical-system.tsx`, `historia-clinica/index`, `historia-clinica/[category]` (si se absorbió), `sintomas.tsx`, `glucose-log.tsx`, `ketones-log.tsx`, `edad-atp/biomarkers/composition/vitals/labs/questionnaires` (según se absorbieron)
- Quitar cards duplicadas de tab YO (Edad ATP, Composición, Lab reciente)
- Grep: cero entry points muertos a rutas eliminadas
- Actualizar `dx-engine` para leer las tablas consolidadas

---

## 🚦 Orden sugerido (dentro del mega-sprint)

```
B1 (menú puro · rápido · alto impacto visible)
  → device check parcial
B2 (Mis Datos · unificar captura)
B3 (Mis Síntomas · migración + duración)
B4 (Mis Evaluaciones · con Cuestionario Maestro · el más grande)
B5 (Mi Expediente · timeline)
B6 (limpieza + matar huérfanas)
  → device test completo → merge → OTA
```

Nota: si B4 (Cuestionario Maestro) resulta demasiado grande, se puede separar en su propio sub-sprint · pero el resto (B1-B3, B5-B6) va junto.

---

## 🧪 Test guards
- health-hub NO renderiza datos (solo navegación) · test que verifique cero llamadas a symptom-service desde el hub
- Síntomas: crear + marcar resuelto → duración correcta
- Migración síntomas: datos viejos preservados · cero pérdida
- Cero entry points muertos (grep rutas eliminadas)
- dx-engine lee tablas consolidadas · DX sigue calculando igual
- Edad ATP score se muestra en Mi Diagnóstico · motor V7/V6 intacto

## 📤 Delivery
`R and D/FABLE_MEGASPRINT_B_DELIVERY.md` con: árbol implementado, tablas consolidadas/migradas, pantallas absorbidas/muertas, screenshots de los 8 destinos, migraciones aplicadas, bugs bonus.

## 🔒 Invariantes
- str_replace quirúrgico · migraciones idempotentes · backfill filtra huérfanos
- Cero fuga clínica · cero pérdida de datos en migración de síntomas
- Motor Edad ATP V7/V6 INTOCADO (solo cambia dónde se muestra)
- Cero deuda · tests integration reales · un dato = un lugar
- Delivery doc

Este resuelve el problema raíz de 3 intentos fallidos. Con cuidado.

— Enrique + Cowork
