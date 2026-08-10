# 🎯 Manual de marca ATP

**Versión:** 1.0 · 9-ago-2026
**Estado:** propuesta para veto de Enrique. La paleta clara del capítulo 3 desbloquea MB-31.
**Fuente:** extraído de lo que la app ya decidió (`src/constants/brand.ts`,
`concept-colors.ts`, `constants/theme.ts`, `docs/DESIGN_SYSTEM.md`) más el manual de
identidad visual previo. **Se documenta lo decidido; solo se inventa donde no había nada.**

**Para qué sirve:** hoy existen dos sistemas visuales sin fuente común — el de la app y el
v4 de las landings — y la tienda, el material de venta y las redes no jalan de ninguno.
Este documento es esa fuente.

---

# 1 · LA MARCA

## Qué es ATP

**El sistema operativo del rendimiento humano.** Integra fitness, nutrición, mente, salud
funcional, ciclo y gamificación bajo un modelo de medicina funcional, con IA personalizada.

## La promesa, en una frase

> **No cura. Te optimiza.**

Esa frase gobierna todo el copy de la marca. ATP no diagnostica, no trata, no cura y no
previene enfermedades. **Mide, acompaña y ordena.**

## Los lemas

> *"Si olvidaras tu edad, ¿cuántos años tendrías?"*
> *"Tu sistema operativo de rendimiento."*

## A quién le hablamos

Profesional de alto rendimiento, 35 a 55 años. Alguien que ya logró cosas, que sabe que su
cuerpo es la infraestructura de todo lo demás, y que está cansado de consejos genéricos.
**No le hablamos a un enfermo ni a un principiante: le hablamos a alguien que quiere más.**

## El tono de la marca

**Directo, cercano y técnico sin ser frío.** Analogías de ingeniería y de sistemas. Explica
el porqué antes del qué. Trata al lector como adulto capaz.

⚠️ **Lo que ATP nunca suena:** motivacional vacío, alarmista, moralista con la comida, ni
condescendiente.

---

# 2 · EL LOGO

⚠️ **El logotipo y sus tipografías están definidos y no se rediseñan aquí.** Este capítulo
documenta sus reglas de uso.

## La molécula

El símbolo de ATP es una molécula con un degradado que va de lima a teal. **Ese degradado es
la firma visual de la marca** y aparece en la orbe de ARGOS, en superficies heroicas y en el
símbolo.

```
Degradado de la molécula
#A8E02A → #6DCC48 → #3DBF6E → #2EC28A → #1ABC9C
```

## Reglas de uso

- **Área de respiro:** al menos la altura de la molécula alrededor del logo por los cuatro
  lados. El logo nunca va apretado.
- **Fondo:** preferentemente negro o degradado oscuro. Sobre claro se usa la versión de
  contraste.
- **Nunca:** deformarlo, rotarlo, cambiarle los colores del degradado, ponerle sombra
  paralela, contornearlo, ni colocarlo sobre una foto sin capa de contraste.

---

# 3 · COLOR

**Es el capítulo más importante del manual**, y el que desbloquea el modo claro de la app.

## 3.1 · La doctrina de los tres colores

🚨 **ATP tiene tres colores de marca y no habrá un cuarto.**

| Rol | Color | Uso |
|---|---|---|
| **Acento primario** | **Lima** `#A8E02A` | CTA principal, el dato heroico |
| **Acento secundario** | **Teal** `#1ABC9C` | acentos de interfaz, autenticación |
| **Acento terciario** | **Ámbar** `#EFD54F` | solo apoyo, **jamás protagonista** |

## 3.2 · Las dos reglas que se rompen más seguido

🚨 **Máximo uno o dos elementos lima por pantalla.** Si hay más de tres, sobra acento y el
lima deja de significar algo. El acento funciona por escasez.

🚨 **El lima plano NUNCA es fondo de superficie grande.** Las superficies heroicas van con
degradado; el color sólido es para botones compactos y micro-acentos.

⚠️ **ATP no es ELITE.** El lima como color dominante era de la marca anterior. ATP es
editorial, oscuro, con degradados y mucho respiro.

