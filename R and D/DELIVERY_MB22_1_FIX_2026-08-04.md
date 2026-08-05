# 🔒 DELIVERY MB-22.1 · cerrar la fuga y no quitarle nada a nadie — 2026-08-04

**Rama:** `feat/mb22-centro` (continúa). **5 commits, uno por pieza.**
Migraciones nuevas: **250** y **251** (idempotentes). `tsc` 0 · vitest
**2664/2664** (250 archivos, +17 tests) · censo en verde antes de cada commit.

---

## P1 · La fuga, cerrada — y la enumeración completa

`getCycleReport` ahora pasa por `canAccessCycle(sex, mode)`: sin ciclo propio,
reporte vacío (`logsCount 0`) y la sección Ciclo de /reports no se pinta.

### Enumeración: TODAS las consultas directas a tablas de ciclo (23 sitios)

| Dónde | Tabla(s) | Veredicto |
|---|---|---|
| `reports-service.ts:457` getCycleReport | cycle_daily_logs | **ERA LA FUGA** → gateada (P1) + test que la entierra (P4) |
| `app/cycle.tsx` ×7 (lectura mensual, upsert día, borrar/insertar periodos) | daily_logs, settings, periods | Pantallas del Ciclo, tras `useCycleGate`; en acompañante muestran SU calendario dentro de la app: correcto por diseño |
| `app/cycle-settings.tsx:57,94,108` | cycle_settings | Tras gate; embarazo/modalidad ocultos en acompañante desde MB-22 P4 |
| `app/cycle-settings.tsx:67,257,283,315` | cycle_companions | Código MUERTO bajo `COMPANION_MODE_ENABLED=false` (E-5, MB-12): el modo-compañero viejo de cuentas conectadas. Inerte; es otro proyecto |
| `app/cycle-history.tsx:41` | cycle_periods | Tras gate: calendario en pantalla de Ciclo, correcto |
| `app/cycle-charts.tsx:68` | cycle_daily_logs | Tras gate: ídem |
| `cycle-service.ts:119-120` | periods, settings | LA RAÍZ — solo se alcanza tras su propio gate sex+modo |
| `day-compiler.ts:220` | cycle_daily_logs (count) | La query corre siempre, pero su única superficie (`period_log`) se filtra en acompañante (belt P4 + contrato). Sin fuga a UI ni a score |
| `interventions/prescription-service.ts:263` readPregnancy | cycle_settings (pregnancy_status) | Dato del CUERPO del usuario; solo escribible en propio (UI de embarazo oculta en acompañante). Sin datos de terceros |
| `supplements-service.ts:47` isPregnancyActive | cycle_settings (pregnancy_status) | Ídem + `resolvePregnancyActive` exige female en el core |
| `supabase/functions/data-export-generator` | todas | Export de datos propios (portabilidad): en acompañante exporta el calendario que el usuario mismo registró — es su dato. Correcto |

**Conclusión:** una sola fuga real (reports). El resto: pantallas gateadas,
raíz, datos propios de embarazo, código muerto bajo bandera y export legítimo.

## P2 · Nadie pierde apps (mig 250)

Siembra `installed_apps` de TODO usuario existente con las **23 llaves sin
gate** (no solo las 8 sin electrón: también las de toggle apagable — respirar,
nback, entrenar, sueño, ayuno, glucosa, cetonas — que igual desaparecerían).
Idempotente (`@>` salta filas completas). Usuarios sin fila reciben una solo
con la siembra: verifiqué que los DEFAULT de columna (043+248) producen
**exactamente el mismo HOY** que la ausencia de fila (booleanos vía unión con
MANDATORY; steps/sleep se filtran en compiler) — cero cambio en TAREAS.
Quien se crea después del push empieza de cero (el discriminador
existente/nuevo es el momento de la migración misma).

*Ventana conocida:* cuentas creadas entre el push y su primer OTA usarán unos
días el binario viejo (sala completa) y al actualizar verán el set limpio.
Cohorte de horas/días, sin pérdida de datos.

## P3 · Ciclo (usuarias) + Respirar al set inicial

- **Mig 251:** usuarias existentes conservan Ciclo (unión idempotente,
  después de la 250) y se reafirma modo propio con `ON CONFLICT DO NOTHING`
  (jamás pisa un modo elegido).
