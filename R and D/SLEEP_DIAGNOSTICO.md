# Sueño · diagnóstico

Reporte del dueño: *"los errores de sleep cycle dentro de la app, no funciona."*

18-ago-2026. Rama `main`.

---

## Resumen en cinco renglones

El módulo de sueño está construido, cableado y con buena hechura. No se cuelga
ni le falta permiso en el binario. Lo que falla es el número: **12 de las 14
noches guardadas en producción son imposibles** (dormiste más de lo que
estuviste en cama, hasta 24 h sobre una cama de 9 h). Eso ya está corregido y
viaja por OTA. Y **el Sleep Cycle propio nunca ha guardado una sola noche**:
las 14 filas vienen de Health Connect, ninguna de una sesión de buró.

---

## 1 · Lo que está roto

### 🔴 P0 · La duración del sueño importado se contaba dos y tres veces
**CORREGIDO. Viaja por OTA.**

`src/services/sleep/sleep-import-core.ts`, función `nochesDesdeTramos`.

La función sumaba los tramos de sueño uno por uno. El problema es que los
tramos **se traslapan**, y por diseño de las dos plataformas:

- **Health Connect** devuelve una `SleepSession` por cada app que escribe
  sueño. Un Samsung con reloj tiene el reloj, la app del fabricante y
  cualquier app de sueño de terceros escribiendo *la misma noche*. Health
  Connect las entrega todas.
- **Salud de Apple** entrega el tramo "dormido sin especificar" que cubre la
  noche completa **y encima** los tramos por tipo que la subdividen. Sumarlos
  cuenta la noche dos veces.

La consecuencia en la base de producción:

| noche | en cama | dormido guardado |
|---|---|---|
| 2026-08-04 | 9 h 03 | **24 h 00** (1,440 = el techo del CHECK) |
| 2026-08-05 | 7 h 53 | **23 h 16** |
| 2026-08-08 | 9 h 41 | **19 h 01** |
| 2026-08-09 | 8 h 08 | 8 h 08 ✅ |

**12 de 14 filas** violan la invariante más básica que existe: dormido nunca
puede ser mayor que el rato entre acostarse y despertar.

Esto es exactamente lo que el dueño ve: entra a Sueño, y la app le dice que
durmió 24 horas. "No funciona" es literal.

**El arreglo:** se mide la **unión** de los tramos, no su suma. Un tramo solo
aporta el tiempo que no estaba ya cubierto. Cinco renglones, lógica pura,
sin dependencias nuevas.

**Por qué se coló:** los seis casos del test de import usaban todos tramos
**que no se traslapan**. El caso real nunca se probó. Ya hay cinco pruebas
nuevas que sí lo cubren, incluida la invariante "dormido ≤ cama".

### 🟠 P1 · Las 12 filas malas no se arreglan solas
**Decide el dueño. Migración escrita, NO aplicada.**

El import nunca pisa una noche que ya existe (`ON CONFLICT DO NOTHING`). Ese
candado es correcto y no se tocó: existe para que un dato importado jamás
borre lo que la persona registró a mano. Pero tiene un efecto secundario:
**una noche importada mal se queda mal para siempre**, porque volver a
importar no la corrige.

`supabase/migrations/300_sleep_nights_limpiar_duraciones_imposibles.sql`
borra únicamente las filas **importadas** cuya duración es matemáticamente
imposible. No toca ninguna noche medida con el Sleep Cycle. Al volver a
importar desde la pantalla de Sueño, se reescriben bien.

Se borra en vez de corregir porque los tramos crudos nunca se guardaron (solo
el total), así que aquí no hay forma de recalcular el número correcto.
Inventar uno sería peor que no tenerlo.

**No la corrí.** `db push` queda a criterio del dueño.

### 🟡 P2 · El Sleep Cycle propio no tiene red de seguridad
**Alcance faltante, no bug. Requiere decisión.**

Cero filas con `source = 'sleep_cycle'` en producción. Las 14 son de Health
Connect. Nunca se ha guardado una noche medida desde el buró.

Revisado el código, no encontré un bug que lo impida: la lógica de alarma,
score y ronquido está bien y probada. Pero hay un hueco de diseño que
explicaría el cero perfectamente:

**Toda la sesión vive en memoria.** Las muestras de sonido, la hora de inicio
y la ventana de alarma viven en `useRef` dentro de `app/sleep-session.tsx`. La
noche solo se escribe cuando el usuario toca "YA DESPERTÉ" y corre
`terminarSesion`. Si en algún momento de esas ocho horas el sistema mata la
app, el usuario la manda a segundo plano, o el teléfono se reinicia, **la
noche entera se pierde sin dejar rastro y sin avisar**. No hay checkpoint ni
recuperación.

En Android esto es probable: sin un servicio en primer plano, el gestor de
batería puede matar la app dormida. El permiso `FOREGROUND_SERVICE` ya está
declarado en el binario, pero nadie levanta el servicio.

