# 📱 Bitácora ATP v1 · agrupada por pantalla

**Uso:** cuando abras pantalla X, todo lo que está pasando ahí.
**Última actualización:** 2026-07-11 23:00 CDMX · post hotfix v1 (bug thinking Sonnet 5 fixeado + 4 bugs forense).

**Leyenda:**
- ✅ Shipped en main + Supabase remoto
- 🚧 Fable ejecutando ahora
- 📋 Pendiente humano (tú o Mariana)
- 🔮 Roadmap declarado (v1.1 / v1.5 / v2)

---

## 📊 Estado global v1 (post hotfix)

**Migraciones aplicadas:** 170-186 · Todas Applied en remoto.
**Ramas mergeadas hoy:** F1, F2, F3, F4, C1, C2, C4, C5, Polish + 3 hotfixes.
**Flag INTERVENTIONS_DRIVE_HOY:** ⚠️ **OFF por default** — se activa cuando Enrique confirme test en device tras el hotfix.
**Universales P1 fallback:** 7 en catálogo (hidratación · solar Fitzpatrick · pantallas off · dormir 60min · comer · grounding · respiración nocturna).
**Catálogo intervenciones:** 85+ entradas v3 curadas Enrique en producción.

---

## 🏠 HOY · `app/(tabs)/index.tsx`

- ✅ F4 completo — feature flag `INTERVENTIONS_DRIVE_HOY` con doble-lectura shipped
- ✅ Card social proof `<CommunityPresence pillar="hoy"/>` shipped
- ✅ Toast reacciones al completar hábitos (2.5s, atribución "+X ⚡ Nombre") — hotfix
- ✅ Botón "Únete a la Tribu ATP" del footer removido — hotfix
- ✅ Regalo del 1er DX gratis vía `dx_generation_first` (0 H+) — F4
- 🔮 Activar flag `INTERVENTIONS_DRIVE_HOY = true` cuando Enrique confirme test post-hotfix
- 🔮 Overhaul agenda condensable post-beta (Enrique: "agenda infinita, hay que condensar")

---

## 📅 AGENDA · `app/agenda.tsx`

- ✅ `generateAgendaEvents` lee intervenciones activas con source='intervention' — F4
- ✅ Timing por cronotipo LEÓN/OSO/LOBO (3, no 4 — delfín estado a sanar) — F4
- ✅ Pipeline notificaciones intacto (intervenciones heredan push gratis) — F4
- ✅ Fix forense Fable: `user_chronotype.wake_time/sleep_time` (era `schedule` inexistente) — timing circadiano NUNCA había funcionado y ahora sí
- ✅ Migración 185 · `agenda_events.source` para distinguir 'intervention' de protocolo

---

## 🩺 SALUD · Historia Clínica / Diagnóstico

### Card A: Mi Diagnóstico Funcional · `app/salud/diagnostico/index.tsx`

- ✅ Pantalla + badge nivel 1-5 didáctico — F2
- ✅ Timeline de versiones (append-only) — F2
- ✅ Botón "Actualizar mi Diagnóstico" (Base: 1000 H+ · Pro: auto) — F2
- ✅ Prompt `dx_generation` clínicamente seguro (no diagnóstica, no receta) — F2
- ✅ Cosecha 8 fuentes fail-soft — F2
- ✅ Conexión con motor intervenciones — F3
- ✅ Regalo 1er DX gratis (`dx_generation_first`, migración 186) — F4
- ✅ **HOTFIX bug thinking Sonnet 5:** DX generation ya no truena (el modelo devuelve bloques thinking por default, `content[0].text` daba undefined). Fix: helper `extractResponseText` migrado a 20 call sites. max_tokens 2000→8000.
- ✅ **HOTFIX bug precedencia ternario:** Card A ahora muestra "Regalo · sin costo de H+" también para Pro (antes evaluaba tier antes que isFirstFree)
- 🔮 Hardening V1.1: validar server-side `dx_generation_first` (cliente elige requestType — riesgo abuso)

