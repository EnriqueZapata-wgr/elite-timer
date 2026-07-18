# 📦 MEGA BUZÓN Fable · post-hotfix 2da pasada

**De:** Enrique + Cowork
**Para:** Fable (CCF5)
**Fecha:** 2026-07-13 noche
**Contexto:** Hotfix 2da pasada mergeado + eas build en curso. Beta con testers reales pronto. Enrique se va a dormir. Este doc consolida TODO lo que puedes adelantar sin insumos humanos + lo que queda gated para retomar mañana.

**Filosofía:** avanzar y pulir en beta. Si algo roza doctrina no-negociable (fuga clínica, fármacos, rollback difícil), pausa y peloteo. Todo lo demás, adelante.

**Estado global:**
- Flag `INTERVENTIONS_DRIVE_HOY` sigue **OFF** — se activa después de 3ra pasada test post eas build
- Migraciones aplicadas: 170-193
- eas build corriendo (nativos + expo-print blindado)
- Beta 5-9 testers pronto

---

## 🔴 BLOQUE A · Micro-fix inmediato (Enrique aprobó ahora)

### A.1 Completar routing HOY → todos los hábitos al hub de su pilar

Enrique confirmó (2026-07-13 noche): TODOS los shortcuts de HOY deben ir al hub del pilar, NO acción directa. Consistencia UX total.

Faltantes que dejaste como estaban:
- `agua` → `/nutrition` (no directo al registro de agua)
- `suplementos` → `/supplements` (pilar rediseñado post-BHA)
- `ayuno` → `/nutrition` (o pilar ayuno si existe pantalla dedicada)
- `pasos` → `/fitness-hub` (no `/settings/pasos-config`)
- `sueño` → `/health-hub` (no `/reports`)

Aplicar en:
- `hoy-cards.ts`
- `day-compiler.ts` (`VERIFIED_ELECTRON_ROUTES` + `ELECTRON_ROUTES`)
- `HoyEditorialSection.tsx`

Micro-fix, seguramente <30 min. Push a mismo branch o nuevo `fix/routing-hoy-completo`.

---

## 🟢 BLOQUE B · Ejecutables sin insumos (adelanta esta noche/madrugada)

### B.1 Deuda: lazy loading de expo-sharing en `app/edad-atp/result-preview.tsx`

**Contexto:** Cowork detectó en audit del hotfix 2da pasada que `import * as Sharing from 'expo-sharing'` top-level sigue en ese archivo. Pre-existe al hotfix; no rompe hoy porque expo-sharing sí está en binario desde junio. **Prevención futura:** aplicar mismo patrón lazy que usaste en `labs-guide-service.ts` y `dx-pdf-service.ts` (require dentro try/catch con fallback).

Estimado: 15 min.

### B.2 Consolidar `supplement_scan` legacy con `user_supplements`

