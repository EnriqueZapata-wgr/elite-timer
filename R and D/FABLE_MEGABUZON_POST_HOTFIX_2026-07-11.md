# 📦 MEGA BUZÓN Fable · post-hotfix beta v1

**De:** Enrique + Cowork
**Para:** Fable (CCF5)
**Fecha:** 2026-07-11 22:00 CDMX
**Contexto:** OTA de beta v1 shippeada. Test #1 de Enrique en device reveló bugs (hotfix corriendo). Este doc consolida **TODO lo pendiente** post-hotfix — bugs secundarios, follow-ups declarados, roadmap V1.1, y hardening. Fable ordena por prioridad y ejecuta cuando termine el hotfix actual.

**Filosofía:** avanzar y pulir en beta. Si algo roza doctrina no-negociable (fuga clínica, fármacos, rollback difícil), pausa y peloteo. Todo lo demás, adelante.

---

## 🚨 BLOQUE 0 · HOTFIX EN CURSO (ya enviado — mencionar solo si Fable no recibió)

*(Ya en el prompt anterior — omitir si Fable ya lo recibió)*

- ARGOS DX generation error
- ARGOS chat streaming truncado
- Hub Comunidad sin entry point → Card en Mi ATP (Cowork lo hizo ya en local, va con el próximo push)
- Botón Skool del footer HOY → **Cowork lo removió ya** (va con el próximo push)
- Historia Clínica todo dentro de card
- Card A DX no muestra "el primero es gratis"
- Reacciones ARGOS al completar hábitos no visibles
- Chat ARGOS sin internet: botón SEND sin feedback
- Cardio +4.5 electrones (peso oficial 2.5) — verify doble-award

---

## 🛡️ BLOQUE 1 · HARDENING pre-launch (crítico seguridad)

### 1.1 Validar server-side `dx_generation_first` (task #23)
Cliente actualmente elige el `requestType`. Un cliente malicioso o buggy puede spamear `dx_generation_first` (0 H+) y saltarse el cobro de 1000 H+.

**Fix:** en `argos-proxy`, cuando el requestType es `dx_generation_first`, verificar server-side que `functional_dx WHERE user_id = X AND is_current = true` esté vacío. Si ya existe DX → forzar el request al tipo `dx_generation` regular (cobra 1000 H+).

### 1.2 Frases canónicas errores ARGOS en system prompt (task #24)
De los 4 errores del doc 06 Mariana, solo 1 vive como string en código. Los otros 3 los genera el LLM en vivo → riesgo de voz inconsistente en tema clínicamente sensible.

**Fix:** inyectar las 3 frases restantes como parte del system prompt de ARGOS (canonical error phrasing). Copy exacto:
- Sin datos suficientes: "Todavía no te conozco lo suficiente. Sigue registrando hábitos y datos."
- Pregunta médica específica: "Eso es tema de tu médico o nutricionista clínico, {nombre}. Yo no diagnostico."
- Usuario frustrado: "Lamento la frustración. Estoy aquí para ayudarte, intentemos de nuevo."

---

## 📱 BLOQUE 2 · COMUNIDAD follow-ups V1.1

### 2.1 Push notif de solicitud de amistad recibida (task #19)
Actualmente C2 no envía push cuando alguien te manda friend request. Sale solo cuando abres la app.

**Fix:** hook al insert en `friendships` con `status='pending'` + emit push al `addressee_id`.

### 2.2 Panel de revisión manual de user_reports (task #18)
C2 solo tiene auto-hide con 3 reports. Falta panel admin para revisión manual — necesario para tomar decisiones sobre reports acumulados en `status='open'`.

**Fix:** pantalla admin (gated por role) para listar reports abiertos, ver contexto (`reason`, `context`, `detail`), y accionar (`reviewed` / `actioned` / `dismissed`).

### 2.3 Ranking scope week/month (follow-up C4)
Actualmente solo `all_time`. Semana y mes requieren tabla agregada no-clínica dedicada (Fable ya notó esto).