### Card B: Mi Protocolo · `app/salud/mi-protocolo/index.tsx`

- 🚧 Fable ejecuta ahora (DX F3)
- 🚧 Lista jerarquizada semáforo 🔴🟡🟢
- 🚧 Sin límite de activación (user decide)
- 🚧 Filtros por categoría y raíz
- 🚧 Info científica embed
- 📋 Cowork pasa catálogo v3 real (59 intervenciones curadas) a TypeScript cuando F3 termine

### Levantamientos · `app/historia-clinica/*`

- ✅ Choncho integral extendido con 10 sub-áreas — F2
- ✅ 9 áreas: digestiva · sueño · piel · metabólica · hormonal (H y M) · inflamación · nutricionales · heredo-patológicos · inmunológica — F2
- ✅ **HOTFIX:** 7 sistemas funcionales ahora dentro de card contenedora (Enrique: "no widgets sueltos")
- ✅ **Cuestionario Fitzpatrick** — spec técnico completo en `R and D/CUESTIONARIO_FITZPATRICK_v1_2026-07-11.md` (6 preguntas + scoring I-VI + dosis solar + integración TS). Listo para Fable integrar en Bloque 5.
- 📋 Copy review con Mariana (doc 06) parcialmente aplicada (reacciones + errores + disclaimers). Meet ARGOS reescritura WOW pendiente.

### Síntomas Aislados (nuevo) · `app/salud/sintomas.tsx`

- 🔮 Fable F5. Tabla separada `clinical_symptoms_aislados` (por audit anti-legacy)
- 🔮 Quick-tap chips + texto libre
- 🔮 Peso BAJO en DX (patrón en agregado)

### Padecimientos (nuevo) · `app/salud/padecimientos.tsx`

- 🔮 Fable F5. **2 tablas normalizadas** (definición + episodios recurrentes)
- 🔮 "Gripes 6× al año" cuenta en episodios
- 🔮 `duration_days GENERATED` para queries limpias
- 🔮 Peso ALTO en DX

### Labs

- ✅ Ya existía sistema base
- ✅ Fix forense Fable: `food_logs.score` no existe → usa `daily_nutrition_scores` (reporte nutrición salía en ceros y NADIE lo había visto)
- 🔮 Vigencia inteligente por parámetro (V1.5, post-docs research Mariana)
- 🔮 Cross-parameter analysis (V1.5)

### Biblioteca de protocolos (rol nuevo)

- 🔮 F4: protocolos precargados bajan a biblioteca de referencia (no borrar)
- 🔮 Expandible a viajes, jet-lag, retiros

---

## 🥗 NUTRICIÓN · `app/nutrition.tsx`

- ✅ Card social proof: `<CommunityPresence pillar="nutrition"/>` "N registrando comida ahora"
- 🔮 Refuerzo copy anti-recomendación en suplementos
- 🔮 CTA BHA scanner en pilar Nutrición

---

## 💊 SUPLEMENTOS · `app/supplements.tsx`

- 🔮 Fable F5 rediseño completo
- 🔮 Biblioteca vacía por default (user crea sus fichas)
- 🔮 Copy: "Esto es tu registro. No es recomendación de ATP."
- 🔮 Ficha: nombre + marca + forma + dosis + sello BHA
- 🔮 Multi-dosis por día (Vit C 3× día = 1 supp con 3 tomas)
- 🔮 Máscara EMBARAZO: alert enorme "revisa TODO con nutriólogo clínico"

### BHA Scanner (feature killer)

- 🔮 F5. LLM + OCR con criterios de Mariana (colorantes, cianocobalamina vs metilcobalamina, etc.)
- 🔮 Cero librería precurada (solo prompt)
- 🔮 Sello binario ✅/❌ · sin scores
- 🔮 Costo H+ por scan (500-1000 estimado)

---

