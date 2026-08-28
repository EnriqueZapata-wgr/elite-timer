> # Retrato del cambio de lienzo · 22 de agosto de 2026
>
> **Qué es esto.** La copia del manual de marca tal como quedó el día en que el lienzo del
> modo oscuro pasó de negro puro a acero. Conserva las columnas comparativas que muestran,
> lado a lado, el valor de hoy y el valor anterior.
>
> **Por qué existe.** Esas columnas fueron útiles mientras el cambio estaba fresco: dejaban
> ver de dónde salió cada número derivado. Ya no lo son para trabajar. Se guardan aquí para
> quien necesite reconstruir la derivación o entender por qué un escalón vale lo que vale.
>
> **NO es la referencia vigente.** No trabajes contra este documento y no cites sus capítulos.
> La referencia viva es `docs/MANUAL_DE_MARCA.md`, en esa ruta y sin comparativas.
>
> Este archivo no se edita. Su valor es ser el retrato de un momento.

---

# ATP · Manual de marca aplicada

> **Qué es este documento.** El sistema visual de ATP ya existe y funciona. Lo que no existía
> era el documento que lo explica. Esto no diseña nada nuevo: **documenta lo que el código ya
> hace**, con la referencia exacta de dónde sale cada regla.
>
> **Para quién.** Para dos lectores a la vez. Quien diseña y no lee código encuentra el criterio
> en palabras. Quien programa encuentra el nombre exacto del token y el archivo.
>
> **Regla del documento.** Todo número y todo color de aquí salió de un archivo del repo, y el
> archivo está citado. Donde no se pudo verificar algo, dice que no se verificó. Donde la regla
> existe pero se rompe en algún lado, dice dónde.
>
> **Relación con los otros documentos.**
> - `ATP_Manual_de_Marca.pdf` (versión 2, julio 2026) es la autoridad de identidad: símbolo,
>   variantes, área de respeto, voz. **No se leyó para este documento**: no está en el repo.
> - `docs/DESIGN_SYSTEM.md` es el criterio de aplicación en pantalla. Sigue vigente, pero
>   **tiene valores desactualizados**: la lista está en el capítulo 11.
> - Este manual es la capa que faltaba entre los dos: las reglas de color, imagen, tema y
>   movimiento tal como están implementadas hoy.
>
> Estado del código al momento de escribirlo: rama `main`.

---

## Índice

