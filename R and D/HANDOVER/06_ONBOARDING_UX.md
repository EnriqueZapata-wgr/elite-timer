# El primer minuto

> Diseño de la capa de experiencia del onboarding. No es un plan de implementación de las
> nueve pantallas: es el diseño del momento en que la persona que ya pagó ve la app por
> primera vez.
>
> Verificado contra el código de `main` el 18 de agosto de 2026. Todo lo que se afirma
> aquí tiene archivo y línea. Cuando este documento y `ADOPCION_ANALISIS.md` se
> contradigan, gana este: varias fugas de aquel ya se cerraron y se anotan abajo.

---

## Veredicto en una línea

El onboarding no está roto, está **mudo el usuario**. Desde `positioning` hasta el paso 12
del tour hay cerca de noventa segundos en los que la app habla y la persona solo mira, y
al final de ese monólogo la primera cifra que ve quien acaba de pagar $890 es **un cero**.
Eso es lo que hoy más rompe la sensación, y se arregla sin tocar una sola pantalla del
onboarding.

---

# Parte 0. Qué verifiqué, y qué del análisis previo ya no aplica

Antes de diseñar nada, contraste contra el código. Tres cosas del análisis de adopción ya
se corrigieron y **no hay que volver a arreglarlas**:

| Afirmación previa | Estado real hoy |
|---|---|
| "La siembra no corre al terminar el onboarding, espera al tab ATP" | **Corregido.** `app/onboarding/v2/notifications.tsx:71` llama `seedInitialApps` + `sembrarDia1` en un `Promise.all` con try/catch fail-soft. `kit.tsx:102` quedó como red idempotente. |
| "No existe estado vacío en `TareasView`" | **Existe.** `src/components/hoy/TareasView.tsx:317-339`, condicionado a `ofrecerArmarDia(total)`. Copy: *"Tu día está corto a propósito"*. |
| "`centro/index.tsx` promete el atajo y entrega la ficha" | **Corregido.** `app/centro/index.tsx:145` sí lleva a `/packs/armar`. |
| "El día 1 son 12 o 13 tareas" | **Son 8.** `SIEMBRA_DIA_1` (3) + `MANDATORY_BOOLEANS` (5), unidos en `src/services/day-compiler.ts:426-429`. |

Y cuatro cosas que el análisis previo no vio, que pesan más que las anteriores:

1. **El margen entre la celebración y el tour es de 700 ms, no de 3 segundos.** La
   celebración dura exactamente 2300 ms (`onboarding-completion-core.ts:24-31`) y el tour
   arranca a los 3000 ms (`app/(tabs)/_layout.tsx:98`). El comentario del código lo dice
   sin rodeos: el delay "secuencia con la celebración". Es decir, está diseñado para que
   el usuario no tenga ni un segundo de silencio.
2. **Salir del tour en el paso 1 lo marca visto para siempre.** `OrbTour.tsx:96` escribe
   `ORB_TOUR_DONE_KEY` dentro de `finish()`, y `finish()` corre tanto al completar como al
   abandonar. El tour tiene la peor propiedad posible: aburre a quien lo aguanta y pierde
   para siempre a quien lo salta.
3. **`haptic.*` ignora el ajuste de vibración y `sounds.ts` ignora el de sonido.**
   `src/utils/haptics.ts` no consulta `vibrationEnabled` en ninguna de sus siete
   funciones, y `settings-context.tsx:31` lo define con default `true`. Doscientos
   archivos llaman `haptic.*`. Apagar la vibración en Ajustes no apaga casi nada. Igual
   con `soundsEnabled` (`settings-context.tsx:28`) y `src/utils/sounds.ts`.
4. **`AnimatedPressable` no dispara háptica.** Cada llamador la invoca a mano dentro de su
   `onPress`. Es la fuente de que unos botones vibren y otros no, sin patrón, en toda la
   app.

Un quinto que no es de sensación pero sí de riesgo: **`app/index.tsx:65-67` degrada a
tabs en el `catch`.** Un fallo de red al arrancar mete a un usuario sin onboarding y sin
consentimientos CB-2/3/4 directo a HOY. Eso es compliance, y a catorce días del
lanzamiento es lo primero que yo tocaría de todo este documento.

---

# Parte 1. El diagnóstico de sensación

"Que se sienta rico entrar" no es un problema de animación. Es un problema de **turno de
palabra**.

Esta es la secuencia real, con los tiempos verificados:

