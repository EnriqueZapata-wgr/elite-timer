# 🔍 Audit Cowork · MB-19 carcasa V2

**Rama:** `feat/mb19-carcasa-v2` · 6 commits · 3,122 inserciones
**Fecha:** 1-ago-2026 · **Método:** cinco auditores en paralelo sobre el árbol extraído de la rama, comparado contra `main`. Todo hallazgo verificado a mano antes de escribirse.

# 🔴 VEREDICTO: NO MERGEAR TODAVÍA

Un bloqueador real, y es **exactamente el que la PIEZA 0 existía para prevenir**.

---

# 🚨 BLOQUEA MERGE

## B1 · El pilar MENTE quedó sin puerta. 495 líneas inalcanzables

`app/habits-portal.tsx` tenía nueve cards. Ocho se absorbieron en el registro de apps.
**La novena, `/mente`, no.**

```
/tmp/base/app/habits-portal.tsx:51
{ key: 'mente', title: 'MENTE', route: '/mente' }
```

En toda la rama, `/mente` aparece **una sola vez fuera de tests**, y no es una navegación:

```
src/components/argos/argos-floating-core.ts:18
return p.startsWith('/mente') || p === '/meditation' || p === '/breathing';
```

Eso es un predicado que decide dónde **esconder** el botón flotante. No abre nada.

Lo que se cae:

| Archivo | Líneas | Qué contiene |
|---|---|---|
| `app/mente.tsx` | 248 | el hub del pilar Mente |
| `app/mente/progreso.tsx` | 247 | rachas de journal, respiración, meditación y check-in, más las medallas de 7, 30, 90 y 365 días |

`progreso` cuelga solo de `mente.tsx:138`, así que cae en cascada. Las seis hojas sueltas
(Meditar, Respirar, Emociones, Journal, Sueño, N-Back) sí están en el registro y sobreviven.
**Lo que muere es el hub y el progreso del pilar.**

## B2 · El censo dio verde. Confunde mencionar una ruta con abrirla

El censo acreditó `/mente` como "con puerta" citando ese `startsWith`. Y como la marcó
cubierta, su aviso de puertas colgantes tampoco vio a `progreso`. **Un falso positivo apagó
las dos redes.**

El auditor lo comprobó con experimentos, no con teoría. Creó `src/_zz/muerto.ts`, un archivo
que **nadie importa**:

```js
const rutas = ['/clinical-system', '/legal/aviso', '/economy/referrals'];
```

Resultado: **las huérfanas bajaron de 8 a 5.** Un `console.log('/admin/reports')` también
regala puerta. Cualquier `.ts` muerto o cualquier string de log limpia el tablero.

Barrido completo: de 177 rutas "con puerta", **11 no tienen ni una línea de navegación real.**
Diez son legítimas (plantillas de onboarding resueltas bien). La once es `/mente`.

**Lo que sí está bien construido**, y hay que decirlo: el tokenizador descarta comentarios de
verdad, la exclusión de tests funciona, la resolución de plantillas no es laxa (verificadas las
seis del código, ninguna regala puerta falsa), y el código de salida 1 dispara correctamente.
El detector cubre las 233 `router.push`, 60 `router.replace`, 3 `dismissTo` y 7 `<Redirect>`
del proyecto: no se le escapa ninguna forma de navegación. **El problema no es la red, es el
criterio: cuenta menciones, no alcance.**

## B3 · Se borraron cuatro rutas, no tres. La cuarta tenía pantalla viva

El brief reportó `personal-records`, `training-methods` y `timer`. Las tres eran redirects de
11 y 12 líneas: **borrado correcto, cero pérdida.**

La cuarta, `app/habits-portal.tsx`, eran **112 líneas de UI real** (dos secciones editoriales,
lectura de `biological_sex`, filtro `femaleOnly` para ciclo). Se borró sin reportarse, y esa
omisión es la razón por la que nadie revisó card por card. De ahí salió B1.

---

# 🟠 ARREGLAR ANTES DEL OTA

## A1 · La casita flotante va a tapar los headers de SALUD, TRIBU y ARGOS

Hay **dos listas de "qué es un tab" y quedaron desincronizadas**:

