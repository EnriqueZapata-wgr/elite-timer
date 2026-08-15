# ADOPCIÓN · Por qué se pierde el que acaba de pagar

Análisis sobre el estado real del código en `main` (commit `642d3fe`, 2.2.0).
Trabajo de lectura, no de implementación. Todo lo que se afirma aquí tiene
archivo y línea.

---

## 0. Verificación de las tres hipótesis previas

Antes de nada, las tres causas del análisis anterior, contrastadas contra el
código de hoy. Una es falsa casi por completo, dos se confirman y crecen.

### H1 · "Filas de HOY que solo navegan con pulsación larga" · PARCIALMENTE FALSA

La tabla de gestos existe y es exactamente la que se describió
(`src/components/hoy/tarea-gesto-core.ts:37-47`):

| tipo | tap | tap largo |
|---|---|---|
| palomear | palomea | navega, si tiene ruta |
| navegar | navega | nada |
| inline | navega | nada |

Es decir: en una fila `palomear` **con ruta**, el tap nunca navega. Confirmado.

Lo que NO se sostiene es el tamaño del problema. Cruzando
`VERIFIED_ELECTRON_KEYS` (`day-booleans.ts:67-73`) contra `ELECTRONS_SIN_APP`
(`electron-app-bridge.ts:53-56`), **hoy queda exactamente UNA fila** en ese
estado: "Luz solar" (`day-booleans.ts:111` → `ELECTRON_TO_APP.sunlight = 'sol'`
→ `/solar`). Y `/solar` tiene otras dos puertas con tap normal: la fila del tab
SALUD (`salud-puertas.ts:111`) y el tile de la sala ATP
(`app-registry.ts:138`, instalada por default).

**Conclusión: el gesto invisible es real, pero no deja ninguna pantalla
inalcanzable.** Ya se parchó con un chevron en `TareaRow.tsx:125-133`.

Dos cosas sí quedan sueltas y valen más que la hipótesis original:

- El parche del chevron se aplicó a `TareaRow` pero **no a `TareaCard`**
  (`TareaCard.tsx:116-122` pinta un círculo pelón aunque haya ruta) ni a
  `TareaHechaRow` (`:55-60`). La card editorial es el héroe visual de HOY
  (`TareasView.tsx:244`, `:315`), o sea que la fila más visible es justo la que
  no da pista.
- Hay **7 acciones destructivas que existen solo como pulsación larga**, sin
  ninguna otra vía: borrar ayuno (`fasting.tsx:887`), borrar entrada de journal
  (`journal.tsx:483`), borrar alimento (`food-log.tsx:413`), borrar receta
  (`RecetasTab.tsx:280`), quitar suplemento (`supplements.tsx:512`), borrar
  rutina (`my-routines.tsx:261`), desinstalar app (`kit.tsx:204`). Eso no es
  problema de adopción, es problema de que el usuario no puede deshacer.

### H2 · "El arranque siembra 2 de 36 apps" · CONFIRMADA Y PEOR

`src/services/hoy/install-core.ts:132-134`:

```ts
export function initialSeedApps(isFemale: boolean): string[] {
  return ['respirar', 'edad-atp', ...(isFemale ? ['ciclo'] : [])];
}
```

El catálogo son **35 apps** (`app-registry.ts:71-187`), de las cuales 16 son
`installable: true`. Siembra: 2 para hombre, 3 para mujer. Entre 5.7% y 8.6%.

El agravante que no estaba en el análisis previo: **`seedInitialApps` se llama
desde un solo lugar, `app/(tabs)/kit.tsx:102`, dentro de un `useEffect` al
montar el tab ATP.** No corre al terminar el onboarding. Si el usuario nunca
abre el tab ATP, no se siembra nada.

### H3 · "Ajustes es el basurero" · CONFIRMADA

`app/settings.tsx` tiene 8 grupos. Dentro de `/settings/salud` viven cosas que
no son ajustes:

| Etiqueta en el menú | Destino | Qué es en realidad |
|---|---|---|
| Mi cronotipo · "Toca para cambiar" (`settings/salud.tsx:108`) | `/quiz/chronotype` | Un test de 5 preguntas |
| Protocolos activos · "Explorar y gestionar" (`:115`) | `/protocol-explorer` | Un catálogo de 142 protocolos |
| Salud Funcional (`:198`) | `/salud` | El tab SALUD entero |
| Ficha de emergencia (`:207`) | `/salud/ficha-emergencia` | Dato clínico crítico |
| Nivel de entrenamiento (`:130-155`) | chips inline | Input del generador de rutinas |

