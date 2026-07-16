# 🔧 HOTFIX Sprint 1.5 · Delivery — device bugs S24 resueltos

**Fecha:** 2026-07-14/15
**Commit fix:** `b490d63` (branch `fix/sprint-1-5-hoy-agenda-protocolo`)
**Verificación:** `tsc --noEmit` limpio · **1637 tests verdes** (164 files, +12 guards nuevos)
**Data fix remoto:** ✅ YA APLICADO (migración 200, idempotente, verificado en prod)

---

## 1 · Reproducción — no fue necesario el emulador, fui directo a la fuente

**H1 y H4 (cache/bundle) DESCARTADAS con evidencia:** consulté `agenda_events` en prod.
Hay 4 filas `source='intervention'` creadas **hoy 07-15** (aceites, grounding, ventana,
zona 2) — es decir, **el motor de Sprint 1.5 SÍ corrió en tu S24**. El OTA aplicó
(consistente con Bloques A y B funcionando). No había nada que "refrescar".

La reproducción real está en el repo como **test guard con el snapshot exacto de tus
28 filas de prod** (`intervention-agenda-core.test.ts` → "HOTFIX 1.5 · repro snapshot
prod"): el código pre-hotfix deja los 28 vivos; el post-hotfix deja el set esperado.
Mejor que un screenshot: corre en cada CI para siempre.

### Qué eran tus 28 eventos (breakdown de prod)

| Fuente | Count | Qué son |
|---|---|---|
| `protocol` | **10** | 🧟 Zombies del driver ATP PROTOCOLOS (muerto en Bloque B, filas nunca retiradas) |
| `manual` / `manual_override` | **13** | Tus eventos (creados/editados por ti en junio-julio) — sagrados |
| `intervention` | 4 | Las nuevas del motor 1.5 (correctas) |
| `chronotype` | 1 | Despertar 05:30 |

Los "duplicados" que viste eran **protocol-vs-tuyos**: "Suplementos AM" (protocol 07:15
+ tuyo 08:00), "Hidratación" ×5 (3 protocol + 2 tuyos), "Cena" ×2. El presupuesto de
familia (hidratación 5, suplementos 3) los permitía convivir por diseño — diseño equivocado.

---

## 2 · Causa raíz por síntoma (todo era H2/H3: código haciendo lo que codifiqué, doctrina mal codificada)

### 🚨 28 eventos → retiro del driver muerto (C1)
El cleanup 1.5-C solo deduplicaba por familia; una fila `protocol` con nombre único
("Journal", "Caminata post-comida"…) sobrevivía para siempre, y la regla "el viejo gana"
la protegía. **Fix:** `planAgendaCleanup` pase 0 `retireProtocolDriver` — con el swap
activo, TODA fila activa `source='protocol'` se retira (soft, reversible). Tus filas
`manual`/`manual_override` jamás se tocan.

### 🚨 Despertar 05:30 siendo León (C2)
Tres fuentes decían León=05:30: `CHRONO_SCHEDULES` (onboarding v2), `CHRONO_ANCHOR_DEFAULTS`
(agenda) y el **template del quiz v1 en la DB** (`quiz_templates.scoring_logic`) — que fue
quien escribió `wake_time=05:30` en tu `user_chronotype` el 2026-06-12. Como 05:30 estaba
DENTRO de la tolerancia ±60 del default 05:30, `validatedSchedule` jamás lo corregía (el
snap funcionaba… contra el default equivocado). **Fix:** las 3 fuentes a 06:00 + migración
200 corrige data machine con fingerprint exacto (león + 05:30 → 06:00). Un wake editado a
mano no matchea el fingerprint y no se toca ("datos user sagrados").
**✅ Ya aplicado en prod: tu wake_time es 06:00** — al entrar a Agenda el reconcile
actualiza la fila "Despertar" existente a 06:00.

### 🚨 Falta "Dormir" (C3 — lo ibas a ver en el retest)
El cleanup A.2 mató tu "Dormir" de cronotipo (perdió contra "Dormir 8-9 horas" del
protocolo — hoy retirado) y `reconcileChrono` trataba TODA fila inactiva como "el user
lo quitó". **Fix:** decisión pura `planChronotypeReconcile` — el removal del user vive en
`disabled_protocol_events`; si la key NO está ahí, la desactivación fue de máquina y el
evento revive con la hora validada. Tu "Dormir 21:30" vuelve solo.

### 🚨 Umbrales UX invisibles (D)
`protocolLoadHint` contaba solo NO-universales (mis tests unitarios validaban exactamente
eso — verdes y equivocados, H2 puro). Con 5 universales P1 de base, tus "7 activas" eran
2 no-universales → nunca cruzaba el umbral 6. **Fix:** cuenta el TOTAL de activas.
Con 7 activas → hint Humby · con 9+ → "Menos, mejor".

---

## 3 · Qué vas a ver en el retest (calibra la expectativa)

La agenda NO va a mostrar 7 — va a mostrar **~19**, y eso es correcto:

- **13 tuyos** (Running, Luz roja, Suplementos post run, Cena ligera, Comida principal,
  Luz solar + infrarroja, etc.) — el motor jamás borra data del user. Si quieres una
  agenda de 7, borra los tuyos que sobren: quedan registrados en disabled y nada los recrea.
- **Despertar 06:00** + **Dormir 21:30** (cronotipo).
- **4 intervenciones** (aceites, grounding, ventana, zona 2). Sol, romper-ayuno e
  hidratación NO insertan versión propia porque TUS eventos ya cubren esos conceptos
  ("Luz solar + infrarroja", "Romper ayuno — comida limpia", "Hidratación con
  electrolitos") — ese es el dedup semántico funcionando: el tuyo gana.
- **Cero `protocol`** y cero duplicados textuales.

### Checklist retest
1. Publica OTA: `eas update --branch preview` (desde `b490d63`, working tree limpio).
2. S24: force stop → abrir → cerrar → abrir (2 aperturas para que Expo aplique el update).
3. Entra a **Agenda** (la limpieza corre al entrar): cuenta eventos, busca "Despertar 06:00",
   "Dormir 21:30", cero "Suplementos AM" duplicado, cero "Hidratación · vaso de agua" ×3.
4. **Mi Protocolo**: con tus 7 activas debe aparecer el hint Humby; activa 2-3 más → warning
   "Menos, mejor" desde 9.

---

## 4 · Test guards nuevos (para que no regrese)

- `intervention-agenda-core.test.ts` · "repro snapshot prod": tus 28 filas reales →
  asserts de retiro + idempotencia (2ª pasada no toca nada).
- `planChronotypeReconcile`: revive-si-no-disabled, respeta removal user, flag OFF quieto,
  update quirúrgico 05:30→06:00.
- `protocolLoadHint`: 2 curadas + 5 universales = 7 → soft (el caso exacto de tu device).
- León defaults 06:00 en anchors.

## 5 · Nota para Cowork/Mariana (firma consciente, fuera de scope pero bloqueaba verde)

El commit `db206fd` (catálogo epigenético, posterior a mi delivery — era el working tree
"sucio" del asterisco en tu `eas update`) dejó 3 tests rojos que firmé conscientemente:

- La lista `CLINICAL_VALIDATION_PENDING` creció 12→17 (**dirección segura**: más gating,
  cero fuga clínica; `jawzercise`→`omt_masticatorios` fue rename y sigue gateada).
- **`ayuno_16_8` quedó gateado** (post investigación Longo/OMAD): el motor NO lo sugiere
  hasta firma de Mariana. La data de users que ya lo tienen activo queda intacta (Enrique
  incluido). Si esto NO era la intención, es quitar 1 flag en el catálogo.

## 6 · Pendientes operativos

- [ ] Enrique: publicar OTA + retest (checklist arriba).
- [ ] Cowork: audit branch → merge. `npx supabase db push` tras merge marcará la migración
      200 (ya aplicada vía MCP, es idempotente — re-correrla no hace nada).
- [ ] Mariana: confirmar gating v4 de `ayuno_16_8` y `lentes_rojos` (sección 5).

— Fable 🤖 · fix quirúrgico, cero deuda, guards reales