## 3.3 · Los colores de concepto

Cada dominio tiene su color, y **son los mismos en modo claro y oscuro**: son identidad, no
tema.

| Concepto | Color | | Concepto | Color |
|---|---|---|---|---|
| Fitness | `#A8E02A` | | Mente | `#7F77DD` |
| Nutrición | `#5B9BD5` | | Sueño | `#818CF8` |
| Agua | `#60A5FA` | | Cardio | `#E74C3C` |
| Ayuno | `#6B46C1` | | Suplementos | `#EF9F27` |
| Sol | `#FBBF24` | | Ciclo | `#D4537E` |

## 3.4 · Los colores con significado

| Estado | Color | Nota |
|---|---|---|
| Éxito, óptimo | `#A8E02A` | |
| Aceptable, en rango | `#EFD54F` | el único amarillo de marca |
| Advertencia | `#EF9F27` | |
| Error de interfaz | `#E8877F` | coral apagado |
| Información | `#5B9BD5` | |
| Sin datos | `#444444` | |

⚠️ **Los dos rojos están separados a propósito.** El error de un formulario usa coral
apagado para que **nunca grite más fuerte que un biomarcador crítico**. Un campo mal llenado
y un valor de salud fuera de rango no pueden verse igual de graves.

## 3.5 · Modo oscuro (el canónico)

Es lo que ATP es hoy y su default.

| Rol | Valor |
|---|---|
| Fondo base | `#0A0A0A` |
| Superficie de card | `#121212` |
| Superficie elevada | `#232323` |
| Borde | `#1F1F1F` |
| Texto principal | `#FFFFFF` |
| Texto secundario | `#888888` |
| Texto tenue | `#555555` |
| Texto sobre lima | `#000000` |

## 3.6 · Modo claro · ACERO — aprobado por Enrique el 9-ago-2026

**El principio:** el modo claro no es el oscuro invertido. Conserva el carácter editorial —
respiro, jerarquía marcada, acento escaso — y **no usa blanco puro en ninguna superficie.**

**Por qué acero y no crema:** el lima y el teal son verdes fríos; un gris frío los acompaña
en vez de pelearse con ellos. Y dice *"instrumento de precisión"*, que es literalmente el
posicionamiento de ATP como sistema operativo.

**Por qué sin blanco:** el modo oscuro nunca toca el negro puro — apila `#0A0A0A`, `#121212`
y `#232323`. **El claro espeja esa estructura**: tres niveles cercanos, ningún extremo. Con
eso, cambiar de modo se siente la misma app.

### Las superficies

| Rol | Valor | Uso |
|---|---|---|
| **Fondo base** | `#DBE2E7` | el lienzo de la pantalla |
| **Card** | `#E9EEF1` | más claro que el fondo, igual que en oscuro |
| **Hundido** | `#D3DBE1` | dato dentro de una card, campo de captura |
| **Flotante** | `#F2F5F7` | hoja modal, menú emergente |
| **Borde sutil** | `#CBD5DC` | separadores, contorno de card |
| **Borde marcado** | `#B4C1CA` | campo con foco, selección |

⚠️ **En oscuro, elevarse es aclararse. En claro, elevarse es aclararse y hundirse es
oscurecerse.** No es simétrico y no hay que forzarlo a serlo.

### El texto, con contraste verificado

| Rol | Valor | Sobre card | Nivel |
|---|---|---|---|
| **Principal** | `#0F1518` | 15.75 | AAA |
| **Secundario** | `#4A555C` | 6.54 | AA |
| **Tenue** | `#7A868E` | 3.19 | solo texto grande |
| **Sobre lima** | `#000000` | 13.36 | AAA |

⚠️ **El tenue no se usa para texto de cuerpo.** Solo para etiquetas grandes o
deshabilitadas. Con 3.19 no llega a AA en tamaño normal.

### 🚨 Las tres reglas que el modo claro obliga a inventar