Y en `/settings/conexiones`: "Soy coach" (`:185`) y "Programa de afiliados"
(`:281`) son productos de negocio completos, no configuración.

Bono: **hay dos toggles con la etiqueta literal `"Modo completo"` en la misma
pantalla**, separados por 60 líneas (`settings/salud.tsx:166` es nutrición,
`:225` es salud).

Y el remate: **no existe un solo `router.push('/settings')` en toda la app.**
`app/(tabs)/perfil.tsx:3` es un `<Redirect href="/settings" />` y ese tab está
con `href: null` (`(tabs)/_layout.tsx:219-222`). La única puerta viva a Ajustes
es un tile entre ~20 iconos de la cuadrícula ATP, y solo existe porque está
cableado a mano (`install-core.ts:28`, `FIXED_APPS = new Set(['ajustes'])`).

### H4 · "/packs/armar es el hub con más salidas y solo se alcanza del onboarding" · CONFIRMADA

Grep completo. Dos entradas de usuario:

1. `app/onboarding/v2/notifications.tsx:99-106`, el **tercer** botón de la
   última pantalla del onboarding, debajo del CTA principal y debajo de "Ahora
   no". Estilo `s.armarText` (`:143`): `FontSizes.sm` con
   `withOpacity(ATP_BRAND.lime, 0.85)`. Es el elemento menos prominente de la
   pantalla más olvidable del flujo.
2. `app/packs/[packKey].tsx:198` y `:210`, dentro de la ficha de un pack, a 3
   toques (ATP → Centro → pack → armar).

Detalle que duele: **`app/centro/index.tsx:127` tiene una sección titulada
"ÁRMALA POR MÍ" cuyas cards NO llevan a `/packs/armar`**, llevan a
`/packs/{key}` (`:158`, `:184`). El nombre promete el atajo y entrega la ficha.

---

## A · El primer contacto real, paso por paso

`app/_layout.tsx` no tiene ningún gate: es un `Stack` plano con ~120
`Stack.Screen`. La decisión vive en `app/index.tsx:28-77`.

```
AtpSplash (overlay, una vez por arranque)
  → /login → /register                       [consentimiento CB-1]
  → /onboarding/v2/welcome        nombre
  → /onboarding/v2/positioning    muro de lectura, cero input
  → /onboarding/v2/privacy        3 checkboxes obligatorios
  → /onboarding/v2/profile        sexo, día, mes, año, altura, peso
  → /onboarding/v2/goal           1 de 5 objetivos (saltable)
  → /onboarding/v2/cycle          modalidad (hombre: 1 sola opción)
  → /onboarding/v2/chronotype     5 preguntas (saltable)
  → /onboarding/v2/consent        checkbox médico
  → /onboarding/v2/notifications  permiso push  ← aquí el botón escondido
  → /argos/meet                   5 pantallas cinemáticas + selector de voz
  → /(tabs) HOY                   [celebración ~2.3 s]
  → +3 s                          OrbTour de 12 pasos
```

**Son 9 pantallas de onboarding, no 7** (`onboarding-v2-core.ts:24-34`;
`OnboardingShell.tsx:80` muestra "PASO n DE 9"). Los comentarios del código
siguen diciendo 7 en tres archivos distintos.

### Conteo de toques hasta la primera acción útil

| Tramo | Toques |
|---|---|
| Onboarding, 9 pantallas | ~26 (más tecleo de nombre, fecha, altura, peso) |
| Meet ARGOS: 5 pantallas + selector de voz | ~2 |
| Celebración | 0 (autodescarta a ~2.3 s) |
| OrbTour, 12 pasos | 12 más, o 1 para saltarlo |
| **Total antes de tocar un solo hábito** | **~28 sin el tour, ~40 con él** |

Esto choca de frente con la doctrina de sesiones cortas. La primera sesión de
un usuario que pagó es la más larga de toda su vida en la app.

### Qué ve al llegar a HOY

`app/(tabs)/index.tsx` cabecera: *"HOY = TAREAS, tu checklist del día. Fin."*

**No existe estado vacío en `TareasView`.** Revisado el componente completo: no
hay rama `length === 0`. Y no hace falta, porque el día 1 ya viene lleno:

