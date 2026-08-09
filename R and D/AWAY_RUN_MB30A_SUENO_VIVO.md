# 😴 AWAY RUN MB-30A · El sueño cobra vida

**Rama:** `feat/mb30a-sueno` desde `main` (en `b998841`) · **worktree propio.**
**Trae configuración nativa** y probablemente migración. `tsc`, Vitest y `npm run censo`
en verde antes de cada commit.

⚠️ **CORRE EN PARALELO con `feat/mb30b-nativo`.** Para que no choquen:

| Este run TOCA | Este run NO TOCA |
|---|---|
| `app/sleep.tsx` y la pantalla nocturna nueva | ⛔ el filtro nocturno de sistema |
| `src/services/sleep/*`, import de salud | ⛔ acciones de notificación |
| permisos de micrófono y `READ_SLEEP` en `app.json` | ⛔ `expo-camera` y el escáner |
| | ⛔ **la versión en `app.json`** |

🚨 **NO toques `"version"` en `app.json`.** El bump y el build son un paso final aparte,
después de que las dos ramas estén en `main`. Regla 11 de `CLAUDE.md`.

## El estado real

`app/sleep.tsx` ya existe y **es honesta**: muestra tu ventana según cronotipo y dice
*"Próximamente: ATP Sleep Track"* sin inventar gráficas. **Ese es el hueco que este run
llena.**

Hoy el módulo de sueño no tiene un solo dato propio. Es el tercio de la vida del cliente
que no vemos.

---

# PIEZA 1 · El Sleep Cycle interno

## El modelo, y por qué este y no otro

**La app abierta en el buró toda la noche**, pantalla en negro y rojo muy tenue, teléfono
cargando. Con la app en primer plano el micrófono funciona sin trucos de segundo plano.

🚨 **SENSOR: MICRÓFONO, NO ACELERÓMETRO.** Es decisión de doctrina, no de ingeniería: el
acelerómetro exige el teléfono bajo la almohada, y campos electromagnéticos junto a la
cabeza durante el sueño van contra la postura de salud funcional de ATP. **El micrófono
escucha desde el buró.**

## Lo que entrega

- **Alarma inteligente en rango.** Defines tu ventana de despertar (por ejemplo 6:30 a
  7:00) y dentro de ella te despierta cuando el sonido sugiere que estás menos profundo.
  **Con rampa de volumen: empieza muy bajito y sube.** Si no detecta el momento, suena al
  cierre de la ventana. ⚠️ **Nunca puede NO sonar.** Una alarma que falla es peor que no
  tenerla.
- **Contador de horas**, de "me dormí" a que despiertas.
- **Score de la noche y tiempo roncando**, por patrones de sonido.

🚨 **SIN FASES Y SIN PROMETERLAS.** Ni "sueño profundo", ni "REM", ni gráfica de etapas.
Un score honesto de qué tan movida estuvo la noche. **Que el copy no insinúe más de lo que
mide**, y que haya test del copy.

## Modo avión: doctrina hecha función

Todo el procesamiento es local y la app está en primer plano, así que **la noche entera
puede correr con los radios apagados** y sincronizar en la mañana.

**Recomiéndalo desde la propia pantalla**, con el porqué en una línea. Cero señales junto a
tu cabeza. ⚠️ **Que la app funcione igual sin red**: si algo se cae sin internet, el
consejo se vuelve una trampa.

## Privacidad, que es lo que Apple va a preguntar

🚨 **EL AUDIO JAMÁS SE GRABA NI SE SUBE.** Solo se procesan niveles y patrones en el
dispositivo, y no se guarda ningún fragmento.

Eso debe estar **en el copy de la pantalla, en el texto del permiso, y escrito en el
reporte** para que pase al aviso de privacidad. Un micrófono activo toda la noche es lo
primero que revisión de tiendas va a cuestionar.

⚠️ `RECORD_AUDIO` ya está en `app.json` para Android. **Verifica el texto de permiso de
iOS** (`NSMicrophoneUsageDescription`) y que explique el uso nocturno con claridad.

## La pantalla nocturna

Negro con rojo muy tenue, la hora y la alarma, y muy poco más. Pantalla siempre encendida
mientras dure la sesión.

⚠️ **Esta pantalla comparte paleta con el modo noche de MB-31, pero no su función.** No
construyas el sistema de temas aquí: eso es de MB-31. Usa los colores que necesites y
**anótalos en el reporte** para que MB-31 los absorba.

---

# PIEZA 2 · Importar el sueño que el teléfono ya mide

La segunda vía, para no depender de que la primera se use.

**HealthKit en iPhone y Health Connect en Android.** El proyecto ya lee ejercicio,
distancia, frecuencia cardiaca y calorías: **reúsa ese camino, no construyas otro.**

⚠️ **Falta el permiso `android.permission.health.READ_SLEEP` en `app.json`.** Está el de
ejercicio y los demás, no el de sueño.

⚠️ **Y revisa el arreglo de MB-27:** el import de cardio nunca funcionó porque el `CHECK`
de `source` no aceptaba `health_connect` ni `healthkit`. **Si el sueño escribe en una tabla
con una restricción parecida, míralo antes de escribir código.**

⚠️ **Si hay dos fuentes para la misma noche** (tu sesión de la pieza 1 y el import),
decide cuál manda y **dilo en el reporte.** Nunca dos verdades del mismo dato.

---

# PIEZA 3 · La pantalla de Sueño deja de estar vacía

Con datos propios, `app/sleep.tsx` puede mostrar: tu hora real de acostarte contra tu hora
objetivo, tus horas dormidas, tu score y tu tiempo roncando en el tiempo.

⚠️ **Sigue viéndose bien vacía.** Quien no use el Sleep Cycle ni conecte nada debe
encontrar una pantalla honesta, no un esqueleto de gráficas sin datos. **Eso ya lo hace
bien hoy y no se puede perder.**

⚠️ **Lee `docs/DESIGN_SYSTEM.md` antes de tocarla.**

---

# PIEZA 4 · Tests

1. **La alarma siempre suena:** si no se detecta el momento ligero, dispara al cierre de la
   ventana. La mutación que la deje sin fallback truena.
2. **El copy no promete fases:** barrido que truene con "profundo", "REM", "etapa" o
   "ciclo de sueño" en copy visible.
3. **Nada de audio se persiste:** ningún camino guarda ni sube un fragmento.
4. **Sin red, la sesión completa funciona** y sincroniza después.
5. **Una noche, un registro:** si hay sesión propia e import, no nacen dos verdades.
6. Tests de servicio con `supabase-fake` de lo que toques.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **qué permisos nativos agregaste y con qué texto** ·
qué fuente manda cuando hay dos · qué tan confiable te salió la detección de ronquido en
tus pruebas · los colores de la pantalla nocturna para que MB-31 los absorba · el resultado
real de las mutaciones.

🚨 **Y escribe un párrafo, listo para copiar, sobre el uso del micrófono**: qué se procesa,
qué no se guarda y qué nunca sale del teléfono. Va al aviso de privacidad y a la respuesta
de revisión de tiendas.

**Actualiza `R and D/FIFO_PENDIENTES.md`.** ⚠️ También lo toca MB-30B: **espera conflicto y
NO lo resuelvas.**

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **No hay OTA para este run:** trae configuración nativa. **El build se hace UNA vez,
después de que MB-30A y MB-30B estén las dos en `main`.** Ni siquiera lo intentes.
