# 🔍 AUDITORÍA PRE-MERGE · `fix/triple-audit-fixes`

**Fecha:** 2026-07-18 · **Rama:** `fix/triple-audit-fixes` (tip `5bb4c89`) · **Base:** `main @ 9749c85`
**Alcance:** 13 commits · 77 archivos · +663 / −149 (código) · 22 assets reemplazados
**Método:** solo lectura sobre el diff `9749c85...5bb4c89`. tsc/tests: **el CI verde es autoritativo** (no se re-ejecutó local).

---

## ✅ VEREDICTO: **APTO PARA MERGE**

**Cero bloqueadores técnicos (P0).** Los 15 ítems pactados están implementados como se acordó.
Queda **1 gate no técnico vigente** (approval Mariana, ítem 5) y **1 nota operativa** (índice git corrupto en el working copy local).

---

## 1. Verificación ítem por ítem

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| 1 | Configura HOY vuelve a mandar | ✅ COMO SE PACTÓ | `applyManualOverride` pura + 4 tests |
| 2 | Casita re-oculta en tabs | ✅ | `TAB_PATHS` + test actualizado |
| 3 | Sheet suplementos → Modal | ✅ | `Modal` + `onRequestClose`; checkin/profile INTACTOS |
| 4 | Cero snake_case al LLM | ✅ | `legibilizeKeysInText` + ROOT_LABELS + regla en system |
| 5 | Meet ARGOS persona Jarvis | ⚠️ GATE | copy live, flag en header — **falta firma Mariana** |
| 6 | Edad ATP core canónico | ✅ | `edad-delta-core` + 4 superficies + test del caso real |
| 7 | #64 casts de navegación | ✅ | **cero** casts de ruta en todo el repo |
| 8 | Hueco negro + assets | ✅ | 9.30 MB → 2.20 MB (−76%), cero require roto |
| 9 | Morado acción → marca | ✅ | lime/teal, sin cambios de lógica |
| 10 | Merge asistido duplicados | ✅ | 100% user-initiated, soft-deactivate, "Dejar ambos" |
| 11 | Cronotipo TUS VENTANAS | ✅ | lee `peak_focus_*` / `peak_physical_start` |
| 12-15 | P3 + cobertura | ✅ | token cycle, icon tipado, hitSlop, 16 tests nuevos |

---

## 2. Foco crítico — hallazgos detallados

### 🎯 Ítem 1 · Configura HOY (`src/services/hoy/visibility-service.ts`)

La fórmula pactada está implementada **exactamente**:

```ts
export function applyManualOverride(derived: Set<string>, manualRaw: unknown): Set<string> {
  if (!Array.isArray(manualRaw)) return derived;                       // ← sin config → motor manda
  const manualVisible = new Set(manualRaw.filter((k): k is string => typeof k === 'string'));
  const out = new Set(
    [...derived].filter((k) => !HOY_CARD_ORDER_DEFAULT.includes(k) || manualVisible.has(k)),
  );
  return out.size > 0 ? out : derived;                                  // ← guard anti-vacío
}
```

- **Visibilidad = motor − hides explícitos**: solo se restan cards que están en `HOY_CARD_ORDER_DEFAULT` y ausentes del array persistido. Cards derivadas fuera del catálogo (futuras) sobreviven — hay test.
- **Sin config persistida → motor idéntico a antes**: `readManualRaw` devuelve `undefined` tanto si no hay fila como si Supabase falla; `applyManualOverride` corta en el primer `if`. **Fail-soft correcto** — un error de red no puede vaciar el HOY.
- **Guard anti-vacío**: `out.size > 0 ? out : derived`. Test explícito con `[]`.
- **Función pura + 4 tests** en `visibility-service.test.ts`. ✅

**Nota de comportamiento (no defecto, doctrina):** una vez que el user guarda config, si apagó la card X y el motor luego la prescribe, X sigue oculta. Es precisamente el "guiado no prisionero" pactado — se documenta para que no se lea después como bug.

### 🌟 Ítem 6 · Edad ATP (`src/services/edad-atp/edad-delta-core.ts`)

Core canónico único con convención explícita (`delta = cronológica − integral`, positivo = más joven). **Las 4 superficies recableadas, verificado por grep:**