- `day-booleans.ts:24-29`: `DEFAULT_BOOLEANS`, 10 llaves
- `day-booleans.ts:54`: `MANDATORY_BOOLEANS`, 5 forzadas siempre
- `install-service.ts:24`: `DEFAULT_QUANTS = ['protein', 'water']`

**El usuario abre HOY y ve entre 12 y 13 tareas que nunca eligió**, con la
barra en `0 de 12`. Ese es el momento en que la app se siente "muy compleja":
no porque tenga 145 pantallas, sino porque el día 1 empieza con una lista de
tareas ajenas y una barra de progreso en cero.

Y las 2 apps que sí se sembraron (`respirar`, `edad-atp`) **no se ven todavía**,
porque la siembra no ha corrido: espera a que abra el tab ATP.

### Dónde se queda sin saber qué sigue

1. En HOY, después de palomear la primera tarea. Los tres CTA disponibles son
   `/ordenar-dia` (`index.tsx:472`), `/hoy-habitos` (`:482`) y "agregar" que
   redirige a `/centro` (`kit.tsx:116-118`). Ninguno responde "¿y qué compré?".
2. Si tocó "Ahora no" en notificaciones y no vio el tercer botón, nunca supo
   que la app se podía armar sola.
3. Si el login lo mandó directo a tabs (`app/login.tsx:73` hace
   `router.replace('/(tabs)')`, saltándose `index.tsx`), llegó sin onboarding,
   sin cronotipo, sin objetivo y sin consentimientos CB-2/3/4.

---

## B · Qué es inalcanzable de verdad

No hay rutas huérfanas. Lo que hay es esto.

### B1 · Entrada única de una sola vez, sin puerta de regreso

| Pantalla | Única entrada | Estado |
|---|---|---|
| `/onboarding/voice-config` | `app/index.tsx:45`, solo si falta el dato al arrancar | **Cero `router.push` en toda la app.** Si la salta, no hay forma de volver. La "Voz del timer" de Ajustes (`settings/experiencia.tsx:129`) es otra cosa |
| `/argos/meet` | `MeetArgosGate` (automático, flag NULL) + `settings/dev.tsx:59` | La única puerta manual está detrás de `__DEV__ \|\| isAdmin`. Para un usuario normal, se ve una vez en la vida |
| las 9 de `/onboarding/v2/*` | `app/index.tsx:54` | Esperado por diseño |
| `/edad-atp/lab-confirmation` | solo tras subir un lab | Condicionada a evento |

### B2 · Enterradas a 3 o 4 toques

El tab SALUD usa acordeones que expanden en sitio (`SaludHub.tsx:172-175`), así
que cada nivel de acordeón cuenta como toque.

| Destino | Toques | Camino |
|---|---|---|
| `/tests/resultado/cronotipo` | **4** | SALUD → acordeón "MI EXPEDIENTE" → Mis evaluaciones → acordeón de categoría (cerrada por default, `tests.tsx:61-67`) → resultado |
| `/tests/run/[id]` (pruebas físicas) | 3-4 | igual, categoría `fisico` cerrada por default |
| `/reports/[dominio]` | 3 | SALUD → "TU EVOLUCIÓN" → Reportes → dominio |
| `/salud/intervenciones/[key]` | 3 | SALUD → "TU EVOLUCIÓN" → Mi protocolo → ficha |
| `/edad-atp/sub-edad/[key]` | 3 | SALUD → hero → result-preview → constelación |
| `/packs/armar` | 3 | ATP → Centro → pack → armar |
| `/salud/ficha-emergencia` | 3 | ATP → tile Ajustes → Salud y protocolo → fila |
| `/quiz/chronotype`, `/protocol-explorer`, `/cycle-settings` | 3 | ATP → tile Ajustes → Salud y protocolo → fila |
| `/settings/salud-conexion` (wearables) | 3 | ATP → Ajustes → Conexiones → fila |
| `/afiliados/aplicar` | 3 | ATP → Ajustes → Conexiones → fila |

Nótese el patrón: **la mitad de las pantallas a 3 toques pasan por el tile de
Ajustes**, que a su vez es un icono entre veinte en una cuadrícula.

### B3 · La regla de "un dato vive en un solo lugar" ya se está rompiendo

