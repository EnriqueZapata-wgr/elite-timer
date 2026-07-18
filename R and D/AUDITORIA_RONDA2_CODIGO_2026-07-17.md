# Auditoría Ronda 2 — Código (post mega-blockers batch 1-4)

**Fecha:** 2026-07-17 · **Rama:** main · **Alcance:** auditoría de CÓDIGO, solo lectura, sin modificaciones
**Auditor:** Cowork (agente técnico+clínico) · **Vara:** rúbrica founder (comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real), NO "compila/existe".

---

## Resumen ejecutivo

Los 4 batches mergeados están **sólidos a nivel de arquitectura y sin regresiones estructurales**. Los núcleos nuevos (day-state-core, pregnancy-gate-core, brand.ts, day-compiler merge, agenda-local-notifications) están bien diseñados, con doctrina explícita en el código y comportamiento fail-soft. No encontré rutas muertas, imports rotos ni assets faltantes introducidos por los batches. El design system (brand.ts) quedó **completo y correcto**: teal + amarillo + gradientes definidos como fuente única de verdad, con reglas de disciplina de acento embebidas.

**Un solo hallazgo nuevo accionable pre-beta (P2):** 2 entradas del catálogo filtran la autoridad "Navy SEALs" en texto `benefit` **user-facing** — inconsistente con la doctrina "no citar autoridades" que ya se aplicó a breathing-library (task #140). El resto son P3/pulido o confirmaciones de pendientes ya conocidos (Batch 5-7).

**tsc:** NO pude obtener un resultado autoritativo dentro del sandbox. El mount de OneDrive tiene I/O patológicamente lento para lecturas masivas (una copia de `app/`+`src/` a tmpfs quedó estancada >10 min; tsc con y sin `--skipLibCheck` nunca terminó de escribir salida). El run acotado (excluyendo `.claude/worktrees`) **no había producido ni una sola línea `error TS` antes del timeout**, consistente con 0 errores. **Recomiendo correr `npx tsc --noEmit` localmente como gate autoritativo** (regla técnica #8) — mis lecturas puntuales Read/Grep sí funcionaron y no revelaron tipos rotos.

### Conteo de hallazgos
| Prioridad | Nuevos | Descripción corta |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 1 | Autoridad "Navy SEALs" en `benefit` user-facing (2 entradas catálogo) |
| P3 | 2 | Morado hardcodeado off-brand en chronotype.tsx · nota sobre lime plano |
| Verificaciones OK | 6 | day-state merge, pregnancy-gate, brand.ts, rutas, assets, mind-hub legacy |

---

## Verificaciones de los 4 batches (quedaron BIEN — no re-reportar)

### ✅ Batch 4 · day-state-core (`src/services/hoy/day-state-core.ts`)
Lógica "hecho/no-hecho" **sólida**. `buildDoneIndex` solo cuenta `status === 'completed'`; `applyDoneFromLogs` hace merge OR in-place y **nunca des-marca** (`if (item.completed) continue`) — respeta la doctrina "dato del user sagrado". Dedup semántico vía `canonicalConcept` (no string exacto), correcto per `feedback_dedup_semantico`.
- **Sin doble-conteo de electrones:** el merge es display-only (solo voltea el booleano `completed` de los items derivados). Los electrones se otorgan en el path de escritura de compleción (`awardBooleanElectron` / `intervention_completions`), NO en el compilador. `day-compiler.ts:774-791` aplica el merge con `try/catch` fail-soft. Confirmado que no hay ruta de doble premio.

### ✅ Batch 4 · dedup agenda (`src/services/interventions/intervention-agenda-core.ts` + `day-compiler.ts:770-793`)
Doble dedup: exacto (`HH:MM|nombre` en day-compiler:772) + semántico por familia canónica (`canonicalConcept`, agenda-core:240). Defensivo ante la carrera del flag INTERVENTIONS_DRIVE_HOY.

### ✅ Batch 1 · pregnancy-gate-core (`src/services/pregnancy-gate-core.ts`)
Gate correcto: `if (input.biologicalSex !== 'female') return false` **primero**, antes de leer cualquier `pregnancy_status`/`cycle_modality`. Un dato residual/seed NUNCA activa la máscara para male/null/undefined. Clínicamente correcto.

### ✅ Batch 3 · design system (`src/constants/brand.ts`)
Fuente única de verdad completa: `teal`/`teal2` (#1ABC9C) y `amber` (#EFD54F) definidos, `moleculeGradient` lime→teal, `PILLAR_GRADIENTS` por pilar, `brandGradient()` helper, `ELEVATION` 0-3, `GLOW`, `ACCENT_ROLES` con la heurística ">3 elementos lima = sobra acento" embebida en comentarios. El lime-brutalist legacy está efectivamente muerto como doctrina.

### ✅ Batch 4 · agenda-local-notifications (`src/services/agenda-local-notifications.ts`)
Usa `getPermissionsAsync` + `scheduleNotificationAsync` y **evita `cancelAllScheduledNotificationsAsync`** (borraría el recordatorio de journal). Buen aislamiento.

### ✅ Rutas y assets (regresión batches) — LIMPIO
- 69 targets estáticos de navegación extraídos de `router.push/replace/navigate` + `href`; **todos resuelven** a archivo real, `/index.tsx` o segmento dinámico. Los 2 falsos positivos: `/goal-tree-smoke` proviene de un COMENTARIO (la nav real usa `/dev/goal-tree-smoke`), y `/historia-clinica/fitzpatrick` resuelve vía `[category].tsx`.
- Assets: fondos HOY (`bg-sleep/morning/midday/night`), `sangharsh-lohakare` (braverman), y las ~40 imágenes `assets/images/agenda/**` referenciadas por `require()` **existen todas**. Ningún `require` a asset inexistente.
- `/mind-hub` legacy confirmado ELIMINADO (task #139): solo quedan comentarios documentando la remoción en `_layout.tsx:190` y `day-compiler.ts:509`.

---

## Hallazgos nuevos

### P2 — Autoridad "Navy SEALs" en copy user-facing (`benefit`)
**Qué:** El campo `benefit` del catálogo SE RENDERIZA al usuario (`app/salud/intervenciones/[key].tsx:199`, `app/breathing.tsx:178`). Dos entradas incluyen la autoridad en ese texto:
- `src/constants/interventions-catalog.ts:3320` — `benefit: '...calma+foco simultáneos (protocolo Navy SEALs)...'`
- `src/constants/interventions-catalog.ts:3541` — `benefit: '...(protocolo Navy SEAL Grossman/Divine).'`

**Por qué importa (clínico/doctrina):** contradice la doctrina "no citar autoridades" que YA se aplicó a breathing-library en task #140. Inconsistencia visible: una pantalla dice el protocolo sin apellidos y otra lo atribuye a Navy SEALs. Rompe además la lógica de placebo/credibilidad propia de ATP.
**Fix:** quitar "(protocolo Navy SEALs)" / "Grossman/Divine" del texto `benefit` de esas 2 entradas (dejar la técnica descrita por su efecto). Las citas académicas pueden quedar en el campo `citation` — **verificado que `citation` NO se renderiza a UI** (grep sin hits de render), así que Huberman/AHA/Harvard en `citation` son internos y NO violan doctrina. Solo `benefit` es user-facing.

### P3 — Morado hardcodeado off-brand (`app/onboarding/v2/chronotype.tsx:29`)
**Qué:** `const PURPLE = '#7c3aed';` — color fuera de brand.ts, bypasea la paleta oficial (3 colores lime+teal+amber).
**Por qué importa:** micro-deuda de design system; una pantalla de onboarding con un morado que no existe en la marca. No bloquea beta.
**Fix:** mapear a un token existente (o `CATEGORY_COLORS.mind` si aplica) post-beta.

### P3 — Lime plano como backgroundColor (informativo, NO violación)
**Qué:** 36 usos de `backgroundColor: '#a8e02a'` en pantallas. Revisados: son casi todos **botones compactos / pills / chips**, que la doctrina de brand.ts explícitamente permite ("el sólido es para botones compactos, no fondos"). `app/(tabs)/index.tsx` (HOY) tiene 3 — vale un vistazo visual en device pero no es violación de la regla ">3 elementos lima por vista" a nivel de superficie heroica.
**Fix:** ninguno obligatorio. Auditar visualmente HOY en la pasada de device.

---

## Pendientes conocidos CONFIRMADOS aún abiertos (NO son hallazgos nuevos)
- **Batch 5-7 / roadmap:** Fitness obra negra, Meditación/Respiración sin audio (#46), ARGOS level-up, Mi Diagnóstico / Mi Expediente legibilidad, cronotipo Delfín, versión LIGHT (falta en brand.ts, solo dark). — confirmados, sin cambios.
- **#86** Placeholder duplicado Tipo Piel (Tipo 5 vs 4) — sigue pendiente device retest.
- **#87** Agenda con eventos duplicados/sin sentido — el dedup dual YA está en código (exacto + semántico); el bug reportado por usuario requiere la 2da pasada de device para confirmar si persiste con datos reales seeded.
- **#90** Routing HOY granular · **#91** swap imageBn · **#92** Historia Clínica cards · **#93** labs guide incompleta · **#94** Mente borrador — pendientes de UX/contenido, no regresiones.
- **#130** Cold interventions: la contraindicación `fiebre_viral_activa_37_8_o_mas` **YA está tagueada** en wim_hof, ducha_fria (3 niveles), sauna, cold_plunge (9 menciones `fiebre`). Lo que resta de #130 es la **calibración del scoring del motor (×10→×5)**, no el tag.

---

## Nota metodológica sobre tsc
El entorno sandbox (mount OneDrive → Linux) tiene latencia de lectura por-archivo extrema; cualquier operación masiva (tsc completo, `cp -r` de fuentes) no completa en tiempo razonable. Esto NO es un problema del código. Las lecturas puntuales (Read/Grep de archivos individuales) funcionaron sin problema y no revelaron tipos rotos. **Gate autoritativo pendiente:** `npx tsc --noEmit` en la máquina de Enrique (regla #8). Adicional: hay ~15 `.claude/worktrees/*` que el `tsconfig.json` incluye vía glob `**` — no afectan el build de producción pero inflan cualquier tsc local; considerar podarlos (tasks #20, #85 relacionadas).