Las dos salidas:
- **Checkpoint periódico a AsyncStorage** (OTA, sin build). Guarda el avance
  cada pocos minutos y al volver a abrir ofrece cerrar la noche pendiente.
  No evita que la medición se corte, pero deja de perderlo todo.
- **Servicio en primer plano de verdad** (Android). Necesita código nativo.
  **No cabe por OTA.**

No lo implementé: es un cambio de diseño de la sesión, no un arreglo, y la
decisión es del dueño.

---

## 2 · Lo que NO está roto (y se creía que sí)

### La pantalla en negro es a propósito
`app/sleep-session.tsx` usa `<Screen edges={[]}>` sin `themed`, así que recibe
siempre el fondo oscuro, y encima pinta la paleta `NIGHT` (negro absoluto con
un rojo brasa muy tenue, `#B4443A` sobre `#000000`). Es un teléfono OLED que
pasa la noche encendido en el buró: el diseño es correcto y deliberado. La
clasificación del barrido visual como superficie inmersiva **es cierta**. La
pantalla sí pinta; se ve casi negra porque debe verse casi negra.

### El binario tiene todo lo que necesita
Verificado contra `app.json` (v2.2.0, iOS build 5, Android versionCode 23):

- `expo-audio` está en plugins y en dependencias (`~1.1.1`).
- `RECORD_AUDIO` y `MODIFY_AUDIO_SETTINGS` en permisos de Android.
- `NSMicrophoneUsageDescription` en iOS, con texto que ya menciona el Sleep
  Cycle explícitamente.
- `UIBackgroundModes: ["audio"]` en iOS.
- `android.permission.health.READ_SLEEP` para Health Connect.
- HealthKit con `NSHealthShareUsageDescription` que ya nombra el sueño.

**Nada de lo que se arregló aquí necesita build.** Todo es lógica pura.

### La tabla existe y las reglas están bien
`sleep_nights` está en producción con RLS activo y policy de dueño. El CHECK
de `source` acepta los tres valores desde el día uno. El UNIQUE
`(user_id, night_date)` sostiene "una noche, un registro" en la base.

### El candado de doctrina se respeta
La regla dura (dato importado NUNCA pisa uno escrito a mano) está amarrada por
un test estructural en `sleep-source-contract.test.ts`, que lee los archivos de
servicio y exige `ignoreDuplicates: true` en el import y su ausencia en la
sesión propia. **No lo debilité.** El P1 se resuelve borrando filas de máquina,
no aflojando el candado.

### El uso también estorba
Aparte de los números, hay fricción real: Sueño es una app *instalable* del
registro (`src/constants/app-registry.ts`), así que no aparece en la navegación
hasta que se instala; y el botón IMPORTAR de `/sleep` solo se dibuja cuando la
plataforma reporta `disponible`. Si el dueño no encontró dónde importar, puede
ser esto y no una falla.

---

## 3 · Qué cambié

| Archivo | Qué |
|---|---|
| `src/services/sleep/sleep-import-core.ts` | Unión de tramos en vez de suma. El arreglo real. |
| `src/services/sleep/__tests__/sleep-import-core.test.ts` | 5 pruebas del traslape: dos apps, tramo contenido, patrón de Salud de Apple, traslape parcial, invariante dormido ≤ cama. |
| `supabase/migrations/300_...sql` | Limpieza de las 12 filas imposibles. **Escrita, no aplicada.** |

Verificación: `tsc --noEmit -p .` termina en **0 errores**. La lógica corregida
se validó transpilando el archivo real y corriendo los ocho casos, incluido el
de producción (1,440 → 543 min) y los casos viejos que no debían romperse.

Nota: `vitest` no corre en el entorno Linux de esta sesión (a `node_modules`,
instalado en Windows, le falta el binario nativo de rollup y tengo prohibido
`npm install`). Las pruebas nuevas quedan escritas y deben correrse en Windows
antes del OTA.

---

## 4 · Qué sigue, en orden

1. **Correr `npx vitest run src/services/sleep` en Windows.** Verificación que
   no pude hacer aquí.
2. **Decidir sobre la migración 300.** Sin ella, la pantalla de Sueño sigue
   mostrando 12 noches falsas aunque el código ya esté bien.
3. **Re-importar** desde la pantalla de Sueño después de la 300, para que las
   noches se vuelvan a escribir con la duración correcta.
4. **Decidir sobre el checkpoint del Sleep Cycle (P2).** Mientras no exista,
   una noche interrumpida se pierde completa y en silencio. Esto es lo que
   separa "el Sleep Cycle existe" de "el Sleep Cycle sirve".

---

## 5 · La lección

El módulo tenía seis archivos de prueba y buena documentación, y aun así
entregó números imposibles durante semanas. Los tests probaban la forma
correcta del caso limpio y ninguno probó el caso sucio que las plataformas
reales entregan siempre. La prueba que faltaba no era complicada: *lo dormido
no puede ser más que el rato en cama*. Una invariante de una línea habría
tronado a la primera noche importada.