- `"Modo completo"` aparece dos veces con la misma etiqueta en
  `settings/salud.tsx` (`:166` nutrición, `:225` salud).
- Cronotipo se toca desde `/quiz/chronotype` (Ajustes), `/my-chronotype`
  (SALUD → Tu evolución) y `/tests/resultado/cronotipo` (SALUD → Mi
  expediente). Tres puertas al mismo dato desde dos tabs distintos.
- `/salud/hoy`, `/salud/evolucion` y `/salud/expediente` son solo `<Redirect>`
  a `/salud` con un param. Son rutas que existen para nada.

---

## C · Cuánto de esto resuelve ARGOS navegador, honestamente

Lo construido anoche es bueno y está bien pensado. `argos-nav-resolver-core.ts`
son 596 líneas de TF-IDF sobre las 192 rutas del bundle, con 96 entradas de
alias es-MX curadas a mano (`ALIAS_RUTA:218-297`), singularizador determinista,
umbral de dominancia (`FACTOR_DOMINANCIA = 1.45`) y un piso de cobertura
(`COBERTURA_MINIMA = 0.5`) que mata la clase de falso positivo donde una sola
palabra rara arrastraba una pantalla al azar. `decidirTurnoNav` corre **antes**
de cualquier llamada al modelo (`argos-chat.tsx:444`), y el propio archivo lo
declara en `:282`: cuesta 0 H+ y no consume la cuota diaria.

Está disponible en todas partes: la orbe flotante se monta en el layout raíz
(`app/_layout.tsx:357`) y se auto-oculta solo donde estorba
(`argos-floating-core.ts`).

### Lo que SÍ resuelve

- **El "no sé llegar" del usuario que ya sabe qué busca.** "dónde registro el
  ayuno" → `/fasting`, sin que compartan una sola letra. Eso es exactamente lo
  que Ajustes-basurero y las pantallas a 3 acordeones estaban rompiendo.
- **Neutraliza casi toda la sección B2.** Si el usuario dice "llévame a mis
  análisis", la profundidad de 4 toques deja de importar.
- **9 ajustes ejecutables por voz o texto** (`argos-settings-core.ts:62-138`:
  tema, modo denso de salud, velo nocturno, sonidos, vibración, mantener
  pantalla encendida, estado de un hábito, modo de nutrición, insights al
  comer). Eso saca presión de la pantalla de Ajustes sin rediseñarla.

### Lo que NO resuelve, y hay que decirlo claro

1. **No puedes preguntar por lo que no sabes que existe.** ARGOS es un buscador
   sobre un catálogo cerrado, no un descubridor. Resuelve alcanzabilidad,
   no descubrimiento. El problema real del día 1 es el segundo.

2. **Exige un verbo de navegación al arranque de la frase.**
   `DISPARADORES_NAV` (`argos-nav-intent-core.ts:41-55`) se evalúa con
   `arrancaCon`, no con `includes`. "análisis de sangre" a secas cae a chat, y
   el chat **sí cobra**. Es la decisión correcta para no sacar al usuario de una
   consulta de salud, pero significa que el atajo barato solo se activa si el
   usuario habla como el resolvedor espera.

3. **`puedeExplicar` está escrito, testeado y NO cableado a ninguna UI.**
   `argos-screen-explain-core.ts:124` existe para que la interfaz decida si
   ofrece el atajo "¿qué es esto?". Grep completo: cero llamadas fuera de los
   tests. Lo único vivo es `construirInyeccionPantalla`, consumido en
   `argos-service.ts:21`, o sea que ARGOS sabe explicar la pantalla **solo si
   al usuario se le ocurre preguntar**.

4. **El estado vacío del chat no anuncia la capacidad.** Los seis
   `DEFAULT_SUGGESTIONS` (`argos-suggestions-core.ts:41-48`) son preguntas de
   contenido: "¿Qué debería comer?", "¿Cómo mejorar mi sueño?". **Cero chips de
   navegación.** El usuario no tiene forma de enterarse de que la orbe también
   es el buscador de la app.

5. **El tour tampoco lo dice.** El paso 12 (`orb-tour-core.ts`, id `orbe`) dice
   "Tócame cuando quieras. Si cambio de color, tengo algo que decirte." No
   menciona navegación ni ajustes por voz.

