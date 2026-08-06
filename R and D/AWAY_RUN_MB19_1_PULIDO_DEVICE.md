# 🔧 AWAY RUN MB-19.1 · Pulido de device test

**Rama:** `feat/mb19-1-pulido` desde `main` (con MB-19 ya mergeado) · worktree propio.
**Solo JS/TS. Cero migraciones, cero dependencias nativas.** Sale por OTA.

Todo lo de aquí sale del device test de Enrique del 1-ago. Cada punto trae su causa raíz
verificada, no el síntoma.

---

# PIEZA 1 · La casita: dos bugs con una sola causa cada uno

## 1.1 · Por qué sigue tapando cosas en algunas pantallas

**No es la lista de tabs, esa quedó bien.** El mecanismo que esconde la casita cuando la
pantalla ya trae su propia navegación es `useRegisterOwnNav()`, y **solo lo llaman tres
componentes**: `ScreenHeader`, `PillarHeader` y `StickyPillarBanner`.

**Treinta pantallas se dibujaron su propia flecha de regreso a mano y nunca registran.**
En todas ellas la casita se pinta encima. La lista medida:

```
admin/reports · afiliados/aplicar · afiliados/dashboard · afiliados/mi-codigo
argos/conversations · argos-chat · argos-recipes · braverman · clinical-system
comunidad/amigos · comunidad/buscar · comunidad/perfil/[userId] · comunidad/ranking
execution · fasting · feedback-dashboard · forgot-password · functional-quiz
mente/nback/sesion · onboarding/voice-config · profile · quiz/chronotype · quiz-take
reset-password · settings/comunidad · settings/legal · settings/notifications
settings/privacy · solar · supplements
```

El caso que fotografió Enrique es `comunidad/ranking`: la casita cae sobre la R de "Ranking".

**Arreglo, y que sea el barato:** que el registro no dependa de que alguien se acuerde. La
detección de "esta pantalla ya tiene con qué regresar" debe ser automática. Dos caminos, elige
el que ensucie menos:

- **(a)** `useRegisterOwnNav()` se llama desde un componente que TODAS usan (el contenedor de
  pantalla), no desde el header.
- **(b)** Migrar las 30 a `ScreenHeader`. Es lo correcto a largo plazo pero es un run entero y
  toca copy y layout de cada una. **No es este run.**

Si eliges (a), documenta cómo se registra una pantalla nueva, porque el siguiente que dibuje
una flecha a mano va a reintroducir el bug.

**Y agrega un test que recorra `app/`**: toda pantalla con `arrow-back` o `chevron-back` que
no pase por un header registrado, falla. Es la única forma de que no vuelva.

## 1.2 · Por qué a veces sale verde y a veces blanca

**Hay cinco casitas distintas en el proyecto, en tres colores:**

| Componente | Color |
|---|---|
| `HomeFloatingButton.tsx:74` | `ATP_BRAND.lime` |
| `TopBannerPersistent.tsx:28` | `ATP_BRAND.lime` |
| `StickyPillarBanner.tsx:89` | `#fff` |
| `HomeChip.tsx:23` | `#fff` |
| `GlobalTopBar.tsx:68` | `TEXT.primary` |

Además dos usan el glifo lleno (`home`) y tres el de contorno (`home-outline`).

**Arreglo:** un solo `HomeIcon`, un solo glifo, un solo color. Decisión: **`home-outline` en
`TEXT.primary`**, porque el lima es acento y la regla de marca dice máximo uno o dos acentos por
vista, y la casita no es el dato heroico de ninguna pantalla.

---

# PIEZA 2 · La orbe respira más

Enrique: *"se ve como si pasara de 10 a 11 mm, podría pasar a 12"*. Pide **el doble de
amplitud**.

`src/components/argos/argos-orb-core.ts`. Valores actuales y nuevos:

