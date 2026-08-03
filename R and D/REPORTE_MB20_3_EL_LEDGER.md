# 📦 REPORTE MB-20.3 · el ledger deja de ser un arma cargada

**Rama:** `feat/mb20-1-editorial` · 6 commits (5 piezas + esta entrega)
**Gates:** `tsc` 0 errores · Vitest 2617/2617 · `npm run censo` verde — antes de cada commit.
**Cero migraciones**, como pedía el run.

---

## 1 · El resultado REAL de la prueba de mutación (lo más importante)

### 1a. La batería que rompe consultas — con el seguro puesto

`reconcile-core.test.ts` construye el día con el **ledger LLENO** (los 7
electrones del reconcile ya ganados) y rompe cada consulta con las formas
exactas que devuelve supabase-js (que no lanza en 4xx):

| Mutación | Forma inyectada | Revocaciones |
|---|---|---|
| exercise_logs devuelve error | `{ data: null, error: { code: '42703' } }` | **0** |
| exercise_logs devuelve la fila ilegible del bug P1 | `{ data: { date: null }, error: null }` | **0** |
| el count de suplementos falla (familia del bug P2) | `{ count: null, error: {...} }` | **0** |
| cada una de las 7 consultas, rota una por una (error Y forma nula) | ambas formas | **0** |
| apagón total (las 7 fallan a la vez) | — | **0** (y 0 awards: el ledger queda EXACTAMENTE como estaba) |

Y el contraste que demuestra que el reconcile **no quedó castrado**: con las
fuentes respondiendo bien y diciendo "aquí no hay nada" (count 0 / data null
sin error), las revocaciones **sí** ocurren (`strength`, `supplements`,
`cardio` en el escenario del test). La única llave que abre el revoke es
evidencia positiva de ausencia.

### 1b. La contra-mutación — el seguro quitado a propósito

Para verificar que la batería no está en verde por vacía, muté
`planReconcile` a la semántica vieja de dos estados
(`ev !== 'hecho' → revoke`) y corrí la suite. **Resultado real: 6 tests en
rojo**, con los electrones borrados visibles en el assert:

- exercise roto → `revoke: ['strength']` (el bug P1, reproducido)
- count de suplementos roto → `revoke: ['supplements']` (el bug P2)
- apagón total → `revoke:` **los 7**

Mutación revertida; suite de vuelta en verde 19/19.

### 1c. La mutación de rutas del brief

`checkin → '/pantalla-que-no-existe'`: con el test viejo, **55 tests en
verde y censo en verde** (confirmado en el brief; el test se comparaba
contra su propia constante). Con el test nuevo que lee `app/`:
**3 tests en rojo**. Revertido.

---

## 2 · ¿El reconcile pudo distinguir los dos casos?

**Sí — no hubo que sacar `strength` ni `supplements` del reconcile.** La
evidencia se deriva exactamente donde caen las respuestas crudas de
supabase, así que los tres estados son derivables sin rediseño:

- `error` presente → **no_se_sabe**
- fila presente pero sin fecha legible → **no_se_sabe** (la familia del bug P1)
- `count` que no es número → **no_se_sabe** (el `?? 0` viejo leía "cero actividad")
- respuesta sana y vacía → **no_hecho** (evidencia real de ausencia)

`reconcile-core.ts` es puro (testeable en node); day-compiler solo le pasa
las respuestas y ejecuta el plan. Toda revocación deja rastro
(`logWarn('[reconcile] revoca electrón', { source, date, motivo })` →
breadcrumb en Sentry).

**El límite, dicho honesto:** el tri-estado cubre la clase "la consulta
falló, vino nula o su fila es ilegible". No puede cubrir una consulta que
responde bien con datos **bien formados pero mal alcance** (el filtro
`is_active` de P2 era de ese tipo). Para esa clase quedan los contratos de
source: P1 fija la exclusión de nulos, P2 fija que el ledger de suplementos
no puede depender de la lista de activos, y P3 fija que day-compiler deriva
cada llave con el derivador del core y que la ÚNICA llamada a
`revokeBooleanElectron` del compilador vive dentro del loop de
`plan.revoke`.

---

## 3 · Las rutas que quedaron en VERIFIED_ELECTRON_ROUTES

**Dos**, cada una con su motivo escrito en `day-booleans.ts`:

| Llave | Ruta | Por qué no puede salir del puente |
|---|---|---|
| `checkin` | `/checkin` | el puente diría `/emotions` (el hub del módulo); la card manda al FLUJO de check-in — device test Enrique MB-20.2 |
| `cardio` | `/log-cardio` | el puente diría `/fitness-cardio` (el hub); la card manda DIRECTO a registrar sesión — FIT-3 (MB-3) |

Las otras siete eran duplicado exacto del puente y resuelven por
`routeForBool`. El test nuevo (`rutas-pantallas-reales.test.ts`) cruza
VERIFIED_ELECTRON_ROUTES, QUANT_ROUTES, las 25 puertas del app-registry y
EXPERIENCIA_REGISTRO contra los **archivos reales de `app/`** (reusa
`collectRoutes` del censo, que ya sabe de grupos e index) — no depende de
`router.d.ts`, que está destrackeado y en CI degrada.

---

## 4 · Lo demás del run

- **P1**: `.not('date','is',null)` en exercise_logs Y nback_sessions (la
  misma bomba sin detonar). cardio/journal/mind verificados como
  `NOT NULL DEFAULT CURRENT_DATE` en 036/033/049 — sin guard, y el contrato
  fija esa premisa también.
- **P2**: el embed de activos se conserva para la card (hallazgo de CC
  intacto); el ledger pregunta con su propio count de `supplement_logs`
  taken=true de hoy, sin filtro de activos.
- **P5.1**: guard generacional en optimize-images — manifest
  content-addressed (sha1 del archivo tal como quedó) **sembrado con el
  estado actual sin re-encodear una generación más**. Corrida real de
  verificación: `Processed: 0 | Skipped: 30`, cero diffs en assets.
- **P5.2**: nback ordena por `date` (el campo que decide) con
  `completed_at` solo de desempate.
- **P5.3**: `pillarRoute` y `description` fuera de BoolElectronState;
  `HoyEditorialSection.tsx` borrado (huérfano confirmado por censo y grep);
  `uv.webp` solo lo requería ese archivo → borrado con él
  (assets-references lo exigía).
- **P5.4**: los JPEG progresivos (default mozjpeg) declarados en la
  cabecera del script.

**Nota de infra:** una corrida de la suite murió con un crash nativo de
Node en Windows (`v8::ToLocalChecked Empty MaybeLocal` al preparsear un
módulo CJS) — no reproducible: las dos corridas siguientes completas en
verde 2617/2617. No es un test fallando; queda anotado por si reaparece.

---

## 5 · Verificación en dispositivo (pendiente, la del brief)

1. Registrar un entrenamiento → la card Entrenar se palomea y muestra su dato.
2. Volver a HOY varias veces → **el electrón de fuerza sigue ahí** (el crítico).
3. Registrar un suplemento, desactivarlo, volver a HOY → el electrón sigue ahí.
4. Las cards mandan a donde deben; las que no tienen ruta siguen sin flecha.