6. **Vetado justo donde más se necesita.** `RUTAS_VETADAS:66-78` bloquea
   `/onboarding`, `/argos/meet` y `/paywall`. Correcto como criterio de
   producto, pero significa que ARGOS no puede rescatar al usuario que se saltó
   `voice-config` ni al que quiere volver a ver Meet ARGOS.

7. **`argos-nav-service.ts` está muerto.** Nadie lo importa (grep completo). La
   lógica viva es `argos-nav-exec-core` → `argos-nav-service` → nadie. El único
   consumidor real es `app/argos-chat.tsx`.

### Veredicto numérico

De los cinco puntos de fuga de la sección siguiente, ARGOS ya resuelve
**uno y medio**: el de profundidad de navegación (completo) y el de Ajustes
como basurero (parcial, porque los 9 ajustes operables son un subconjunto).

**No toca los tres más caros**, que son todos del día 1: la lista de 12 tareas
ajenas, la siembra de 2 apps que ni siquiera corre, y los 28 toques antes de la
primera acción útil.

Estimación honesta: **ARGOS cubre alrededor del 40% del problema de
alcanzabilidad y cerca del 0% del problema de descubrimiento**, y ese 40% está
condicionado a que el usuario descubra primero que la orbe navega, cosa que hoy
no le dice nadie.

---

## D · Los 5 puntos de fuga, y qué construir

Priorizado por impacto contra esfuerzo. Nada de tutoriales largos: la mayoría
de esto son renglones, no pantallas.

### Fuga 1 · HOY el día 1 son 12 tareas que el usuario nunca eligió

Evidencia: `day-booleans.ts:24-29` + `:54` + `install-service.ts:24`.
Sin estado vacío en `TareasView` porque nunca se necesita.

Esto contradice la doctrina propia: "instalar una app equivale a activar un
hábito" y "la sala ATP muestra solo lo instalado". El usuario no instaló nada y
ya tiene 12 hábitos encendidos. El mecanismo correcto (packs) existe y el
default lo puentea.

**P0-a · El día 1 se siembra desde el pack, no desde el default.**
Si eligió pack: sus 3 hábitos base (`armar.tsx:129` ya los aplica en intensidad
suave). Si no eligió: 3 hábitos, no 12. Techo 8 como dice la doctrina, arranque
en 3. Esfuerzo: cambiar `DEFAULT_BOOLEANS` y hacer que `MANDATORY_BOOLEANS`
deje de ser un ancla de 5.

**P0-b · Estado de "casi vacío" en `TareasView` con una sola salida:**
un renglón que diga que el día se puede armar solo, apuntando a `/packs/armar`.
Una acción, no un menú.

### Fuga 2 · El atajo más valioso de la app está en letra chica

Evidencia: `notifications.tsx:99-106` + `:143` (tamaño `sm`, lima al 85%).
`/packs/armar` es el hub con 42 salidas y su puerta principal es el tercer
botón de la última pantalla del onboarding.

**P0-c · Subir `/packs/armar` a CTA de primera clase en tres lugares:**
en la sala ATP (junto a Centro), en HOY cuando hay menos de N hábitos activos,
y arreglar `centro/index.tsx:127` para que la sección que ya se llama "ÁRMALA
POR MÍ" lleve efectivamente a armar en vez de a la ficha. Cero pantallas
nuevas.

### Fuga 3 · La siembra inicial ni siquiera corre

Evidencia: `install-core.ts:132-134` siembra 2 de 35, y solo se dispara desde
`kit.tsx:102` al montar el tab ATP.

**P0-d · Mover `seedInitialApps` al cierre del onboarding**, y que siembre lo
del pack elegido más el mínimo. La bandera one-shot (`goals.mb22_seed_v1`,
`install-service.ts:105`) ya lo hace idempotente, así que el cambio es de
llamador, no de lógica.

### Fuga 4 · Nadie sabe que la orbe es el buscador de la app

Evidencia: `DEFAULT_SUGGESTIONS` sin un solo chip de navegación
(`argos-suggestions-core.ts:41-48`); `puedeExplicar` sin cablear
(`argos-screen-explain-core.ts:124`); paso 12 del tour sin mencionarlo.

Este es el mejor retorno de todo el documento: la capacidad **ya está
construida y probada**, cuesta 0 protones y 0 cuota, y lo único que falta es
decirle al usuario que existe.

