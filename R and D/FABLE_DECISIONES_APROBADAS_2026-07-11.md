# ✅ Decisiones aprobadas — arranca ejecución del mapa v1

**De:** Cowork + Enrique
**Para:** Fable (CCF5)
**Fecha:** 2026-07-11
**Contexto:** peloteo cerrado sobre las 6 decisiones de §9 del mapa `FABLE_MAPA_TRANSFORMACION_DX_INTERVENCIONES_v1.md`. **Tienes verde para ejecutar** con los matices abajo. Regla de oro sigue: cambios grandes al mapa se peloteán antes.

---

## Las 6 decisiones + 2 adicionales

### 1. Precio DX manual (Base): ✅ **1000 H+ + cache**

- Alineado a `braverman_premium_report` (1000 H+)
- **Cache obligatorio:** no regenerar el DX si no hay dato nuevo desde la última versión. El usuario paga solo cuando hay cosecha real que hacer.
- Sigue el patrón idempotente de `braverman-premium-service.ts` (cache → `spendProtons` → `callAnthropic` → cache).

### 2. Catálogo: ✅ **Constants + custom del usuario**

**Confirmado:** `src/constants/interventions-catalog.ts` como fuente de verdad curada (Mariana + Enrique llenan → Cowork convierte → git commit).

**Matiz nuevo Enrique:** el catálogo curado es la base porque *"el cliente 99% del tiempo no sabe qué hacer — hay que imaginar que son pendejos"*. Pero:

> **El usuario PUEDE crear intervenciones personalizadas propias.**

**Implicación técnica que necesitamos que resuelvas:**
- El estado del usuario con intervenciones ya vive en `user_interventions` (tabla que propusiste). Puedes agregar campo `is_custom BOOLEAN DEFAULT false` + `custom_definition JSONB` (nombre, cómo, beneficio, categorías, raíces).
- Cuando `is_custom = true`, la intervención vive **solo en la tabla del user**, no en `interventions-catalog.ts`.
- El motor `intervention-engine-core.ts` opera sobre catálogo curado (para el semáforo de sugeridas). Las personalizadas siempre son "activas por decisión del user", nunca sugeridas por el motor (v1).
- UI: en la pantalla de intervenciones, botón **"Crear intervención propia"** con formulario ligero (los 8 campos, pero sin obligar raíces/categorías si el user no sabe).

**Decisión final tuya sobre implementación** — este es el approach que sugerimos, si tienes uno mejor, propón.

### 3. Síntomas aislados: ✅ **Reusar `clinical_symptoms` con `kind='aislado'`**

**Con caveat Enrique:** *"considera implicaciones contraproducentes"*.

**Riesgos que tú debes revisar y reportar antes de la migración 173:**
- Queries actuales sobre `clinical_symptoms` que asumen semántica de "los 7 sistemas funcionales" — al mezclar con quick-tap peso BAJO, ¿rompes algún dashboard existente o reporte?
- RLS: verificar que no hay policy que asume forma específica del row
- El agregador `groupSymptomsBySystem` / `buildExecutiveSummary` — ¿se rompe si le llegan filas con `kind='aislado'` y sin `system`?
- Migración de filas existentes: `UPDATE clinical_symptoms SET kind='sistema' WHERE kind IS NULL` (retro-población)

Si detectas contraindicaciones grandes → propones tabla separada `clinical_symptoms_aislados` y peloteás.

### 4. Padecimientos: ✅ **Tabla nueva CON EVENTOS RECURRENTES**

**Cambio importante al esquema que propusiste.** Enrique aterrizó:

> *"Queremos saber si tiene diarrea 6× al año, si se agripa 4× y cuánto dura y eso es relevante."*

**Consecuencia:** 1 padecimiento (ej: "gripe") puede tener **múltiples episodios**. Tu schema propuesto (`started_on` + `resolved_on` + `treatment` en 1 fila) modela 1 episodio, no la definición del padecimiento como entidad recurrente.

**Sugerencia — 2 tablas:**

```
padecimientos (definición de la condición)
  id, user_id, name, category, is_chronic, notes, created_at

padecimiento_episodios (ocurrencias)
  id, padecimiento_id (FK), user_id (denormalizado RLS),
  started_on, resolved_on, duration_days (generated),
  severity, treatment, notes, created_at
```

**Beneficio:**
- Query "gripes en el último año" = `COUNT(*)` sobre episodios
- Duración promedio = agregado sobre `duration_days`
- Alimenta el DX con MUCHA más señal (frecuencia + duración + tendencia)
- Diferencia clara: `is_chronic=true` (diabetes, hipertensión) → 1 episodio en curso · `is_chronic=false` (gripe, infección urinaria) → N episodios finalizados

**Excepción:** si crees que un solo padecimiento (crónico) no vale una tabla separada, propón alternativa con un `episodes JSONB` — pero Cowork prefiere 2 tablas normalizadas por queries limpias.

### 5. BHA scanner: ✅ **Va en el sprint de rediseño SUPS, NO en V1.5**

**Corrección importante Enrique:** *"NO NECESITA LIBRERÍA. Es simplemente con los parámetros que ya dictó [Mariana]. ¿A qué librería te refieres?"*

