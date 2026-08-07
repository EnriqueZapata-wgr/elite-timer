# 📦 DELIVERY MB-27 · Cuerpo — 2026-08-06

**Rama:** `feat/mb27-cuerpo` (7 commits, brief + piezas 0-5). **NO mergeada:**
modo remoto vigente (6-9 ago). Checks en cada commit: `tsc` 0 errores,
Vitest 2946/2946, `npm run censo` en verde.

**Corrió en la nube** (claude.ai/code sobre el repo). El `.env` del worktree
sí estaba disponible: ningún test tronó por variables de entorno.

---

## Los 6 puntos de la ENTREGA

### 1 · Tabla de composición canónica

**`health_measurements`, exactamente como recomendaba la pieza 1.1 — sin
diferencia con el dictamen del brief.** Es la que el usuario llena
(onboarding, `/health-input`, `/edad-atp/composition`), la única con
`UNIQUE(user_id, date)` y la que alimenta Edad ATP y el score. La migración
**256** le agrega `arm_cm`, `leg_cm`, `chest_cm` (lo único que solo tenía la
otra). `body_measurements` NO se tocó: es el panel clínico del coach
(`measured_by`, fotos, policy propia — otro dominio, otro dueño).
`edad_atp_body_composition` sigue como estaba (retirarla es otra decisión).
Bonus 1.2: la meta de proteína ya lee la canónica (antes leía SOLO la tabla
del coach y caía siempre al default); `body_measurements` quedó de
complemento, patrón `health-score-service`.

### 2 · scheduled_routines y la autoasignación

**Sirvió CON un ALTER mínimo (migración 257).** La RLS owner de la mig 001
ya permitía autoasignarse (`assigned_by = user_id`), pero `routine_id NOT
NULL` exigía rutina guardada y el flujo real del usuario es por ENFOQUE del
generador (que no persiste filas en `routines`). El ALTER: `routine_id`
opcional + columna `focus` (CHECK con los 6 enfoques) + CHECK de que toda
fila agende algo. Cero tablas nuevas. El RPC `get_today_routines` NO se
tocó (su INNER JOIN ignora filas de enfoque; el panel de coach ve
exactamente lo mismo). ⚠️ El cliente resuelve "hoy" en LOCAL
(`plan-semanal-core`): el `CURRENT_DATE` del RPC es zona del servidor — a
las 7pm de CDMX ya es mañana en UTC y contestaría el día equivocado.

### 3 · La colisión del alias 'peso'

**Se mudó a la app nueva.** Para el usuario "peso" es su peso corporal, no
el que levanta: `'peso'` salió de los alias de `rm` (1RM, que conserva
levantamiento/registrar/series y gana `'barra'`) y entró a `'medidas'`
(la app nueva de Cuerpo, junto con báscula/composición/grasa/cintura).
Buscar "peso" en el Centro ahora lleva al peso corporal.

### 4 · Diagnóstico real del import de cardio

**La causa raíz del "nunca ha funcionado" fue el CHECK de `source` — y ya
está resuelta.** El backlog (1-ago) reportó el síntoma ANTES de que la 246
llegara al remoto; hoy la 246 está aplicada y el test de contrato la
amarra. Revisado el camino completo de código con el source descartado:

- **El camino del insert está sano**: dedupe doble candado, columnas
  existentes (mig 225), award idempotente solo-hoy.
- **El gate de versionCode pasa**: `binarioConDelegate()` exige vc ≥ 18 y
  el binario actual va en 19 con el delegate registrado — el diálogo de
  permisos nativo ya no crashea; en binarios viejos la ruta manual (abrir
  ajustes de Health Connect) sigue disponible.
- **Lo que solo el dispositivo puede confirmar**: (a) que la lectura esté
  CONCEDIDA en Health Connect (sin permiso, `leerEntrenamientos` regresa
  vacío sin error visible — se ve como "no funciona"); (b) en iOS, la
  forma del API de `@kingstinct/react-native-healthkit`
  (`requestAuthorization`/`queryWorkoutSamples`) contra el binario real.