## 🧘 MENTE · `app/mente/*`

- ✅ Card social proof "N escuchándose ahora"
- 📋 Copy review con Mariana (check-in emocional 10 prompts)
- 🔮 Journal AM/PM ajustable
- 🔮 NSDR/Yoga Nidra grabaciones guiadas
- 🔮 Frecuencias binaurales (delta/theta/alpha/beta) — feature nueva
- 🔮 **N-Back Challenge** — feature grande V1.5 (Cowork investiga referencias)

---

## 💪 FITNESS / MOVIMIENTO · `app/fitness/*`

- ✅ Card social proof "N moviéndose hoy"
- ✅ Fix forense Fable: `personal_records.achieved_at` (era `date` inexistente) + `exercise_logs.logged_at` (era `date` inexistente) + `routines.creator_id` (era `user_id` inexistente) — stats semanales fitness estuvieron SIEMPRE en 0 y nadie sabía
- 🔮 Tracking death hang (colgar) 30-90s
- 🔮 Tracking farmer's walk
- 🔮 Meta pasos 8-12k
- 🔮 Zona 2 aeróbica 2-3×/sem
- 🔮 VO2max training (con caveat calentamiento)
- 🔮 Levantamiento pesado compuesto

---

## 🌐 COMUNIDAD (sección nueva completa)

