# 🔍 AUDITORÍA PRE-MERGE · AWAY RUN (MB-1 / MB-2 / MB-3)

**Fecha:** 2026-07-18 · **Rama:** `fix/mb0-cimiento` (MB-0 ya auditado APTO; este pase cubre MB-1/2/3, ~15 commits nuevos).
**Alcance:** solo lectura. Auditoría contra `R and D/FABLE_V2_AWAY_RUN_DELIVERY.md` + verificación directa del working tree que se va a mergear.
**Vara aplicada:** comprensible + editorial + invita a la acción + cada card se gana su lugar. No basta "compila".

> **Nota de entorno (importante):** el mount de OneDrive sirve lecturas ocasionalmente **truncadas/stale** (confirmado: `tsconfig.json` es ASCII válido por `xxd` pero `sed`/`tsc` lo leen cortado a media línea). Por eso **`tsc` local NO es confiable en este mount** — arroja falsos "Unterminated string literal" en archivos estables (`tsconfig.json`, `protocol-cards-core.ts`). **El CI es la autoridad para tsc**: `.github/workflows/typecheck.yml` corre `npx tsc --noEmit` sobre un checkout limpio (`npm ci`) en cada `push` y `pull_request`. La delivery reporta CI verde por batch. Mis lecturas dirigidas (grep/sed de las líneas cambiadas) sí resolvieron y confirman la lógica.

---

## VEREDICTO: ✅ APTO PARA MERGE

Cero bloqueadores P0. Los 3 batches implementan lo pactado con la semántica correcta; las decisiones de recorte (deuda v2.1) están documentadas y son razonables. Merge condicionado al **device-gate** (checklist abajo) que por diseño queda para el regreso de Enrique (sin OTA no hay device test) — eso es proceso, no bloqueador de código.

---

## MB-1 · CORAZÓN

| Ítem | Estado | Evidencia |
|---|---|---|
| Cards meditación + journal de vuelta en HOY | ✅ | `src/services/hoy/protocol-cards-core.ts:22` — `HOY_BASELINE_CARDS` ahora incluye `'meditacion','journal'`. Delivery cita test de regresión (baseline HOY-1). |
| **Edad ATP — signo/semántica (CRÍTICO)** | ✅ | `app/salud/diagnostico/index.tsx:260-264`: `delta>0 → "X años más joven"`, `<0.05 → "en línea con tu edad real"`, `<0 → "X años sobre tu edad real"`. Coincide con la convención del motor `delta_anos = cron − integral` (positivo = más joven), documentada en `src/types/motor-edad-atp-v2.ts:35`. **El copy "sobre tu edad real" solo sale cuando biológico > cronológico.** |
| Edad ATP = PRIMER dato en YO | ✅ | `src/components/yo/YoEditorialSection.tsx:75-90` — card `yo_edad_atp` es la sección 0 del feed, mismo signo correcto, imagen sex-aware (`pickEdadAtpImage`), CTA a `/edad-atp` sin CE. |
| "Ajustar Mi Protocolo" journey-first, sin duplicar, sin regaños | ✅ | `app/salud/intervenciones/index.tsx`: MI PROTOCOLO primero (l.213); "ATP TE PROPONE" filtra activas ("N ya en tu protocolo", l.344); "Recalcular"→"Actualizar"/"Leyendo tus datos…" (l.325); copy "páusala sin culpa" (l.293). |
| Delfín = estado temporal + cronotipo madre | ✅ | `app/quiz/chronotype.tsx:263-279` (aviso temporal + cronotipo madre no-delfín + ancla Oso, 2-3 sem); `app/my-chronotype.tsx:75-215` (headline "Estado temporal", bloque "MIENTRAS LO RESUELVES", ancla Oso). Deuda anotada: cronotipo madre real no se persiste (necesita columna). |
| Dedup semántico + eventos pasados atenuados | ✅ | Familias canónicas en `src/services/interventions/intervention-agenda-core.ts:234,240` (`romper_ayuno` captura desayuno; `cardio` captura Zona 2/running). `src/services/day-compiler.ts:772-777` dedup por `hora+canonicalConcept`. `src/components/agenda/AgendaMiniCard.tsx:75,128,157` estado `past` → opacity 0.55 + label "Pasado". |

## MB-2 · SUPLEMENTOS

| Ítem | Estado | Evidencia |
|---|---|---|
| Sheet scrolleable + teclado | ✅ | `app/supplements.tsx:496,506` — `KeyboardAvoidingView` (iOS) + `ScrollView` con `keyboardShouldPersistTaps="handled"`. |
| Flujo de EDICIÓN de ficha (✏️) | ✅ | `app/supplements.tsx:50` (`editingId`), `:199-200` UPDATE, `:346` hint "Toca ✏️ para editar tomas y dosis". |
| Scan → "Agregar a mi plan" + sello BHA solo si limpio | ✅ | `app/food-scan.tsx:445` `clean = quality>=80 && !red_flags.length`; `:452-456` inserta ficha `source:'scan'`, `bha_status: clean ? 'approved' : null` (scan sucio NO auto-rechaza — decisión clínica conservadora). CTA "Ver mi plan" (l.1371). |
| Tomas → cards de agenda con recordatorio (driver nuevo, SIN cancelAll) | ✅ | `src/services/agenda-service.ts:186-224` driver `supplement` (evento por suplemento×toma, `dose_times[]`, recordatorio 10 min, reconcile de huérfanos, `manual_override` sagrado). Notifs vía `syncAgendaLocalNotifications` — `src/services/agenda-local-notifications.ts:43` cancela SOLO identifiers namespaced (confirmado: **cero `cancelAll`** en todo el árbol). |
| Perf (queries reducidas + memo) | ✅ (por revisión de delivery) | Delivery: 4-5 round-trips → 2 queries en paralelo + `useMemo`. Consistente con el patrón del archivo. |

