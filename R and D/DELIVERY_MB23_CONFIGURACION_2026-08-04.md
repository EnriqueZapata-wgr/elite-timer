# 📦 DELIVERY MB-23 · Configuración, el tope de HOY y el retiro del acompañante

**Rama:** `feat/mb23-config` (worktree `../ATP-MB23`, base `main` @ `5a07184` con MB-22).
**5 commits, uno por pieza.** `tsc` 0 · Vitest 2672/2672 · `npm run censo` en verde en cada commit.
**Migración nueva:** `252_app_notification_prefs.sql` — **db push ANTES del OTA.**

| Commit | Pieza |
|---|---|
| `61f921c` | P1 · HOY abre arriba — muere el auto-scroll |
| `4b0958e` | P2 · Se retira el modo acompañante del ciclo — nada se borra |
| `ee001a2` | P3 · Avisos modelo mixto — el general manda, en código y en test |
| `25afc33` | P4 · Las demás configuraciones de la ficha — mover, no inventar |
| `8758151` | P5 · Audio: volumen, campana, vibración; cero controles que mienten |

---

## P1 · HOY abre arriba

Se retiraron `focusMomento` (campo y producción), `pickFocusMomento`, `captureBlockY`,
`captureContainerY`, `onRequestScroll` y el `scrollTo` de `app/(tabs)/index.tsx`, **con sus
tests** (4 de `pickFocusMomento` + 1 de `focusMomento`). `buildTareas` ya no recibe hora.
**Intacto:** `repartoTareas`, bloques por momento, progreso por bloque y global.

## P2 · Retiro del acompañante