| Tramo | Quién habla | Duración | Input del usuario |
|---|---|---|---|
| `positioning` | la app | lo que tarde en leer | **cero** |
| `/argos/meet`, 5 pantallas | la app | ~28 a 30 s sin tocar | tap para adelantar, que nadie sabe que existe |
| Selector de voz | la app pregunta | ~5 s | 1 toque |
| Celebración | la app | 2.3 s, `pointerEvents="none"` | **cero, no se puede ni tocar** |
| Silencio | nadie | **0.7 s** | cero |
| OrbTour, 12 pasos | la app | 12 toques o 1 para salir | ninguno que haga nada |

Son cuatro monólogos consecutivos. El avatar es un profesional de alto rendimiento de 35 a
55 años que acaba de pagar. Lo estamos sermoneando durante minuto y medio.

Y el remate: cuando por fin puede actuar, aterriza en una lista de **8 filas que no
eligió**, con la barra en **0 de 8**, y de esas 8 **solo 4 se palomean con el dedo**
(`sunlight`, `no_alcohol`, `no_processed_foods`, `screen_time_cutoff`). Las otras cuatro
son verificadas: tocarlas te saca a otra pantalla en vez de completar.

**La primera cifra que ve quien pagó es un cero, y la mitad de sus tareas no se pueden
hacer desde donde está parado.** Eso es lo que rompe la sensación. Todo lo demás es
secundario.

Hay un segundo problema, más sutil y más caro de arreglar: **todo el "wow" del arranque
pasa encima de la app, no dentro de ella.** La celebración es un overlay negro al 82% con
`zIndex: 9000`. El tour es otra capa encima. La cinemática de ARGOS es una pantalla
aparte. La interfaz real nunca hace nada impresionante; lo impresionante son las cortinas
que le ponemos delante. Las cortinas se sienten a demo. Que la interfaz real responda se
siente a producto caro.

---

# Parte 2. El primer minuto

## La idea, en una frase

**La app se arma frente a él, y él le da el último toque.**

Se elimina la cortina y el momento heroico se muda a la pantalla real: el usuario ve HOY
vacío y ve cómo se escriben sus filas, una por una, con su nombre arriba. Después toca una
y le contesta. Ese es el minuto.

## La condición previa: el pack tiene que existir antes de aterrizar

Hoy no puede ser así, y esta es la pieza estructural que hay que mover. La secuencia
verificada:

```
notifications.tsx:71   sembrarDia1(user.id)        ← siembra 3 genéricos + escribe la bandera
notifications.tsx:76   completeV2Step()
notifications.tsx:129  finish(false, '/packs/armar?origen=onboarding')   ← el pack se elige AQUÍ
```

La siembra corre y pone su bandera (`goals.cierre1_dia1_v1`) **antes** de que exista la
oportunidad de elegir pack. Y `sembrarDia1` acepta un segundo parámetro `packBooleans`
(`install-service.ts:195`, honrado en `install-core.ts:183-199`) que **ningún llamador
pasa**. El parámetro está escrito y muerto.

> **Corrección del 18 de agosto de 2026: `packBooleans` NO está probado.** Una versión
> anterior de este documento decía "escrito, probado y muerto". Verificado buscando
> `packBooleans`, `sembrarDia1` y `siembraDia1` en todos los `*.test.ts` del repositorio:
> **cero resultados.** Existe `src/services/hoy/__tests__/install-core.test.ts`, pero
> prueba `seedInitialApps`, que es otra función.
>
> O sea que el día que alguien le pase el segundo argumento, **no hay red debajo**, y ese
> día es justo el del cambio 1 de este documento. Escribir esa prueba es parte del cambio,
> no un extra. Y ojo con la trampa de fondo: quien escribió "probado" no mintió, dio por
> bueno un número que no midió. Es el mismo patrón que produjo tres conteos distintos de
> banderas en veinticuatro horas.

Consecuencia: quien elige pack no arranca con los 3 hábitos de su pack. Arranca con los 3
genéricos **más** los 3 del pack encima. Nadie recibe nunca lo que el diseño prometía.

**Cambio 1 (el único estructural de este documento): la pregunta del pack sube a ser la
última pantalla del onboarding, y notificaciones baja a ser contextual.**

No es una pantalla nueva. Es el paso 1 de `/packs/armar` (`armar.tsx:150-178`, cinco
opciones, un toque, sin botón de siguiente) puesto donde importa. Cumple la doctrina de
UNA acción por pantalla mejor que la pantalla de notificaciones que sustituye, porque
notificaciones tiene tres botones compitiendo.