**1 · El lima JAMÁS es texto en modo claro.** Contra card clara da **1.34**, que es
prácticamente invisible. **Es relleno de botón con texto negro encima** (13.36, perfecto),
barra de acento o indicador. Nunca letra.

**2 · El teal de marca tampoco sirve como texto en claro.** `#1ABC9C` da **2.06**. Para
enlaces y texto de acento en modo claro existe una variante:

```
Teal claro ATP   #086A5E
5.56 sobre card · 4.96 sobre fondo · AA en los dos
```

⚠️ **No es un cuarto color de marca:** es el mismo teal calibrado para otro fondo, igual que
una tinta se ajusta según el papel.

**3 · Siete de los diez colores de sección fallan como texto sobre claro.** Solo ayuno
(`#6B46C1`, 5.49) pasa. **En modo claro los colores de sección son relleno, icono grande,
barra o punto — no letra.**

Y cuando son relleno, el texto encima ya está decidido:

| Sección | Relleno | Texto encima |
|---|---|---|
| Ayuno `#6B46C1` | | **blanco** (6.42) |
| **Todas las demás** | | **negro** |

Fitness, nutrición, mente, sueño, agua, sol, cardio, ciclo y suplementos llevan negro
encima, con contrastes de 5.3 a 13.4. **Una sola excepción es fácil de recordar.**

## 3.7 · Modo nocturno

No es un tema aparte: es **una capa cálida sobre el modo oscuro**, que progresa conforme
avanza la noche desde tu hora de corte.

```
Del ámbar tenue → naranja → rojo, oscureciéndose
```

⚠️ Debe poder apagarse. Alguien que trabaja de noche no tiene por qué ver la app en rojo.

⚠️ **La misma curva sirve para tres cosas:** el filtro de la app, la pantalla del Sleep
Cycle en el buró, y el filtro de sistema de Android. **Una sola curva, tres usos.**

🚨 **El filtro NO es un tema: es una capa encima de cualquier tema.** Son dos ajustes
independientes y el usuario los controla por separado. Si alguien está en claro a las once
de la noche, **el filtro entibia el claro**; no lo fuerza a oscuro.

**Cómo se ve la curva sobre cada tema:**

| Tema debajo | Al entrar la hora de corte | Al final de la noche |
|---|---|---|
| Oscuro | negro con velo ámbar tenue | negro con velo rojo, atenuado |
| Claro | acero con velo ámbar cálido | acero apagado con velo rojo |

⚠️ **El filtro nunca puede tumbar el contraste por debajo de AA.** Si al aplicar la capa el
texto deja de leerse, la capa se limita. **Legibilidad antes que estética.**

---

## 3.7b · Los cuatro modos del tema

| Opción | Qué hace |
|---|---|
| **Claro** | siempre acero, sin importar la hora |
| **Oscuro** | siempre oscuro. **Es el default de quien no elige.** |
| **Adaptativo** | ATP decide con **TU horario**: claro al despertar, oscuro al acercarse tu hora de dormir |
| **Como el teléfono** | sigue el ajuste de día y noche del sistema operativo |

⚠️ **Adaptativo y "como el teléfono" NO son lo mismo**, y esa es la razón de que existan las
dos. El sistema cambia con el atardecer genérico de tu zona; **adaptativo cambia con tu
cronotipo y tu hora de corte real.** Para un lobo que se acuesta a las dos de la mañana,
el ajuste del teléfono lo manda a oscuro cuatro horas antes de tiempo.

⚠️ **El filtro nocturno se configura aparte** y funciona con las cuatro.

---

## 3.8 · Cómo sobrevive lo editorial en modo claro

Es la pregunta difícil, porque **la card editorial de ATP nació oscura**: foto con degradado
negro desde abajo y texto blanco encima.

**Lo que se conserva:** foto, degradado y texto claro **dentro de la card.** La card
editorial es una ventana a otra cosa, y esa ventana no cambia de tema.

**Lo que cambia:** el marco alrededor — fondo, separadores, encabezados de sección — se va
al acero.

⚠️ **El degradado se mantiene oscuro en los dos modos.** Un degradado claro sobre foto no
da contraste suficiente para el texto, y perderíamos la firma visual de ATP. **La card
editorial es la constante entre modos, no la variable.**