- Ciclo instalable **solo en propio** y solo con perfil femenino; fuera el selector de modo.
  Perfil no femenino ve una nota honesta ("Ciclo se instala solo para registrar tu propio
  ciclo"), sin botón de instalar.
- **Quien lo tenía instalado en acompañante:** conserva TODOS sus registros y ve dos puertas
  en la ficha — *"Usar como mi ciclo"* (solo usuarias, Alert con el copy con dientes de
  siempre; confirmar escribe modo propio y reinstala encendiendo el electrón) o
  *Desinstalar* (la app sale de la cuadrícula, los datos quedan, la fila de modo queda).
- Migraciones 249–251 **sin tocar**; `user_app_modes` queda para el proyecto de permisos.
- Blindajes intactos: `canAccessCycle`, filtro de `period_log` en day-compiler, gate de
  `getCycleReport`, `canOpenCycleApp` (los acompañantes legacy siguen entrando a /cycle con
  su banner hasta que decidan).
- `installAppGridOnly` queda sin caller pero con core y tests, documentado para permisos.

## P3 · Avisos modelo mixto

**La decisión vive en `planAppAviso`** (`notification-prefs-core.ts`, puro):
`silent` → null SIEMPRE; hora del aviso dentro de la ventana de silencio → null; ficha
apagada → null; hecho hoy + "solo si no lo has hecho" → salta a mañana. **8 tests nuevos**,
el primero es la regla dura: *"EL MAESTRO MANDA: en silent ninguna app avisa, diga lo que
diga su ficha"*.

- **Migración 252** `user_app_notification_prefs` (user_id, app_key, enabled, notify_time,
  condition) — idempotente, RLS owner-only, **sin fila = comportamiento de hoy** (no avisa).
- **Ficha:** sección "Avisos" (toggle, hora con wheel, condición "Solo si no lo has hecho")
  para **meditar, respirar, journal y sol** — con leyenda de que el general manda.
- **Scheduling:** notificaciones locales one-shot (DATE), re-sincronizadas en cada compile de
  HOY con el hecho/no-hecho real del día (`syncAppAvisos` con memo de firma), al tocar
  Ajustes general y al editar la ficha. Identifiers namespaced en `@atp/app_aviso_notif_ids`
  — jamás `cancelAll` (#28).
- **Journal:** el recordatorio legacy (AsyncStorage) se importa UNA vez a la tabla, cancela
  su DAILY vieja y borra sus llaves; `journal-reminder-service.ts` murió; journal.tsx y la
  ficha comparten la fuente nueva. De paso el recordatorio de journal ahora SÍ respeta
  maestro y silencio (antes los esquivaba).

### Condiciones de aviso: qué se pudo y qué no

| App | Condición pedida | Estado |
|---|---|---|
| Meditación, Respirar, Journal | hora fija + solo si no lo has hecho | ✅ **Construida** (electrón booleano conocido en cliente) |
| Sol | cuando abre tu ventana de vitamina D | ⚠️ Parcial: **hora fija + no-hecho** construida; la ventana UV real necesita datos al disparar → **despachador server-side** |
| Hidratación | solo si vas atrasado a esa hora | ❌ Fuera: "atrasado a esa hora" exige evaluar el progreso AL disparar → despachador |
| Ayuno | al abrir/cerrar tu ventana | ✅ **Ya existía**: eventos de agenda (romper ayuno / ventana) → canal agenda, local + push |
| Suplementos | por horario de toma | ✅ **Ya existía**: `dose_times` → agenda_events → canal agenda (10 min antes) |
| Ciclo | cuando se acerca tu periodo | ❌ Fuera: requiere predicción fresca al disparar → despachador |

Nota técnica: los avisos son notificaciones **locales** — no hay código corriendo al
disparar, así que la condición se evalúa al AGENDAR y se re-evalúa en cada resync (compile
de HOY + `electrons_changed`). Un one-shot sin abrir la app después = a lo más un aviso
pendiente y silencio (no spamear a quien abandonó). Las condicionales de verdad viven en el
despachador server-side; si se construye, extraer el core a `_shared` (hoy la lógica de
enforcement está duplicada a mano en Deno con TZ hardcodeada — deuda preexistente).

## P4 · Configuración de fichas: movidos contra inventados

**Movidos (todo lo entregado):**
1. **Meta de proteína** — el stepper del viejo `protocol-config` (±10 g, piso 50, techo 400)
   revive en la ficha de Comida, escribiendo `goals.protein_goal_g` (la fuente que ya leen
   day-compiler y adherencia) + `day_changed`. Cero lectores nuevos.
2. **Momento del día por hábito** — la hora canónica (`TAREA_TIME`) deja de estar en piedra:
   `ConfigHorario` en la ficha (apps con UN electrón con hora) escribe
   `goals.habit_times[source]` (mismo jsonb, **sin migración**); `tareaTiming` (core puro,
   5 tests) deriva el bloque de la hora. Sin override, comportamiento idéntico.
3. **Renombre "Modo denso" → "Modo completo"** (ajustes + hint del hub de Salud) — el
   concepto ya existía, solo se unifica el nombre.

**Inventados: cero.**

**4.1 verificado:** agua, ayuno y enlace de suplementos siguen en su ficha (duplicados
honestos sobre la misma fuente); el recordatorio de journal ahora es su sección de Avisos.

**4.3 simple/completo unificado:** nutrición y salud dicen "Modo completo"; ayuno
(estimado/medido, flag apagado) documenta en `flags.ts` que al ganar UI se llama igual.
**El toggle de nutrición ya no promete de más:** el copy (toggle + alert de opt-in) dice lo
que hace — hub completo, revisión de macros al guardar por foto, score con micros — y
aclara implícitamente que el registro rápido no cambia. Se eligió **renombrar/honestar** el
copy, no tocar `food-register`/`food-text` (cambiarlos es rediseño de registro, otro run).

Notas: la "hora canónica de ayuno 9:00" del brief no existe — ayuno no es electrón con hora;
su hora es su ventana (ya editable en meta de ayuno / timer). Los hábitos sin app (baño
frío, grounding…) no tienen ficha donde editar su hora — quedan canónicos.

## P5 · Audio

- **Volumen de la pieza** expuesto en el player (stepper 10%, en vivo + persistido local en
  `mente-audio-prefs`, patrón "preferencia del device" como el modo completo de Salud).
- **Campana al empezar y terminar, o silencio** — cuenco real (`chime.wav`), escalado al
  volumen de la pieza; toggle en el player.
- **Vibración en vez de sonido** en Respiración (toggle pre-sesión): 3-2-1 y cierre vibran.
- Fix de paso: `playBowl` de meditación sonaba `playBeep` (8-bits de Fitness) → ahora cuenco.
- ⚠️ **REGLA DURA cumplida: cero deslizadores de voz/ambiente.** El archivo viene mezclado;
  el camino barato (pieza solo-voz + 6-8 loops ambientales) es contenido de Enrique, no de
  este run — documentado en el header de `mente-audio-prefs.ts`.

---

## Pendiente (fuera del run)

1. **Audit Cowork** de la rama antes del merge.
2. **`npx supabase db push`** (migración 252) **ANTES del OTA**.
3. **Device test** (los 6 puntos del brief): HOY arriba · ciclo sin acompañante y con datos ·
   apagar/mover aviso en ficha · maestro apagado = nadie avisa · proteína editable y
   reflejada · meditación con volumen+campana sin deslizadores separados.
4. Despachador server-side para las condicionales de verdad (agua atrasada, ventana UV,
   periodo cerca) — proyecto propio.
5. `onboarding-copy.ts:67` aún promete "vincularte con tu pareja" (companion viejo, flag
   muerto) — copy heredado que valdría limpiar en un sweep de compliance.