- **El segundo bug real era el de los filtros (4.2), ya cerrado**: las
  caminatas entraban como 'other' con GPS y no había distancia mínima —
  eso también leía como "el import no sirve" (importaba basura).

Test en dispositivo: conectar → conceder → importar → debe traer solo
entrenamientos reales. Si aún así regresa vacío, el sospechoso es el logcat
de `[health-import] lectura:` (el catch silencioso del service).

### 5 · Puerta de captura de peso y medidas

**`/edad-atp/composition` es LA puerta; no nació ninguna pantalla de
captura nueva.** Ya pre-puebla desde la canónica, guarda solo campos
modificados (upsert por día) y tiene `?focus=`: la app **Medidas**
(`/medidas`, pantalla nueva de consulta) manda "Registrar peso" con
`?focus=weight_kg` (el form abre directo en el peso: menos de diez
segundos) y "Tomar mis medidas" al form completo, donde entraron brazo,
pierna y pecho. `/health-input` quedó como estaba: es la evaluación de
salud completa (presión, agarre, bienestar), otro trabajo. La gráfica de
tendencia usa `SimpleLineChart` (su primer consumidor real) y no promete
nada: pinta la serie y ya.

### 6 · 🛫 Migraciones pendientes de `db push` (literal, una por línea)

```
256_health_measurements_medidas.sql
257_scheduled_routines_autoasignacion.sql
```

La migración 256 queda pendiente de db push.
La migración 257 queda pendiente de db push.

(La 254 aparece en el diff solo por el comentario corregido en 0.6 — cero
cambio de esquema, ya está aplicada en remoto, no requiere push.)

⚠️ Al volver: `merge` → `npx supabase db push` → `eas update`. **En ese
orden.** Si el OTA sale antes que la 256/257, Medidas y el plan de
entrenamiento truenan buscando columnas que no existen.

---

## Resultado REAL de las 12 mutaciones

Ejecutadas de verdad: mutar → correr la suite del caso → confirmar ROJO →
restaurar. Runner en `America/Mexico_City`.

| # | Mutación aplicada | Resultado |
|---|---|---|
| 1 | regex de hora aflojada a `\d{1,2}` en `esHoraValida` | 🔴 `pack-core.test` (1 falla) |
| 2 | filtro de quants sin fuente removido de `renglonesDeHoy` | 🔴 `techo-core.test` (2 fallas) |
| 3 | `hoy-habitos` decide encendido solo con prefs (ignora estado) | 🔴 `mb27-contratos` (1 falla) |
| 4 | `habitosQueEnciende` recorta los MANDATORY | 🔴 `install-core.test` (1 falla) |
| 5 | `elegirPesoKg` invertido (gana el panel de coach) | 🔴 `nutrition-score-core.test` (2 fallas) |
| 6 | dedup por día removido de `serieDePeso` · upsert→insert en capture-service | 🔴 `medidas-core.test` (4 fallas) · 🔴 `mb27-contratos` (1 falla) |
| 7 | `diaSemanaLocal` parsea en UTC (`new Date(str)`) | 🔴 `plan-semanal-core.test` (5 fallas) |
| 8 | `plan-semanal-service` importa `habit-states-service` | 🔴 contrato de imports (1 falla) |
| 9 | umbral folicular movido en el core · umbral local plantado en `/cycle` | 🔴 `cycle-phase-core.test` (2 fallas) · 🔴 ratchet (1 falla) |
| 10 | query lateral a `cycle_periods` en Entrenar | 🔴 contrato (1 falla) |
| 11 | veto a caminatas y piso de distancia removidos de `esImportable` | 🔴 `health-import-core.test` (2 fallas) |
| 12 | lector nuevo de `goals.habit_times` en un servicio ajeno | 🔴 ratchet de lectores (1 falla) |

Suite completa tras restaurar: **270 archivos · 2946 tests · 0 fallas.**

---

## Verificación en dispositivo (Enrique, al volver y tras merge + push + OTA)