```
argos-floating-core.ts:28   RUTAS_DE_TAB = ['/', '/kit', '/salud', '/tribu', '/argos']   ← actualizada
home-floating-core.ts:13    TAB_PATHS    = ['/', '/index', '/yo', '/kit']                ← intacta
```

En las tres salas nuevas la casita se pinta encima del header. **Es literalmente el bug que
documenta el comentario que dejaron sin tocar** en ese mismo archivo: *"la casita tapaba los
headers, TU ECOSISTEMA se leía OSISTEMA"*. Va a pasar igual con SALUD y con TRIBU.

En ARGOS es peor: al tocarla ejecuta `dismissTo('/(tabs)')` estando ya dentro de tabs.

**Fix:** una sola fuente. `TAB_PATHS` debe salir de `RUTAS_DE_TAB`, y esta debe cubrir
**todas** las rutas del grupo `(tabs)`, incluidas las cuatro en `href: null` (`yo`,
`biblioteca`, `progreso`, `perfil`), que hoy renderizan con orbe **y** con flotante: los dos
ARGOS que este run venía a evitar.

## A2 · "NIVEL DE DIAGNÓSTICO" queda a dos taps del tab bar

`app/salud/diagnostico/index.tsx:64`. La cadena existía antes, pero vivía enterrada bajo un hub
de catorce cards. **La puerta TU EVOLUCIÓN ahora le apunta directo.** Es la única línea que
sube el riesgo legal por efecto de esta rama.

Cambio: `NIVEL DE DETALLE`. La fila y el header ya dicen "Mi mapa funcional", solo quedó el badge.

## A3 · Los iconos NO cambian en un solo commit

La pieza 1 se justificaba con esa promesa. `<AppIcon>` se usa en **exactamente dos lugares**.
Las mismas 24 funciones se siguen dibujando desde cuatro registros paralelos:

| Archivo | Qué es |
|---|---|
| `src/constants/electrons.ts:15-48` | 26 electrones con su Ionicon |
| `src/services/hoy/day-booleans.ts:94-111` | duplica la lista anterior |
| `src/constants/hoy-cards.ts:34-53` | las mismas funciones con **emoji** |
| `src/constants/salud-puertas.ts:105-128` | destinos de SALUD, Ionicon a mano |

Y ya hay **cuatro divergencias visibles hoy**: Labs es `flask-outline` en un lado y
`book-outline` en otro **apuntando a la misma ruta**; Suplementos, Emociones y Cardio igual.

Además las cinco entradas `salud-*` del mapa son código muerto: `SaludHub.tsx:42-44` dibuja las
puertas con emojis propios. Y el test que debía cazar iconos huérfanos **tiene una lista blanca
que bendice justo esos cinco** (`app-registry.test.ts:72-79`).

**Decisión tuya:** o se migran los cuatro registros ahora, o se corrige el docstring para que no
prometa lo que no entrega y se deja escrita la lista de los seis archivos pendientes. Lo que no
puede quedarse es la promesa falsa.

## A4 · `AppIcon` no está listo para el día del montaje

`AppIcon.tsx:27` renderiza `<Ionicons color={color}>` y nada más. Cuando lleguen los SVG,
**los de Phosphor son `fill` y los dos dibujados a mano son `stroke`**: si solo se sobrescribe
uno, la mitad sale invisible. Es el footgun que ya tenía escrito en el doc de iconos. Se
resuelve ahora, no el día del montaje.

Aparte: `name` está tipado `string`, así que `<AppIcon name="meditarr" />` compila y renderiza
un signo de interrogación en silencio. Con `keyof typeof ICON_MAP` el compilador lo caza gratis.

## A5 · La card editorial se congela y deja de rotar

`atp-room-core.ts:188-203`: la prioridad "retoma esta app" gana siempre que exista una app sin
abrir en 7 días, y **no tiene caducidad**. Como esa app por definición no se abre, mañana gana
otra vez. Con 24 apps, casi cualquier usuario cae ahí en la segunda semana y verá
para siempre *"Llevas 240 días sin abrirla"*, con la invitación por hora del día muerta debajo.

Fix: ignorar más de 30 días, o alternar día por medio con la invitación del momento.

## A6 · Los iconos no vuelan en el orden que la gente usa