Cowork asumió mal — dije "librería curada" y no aplica. **Cierre:**

- BHA es **LLM + OCR aplicando los criterios de Mariana** (colorantes, azúcares, endulzantes artificiales, óxido de magnesio vs glicinato, cianocobalamina vs metilcobalamina, ácido fólico vs metilfolato, formas quelatadas, conservantes naturales OK).
- **Cero base de datos precurada** en v1. Solo prompt bien construido con los criterios completos.
- Cost H+ probable: 500-1000 H+ por scan (LLM real cuesta). O gratis Pro.
- **Va empaquetado en el sprint de SUPS del rediseño** — cuando modifiques suplementos (biblioteca virgen + fichas + copy anti-recomendación), agregas el CTA "Escanear con BHA" ahí mismo.
- El scanner es una nueva ruta `requestType: 'bha_scan'` en `argos-proxy` con multi-modal (imagen + texto).

Los criterios completos están en la memoria doctrinal `project_biohacker_approved_bha_scanner`. Léelos antes de armar el prompt.

### 6. Protocolos precargados: ✅ **Biblioteca de referencia + expandibles**

Confirmado feature flag + doble-lectura + tablas intactas. Enrique agrega:

> *"Está ok tener protocolos bundled como guía y podemos añadir muchos más. Incluso viajes."*

**Consecuencia de diseño:** la "biblioteca de referencia" no es un cementerio, es una **feature con futuro**. Diseña la UI de la biblioteca de protocolos pensando en **expandibilidad** (categorías: fitness, viajes, jet-lag, retiros, ayuno prolongado, etc.). No inversión adicional en v1 más allá de que la pantalla no cierre puertas.

---

## Adicionales (Cowork + Enrique)

### 7. Transición users con protocolo activo: ✅ **Opción X (fricción intencional)**

Cuando le flip a `INTERVENTIONS_DRIVE_HOY=true`:

- HOY se queda vacío hasta que el user genere DX
- Copy grande: *"Actualizamos tu experiencia. Genera tu Diagnóstico Funcional para activar tu nuevo protocolo."*
- Botón CTA grande "Generar mi Diagnóstico"
- En Pro: genera automático al primer login post-swap
- En Base: pide 1000 H+ (o le regalamos el primero como cortesía de migración — decisión tuya con Enrique)

**Sugerencia Cowork:** regálale el primer DX post-swap a todos los users existentes (Base y Pro). Cortesía de migración, comunicación clara, cero fricción real. Costos son marginales en beta (5-9 testers).

### 8. Universales P1 (fallback catálogo vacío): confirmados

Enrique aterrizó que "es difícil tener cosas universales" — **son pocos y varios son cronotipo-driven**:

| # | Universal | Tipo |
|---|---|---|
| 1 | Hidratación matutina (500ml al despertar) | Fija |
| 2 | Exposición solar 10 min 7-9am | Fija |
| 3 | Recordatorio de dormir | Calculado desde cronotipo |
| 4 | Recordatorio de comer (ventana ayuno) | Calculado desde cronotipo |
| 5 | Apagar pantallas 30min antes de dormir | A confirmar (pending Enrique) |

**Implicación:** universales #3 y #4 no son intervenciones tradicionales — son **recordatorios auto-generados** basados en `user_chronotype`. Considera si van al mismo `user_interventions` (con `is_universal=true` + `computed_time`) o como capa separada de "sistema circadiano".

Cowork prefiere: van a `user_interventions` con flag `is_universal=true` — así se reflejan en HOY/AGENDA con el mismo pipeline. La lógica de timing por cronotipo va en `intervention-engine-core.ts`.

---

## Lo que necesitamos de vuelta antes de ejecutar Fase 1

**No es una nueva revisión mayor — solo tu OK con estos 3 matices:**

1. ✅ **Matiz #2 (intervenciones custom del user):** ¿Vas con `is_custom BOOLEAN` + `custom_definition JSONB` en `user_interventions`, o tienes mejor approach?
2. ✅ **Matiz #4 (padecimientos con episodios):** ¿Vas con 2 tablas normalizadas, o propones alternativa?
3. ✅ **Matiz #5 (BHA en sprint SUPS):** ¿El sprint SUPS lo tomas después de F4 (swap HOY/AGENDA) o en paralelo con F2/F3? Cowork sugiere paralelo con F5 (síntomas+padecimientos) — no depende del DX.

**Si tu respuesta es "va con esas 3", arrancas Fase 1 (migraciones 170-175).**

Si algo requiere debate, un peloteo corto y decidimos.

---

## Fuera del alcance del mapa (para tu conocimiento)

- **Merge conflict ONBOARDING vs HARDENING** (meet.tsx, notifications.tsx) sigue pendiente — cabo suelto independiente
- **Curación del catálogo por Mariana+Enrique** — en paralelo, no bloqueante para F1
- **Universales P1 finales** — Mariana confirma pantallas30min y ajusta si algo más

---

Confiamos en ti. Adelante con las 3 aclaraciones y arrancas.

— Cowork + Enrique