Enrique aprobó consolidar (decisión #39 del megabuzón anterior). Fable ya sabe cómo. 2 tablas parecidas post-BHA — reducir a 1. Preservar data existente vía migración con INSERT SELECT que filtre huérfanos (aprendizaje mig 177).

Requiere migración (siguiente número disponible: 194). Estimado: 2-3h.

### B.3 Persistencia DX transaccional (RPC `create_dx_version()`)

**Fable ya notó esto** — hoy son 2 statements no transaccionales (mark previous is_current=false + insert new). Bajo concurrencia rara (doble-tap simultáneo desde 2 devices), el índice único rechaza el segundo insert.

Fix: envolver en RPC `create_dx_version()` transaccional. Migración + actualizar `dx-engine.ts` para usar el RPC en vez de 2 statements. No bloquea beta pero es limpieza pre-scale.

Migración 195. Estimado: 2-3h.

### B.4 ARGOS `intervention_rationale` narrativa (V1.1 Pro opcional)

Nuevo `requestType` en `argos-proxy`. Recibe: DX vigente + intervenciones activas del user → devuelve narrativa human-friendly "por qué te sugerimos esto". El match es determinístico (core en TS), ARGOS solo agrega narrativa encima.

**Costo H+:**
- Pro: gratis (all-you-can-eat, coherente con doctrina Enrique)
- Base: 280 H+

**Nuevo requestType:** `intervention_rationale`
**Prompt sugerido:** system prompt con doctrina ATP + input = { dxVigente: {raíces, confianzas}, intervencionesActivas: [{nombre, cómo, beneficio, categorías, raíces}] } → output = narrativa markdown 200-400 palabras.

**UI:** botón en Card B "Mi Protocolo" → "¿Por qué estas intervenciones?" que trae el rationale del user. Cachear por hash del set de intervenciones (regenerar solo si cambia el set).

Migración: agregar seed `intervention_rationale` a `proton_action_costs` (280 H+). Estimado: 4-6h.

### B.5 Hub Comunidad real (`app/comunidad/index.tsx`)

Actualmente la card COMUNIDAD en Mi ATP redirige a `/comunidad/ranking` (hub de facto). Post-beta será ideal tener hub verdadero con:
- Feed de amigos (ya tienes tabla `activity_feed` + emit + whitelist estructural)
- Accesos a Ranking / Amigos / Buscar / Skool
- Social proof "N personas activas"

Convertir la ruta `/comunidad` (que hoy no existe) en pantalla con estos 4 elementos. La card Mi ATP mantiene su ruta pero apunta al nuevo hub. Es UX limpieza.

Estimado: 4-6h.

### B.6 Ranking pg_cron automatización (opción B post-beta)

Actualmente refresh lazy 1h con advisory lock anti-estampida (bueno para beta con testers 5-9). Post-scale es mejor cron automatizado.

Setup pg_cron job cada 1h ejecutando `refresh_electron_window_totals()`. Configuración documentada en migración. Solo se enciende cuando el traffic lo demande.

Migración 196. Estimado: 1-2h.

---

## 🟡 BLOQUE C · Gated por insumos humanos (esperan)

### C.1 N-Back Challenge implementación (V1.5 · 20-30h)

**Gated por decisiones Enrique (5 preguntas al final del spec).**

Spec técnico completo listo en `R and D/NBACK_CHALLENGE_SPEC_v1_2026-07-11.md`.

**Preguntas pendientes:**
1. N mínimo: 1 o 2 (Brain Workshop estándar es 2)
2. Timeout de respuesta: 3 seg o ilimitado
3. Auriculares obligatorios (copy required)
4. Modo daltónico (formas alternas)
5. Free tier N máx=3 o ilimitado

**Sugerencia si Enrique tarda:** procesa defaults razonables (2 · 3seg · sí auriculares · sí daltónico · free ilimitado). Cowork y Enrique validan después. Puedes arrancar el core+migraciones sin bloquear.

### C.2 Cableado imageBn cuando Enrique pushee assets MJ

Enrique está generando 10 imágenes en MJ (prompts en `R and D/PROMPTS_MJ_ASSETS_EDITORIALES_2026-07-13.md`). Cuando pushee los PNG, harás swap de referencias imageBn:

- `kit.tsx` línea 54 → `imageBn: require('@/assets/images/pillars/comunidad.png')`
- `health-hub.tsx` HEALTH_HUB_IMAGES:
  - `mi_protocolo`: nuevo asset (agregar entrada + require)
  - `diagnostico`: nuevo asset (agregar entrada)
  - `historia_clinica`: `require('@/assets/images/health-hub/historia-clinica.png')` (dedicado, no reutiliza tests-evaluaciones)
  - `sintomas`: `require('@/assets/images/health-hub/sintomas.png')` (dedicado)
  - `padecimientos`: `require('@/assets/images/health-hub/padecimientos.png')` (dedicado)
  - `labs_guide`: `require('@/assets/images/health-hub/labs-guide.png')` (dedicado, aunque puede reusar labs)

Estimado: 15-20 min una vez que estén los PNG.

### C.3 2da sesión curación Mariana (validar v3 + especialidades)

Enrique + Mariana. Validar los 19 ajustes v3 que Cowork aplicó + agregar intervenciones no cubiertas:
- Ciclo femenino (dominancia estrogénica, dismenorrea, SOP)
- Tiroides funcional
- Postparto
- Salud masculina (baja T, andropausia)
- Piel funcional
- Immune post-infección

Post-sesión: Cowork actualiza `interventions-catalog.ts` con las nuevas + firma clínica final de las 12 pending en `CLINICAL_VALIDATION_PENDING`.

### C.4 Meet ARGOS · REESCRITURA WOW

Enrique redacta el copy con sensación WOW (nota doc 06 review). Cuando pase el copy, Fable lo aplica a `app/argos/meet.tsx`.

### C.5 Protocolo Ayuno Sardinas

Enrique tiene el detalle, lo pasa. Cowork lo integra al catálogo (placeholder ya existe con key `protocolo_ayuno_sardinas` en `interventions-catalog.ts`).

---

## 🚀 BLOQUE D · Track C pre-launch (después de 3ra pasada test)

Todos son de Enrique (setup) + Cowork (docs):

### D.1 Sentry sourcemaps upload
```
npx sentry-expo-upload-sourcemaps dist
```
Debug con stack traces legibles.

### D.2 SQL boost testers H+
Script en `Business development/Beta_Launch_Kit/05_SQL_BOOST_TESTERS.md`. Ejecutar SQL en Supabase con los 5-9 emails reales.

### D.3 Runbook launch actualizado
`07_RUNBOOK_SABADO_LAUNCH_DAY.md` — actualizar con DX+Intervenciones+Comunidad+BHA+Fitzpatrick (Cowork puede escribir borrador; Enrique valida).

### D.4 Comms testers + invite Skool
`08_COMMS_POSTBETA_TEMPLATES.md` — refinar con doctrina nueva. Enviar a 5-9 testers.

### D.5 Grupo Skool cerrado + URL final
Crear grupo cerrado Skool para 5-9 testers primero. Cuando haya presupuesto Enrique paga premium y cambia URL. `SKOOL_URL` en `brand.ts` es 1 línea de cambio.

### D.6 Activar flag INTERVENTIONS_DRIVE_HOY = true
Momento fuerte de beta v1. Después de 3ra pasada limpia. Cambio en `src/constants/flags.ts` + commit + push + OTA.

---

## 🔮 BLOQUE E · Roadmap V1.5 (no bloquea beta, para tener en radar)

- **E.1** ARGOS `sintomas_pattern` detection — patrones en síntomas aislados agregados
- **E.2** ARGOS `cross_parameter` analysis — correlación multi-parámetro labs (gated docs research Mariana)
- **E.3** Vigencia inteligente labs por parámetro (gated docs research Mariana)
- **E.4** Comunidad V1.5 · retos con inscripción + auth bridge Skool automático + sugerencias amigos avanzadas
- **E.5** BHA V2 · base crowd-sourced + comparativo productos
- **E.6** Coach Proactivo módulo · dogfood Enrique primero
- **E.7** Grabaciones audio custom binaurales + NSDR (V1 usa TTS fallback)

---

## 📊 Priorización sugerida (Fable ordena si quiere)

**Sprint HOY noche (paralelo Enrique dormido):**
1. A.1 Micro-fix routing HOY completo (30 min)
2. B.1 Deuda expo-sharing lazy (15 min)
3. B.2 Consolidar supplement_scan legacy (2-3h)

**Sprint 6 (mañana):**
4. B.3 Persistencia DX transaccional
5. B.4 ARGOS intervention_rationale

**Sprint 7 (cuando lleguen insumos):**
6. B.5 Hub Comunidad real
7. C.2 Cableado imageBn (post assets Enrique)

**Sprint 8-10:** N-Back (C.1) + Mente V1.5 features

---

## 🤝 Reglas de colaboración

- **Cowork audita cada branch antes del merge.** Sigue con el patrón de audit exhaustivo (backfills contra huérfanos + palabras reservadas + anti-leak clínico + patrones lazy para módulos nativos).
- **Enrique aprueba merges + hace db push + eas build/update.**
- **Si algo roza doctrina no-negociable:** pausa y peloteo.
- **Nunca pushes al remoto SQL sin audit Cowork.**

**Doctrinas activas (recordatorio):**
- Cero fuga clínica en comunidad (invariante)
- Delfín NO es cronotipo (León/Oso/Lobo + estado transitorio a sanar)
- Suplementos NO son intervención (registro)
- BPC no rompe ayuno metabólico (flag: dieta >20% carbs)
- Recordatorios leen de agenda user, no cronotipo puro
- Extras: módulos nativos requieren eas build no OTA (aprendizaje expo-print)

---

**Confiamos en ti. Enrique retoma mañana.**

— Enrique + Cowork