| Superficie | Ruta | Usa |
|---|---|---|
| HOY | `app/(tabs)/index.tsx:274` | `edadDeltaYears` |
| Diagnóstico (donde estaba el bug) | `app/salud/diagnostico/index.tsx:260` | `formatEdadDeltaValue` |
| Share card | `src/components/edad-atp/EdadAtpShareCard.tsx:23` | `edadDeltaYears` + `classifyEdadDelta` |
| Mi ATP / YO | `src/components/yo/YoEditorialSection.tsx:71` | `formatEdadDelta` |

**Cero cálculos de signo hand-rolled restantes** — grep de `"sobre tu edad real"` fuera del core devuelve solo el copy celebratorio del ShareCard (que ya deriva su clase del core).

**Test del caso real presente y correcto:**
```ts
expect(formatEdadDelta(35, 27.8)).toBe('7.2 años más joven que tu edad real');
expect(s).not.toMatch(/sobre/);
```
El ShareCard tenía la convención **opuesta** al motor y acertaba de chiripa — ahora deriva del core. Bien cazado.

*Cosmético P3:* `EdadAtpShareCard:26` usa `${Math.abs(delta)}` sin `.toFixed(1)`; un delta entero renderiza "7 años" en vez de "7.0 años". Inconsistente con las otras 3 superficies. No bloquea.

### 🛡️ Ítem 10 · Merge de duplicados — **INVARIANTE DOCTRINAL RESPETADA**

Auditado con foco especial porque el delivery dice "soft, reversible" y la UI llama a una función que se llama `deleteAgendaEvent`. **Verificado en `src/services/agenda-service.ts:526`:**

```ts
await supabase.from('agenda_events')
  .update({ is_active: false, updated_at: ... })   // ← SOFT. No hay DELETE.
```

No hay ningún `.delete()` en la ruta. La fila del user **persiste en la tabla**.

- **100% asistido:** `askMerge` solo se dispara desde `onPress` del banner, y el borrado ocurre dentro del `onPress` de la opción que el user elige en el `Alert`. **Cero caminos automáticos.**
- **"Dejar ambos"** presente como `style: 'cancel'` — siempre disponible, es el default del Alert.
- **Solo filas del user:** `findUserDuplicateGroups` filtra por `new Set(['manual', 'manual_override'])`. Test explícito de que las filas de máquina nunca entran al merge.
- **No contamina `disabled_protocol_events`:** el bloque de `getDisabledKeys` en `deleteAgendaEvent` solo corre para `source` ∈ {protocol, chronotype, intervention}. Las filas manuales quedan limpias.

*Observación:* la reversibilidad es **a nivel de dato** (`is_active = false`, recuperable por SQL). No existe UI de "restaurar" para eventos manuales desactivados. Consistente con el resto de la app; se registra como deuda menor si algún día un user se arrepiente.

### Ítems 2, 3, 4, 7, 8, 9 · verificados

- **2 · Casita:** `HOY_PATHS` → `TAB_PATHS = {'/', '/index', '/yo', '/kit'}`. El test se actualizó a la nueva semántica (no se borró cobertura). El eyebrow de `/kit` queda libre.
- **3 · Sheets:** solo `app/supplements.tsx` fue tocado. **`app/checkin.tsx` y `app/profile.tsx` NO aparecen en el diff** — confirmado que los falsos positivos no se tocaron innecesariamente. El `Modal` trae `onRequestClose` (Escape web + back Android) y `maxHeight` relativo `'88%'`.
- **4 · snake_case:** `raices` y `raices_que_ataca` pasan por `ROOT_LABELS`; `how`/`benefit` por `legibilizeKeysInText`; regla anti-guion-bajo añadida al system prompt. Verificado que `categories` no contiene ningún slug con `_` → no hay leak por esa vía. `name` del catálogo ya es texto humano.
- **7 · #64:** `git grep "as any"` cruzado con `href|pathname|push|replace|Redirect` sobre el tip → **0 resultados**. Cerrado de verdad.
- **8 · Assets:** validación exhaustiva — se extrajeron los **139 `require('@/assets/...')`** del árbol de código y se cruzaron contra `git ls-tree`: **cero faltantes**. Las únicas referencias `.png` a `yo/` y `habits-portal/` que sobreviven están en 3 markdowns de `R and D/` y `cowork_handoff/` (docs históricos, sin efecto en runtime). Peso confirmado: **9.30 MB → 2.20 MB en 22 archivos**. `expo-image ~3.0.11` ya estaba en deps.
- **9 · Morado:** cambios puramente de token de color; ninguna línea de lógica.

