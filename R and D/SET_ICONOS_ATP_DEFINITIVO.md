# 🎯 Set de iconos ATP · selección cerrada

**Fecha:** 1-ago-2026 · **Fuente:** `@phosphor-icons/core` (MIT). **Los 1,512 nombres se verificaron
contra el paquete instalado**, no de memoria: cada nombre de esta tabla existe como archivo.

Son 1,512 iconos × 6 pesos = 9,072. De ahí salen **28 de los 30**. Se dibujan **2**.

---

# 1 · Las tres decisiones que quitan el 90% del trabajo

## Peso: **Regular**, uno solo, sin excepciones en la cuadrícula

`assets/regular/`. Grosor de 16 sobre lienzo de 256, que a 24 px son 1.5 px reales.

- **Thin y Light desaparecen sobre negro.** Sobre fondo oscuro el trazo fino se percibe más
  delgado de lo que es. Con `#0A0A0A` de fondo, Light se va.
- **Bold** engorda la cuadrícula y pelea con la tipografía.
- **Fill y Duotone** matan la lectura editorial y rompen la regla de monocromo.

**Única excepción, y es intencional:** los **5 tabs de abajo** usan `fill` cuando están activos y
`regular` cuando no. Es la convención de iOS y comunica selección **sin cambiar de color**.

## Color: la cuadrícula va monocroma; el color lo carga el encabezado

Veinticinco iconos de línea en cinco colores distintos se ven como confeti, no como sistema.
La sala ATP no es la pantalla de inicio de un iPhone: ahí los iconos son marcas comerciales,
aquí son señales.

**Default:** todos los iconos en `#E8E8E8`. El **encabezado de sección** lleva su color de
categoría. El icono se tiñe con el color de sección **solo cuando la app está instalada**, lo
cual da un segundo uso al color: distingue activo de disponible sin agregar badges.

| Sección | Color | Hex |
|---|---|---|
| Mente | `CATEGORY_COLORS.mind` | `#7F77DD` |
| Cuerpo | `CATEGORY_COLORS.fitness` | `#8CBF24` |
| Hábitos diarios | `CATEGORY_COLORS.nutrition` | `#5B9BD5` |
| Salud | `CATEGORY_COLORS.metrics` | `#1D9E75` |
| Ciclo (si el gate está abierto) | `CATEGORY_COLORS.cycle` | `#D4537E` |
| Sistema | `TEXT_COLORS.secondary` | `#888888` |
| Icono en reposo | — | `#E8E8E8` |

⚠️ **Los hex salen de `src/constants/brand.ts`, no se escriben a mano en ninguna pantalla.**

## Cómo se inyecta el color (el detalle que rompe si se ignora)

**Los iconos de Phosphor son paths con `fill="currentColor"`, no trazos.** Los dos dibujados a
mano usan `stroke="currentColor"`. Si `AppIcon` solo sobrescribe `fill`, los dos custom salen
negros e invisibles.

**Regla:** `AppIcon` aplica el color a `fill` **y** a `stroke`, y cada SVG declara `currentColor`
en la propiedad que use. Se prueba con los dos custom antes de dar por buena la integración.

---

# 2 · La tabla · nombre exacto de archivo

Todos existen en `node_modules/@phosphor-icons/core/assets/regular/<nombre>.svg`.

## Los 5 tabs

| Tab | Icono |
|---|---|
| HOY | `list-checks` |
| ATP | `squares-four` |
| ORBE | *(ninguno: es `<ArgosOrb />`)* |
| SALUD | `heartbeat` |
| TRIBU | `users-three` |

## Mente · `#7F77DD`

| App | Icono | Nota |
|---|---|---|
| Meditar | `flower-lotus` | |
| Respirar | `wind` | |
| Emociones | **✏️ custom** | cuadrícula 3×3 con una celda marcada fuera del centro |
| Journal | `notebook` | |
| Sueño | `bed` | **la luna se cedió a Ciclo.** `bed` es lo que usan Oura, Fitbit y Apple Salud, y se lee limpio a 24 px. Alterna: `cloud-moon` |
| N-Back | `brain` | |
| Rachas | `medal` | app nueva de MB-19.1: rescató las rachas y medallas cuando se retiró el hub Mente. Va al final de la sección: es consulta, no práctica |

## Cuerpo · `#8CBF24`

| App | Icono | Nota |
|---|---|---|
| Entrenar | `barbell` | |
| Cardio | `sneaker-move` | más distintivo que `person-simple-run`, que se confunde con Movilidad |
| Movilidad | `person-simple-hike` | **decisión de Enrique.** `arrows-out-cardinal` leía a "pantalla completa" |
| 1RM | **✏️ custom** | disco de pesa con flecha hacia arriba |
| Récords | `trophy` | |