Con eso, `sembrarDia1` recibe por fin sus `packBooleans` y el día 1 son **3 filas del pack
del usuario**, no 8 ajenas.

> Nota de doctrina: esto no encierra a nadie. La pantalla mantiene una salida discreta
> ("Después lo armo"), y quien la tome cae en los 3 genéricos actuales más el estado vacío
> de `TareasView` que ya existe y ya apunta a `/packs/armar`. Guiado, no prisionero.

## El techo de 8 y los cinco obligatorios

Aunque el pack siembre 3, `day-compiler.ts:426-429` une con `MANDATORY_BOOLEANS` y el
usuario ve 8. Bajar de 8 exige que esos cinco dejen de ser un ancla, y hoy ni siquiera se
ofrecen en `/hoy-habitos`.

**Recomendación acotada, no un rediseño:** que los cinco obligatorios entren el día 1
**en estado de reposo**, no activos. El mecanismo de tres estados (activo, graduado,
reposo) es doctrina ya escrita del proyecto. Reposo significa que existen, que el usuario
los ve en `/hoy-habitos` cuando quiera y que no cuentan en el denominador del día 1. Día
1: **3 de 3 posibles**, no 0 de 8.

Si esto se juzga demasiado a catorce días, hay una versión de una línea que compra el 80%:
**el denominador del día 1 cuenta solo lo que el usuario eligió.** Las obligatorias se
pintan bajo un encabezado aparte ("TAMBIÉN CUENTAN") y no entran en la barra. El usuario
ve `0 de 3` en vez de `0 de 8`, y tras el primer toque ve `1 de 3`. Un tercio del día
hecho en un toque, contra un octavo.

## La coreografía, milisegundo por milisegundo

Punto de partida: el usuario acaba de tocar su pack. Fin de la cinemática de ARGOS
recortada (ver Parte 4).

```
t = 0 ms      haptic.medium()                       ya existe en armar.tsx:143
              Se aplica el pack. Transición a HOY.
              NO hay overlay. NO hay pantalla negra.

t = 0-300     HOY entra completa pero con la lista VACÍA.
              Header y fecha: FadeInUp.duration(300)
              El fondo del héroe ya está montado. Nada parpadea.

t = 350       El saludo por nombre aparece en el héroe que YA existe en HOY.
              No es un overlay de bienvenida: es el saludo normal de la
              pantalla, la primera vez que se ve.
              FadeInUp.duration(300).springify()

t = 500       Entra la fila 1 del pack.   FadeInUp.delay(500).duration(300).springify()
    + 90      Entra la fila 2.            + haptic.selection()
    + 90      Entra la fila 3.            + haptic.selection()

              90 ms y no los 50 de StaggerItem: a 50 se lee como "apareció una
              lista", a 90 se lee como "las está colocando una por una". Con
              tres filas la diferencia total son 120 ms y cambia por completo
              lo que significa.
              Tres pulsos de selection() en 180 ms es un ritmo, no un ruido.

t = 800       El contador del header cuenta 0 → 3.
              withTiming(3, { duration: 400, easing: Easing.out(Easing.cubic) })
              Mismo patrón de número animado que AnimatedScoreRing ya usa.

t = 1200      La fila palomeable (la única que se completa sin salir de HOY)
              se marca con GLOW.accent y pulsa DOS veces:
              withRepeat(withTiming(0.7, { duration: 600 }), 2, true)
              Arranca en 0.35, sube a 0.7, vuelve. Se apaga sola.

              Es el único uso de glow en la pantalla, que es exactamente el
              presupuesto que fija el sistema de diseño: máximo 1 por pantalla.
              Sin flecha, sin tooltip, sin "toca aquí". Un objeto que respira.

t = ?         El usuario toca.
              scale 0.97, withSpring({ damping: 15, stiffness: 400 })  [pressIn]
              haptic.success()
              El check entra con spring. El glow SALTA de la fila a la barra
              de progreso, que sube con withSpring({ damping: 14, stiffness: 120 }).
              Stiffness bajo a propósito: se tiene que VER llenarse, no aparecer llena.
              El contador de electrones incrementa con el mismo número animado.
              Una sola vez en la vida del usuario: assets/sounds/chime.wav a
              volumen 0.3. Nunca más automático.

              NO hay confetti aquí.
```

**Sobre el confetti.** Existe `react-native-confetti-cannon` en el binario. No se usa en
este momento. Si el primer palomeo dispara confetti, el confetti deja de significar algo
antes de que el usuario complete un solo día. El confetti se guarda para cerrar el día
completo, que es el logro real. Un electrón se celebra con háptica y con la barra
llenándose, no con papelitos.