### Entry point · Mi ATP (tab kit)
- ✅ **HOTFIX:** Card COMUNIDAD 🤝 gradient azulado (#7F77DD → #5B9BD5) como 3ra card en Mi ATP (Enrique test detectó hub sin entry point) — Cowork+Fable
- ✅ Route → `/comunidad/ranking` (hub de facto; `app/comunidad/index.tsx` NO existe, deuda post-beta)

### Ranking · `app/comunidad/ranking.tsx`
- ✅ Top 20 + tu posición (RPC `get_leaderboard` + `get_my_leaderboard_position`) — C4
- ✅ Scope all_time (week/month roadmap follow-up con vista agregada)
- ✅ Header con acceso a Amigos + buscador

### Amigos · `app/comunidad/amigos.tsx`
- ✅ Lista amigos + solicitudes pendientes bidireccional (accept/decline) — C2
- ✅ Migración 182 `friendships` con LEAST/GREATEST edge único

### Buscar · `app/comunidad/buscar.tsx`
- ✅ Buscador con rate-limit 20/60s server-side + espejo cliente — C2
- ✅ Solo lee `user_profile_public` (cero fuga clínica invariante)
- ✅ Anti-enumeración

### Perfil público · `app/comunidad/perfil/[userId].tsx`
- ✅ Perfil de otro user con flags respetados server-side — C2
- ✅ NUNCA visible: DX · intervenciones · síntomas · labs · suplementos · ciclo · journal · mood (guard estático anti-leak sobre migración)
- ✅ Block/report con auto-hide a los 3 reports (constante configurable "subir a 5-10 post-scale")

### Feed · `app/comunidad/feed.tsx`
- 🔮 C3: timeline actividad amigos + kudos 🔥👏💪
- 🔮 Whitelist estructural CHECK: `badge_earned` · `streak_milestone` · `rank_up` · `fitness_pr`
- 🔮 `day_complete` post-DX F4 (V1.1)

---

## ⚙️ SETTINGS · `app/settings/*`

### Settings Comunidad · `app/settings/comunidad.tsx`
- ✅ Fable C1: toggles granulares de visibilidad (9 flags)
- ✅ Botón "Únete a Tribu ATP" (Skool bridge)
- ✅ Constante `SKOOL_URL` en `brand.ts` (cambio 1 línea cuando pagues premium)

### Notificaciones
- ✅ Push registration (ya existía)

---

## 🤖 ARGOS · Meet ARGOS + interacciones

### Meet ARGOS 5 pantallas · `app/argos/meet.tsx`
- ✅ 5 pantallas cinemáticas
- ✅ Copy compliance IA "Impulsado por IA" (no "asistente humano")
- ✅ Copy "hablas con tu nutriólogo clínico"
- ✅ Pantalla 5: botón Skool bridge — C5
- 📋 Meet ARGOS REESCRITURA con sensación WOW pendiente Enrique (nota del doc 06 review)

### RateLimitCard
- ✅ Copy "O si prefieres hablar con humanos ahora mismo, la Tribu está en Skool" — C5

### Prompts ARGOS
- ✅ `dx_generation` (1000 H+ manual) — F2
- ✅ `dx_generation_first` (0 H+ regalo primer DX) — F4
- ✅ **HOTFIX helper `extractResponseText`** en 20 call sites (bug thinking Sonnet 5)
- ✅ **HOTFIX max_tokens caps subidos** (chat 1024→4000, insight 200→2000, weekly 400→2000, DX 2000→8000)
- 🔮 `intervention_rationale` (Pro opcional, V1.1)
- 🔮 `sintomas_pattern` (V1.5)
- 🔮 `cross_parameter` (V1.5)
- 🔮 Hardening: `argos-proxy` valida server-side que `dx_generation_first` solo se acepta si `functional_dx` está vacío (evita abuso cliente-elegido)
- 🔮 Frases canónicas errores en system prompt (los 3 errores de Mariana que hoy genera el LLM en vivo)

### Chat ARGOS
- ✅ **HOTFIX streaming truncado fixeado** (mismo bug thinking Sonnet 5, cap 1024 incluía thinking)
- ✅ **HOTFIX offline detection:** ping fail-fast 2.5s → burbuja "Se me fue la señal, {nombre}" + botón send en ámbar

### Reacciones ARGOS al completar hábitos
- ✅ **HOTFIX toast 2.5s** tras cada electrón con reacción Mariana + atribución "+X ⚡ Cardio". Ráfagas <2s se colapsan sumadas.

### Check-in emocional
- ✅ Bridge Skool condicional cuando mood <4 × 3 semanas — C5

---

## 🎬 ONBOARDING · `app/onboarding/*`

- ✅ ONBOARDING épico ya mergeado (splash + copy + progreso + celebración)
- ✅ Meet ARGOS integrado
- ✅ HARDENING analytics (11 eventos)
- 📋 **Cuestionario Fitzpatrick** (6 preguntas) — nuevo, se agrega a levantamientos onboarding

---

## 🧪 TESTS DE SALUD (Braverman + quizzes)

- ✅ Braverman existente (funciona)
- ✅ 5 quizzes funcionales existentes
- 📋 Agregar Fitzpatrick como nuevo quiz de piel (6 preguntas)

---

## ♀️ CICLO (con máscara Embarazo)

- No lo hemos tocado en esta sesión
- 🔮 Sensibilidad extra visuals + copy (memoria)
- 🔮 Fase folicular / lútea influye en intervenciones sugeridas (V1.1)

---

## 🎯 CABOS SUELTOS TUYOS (no atados a pantalla)

- 📋 **Pasar Protocolo Ayuno Sardinas** a Cowork (para modalidad C4 catálogo)
- 📋 **Confirmar URL Skool** + grupo Tribu ATP activo (para bridge posterior)
- 📋 **Decisión BHA marketing** (V1 "próximamente" vs esperar)
- 📋 **2da sesión con Mariana** para validar v3 catálogo + agregar sus especialidades

---

## ✅ PRE-LAUNCH BETA (post-todo lo demás)

- 🔮 Sentry sourcemaps upload
- 🔮 Test device end-to-end
- 🔮 SQL boost testers (grant H+)
- 🔮 Runbook launch day actualizado con DX
- 🔮 Comms testers + invite a Skool
- 🔮 OTA push `eas update --branch preview`

---

*Documento vivo. Actualizado 2026-07-11 19:30. Se refresca cuando Fable termine cada sprint.*