### ⚠️ Ítem 5 · Meet ARGOS — GATE VIGENTE

`src/constants/argos-meet-copy.ts` **sí lleva el flag** en el header:

> `⚠️ SENSIBILIDAD CLÍNICA: cambios a estos textos requieren approval de Mariana antes de merge (GATE VIGENTE para esta versión — ver delivery).`

**Precisión importante:** el gate es **procedimental, no runtime**. `MEET_SCREENS` es el constante que renderiza la pantalla — no hay feature flag ni versión antigua en paralelo. **Mergear = publicar el copy nuevo.** El flag documenta la deuda; no la contiene.

→ **Acción:** firma de Mariana ANTES del merge, o revertir el commit `f303ec4` del merge y re-aplicarlo cuando llegue el OK.

Higiene verificada: la key `'asistente'` → `'mentor'` no rompe nada (grep confirma que ningún componente referencia keys de `MEET_SCREENS` por string).

---

## 3. Regresiones y riesgos transversales

| Chequeo | Resultado |
|---|---|
| Requires inexistentes / assets faltantes | ✅ **0 de 139** |
| Rutas muertas | ✅ solo `/login` nueva en el diff — `app/login.tsx` existe |
| Casts de navegación | ✅ 0 |
| Imports rotos | ✅ ninguno detectado; CI verde autoritativo |
| **Doble-conteo de electrones** | ✅ **el diff no toca ni una línea** de electrones/protones/H+/`syncElectronFromEvent`/emisores `electrons_changed`/`day_changed` |
| **Secretos en el diff** | ✅ **0** (barrido de `sk-ant`, JWT `eyJ`, `service_role`, `api_key=`, `secret=`) |
| Migraciones SQL | ✅ **ninguna** — consistente con "Sin migraciones", OTA limpia |
| Cobertura de tests | ✅ +16 tests nuevos en los 4 puntos que se rompieron (1, 4, 6, 10) |

---

## 4. Nota operativa (no bloquea el código, sí el merge local)

El working copy en `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer` tiene el **índice de git corrupto**:

```
fatal: unknown index entry format 0xbd190000
```

Es el problema crónico conocido (repo sincronizado por OneDrive). Esta auditoría se hizo con un `GIT_INDEX_FILE` alterno para no tocar nada. **Antes del merge local, Enrique necesita reparar el índice:**

```powershell
Remove-Item "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\.git\index.lock" -ErrorAction SilentlyContinue
Remove-Item "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\.git\index"
git -C "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer" reset --mixed HEAD
```

(`reset --mixed`, no `--hard`: reconstruye el índice sin tocar el working tree.)

---

## 5. Deuda registrada (post-merge, ninguna bloquea)

1. **`assets/images/agenda/**` sigue en PNG** — diferido explícitamente por el delivery (pide recableo masivo de hermanos). Ejecutar con script.
2. **ShareCard sin `.toFixed(1)`** en el delta — cosmético, 1 línea.
3. **Sin UI de "restaurar"** para eventos manuales soft-desactivados por el merge de duplicados.
4. **`as any` de Supabase** (~60) esperan el sprint de tipos generados (`generate_typescript_types`).
5. **Configura HOY:** una card apagada por el user permanece apagada aunque el motor la prescriba después. Doctrina, no bug — documentado aquí para que no se re-abra como hallazgo.

---

## 6. Checklist de merge

- [ ] **GATE:** approval de Mariana al copy de Meet ARGOS (`src/constants/argos-meet-copy.ts`)
- [ ] Reparar índice git local (§4)
- [ ] Merge `fix/triple-audit-fixes` → `main`
- [ ] `npx tsc --noEmit` post-merge (sanity; el CI ya está verde)
- [ ] `eas update --branch preview` (OTA — no hay cambios nativos ni migraciones)
- [ ] Verificación en device: toggles de Configura HOY ocultan cards prescritas · sheet de sups en web + Escape · hubs sin flash negro · banner "Unificar" con los dupes de las 10:30 · CTAs lime/teal en Mente

---

*Auditoría pre-merge Cowork · solo lectura · sin modificaciones al repo.*
