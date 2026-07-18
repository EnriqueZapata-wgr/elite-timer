# Auditoría pre-merge — `fix/mega-blockers-beta` (mega-blockers beta)

**Fecha:** 2026-07-17
**Auditor:** Cowork (pre-merge, solo lectura)
**Rama:** `fix/mega-blockers-beta` @ `fd3066d` (4 commits batch-1..batch-4 sobre `main` @ `0abe750`)
**Alcance del diff:** 42 archivos, +1635 / −175

---

## VEREDICTO: ✅ APTO PARA MERGE

Cero bloqueadores P0. El fix clínico #4 está correctamente gateado por sexo en ambos call sites, el corazón (batch-4) unifica el estado hecho/no-hecho sin romper HOY ni Agenda, no hay migraciones nuevas (nada que `db push`), y el árbol compila limpio (tsc EXIT=0).

---

## 1. [P0 CLÍNICO #4] Máscara embarazo/lactancia — RESUELTO ✅

Se creó un núcleo puro `src/services/pregnancy-gate-core.ts` con cortocircuito por sexo:

```ts
export function resolvePregnancyActive(input: PregnancyGateInput): boolean {
  if (input.biologicalSex !== 'female') return false;   // ← gate P0
  const status = input.pregnancyStatus as { is_pregnant?: unknown } | ...;
  if (status && typeof status === 'object' && status.is_pregnant === true) return true;
  return input.cycleModality === 'pregnancy';
}
```

Los DOS call sites quedan blindados:

- **`supplements-service.ts` `isPregnancyActive()`** ahora selecciona `biological_sex` y delega en `resolvePregnancyActive({...})`. Antes leía `pregnancy_status` / `cycle_modality` sin filtrar sexo.
- **`interventions/prescription-service.ts` `fetchUserPhenotype()`**: `pregnancy: gender === 'female' ? pregnancy : false`.

Un usuario **male / null / undefined NUNCA puede disparar el flag embarazo/lactancia** aunque exista un dato residual/seed en `cycle_settings.pregnancy_status` o `client_profiles.cycle_modality`. Cubierto además por test `pregnancy-gate-core.test.ts`. **P0 cerrado.**

## 2. TypeScript — LIMPIO ✅ (EXIT=0)

`npx tsc --noEmit` **NO se puede correr contra el working tree del mount de OneDrive**: el mount devuelve lecturas truncadas (~5 KB) que hacen que tsc reporte errores de lexer falsos (TS1002 unterminated string, TS1005 `}` expected, TS1010) en decenas de archivos que **esta rama ni siquiera toca** (`breathing-library.ts`, `quiz-service.ts`, `electrons.ts`, `dx-engine.ts`, tests de community…). **Es artefacto del mount, no del código** (confirmado: mismos archivos difieren en tamaño byte-a-byte entre blob de git y lectura del working tree).

Resultado autoritativo: extraje el árbol commit `fd3066d` vía `git archive` a tmpfs (bypassa OneDrive) y corrí tsc ahí → **EXIT=0, cero errores.** El código commiteado compila limpio (cumple regla #8 / estándar "0 errores TS").

## 3. Batch-4 (EL CORAZÓN #30) — CORRECTO ✅

- **Núcleo puro único de estado hecho/no-hecho:** `src/services/hoy/day-state-core.ts` (`buildDoneIndex` + `applyDoneFromLogs`). Merge OR determinístico por `intervention_key` y por concepto canónico (`canonicalConcept`). **Nunca des-marca** (solo `completed=true`; una instancia pending jamás pisa una compleción real — dato del user sagrado). Cableado en `day-compiler.ts` (líneas 776-790), del que derivan tanto HOY como Agenda. No rompe ninguna de las dos superficies.
- **Path de notificación local (estilo journal):** `src/services/agenda-local-notifications.ts` replica el mecanismo de journal con `scheduleNotificationAsync` on-device. **Respeta el landmine documentado**: cancela SOLO por identifier propio namespaced en AsyncStorage, NUNCA `cancelAllScheduledNotificationsAsync` (no borra el recordatorio de journal). Respeta prefs (`shouldNotify` canal `agenda`/quiet hours). El push server queda como refuerzo, sin tocar. Invocado desde `app/(tabs)/index.tsx` y `app/agenda.tsx`.
- **Migración nueva:** NINGUNA (correcto por diseño — batch-4 usa notificación local + merge puro, no requiere tabla nueva).

## 4. Migraciones — NINGUNA NUEVA en la rama ✅

`git diff --name-status main..fd3066d -- supabase/migrations/` → vacío. El árbol de la rama tiene las mismas 152 migraciones que `main`. **No hay nada que `npx supabase db push` tras el merge.** (Nota fuera de alcance: sigue pendiente de backlog el rename 198a/198b→198/199 del tren anterior — task #85 — no introducido ni afectado por esta rama.)

## 5. Batch-3 (Design System) — OK ✅

- Tokens de color en `src/constants/brand.ts` (SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC, gradients…) — exports intactos, no rompen imports (tsc EXIT=0 lo confirma).
- `imageBn` en `hoy-cards.ts` queda `undefined` **a propósito** (documentado en el archivo, #91): el registry es data pura; los assets reales los inyecta la capa de app. No es regresión.
- Todos los `require()` de assets nuevos existen en disco: `mente-avanzado.png`, `biomarcadores.png`, `tests-evaluaciones.png`, `habits-portal/sueno.png`, `bg-sleep.jpg`. El único `assets/images/agenda/...` "sospechoso" es texto dentro de un comentario, no un require real. **Cero require() a assets inexistentes.**

## 6. Rutas muertas — CERO ✅

- `/sleep`: `HoyEditorialSection` hace `go('/sleep')` y `app/sleep.tsx` existe (238 líneas nuevas). `app/my-chronotype.tsx` también existe.
- `HomeFloatingButton` montado en `app/_layout.tsx`.
- Sin dead-links en los push/href nuevos.

## 7. Doctrina / copy — OK ✅

- Sin nombres propios en copy user-facing nuevo (0 hits de Humby/Mariana/Enrique en strings `.tsx` añadidos).
- No se introduce lime-brutalist nuevo: los usos de `ATP_BRAND.lime` son acentos/íconos/bordes con opacidad (editorial), token de marca sancionado (lime+teal son los principales del design system), no bloques brutalistas.
- Copy en español MX.

---

## Riesgos / notas (no bloqueantes)

1. **Mount OneDrive:** el working tree se lee corrupto/truncado desde el mount Linux. No afecta el merge (git usa blobs), pero **Enrique debe correr `npx tsc --noEmit` en Windows local** como verificación final de rutina antes del push (ya validado aquí vía extracción limpia = EXIT=0).
2. **Deploy:** al no haber migraciones ni cambios nativos, esta rama es **OTA-elegible** (`eas update --branch preview`); no requiere build nativo (regla #9/#10).
3. Backlog previo intacto (#85 rename migraciones, #86/#87 bugs Tipo Piel / agenda duplicados) — no tocado por esta rama, no bloquea este merge.

---

## Resumen accionable

- **Veredicto:** APTO PARA MERGE.
- **P0:** ninguno.
- **Migraciones nuevas para db push:** ninguna.
- **Post-merge:** merge → OTA `eas update --branch preview`. Correr `npx tsc --noEmit` en Windows local como sello final.