**P0-e · Dos de los seis chips del estado vacío pasan a ser de navegación.**
Ejemplo de copy: "¿Dónde registro mis análisis?" y "Llévame a mi ayuno".
Enseña la sintaxis que `DISPARADORES_NAV` espera sin un solo tutorial.

**P0-f · Cablear `puedeExplicar` a un "¿qué es esto?" en el header** de las
pantallas que el catálogo conoce. Un toque, respuesta en la pantalla donde
estás, cero protones. Es la definición de guiado sin ser prisionero.

**P1-a · Reescribir el paso 12 del tour** para que diga qué se le puede pedir a
la orbe, no solo que se puede tocar.

### Fuga 5 · Ajustes es la puerta única de media app y no tiene engranaje

Evidencia: cero `router.push('/settings')` en toda la app; `perfil` con
`href: null`; el tile sobrevive porque está en `FIXED_APPS`.

**P1-b · Engranaje permanente en el header de los tabs raíz.** Un icono, no un
rediseño.

**P1-c · Sacar de Ajustes lo que no es un ajuste:**
cronotipo → el módulo de tests; protocolos → el Centro; ficha de emergencia →
SALUD; nivel de entrenamiento → Fitness; afiliados y "soy coach" → su propia
entrada. Y matar uno de los dos `"Modo completo"` o renombrarlos.

### Trabajo menor, alto retorno

**P1-d · Chevron en `TareaCard` y `TareaHechaRow`.** El parche QW-7 solo tocó
`TareaRow` y la card editorial es la fila más visible de HOY.

**P1-e · Recortar el onboarding de 9 a 7 pantallas.** `positioning` es un muro
de lectura con cero input; `cycle` para hombre presenta **una sola opción**
(`onboarding-v2-core.ts:108-114`), o sea una pantalla que no decide nada. Ambas
se pueden plegar. Ahorro: ~4 toques y dos pantallas de fricción.

**P1-f · Tapar el agujero de `app/login.tsx:73`.** Ese `router.replace('/(tabs)')`
salta `index.tsx` y mete a usuarios sin onboarding ni consentimientos
CB-2/3/4 directo a HOY. Es un bug de compliance, no de adopción.

**P2-a · El OrbTour de 12 pasos a 5.** El paso de gestos ya tiene un mecanismo
mejor: el nudge contextual que aparece tras detectar confusión
(`TareasView.tsx:134`). Enseñar el gesto cuando el usuario titubea vence a
enseñarlo en el paso 2 de 12 el primer día.

**P2-b · Puerta manual a `/argos/meet` fuera de `dev`,** y una a
`voice-config`, que hoy es literalmente irrecuperable.

---

## E · Lo brutal: ¿es adopción o es que hay demasiada app?

Es que hay demasiada app **expuesta el día uno**, que no es lo mismo que
demasiada app.

Los números: 145 pantallas reales, 35 apps de catálogo con 16 instalables, 8
packs de estilo de vida más los paquetes de salud, 142 protocolos, 7 pilares.
Eso es un producto grande, y está bien que lo sea: el avatar es un profesional
de alto rendimiento y va a querer llegar a todo eso en el mes 3.

El problema es que **el mecanismo para dosificarlo ya existe y está apagado.**
La app tiene packs, tiene instalación, tiene un Centro y tiene una doctrina
escrita que dice que la sala muestra solo lo instalado. Y aun así el día 1
enciende 12 hábitos por default, siembra 2 apps de forma perezosa, esconde el
armador en letra chica y remata con un tour de 12 pasos.

No hay que borrar pantallas. Hay que hacer que el default respete la doctrina
que el equipo ya escribió. Si las fugas 1, 2 y 3 se arreglan, el usuario del
día 1 ve tres hábitos y una sala con cuatro iconos, y las otras 140 pantallas
siguen ahí, esperando a que las pida. Que es exactamente el diseño original.

ARGOS es la red de seguridad de ese diseño, no su sustituto. Un buscador
excelente sobre una app que te abruma sigue siendo una app que te abruma. Pero
sobre una app que arranca con tres cosas, el buscador es lo que la hace crecer
sin volverse un laberinto.

Orden de ataque recomendado, y es corto: **P0-a a P0-f primero (los seis son
renglones, ninguno es una pantalla nueva), luego P1.** Con eso, el usuario que
paga ve tres tareas suyas, un atajo visible para armar el resto, y una orbe que
le dice de entrada que puede pedirle lo que sea.
