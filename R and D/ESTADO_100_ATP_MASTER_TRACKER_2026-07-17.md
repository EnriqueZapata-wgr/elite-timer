# 🗺️ ESTADO 100% ATP · MASTER TRACKER hacia "app completa"

**Fecha:** 2026-07-17 · **Versión base:** v1.2.x (89 pantallas, ~68K líneas, 430+ commits, 0 errores TS)
**Meta beta:** soft launch 1 agosto 2026 (5-9 testers + afiliados) · **Meta app 100%:** v2.0.0 (jul-ago 2026 → stores)
**Propósito:** UN solo mapa del 100% del estado de la app — hecho / en curso / pendiente — para que NADA se olvide.

**Fuentes sintetizadas:** `TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md` · `ROADMAP_BETA_CONSOLIDADO_2026-07-16.md` · `AUDITORIA_RONDA2_CODIGO_2026-07-17.md` · `AUDITORIA_RONDA2_WEB_2026-07-17.md` · `FABLE_BATCH_1..4_*_2026-07-17.md` · deliveries Mega-Sprint A-E · TRACK C infra · task list Cowork (#1-#140) · bugs nuevos de Enrique (2026-07-17).

**Leyenda estado:** ✅ hecho y en vivo · 🔨 en curso / parcial · ⬜ pendiente
**Leyenda prioridad:** **P0** beta-blocker · **P1** alto · **P2** medio · **P3** pulido · **PB** post-beta (v1.5/v2)

---

## 1. RESUMEN EJECUTIVO

### 1.1 % de avance estimado por módulo

| Módulo | Hacia BETA | Hacia APP 100% | Qué falta (titular) |
|---|---|---|---|
| **Infra / Deploy** | 🔨 85% | 75% | **P0: SPA fallback Vercel (404 en refresh)** · TRACK C (Sentry, Skool, comms) |
| **Design System ATP** | ✅ 90% | 70% | Barrido final de pantallas pelonas · vacíos negros · **LIGHT mode (0%)** |
| **HOY** | 🔨 80% | 75% | Cards meditación/journal desaparecidas · "Ajustar protocolo" feo · teclado tapa inputs |
| **Agenda** | ✅ 85% | 80% | Dedup semántico residual · eventos pasados sin estado · notifs device retest |
| **YO** | 🔨 75% | 70% | Regresar Edad ATP como 1er dato · cronotipo Delfín temporal |
| **Cuestionario Maestro** | ✅ 90% | 85% | Validación final preguntas con Mariana · Fitzpatrick Tipo5/4 dup |
| **Salud Funcional** | ✅ 85% | 75% | Mi Expediente snake_case · auditoría completa qué sirve/qué no |
| **Nutrición / Suplementos** | 🔨 55% | 55% | **Multi-toma AM+PM · scan→plan+BHA · dropdown trabado · link agenda** · hidratación pelona |
| **Mente** | 🔨 65% | 55% | **Audio (ElevenLabs) meditación/respiración** · N-Back UI · check-in "@" |
| **Fitness** | 🔨 35% | 40% | **REBUILD completo** · rename Explorar→Fitness · timer rápido roto · cardio routing |
| **ARGOS** | 🔨 70% | 60% | Level-up personalidad (Jarvis) · Meet ARGOS reescritura WOW · migrar Sonnet 4-6 |
| **Ciclo / Embarazo** | ✅ 80% | 70% | No auditable (cuenta masculina) · módulo embarazo máscara pendiente pulido |
| **Onboarding** | ✅ 80% | 75% | Meet ARGOS WOW · welcome tour post-pago |
| **Notificaciones** | 🔨 75% | 70% | Path local funcionando · toast pegajoso (P3) · device retest |
| **Backend Fx (clínico)** | ⬜ 5% | 15% | Track dedicado post-cliente · 24 requerimientos Mariana |

### 1.2 % AVANCE GLOBAL ESTIMADO

- **Hacia BETA soft-launch (1 ago):** **~78%** — la base está sólida; falta 1 P0 de infra + integrar los bugs nuevos de Enrique en 3-4 batches congruentes.
- **Hacia APP 100% (v2.0):** **~62%** — Fitness rebuild, audio Mente, LIGHT mode, ARGOS Jarvis, Backend Fx y V1.5 (N-Back, coach proactivo, wearables) son el grueso restante.

### 1.3 Qué separa "beta" de "app 100%"

**Para BETA (1 ago) basta con:** matar el 404 (P0), integrar los bugs nuevos de Enrique (teclado, home button, suplementos multi-toma+scan, fitness básico navegable, cards HOY meditación/journal de vuelta, Edad ATP en YO), y cerrar Edad ATP invertida. Fitness full-rebuild, audio Mente, ARGOS personality y LIGHT pueden ir en la 1ª actualización post-soft-launch sin matar el beta (decisión ya tomada en el triage).

**Para APP 100% falta además:** Fitness reconstruido de raíz, audio real en Mente, LIGHT mode, ARGOS nivel Jarvis, ATP Sleep Track, N-Back V1.5, Backend Fx clínico, comunidad V1.5, wearables/multimodal/genética (v1.5-v2, NO se venden aún).

---

## 2. TRACKER POR ÁREA / MÓDULO

> Cada ítem: **estado · prioridad · origen**. "Origen" = de qué doc/task/bug viene.

### 2.1 INFRA / DEPLOY / DESIGN-SYSTEM (transversal)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Design system ATP `brand.ts` (teal+amarillo+gradientes, lime-brutalist muerto como doctrina) | ✅ | — | Batch 3 · audit ronda2 código |
| Molde editorial (`EditorialCard` + Mis Datos) aplicado a mayoría de pantallas | ✅ | — | Batch 3 · Mega-Sprint A/B |
| Imágenes MJ estilo OURA cableadas (fondos + agenda + destinos) | ✅ | — | Mega-Sprint C · #132 |
| TRACK C infra base (flags, playbooks) | ✅ | — | FABLE_TRACK_C_INFRA |
| **404 crudo de Vercel en refresh/deep-link (falta SPA fallback en `vercel.json`)** | ⬜ | **P0** | Audit ronda2 web · P0-1 |
| "Navy SEALs" en 2 campos `benefit` user-facing (`interventions-catalog.ts:3320,:3541`) | ⬜ | **P1** | Audit ronda2 código · doctrina #140 |
| Morado off-brand `#7c3aed` en `chronotype.tsx:29` | ⬜ | P2 | Audit ronda2 código |
| Vacíos negros al fondo de sub-pantallas (Fitness, Evaluaciones, Hidratación) | ⬜ | P2 | Audit ronda2 web · P2-4 |
| Lime plano en botones/pills legacy (informativo, no violación) | 🔨 | P3 | Audit ronda2 código |
| **Versión LIGHT de la app** (cero infra de tema; solo dark) | ⬜ | PB | Batch 3 F4 · #24 |
| Sentry sourcemaps upload | ⬜ | P1 | TRACK C · #59 |
| SQL boost testers H+ | ⬜ | P1 | TRACK C · #60 |
| Runbook launch day actualizado | ⬜ | P1 | TRACK C · #61 |
| Comms testers + invite Skool · grupo Skool cerrado + URL | ⬜ | P1 | TRACK C · #62/#63 |
| Activar flag `INTERVENTIONS_DRIVE_HOY=true` (ya ON en código) | ✅ | — | #42 (flag ya on) |
| Podar worktrees viejos (inflan tsc local) | ⬜ | P3 | #20 |
| Rename migraciones 198a→198 / 198b→199 (CLI rechaza letras) | ⬜ | P3 | #85 |
| Regenerar tipos expo-router (quitar 8 casts `as any`) | ⬜ | PB | #64 |
| `npx tsc --noEmit` como gate autoritativo local (sandbox no pudo correrlo) | 🔨 | P1 | Audit ronda2 código · regla #8 |

### 2.2 HOY (ATP Score + electrones + agenda + ARGOS)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Routing granular de cards (hidratación→/hydration, journal→/journal, etc.) | ✅ | — | Batch 1 · #1/#90 |
| Cards HOY responden a Mi Protocolo (bridge parcial; fusión completa en Batch 4) | ✅ | — | Batch 1 #3b + Batch 4 |
| Journal completado palomea electrón en HOY | ✅ | — | Batch 1 · #17 |
| Card cardio/strength → fitness | 🔨 | — | ver Fitness (bug nuevo #3) |
| "Por qué" epigenético en modales de card | ✅ | — | Sprint 1.5 · audit web |
| Corazón HOY↔Agenda unificado (estado hecho/no-hecho compartido) | ✅ | — | Batch 4 · #30 |
| **Cards de meditación y journal YA NO EXISTEN en HOY, sin forma de activarlas** (¿batch-1 las quitó o quedaron condicionadas a protocolo?) | ⬜ | **P0** | Bug nuevo Enrique · HOY-1 |
| **"Ajustar mi protocolo" se sigue sintiendo horrendo** | ⬜ | P1 | Bug nuevo Enrique · HOY-2 |
| 3 usos lime plano en HOY (revisar visualmente en device) | 🔨 | P3 | Audit ronda2 código |

### 2.3 AGENDA

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Dedup dual (exacto + semántico por familia canónica) | ✅ | — | Batch 1 #29 · Batch 4 |
| 56 eventos basura → 19 coherentes, agrupados MAÑANA/TARDE/NOCHE | ✅ | — | Audit ronda2 web · #87 |
| Notificaciones locales por evento (path que sí dispara) | ✅ | — | Batch 1 #28 · Batch 4 |
| Menú acción Completar/Posponer/Editar/Eliminar + estado `done` (tachado) | ✅ | — | Batch 4 · audit web |
| Duplicados semánticos residuales ("Desayuno proteico"+"Romper ayuno"; "Running"+"Zona 2") | ⬜ | P3 | Audit ronda2 web · P3-3 |
| Eventos pasados sin estado (recordatorios activos a media tarde) | ⬜ | P3 | Audit ronda2 web · P3-4 |
| Device retest notifs (background, device físico) | ⬜ | P1 | Batch 1/4 test guard · #41 |
| Conectar momentos de toma de suplementos con cards de agenda | ⬜ | P1 | Bug nuevo Enrique · SUP-4 |

### 2.4 YO

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| YO rediseñado: Disciplina ATP + Cronotipo con info + Progresión (dice algo de ti) | ✅ | — | Batch 2 · #8 |
| Rutas YO a destinos propios (rank→progreso, tendencias→reportes-mes) | ✅ | — | Batch 2 · #5 |
| Pantalla Sueño editorial propia `/sleep` (vacía pero pulida) | ✅ | — | Batch 2 · #15 |
| **Regresar score Edad ATP a YO, como PRIMER dato desplegado** (perfil del founder ahí) | ⬜ | **P1** | Bug nuevo Enrique · YO-1 |
| **Cronotipo Delfín borrado — regresar como estado TEMPORAL** (avisar + cronotipo madre) | ⬜ | P1 | Triage #12 · doctrina Delfín |

### 2.5 CUESTIONARIO MAESTRO

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Cuestionario Maestro implementado (mig 203) — reemplaza 5 quizzes chafas, alimenta motor | ✅ | — | Mega-Sprint D · #107 |
| Ediciones Enrique v2 aplicadas | ✅ | — | CUESTIONARIO_MAESTRO_EDICIONES_ENRIQUE_v2 |
| Validación final de preguntas con Mariana | 🔨 | P1 | Roadmap · requiere Mariana |
| Fitzpatrick Tipo 5 vs Tipo 4 placeholder duplicado | ⬜ | P2 | #86 · audit (device retest) |
| 3 tests rojos post-epigenética (ayuno_16_8, lentes_rojos, 3ro) | ⬜ | P2 | #125 |

### 2.6 SALUD FUNCIONAL

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Salud Funcional 8 destinos + arquitectura navegación-vs-consulta | ✅ | — | Mega-Sprint B · #133 |
| Mi Diagnóstico legible (narrativa funcional, raíces, confianza, Edad ATP) | ✅ | — | Audit ronda2 web (RESUELTO) |
| Guía de Labs completa (5 paquetes, labs MX, PDF export) | ✅ | — | Sprint Labs · audit web |
| Mi Expediente timeline (por mes, íconos) | ✅ | — | Mega-Sprint B · #104 |
| Síntomas con flag inicio/fin (duración) | ✅ | — | #135 |
| Motor personalización Mi Protocolo (5 prescritas con "por qué a TI") | ✅ | — | Mega-Sprint motor · #106/#127 |
| Catálogo epigenético (89 intervenciones multi-paradigma) | ✅ | — | #105/#108/#110 |
| **Edad ATP: "27.8 biológicos · 7.2 años SOBRE tu edad real" — sentido invertido/confuso** (número estrella) | ⬜ | **P1** | Audit ronda2 web · P1-1 |
| Mi Expediente: nombres de labs en snake_case crudo | ⬜ | P2 | Audit ronda2 web · P2-1 |
| Auditoría completa "qué sirve y qué no" en Salud Funcional | 🔨 | P2 | #134 |
| Scoring motor ×5 (validar Mariana → 1 línea) | ⬜ | P1 | #130 · roadmap |
| Cetonas 3 fuentes (sangre/aliento/orina) | ⬜ | P2 | #113 |
| Vocab 5 categorías (ocular/vagal/respiración/atención/contemplativo) | ⬜ | P2 | #114 |
| Ducha Haghayegh corregir (baño tibio + flora piel) | ⬜ | P3 | #117 |
| Biomarcadores caros (HSP70/NEFA/succinato/irisin) tier 1/2/3 en taxonomía | ⬜ | PB | feedback memoria 07-14 |

### 2.7 NUTRICIÓN / SUPLEMENTOS

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Nutrición completa (texto/foto, ayuno, hidratación) sprint | ✅ | — | Sprint Nutrición Completa |
| Sello BHA + scan de etiqueta (scan gratis Pro / cobra) | ✅ | — | #39/#58 |
| Bug clínico embarazo #4 gateado por sexo (hombre ya no ve "estás embarazada") | ✅ | — | Batch 1 · #4 |
| **Scan etiqueta → botón "agregar a mi plan" que crea card con datos prellenados (texto libre editable) + sello BHA auto** | ⬜ | **P1** | Bug nuevo Enrique · SUP-1 |
| **Menú desplegable de introducción está hasta abajo, no intuitivo (parece trabado)** [Enrique adjuntó imagen] | ⬜ | **P1** | Bug nuevo Enrique · SUP-2 |
| **NO se pueden meter varias tomas al día (2 tomas AM+PM no jala)** | ⬜ | **P1** | Bug nuevo Enrique · SUP-3 · relacionado a Sprint SUPS_DOSIS_MULTIPLES |
| **Conectar momentos de toma con cards de agenda (recordatorios reales)** | ⬜ | P1 | Bug nuevo Enrique · SUP-4 |
| Hidratación demasiado pelona (una card sobre mar negro, sin contexto/historial/imagen) | ⬜ | P2 | Audit ronda2 web · P2-3 |
| Suplementos lento (perf) | ⬜ | P2 | #35 |
| BHA V2 crowd-sourced + comparativo | ⬜ | PB | #53 |
| Doctrina plantas tradicionales SÍ / extractos industrializados NO (BHA) | ✅ | — | memoria 07-14 |

### 2.8 MENTE (journal, respiración, meditación, check-in)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Pilar Mente editorial unificado (morado viejo → editorial) | ✅ | — | Mega-Sprint E · #138 |
| Hub Mente mejorado (hero, Journal con racha, Respiración, Meditación, Check-in) | ✅ | — | Audit ronda2 web |
| mind-hub legacy eliminado | ✅ | — | #139 |
| Check-in: back multi-paso ya no saca de la app | ✅ | — | Batch 1 · #20 |
| Rachas de check-in visibles al entrar (no solo al guardar) | ✅ | — | Batch 1 · #21 |
| **Audio Meditación (ElevenLabs + sonidos) — obra negra** | ⬜ | PB | Triage Batch 6 · #19/#46 |
| **Audio Respiración (sonidos, fondos, música, editorial)** | ⬜ | PB | Triage Batch 6 · #18 |
| N-Back Challenge UI (lógica+mig 197+tests listos, sin UI) — decisión surface vs oculto | ⬜ | PB | #45 · Batch 1 #2 |
| Copy "@" inclusivo literal ("Relajad@", "Content@") en check-in | ⬜ | P3 | Audit ronda2 web · P3-1 |
| Audios binaurales + NSDR custom | ⬜ | PB | #46 |

### 2.9 FITNESS (rutinas, métodos, ejecución, biblioteca)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Fitness hub estructural (Mi Fitness / Entrenar / Explorar) existe | 🔨 | — | audit web (borrador) |
| **Rename pantalla "ATP Explorar" → "ATP Fitness"** (`fitness-hub.tsx:39`) | ⬜ | **P1** | Bug nuevo Enrique · FIT-1 |
| **Entrenar→"timer rápido" manda a construir rutina; debe abrir pantalla existente de TIMERS ESTÁNDAR** (elegir uno, fin) | ⬜ | **P1** | Bug nuevo Enrique · FIT-2 |
| **Card cardio de HOY sigue mandando a Fitness; debe ir directo a registrar sesión de cardio** | ⬜ | **P1** | Bug nuevo Enrique · FIT-3 |
| Fitness sin capa editorial (filas planas, vacío negro) | ⬜ | P2 | Audit ronda2 web · P2-2 |
| **Fitness innavegable, roto — REBUILD completo** ("donde nació la app") | ⬜ | PB (grande) | Bug nuevo Enrique FIT-4 · Triage Batch 6 · #6/#14 |

### 2.10 ARGOS

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| ARGOS mejorado (on-doctrine, usa labs reales, deriva a profesional, disclaimer) | ✅ | — | Audit ronda2 web · Sprints Magia ARGOS |
| Streaming truncado corregido hacia adelante | ✅ | — | #27 · audit web |
| intervention_rationale narrativa (Pro gratis) | ✅ | — | #47 |
| Meet ARGOS reescritura con sensación WOW (Enrique redacta) | ⬜ | P1 | #43 |
| **ARGOS level-up personalidad (Jarvis en el bolsillo, presencia/avatar)** | ⬜ | PB | Triage Batch 7 · #27 |
| Migrar modelo Sonnet 4-20250514 → 4-6 | ⬜ | PB | CLAUDE.md · PROMPT_004 |
| argos-proxy + fallback (ya construido: Sonnet+Gemini+logging) | ✅ | — | memoria argos-proxy |
| Síntomas pattern / cross-parameter / vigencia labs | ⬜ | PB | #48/#49/#50 |
| Rate limits per tier | ⬜ | PB | CLAUDE.md · PROMPT_004 |

### 2.11 CICLO / EMBARAZO

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Pilar Ciclo (calendario, síntomas, predicción, compañero) | ✅ | — | pilares base |
| Bug clínico embarazo gateado por sexo | ✅ | — | Batch 1 · #4 |
| Módulo CICLO con máscara "ATP Embarazo" (sensibilidad visuals+copy) | 🔨 | PB | memoria proyecto embarazo |
| Modulación ciclo bidireccional (no solo baja) | ✅ | — | doctrina memoria 07-14 |
| Labs de mujeres contextualizados por fase de ciclo | 🔨 | PB | memoria labs+ciclo |
| No auditable en beta (cuenta masculina, pilar gated) | — | — | Audit ronda2 web |

### 2.12 ONBOARDING

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Onboarding épico (sprint) | ✅ | — | Sprint Onboarding Épico |
| Welcome tour post-pago (7 pantallas + Meet ARGOS) | 🔨 | P1 | memoria welcome_tour |
| Meet ARGOS WOW (esperando texto Enrique) | ⬜ | P1 | #43 |
| Morado off-brand en `onboarding/v2/chronotype.tsx:29` | ⬜ | P2 | Audit ronda2 código |

### 2.13 NOTIFICACIONES

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Path notif local funcionando (journal + agenda, identifiers namespaced, sin cancelAll) | ✅ | — | Batch 1/4 · #28 |
| Backup server `dispatch-agenda-notifications` intacto | ✅ | — | Batch 4 |
| Toast "N notificaciones sin leer" pegajoso, tapa header, no auto-descarta | ⬜ | P3 | Audit ronda2 web · P3-2 |
| Device retest notifs en background | ⬜ | P1 | #41 |
| Push notif solicitud de amistad | ⬜ | PB | #19 |

### 2.14 BACKEND Fx (CLÍNICO / B2B2C)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| Backend clínico con Mariana como modelo principal | ⬜ | PB | memoria backend_clinico |
| 24 requerimientos Mariana (cuestionario ramificado, detector interacciones, "nothing to write") | ⬜ | PB | memoria mariana_vision_backend |
| HUB Fx (ARGOS graba/transcribe/SOAP, chat encriptado) | ⬜ | PB | memoria hub_fx_consulta |
| Sistema afiliados wallet unificado | ⬜ | PB | memoria afiliados |
| Motor lectura de labs (corazón ATP, time-series) | 🔨 | PB | memoria labs_corazon |

### 2.15 TRANSVERSAL / APP-WIDE (bug nuevo omnipresente)

| Ítem | Estado | Pri | Origen |
|---|---|---|---|
| **KEYBOARD: el teclado tapa los inputs de texto en la parte baja del display** (omnipresente, falta `KeyboardAvoidingView`) | ⬜ | **P0** | Bug nuevo Enrique · KEY-1 |
| **HOME BUTTON: el "rayito" flotante está MAL y REINICIA la app** (usa `flash` icon + `router.replace('/(tabs)')` → splash). Enrique quiere la "casita" arriba-izquierda, PERSISTENTE en todas excepto HOY, ícono ATP sin letras, tamaño correcto | ⬜ | **P0** | Bug nuevo Enrique · HOME-1 · reemplaza `HomeFloatingButton` de Batch 2 #26 |
| Copy/UX globales: español MX, explicar siglas, guiar con ejemplos, helper multiselect, inputs amigables iOS | 🔨 | P2 | memoria copy_ux_globales |

---

## 3. SECUENCIA RECOMENDADA DE BATCHES RESTANTES

Agrupados en batches congruentes (nada de mini-sprints). Los bugs nuevos de Enrique se reparten donde encajan por raíz, no por orden de reporte.

### 🔴 BATCH 5 · "Beta-blockers finales" (rápido, mata la sensación roto — CC primero)
**Todo P0/P1, quirúrgico. Es lo mínimo para no romper el soft-launch.**
- **INFRA-P0:** SPA fallback en `vercel.json` (404 refresh/deep-link). *Config de deploy, no código.*
- **KEY-1 (P0):** `KeyboardAvoidingView` app-wide — el teclado tapa inputs. Componente `Screen` compartido + inputs bajos.
- **HOME-1 (P0):** rehacer el home button — matar el "rayito" que reinicia (`router.replace` → `router.navigate`/`push`), cambiar a "casita" con **ícono ATP sin letras**, arriba-izquierda, persistente en todas menos HOY, tamaño correcto. Reemplaza `HomeFloatingButton` de Batch 2.
- **HOY-1 (P0):** regresar cards meditación + journal a HOY (investigar si batch-1 las quitó o quedaron condicionadas al protocolo; que sean activables).
- **EDAD-ATP (P1):** corregir sentido invertido "7.2 años SOBRE tu edad real" (verificar cálculo + palabra "sobre" vs "debajo"). Número estrella.
- **YO-1 (P1):** regresar Edad ATP a YO como 1er dato desplegado.
- **NAVY-SEALS (P1):** quitar autoridad de `benefit` user-facing (`interventions-catalog.ts:3320,:3541`).
> 🎨 *Skill:* **apple-design** / **emil-design-eng** para el home button (tamaño, posición, feel del tap) y KeyboardAvoidingView (interrupción/movimiento fluido).

### 🔴 BATCH 6 · "Suplementos usable end-to-end" (P1, cohesivo — un solo flujo)
Todos los bugs de suplementos comparten raíz (el flujo de crear/gestionar tomas):
- **SUP-3:** habilitar múltiples tomas/día (AM+PM). *Raíz — sin esto lo demás no cierra.* (Reactivar/arreglar Sprint SUPS_DOSIS_MULTIPLES.)
- **SUP-1:** scan → botón "agregar a mi plan" → crea card con datos escaneados prellenados (texto libre editable) + sello BHA auto.
- **SUP-2:** arreglar el dropdown de introducción trabado/hasta-abajo (revisar imagen adjunta de Enrique).
- **SUP-4:** conectar momentos de toma con cards de agenda (recordatorios reales) — reusa el path de notif local de Batch 4.
> 🎨 *Skill:* **frontend-design** / **emil-design-eng** para el dropdown y el flujo de creación de card.

### 🔴 BATCH 7 · "Fitness navegable" (P1 rápido AHORA + PB rebuild después) — SPLIT
Separar lo quirúrgico (entra al beta) del rebuild (post):
- **AHORA (P1, quirúrgico):** FIT-1 rename Explorar→Fitness · FIT-2 timer rápido → pantalla de TIMERS ESTÁNDAR existente (no builder) · FIT-3 card cardio HOY → registrar sesión de cardio directo. *Deja Fitness usable sin rebuild.*
- **POST-BETA (PB, grande):** FIT-4 rebuild completo + capa editorial (P2). "Donde nació la app" — sprint dedicado con customer journey primero (memoria: mapear CX antes de más features).
> 🎨 *Skill:* **frontend-design** para el molde editorial del rebuild.

### 🟡 BATCH 8 · "HOY/Protocolo se siente ATP" (P1-P2 pulido)
- **HOY-2:** rediseñar "Ajustar mi protocolo" (se siente horrendo). Mapear CX antes de rediseñar (memoria feedback).
- Cronotipo Delfín como estado temporal (YO + cuestionario) — doctrina #12.
- Fitzpatrick Tipo 5/4 dup (#86) + 3 tests rojos (#125).
> 🎨 *Skill:* **apple-design** para el flujo de ajuste de protocolo (guiado no prisionero).

### 🟡 BATCH 9 · "Pulido editorial + legibilidad" (P2)
- Mi Expediente snake_case → labels legibles.
- Hidratación pelona → contexto+historial+imagen · vacíos negros al fondo (Fitness/Evaluaciones/Hidratación) · Fitness editorial (si no entró en rebuild).
- Toast pegajoso (auto-dismiss) · "@" inclusivo · dedup semántico agenda residual · eventos pasados sin estado · morado off-brand.
- Auditoría "qué sirve/qué no" Salud Funcional (#134) · cetonas 3 fuentes · vocab 5 categorías · ducha Haghayegh.
> 🎨 *Skill:* **frontend-design** / **emil-design-eng** para vacíos negros y molde editorial.

### 🟢 BATCH 10 · TRACK C infra pre-launch (P1, paralelo)
Sentry sourcemaps · SQL boost H+ · runbook · comms testers + Skool + URL · device retest grande (todos los batches juntos) · `tsc` gate local · podar worktrees · rename migraciones.

### 🔵 POST-BETA (v1.5 / v2 · NO bloquean 1 ago)
- **Fitness rebuild completo** (Batch 7 parte 2).
- **Audio Mente:** ElevenLabs meditación + respiración (sonidos/fondos) · binaurales + NSDR.
- **ARGOS level-up Jarvis** (personalidad/avatar) + Meet ARGOS WOW + migrar Sonnet 4-6 + rate limits per tier.
- **LIGHT mode** (capa semántica de tema — bestia aparte).
- **ATP Sleep Track** (sleep cycle integrado).
- **N-Back V1.5** UI + tools atención (PVT/Stroop/TMT).
- **Backend Fx clínico** (24 req Mariana · HUB Fx · afiliados wallet · motor labs).
- Comunidad V1.5 · Coach Proactivo · BHA V2 · wearables/multimodal/genética (v1.5-v2, NO se venden aún).

---

## 4. NOTA METODOLÓGICA

- Estado ✅ confirmado en vivo por **Auditoría Ronda 2 (código + web navegada en Chrome MCP)** del 2026-07-17. Los 4 batches están mergeados a `main`, sin regresiones estructurales.
- Los **bugs nuevos de Enrique** (2026-07-17) NO están en el task list de Cowork todavía — este tracker es su primer registro consolidado. Se recomienda crearlos como tasks (KEY-1, HOME-1, HOY-1/2, SUP-1..4, FIT-1..4, EDAD-ATP, YO-1).
- `HomeFloatingButton` YA existe en código (`src/components/ui/HomeFloatingButton.tsx`, montado en `_layout.tsx:263`) — el bug HOME-1 es un **rework** de ese componente, no una creación nueva.
- Gate `npx tsc --noEmit` pendiente de correr localmente (sandbox OneDrive no lo completa) — regla técnica #8.
- Deploy default = **OTA** (`eas update --branch preview`) salvo cambios nativos o bump de versión.

---

*Generado por Cowork (PM técnico) · 2026-07-17 · fuente de verdad del estado 100% hacia app completa.*