| Estado | Hoy | Nuevo | Amplitud |
|---|---|---|---|
| `idle` (línea 92) | `0.97 → 1.03` | **`0.94 → 1.06`** | 0.06 → 0.12 |
| `alerta` (78) | `0.98 → 1.06` | **`0.96 → 1.12`** | 0.08 → 0.16 |
| `escuchando` (81) | `1.02 → 1.12` | **`1.02 → 1.22`** | 0.10 → 0.20 |
| `pensando` (84) | `0.98 → 1.04` | **`0.96 → 1.08`** | 0.06 → 0.12 |
| `hablando` (87) | `1.0 → 1.06` | **`1.0 → 1.12`** | 0.06 → 0.12 |

Se duplica la amplitud manteniendo **el mismo centro** y **el mismo orden relativo**. Los
`breathMs` no se tocan: el ritmo está bien, lo que faltaba era recorrido.

⚠️ **Verificar que no se salga de la barra.** El hueco útil es 48 px y la orbe mide 46 con
`marginTop: 6`. Con `scaleMax: 1.06` va a rozar. Quitar ese `marginTop` (el comentario dice que
compensa el hueco de la etiqueta, pero `tabBarLabel: () => null` no deja hueco: no hay nada que
compensar) y bajar `ORB_TAB_SIZE` a 42 si hace falta.

⚠️ **La regla dura no cambia:** nunca parpadea, nunca se pone roja. Y hay que **arreglar el test
`alerta se nota por brillo, no por tamaño`**, que hoy compara contra `escuchando` en vez de
contra `idle` y por eso pasa siendo falso. Que compare contra `idle` y que refleje la decisión
real: con estos valores alerta SÍ crece más que idle, así que el nombre del test debe cambiar o
la aserción debe ser la correcta. **Un test que miente es peor que no tenerlo.**

---

# PIEZA 3 · Se retira el hub MENTE, se rescata su progreso

**Decisión de Enrique en device test:** *"la de Mente es redundante, me manda al módulo de Mente
donde están las mismas apps que ya están en el menú"*. Tiene razón: la sala ATP ya lista
Meditar, Respirar, Emociones, Journal, Sueño y N-Back. El hub es un tap de más para llegar a lo
mismo.

## 3.1 · Lo que se borra

`app/mente.tsx` (248 líneas) y su entrada en `app-registry.ts:64`.

## 3.2 · ⚠️ Lo que NO se puede perder

`app/mente/progreso.tsx` (247 líneas) colgaba **solo** de `app/mente.tsx:138`. Contiene las
rachas de journal, respiración, meditación y check-in, más las medallas de 7, 30, 90 y 365 días.
**Eso no existe en ningún otro lado de la app.**

Entra al registro como app propia de la sección Mente:

```ts
{ key: 'rachas', label: 'Rachas', icon: 'rachas', section: 'mente',
  route: '/mente/progreso', installable: false,
  alias: ['progreso', 'medallas', 'constancia', 'racha'] }
```

Va **al final** de la sección, después de N-Back: es consulta, no práctica.

El registro se queda en 25 apps. Y hay que revisar `app/mente/progreso.tsx`: si su encabezado o
su botón de regreso asumen que vienen del hub, ajustarlos.

## 3.3 · El censo cierra el caso

Correr `npm run censo` después. `/mente` desaparece del árbol y `/mente/progreso` queda con
puerta propia. **Si el censo marca cualquier otra cosa como huérfana nueva, es que `mente.tsx`
tenía un destino que nadie vio.** Revisar sus 248 líneas antes de borrar y reportar cada `route`
que tuviera dentro.

---

# PIEZA 4 · Los mosaicos dejan de verse planos

Enrique: *"las apps no tienen colores aún, se ve muy plano, necesita más diseño"*.

Hoy los 25 mosaicos son cuadrados idénticos `#1a1a1a` con el icono en blanco. La cuadrícula se
lee como una hoja de cálculo.