**Sobre la celebración actual.** Se elimina el overlay de
`src/components/onboarding/OnboardingCompletion.tsx`. El copy es bueno ("Bienvenido,
{nombre}. Aquí empieza.") y no se pierde: *"Aquí empieza"* se convierte en el subtítulo
del héroe de HOY el día 1, dentro de la pantalla. Las catorce partículas lima tampoco se
pierden: pasan a acompañar el llenado de la barra en el primer palomeo, que es cuando hay
algo que celebrar.

Nota práctica: ese overlay ya es frágil, porque su cola vive en memoria de módulo
(`onboarding-completion-core.ts:34`) y no sobrevive un reload de JS. Es decir, hoy hay
usuarios que no la ven nunca. Quitarla resuelve un caso raro y un caso de diseño de una
vez.

---

# Parte 3. Qué se le pide, y cuándo

Regla que aplico: **se pide antes solo lo que la app necesita para armarse.** Todo lo
demás se pide en la pantalla donde sirve. Un permiso pedido en el momento en que resuelve
algo se acepta; pedido en frío se rechaza y ya no se vuelve a preguntar nunca.

## Va antes, sin discusión

| Qué | Por qué |
|---|---|
| **Consentimiento legal** (`privacy`, 3 casillas + `consent` médico) | No se mueve. Es obligatorio y es la única razón por la que este documento no propone dejar entrar antes. |
| Nombre (`welcome`) | Sin él no hay saludo, y el saludo por nombre es la mitad del efecto del primer minuto. |
| Sexo biológico y fecha de nacimiento (`profile`) | Determinan la siembra (`notifications.tsx:65-70`), la Edad ATP y si el ciclo aplica. |
| **El pack** | Es lo que hace que el día 1 sea suyo. Sin esto no hay primer minuto que diseñar. |

## Se mueve a después, al momento en que tiene sentido

| Qué | Dónde va | Ganancia |
|---|---|---|
| **Notificaciones** | Al primer palomeo, o al programar el primer horario. Una línea bajo la fila: *"¿Te aviso mañana a esta hora?"* Sí / No. | Deja de ser una pantalla completa. Y se pide cuando el usuario acaba de demostrar que le importa ese hábito. |
| Altura y peso | Al entrar a Edad ATP o a nutrición, que es donde se usan. | Quita dos campos de tecleo del tramo previo. |
| Cronotipo, 5 preguntas | El pack ya pregunta hora de despertar y de dormir (`armar.tsx:182-237`), que es el 80% del valor. El quiz completo, cuando entre a sueño. | Quita una pantalla saltable que hoy nadie sabe si saltar. |
| Objetivo, 5 opciones (`goal`) | Se pliega. **El pack es el objetivo.** Preguntar las dos cosas es preguntar lo mismo dos veces con distintas palabras, y rompe "un dato vive en un solo lugar". | Una pantalla menos y una contradicción menos. |
| Selector de voz de ARGOS | La primera vez que use voz. | Quita una decisión sobre un producto que todavía no conoce. |
| `positioning` | Muro de lectura con cero input. Muere, o se reduce a una línea dentro de `welcome`. | La pantalla más olvidable del flujo. |
| `cycle` para hombre | Presenta una sola opción (`onboarding-v2-core.ts:108-114`). Una pantalla que no decide nada. Se salta condicional. | Un toque menos, cero pérdida. |

Resultado: de 9 pantallas a 5 (`welcome`, `privacy`, `profile`, `consent`, `pack`), con el
consentimiento intacto.

> **Advertencia de riesgo, y es seria.** Esta parte toca `resolveOnboardingRoute`,
> `completeV2Step`, la máquina de `onboarding_step` en base de datos y el gate de
> `app/index.tsx`. Ahí es donde vive el riesgo de compliance. Ver Parte 7 para mi opinión
> sobre hacerlo antes o después del 1 de septiembre. La respuesta corta es después.

---

# Parte 4. La primera victoria

Hay dos, y el orden importa.

**Victoria 1, a cero toques: ver su app armarse.** Es la de la Parte 2. No requiere que
haga nada, y esa es justamente la razón por la que funciona con este avatar: un
profesional de alto rendimiento no quiere que lo feliciten por apretar un botón, quiere
que le quiten trabajo de encima. Ver tres filas escribirse solas con su nombre arriba dice
"esto ya sabe quién eres" sin una sola palabra de copy.

**Victoria 2, a un toque: su primer electrón.** La fila señalada con el glow es siempre
una que cumple tres condiciones: se completa sin salir de HOY, no depende de la hora del
día y no requiere equipo. En la práctica es agua (cuantitativa, suma 250 ml con un toque)
o luz solar.

**Conteo total desde que se firma el consentimiento hasta el primer electrón: 3 toques.**
Elegir pack, confirmar horarios, palomear. Contra los ~28 de hoy sin tour y ~40 con él.

Lo que **no** es la primera victoria: abrir el Centro, instalar una app, leer el reporte de
ARGOS, entender los electrones. Todo eso es del día 3 en adelante y no hace falta anunciar
que existe. La sala ATP muestra solo lo instalado, y el día 1 muestra lo que el pack acaba
de instalar frente a él. El catálogo se descubre solo cuando se busca.

---

# Parte 5. El tour de 12 pasos

**Muere.** Y el `setTimeout` de 3000 ms en `app/(tabs)/_layout.tsx:98` muere con él.

## El argumento

1. **Está diseñado para no dejar respirar.** El comentario del propio código
   (`_layout.tsx:91-93`) admite que el delay "secuencia con la celebración". El usuario
   tiene 700 ms de silencio entre una cortina y la siguiente. No es que el tour llegue en
   mal momento: es que llega justo para que no haya momento.
2. **Pierde a quien lo salta, para siempre.** `OrbTour.tsx:96` marca visto también al
   abandonar. Este avatar salta tutoriales por definición. O sea que el tour, en su caso
   más probable, no enseña nada y además se autodestruye.
3. **Pasea al usuario por cuatro rutas** (`/` → `/kit` → `/salud` → `/` → `/tribu` → `/`)
   con `router.navigate` en cada cambio de índice. Doce pasos y cinco saltos de contexto
   antes de que haya tocado nada suyo. Es un tour de museo.
4. **Cuatro de sus doce pasos ya tienen un mecanismo mejor construido en la app:**
   - Paso 2, gestos: el nudge contextual de `TareasView.tsx:116-139` ya lo enseña cuando
     el usuario titubea. Enseñar el gesto cuando alguien se equivoca vence a enseñarlo en
     el paso 2 de 12 el primer día.
   - Pasos 6 y 7, sala e instalar: se descubren solos cuando el pack instala las apps
     frente a él.
   - Paso 9, Edad ATP: tiene su propia cinemática con sus propios sonidos.
   - Paso 12, la orbe: los chips del estado vacío del chat lo enseñan mejor, y de paso
     enseñan la sintaxis que `DISPARADORES_NAV` espera.

## Qué lo reemplaza

**(a) Un solo coach mark en HOY, sin overlay.** Un renglón bajo la primera fila con el
copy del paso 2 (los dos gestos), que ya está escrito en `tarea-gesto-core.ts:52-53`. Se
disuelve al primer palomeo con `FadeOut.duration(200)`. Cero toques obligatorios, cero
capas encima.

**(b) Descubrimiento por lugar.** La primera vez que el usuario entra a `/kit`, `/salud` o
`/tribu`, un renglón de una línea en la parte alta que dice qué es esa sala. Una vez por
sala, se disuelve al hacer scroll. El copy ya está escrito: es el de los pasos 6, 8 y 11
del tour. Esto es "guiado, no prisionero" en su forma literal, y respeta sesiones cortas:
la información llega cuando estás ahí y no antes.

**(c) Dos de los seis chips del estado vacío de ARGOS pasan a ser de navegación**
(`argos-suggestions-core.ts:41-48`). Esto ya estaba propuesto y sigue siendo el mejor
retorno del expediente: la capacidad está construida, cuesta cero H+ y cero cuota, y lo
único que falta es que alguien se lo diga al usuario.

## Si no muere del todo

Versión mínima, por si se prefiere no borrar código a catorce días del lanzamiento:

- Se borra el `setTimeout` de 3000 ms. El tour deja de arrancar solo.
- Se pone una entrada permanente en Ajustes (ya existe en `settings/experiencia.tsx:117`).
- Se corrige `OrbTour.tsx:96` para que salir en el paso 1 **no** lo marque visto. Solo
  `finish(true)` escribe la bandera.
- Se recorta de 12 a 5 pasos, todos en la ruta `/`, sin saltos de contexto.

Con eso el tour deja de estorbar aunque no se rediseñe nada más. Son tres cambios de una
línea y un array recortado.

---

# Parte 6. Cómo se siente, en concreto

## Primero, un hueco del sistema de diseño

**`src/constants/brand.ts` no tiene un solo token de movimiento.** Ni duraciones, ni
springs, ni easings. Color, tipografía, espaciado y elevación tienen doctrina escrita y
hasta scripts de auditoría; el movimiento no tiene fuente de verdad.

La consecuencia se mide: **119 usos de `FadeInUp`** en la app con delays escritos a mano
(40, 50, 80, 90, 100, 120, 140, 150, 180, 200, 240), **cinco configuraciones distintas de
`withSpring`**, y un `StaggerItem` canónico que define el patrón correcto y que casi nadie
llama.

**No inventé un lenguaje nuevo. Propongo tokenizar el que la app ya usa de facto:**

```ts
// src/constants/motion.ts
export const SPRING = {
  press:   { damping: 15, stiffness: 400 },  // AnimatedPressable.tsx:55, ya es el estándar
  release: { damping: 12, stiffness: 300 },  // AnimatedPressable.tsx:59
  fill:    { damping: 14, stiffness: 120 },  // barras y anillos: se tiene que ver llenar
} as const;

export const DUR = {
  enter: 300,   // StaggerItem.tsx:17, la entrada canónica
  fade:  350,   // el fade in de la celebración, el más usado del repo
  exit:  200,   // salir siempre más rápido que entrar
} as const;

export const STAGGER = {
  list:  50,    // StaggerItem: listas largas, se lee como "apareció la lista"
  ritmo: 90,    // 3 a 5 elementos: se lee como "los están colocando"
} as const;
```

Cinco constantes. No cambia nada existente, le da nombre a lo que ya pasa, y evita que el
primer minuto sea la excepción número 120.

## La háptica: el arreglo de un archivo con más impacto de todo el documento

`AnimatedPressable` es el primitivo táctil de la app y no dispara háptica. La dispara cada
llamador a mano, y por eso hay botones mudos sin patrón.

**Mover `haptic.light()` dentro del `onPressIn` de `AnimatedPressable.tsx`, con una prop
`haptic={false}` para las excepciones.** Un archivo. Doscientos puntos de contacto que
pasan de aleatorios a coherentes. Es lo que separa "responde" de "responde a veces", y
"responde a veces" es exactamente lo que se siente barato.

**Antes de eso, cablear el toggle.** `haptic.*` tiene que leer `vibrationEnabled` y
`sounds.ts` tiene que leer `soundsEnabled`. Si se sube la háptica sin cerrar esto, se le
vibra en la mano a quien la apagó explícitamente, y eso es peor que no vibrar.

## Vocabulario háptico del primer minuto

Uno solo por evento, y nunca dos seguidos a menos que sea a propósito un ritmo.

| Momento | Háptico | Por qué |
|---|---|---|
| Aplicar el pack | `haptic.medium()` | Ya existe. Es la decisión más grande del flujo. |
| Cada fila que se coloca | `haptic.selection()` | Tres en 180 ms. Es un ritmo, no un aviso. |
| Primer palomeo | `haptic.success()` | El único `success()` del minuto. Si todo es éxito, nada lo es. |
| Cualquier otro toque | `haptic.light()` vía `AnimatedPressable` | Uniforme, sin excepciones. |

## Sonido

Hay `assets/sounds/chime.wav` en el repositorio y un player (`src/utils/sounds.ts`) con
carga perezosa que degrada a silencio si falta el módulo nativo. No hace falta nada nuevo.

**Regla: la app suena una sola vez en la vida del usuario**, en el primer electrón, a
volumen 0.3. Nada más. Una app de salud que suena todo el rato se apaga; una que sonó una
vez y bien se recuerda. Y esto queda condicionado a cablear `soundsEnabled` primero.

## Color y luz

Sin invención. Presupuesto del primer minuto, contra la doctrina ya escrita:

- **Un solo `GLOW.accent` en toda la pantalla**, gastado en la fila palomeable. El sistema
  fija máximo uno por pantalla y este es el mejor lugar posible para gastarlo.
- **Lima sólido solo en el check de completado y en el CTA.** El pack usa
  `PILLAR_GRADIENTS` o `brandGradient()` para su encabezado, nunca lima plano de fondo.
- **Cero pantallas negras al 82%.** El overlay de la celebración es el único de este tipo
  en el arranque y se va.
- Las catorce partículas lima (deterministas, sin `Math.random`, ya escritas en
  `OnboardingCompletion.tsx:86-121`) se reutilizan tal cual sobre la barra de progreso del
  primer palomeo. Código que ya existe, movido a donde significa algo.

## Copy del primer minuto

Cuatro frases en total. Español de México, sin em dash, sin nombres propios, sin nombres
de padecimientos.

| Dónde | Copy |
|---|---|
| Pantalla del pack | *"¿Qué quieres cambiar primero?"* (ya existe, `armar.tsx:150`) |
| Héroe de HOY, día 1 | *"Buenos días, {nombre}."* / subtítulo: *"Aquí empieza."* |
| Bajo la primera fila | *"Un toque palomea. Mantén presionado para abrir."* (ya existe, `tarea-gesto-core.ts:52`) |
| Tras el primer palomeo | *"¿Te aviso mañana a esta hora?"* Sí / Ahora no |

Nada más. Sin párrafos de bienvenida, sin explicar qué es un electrón. Un profesional de
35 a 55 años deduce lo que es un contador que sube cuando palomea algo.

---

# Parte 7. Qué se puede hacer sin build

**Todo lo de este documento es OTA.** Verificado contra `package.json`:

| Capacidad | Paquete | Versión | Estado |
|---|---|---|---|
| Háptica | `expo-haptics` | `~15.0.8` (`:45`) | En el binario |
| Audio | `expo-audio` | `~1.1.1` (`:35`) | En el binario |
| Animación | `react-native-reanimated` | `~4.1.1` (`:78`) | En el binario |
| Gradientes | `expo-linear-gradient` | `~15.0.8` (`:50`) | En el binario |
| Desenfoque | `expo-blur` | `~15.0.8` (`:36`) | En el binario |
| Confetti | `react-native-confetti-cannon` | `^1.5.2` (`:71`) | En el binario, y no se usa aquí |
| SVG | `react-native-svg` | `15.12.1` (`:81`) | En el binario |

Los assets de sonido e imagen viajan dentro del update de Expo, así que incluso un audio
nuevo sería OTA. Y no hace falta: `chime.wav` ya está.

**Lo que SÍ exigiría compilar, y por eso no lo propongo:**

| Qué | Por qué |
|---|---|
| Lottie, Moti o Skia | No están instalados. Y no hacen falta: Reanimated cubre todo lo descrito. |
| Audio en segundo plano o pantalla bloqueada | Precedente documentado en `R and D/CC_PROMPT_MENTE_AUDIO_SPRINT.md:15`. Irrelevante aquí: el chime es en primer plano. |
| Háptica personalizada (patrones propios) | `expo-haptics` solo expone los presets del sistema. Los siete que hay bastan. |
| Cualquier cambio de permisos nativos | Notificaciones ya está declarado. Moverlo a contextual no cambia el manifiesto. |

---

# Parte 8. Orden de ataque, y mi opinión sobre hacerlo a catorce días

Me pediste que discutiera. Discuto.

## Lo que haría y lo que no

**Rediseñar el primer minuto: sí, vale a catorce días.** Toca alrededor de seis archivos y
todos son de presentación: tiempos, orden de entrada, un `setTimeout` que se borra, una
háptica que se centraliza. Riesgo acotado, y reversible por OTA en minutos con las
banderas que el proyecto ya usa como criterio.

**Recortar el onboarding de 9 pantallas a 5: no, eso va después del 1 de septiembre.**
Toca `resolveOnboardingRoute`, `completeV2Step`, la máquina de `onboarding_step` en base de
datos y el gate de `app/index.tsx`. Un bug ahí es un usuario que entra sin consentir, y ya
hay uno vivo de esa misma familia (`index.tsx:65-67` degrada a tabs en el catch). Con un
solo desarrollador, sin builds de reserva y con dos semanas, ese es exactamente el lugar
donde no se toca.

**La excepción, y es la que sostiene todo lo demás: mover la pregunta del pack.** No es un
recorte de pantallas, es un intercambio de dos pantallas ya existentes dentro del mismo
array `V2_STEPS`, sin tocar consentimientos. Es la única pieza estructural sin la cual el
primer minuto no se puede diseñar, porque sin pack el día 1 sigue siendo genérico. Si esta
no entra, entra la versión degradada: el día 1 son los 3 genéricos y el estado vacío de
`TareasView` hace el trabajo. Se pierde el "esto ya sabe quién soy", que es la mitad del
efecto, pero el resto del minuto funciona igual.

**Y hay un argumento que juega a favor de hacerlo ahora:** todavía no hay usuarios. El
primer minuto mal hecho no está costando nada hoy. Empieza a costar el 1 de septiembre, y
el primer minuto es lo único de la app que no se puede repetir. Un usuario ve otras
pantallas cien veces; esta la ve una.

## El orden

**Bloque 0, antes que nada. Los bugs de sensación. Horas, no días.**
Sin esto, todo el polish de abajo se desperdicia o se vuelve en contra.

1. `haptic.*` lee `vibrationEnabled`; `sounds.ts` lee `soundsEnabled`.
2. `AnimatedPressable` dispara `haptic.light()` en `onPressIn`, con prop de escape.
3. `OrbTour.tsx:96` deja de marcar visto al abandonar.
4. `app/index.tsx:65-67`: el catch no degrada a tabs. Es compliance, no estética, y es el
   más urgente de los cuatro.

**Bloque 1. El primer minuto. Un día.**

5. Se borra el `setTimeout` de 3000 ms de `_layout.tsx:98`.
6. Se retira el overlay de celebración; el saludo y "Aquí empieza" se mudan al héroe de
   HOY.
7. La entrada escalonada de las filas con `STAGGER.ritmo` y `haptic.selection()`.
8. El contador animado 0 → N y el glow de dos pulsos en la fila palomeable.
9. `haptic.success()` + barra con `SPRING.fill` + partículas + chime, una sola vez.
10. El coach mark de los dos gestos, sin overlay, que se disuelve al primer palomeo.
11. `src/constants/motion.ts` con las cinco constantes.

**Bloque 2. El pack antes de aterrizar. Un día.**

12. La pregunta del pack pasa a ser el último paso de `V2_STEPS`.
13. `sembrarDia1(user.id, packBooleans)` recibe por fin su segundo parámetro.
14. El permiso de notificaciones baja a contextual, tras el primer palomeo.
15. El denominador del día 1 cuenta solo lo elegido.

**Bloque 3. Después del 1 de septiembre, con datos.**

16. El recorte de 9 pantallas a 5.
17. El descubrimiento por lugar en `/kit`, `/salud` y `/tribu`.
18. Los chips de navegación en el estado vacío de ARGOS.
19. Los cinco obligatorios como hábitos en reposo, no como ancla.

## Qué medir, porque si no la 2.1 se diseña igual de a ciegas

PostHog ya está corriendo y validado en runtime, y ya existe el registro `ATP_EVENTS` con
la convención de nombres (`OrbTour.tsx:97` emite `TOUR_COMPLETED` y `TOUR_SKIPPED`). Los
cinco eventos que faltan van en ese mismo registro, y son cinco líneas:

- `onboarding_paso_visto` con el id del paso. Sin esto no se sabe dónde se cae la gente.
- `onboarding_pack_elegido` con la llave, y su contraparte de salida sin elegir.
- `dia1_primer_electron` con los segundos transcurridos desde que aterrizó en HOY. Es la
  métrica del primer minuto: si la mediana baja de 30 segundos, funcionó.
- `dia1_sin_toque` a los 60 segundos en HOY sin ninguna interacción. Es la métrica de que
  no funcionó.
- `notificaciones_respuesta` con el contexto (onboarding contra contextual). Sirve para
  demostrar o desmentir la Parte 3 con números en vez de con opinión.

---

## Resumen de una página

- Lo que rompe la sensación no es la cantidad de pantallas: es que la app habla durante
  minuto y medio sin que el usuario pueda contestar, y que la primera cifra que ve quien
  pagó es un cero sobre ocho tareas ajenas, de las cuales solo cuatro se pueden hacer
  desde donde está parado.
- El primer minuto se rediseña para que el momento heroico pase **dentro** de la pantalla
  real y no encima de ella: HOY vacío, saludo por nombre, tres filas que se colocan una
  por una con háptica de selección, un contador que sube de cero a tres, y una sola fila
  que respira con glow esperando el toque.
- Primera victoria a **tres toques** desde el consentimiento: elegir pack, confirmar
  horarios, palomear. Hoy son veintiocho.
- El tour de 12 pasos muere, y con él el `setTimeout` de tres segundos. Lo reemplaza un
  renglón que se disuelve solo, descubrimiento por lugar y los chips de ARGOS.
- **Todo es OTA.** Háptica, audio, animación, gradientes, desenfoque y confetti ya están
  en el binario.
- Lo estructural (recortar pantallas, tocar la máquina de consentimientos) espera al 2 de
  septiembre. Lo que no espera son los cuatro bugs de sensación del bloque 0, porque sin
  ellos el resto del trabajo no se nota.