**Fix:** materialized view `electron_totals_by_window` con RLS solo lecturas via RPC SECURITY DEFINER. Job semanal para refrescar.

### 2.4 day_complete al feed (post-F4)
El evento fue diferido en decisiones §11 (fuera de v1). Ahora que F4 está mergeado y `adherence-service` es fuente estable, puede entrar.

**Fix:** hook a compleción de día (100% ATP Score) → emit `activity_feed` con event_type `day_complete`. Whitelist ya lo permite.

---

## 🧬 BLOQUE 3 · DX + Intervenciones follow-ups

### 3.1 Persistencia DX transaccional (Fable ya notó)
La persistencia del DX son 2 statements (mark previous is_current=false + insert new). Bajo concurrencia rara (doble-tap simultáneo desde 2 devices), el índice único rechaza el segundo insert.

**Fix:** envolver en RPC transaccional `create_dx_version()`. No bloquea beta pero es limpieza pre-scale.

### 3.2 Swap del catálogo v3 real
Cowork YA convirtió el catálogo v3 curado por Enrique a `interventions-catalog.ts` (85+ entradas, vocab extendido). Está en main. Fable solo debe verificar que el motor use el catálogo actualizado sin problemas.

**Fix:** validar que el motor `intervention-engine-core.ts` corre bien con las 85 intervenciones + `CLINICAL_VALIDATION_PENDING` (8 requieren firma Mariana antes de que el motor las sugiera activamente).

### 3.3 ARGOS `intervention_rationale` (V1.1 Pro-only)
Función que ARGOS explica "por qué te sugerimos estas intervenciones". Determinístico primero, narrativa human friendly encima. Opcional para Pro.

**Fix:** nuevo requestType `intervention_rationale`, prompt específico que recibe DX + intervenciones sugeridas y devuelve narrativa. Cobrar 280 H+ o gratis Pro.

### 3.4 ARGOS `sintomas_pattern` detection (V1.5)
Cuando el user acumula síntomas aislados, ARGOS detecta patrones. Ya está en el mapa técnico Fable §5 (pendiente F5 síntomas).

### 3.5 Vigencia inteligente labs (V1.5 post-research Mariana)
Vigencia por parámetro (antígeno prostático 1 año, TG 3 meses si alterado, etc.). Mariana proveerá docs research después. Modelar `vigencia_days` en `lab_parameter_meta`.

---

## 💊 BLOQUE 4 · SUPLEMENTOS + BHA (post-Fase 5)

### 4.1 Rediseño sección suplementos
Doctrina: **suplementos son REGISTRO, no recomendación.** Ya en memoria. Pendiente aplicar:

- Biblioteca vacía por default (user crea sus fichas)
- Copy visible: "Esto es tu registro. No es recomendación. Es responsabilidad de quien te lo indicó."
- Ficha: nombre + marca + forma + dosis + sello BHA (si escaneado)
- Multi-dosis por día (Vit C 3× día = 1 supp con 3 tomas)
- Máscara EMBARAZO: alert enorme "revisa TODO con tu nutriólogo clínico"

### 4.2 Scanner BHA (Biohacker Approved)
Sello binario ✅/❌ para suplementos y comida. **NO requiere librería precurada** — solo LLM + OCR con criterios de Mariana (colorantes, formas premium/baja calidad, endulzantes, conservantes).

**Fix:** nuevo requestType `bha_scan` en `argos-proxy` multi-modal (imagen + texto). Criterios completos en memoria `project_biohacker_approved_bha_scanner`. Costo H+ 500-1000 por scan.

---

## 🩺 BLOQUE 5 · SALUD nuevas secciones (F5 pendiente)

### 5.1 Sección Síntomas Aislados
Tabla `clinical_symptoms_aislados` (ya migrada). Pantalla nueva `app/salud/sintomas.tsx` con quick-tap chips + input libre. Timeline vertical.

### 5.2 Sección Padecimientos
2 tablas normalizadas (`padecimientos` + `padecimiento_episodios` — ya migradas). Pantalla nueva `app/salud/padecimientos.tsx` con formulario ligero.