## MB-3 · FITNESS

| Ítem | Estado | Evidencia |
|---|---|---|
| Timer rápido → `/timer` (no builder) | ✅ | `app/fitness-train.tsx:24` route `/timer`; `app/fitness-hiit.tsx:146` `router.push('/timer')`. `app/timer.tsx` existe. |
| Cardio HOY → registro directo | ✅ | `src/services/day-compiler.ts:48` `cardio: '/log-cardio'`. `app/log-cardio.tsx` existe. |
| **Corrección rutinas-timer: cardio_sessions + electrón (no mind_sessions 'breathing')** | ✅ | `app/execution.tsx:144-155` — insert en `cardio_sessions` con `discipline:'other'` + `awardBooleanElectron('cardio')` + `emit('electrons_changed')`. Comentario documenta la raíz (tabla equivocada anterior). |
| Fuerza palomea al instante | ✅ | `app/log-exercise.tsx:377-385,542-543` — award EAGER de `strength` + `emit('electrons_changed')`. |
| Hub con EditorialCard | ✅ | `app/fitness-hub.tsx:162-170` `EditorialCard size="pillar"` con imágenes `agenda/entrenar/*` + `cardio/*` (verificadas en disco). |

**Doble-conteo de electrones (riesgo señalado):** ❌ NO hay doble-conteo. `awardBooleanElectron` es idempotente vía UNIQUE index / `idempotency_key` determinística `user:source:día` (`src/services/electron-service.ts:29-33`). El award eager de fuerza y el award de cardio del routine-timer colisionan en la misma key que cualquier reconcile posterior → una sola fila. El conteo de `cardio_sessions >= 1` para palomear la card (day-compiler) es display, independiente del electrón.

---

## REGRESIONES / RIESGOS

- **Rutas muertas / imports rotos:** rutas tocadas (`/timer`, `/log-cardio`, `/log-exercise`, `/edad-atp`, `/supplements`, `/meditation`, `/journal`) existen. Requires de assets fitness (`agenda/entrenar/entrenar-01.png`, `-02.png`, `cardio/cardio-02.png`) verificados en disco.
- **tsc:** ver nota de entorno. Autoridad = CI (workflow confirmado corre `tsc --noEmit` en cada push/PR). El tsc local de este mount es ruido por truncación de lecturas.
- **Design system:** cero lime-brutalist nuevo (grep de `#C6FF00/#D4FF00/#CCFF00/#BFFF00` = 0 hits). Verdes usados son `#4ade80` (teal/verde editorial existente). Fitness/YO hubs migran a `EditorialCard`.
- **Doctrina:** copy en español MX; sin nombres propios/autoridades nuevas en los diffs revisados; delfín comunicado como estado temporal (doctrina #12); protocolo sin regaños.

## SECRETOS

✅ **Ningún secreto filtrado.** `.env.test.local` existe en disco pero está cubierto por `.gitignore` (`.env*.local`) y **NO** aparece en `git ls-files`. No hay credenciales hardcodeadas en el diff (las menciones de `service_role` en `src/services/economy/*` y `lab-service.ts` son comentarios de arquitectura, no valores). Las credenciales de la cuenta femenina de test viven solo en el archivo gitignored.

---

## CHECKLIST DEVICE-GATE (pendiente al regreso de Enrique · ambas cuentas)

**MB-1**
- [ ] Cards meditación/journal visibles y palomean con actividad real.
- [ ] Edad ATP: signo correcto en diagnóstico + 1er dato en YO.
- [ ] "Ajustar protocolo" sin duplicados ni regaños.
- [ ] Delfín: quiz → aviso temporal + madre; Mi Cronotipo → bloque ancla.
- [ ] Agenda: sin dupes Running/Zona2 ni Desayuno/Romper ayuno; pasados atenuados.
- [ ] Tacto scale 0.97 pointer-down en el loop.

**MB-2**
- [ ] Suplemento con 2 tomas AM+PM · editar ficha existente (✏️) para añadir 2ª toma.
- [ ] Scan → "Agregar a mi plan" → card con datos + sello BHA si limpio.
- [ ] Sheet fluido con teclado abierto (botón AGREGAR alcanzable).
- [ ] Tomas como cards de agenda + recordatorio dispara en background.

**MB-3**
- [ ] Rutina → timer → aparece en cardio_sessions y palomea CARDIO en HOY.
- [ ] Registrar fuerza → card FUERZA palomea AL INSTANTE.
- [ ] "Timer rápido" abre timers estándar (no builder).
- [ ] Card cardio HOY → registro directo.
- [ ] Hub editorial sin vacío negro.
- [ ] Rolling smoke 10 min (Fitness no rompió HOY/agenda).

## DEUDAS ACEPTADAS (no bloqueantes)
Cronotipo madre real sin persistir (columna → post-away-run) · imágenes fitness movilidad/biblioteca (MJ) · subpantallas fitness a EditorialCard (v2.1) · reporte PDF suplementación (nunca construido).
