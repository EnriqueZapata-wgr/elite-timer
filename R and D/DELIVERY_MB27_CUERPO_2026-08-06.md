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

---

# 🔁 ADDENDUM 2 · Vuelta 3 (audit V2, mismo día)

Doctrina del techo aplicada + N1 + B1/B4/B5/B6 reabiertos + 2 abiertos de la
vuelta 1. Migraciones: siguen siendo SOLO 256 y 257 — esta vuelta no agregó
ninguna. Suite: 270 archivos · 2979 tests · censo en verde en cada commit.

## 1 · El copy del renglón de conteo en HOY

**`"20 hábitos activos · Ordenar mi día"`** (singular: `"1 hábito activo"`),
sobre el chip quiet que ya existía (GradientCTA `variant="quiet"`, jerarquía
de renglón, no card). Sin compile aún: `"Ordenar mi día"` a secas — jamás un
número inventado.

Por qué ese: es la forma exacta del ejemplo del brief — el NÚMERO primero
(el marcador del propio día, cero adjetivos, cero juicio) y la SALIDA al
lado con el nombre literal de la pantalla destino. No hay palabra que
califique (nada de "demasiados/lleno/excede/deberías" — vetadas por
contrato de test) y no hay umbral: se pinta siempre. El conteo sale de lo
que el compile ya pintó (booleanos + cuantitativos activos), sin query
nueva.

## 2 · Enumeración de casos por cada línea tocada

**Doctrina techo (4 puertas):** (a) instalar app con toggles → enciende
directo; (b) instalar app cuyo MANDATORY está en reposo → revive directo
(0.4 vivo, sin aviso); (c) instalar app sin electrón → instala directo (el
aviso falso murió); (d) encender hábito en Mis hábitos → directo; (e)
encender un GRADUADO → la confirmación de graduación SIGUE (es doctrina de
graduación, no de techo); (f) aplicar pack → directo; (g) guardar plan con
strength en reposo → el consentimiento SIGUE (doctrina de reposo); (h)
usuario nuevo con 8+ renglones de arranque → cero avisos (el techo
inalcanzable murió). El conteo (B2) vive: `contarEncendido` cuenta la misma
lista que enciende installApp, con test de que la lista vieja mentiría.

**N1 (esImportable):** (1) pesas/yoga/pilates/básquet ('other', 20 m
agregados) → FUERA, y con ello el electrón de cardio por pesas; (2)
deporte desconocido con GPS real ('other', ≥150 m) → entra; (3) 'other'
sin distancia → fuera; (4) caminata/senderismo → fuera siempre; (5)
alberca/remo máquina/caminadora Android con agregado ambiental → ENTRAN
(B8 vivo); (6) outdoor 10 m en 6 min → fuera (ruido); (7) outdoor 40 m en
30 min → ENTRA (salvavidas); (8) mapeado sin distancia o en 0 → entra;
(9) iOS espejo de 6-7; (10) <5 min → fuera. Fronteras exactas en test:
150 m y 1200 s.

**B1 (recalcPeriods + anclas + frescura):** (1) marcar → reconstruye (como
siempre); (2) desmarcar → reconstruye (el zombi muere); (3) desmarcar el
último día con período → la tabla se LIMPIA (el return temprano murió);
(4) editar síntomas sin tocar is_period → no reconstruye (nada cambió);
(5) fase de hoy con dato viejo → null en TODAS las superficies; (6)
overlay histórico de emotion-history → getCycleBasics sin guarda de hoy,
su guarda por fecha sigue; (7) bandas + predicción de período + punto de
ovulación → UNA ancla (inicioCalendario); (8) procedencia del largo → se
dice en /cycle Y en Entrenar. El test ejecuta el caso del audit por los
dos caminos de entrada y demuestra la corrupción vieja (Día 1 Menstrual,
observado 30 en vez de 31).

**B4 (savePlanSemanal):** los 6 casos — normal ok; insert falla → intacto
+ false; apagar día + poda falla → ROLLBACK a estado exacto + false;
vaciar + poda falla → false (el usuario ve el error, no un éxito con el
plan vivo); poda y rollback fallan → duplicados temporales + false (B7
resuelve al más nuevo, el siguiente guardado poda); lectura falla → false
sin tocar nada. `ok: true` existe UNA vez en el cuerpo (contrato).

**B5 (caché):** lectura ok → cachea {usuario, fecha local, filas}; red
caída mismo día → sirve caché (misma rutina, mismo kicker que en la
mañana); otro día / otro usuario / caché corrupto → null (mañana es otra
asignación); guardar plan ok → INVALIDA (no se sirve el plan recién
cambiado); guardar falla → caché intacto (el plan viejo sigue siendo la
verdad). Cubre hub y fitness-train (ambos pasan por getAsignaciones).

**B6 (composición):** (1) filtro asimétrico muerto: ambos candidatos son
"última fila CON peso" (health-score ganó el `.not('weight_kg','is',null)`
que ya tenía nutrition) → mismo peso en ambas superficies, verificado en
test contra pesoMasReciente; (2) ganador con bloque completo → todo de la
misma medición, cero collage; (3) ganador sin un campo → se completa del
otro registro DECLARADO en `completadosDelOtro`; (4) músculo en kg → % con
el peso de SU registro; (5) un solo registro → sin inventos; (6) ninguno →
nulls (defaults solo en el engine); (7) empate de fecha → canónica.

## 3 · Las tres decisiones defendidas

**recalcPeriods:** reconstrucción completa ante CUALQUIER cambio de
`is_period` (comparado contra el valor previo del log). Costo: 1 select +
1 delete + 1 insert batch por edición de período — barato. Compra: la
tabla derivada JAMÁS diverge de los logs, que son la fuente del gesto. La
alternativa (parchar solo el grupo tocado) ahorra un query y reabre los
estados intermedios corruptos que REG-2 ya había enterrado.

**Salvavidas del GPS fallido:** SÍ, por duración — en disciplina MAPEADA
con distancia propia diminuta, ≥20 min entra. Defensa: el TIPO del
proveedor ya es evidencia de ejercicio (alguien/algo lo etiquetó carrera);
con duración sustancial, el GPS casi en cero es sensor muerto y no ruido.
20 min separa limpio: el glitch corto típico (paseo al súper mal
etiquetado, arranque accidental) no llega; una carrera real sí o sí.
'other' NO tiene salvavidas: sin tipo confiable, la distancia es su único
discriminante y el piso es absoluto.

**Completar campos entre registros de distinta fecha:** el registro
ganador (última fila CON peso) aporta su bloque completo; el campo que no
trae se completa del otro registro y queda DECLARADO en
`completadosDelOtro`. Defensa: si la usuaria no volvió a medir grasa,
cualquier regla mezcla épocas para el FFMI — el default inventado (20 %)
también fabrica uno que nunca existió, y el dato viejo al menos fue de su
cuerpo. La diferencia con la regresión señalada: la mezcla dejó de ser el
camino por defecto y silencioso; es fallback explícito, visible al caller.

## Cierre de la vuelta

- B3 murió con la doctrina (la mitad viva — el consentimiento de reposo —
  quedó y está en contrato).
- El copy de cardio-import dice las reglas nuevas en sus DOS superficies.
- El panel del coach ya no pinta el plan propio del cliente como chips de
  rutina asignada (`.is('focus', null)`; asume la 257, mismo contrato
  merge → db push → OTA de todo el run).
- `?focus=` abre el teclado (autoFocus en los 4 campos ruteados); peso es
  el primer campo del form, el scroll no aplica ahí.