### 5.3 Cuestionario Fitzpatrick en levantamientos (task #7)
6 preguntas dermatológicas estándar para tipar piel I-VI. Alimenta la personalización de la intervención `exposicion_solar_matutina`. Cowork investiga las 6 preguntas y las pasa.

---

## 🧠 BLOQUE 6 · MENTE features nuevas (V1.5)

### 6.1 N-Back Challenge (task #6 · Cowork investiga)
Feature grande de working memory (Jaeggi 2008). Progresión infinita en N. **Cowork investiga apps de referencia** (Dual N-Back Pro, Brain Workshop) y prepara spec preliminar antes de pedirle a Fable.

### 6.2 Frecuencias binaurales
4 modalidades (delta/theta/alpha/beta) para diferentes objetivos. Necesita módulo Mente con reproductor de audio + timer.

### 6.3 NSDR + Yoga Nidra
Grabaciones guiadas 10 min y 20-30 min. Necesita módulo Mente con biblioteca de audios.

---

## 🎯 BLOQUE 7 · TRACK C · pre-launch beta (cuando esté todo estable)

- Sentry sourcemaps upload (`npx sentry-expo-upload-sourcemaps dist`)
- Test end-to-end en device (iOS + Android) — Cowork + Enrique
- SQL boost testers (`Business development/Beta_Launch_Kit/05_SQL_BOOST_TESTERS.md`)
- Runbook launch day actualizado con DX+Intervenciones+Comunidad
- Comms testers (`08_COMMS_POSTBETA_TEMPLATES.md`) + invite a Skool
- Grupo cerrado Skool activo con URL final
- OTA push `eas update --branch preview` con mensaje "beta v1 final"
- Activar flag `INTERVENTIONS_DRIVE_HOY = true` cuando Enrique confirme en device que todo va bien

---

## 🧹 BLOQUE 8 · Limpieza técnica pre-launch

### 8.1 Regenerar tipos expo-router (task #25)
Los 8 casts `as any` en `/comunidad/*` son placeholder. Correr `npx expo start` un momento, esperar "Restored expo-router types", Ctrl+C, quitar los 8 casts, commit.

### 8.2 Podar worktrees viejos (task #20)
`dx-f2` y `comunidad-c4` ya mergeados. `git worktree remove` los limpia.

### 8.3 Actualizar SDK Supabase CLI
Enrique tiene 2.102.0, hay 2.109.1. `npm i -g supabase` para actualizar.

---

## 📋 BLOQUE 9 · Pendientes humanos (no de Fable)

*(Enrique + Mariana — para awareness)*

- Task #8 Enrique pasa Protocolo Ayuno de Sardinas → Cowork lo integra al catálogo
- Task #9 2da sesión curación Mariana → validar v3 + agregar ciclo/tiroides/postparto/piel/inmune
- Task #5 Universales P1 confirmación con Mariana

---

## 🎯 ORDEN SUGERIDO POR FABLE

**Sprint 1 (post-hotfix):** Bloque 1 · Hardening pre-launch (1.1 + 1.2)
**Sprint 2:** Bloque 3.2 · Verify catálogo v3 real corriendo bien + Bloque 5 · Síntomas + Padecimientos + Fitzpatrick
**Sprint 3:** Bloque 4 · Suplementos rediseño + BHA scanner
**Sprint 4:** Bloque 2 · Comunidad follow-ups (2.1 + 2.2 + 2.3)
**Sprint 5:** Bloque 6 · Mente V1.5 (después de Cowork spec de N-Back)

**Fase C launch:** cuando estemos listos.

---

*Fable ordena si quiere. Cowork audita cada entrega. Enrique aprueba merges + Enrique aplica db push.*

*Cero fuga clínica es el invariante. Delfín NO es cronotipo. Suplementos NO son intervención. BPC no rompe ayuno metabólico. Recordatorios leen de agenda del user, no de cronotipo puro.*

*Confiamos en ti. Adelante.*

— Enrique + Cowork