**El color entra por sección, no por app.** Veinticinco colores distintos serían confeti;
cinco bloques de color se leen como sistema. Cada mosaico toma el color de su sección desde
`CATEGORY_COLORS` de `brand.ts`, **nunca escrito a mano**:

| Sección | Token | Hex |
|---|---|---|
| Mente | `mind` | `#7F77DD` |
| Cuerpo | `fitness` | `#8CBF24` |
| Hábitos diarios | `nutrition` | `#5B9BD5` |
| Salud | `metrics` | `#1D9E75` |
| Sistema | `TEXT_COLORS.secondary` | `#888888` |

Y se aplica en tres capas, que es lo que da profundidad sin gritar:

```
fondo del mosaico   → color de sección al 10% de opacidad
borde del mosaico   → color de sección al 22%
icono               → color de sección al 100%
etiqueta            → TEXT.secondary (se queda gris; el color lo lleva el icono)
encabezado de sección → color de sección al 100%
```

**Reglas duras:**
- El fondo negro de la pantalla no cambia. El degradado sigue siendo territorio exclusivo de la
  molécula y de la orbe: **ningún mosaico lleva degradado.**
- La etiqueta se queda gris. Si el icono y el texto van los dos en color, la cuadrícula vibra.
- ⚠️ **Verificar contraste sobre `#0A0A0A`.** El morado de Mente es el más oscuro de los cinco:
  si a 100% no alcanza 4.5:1, aclararlo hasta que alcance y guardar la variante en `brand.ts`,
  no en el componente.

**Al final del run, screenshot de la cuadrícula completa** para que Enrique la vea antes de que
esto se dé por bueno. Es una decisión visual y la aprueba él.

---

# PIEZA 5 · El rebote respeta al que no lo quiere

Enrique: *"la animación de rebote está muy cool, ahora me gusta mucho, pero no sé si para
algunos se puede volver cansado"*. **La animación se queda.** Lo que falta es la salida para
quien la sufra.

- Honrar `AccessibilityInfo.isReduceMotionEnabled()`: si el sistema pide menos movimiento,
  `LinearTransition` sin `springify`, transición lisa.
- Suscribirse al cambio en vivo (`reduceMotionChanged`), no solo leerlo al montar.
- Es la misma señal que ya usa la orbe para su `REDUCED_GLOW`: reutilizar, no duplicar.

No se agrega un ajuste propio en la app. El sistema operativo ya tiene ese interruptor y la
gente que lo necesita ya lo tiene puesto.

---

# PIEZA 6 · El recorrido corto (para que Enrique no camine 185 rutas)

`npm run censo -- --recorrido` imprime las 185. **Eso es para la máquina, no para una persona.**

Agregar `npm run censo -- --cambiadas <ref>`: compara el mapa de puertas de hoy contra el de un
commit anterior y **lista solo las rutas cuya puerta cambió**. Contra el commit previo a MB-19
son unas 27, no 185.

Salida: la ruta, su puerta de antes, su puerta de ahora. Eso es una lista que un humano camina
en veinte minutos y que de verdad prueba algo.

---

# 📦 ENTREGA

Un commit por pieza. `tsc`, Vitest y `npm run censo` en verde en cada uno.
Cero em dash en copy de usuario. Screenshot de la cuadrícula en la entrega.

**Verificación en dispositivo:**
1. La casita ya no tapa nada en las 30 pantallas listadas. Probar al menos ranking, supplements,
   solar, fasting y braverman.
2. Todas las casitas del mismo color y el mismo glifo.
3. La orbe respira **visiblemente** y **no se sale de la barra**.
4. Mente ya no está en la cuadrícula, y **Rachas sí**, y abre el progreso con sus medallas.
5. Las cinco secciones se distinguen por color de un vistazo, sin parecer confeti.
6. Con "reducir movimiento" prendido en iOS, la cuadrícula reordena sin rebote.
7. `npm run censo -- --cambiadas` imprime una lista corta y legible.
