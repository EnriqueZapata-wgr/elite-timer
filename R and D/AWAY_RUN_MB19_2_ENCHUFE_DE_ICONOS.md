# 🔌 AWAY RUN MB-19.2 · El enchufe de iconos, de verdad

**Rama:** `feat/mb19-2-enchufe` desde `main` (con MB-19.1 mergeado) · worktree propio.
**Solo JS/TS. Cero migraciones, cero dependencias nativas.** Sale por OTA.

**Este run se puede correr HOY, sin tener todavía los SVG.** Prepara el terreno para que el día
que lleguen, montarlos sea un commit de verdad y no una cacería. Cierra A3 y A4 del audit.

---

## El problema, en una frase

`AppIcon` existe y `kit.tsx` lo respeta con disciplina. Pero **se usa en dos lugares**, y las
mismas 24 funciones se siguen dibujando desde cuatro registros paralelos. La promesa de "los 25
cambian a la vez" es falsa hoy.

Y ya hay **cuatro divergencias visibles**: la misma función con dos dibujos distintos.

---

# PIEZA 1 · `AppIcon` listo para SVG (esto va PRIMERO)

Hoy:

```tsx
export function AppIcon({ name, size = 24, color = '#FFFFFF' }: AppIconProps) {
  return <Ionicons name={iconFor(name)} size={size} color={color} />;
}
```

## 1.1 · El footgun que hay que matar antes del montaje

El set que viene es **Phosphor**, cuyos iconos son paths con `fill="currentColor"`. Pero **dos
se dibujaron a mano y usan `stroke="currentColor"`** (`emociones` y `1rm`, hoy en
`R and D/iconos/`). Si `AppIcon` solo sobrescribe una de las dos propiedades, esos dos salen
invisibles sobre negro y nadie va a entender por qué.

**Requisito:** `AppIcon` aplica el color a `fill` **y** a `stroke`. Se prueba con los dos
custom, que ya existen y se pueden meter al repo desde hoy como caso de prueba.

## 1.2 · El tipo del mapa deja de ser Ionicon

`ICON_MAP` está tipado `Record<string, IoniconName>` y `AppIcon` hardcodea `<Ionicons>`. Al
llegar los SVG hay que cambiar los dos. **Que el mapa apunte a un componente, no a un string
de Ionicon**, y que hoy ese componente sea un envoltorio del Ionicon de relleno. Así el día del
montaje se cambia el mapa y **nada más**.

## 1.3 · `name` tipado

`AppIconProps.name` es `string`, así que `<AppIcon name="meditarr" />` compila y pinta un signo
de interrogación en silencio. Con `name: keyof typeof ICON_MAP` (y `AppEntry.icon` igual) el
compilador lo caza gratis. **Hacerlo ahora, mientras el mapa es chico.**

---

# PIEZA 2 · Los cuatro registros paralelos se rinden

Los cuatro dibujan las mismas funciones que ya viven en `app-registry`:

| Archivo | Qué guarda | Formato |
|---|---|---|
| `src/constants/electrons.ts:15-48` | 26 electrones | Ionicon a mano |
| `src/services/hoy/day-booleans.ts:94-111` | duplica la lista anterior | Ionicon a mano |
| `src/constants/hoy-cards.ts:34-53` | las mismas funciones | **emoji** |
| `src/constants/salud-puertas.ts:105-128` | destinos de SALUD | Ionicon a mano |

## 2.1 · Las cuatro divergencias que ya se ven hoy

| Función | Un lado | El otro | Nota |
|---|---|---|---|
| Labs | `flask-outline` | `book-outline` | **misma ruta `/labs-guide`** |
| Suplementos | `medkit-outline` | `medical-outline` | |
| Emociones | `heart-outline` | `heart-circle-outline` | |
| Cardio | `pulse-outline` | `heart-half-outline` | |

## 2.2 · Qué se hace

Cada uno de los cuatro **deja de guardar un dibujo y pasa a guardar un nombre lógico** del
registro (`'meditar'`, `'hidratacion'`, `'labs'`). Sus consumidores pasan a `<AppIcon>`:

