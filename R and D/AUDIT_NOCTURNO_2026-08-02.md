# 🔍 Audit Cowork · run nocturno

**Rama:** `feat/nocturno` · **21 commits** (ojo: incluye los 4 de MB-19.2, que se mergean con esto)
**Método:** dos auditores en paralelo sobre el árbol extraído, con experimentos reales, no lectura de diff.

# 🟠 VEREDICTO: un bloqueador de dos strings, y una verificación obligatoria antes del `db push`

---

# ⚠️ ANTES DE `db push` · esto primero

## La migración 246 puede aplicarse, reportar éxito, y no arreglar nada

`246_cardio_source_health.sql:18` hace `DROP CONSTRAINT IF EXISTS cardio_sessions_source_check`.

**Si el nombre real en la base viva es otro** (036 lo creó como CHECK en línea, y Postgres
autogenera el nombre), el DROP no hace nada y el ADD crea **un segundo CHECK aditivo**. El
viejo sigue rechazando `health_connect` y `healthkit`, **el import sigue roto, y la migración
dice que todo salió bien.**

CC dejó la query de verificación en la cabecera del archivo. **No es una nota, es un gate.**
Córrela en el SQL Editor antes de empujar:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'cardio_sessions'::regclass AND contype = 'c';
```

Si el nombre que sale **no** es `cardio_sessions_source_check`, hay que corregir la migración
con el nombre real antes de aplicarla.

---

# 🚨 BLOQUEA MERGE

## B1 · Instalar promete una fila que 5 apps nunca crean

El copy dice, tanto en el Alert de instalación como en el paso 7 del tour:

> *"Aparece su fila en TAREAS y su hábito empieza a contar desde hoy."*

**Es falso para 5 de las 16 apps instalables:** Sueño, Ayuno, Glucosa, Cetonas y Movilidad.

Ninguna genera fila, porque sus electrones no están en las listas que TAREAS consume
(`QUANTS_SIN_FUENTE` excluye `sleep`; los de ayuno, glucosa y cetonas no están en
`ALL_BOOLEAN_OPTIONS`; movilidad no tiene electrón).

Lo único que pasa al instalarlas es que se prende un punto lima. **El usuario toca Instalar, ve
la confirmación, va a TAREAS, y no hay nada.**

CC documentó que existe esa clase de app, pero dejó el copy prometiendo lo contrario. **Son dos
strings.** O se ramifica el copy por clase, o esas cinco dejan de ser instalables por ahora.

---

# 🟠 ARREGLAR ANTES DEL OTA

## A1 · La paloma inteligente existe en 3 de 6, y el reporte dice otra cosa

`SmartCheckModal.tsx:82` solo pinta el botón SÍ si la experiencia es capturable, y la lista es
`['meditation','breathwork','cardio']`.

Para **Entrenar, Journal y N-Back el modal tiene un solo botón: "IR AHORA".** No hay SÍ.

El delivery afirma *"Journal, N-Back y Entrenar: el SÍ navega a su registro real"*. **El código
no hace eso.** No hay un SÍ que navegue: hay un modal de un botón.

El efecto es peor que no hacer nada: en esas tres filas el tap largo **agrega fricción para
terminar haciendo exactamente lo mismo que el tap simple.**

## A2 · La card de la orbe puede no aparecer nunca el día que importa

`OrbCard.tsx:37-50` lee el insight **una sola vez al montar** y devuelve `null` si no existe.
El insight lo **genera** `index.tsx:229` en paralelo, en otro efecto.

En la primera entrada del día casi siempre gana la carrera la lectura: **no hay insight todavía,
la card devuelve null, y como el tab no se desmonta, queda invisible todo el día.**

Falta un listener de `day_changed` o un refetch al enfocar.

## A3 · El orden se rompe con horas de un dígito

`tareas-core.ts:262` ordena comparando strings. Las horas canónicas llevan cero a la izquierda,
pero `day-compiler.ts:715` construye la de "Romper ayuno" sin `padStart`.

Con el ayuno terminando a las 9:30, el string `"9:30"` **ordena después de `"22:30"`**: la fila
se va al final del bloque y de la lente AGENDA, y además se pinta desalineada.

## A4 · La migración 246 · ver arriba

## A5 · El tour secuestra al usuario

`OrbTour.tsx:46-53`: cada cambio de paso dispara una navegación. **No hay detección de que el
usuario navegó por su cuenta.** Si se sale, la burbuja lo persigue y el siguiente "SIGUIENTE" lo
arrastra de vuelta. El brief pedía que se pausara y ofreciera continuar.

## A6 · La divergencia de Respiración sigue viva donde sí se ve

A3 migró `mente-hub-core.ts`, que **no lo renderiza nadie**. La copia que sí se ve está en
`mente-streaks-core.ts:29` (`icon: 'leaf-outline'`, que en el mapa significa Grounding) y se
pinta en la pantalla Rachas. **Se arregló la copia invisible y quedó viva la visible.**

---

# 🟡 NOTAS

- **Nadie corrió la suite completa en Linux limpio**, y A1 acaba de volverla bloqueante del CI.
  Un `npm ci && npm test` local antes del merge evita una sorpresa en el primer push.
- **`assets/backgrounds` sigue en 35 MB** y no lo cubre ningún guard. Es más peso que todo
  `assets/images` ya optimizado. Es la siguiente bolsa.
- **El brief pedía dos preguntas al instalar y no se hicieron:** instalar es un Alert de
  Instalar o Cancelar, y la pantalla de ajustes finos por app no existe. CC lo declaró corte de
  V1 con un argumento razonable, pero el entregable no está.
- **TAREAS y `/agenda` siguen mostrando listas distintas.** Dentro de TAREAS la fuente es una,
  pero las intervenciones, suplementos programados y comidas viven solo en `/agenda`.
- **Bug de medianoche:** `tareas-core.ts:231` usa `parseInt(...) || 12`, así que `"00:30"` cae a
  tarde en vez de mañana.
- **El contador del nudge cuenta rebotes falsos** por una carrera con la recompilación del día.
- **Test que miente:** `install-core.test.ts:85`, "sol enciende sus dos electrones", compara el
  resultado contra sí mismo filtrado. Pasa siempre. Y `sun_awareness` en realidad nunca se
  enciende.
- **`flash-outline` no entró al ratchet** contra lo que pedía el brief. CC documentó la razón y
  es defendible, pero sus 19 usos quedan sin protección.
- **El estado rojo sigue en el árbol** (`argos-avatar-core.ts:36`) sin consumidor. Material para
  resucitarlo. Borrarlo con el resto.
- **`ArgosMark` usa `useId()` como id de gradiente SVG**, lo que produce ids con dos puntos.
  Verificar en device que el mark se pinta con degradado y no en negro, sobre todo en el chat
  donde se monta muchas veces.
- Comentarios obsoletos: `argos-orb-core.ts:15` dice que copia los colores tres líneas antes del
  import que lo desmiente; y quedan tres comentarios que anuncian el tour viejo.

---

# ✅ LO QUE QUEDÓ SÓLIDO

**El TRAMO A pasa limpio, y con evidencia dura:**

- **207 `require()` de asset verificados, CERO apuntando a archivo inexistente.** Ese era el
  riesgo que tumbaba el bundle entero y no existe.
- **56 MB → 9.6 MB.** Los 129 WebP con cabecera válida, ninguno de 0 bytes, ancho máximo 1200 px.
  **De los 86 PNG convertidos, ninguno tenía transparencia**, así que no se perdió nada.
- **`app.json` sin tocar**, sus cuatro PNG intactos: el build nativo no corre riesgo.
- **El CI muerde de verdad:** `npm test` y `npm run censo` como steps directos, sin
  `continue-on-error`.
- **Los dos huecos del ratchet, cerrados y PROBADOS con sondas:** un Ionicon nuevo falla, y el
  segundo uso del mismo glifo en un archivo ya inventariado también.
- **`GLIFOS_DE_FUNCION` ahora se deriva de `ICON_MAP`**, ya no es copia a mano.
- Catch lateral: **ocho `.wav` de N-Back que nunca habían entrado a git** ahora sí. Sin eso, el
  CI recién montado habría fallado en su primera corrida.

**De MB-20:**

- **Una sola fuente de datos.** TAREAS y la lente AGENDA aplanan la misma estructura.
- **Los dos gestos completos:** llenado de 350 ms, reversión al soltar, vibración real,
  degradación con reduce motion.
- **Desinstalar NO borra historia. Verificado**: no hay un solo `delete` en la ruta.
- **Ayuno solo navega**, hidratación captura inline, el ATP Score salió de HOY, la card de la
  orbe colapsa y recuerda.
- **`setOrbState('alerta')` por fin tiene disparador.**
- **`ArgosAvatar` borrado**, sus consumidores usan la orbe, y **el rojo ya no se pinta**: cuando
  ARGOS no está disponible es orbe atenuada más palabras.
- **12 pasos de tour con "Terminar" en TODOS**, retomable desde ajustes.
- **Censo en verde.** 184 rutas, ninguna puerta absorbida por TAREAS quedó huérfana.
- **La migración 247 es idempotente y su RLS ya estaba cubierta** por la tabla que extiende.