`kit.tsx:196-205`: con orden Categoría los tiles viven en un padre por sección; con los otros
órdenes, en un padre plano. `LinearTransition` solo anima dentro del mismo padre, así que
**de las seis transiciones entre chips solo vuelan dos**. Las cuatro que involucran Categoría,
que es el default, son un salto seco. Es justo la línea que hacía que se sintiera caro.

## A7 · El gate del ciclo se reimplementó a mano en cuatro archivos

Ya existe fuente única, `cycle-access-core.ts`, cuyo comentario dice literalmente *"este
predicado es la regla única de acceso"*, y nació de un bug de mostrarle contenido de ciclo a un
hombre. Los cuatro nuevos (`SaludHub`, `PuertaScreen`, `kit`, `atp-orden`) hacen la query cruda
y comparan a mano. Hoy coinciden. Cuatro copias que pueden divergir en un tema sensible.

---

# 🟡 NOTAS

- **`/shared-routine` tiene motivo falso en la lista blanca.** Dice "entra por deep link"; el
  único manejador de deep links (`app/_layout.tsx:107-120`) solo atiende `reset-password`, y
  `shareRoutine()` no se llama desde ningún lado. Son 342 líneas de código muerto. Además su
  `SHARE_BASE_URL` apunta a un dominio personal, no a `somosatp.com`.
- **El censo no está en CI.** Existe `npm run censo` pero nada lo dispara. Un guardián que hay
  que acordarse de correr deja de correrse.
- **Números:** la línea base real era **13**, no 14 ni 15. El cierre de 8 sobre 185 sí cuadra.
  El campo `_medido` del JSON quedó con dos cifras equivocadas.
- **`YoEditorialSection.tsx` quedó huérfano** al retirar el tab YO, y con él la card DISCIPLINA,
  que no encontré replicada. No rompe nada; es una métrica motivacional que desaparece.
- **`movilidad` está marcada `installable: true`** y es una evaluación, no un hábito diario.
- **`installable` duplica el concepto de electrón** con llaves en otro idioma (`meditar` vs
  `meditation`) y sin tabla de traducción. MB-20 va a necesitar ese puente.
- **El copy sale limpio:** un solo em dash visible en los 18 archivos nuevos, cero dosis, cero
  frases de máquina, y las 34 rutas referenciadas existen. TRIBU no es placeholder: son dos
  puertas reales a ranking y amigos.
- **Privacidad, limpio:** el conteo de aperturas por app vive solo en `AsyncStorage`. Rastreado
  archivo por archivo, no hay import de Supabase ni de PostHog en esa ruta. **El dato no sale
  del teléfono.**
- **Cero migraciones, cero dependencias: cierto.** El único cambio en `package.json` es la línea
  del script `censo`.
- El comentario de la orbe dice que alerta respira "más lento" que idle. Respira a 3.0 s contra
  3.6: es **más rápido**. La regla dura se cumple (no parpadea, no hay rojo en ningún lado,
  verificado), pero el comentario que la justifica está invertido, y su test compara contra
  `escuchando` en vez de contra `idle`, que es la comparación que importa.

---

# ✅ LO QUE SÍ QUEDÓ BIEN

No todo es hallazgo. Esto está verificado y sólido:

- **Las ocho cards del hub viejo de SALUD tienen su puerta.** Tabla de correspondencia completa,
  una por una, sin pérdidas. Más tres que colgaban del tab YO y ahora entran por TU EVOLUCIÓN.
- **El modo denso es real**, no una preferencia muerta: toggle persistido, evento, y el hub
  cambia las cuatro puertas por los diecisiete destinos.
- **El buscador aguanta los casos duros:** "rm" cae en 1RM, "nb" en N-Back, "agua" en
  Hidratación. Normaliza acentos.
- **"Mío" se edita con lista, como se pidió.** Cero drag, cero dependencias nuevas.
- **La card editorial es una, no un carrusel**, y las quince imágenes que invoca existen en disco.
- **Los cinco tabs, el orden y la orbe sin palabra**: correcto, y bien hecho el detalle de
  `tabBarLabel: () => null` además de `title: ''`, porque solo con el título vacío quedaba una
  etiqueta invisible ocupando altura. `tabBarAccessibilityLabel: 'ARGOS'` conserva el lector de
  pantalla.