- **Cuentas nuevas:** siembra one-shot en cliente (`seedInitialApps`,
  bandera `goals.mb22_seed_v1`, fail-soft: sin write no hay bandera y
  reintenta): **Respirar para todos** y **Ciclo propio para usuarias**, vía
  grid-only. **Cero electrones nuevos → cero filas en TAREAS**: aparecen en
  la cuadrícula y activar el hábito (breathwork / period_log) sigue siendo
  decisión del usuario. Si Enrique quiere que Respirar además nazca con fila,
  es agregar `breathwork` a DEFAULT_BOOLEANS — decisión de HOY, aparte.
- Set inicial resultante: hombre nuevo **10 apps**, mujer nueva **11 (con
  Ciclo)**.

## P4 · El blindaje amarrado — RESULTADO REAL DE LAS MUTACIONES

16 tests nuevos en 4 archivos (`cycle-service-gate`, `app-mode-service`,
`cycle-report-gate`, `day-compiler-cycle-mode-contract`) + `supabase-fake`
(builder encadenable que **registra qué tablas se tocaron**: "ni siquiera
consultó cycle_periods" es parte del contrato).

Cada mutación se aplicó DE VERDAD al fuente, se corrió su suite y se
revirtió. Salida real de vitest:

| # | Mutación | Resultado |
|---|---|---|
| M1 | `getCycleInfo` ignora el modo (`canAccessCycle(sex)` sin `mode`) | **1 failed** — `AssertionError: expected { currentDay: 16, …(7) } to be null` (el test "ACOMPAÑANTE devuelve null AUNQUE sea female") |
| M2 | Borrar el filtro de `period_log` en day-compiler | **1 failed** — `AssertionError: EL FILTRO DEL MODO SE BORRÓ: period_log palomearía con el ciclo de otra persona` |
| M3 | `getCycleAppMode` devuelve `'propio'` ante error de lectura | **1 failed** — `AssertionError: expected 'propio' to be null` |
| M4 | Quitar el gate de `getCycleReport` | **2 failed** — `expected { periodDays: 2, avgEnergy: 3, …(2) } to deeply equal { periodDays: +0, … }` y `expected 3 to be +0` (métricas del calendario ajeno agregadas como del usuario) |

Las 4 truenan. La capa pura ya tronaba antes (cycle-access-core.test);
ahora la raíz, el compiler, el servicio de modo y la fuga tienen dientes.

## P5 · Lo chico

- **5.1** Cardio: "Correr, ciclismo, natación y remo" (las 4 reales de
  `fitness-cardio.tsx`). Caminar no existía; natación faltaba.
- **5.2** En la ficha de Ciclo el **MODO va antes del botón de instalar**:
  nadie se instala como propio por accidente.
- **5.3** Em dash fuera del copy visible (meta de ayuno usa `·`); en las
  pantallas nuevas solo quedan em dashes en comentarios.
- **5.4** El delivery de MB-22 queda corregido en el propio doc: la Edad ATP
  **sí** consume ciclo (`app/edad-atp/biomarkers.tsx:28,101` vía
  `getCycleInfo` — el grep original solo miró `src/services/edad-atp/`).
  El comportamiento es correcto (null → "fase desconocida") **porque pasa
  por la raíz**, no porque no consuma.
- **5.5** "Wim Hof" se queda: nombra la técnica (como Braverman). Decisión
  escrita en comentario del registro.

## Pendientes (fuera del run)

1. Audit Cowork de los 10 commits de la rama.
2. **db push (migs 249+250+251) ANTES del OTA** — el orden 250→251 importa.
3. Merge + OTA + device test (los 5 del brief + los 8 de MB-22).
4. Notas previas que siguen vivas: `protein_goal_g` sin writer desde
   `0a9241c` (14-jul); `compileDay` +1 query (user_app_modes); verificar en
   device el `router.replace('/centro')` del deep link `kit?agregar=1`.

## Verificación en dispositivo (las 5 del brief)

1. Ciclo acompañante + registrar días → **Reportes: la sección Ciclo NO aparece.**
2. Usuario con apps existentes actualiza → **no pierde ninguna** (migs 250/251).
3. Cuenta nueva femenina → **ve Ciclo** (y Respirar) en su cuadrícula.
4. Ficha de Ciclo → **el modo se elige antes de instalar.**
5. Cardio dice **natación, no caminar.**