1. [Los tres colores de marca](#1-los-tres-colores-de-marca)
2. [Señal contra decoración: el criterio que más se confunde](#2-señal-contra-decoración-el-criterio-que-más-se-confunde)
3. [Colores por dominio (el catálogo de señal)](#3-colores-por-dominio-el-catálogo-de-señal)
4. [Los dos temas](#4-los-dos-temas)
5. [La regla de tránsito: quién puede recibir el claro](#5-la-regla-de-tránsito-quién-puede-recibir-el-claro)
6. [Reglas del tema claro ganadas a golpes](#6-reglas-del-tema-claro-ganadas-a-golpes)
7. [Imágenes editoriales](#7-imágenes-editoriales)
8. [Degradados](#8-degradados)
9. [Iconos](#9-iconos)
10. [Tipografía, espaciado y forma](#10-tipografía-espaciado-y-forma)
11. [El logo](#11-el-logo)
12. [Movimiento](#12-movimiento)
13. [Los tests son el manual ejecutable](#13-los-tests-son-el-manual-ejecutable)
14. [Dónde el sistema se contradice a sí mismo](#14-dónde-el-sistema-se-contradice-a-sí-mismo)
15. [Costumbre sin regla, y lo que no se verificó](#15-costumbre-sin-regla-y-lo-que-no-se-verificó)

---

## 1. Los tres colores de marca

**Qué es.** ATP tiene tres colores de marca y nada más. Dos principales y uno secundario.

| Rol | Token | Valor |
|---|---|---|
| Principal 1 | `ATP_BRAND.lime` | `#A8E02A` |
| Principal 2 | `ATP_BRAND.teal` (= `teal2`) | `#1ABC9C` |
| Secundario | `ATP_BRAND.amber` | `#EFD54F` |

Intermedios del degradado de marca, que no se usan sueltos: `green1 #6DCC48`, `green2 #3DBF6E`,
`teal1 #2EC28A`.

**De dónde sale.** `src/constants/brand.ts` líneas 17 a 34. La doctrina está escrita en el
comentario de las líneas 12 a 16: *"3 colores, lime + teal PRINCIPALES, amarillo (amber)
SECUNDARIO. Nada de 4º color de marca."*

**Un solo amarillo.** `SEMANTIC.acceptable` y `SCORE_COLORS.stable` **no son colores propios**:
apuntan al mismo `ATP_BRAND.amber`. Cualquier otro amarillo en una pantalla es deuda, no
decisión. Lo protege `src/constants/__tests__/brand-tokens.test.ts`, que falla si los tres
dejan de ser el mismo hex.

**Cuándo se usa el lima.** Solo tres casos, declarados en `ACCENT_ROLES` (`brand.ts` 291-302):
1. Acción primaria o CTA.
2. Dato heroico (uno por pantalla).
3. Estado semántico "hecho" (palomitas de completado). Eso es feedback, no adorno.

**Cuándo NO.** Como fondo de una superficie grande. El comentario de `BUTTON_STYLES.primary`
(`brand.ts` 129-131) es explícito: *"Para superficies grandes, preferir brandGradient()
sobre el lime plano; el sólido es para botones compactos, no fondos."*

**La heurística de campo.** Si en una captura de pantalla cuentas **más de dos o tres elementos
lima** que no sean CTA, héroe o estado, sobra acento y hay que pasarlos a gris
(`TEXT.secondary`). Está escrita en `brand.ts` 293-294.

**Lo que NO cuenta como exceso.** El lima cuando es color de categoría (fitness) o estado
semántico. Eso es el sistema funcionando.

---

## 2. Señal contra decoración: el criterio que más se confunde

Esta es la regla central del sistema de color de ATP, y hasta ahora vivía solo en comentarios
sueltos y en un test. Escrita completa:

> **Un color es SEÑAL cuando el usuario tiene que aprenderlo una vez y reconocerlo siempre.
> Un color es DECORACIÓN cuando su único trabajo es verse bien sobre el fondo del momento.**
>
> **La señal no se tematiza. La decoración sí.**

**Por qué.** Si el rosa del ciclo fuera un poco distinto en tema claro, el usuario tendría que
aprender dos rosas. El lima de fitness es lima en los dos temas por la misma razón que el rojo
de un semáforo es rojo de día y de noche. En cambio el fondo de una card no significa nada: es
la superficie, y su trabajo es tener contraste, así que cambia con el tema.

La regla está escrita en `src/constants/concept-colors.ts` líneas 43-51:
*"Los colores de sección NO se tematizan: son identidad, el lima de fitness es el mismo en claro
y en oscuro."*

### Las tres preguntas para decidir

1. **¿El color carga información que el texto no dice?** Si al quitar el color se pierde
   significado, es señal. El semáforo de un biomarcador es señal. El fondo de la card que lo
   contiene, no.
2. **¿El usuario lo reconoce entre pantallas?** Si el mismo concepto aparece en HOY, en Agenda y
   en Reportes con ese color, es señal.
3. **¿Cambia de valor si cambia el tema?** Si la respuesta correcta es "no debería", es señal.

### El candado técnico: un color se clasifica por sus canales

Los dos tests de ámbito (`mb31b-remate.test.ts`, `mb31b1-ambito.test.ts`) prohíben escribir un
hex a mano en las pantallas de sus listas, pero **no con una lista blanca de excepciones**. La
distinción es aritmética:

- **Hex neutro** = los tres canales son iguales (`#000`, `#fff`, `#888`, `#0a0a0a`, `#121212`).
  Un neutro es superficie o texto, o sea **tema**. Escribirlo a mano está prohibido: tiene que
  venir del token, porque en el otro tema vale otra cosa.
- **Hex con canales distintos** = es color, o sea **identidad o señal**. Se permite escribirlo,
  porque no cambia con el tema.

Además se prohíbe escribir a mano el valor literal de cualquier token de tema (por ejemplo
`#E9EEF1`), aunque no sea neutro: eso es un token disfrazado de color.

Las excepciones declaradas en los dos tests (`IDENTIDAD`) son `CATEGORY_COLORS`,
`SECCION_COLORS`, el lima, los dos teals, el ámbar y el `moleculeGradient`.

**Consecuencia práctica para quien diseña:** si te preguntas si un color debe cambiar en tema
claro, mira si tiene canales iguales. Los grises cambian. Los colores no.

---

## 3. Colores por dominio (el catálogo de señal)

Todo lo de este capítulo es señal. **Ningún valor de aquí cambia entre tema claro y tema
oscuro.**

### 3.1 Las diez secciones (la fuente única)

`src/constants/concept-colors.ts`, exports `CONCEPT_COLORS` y `SECCION_COLORS`.

| Sección | Color | Texto encima cuando es relleno |
|---|---|---|
| fitness | `#A8E02A` | negro |
| nutricion | `#5B9BD5` | negro |
| agua | `#60A5FA` | negro |
| ayuno | `#6B46C1` | **blanco** |
| sol | `#FBBF24` | negro |
| mente | `#7F77DD` | negro |
| sueno | `#818CF8` | negro |
| cardio | `#E74C3C` | negro |
| suplementos | `#EF9F27` | negro |
| ciclo | `#D4537E` | negro |

**La regla del texto encima.** Una sola excepción y es fácil de recordar: **ayuno lleva blanco,
las otras nueve llevan negro.** La decide `textoSobreSeccion(seccion)`
(`concept-colors.ts` 73-75). El negro sobre morado de ayuno mide 3.27 y no alcanza AA; el blanco
mide 6.42 y sí.

**El candado estructural más elegante del repo.** `theme-tokens.test.ts` verifica que
`textoSobreSeccion.length === 1`, o sea que la función recibe **un solo argumento**. Comentario
del test: *"la decisión de texto-sobre-relleno no puede bifurcarse por tema porque la función ni
siquiera conoce el tema."* No es una regla que se pide cumplir: es una regla que no se puede
romper sin cambiar la firma.

**Cuándo NO usar un color de sección.** Como color de letra sobre fondo claro. Ocho de los diez
fallan AA sobre la card clara. La única que pasa es ayuno (5.49). Sobre claro, un color de
sección se usa como **relleno, icono grande, barra o punto**, nunca como letra
(`modo-claro-reglas.test.ts`, Regla 3).

**Cuándo leer de aquí.** Siempre que una pantalla pinte uno de estos diez conceptos. El
comentario de cabecera es explícito: *"Al agregar una pantalla con estos conceptos, leer de
AQUÍ, nunca hardcodear el hex en la pantalla."* El archivo nació de una auditoría de julio 2026
que encontró que suplementos, fitness y nutrición tenían dos o tres paletas distintas según la
pantalla.

### 3.2 Categorías y pilares

`brand.ts` 63-72, `CATEGORY_COLORS`:

`fitness #8CBF24` · `nutrition #5B9BD5` · `mind #7F77DD` · `optimization #EF9F27` ·
`metrics #1D9E75` · `rest #E0E0E0` · `cycle #D4537E`

El lima de categoría es **desaturado a propósito** (`#8CBF24` en vez de `#A8E02A`): el lima puro
queda reservado a acción primaria y dato heroico (comentario en `brand.ts` 64-65).
**Ojo: esto choca con la sección `fitness` del capítulo anterior. Ver capítulo 14.**

`APP_SECTION_COLORS` (`brand.ts` 83-92) mapea las cinco secciones de la sala ATP a esos colores.
La regla de aplicación está escrita en el docblock de las líneas 74-82: se aplica **en capas**,
fondo del mosaico al 10 por ciento, borde al 22 por ciento, icono y encabezado de sección al 100
por ciento, y **la etiqueta se queda gris** (`TEXT.secondary`). El criterio: *"Cinco bloques de
color se leen como sistema; veinticinco serían confeti."*

### 3.3 Semáforo de salud

`brand.ts` 309-334, `SCORE_COLORS` + `getScoreColor(score)`:

| Tramo | Etiqueta | Color |
|---|---|---|
| 85 o más | ÓPTIMO | `#4ade80` |
| 70 a 84 | CARGADO | `#a8e02a` |
| 55 a 69 | ESTABLE | `#EFD54F` (el ámbar de marca) |
| 40 a 54 | BAJO | `#f97316` |
| menos de 40 | CRÍTICO | `#FF3B30` |

**Nunca elegir el color a mano.** Se llama `getScoreColor(score)`.

**Los dos rojos están separados a propósito.** `SEMANTIC.error = #E8877F` es un coral apagado y
es el error de **interfaz** (un formulario mal llenado). `SCORE_COLORS.critical = #FF3B30` es
rojo pleno y es el dato **de salud** en estado crítico. El criterio, escrito en `brand.ts`
100-102 y 314-315: *"el dato crítico de salud grita MÁS que un error de formulario."* Un campo
de captura vacío no puede verse tan grave como un biomarcador fuera de rango.
Esta regla estaba rota en el semáforo de labs y en tres tablas más. **Ya se corrigió**
(commit `MARCA:`, ver 14.3), y ahora la cuida un candado: `src/constants/__tests__/rojo-clinico.test.ts`.

### 3.4 Fases del ciclo

`src/services/cycle-service.ts`, export `PHASES`:

`menstrual #E24B4A` (días 1-5) · `follicular #a8e02a` (6-13) · `ovulation #EF9F27` (14-16) ·
`luteal #7F77DD` (17-28)

El color acompaña una doctrina de copy escrita en el mismo archivo (líneas 33-36): folicular y
ovulatoria **intensifican**, lútea y menstrual **escuchan**. Nunca prohibir, nunca "descansar".

Estos cuatro colores son distintos del rosa del dominio ciclo (`#D4537E`), que es el color de la
sección. No es un error: uno identifica el módulo, los otros cuatro identifican el estado dentro
del módulo.

### 3.5 Electrones

`src/constants/electrons.ts`, export `ELECTRON_WEIGHTS`. Veintinueve electrones, cada uno con su
color. **Los que corresponden a un concepto canónico importan de `concept-colors`**
(`strength`, `sunlight`, `supplements`, `protein`, `water`); los demás llevan color propio.

Rangos de electrones acumulados (`ELECTRON_RANKS`, líneas 73-80). Son señal de progreso, no de
concepto:

`Partícula 0-50 #999999` · `Átomo 51-200 #38bdf8` · `Molécula 201-500 #a8e02a` ·
`Reactor 501-1000 #fbbf24` · `Fusión 1001-2500 #fb923c` · `Supernova 2501+ #c084fc`

### 3.6 Ejes de Braverman

`src/constants/braverman-questions.ts`, `NEUROTRANSMITTER_META`:

`dopamine #ef4444` · `acetylcholine #3b82f6` · `gaba #22c55e` · `serotonin #f59e0b`

Y su semáforo propio de déficit, `DEFICIENCY_COLORS`:
`none #22c55e` · `minor #fbbf24` · `moderate #f97316` · `major #ef4444`

### 3.7 Escala UV

`src/services/uv-service.ts`, `getUVLevel(uv)`. Es la única definición en el repo:

`Bajo (0-2) #22c55e` · `Moderado (3-5) #fbbf24` · `Alto (6-7) #fb923c` ·
`Muy Alto (8-10) #ef4444` · `Extremo (11+) #dc2626`

### 3.8 Cronotipos

`src/components/assessments/ChronotypeReveal.tsx` líneas 21-23, constante **local** al
componente (no exportada, no hay fuente única):

`lion #F5A623` · `bear #8B6914` · `wolf #7F77DD` · `dolphin #5B9BD5`

**Esto es costumbre, no regla.** Ver capítulo 15.

---

## 4. Los dos temas

**Un token nombra un rol, no un color.** Los dos temas tienen exactamente las mismas llaves, y
un test lo verifica. Fuente: `src/constants/brand.ts`, interfaz `AppThemeTokens`.

> **El oscuro dejó de ser negro puro. Medido y aplicado el 22 de agosto de 2026.**
> Decisión del dueño: el negro puro se lee demasiado profundo y cansa a la lectura. El lienzo
> es ahora un **acero oscuro**. La pizca de azul es a propósito: es lo que el ojo lee como
> acero y no como gris sucio. Vive detrás de la bandera `ACERO_OSCURO` en
> `src/constants/flags.ts`, así que se puede volver al negro por OTA sin compilar.

| Token | Rol | Oscuro (acero) | Oscuro anterior | Claro (acero) |
|---|---|---|---|---|
| `fondo` | El lienzo de la pantalla | `#0F1114` | `#000000` | `#DBE2E7` |
| `card` | Superficie de card | `#1A1D22` | `#121212` | `#E9EEF1` |
| `hundido` | Dato dentro de card, campo de captura | `#0A0C0F` | `#0A0A0A` | `#D3DBE1` |
| `flotante` | Hoja modal, menú emergente | `#292E36` | `#232323` | `#F2F5F7` |
| `borde` | Separador, contorno de card | `#252931` | `#1F1F1F` | `#CBD5DC` |
| `bordeMarcado` | Campo con foco, selección | `#383F4A` | `#333333` | `#B4C1CA` |
| `texto` | Texto principal | `#FFFFFF` | `#FFFFFF` | `#0F1518` |
| `textoSecundario` | Texto secundario | `#909090` | `#888888` | `#4A555C` |
| `textoTenue` | Etiquetas grandes o deshabilitadas | `#555555` | `#555555` | `#7A868E` |
| `textoSobreLima` | Texto sobre relleno lima | `#000000` | `#000000` | `#000000` |
| `tealTexto` | Acento de texto y enlace | `#1ABC9C` | `#1ABC9C` | `#086A5E` |
| `error` | Error de interfaz | `#E8877F` | `#E8877F` | `#B03A2E` |
| `sinDatos` | Sin datos | `#444444` | `#444444` | `#A9B4BC` |
| `info` | Información como texto | `#5B9BD5` | `#5B9BD5` | `#2E6DA4` |
| `bordeEditorial` | Borde de la card editorial | `transparent` | `transparent` | `#CBD5DC` |

### 4.1 La rampa oscura se mueve completa

Esta es la regla que ordena todo el capítulo, y la que más caro se paga si se ignora: **la
escala de elevación se mueve entera o no se mueve.** Aclarar solo el lienzo deja la card más
oscura que el fondo sobre el que flota, y con eso el modelo de elevación se invierte en las 142
pantallas de un golpe. Lo mismo con cada borde, que estaba calibrado contra negro.

Los doce valores viven en `OSCURO` (`src/constants/brand.ts`) y de ahí los consumen `SURFACES`,
`BG`, `BORDER`, `PILL`, `CARD`, `ELEVATION` y `THEME_DARK`. **Ningún gris del modo oscuro se
escribe a mano en ningún otro archivo.**

| Escalón | Rol | Acero | Anterior |
|---|---|---|---|
| `campo` | Campo de captura, hundido dentro de una card | `#0A0C0F` | `#0a0a0a` |
| `fondo` | El lienzo, o sea `ELEVATION[0]` | `#0F1114` | `#000000` |
| `chrome` | Tab bar, sidebar, píldoras de filtro | `#16191D` | `#0A0A0A` |
| `card` | Card estándar, o sea `ELEVATION[1]` | `#1A1D22` | `#121212` |
| `flotante` | Card sobre card u hoja modal, o sea `ELEVATION[2]` | `#292E36` | `#232323` |
| `popover` | Menú flotante, o sea `ELEVATION[3]` | `#343A45` | `#2F2F2F` |
| `bordeSutil` | Separador interno de card | `#1E2228` | `#141414` |
| `bordeCampo` | Contorno de campo de captura | `#23272E` | `#222222` |
| `bordePildora` | Contorno de píldora de filtro | `#242830` | `#1a1a1a` |
| `bordeCard` | Contorno de card, o sea `ELEVATION[1].border` | `#252931` | `#1F1F1F` |
| `bordeMarcado` | Foco, selección, deshabilitado | `#383F4A` | `#333333` |
| `bordePopover` | Contorno de popover | `#404854` | `#3D3D3D` |

**Cómo se derivaron los nueve valores que el dueño no dictó.** No a ojo:

1. El tinte de acero que él eligió resultó ser una función limpia, `G = R + 0.12·R` y
   `B = R + 0.32·R`, que reproduce `#0F1114` y `#1A1D22` exactos. Los escalones derivados usan
   esa misma función, así que la pizca de azul crece con la luminancia igual que en sus valores.
2. Cada escalón conserva el **mismo salto de contraste WCAG** que ya tenía sobre negro:
   card→flotante pasa de 1.192 a 1.238, flotante→popover de 1.174 a 1.194. No se inventó
   separación nueva.
3. Cada borde conserva el salto que tenía sobre la superficie que contornea, que es lo que lo
   hace leerse como filo y no como halo.

**Un desacople deliberado.** `campo` y `chrome` compartían `#0A0A0A` por accidente: con el
lienzo en negro puro no había hacia dónde bajar, así que lo hundido y el chrome tuvieron que
subir los dos. Ahora se separan. El campo se queda hundido, que es su rol, y por fin se lee como
campo: su contraste contra la card pasa de 1.057 a 1.159. El chrome, que vive **sobre** el
lienzo, sube a su propio escalón; si se hubiera quedado en `#0A0A0A` habría quedado más oscuro
que el lienzo y la tab bar se habría leído hundida.

### 4.2 Los números del oscuro, medidos el 22-ago-2026

Calculados con `contrastRatio` de `src/utils/contrast.ts` (WCAG 2.x real) y anclados en
`src/constants/__tests__/theme-tokens.test.ts`.

| Par | Antes | Ahora | Nivel |
|---|---|---|---|
| Texto blanco sobre lienzo | 21.00 | **18.91** | AAA de sobra |
| Texto blanco sobre card | 18.73 | **16.90** | AAA de sobra |
| Texto secundario sobre card | 5.28 | **5.29** | AA (ver 4.2.1) |
| Lima sobre lienzo | 13.36 | **12.03** | AAA |
| Teal sobre card | 7.78 | **7.01** | AAA |

**Qué se debilitó, dicho sin adornos.** El contorno del campo de captura contra la card baja de
1.177 a 1.127. Se aceptó porque el propio campo se hunde el doble que antes contra esa misma
card (1.057 a 1.159): el campo se distingue mejor aunque su filo sea más suave.

#### 4.2.1 El gris secundario se recalibró, y no por gusto

`textoSecundario` pasa de `#888888` a `#909090` **solo en el modo oscuro**. Ocho puntos de canal,
imperceptibles a la vista. Se hizo por una razón que no es estética y que costó encontrar.

`#888888` contra la card de acero da 4.767. Sigue siendo AA, así que a simple vista no había
problema. Pero **el velo nocturno in-app tiene un contrato duro** (cap. 4 y
`night-veil-core.ts`): nunca puede tumbar un par de texto por debajo de AA, y si lo tumbaría, se
recorta a sí mismo. Ese recorte se come la holgura del par **más apretado**, y el más apretado
es justo este. La holgura pasaba de 0.785 a 0.267, y con eso el velo se estrangulaba: el rojo
pleno del final de la curva caía de alpha 0.116 a 0.046, o sea **60% menos filtro justo a la
hora en que el filtro sirve para algo**.

`#909090` devuelve 5.293 contra la card (era 5.285) y 5.923 contra el lienzo (era 5.924), y con
eso el velo vuelve a 0.113. Los mismos números de antes del cambio, que era el objetivo.

La regla general que deja este caso: **al mover el lienzo hay que remedir también los textos,
no solo las superficies y los bordes.** Un token puede seguir pasando AA y aun así romper algo
que depende de su holgura.

**Los colores de dominio no se recalibran.** Son señal, no decoración (cap. 2 y 3). Contra el
lienzo nuevo los diez de sección siguen igual de legibles que antes; el más bajo es ciclo con
4.81. Pero como **texto sobre una card de acero** hay tres que quedan un pelo bajo AA: mente
4.49, ciclo 4.30, cardio 4.42. No se tocan: se usan al 100% para icono y encabezado, que es
texto grande y ahí el mínimo es 3:1, y al 10% y 22% como fondo y borde del mosaico. Ayuno
(`#6B46C1`, 2.63) y `sinDatos` (`#444444`, 1.73) ya estaban bajo AA antes de este cambio y por
las mismas razones: el morado de ayuno es relleno con texto blanco encima, no tinta.

### 4.3 Dónde el negro se queda, y por qué

El acero es el lienzo general. Hay superficies donde el negro profundo **es la función**:

- **La sesión de sueño** (`app/sleep-session.tsx`). Un teléfono encendido toda la noche junto a
  la cama. Tiene su paleta propia (`NIGHT`, en `night-curve.ts`) y ahora pasa `NIGHT.bg`
  explícito por el prop `fondo` de `<Screen>`. Antes heredaba el lienzo global y coincidía en
  `#000000` de casualidad.
- **El reproductor de mente** (`app/mente/player.tsx`). Superficie editorial full-bleed, negra
  en los dos temas (cap. 7). Ya estaba anclada.
- **La card editorial**. Oscura en los dos temas, con velo constante. Solo su borde cambia.

**No** se quedan en negro, y es correcto: la respiración y la meditación leen el tema dentro de
`<ThemeReady>` y en modo claro salen claras. Son pantallas de sesión, no superficies de noche.

**Lo que este cambio no alcanza.** El splash **nativo** vive en `app.json` con
`backgroundColor: #000000` y es recurso compilado: no viaja por OTA. Con la bandera encendida,
el arranque en frío pasa del negro del splash al acero de la app. Se cierra en el próximo build
nativo, no antes. Lo mismo el fondo del widget de Android (`widget_bg_dark.xml`), que además
vive en la pantalla de inicio del teléfono y no participa de la rampa de la app.

### Los cuatro modos

`src/contexts/theme-context.tsx` + `src/services/theme/theme-mode-core.ts`.

1. **Claro** y 2. **Oscuro**: absolutos. Ni la hora ni el ajuste del sistema los mueven.
3. **Adaptativo**: usa **el horario del usuario**, no el atardecer del sistema. El mismo
   despertar y el mismo corte de pantallas que anclan sus hábitos. Un usuario que despierta a
   las 11:00 y corta a la 01:30 sigue en tema claro a las 23:00.
4. **Como el teléfono**: solo mira `useColorScheme()`.

**El default es oscuro.** Sin preferencia guardada, con preferencia corrupta o con basura en
disco, el resultado es oscuro (`THEME_MODE_DEFAULT`). Lo verifica
`src/services/theme/__tests__/theme-mode-core.test.ts`.

**La preferencia es local.** Vive en AsyncStorage (`@atp/theme_mode`), no en el servidor: el
tema es del equipo, no del usuario.

### El velo nocturno es otro ajuste

`src/services/theme/night-veil-core.ts` + `src/constants/night-curve.ts`. Clave, y está escrito
en el test: **el velo es independiente del tema.** Encendido sobre tema claro, el resultado
sigue siendo claro entibiado, nunca oscuro. Su tono es cálido por definición (rojo mayor que
verde mayor que azul), no un gris que apaga.

Y no puede romper el contraste: el velo se recorta (clamp) para que en ningún minuto de su curva
un par protegido baje de su piso. La curva es **una sola** y sirve para tres cosas: el velo
in-app, el filtro de sistema y la paleta del buró. Corte por defecto 21:45, fin de ventana 05:00.

---

## 5. La regla de tránsito: quién puede recibir el claro

Esta regla no estaba escrita en ningún documento y es la que más fácil se rompe.

**El problema.** Cuando se construyó el tema claro había alrededor de 66 pantallas con colores
escritos a mano. Tematizar sus superficies habría dejado texto blanco sobre acero. Así que el
claro no se entrega a todos: **se entrega solo a quien declaró estar listo.**

**Las dos lecturas** (`src/contexts/theme-context.tsx` 173-195):

| Hook | Qué devuelve | Quién lo usa |
|---|---|---|
| `useAppTheme()` | El tema **global**, siempre | El **marco** que posee su superficie completa: tab bar, velo, ErrorBoundary. Y **la ruta** que declara `themed` |
| `useSurfaceTokens()` | El tema del **scope**: claro solo si hay un `<ThemeReady>` arriba; si no, oscuro | El **cuerpo**: componentes del kit `ui/`, pantallas compartidas |

**Migrar una pantalla al tema claro** significa dos cosas juntas: limpiar sus colores escritos a
mano y envolverla en `<ThemeReady>`.

### El footgun que costó un bug

**Una ruta que declara `themed` tiene que leer `useAppTheme`, no `useSurfaceTokens`.**

Por qué: el `<ThemeReady>` que abre el claro lo renderiza la propia pantalla, **más abajo** en el
árbol. Si la ruta llama `useSurfaceTokens()` a su propio nivel, todavía no hay `ThemeReady`
arriba, así que recibe **oscuro perpetuo** sin importar el ajuste del usuario. La pantalla se ve
correcta por dentro y mal por fuera.

Lo protege `mb31b-remate.test.ts` bloque 3a: todo archivo de `app/` que contenga
`<Screen themed>`, `<TabScreen themed>` o `<ThemeReady>` **debe** llamar `useAppTheme(`.

### La frontera del cuerpo compartido

El caso de referencia es `SaludHub`, que se monta desde dos rutas distintas. La regla:
**un cuerpo montado por un tab lee el scope, nunca el tema global.** Sus dos monturas son las
que declaran `themed`.

Verificado por `mb31b-remate.test.ts` bloque 3b: `src/screens/salud/SaludHub.tsx` debe contener
`useSurfaceTokens` y **no** debe contener `useAppTheme(`.

---

## 6. Reglas del tema claro ganadas a golpes

Las tres primeras están codificadas en `src/constants/__tests__/modo-claro-reglas.test.ts`, que
**calcula el contraste real con la fórmula WCAG**, no compara cadenas de texto. Si alguien
recalibra un token y el par baja de su nivel, el test truena aunque el color se vea bonito.

### Regla 1: el lima nunca es texto en tema claro

El lima sobre la card clara mide **1.34**. Es invisible. En claro el lima es **relleno con negro
encima** (13.36, AAA), barra o indicador. Nunca letra.

Además: ningún rol de texto del tema claro puede ser el lima. El test lo verifica contra los
siete roles de texto.

### Regla 2: el teal de marca tampoco es texto en claro

`#1ABC9C` sobre card clara mide **2.06**: no llega ni a texto grande. El acento de texto en claro
es la variante calibrada `tealTexto = #086A5E` (5.56 sobre card, 4.96 sobre fondo).

En oscuro el teal de marca **sí** es el acento de texto y no se toca.

El criterio, escrito en `brand.ts` 466-467: *"el teal, calibrado por fondo como una tinta según
el papel."* El color de marca no cambia; cambia la tinta con la que se escribe.

### Regla 3: el texto sobre relleno de sección ya está decidido

Ver capítulo 3.1. Ayuno blanco, las otras nueve negro.

### Regla 4: `textoTenue` no alcanza para letra chica en claro

`THEME_LIGHT.textoTenue = #7A868E` mide **3.19** sobre la card clara. Eso pasa el umbral de
**texto grande** (3.0) y **no** pasa AA de texto normal (4.5).

**La regla:** en tema claro, `textoTenue` sirve solo para etiquetas grandes o estados
deshabilitados. **Cualquier texto chico que en oscuro usaba `textoTenue` tiene que subir a
`textoSecundario`** (`#4A555C`, 6.54, AA).

De dónde sale: la declaración del token en `brand.ts` 462 (*"solo etiquetas grandes o
deshabilitadas (3.19 en claro)"*), el par de `theme-tokens.test.ts` que le pone piso 3 en vez de
4.5, y `night-veil-core.test.ts`, que anota que el tenue *"casi no tiene holgura sobre su piso
de 3.0"* cuando entra el velo nocturno.

### Los contrastes que el sistema promete

`theme-tokens.test.ts` fija dieciocho pares con su piso, y siete de ellos con su número exacto
(tolerancia 0.05). Los números:

| Par | Medido |
|---|---|
| claro: `texto` sobre `card` | **15.75** (AAA) |
| claro: `textoSecundario` sobre `card` | **6.54** (AA) |
| claro: `textoTenue` sobre `card` | **3.19** (solo texto grande) |
| claro: `textoSobreLima` sobre lima | **13.36** (AAA) |
| claro: `tealTexto` sobre `card` | **5.56** (AA) |
| claro: `tealTexto` sobre `fondo` | **4.96** (AA) |
| blanco sobre `ayuno` | **6.42** |

Pisos exigidos: texto principal **7 (AAA)** sobre las cuatro superficies en claro y sobre card y
fondo en oscuro; secundario, teal calibrado, error e info **4.5 (AA)**; tenue **3**.

---

## 7. Imágenes editoriales

Fuente principal: `src/components/hoy/EditorialCard.tsx`.

### 7.1 La doctrina: la card editorial es la ventana, no el marco

**La regla.** Una card editorial **se queda oscura en los dos temas**. Foto, degradado negro y
texto blanco. **Lo único que cambia con el tema es su borde**, para despegarse del acero del
tema claro.

**Por qué.** Es una ventana a una imagen, no una superficie de la interfaz. Tematizarla la
convertiría en un rectángulo de color con una foto adentro. El texto blanco encima está anclado
a `TEXT.primary`, no al token de tema, a propósito.

**El código exacto** (`EditorialCard.tsx` 93-99):

```
const t = useSurfaceTokens();
const bordeTema = t.kind === 'light'
  ? { borderWidth: 1, borderColor: t.bordeEditorial }
  : null;
```

**El candado.** `theme-tokens.test.ts` bloque 10 lee el archivo fuente y exige que
`t.kind === 'light'` aparezca **exactamente una vez**. No es una convención pedida: si alguien
agrega una segunda condición de tema al componente, el test truena. Y verifica que
`THEME_DARK.bordeEditorial === 'transparent'` mientras
`THEME_LIGHT.bordeEditorial === THEME_LIGHT.borde` (`#CBD5DC`).

El mismo candado, con la misma forma, cubre otras tres superficies editoriales
(`mb31b1-ambito.test.ts` bloque 3):

| Componente | Velo oscuro constante |
|---|---|
| `src/components/hoy/EditorialCard.tsx` | `['transparent', 'rgba(0,0,0,0.55)']` |
| `src/components/hoy/TareaCard.tsx` | `['transparent', 'rgba(0,0,0,0.62)']` |
| `src/components/hoy/MomentoBanda.tsx` | `['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.30)']` |
| `src/components/agenda/AgendaMiniCard.tsx` | `['#151515', '#0E0E0E']` |

### 7.2 Cuándo blanco y negro, cuándo color

**La convención declarada:** las fotos editoriales son **blanco y negro**. Está escrito en cuatro
docblocks: `EditorialCard.tsx` línea 3 (*"Imagen B/N de fondo, full bleed"*),
`AgendaMiniCard.tsx` línea 3 (*"foto B/N lateral, ~30% width"*), `HeroAgendaCard.tsx` línea 4,
`MenteHubCard.tsx` línea 4 (*"Estética editorial ATP: B/N, tipografía grande, borde fino, acento
lima"*).

**Cómo se logra:** la foto **ya viene en blanco y negro desde el asset**. La prop se llama
`imageBn`, pero **el código no aplica ningún filtro de saturación**. Se buscó `grayscale`,
`saturate` y `tintColor` en todo `src/` y no hay ninguno aplicado a estas imágenes.

**Consecuencia honesta: esto es convención de producción de assets, no regla forzada por
código.** Nada impide que entre una foto a color por `imageBn` y nadie se entere hasta verla en
el dispositivo. **No se verificó pixel por pixel que los 60 y tantos `.webp` de `assets/images/`
sean efectivamente monocromos.** Ver capítulo 15.

**Dónde SÍ entra el color.** El color no lo pone la foto: lo pone **el degradado de sección
encima de la foto**. Ese es el mecanismo real de "cuándo color". La foto da textura y contexto;
el degradado da la identidad del dominio.

### 7.3 El velo: tres capas, y por qué son tres

La card apila las capas en este orden (`EditorialCard.tsx` 115-158):

1. **Placeholder de degradado**, siempre, debajo de todo: el color de sección al 25 por ciento
   de opacidad. Existe porque mientras la imagen decodifica la card era un hueco negro.
2. **La foto**, `contentFit="cover"`, `transition={180}`, `cachePolicy="memory-disk"`.
3. **Degradado de categoría, en diagonal** (de esquina superior izquierda a inferior derecha):
   - **Con foto:** de `${gradient[0]}CC` (80 por ciento de alfa) a `${gradient[1]}1A` (10 por
     ciento). La esquina superior izquierda queda tintada; la inferior derecha deja ver la foto
     casi limpia.
   - **Sin foto:** el degradado sólido a `opacity: 0.9`, con el icono grande centrado al 35 por
     ciento de opacidad.
4. **Velo de legibilidad**, solo si hay foto: vertical, de `transparent` a `rgba(0,0,0,0.55)`.
   Existe para que el texto blanco se lea sobre fotos claras.
5. **Velo de "hecho"**, solo en estado `done`: `rgba(0,0,0,0.55)` plano, que apaga la card.

**Por qué el degradado con foto es diagonal y no un velo plano.** Está escrito en el comentario
de las líneas 135-140: con un velo sólido al 45 por ciento, un degradado uniforme y saturado
(verde sobre verde) tintaba **todo** y tapaba la foto. La diagonal resuelve las dos cosas a la
vez: identidad de color arriba, foto visible abajo.

### 7.4 Forma de la card

`SIZE_ASPECT` (`EditorialCard.tsx` 33-37). **La card tiene la forma de la foto**, no una altura
fija:

| Tamaño | Proporción | Uso |
|---|---|---|
| `normal` | 16:9 (1.78) | Card de lista |
| `hero` | 16:9 (1.78) | Próximo evento |
| `pillar` | 4:3 (1.33) | Frente completo, alrededor del 45 por ciento de la pantalla |

Historia útil, del comentario 28-32: antes se usaba altura mínima fija (210/260/340) y las cards
salían más cuadradas que la foto, así que `cover` recortaba tanto que solo se veía el degradado.

Radio: `Radius.card` = **12**. Fondo base de la card: `#000`.

### 7.5 Estados de la card

| Estado | Qué se ve |
|---|---|
| `pending` | La card viva |
| `in_window` | Borde lima 1px + halo lima (`shadowOpacity 0.35`, `shadowRadius 16`, `elevation 8`) + badge "AHORA" |
| `done` | Velo `rgba(0,0,0,0.55)` + insignia "Hecho hoy ✓" + círculo lima con palomita |
| `out_of_hour` | Mensaje contextual |

Micro-elementos, todos con blanco translúcido para no gastar acento: pastilla de electrones
`rgba(168,224,42,0.18)` con texto lima; barra de progreso pista `rgba(255,255,255,0.18)` y
relleno `rgba(255,255,255,0.85)`; acciones rápidas y CTA `rgba(255,255,255,0.15)`; chip del icono
`rgba(0,0,0,0.35)` con borde `rgba(255,255,255,0.22)`.

### 7.6 El banco de imágenes

`assets/images/`, organizado por dominio. Formato **WebP** (se optimizaron desde PNG).

| Carpeta | Cuántas | Qué |
|---|---|---|
| `electrons/` | 8 | baño frío, breathwork, fuerza, grounding, lentes rojos, luz solar, meditación, suplementos |
| `hoy-extra/` | 13 | agua, ayuno, cardio (2), checkin, journal, no alcohol, no procesados, pasos, proteína, screen cutoff, sueño, + `tu-dia/` |
| `yo/` | 14 | composición, cronotipos (4), edad ATP, disciplina, labs, logros, reportes, tendencias, tests |
| `agenda/` | 12 subcarpetas | por tipo de bloque de agenda |
| `intervenciones/` | 11 | frío, calor, luz roja, respiración, grounding, naturaleza, audio, cognitivo, lentes, mente, oral |
| `health-hub/` | 5 | biomarcadores, diagnóstico, Fitzpatrick, mi salud, tests |
| `habits-portal/` | 5 | ayuno, fitness (el/ella), nutrición, sueño |
| `cycle/` | 3 + embarazo | rotación de ciclo |
| `salud-funcional/`, `pillars/`, `mente/cards/` | varias | |

Aparte, `assets/backgrounds/` tiene los cuatro fondos del HOY por franja horaria
(`bg-morning`, `bg-midday-medium`, `bg-night-low`, `bg-sleep`), resueltos por
`getHoyBackgroundRequire(hour)` en `brand.ts` 532-539.

**Tres reglas de selección de imagen:**

1. **Rotación determinística.** Donde hay varias variantes (cardio 2, ciclo 3), la elección usa
   `seededIndex(seedKey, n)` con `seedKey` del estilo `${userId}-${today}`. **La misma semilla
   da la misma imagen**: no parpadea entre renders, pero cambia de día.
   Fuente: `src/utils/image-rotation.ts`.
2. **Sin variantes, degradado.** Un concepto sin foto devuelve `undefined` y la card cae al
   placeholder de degradado con glifo. Nunca se escribe un `require()` de archivo inexistente:
   rompe el bundler.
3. **Consciente del sexo biológico.** Fitness y composición corporal tienen variante `-el` y
   `-ella` y se resuelven por `pickFitnessImage(sex)` en `src/utils/yo-image-picker.ts`, no por
   el mapa general.

Los `require()` son **estáticos** siempre (el bundler no soporta dinámicos) y viven en la capa de
componentes, **nunca en un archivo `-core.ts`**: los tests de node importan los core y no pueden
resolver binarios.

---

## 8. Degradados

**La doctrina.** Una superficie heroica de ATP es un **degradado**, nunca lima plano. El lima
sólido es micro-acento (pastilla, palomita, botón compacto). `brand.ts` 12-16 y 363-368.

### 8.1 El degradado de marca

`ATP_BRAND.moleculeGradient`, cinco paradas, de lima a teal:

`#A8E02A` → `#6DCC48` → `#3DBF6E` → `#2EC28A` → `#1ABC9C`

Es el degradado de la molécula del logo. `brand-tokens.test.ts` verifica que empiece en lima y
termine en teal.

### 8.2 La función que elige

`brandGradient(pilar?)` (`brand.ts` 369-375):
- **Sin pilar** devuelve el `moleculeGradient` completo.
- **Con pilar** devuelve la tupla `[start, end]` de `PILLAR_GRADIENTS[pilar]`.

**Usar esto** en vez de escribir un par de colores a mano.

### 8.3 Degradados de pilar

`PILLAR_GRADIENTS` (`brand.ts` 378-390). Todos tienen la misma forma: **color de categoría
translúcido → casi negro**. Es un tinte de fondo, no un degradado de color a color.

| Pilar | Inicio | Fin |
|---|---|---|
| fitness | `rgba(140,191,36,0.25)` | `rgba(10,10,10,0.95)` |
| nutrition | `rgba(91,155,213,0.25)` | `rgba(10,10,10,0.95)` |
| mind | `rgba(127,119,221,0.25)` | `rgba(10,10,10,0.95)` |
| health | `rgba(29,158,117,0.25)` | `rgba(10,10,10,0.95)` |
| cycle | `rgba(212,83,126,0.25)` | `rgba(10,10,10,0.95)` |
| metrics | `rgba(29,158,117,0.25)` | `rgba(10,10,10,0.95)` |
| sleep | `rgba(91,155,213,0.20)` | `rgba(10,10,10,0.95)` |
| recovery | `rgba(78,170,128,0.20)` | `rgba(10,10,10,0.95)` |
| stress | `rgba(239,159,39,0.20)` | `rgba(10,10,10,0.95)` |
| activity | `rgba(140,191,36,0.20)` | `rgba(10,10,10,0.95)` |
| protocol | `rgba(239,159,39,0.20)` | `rgba(10,10,10,0.95)` |

**Los alfas dicen la jerarquía:** 0.25 para los pilares principales, 0.20 para los secundarios.
No está escrito en ningún comentario, pero el patrón es consistente.

### 8.4 Degradados de sección

Cada entrada de `CONCEPT_COLORS` (`concept-colors.ts` 23-39) trae su propio par
`gradient: [start, end]`. A diferencia de los de pilar, estos son **color a color**:

| Sección | Degradado |
|---|---|
| suplementos | `['#EF9F27', '#C0392B']` |
| fitness | `['#A8E02A', '#27AE60']` |
| nutricion | `['#5B9BD5', '#3B82F6']` |
| agua | `['#3498DB', '#1ABC9C']` |
| ayuno | `['#6B46C1', '#1E3A8A']` |
| sol | `['#FFD700', '#FFA500']` |
| mente | `['#7F77DD', '#6C3483']` |
| sueno | `['#3B82F6', '#1E3A8A']` |
| cardio | `['#E74C3C', '#FFA500']` |

Estos son los que consume `EditorialCard` por la prop `gradient`.

### 8.5 Degradados de las puertas de SALUD

`src/constants/salud-puertas.ts`, campo `gradient: [string, string]`:

| Puerta | Degradado |
|---|---|
| hoy | `['#1D9E75', '#0EA5E9']` |
| datos | `['#22C55E', '#16A34A']` |
| evolucion | `['#A8E02A', '#1D9E75']` |
| expediente | `['#38BDF8', '#3B82F6']` |
| ciclo | `['#D4537E', '#9B59B6']` |

**Nota honesta:** de estos diez colores, cuatro (`#0EA5E9`, `#16A34A`, `#9B59B6`, `#3B82F6`) no
existen en ningún token de marca ni de categoría. Están escritos a mano en el registro. La
puerta `evolucion` y la puerta `ciclo` sí arrancan en su color canónico.

### 8.6 El registro de apps NO tiene degradados

`src/constants/app-registry.ts` **no declara ningún `gradient`**. Declara `key`, `label`, `icon`,
`section`, `route`, `installable` y `description`. **El color de una app sale de su sección**, vía
`APP_SECTION_COLORS`. El encargo mencionaba "los gradient del registro de apps": no existen, y
esa ausencia es correcta, es lo que evita las veinticinco piezas de confeti.

`src/constants/hoy-cards.ts` tampoco: el registro de specs por card
(`HOY_CARD_SPECS`, `HOY_CARD_BY_KEY`) **murió** con su renderer. Lo único vivo ahí es
`HOY_CARD_ORDER_DEFAULT`, el orden de visibilidad. El HOY de hoy pinta por sección.

---

## 9. Iconos

### 9.1 La doctrina

**Phosphor Regular, monocromo. El color va en el encabezado, no en el icono.**

Un icono de ATP es un glifo de una sola tinta. La identidad del dominio la carga el encabezado
de sección, el mosaico de fondo o el borde, no el dibujo. Es la aplicación directa de
`APP_SECTION_COLORS` en capas (capítulo 3.2): icono y encabezado al 100 por ciento del color de
sección, etiqueta en gris.

### 9.2 Los registros declaran nombres lógicos, no dibujos

**La regla que hace barato cambiar de set:** ninguna pantalla importa un icono directo para
representar una función. Todas pasan por `<AppIcon name="meditar" />`.

```
<AppIcon name="meditar" size={24} color={ATP_BRAND.lime} />
```

`src/components/ui/AppIcon.tsx`. El nombre está **tipado** contra la lista real
(`app-icon-names`): `<AppIcon name="meditarr" />` ya no compila. Antes pintaba un signo de
interrogación en silencio.

**La excepción declarada:** los iconos de **chrome** (flechas, cerrar, chevrons, lupa) no son
funciones y se quedan como están. Un `<Ionicons>` suelto dibujando "Meditar" sí es deuda.

El mapa vive aparte en `app-icon-map.tsx`, que es el archivo que se sustituye completo cuando
cambie el set.

### 9.3 El set

**56 archivos SVG** en `assets/icons/`, sellados por el censo. Su geometría se copia 1 a 1 a
`src/components/ui/icons/icon-paths.ts`, un módulo de datos puros que el test importa bajo node
para verificar que no divergió del asset. **El asset es la fuente de verdad; el archivo TS es su
copia montable.**

**El contrato de glifo:** un path, `fill="currentColor"`, el color entra por el nodo raíz.

**Dos excepciones, y el footgun que las causó.** `emociones` y `1rm` son 100 por ciento de trazo
(`stroke`). **Pasarlos por el factory de relleno los dejaría invisibles.** Por eso entran como
componentes a mano (`IconEmociones`, `Icon1Rm`) y el censo verifica que **no** estén en
`ICON_PATHS` ni se monten con `svg('emociones')`.

Los `tab-*` son los iconos de la barra: versión de línea para reposo, `-fill` para activo.

### 9.4 Los cuatro candados del censo

`src/constants/__tests__/icon-censo.test.ts`:

1. Todo icono declarado en los diez registros (`APP_REGISTRY`, `PUERTAS`, `DESTINOS_TODOS`,
   `ELECTRON_WEIGHTS`, `ALL_BOOLEAN_OPTIONS`, `ALL_QUANT_OPTIONS`, `ACTIVITY_META`,
   `CATEGORY_COPY`, `TAB_BAR_ICONS`, `REPORT_DOMAINS`) **resuelve** en el mapa.
2. Los archivos de registro **no contienen dibujos**: ni un `-outline` de Ionicons ni un emoji.
   Un registro es una lista de nombres.
3. **Ningún emoji vuelve a una posición `icon`.** Lista vetada explícita: 🧘 💊 💧 🍳 ⏳ 🚶 ❄️ 🔴
   🌬 🚫 📵 📓 🗂 ☀️ ❤️‍🔥
4. **Ratchet de glifos:** los usos directos de glifos de función quedan congelados en un
   inventario auditado. Un uso nuevo obliga a `<AppIcon>` o a una entrada consciente al
   inventario. Y si el inventario arrastra usos que ya no existen, también truena.

`app-registry.test.ts` agrega la regla inversa: **el mapa no puede arrastrar iconos que ningún
registro usa.** Sin lista blanca.

---

## 10. Tipografía, espaciado y forma

### 10.1 Tipografía

**Una sola familia: Poppins.** `constants/theme.ts` 45-50. Verificado en `app/_layout.tsx`
líneas 86-90: se cargan exactamente cuatro cortes con `useFonts`.

| Token | Corte |
|---|---|
| `Fonts.regular` | `Poppins_400Regular` |
| `Fonts.semiBold` | `Poppins_600SemiBold` |
| `Fonts.bold` | `Poppins_700Bold` |
| `Fonts.extraBold` | `Poppins_800ExtraBold` |

**La herramienta de jerarquía es el PESO, no la familia.** No se agregan familias para
diferenciar niveles.

Escala (`FontSizes`, `constants/theme.ts` 52-64):

`xs 10` · `sm 12` · `md 14` · `lg 16` · `xl 18` · `xxl 24` · `hero 28` · `display 32` ·
`mega 42` · `stat 24` · `timer 56`

**Título de sección**, estilo único (`SECTION_TITLE`, `brand.ts` 192-199): 11px, peso 600,
`letterSpacing 2`, mayúsculas, color `#888`, `marginBottom 12`.

Escala de `letterSpacing` (`brand.ts` 235-240): `tight 0.5` para párrafo · `normal 1` para
etiquetas · `wide 2` para títulos de sección y encabezados · `xwide 3` **solo** para la palabra
"ATP" en el logotipo.

### 10.2 Espaciado

`Spacing` (`constants/theme.ts` 68-75): `xs 4` · `sm 8` · `md 16` · `lg 24` · `xl 32` · `xxl 48`

`SECTION_SPACING` (`brand.ts` 228-232): `sm 16` entre cards del mismo grupo · `md 24` entre
secciones · `lg 32` entre grupos grandes.

### 10.3 Elevación: la profundidad es una escala, no un color suelto

`ELEVATION` (`brand.ts` 256-263). **Código nuevo elige un nivel; no escribe fondo y borde
sueltos.**

Los cuatro niveles ya no escriben su color: lo toman de `OSCURO`, la rampa única del cap. 4.1.
Valores vigentes con `ACERO_OSCURO` encendido, y entre paréntesis los de antes del 22-ago-2026.

| Nivel | Fondo | Borde | Para qué |
|---|---|---|---|
| 0 | `#0F1114` (`#000000`) | `transparent` | Fondo de pantalla |
| 1 | `#1A1D22` (`#121212`) | `#252931` (`#1F1F1F`) | **Card estándar, el default** |
| 2 | `#292E36` (`#232323`) | `#383F4A` (`#333333`) | Card sobre card, hoja modal |
| 3 | `#343A45` (`#2F2F2F`) | `#404854` (`#3D3D3D`) | Popover, menú flotante |

**Los niveles se abrieron a propósito.** El comentario del archivo explica que antes estaban
a 1.08 y 1.12 de luminancia entre sí, o sea imperceptibles, y un modal sobre una card no se
distinguía de la card. El paso a acero conserva esos saltos ya abiertos: 1→2 pasa de 1.192 a
1.238 y 2→3 de 1.174 a 1.194.

Los inputs van a `OSCURO.campo`, hoy `#0A0C0F` (antes `#0a0a0a`): **recedidos**, se leen como
pozo frente a la card elevada. Con el lienzo en acero el pozo es de verdad, no una convención:
el campo queda por debajo del fondo de pantalla y no por encima como antes.

**La tab bar y las píldoras de filtro NO son inputs**, aunque compartieran su color hasta el
22-ago-2026. Van a `OSCURO.chrome`, hoy `#16191D`. Viven sobre el lienzo, así que tienen que
estar por encima de él (ver el desacople en el cap. 4.1).

### 10.4 Halo

`GLOW.accent` y `withGlow(color)` (`brand.ts` 270-289). Perfil idéntico en los dos:
`shadowOpacity 0.35`, `shadowRadius 24`, offset 0, `elevation 12`.

**Máximo un uso por pantalla.** Es lo que hace que el protagonista brille; dos halos y ninguno
brilla.

**Footgun documentado:** en anillos SVG (`AnimatedScoreRing`) el halo **no** se hace con `shadow`
de React Native, porque no rinde como halo en Android. Se dibuja con arcos translúcidos
concéntricos, dos arcos más anchos a baja opacidad.

### 10.5 Radios

| Token | Valor | Dónde |
|---|---|---|
| `Radius.xs` / `sm` | 4 / 8 | |
| `Radius.card` | **12** | Radio de card según `constants/theme.ts` |
| `Radius.md` / `lg` | 16 / 24 | |
| `Radius.pill` | 50 | |
| `CARD_STYLE.borderRadius` | **12** | `brand.ts` 122 |
| `CARD.borderRadius` | **16** | `brand.ts` 223 |
| `PILL.borderRadius` | 17 | altura 34, o sea cápsula exacta |

**Hay dos radios de card conviviendo (12 y 16). Ver capítulo 14.**

Pastilla estándar (`PILL`): alto 34, `paddingHorizontal 16`, borde 0.5, fondo `OSCURO.chrome`
(hoy `#16191D`, antes `#0a0a0a`), borde `OSCURO.bordePildora` (hoy `#242830`, antes `#1a1a1a`),
texto `#666`; activa fondo y borde `#a8e02a` con texto `#000`; 11px, peso 600,
`letterSpacing 1`.

---

## 11. El logo

Fuente: `src/components/ui/brand/LogoVerticalATP.tsx` y
`src/components/ui/brand/logo-atp-geometria.ts`.

### 11.1 Cómo está montado, y por qué así

El bundler no tiene transformer de SVG, así que el logo no se puede importar como componente. Se
usa **el mismo canal que el set de iconos**: el asset es la fuente de verdad, su geometría se
copia a un módulo de datos puros, y un componente de `react-native-svg` la monta.

**El logo NO entra a `assets/icons/`.** Ese set está sellado en 56 archivos y es de glifos
monocromos de función. La marca es otra cosa: multicolor, con degradados, y con una pieza que sí
se tematiza.

### 11.2 Las versiones clara y oscura son el mismo dibujo

Medido y verificado por test: `Logo-vertical_ATP_1024x1024_N.svg` y su versión `_B` difieren en
**una sola regla CSS**, `.cls-1`:

| Versión | Regla | Qué pinta |
|---|---|---|
| `_N` (sobre fondo claro) | `.cls-1{fill:#1d1d1b;}` | La **A** y la **P** del logotipo |
| `_B` (sobre fondo oscuro) | `.cls-1{fill:#fff;}` | Lo mismo |

Todo lo demás es idéntico. Por eso el componente tiene **una** geometría y el color del logotipo
entra por parámetro: no hay dos copias que se puedan desincronizar.

`logo-atp.test.ts` lo verifica sustituyendo esa regla en los dos archivos y comparando el resto
carácter por carácter.

### 11.3 Lo que NO se tematiza

**La molécula y la T del logotipo llevan los degradados de marca y son idénticas en los dos
temas.** Cuatro degradados, 24 paths en el asset. El logotipo montado usa solo 3 (la A, la T y
la P).

Escrito en el docblock del componente: *"Calibrar el lima como LETRA es la regla del manual; el
lima como RELLENO de la marca no se toca."* Es la misma distinción del capítulo 6 aplicada a la
identidad.

### 11.4 La geometría

| Dato | Valor |
|---|---|
| viewBox del asset | `0 0 912.5 885.71` |
| viewBox montado | `116 0 665 785` |
| `LOGO_ATP_RATIO` | 785 / 665 |
| Color logotipo claro | `#1d1d1b` |
| Color logotipo oscuro | `#ffffff` |

**El ancho sale del ratio: el logo no se deforma nunca.** La prop es solo `height`.

La prop `tema` es **el tema del fondo sobre el que se pinta**, no el del sistema: quien monta el
logo ya sabe sobre qué está.

### 11.5 La firma no se monta, a propósito

El asset trae vectorizado **"ACTIVA TU ENERGÍA Y SALUD"** en 21 paths (y = 847 a 885). Está
declarada **firma de otra época**: el producto hoy dice *"tu sistema operativo de rendimiento"*.

**La instrucción vigente es usar el logo sin firma.** El `viewBox` montado (`116 0 665 785`)
recorta exactamente a la caja del contenido que sí va, logotipo más molécula. Los 100 de sobra
abajo eran la firma.

**La bajada vive como TEXTO en la pantalla**, no como vector, para poder corregirla con un commit
y no con un rediseño. Verificado por `logo-atp.test.ts`, que exige que el viewBox montado recorte
la firma.

### 11.6 Por qué existe este componente

Escrito en el docblock: el único logo horizontal del repo (`logo-horizontal-dark.png`) trae el
logotipo en blanco. Sobre fondo claro daba alrededor de **1.1 de contraste**: la marca
desaparecía en la primera pantalla que ve quien acaba de pagar.

---

## 12. Movimiento

**Advertencia de honestidad: no hay archivo de tokens de movimiento.** Se buscó `MOTION`, `ANIM`
y equivalentes en `src/constants/` y no existe ninguno. Todas las duraciones y curvas están
escritas a mano en cada componente. Lo que sigue es **el inventario de lo que se usa de verdad**,
no una regla declarada.

### 12.1 Lo táctil: el único primitivo con contrato

`src/components/ui/AnimatedPressable.tsx`. **Es el estándar y sí tiene valores fijos.**

| Momento | Resorte |
|---|---|
| Al presionar | escala a **0.97**, `damping 15`, `stiffness 400` |
| Al soltar | vuelve a 1, `damping 12`, `stiffness 300` |

Deshabilitado: `opacity 0.4`.

**Prohibido el `opacity: 0.7` plano como feedback táctil.** El kit antiguo (`EliteButton`,
`EliteCard`) ya se migró a este resorte.

El háptico se llama aparte, con `haptic.light()` desde el `onPress`. El primitivo no lo dispara.

### 12.2 Entradas escalonadas

`src/components/ui/StaggerItem.tsx` es el único wrapper con valores por defecto:

```
FadeInUp.delay(index * 50).duration(300).springify()
```

O sea **50ms de retraso por elemento y 300ms de duración**.

**En la práctica el escalón varía por pantalla** y va de 30 a 60ms, siempre escrito a mano:
30 (lista de compras), 40 (segunda lista), 50 (fuerza, reportes, recetas), 60 (Braverman,
rutinas, navegación emocional). `DESIGN_SYSTEM.md` recomienda 40. **Ninguno de los ocho usos
encontrados usa 40.**

### 12.3 Duraciones que se usan de verdad

Inventario completo de `duration:` en componentes de `src/` (22 apariciones):

| Duración | Dónde | Qué es |
|---|---|---|
| **150** | `ElectronBadge` | Micro-feedback |
| **180** | `StickyPillarBanner`, y la `transition` de la imagen editorial | Transición de superficie |
| **200** | `ExpandableSheet` | Expandir y colapsar |
| **220** | `ExerciseClip` | |
| **300** | `SplashLoader`, `SupplementScanSheet`, `PhotoSensor`, `StaggerItem` | **La más repetida: entrada y salida estándar** |
| **320** | `TypingIndicator` | |
| 500 | `VoiceButton` | Pulso |
| 800 | `SkeletonLoader` | Brillo de carga |
| 900 | `ArgosOrb` | Respiración de la orbe |
| 1100 / 1200 / 1500 / 2200 | Sábanas de procesamiento, `AnimatedScoreRing` | Animaciones largas de proceso |

**El patrón que emerge, aunque nadie lo declaró:** por debajo de 350ms es interfaz (responde al
usuario); por encima de 800ms es proceso (le dice al usuario que espere). No hay nada en medio, y
eso es sano.

### 12.4 Expandir y colapsar

`LayoutAnimation.configureNext(...easeInEaseOut)` al expandir o colapsar bloques.

---

## 13. Los tests son el manual ejecutable

Ocho archivos de test codifican reglas de marca. **Si una regla de este documento se contradice
con uno de estos tests, gana el test**, porque es lo que corre.

| Archivo | Qué protege |
|---|---|
| `src/constants/__tests__/brand-tokens.test.ts` | Tres colores, un solo amarillo, el degradado de marca empieza en lima y termina en teal |
| `src/constants/__tests__/concept-colors.test.ts` | Un concepto, un color: si alguien vuelve a escribir un hex distinto para un concepto canónico, truena |
| `src/constants/__tests__/theme-tokens.test.ts` | Paridad de llaves entre temas, 18 pares de contraste calculados, las 10 secciones exactas, la card editorial |
| `src/constants/__tests__/modo-claro-reglas.test.ts` | Las tres reglas del tema claro (lima no es texto, teal calibrado, texto sobre sección) |
| `src/constants/__tests__/mb31b1-ambito.test.ts` | Ratchet de hex neutro en el marco y el día, 6 pares nuevos, las 3 cards editoriales del ámbito |
| `src/constants/__tests__/mb31b-remate.test.ts` | Ratchet en el resto, 5 pares, **y la regla de tránsito** (ruta con `themed` lee `useAppTheme`) |
| `src/constants/__tests__/icon-censo.test.ts` | Los 4 candados de iconos + el set de 56 SVG sin divergencia |
| `src/components/ui/brand/__tests__/logo-atp.test.ts` | El logo montado no diverge del asset, la firma queda recortada |

Más: `src/services/theme/__tests__/theme-mode-core.test.ts` (los cuatro modos) y
`night-veil-core.test.ts` (el velo no rompe AA en ningún minuto de su curva).

Utilidad de contraste: `src/utils/contrast.ts` (`contrastRatio`, `compositeOver`, `hexToRgb`,
`relativeLuminance`).

**Lo importante del diseño de estos tests:** calculan el contraste con la fórmula WCAG real, no
comparan cadenas. Recalibrar un token que baje de su piso truena, aunque el color nuevo se vea
mejor.

---

## 14. Dónde el sistema se contradice a sí mismo

Todo lo de aquí está verificado en código. **Son contradicciones reales, no estilo.**

### 14.1 Hay dos limas de fitness

- `CONCEPT_COLORS.fitness.color = '#A8E02A'` (`concept-colors.ts` 28)
- `CATEGORY_COLORS.fitness = '#8CBF24'` (`brand.ts` 64)

La cabecera de `concept-colors.ts` **afirma estar alineada** a los colores de categoría de
`brand.ts`. En fitness no lo está. Los dos lados tienen su razón escrita: el de sección quiere el
lima de marca, el de categoría quiere el lima desaturado para no gastar acento. El resultado es
que la sección fitness pinta `#A8E02A` y el degradado de pilar fitness pinta `#8CBF24`.

**Está sin decidir cuál gana.**

### 14.2 El electrón de cardio no lee de la fuente única

- `CONCEPT_COLORS.cardio.color = '#E74C3C'`
- `ELECTRON_WEIGHTS.cardio.color = '#fb7185'` (`electrons.ts` 34)

El comentario de `concept-colors.ts` lista `electrons.ts` como consumidor. Cardio no lo es. Lo
mismo con `sueno`: mismo valor pero escrito a mano en vez de importado, y el candado de
`concept-colors.test.ts` solo cubre cinco electrones, así que no lo detecta.

### 14.3 Los dos rojos críticos estaban invertidos en labs · RESUELTO

**Era cierta, y era más ancha de lo que decía este capítulo.** Se corrigió completa.

Lo que estaba pasando: `brand.ts` dice que el dato crítico de salud grita más que el error de
formulario y le asigna `#FF3B30`, pero `src/utils/lab-rating.ts` pintaba el nivel `critical` con
`SEMANTIC.error = #E8877F`, el coral apagado reservado a errores de interfaz. Y el `bgColor` de
esa misma fila era `rgba(226,75,74,…)`, o sea `#E24B4A`, **un tercer rojo**: fondo y texto del
estado crítico venían de rojos distintos.

Al ir a arreglarlo aparecieron **cuatro tablas** con el mismo error, no una:

| Tabla | Qué pintaba mal |
|---|---|
| `src/utils/lab-rating.ts` | `critical` y `out_of_range` con el coral + fondo del tercer rojo |
| `src/components/edad-atp/tokens.ts` | `EDAD_STATUS.bad = '#E24B4A'` a mano |
| `src/data/condition-catalog.ts` | la bandera clínica `present`, coral + tercer rojo de fondo |
| `src/data/functional-health-engine.ts` | `RATING_COLORS`, tabla gemela hoy sin consumidores |

La de mayor alcance no era la de labs sino `EDAD_STATUS.bad`: es la que ve el usuario final en
ATP Labs, `ParameterChart` y las sub-edades. `good` ya se había anclado al token semántico en
MB-11 D.3 y `bad` se quedó atrás.

Por qué no lo detectaba nada: **el ratchet de MB-31B solo escanea `.tsx`, y las cuatro tablas
viven en `.ts`.** Ahora lo cuida `src/constants/__tests__/rojo-clinico.test.ts`, que afirma que
los dos rojos siguen existiendo y distintos, que el peor estado clínico de las cuatro tablas usa
el rojo de salud y nunca el coral, que los fondos derivan por canales rgb del mismo color que el
texto, y que el resto del semáforo sigue anclado a `SEMANTIC`.

**Lo que sigue pendiente** son los usos EN LÍNEA de `t.error` sobre estado clínico dentro de
pantallas (presión arterial en `app/health-input.tsx`, el reporte de labs en
`src/components/reports/domains/labs.tsx`, y un nido grande en
`src/screens/coach/ClientDetailScreen.tsx`). No son tablas: son decisiones sueltas archivo por
archivo, y en modo claro `#FF3B30` sobre card da ~3.1:1, así que migrarlos toca contraste y es
trabajo aparte.

### 14.4 Hay cuatro escalas rivales de "score de salud"

| Fuente | Tramos | Colores |
|---|---|---|
| `getScoreColor` (`brand.ts` 319) | 5 | `#4ade80 / #a8e02a / #EFD54F / #f97316 / #FF3B30` |
| `scoreColor` (`src/services/daily-health-score.ts` 66) | 3 | `#A8E02A / #EF9F27 / #E24B4A` |
| `SCORE_LEVELS` (`src/utils/nutrition-scoring.ts` 24) | 6 | `#639922 / #a8e02a / #97C459 / #EF9F27 / #D85A30 / #E24B4A` |
| `ExplanationModal.tsx` 34 | 3 | en línea, lima / `#EF9F27` / `#E24B4A` |

Y las etiquetas tampoco coinciden: `ÓPTIMO/CARGADO/ESTABLE/BAJO/CRÍTICO` contra
`Óptimo/Excelente/Bueno/Regular/Bajo`. **El mismo número puede salir de dos colores y dos palabras
distintas según la pantalla.**

### 14.5 Braverman y UV usan una paleta ajena

`DEFICIENCY_COLORS` y `getUVLevel` usan `#22c55e`, `#fbbf24`, `#f97316`, `#ef4444`, `#dc2626`.
**Ninguno existe en `SEMANTIC` ni en `SCORE_COLORS`.** Son de la familia por defecto de Tailwind,
no de ATP. Comparten valores entre sí pero no con la marca.

### 14.6 Dos radios de card

`CARD_STYLE.borderRadius = 12` y `Radius.card = 12`, contra `CARD.borderRadius = 16`. Los dos
están vivos. `EditorialCard` usa 12.

### 14.7 El cronotipo delfín se pinta de dos colores en el mismo archivo

`ANIMAL_COLORS.dolphin = '#5B9BD5'`, pero la caja explicativa del delfín en el mismo componente
usa `#EF9F27` (`ChronotypeReveal.tsx` 162-165). Además `#5B9BD5` es exactamente el azul de
nutrición y `#7F77DD` (lobo) es exactamente el morado de mente: colisión de significado entre
dominios.

### 14.8 Valores desactualizados en `docs/DESIGN_SYSTEM.md`

El documento sigue siendo la guía de criterio, pero estos números ya no son ciertos:

| Dice DESIGN_SYSTEM.md | Dice el código |
|---|---|
| `ELEVATION[2] = #1A1A1A` / borde `#2A2A2A` | `#292E36` / `#383F4A` (acero, 22-ago-2026) |
| `ELEVATION[3] = #222222` / borde `#323232` | `#343A45` / `#404854` (acero, 22-ago-2026) |
| `SEMANTIC.error = #FB7185` | `#E8877F` |
| `SCORE_COLORS.critical = #EF4444` | `#FF3B30` |
| `fitness #A8E02A` como color de categoría | `CATEGORY_COLORS.fitness = #8CBF24` |
| "Modo claro: **No existe**" | Existe, con cuatro modos y tests de contraste |
| "Kit viejo aún usado en ~11 pantallas" | No se recontó |
| Escalón de lista recomendado: 40ms | Ninguno de los 8 usos encontrados usa 40 |

### 14.9 El velo de `AgendaMiniCard` usa hex neutros escritos a mano

`['#151515', '#0E0E0E']`. Son neutros, o sea justo lo que el ratchet prohíbe. No truena porque
ese archivo no está en la lista escaneada (que solo enumera `app/`). **Es una regla que se
cumple por dónde vive el archivo, no por lo que hace.**

---

## 15. Costumbre sin regla, y lo que no se verificó

Esta es la diferencia entre un manual y un inventario: decir dónde no hay regla.

### Costumbre sin regla

1. **Blanco y negro en las fotos editoriales.** Está declarado en cuatro docblocks pero
   **ningún código lo fuerza y ningún test lo verifica**. Es disciplina en la producción del
   asset. Una foto a color entraría sin resistencia.
2. **Los colores de cronotipo.** Constante local a un componente, sin export, sin fuente única,
   sin test. Es el único dominio de señal que no vive en un registro.
3. **Los cuatro colores de fase del ciclo.** Viven en un servicio, no en `concept-colors`. No hay
   candado que los proteja.
4. **Los alfas de `PILLAR_GRADIENTS`** (0.25 principales, 0.20 secundarios). El patrón es
   perfecto y no está escrito en ningún comentario.
5. **Las duraciones de movimiento.** No hay tokens. El corte natural en 350ms entre interfaz y
   proceso es un patrón emergente, no una decisión.
6. **Los cuatro colores sueltos de las puertas de SALUD** (`#0EA5E9`, `#16A34A`, `#9B59B6`,
   `#3B82F6`) no salen de ningún token.
7. **El tratamiento de "próximamente".** `DESIGN_SYSTEM.md` dice opacidad alrededor de 0.7 más
   insignia explícita "PRONTO", nunca opacidad baja apilada con texto tenue. **No se verificó**
   que las pantallas lo cumplan.

### Lo que NO se verificó para este documento

- **`ATP_Manual_de_Marca.pdf`**: no está en el repositorio. Todas las referencias a "el manual"
  en los comentarios del código se citaron como cita, sin confirmar contra el PDF.
- **Si las fotos `.webp` son efectivamente monocromas.** No se abrió ninguna.
- **El lima de los archivos SVG del logo.** `DESIGN_SYSTEM.md` afirma que los seis SVG usan
  `#A7C834` mientras la app usa `#A8E02A`. **No se abrieron los SVG para confirmarlo.** El test
  del logo solo verifica el color del logotipo (`#1d1d1b` / `#ffffff`), no el de la molécula.
- **Los 12 worktrees** en `.worktrees/`. Cada uno tiene su propia copia de `concept-colors.ts` y
  demás. Solo se auditó el árbol principal.
- **El conteo actual de colores escritos a mano.** `DESIGN_SYSTEM.md` reportaba 1,782 en julio
  2026. No se recontó.
- **Área de respeto del logo, tamaño mínimo y usos prohibidos.** No existen en el código. Si están
  en algún lado, están en el PDF.

### Lo que le falta a este manual para estar completo

1. **Resolver las contradicciones del capítulo 14**, sobre todo el rojo crítico de labs y las
   cuatro escalas de score. Un manual no puede documentar dos verdades.
2. **Tokens de movimiento.** Un `motion.ts` con las cuatro duraciones vivas y los dos resortes
   convertiría el capítulo 12 de inventario en regla.
3. **Fuente única para cronotipos y fases del ciclo**, con su candado.
4. **Un candado para el blanco y negro editorial**, aunque sea un script que mida saturación
   media de los assets.
5. **Área de respeto, tamaño mínimo y usos prohibidos del logo**, que hoy no existen en código.
6. **Voz verbal y copy**: este manual cubre lo visual. El tono, las palabras verdes y rojas y el
   lenguaje de cumplimiento viven en otros documentos y no se integraron aquí.
7. **Actualizar `docs/DESIGN_SYSTEM.md`** con los valores del capítulo 14.8, o marcarlo como
   documento de criterio y mover todos sus valores numéricos a este manual.