1. Registrar peso toma menos de diez segundos y la gráfica muestra la tendencia.
2. La meta de proteína usa su peso real, no el default.
3. Entrenar le dice qué le toca hoy sin elegir enfoque (y el descanso dice cuándo sigue).
4. Con `strength` en reposo, guardar el plan AVISA en vez de revivirlo solo.
5. Entrenar muestra su fase (cuenta de usuaria) y en folicular SUMA, no solo resta.
6. La misma fase se ve igual en Ciclo, en el calendario y en Entrenar.
7. Importar cardio no mete caminatas ni registros de 10 metros.
8. Un hábito en reposo se ve en reposo en Mis hábitos.
9. Escribir `7:00` en un pack ya no truena al guardar.

## Notas para el audit de Cowork

- La etiqueta vieja del motor de intervenciones (`'ovulatory'`) se alineó
  al canónico `'ovulation'`; `normalizeCyclePhase` quedó de frontera de
  validación (fase desconocida degrada a lútea). El hash de fenotipo ya
  cambiaba con cada transición de fase: el rename es equivalente a una.
- El cruce de fase del HOY (day-compiler) ahora es bidireccional: la
  sugerencia y las notas de agenda empujan en folicular/ovulación. Eso
  cambia qué sugerencia domina esos días (misma precedencia que ya tenía
  la lútea).
- `CycleCalendar.tsx` sigue sin consumidores (huérfano), pero era una de
  las tres copias de umbrales del brief: quedó consolidado igual.
- Los glifos nuevos (`moon/ribbon-outline` en Mis hábitos,
  `calendar-outline` en Entrenar) están inventariados a conciencia en el
  censo de iconos.
- `PLAN_MAESTRO_V2_A_V21.md` lleva ahora la nota de numeración (los MB de
  Cuerpo en adelante corren +1; `ESTADO_CONTINUIDAD.md` manda).

---

# 🔁 ADDENDUM · Vuelta del audit rojo (mismo día)

Los 8 bloqueantes y los 10 menores del
`AUDITORIA_PREMERGE_MB27_2026-08-06.md`, cerrados en commits nuevos sobre la
misma rama. El caso concreto probado por bloqueante está en el mensaje de
cada commit y en el reporte del run.

**Corrección a este delivery (menor 10):** donde este documento y el commit
de la Pieza 0 dicen que instalar una app "revive sus MANDATORY", lo preciso
es: revive los MANDATORY **con app** (cardio, journal, checkin vía sus apps).
`no_processed_foods` y `screen_time_cutoff` viven en ELECTRONS_SIN_APP:
ninguna instalación los alcanza jamás — su ruta de rescate del reposo es
`/ordenar-dia`. No es callejón sin salida, pero la afirmación era más ancha
que el código.

**Decisiones tomadas en la vuelta (para el audit):**

- **B1**: la fuente que manda es `cycle_periods` (fallback a logs SOLO sin
  periods), el largo observado gana al ajuste manual (M3.b) y la guarda de
  frescura vive DENTRO de `resolverCiclo`. `getCycleDay` murió.
- **B5**: las dos superficies contestan lo mismo y la que manda es el hub
  (la ruta real de la app Entrenar): genera y anuncia con la asignación.
- **B7**: precedencia = específica > semanal; rutina concreta > enfoque;
  entre rutinas la más antigua; entre enfoques el guardado más nuevo.
  El editor DICE los días con rutina agendada.
- **B8**: el piso de 150 m solo aplica donde la distancia es del propio
  ejercicio (iOS per-workout; Android solo tipos outdoor con GPS). El
  agregado ambiental de Android ya no descalifica indoor.
- **NOTA**: `CycleCalendar.tsx` se BORRÓ — cero importadores vivos; el
  ratchet dejó de amarrar un componente muerto. Si renace, el test de
  consumidores lo exige sobre `resolverCiclo`.

Migraciones: siguen siendo SOLO la 256 y la 257, pendientes de `db push`.
La vuelta no agregó migraciones nuevas.