⚠️ **El borde de la card sí cambia:** en claro necesita `#CBD5DC` para despegarse del
fondo; en oscuro casi no necesita borde.

---

## 3.9 · Los semánticos en modo claro

| Estado | Oscuro | Claro | Nota |
|---|---|---|---|
| Éxito | `#A8E02A` | **relleno con negro encima** | nunca texto lima |
| Aceptable | `#EFD54F` | **relleno con negro encima** | |
| Advertencia | `#EF9F27` | **relleno con negro encima** | |
| Error | `#E8877F` | `#B03A2E` | el coral no se lee en claro |
| Información | `#5B9BD5` | **relleno con negro** o texto `#2E6DA4` | |
| Sin datos | `#444444` | `#A9B4BC` | |

⚠️ **El error mantiene su doctrina:** aunque en claro sea más oscuro, **sigue sin gritar más
que un biomarcador crítico.** Un campo mal llenado y un valor de salud fuera de rango no
pueden verse igual de graves en ningún modo.

---

# 4 · TIPOGRAFÍA

**Poppins** en cuatro pesos: Regular, SemiBold, Bold y ExtraBold.

## La escala

| Nombre | Tamaño | Uso |
|---|---|---|
| xs | 10 | leyendas mínimas |
| sm | 12 | leyendas |
| md | 14 | cuerpo |
| lg | 16 | subtítulos |
| xl | 18 | títulos pequeños |
| xxl | 24 | cifras y encabezados |
| hero | 28 | títulos protagonistas |
| display | 32 | títulos grandes |
| mega | 42 | cifras heroicas |
| timer | 56 | cronómetro |

## Reglas

- **Un protagonista por pantalla.** Si dos textos compiten por ser el más grande, ninguno
  gana.
- **Las cifras heroicas van en ExtraBold**; el cuerpo siempre en Regular.
- **Los encabezados de sección van en mayúsculas con espaciado amplio**, en tamaño pequeño.
  Es la firma editorial de ATP.
- ⚠️ **Nunca centrar párrafos largos.** Títulos sí; texto corrido no.

---

# 5 · ICONOGRAFÍA

**Phosphor Regular**, monocromo. Sin excepciones.

| Especificación | Valor |
|---|---|
| Caja | 256 |
| Grosor de trazo | 16 |
| Remates | redondeados |
| Color | **monocromo: hereda el color del texto** |

🚨 **El color va en el encabezado o en el contenedor, nunca en el icono.** Un set de iconos
multicolor destruye la jerarquía: si todo tiene color, nada resalta.

⚠️ **Un solo set.** Mezclar familias de iconos se nota aunque no se sepa nombrar, y a la app
le costó tres bloques de trabajo llegar a tener uno solo.

---

# 6 · COMPOSICIÓN

## Espaciado

Escala de 4: `4 · 8 · 16 · 24 · 32 · 48`. **No hay valores intermedios.**

## Esquinas

`4 · 8 · 12 (card) · 16 · 24 · píldora`

## Las tres preguntas antes de dar por buena una pantalla

1. **¿Hay un protagonista claro?** Si todo pesa igual, el ojo no sabe dónde empezar.
2. **¿Respira?** El espacio vacío no es desperdicio: es lo que hace que lo lleno se lea.
3. **¿El acento está contado?** Uno o dos elementos lima. No más.

## Cards editoriales

La card de ATP es **imagen con degradado encima y texto sobre el degradado.** No es un
recuadro de datos: es una portada. Ese es el molde que distingue a ATP de cualquier app de
hábitos con listas.

---

# 7 · FOTOGRAFÍA E IMAGEN

## Qué muestra

Cuerpos reales en esfuerzo o en calma. Luz natural, preferentemente de mañana temprano o de
tarde. Comida real, entera, sin estilizar de más.

## Tratamiento

- **Oscurecida y con contraste**, para que el texto encima se lea sin cajas ni sombras
  duras.
- **Degradado de negro desde abajo** en las cards editoriales.
- Formato **WebP** siempre.