## Hábitos diarios · `#5B9BD5`

| App | Icono | Nota |
|---|---|---|
| Comida | `bowl-food` | |
| Hidratación | `drop` | gota **llena**, sin partir |
| Ayuno | `hourglass-medium` | **se queda, decisión de Enrique.** Se evaluó `circle-notch` (el anillo de la ventana) y se descartó: el reloj de arena con la arena a medio caer se lee mejor |
| Suplementos | `pill` | |
| Recetas | `chef-hat` | |
| Lista de compra | `basket` | |

## Salud · `#1D9E75`

| App | Icono | Nota |
|---|---|---|
| Sol | `sun` | |
| Glucosa | `pulse` | **decisión de Enrique.** La gota partida se confundía con Hidratación a 24 px. ⚠️ Revisar contra el tab SALUD, que es `heartbeat`: los dos son trazo de electro |
| Cetonas | `flame` | |
| Ciclo | `moon` | **decisión de Enrique.** La luna es el símbolo cultural del ciclo y no compite con ningún significado de UI. Obligó a mover Sueño, y valió la pena |
| Labs | `flask` | |
| Protocolos | `signpost` | **decisión de Enrique.** El portapapeles era genérico: podía ser cualquier cosa con texto |

## Sistema · `#888888`

| App | Icono |
|---|---|
| f.lux | `lightbulb` |
| Ajustes | `gear` |

---

# 3 · Los dos dibujados (ya están hechos)

En `R and D/iconos/`. Lienzo 256, trazo 16, terminales redondas: **la métrica exacta de
Phosphor Regular.**

| Archivo | Qué es | Por qué no sale de la librería |
|---|---|---|
| `emociones.svg` | Cuadrícula 3×3 con una celda sólida arriba a la derecha | `grid-nine` es la cuadrícula sola: no dice que estás **en** un punto del plano. Y `squares-four` ya es el tab ATP, así que una versión 2×2 se confundiría. |
| `1rm.svg` | Disco de pesa visto de lado con flecha arriba | `barbell` ya es Entrenar. 1RM es carga máxima, no "entrenar". |

**Edad ATP y Cetonas ya no necesitan dibujo:** Cetonas usa `flame`, y la Edad ATP es el **hero**
de SALUD, no una app de la cuadrícula: no lleva icono, lleva número.

**La orbe tampoco es un asset:** es el componente `<ArgosOrb />` con su degradado y su
respiración, que MB-19 ya construye en código. No se dibuja, se programa.

---

# 4 · Cómo se bajan (5 minutos, sin abrir la web)

```
npm i -D @phosphor-icons/core
```

Y se copian los 26 archivos a `assets/icons/`, renombrados como su app:

```powershell
$src = "node_modules\@phosphor-icons\core\assets\regular"
$dst = "assets\icons"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$map = @{
  "list-checks"="tab-hoy"; "squares-four"="tab-atp"; "heartbeat"="tab-salud"; "users-three"="tab-tribu";
  "flower-lotus"="meditar"; "wind"="respirar"; "notebook"="journal"; "bed"="sueno"; "brain"="nback";
  "medal"="rachas";
  "barbell"="entrenar"; "sneaker-move"="cardio"; "person-simple-hike"="movilidad"; "trophy"="records";
  "bowl-food"="comida"; "drop"="hidratacion"; "hourglass-medium"="ayuno"; "pill"="suplementos";
  "chef-hat"="recetas"; "basket"="lista-compra";
  "sun"="sol"; "pulse"="glucosa"; "flame"="cetonas"; "moon"="ciclo";
  "flask"="labs"; "signpost"="protocolos";
  "lightbulb"="flux"; "gear"="ajustes"
}
foreach ($k in $map.Keys) { Copy-Item "$src\$k.svg" "$dst\$($map[$k]).svg" -Force }
```

Los cuatro `fill` de los tabs activos se copian igual desde `assets/fill/` con sufijo
`-fill`. Y los dos custom se mueven de `R and D/iconos/` a `assets/icons/`.

---

# 5 · El filtro final, que es el único que importa

**Poner los 26 juntos en una pantalla, a 24 px, sobre `#0A0A0A`, y taparse los nombres.**
El que necesite etiqueta para entenderse, se cambia. **Ciclo y Sueño ya pasaron esta prueba**
(ver la ronda del 1-ago). Quedan dos sospechosos: **Movilidad** (`arrows-out-cardinal` puede
leerse a "pantalla completa") y **Cardio** (`sneaker-move`).

Y la prueba de coherencia: **`emociones.svg` y `1rm.svg` puestos entre los de Phosphor no
deben notarse como intrusos.** Si el trazo se ve más grueso o más delgado, se ajusta el
`stroke-width` de esos dos y solo de esos dos.