```
app/hoy-habitos.tsx:95
src/screens/salud/SaludHub.tsx:93
src/screens/salud/PuertaScreen.tsx:70
src/components/agenda/AgendaMiniCard.tsx:96
src/components/agenda/EventActionModal.tsx:61
src/components/hoy/ActionContentRenderer.tsx:241,268
src/components/hoy/WearableMetricCard.tsx:24
```

⚠️ **Cuidado con `hoy-cards.ts`, que usa emoji.** Un emoji es a color y un icono de línea es
monocromo: cambiarlos altera cómo se ve HOY. **Reportar con screenshot antes de darlo por
bueno**, y si el cambio se ve peor, dejarlo escrito y no forzarlo.

## 2.3 · Los que NO tienen app y necesitan entrada propia

Hay electrones sin app en el registro: `cold_shower`, `grounding`, `no_alcohol`, `red_glasses`,
`steps`, `no_processed_foods`, `screen_time_cutoff`. **No se inventan apps para ellos.** Se les
da entrada en `ICON_MAP` como iconos de hábito, sin entrada en `app-registry`, y se documenta
la diferencia: **el mapa de iconos es más grande que el registro de apps, y está bien.**

## 2.4 · El puente que MB-20 va a necesitar

Las llaves del registro son español (`meditar`, `hidratacion`) y las de los electrones inglés
(`meditation`, `water`). No hay tabla de traducción. **Constrúyela aquí**, en un solo lugar y
con test, porque MB-20 la va a necesitar para saber qué fila de TAREAS corresponde a qué
electrón. Hoy `installable` está duplicando un concepto que ya existe y es más rico.

---

# PIEZA 3 · Los cinco iconos muertos y el test que los bendecía

`app-icon-map.ts:53-60` declara `salud-hoy`, `salud-datos`, `salud-evolucion`,
`salud-expediente`, `salud-ciclo`. **Nadie los renderiza:** `SaludHub.tsx:42-44` dibuja las
puertas con emojis propios.

Peor: `app-registry.test.ts:72-79` tiene una lista blanca que exime justo a esos cinco del test
de iconos huérfanos. **Un test con una excepción para lo que debía detectar no es un test.**

Se resuelve en una dirección o en la otra, no a medias:
- **(a)** Las puertas de SALUD usan `<AppIcon>` con esos cinco nombres y los emojis se van.
- **(b)** Se borran las cinco entradas y la lista blanca del test.

**Recomendación: (a).** Las cuatro puertas son la cara de SALUD y merecen el set, no emojis
del sistema que se ven distintos en cada teléfono.

---

# PIEZA 4 · El commit del montaje (se corre cuando lleguen los SVG)

**No es parte de este run.** Queda documentado aquí para que el día que Enrique entregue
`assets/icons/` sea una sola cosa:

1. `ICON_MAP` apunta a los componentes SVG en vez de a los envoltorios de Ionicon.
2. Se verifica con los dos custom (`emociones`, `1rm`) que el color entra por `fill` y por
   `stroke`.
3. Los cinco `fill` de tabs activos se cablean al estado seleccionado.
4. Screenshot de la cuadrícula y de HOY.

Si las piezas 1 a 3 quedaron bien, **este paso son menos de cincuenta líneas.** Ese es el
examen de si este run sirvió.

---

# 📦 ENTREGA

Un commit por pieza. `tsc`, Vitest y `npm run censo` en verde en cada uno.
Cero em dash en copy de usuario.

**El test que prueba que la promesa ahora sí es cierta:** un test que recorra `app/` y `src/` y
falle si algún archivo que NO sea de chrome dibuja una función del registro con un Ionicon
directo o con un emoji. Es el equivalente del censo, pero para iconos. Sin él, la deuda vuelve
en el siguiente run.

**Verificación en dispositivo:**
1. HOY se ve igual o mejor que antes (ojo con el cambio de emoji a icono).
2. Las cuatro puertas de SALUD llevan iconos del set, no emojis.
3. Labs se dibuja igual en la sala ATP y en SALUD. Igual Suplementos, Emociones y Cardio.
4. Nada quedó con signo de interrogación.