## Nunca

- Foto de banco genérica de gente sonriendo con mancuernas de colores.
- Antes y después de cuerpos. **ATP no vende transformación estética.**
- Bata blanca, estetoscopio ni cualquier código visual de consultorio médico.
- Texto sobre foto sin capa de contraste.

---

# 8 · VOZ Y COPY

## Las reglas duras

🚨 **Español de México.** Nada de "coger" en el sentido español, ni "vosotros", ni "ordenador".

🚨 **Cero em dash.** Se usan coma, dos puntos, punto o paréntesis. La app tiene pruebas
automáticas que revientan si aparece uno.

🚨 **Nunca nombres de personas en texto visible.** Las recomendaciones vienen de ATP o de
ARGOS, no de una persona.

🚨 **Nunca nombrar enfermedad, diagnóstico ni tratamiento** en nombres de producto ni en
promesas. *"Cuidar mi glucosa"*, jamás *"tratar la diabetes"*.

🚨 **Ningún beneficio inventado.** Si una función no hace algo, el copy no lo insinúa.

## Cómo suena ATP

- **Del cuerpo, no del laboratorio.** "A media tarde te apagas", no "presentas fatiga
  postprandial".
- **Segunda persona.** Le hablamos a alguien, no describimos un producto.
- **El porqué antes del qué**, en una línea.
- **Honesto sobre los límites.** "Medimos la hora a la que te acuestas, que es lo único
  accionable sin un reloj" vale más que fingir precisión.

## Palabras que no usamos

Curar · tratar · diagnosticar · prevenir enfermedades · milagro · secreto · detox ·
quemagrasa · adelgazar.

---

# 9 · APLICACIONES

## La app

Es la referencia canónica. Editorial, oscura, con degradados y respiro. Todo lo demás se
alinea a ella.

## Las landings

⚠️ Hoy corren un sistema propio (v4, tipografía tipo DIN, blanco y negro editorial). **Es la
inconsistencia más visible de la marca:** alguien que llega de la landing a la app siente
que son dos productos.

**Decisión pendiente de Enrique:** alinear las landings a la app, o declarar dos registros
distintos a propósito (uno de venta, uno de producto) con reglas explícitas para cada uno.

## La tienda

Capturas con el modo oscuro, con un solo mensaje por imagen y texto grande. El ícono es la
molécula sobre negro.

⚠️ El texto de la ficha se rige por el capítulo 8: **ninguna promesa médica**, o la ficha se
rechaza en revisión.

## Redes

Instagram y YouTube usan el mismo lenguaje de foto del capítulo 7. **La miniatura de YouTube
puede ser más agresiva en contraste**, pero jamás con colores fuera de la paleta.

## Material de venta

Fondo negro, degradado de la molécula para lo heroico, y una sola cifra grande por lámina.

---

# 10 · LO QUE NUNCA SE HACE

1. Un cuarto color de marca.
2. Lima plano como fondo de superficie grande.
3. Más de dos elementos lima en una pantalla.
4. Mezclar familias de iconos.
5. Iconos multicolor.
6. Em dash en texto visible.
7. Nombres de personas en copy de usuario.
8. Nombrar enfermedades en nombres de producto.
9. Antes y después de cuerpos.
10. Códigos visuales de consultorio médico.

---

# ⏭️ LO QUE ESTE MANUAL DESBLOQUEA

- **MB-31A** ya tiene la paleta clara del capítulo 3.6 y no tiene que inventarla.
- **La ficha de tienda** tiene reglas de captura, ícono y copy.
- **Las landings** tienen una decisión que tomar, con las dos opciones planteadas.
- **Mariana y cualquier colaborador** tienen una sola fuente para revisar contra ella.

# ⏭️ PENDIENTE DE ENRIQUE

1. **Vetar o aprobar la paleta clara** (3.6). Es lo único que bloquea MB-31.
2. **Decidir el destino de las landings** (capítulo 9).
3. Confirmar que las reglas de logo del capítulo 2 coinciden con el manual de identidad
   original.