- **Las 24 rutas del registro existen todas como archivo.** Ninguna crashea.
- **Quitar f.lux fue correcto:** no existe esa pantalla. 24 es el número honesto.
- **Los tests no son fachada:** con el registro vacío, 5 de 15 fallarían.

---

# 📋 PARA DESBLOQUEAR

En este orden:

1. **Resolver `/mente`.** Entrada en el registro (sección Mente, como hub) o borrado con
   decisión escrita. Y revisar las nueve cards de `habits-portal` una por una, no ocho.
2. **Endurecer el censo:** exigir que la línea que menciona la ruta contenga una forma de
   navegación, e ignorar archivos que nadie importa. Volver a correr y reportar el número real.
3. **Unificar las dos listas de tabs** (A1).
4. **`NIVEL DE DETALLE`** (A2).
5. Decidir sobre A3, y arreglar A4 antes de que lleguen los SVG.
6. Cablear `npm run censo` al workflow de CI.

A5, A6 y A7 pueden ir en el mismo run o en el siguiente. **B1, B2 y A1 no.**

---

# ✅ RE-AUDIT · 1-ago-2026, commits `267db18` y `507ca96`

**Los cuatro bloqueadores están cerrados. Verificado corriendo, no leyendo.**

## B1 · `/mente` recuperó su puerta

`app-registry.ts:64` la registra como primera app de su sección, con
`installable: false`, que es lo correcto: es un hub, no un hábito. El registro queda en **25**.
Las nueve cards de `habits-portal` quedaron escritas en un test copiado del archivo borrado
(`app-registry.test.ts:74`, *"son nueve, no ocho"*). Ese test es lo que impide que vuelva a
pasar.

## B2 · El censo dejó de creerse. Los dos experimentos corridos aquí

| Experimento | Antes | Ahora |
|---|---|---|
| Archivo muerto con tres rutas en un arreglo | huérfanas bajaban de 8 a 4 | **se quedan en 8**, y el archivo sale en el aviso |
| `console.log('/admin/reports')` en archivo muerto | regalaba puerta | **no cuenta**, y sale reportado |
| Quitar `/mente` del registro | verde | **`HUÉRFANAS NUEVAS: 1`, código de salida 1**, y el aviso de cascada nombra a `/mente/progreso` |

Las dos redes prendidas. El hueco exacto era `pathname:` a secas, que casaba con la firma
`isMentePillarPath(pathname: string)`. Ahora exige forma de navegación **con valor** en la línea
y solo cuenta archivos que alguien importa, siguiendo el grafo desde `app/`.

De paso encontró una huérfana de verdad que nadie buscaba:
**`src/components/interventions/MyProtocolCard.tsx` no lo importa nadie.**

**29 tests al propio censo** (`src/__tests__/censo-rutas.test.ts`), cada caso copiado de una
línea real del proyecto. El guardián ya tiene quien lo guarde.

Números finales, con el detector endurecido en ambos lados: **main 13 de 183 · rama 8 de 185**,
las ocho con motivo escrito. El campo `_medido` corregido.

## A1 · Una sola lista, y un test que lo amarra

`RUTAS_DE_TAB` es ahora la fuente exportada, y `home-floating-core.ts:6` la consume vía
`isTabRootPath`. Incluye las cuatro en `href: null` y tres alias defensivos (`/index`,
`/(tabs)`). `argos-floating-core.test.ts:66` **recorre el set y exige que los dos flotantes se
escondan en todas**: si alguien vuelve a hacerse una copia local, el test falla.

## A2 · `NIVEL DE DETALLE`, con el porqué en el código

---

## 🟢 MERGE APROBADO

Queda pendiente, sin bloquear:

- **A3** (los cuatro registros de iconos paralelos y el docstring que promete de más) —
  decisión de Enrique
- **A4** `AppIcon` con `fill` y `stroke` — antes de montar los SVG, no después
- **A5** la card editorial que se congela · **A6** los iconos que no vuelan en el orden default ·
  **A7** el gate de ciclo duplicado en cuatro archivos
- El motivo falso de `/shared-routine` en la lista blanca y `MyProtocolCard.tsx` sin importador
- Cablear `npm run censo` a CI
- **Device test:** el recorrido de `npm run censo -- --recorrido`, y en especial que la casita
  flotante ya NO aparezca sobre los headers de SALUD, TRIBU y ARGOS
