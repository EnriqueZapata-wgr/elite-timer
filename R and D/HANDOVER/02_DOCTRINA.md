# Doctrina

Lo que no se negocia. Cada regla trae su razón, porque la razón es lo que evita que
alguien la deshaga sin saber lo que está deshaciendo.

---

## Parte I. Doctrina de producto

### Un dato vive en un solo lugar

Cada dato del usuario se guarda una sola vez, se muestra en un solo lugar canónico, y
todo lo demás enlaza hacia ahí. Si el peso corporal aparece en tres pantallas con tres
cifras distintas, la aplicación deja de ser una fuente de verdad y se vuelve un rumor.

De aquí sale la regla que más se rompe: **navegación y consulta son cosas distintas.**

- Un **hub** es navegación. Son tarjetas editoriales que llevan a algún lado. **Cero
  datos.** Un hub que muestra cifras se convierte en un cuarto lugar donde el mismo dato
  puede estar desactualizado, y además obliga a cargar datos para dibujar un menú.
- Una **pantalla de consulta** es donde el dato vive, con su historia, su unidad y su
  contexto.

Esto está roto en varios lugares hoy y está inventariado: un mismo interruptor duplicado
en dos secciones de ajustes, un test de cronotipo alcanzable por tres puertas desde dos
pestañas distintas, y tres rutas de salud que son redirects al mismo sitio. La instrucción
es matar duplicados, no armonizarlos.

### El dato del usuario es sagrado

Nada de borrar historial. Nada de reescribir lo que el usuario guardó. Nada de
"normalizar" registros viejos porque el formato nuevo es mejor.

La distinción operativa es limpia: **los datos que produce la máquina se validan y se
corrigen; los datos que escribió una persona son intocables.** Si una unidad de laboratorio
estaba mal capturada, la conversión se hace **en el momento de comparar**, no reescribiendo
el valor guardado. Así funciona hoy la bandera de unidades de laboratorio, y esa es la
razón por la que se diseñó así.

Corolario: desactivar no es eliminar. Y eliminar algo que ya tiene historial **avisa
primero**, siempre.

### Nunca inventar un rango ni un peso clínico

La **matriz V7/V6** es la fuente de verdad de todos los rangos funcionales y todos los
umbrales por sexo. La firma la responsable clínica.

Si un parámetro no tiene banda declarada en la matriz, **no se inventa una banda
plausible**: se declara como sin banda y se documenta. Hoy hay diez columnas declaradas
formalmente sin banda por esta razón, y trece decisiones esperando firma clínica.

La razón es directa: el número que la aplicación le pone enfrente a una persona sobre su
propia salud es lo más pesado que hace el producto. Un rango inventado que parece
razonable es indistinguible de uno correcto hasta que le hace daño a alguien.

Esto tiene una consecuencia incómoda que hay que sostener: **el criterio clínico es el
camino crítico del lanzamiento y no lo controla ningún desarrollador.** No se puede
acelerar escribiendo código.

### Nunca nombres de enfermedad, diagnóstico ni tratamiento en el copy

En el texto que ve el usuario no se nombra una enfermedad, no se emite un diagnóstico, no
se receta un tratamiento y no se nombra una especialidad médica. ARGOS remite a "tu médico
o tu profesional de salud", nunca a un especialista concreto. Hay una bandera dedicada a
esto (`ARGOS_LIMITE_DE_ALCANCE`) y un bloque en el prompt del sistema que lo impone.

Hay dos razones y las dos importan:

1. **Regulatoria.** Las guías de Apple y Google no toleran que una aplicación de consumo
   diagnostique. Nombrar la enfermedad es rechazo en revisión.
2. **De producto.** Los nombres de los paquetes de salud nunca nombran una enfermedad. Se
   nombra el mecanismo, no el padecimiento. La persona que llega buscando ayuda no quiere
   que la aplicación le ponga una etiqueta encima.

La única excepción, y está deliberadamente fuera de la bandera: **la derivación por
emergencia sigue activa siempre.** Con la bandera encendida o apagada, si hay señal de
crisis, la aplicación da el número de emergencias. Eso no se toca.

**Tampoco van nombres de personas en el copy de usuario.** Ni los de los fundadores, ni
los de terceros. Se usa el rol. Esta regla aplica también a la documentación interna,
que es la razón por la que en estos cuatro archivos leerás "el dueño" y "la responsable
clínica" y no un nombre.

### Un "no sé" es recuperable; un dato dicho con confianza que está mal, no

Vale para ARGOS y vale para ti.

En ARGOS está construido: si no hay suficientes datos, la aplicación dice qué falta en vez
de inventar un patrón. Los reportes de correlación exigen mínimos por grupo antes de
afirmar nada, y cuando la diferencia es ruido, dicen "sin patrón claro" en vez de inflarla.
El lenguaje es siempre de observación, nunca de causa: "los días que dormiste menos de seis
horas reportaste...", jamás "dormir poco te causa...". Hay tests que prohíben literalmente
las palabras "causa" y "provoca".

Para ti significa que declarar un hallazgo sin verificarlo cuesta más que no declararlo.
Ver los cuatro casos del archivo 01.

### Sesiones cortas, una acción por pantalla, guiado pero no prisionero

- **Sesiones cortas.** La aplicación se usa en ratos, no en sentadas. La navegación tiene
  que aguantar que alguien entre por veinte segundos.
- **Una acción por pantalla.** Cada pantalla tiene un protagonista y aire alrededor. Si
  compiten dos, no hay ninguno.
- **Guiado no prisionero.** El camino simple es el default y el completo es opcional. Se
  ofrece un carril, no se cierra la puerta.

Esto choca de frente con el estado real del día 1, que hoy abre con doce tareas que el
usuario nunca eligió, y ese es uno de los puntos de fuga documentados. La doctrina propia
del proyecto dice que instalar una aplicación equivale a activar un hábito, y el día 1
la contradice. Está inventariado como pendiente.

### Los candados de doctrina en los tests se reapuntan, no se debilitan

Repetido a propósito desde el archivo 01, porque es donde más se traiciona la doctrina sin
querer. Si un test que protege una regla de producto falla porque el código se movió, se
actualiza el apuntador. Nunca la aserción.

---

## Parte II. Medicina funcional

El modelo clínico del producto, en las palabras del proyecto:

- **Causas raíz antes que síntomas.** Esa es la frase que gobierna todo lo demás.
- No se recomiendan bloqueadores químicos como primera opción.
- No se promueven soluciones alopáticas como opción por defecto.
- Las plantas tradicionales sí; los extractos y las cápsulas comerciales se tratan con
  otra vara.
- El ciclo femenino es **bidireccional**: la fase folicular intensifica y la lútea escucha.
  No es "la semana en la que la mujer rinde menos". La fase explica, no excusa.
- La evidencia no se arbitra solo con PubMed. Hay once paradigmas reconocidos y cuatro
  niveles de evidencia, y las instituciones capturadas por industria no cuentan como
  validación automática.

**Y la tensión que hay que sostener sin resolverla a la ligera:** todo lo anterior es la
doctrina interna, pero **el lenguaje de la interfaz de consumo respeta las guías de Apple y
Google.** Las dos cosas son verdad al mismo tiempo. La doctrina define qué recomienda el
producto; las guías definen cómo se puede decir. Cuando choquen, se busca la formulación
que cumpla las dos, no se sacrifica ninguna.

---

## Parte III. Diseño

La autoridad máxima es el **manual de marca en PDF**. Si el manual y el código se
contradicen, gana el manual y el código se corrige. Después del manual manda
`docs/DESIGN_SYSTEM.md`, y ese archivo se lee **antes** de tocar cualquier pantalla.

Lo que hay que saber sin abrirlo:

- **Fuente única de tokens:** `src/constants/brand.ts`. **Nunca se escribe un color a
  mano.** Hay 1,782 colores hardcodeados de deuda medida y la instrucción es
  estandarizar por pantalla, no de golpe.
- **Tres colores.** Lima y teal principales, ámbar secundario. **No existe un cuarto color
  de marca** y hay un solo amarillo. Cualquier otro es deuda.
- **Degradados, nunca lima plano** en superficies heroicas. El lima sólido queda para
  micro acentos: botón principal, dato heroico, estados de "hecho". La heurística: si en
  una captura cuentas más de dos o tres elementos lima que no sean esos, sobra acento.
- **Una sola familia tipográfica**, Poppins. La jerarquía se hace con **peso**, no metiendo
  más familias.
- **Un solo glow por pantalla**, máximo.
- **El molde canónico** es "Mis Datos" con tarjeta editorial: imagen de fondo, overlay de
  degradado, jerarquía clara. Lo que no se sienta como esa pantalla, está mal.
- **Iconos Phosphor Regular, monocromos.** El color va en el encabezado, no en el icono.
  Hay una trampa conocida: confundir la variante rellena con la de contorno.
- **Todo lo táctil responde** con escala de resorte y háptico. Prohibido el `opacity: 0.7`
  plano.
- **Dos kits de componentes conviven y siempre se usa el nuevo** (`src/components/ui/`).
  El viejo (`elite-*`) sobrevive en unas once pantallas, entre ellas login y registro. No
  se construyen pantallas nuevas con él.

Y la regla de flujo que se rompe con más facilidad: **todo cambio estético exige
verificación visual en dispositivo.** Con la advertencia de que la publicación por OTA
sube lo que esté en la rama donde estás parado, así que trabajo en rama sin fusionar no
viaja en la actualización.

**Deuda declarada más grande del sistema de diseño: el modo claro.** Nació sin existir, se
migró por lotes, y la auditoría del 16 de agosto lo encontró a medio pagar. Está detallado
en el archivo 03.

---

## Parte IV. El pivote de negocio del 16 de agosto

**Esto invalida documentación vieja. Mucha.** Antes de usar cualquier documento de precios,
economía o niveles de suscripción anterior al 16 de agosto de 2026, revisa contra esto.

### Qué se decidió

**Una sola membresía premium de $890 MXN.** Y nada más.

- **Mueren los niveles.** No hay Base ni Pro. Un solo plan.
- **Muere el gating.** Ninguna función se bloquea por nivel de suscripción.
- **Mueren los límites duros.** No hay tope de uso de la inteligencia artificial de cara
  al usuario. Lo que quedó en el servidor es un **techo antiabuso medido en gasto real, no
  en número de llamadas**, que es una cosa distinta: protege el costo, no raciona al
  cliente.
- **Mueren los protones.** La moneda interna de consumo desapareció del núcleo. Se
  eliminó **sin borrar un solo dato de usuario**, por la doctrina de la Parte I.
- **Los electrones se quedan, pero solo como logros.** Ya no compran nada.
- **ATP es comunidad más aplicación.** La membresía incluye las dos cosas.
- **No hay prueba gratis de catorce días** en el lanzamiento. Estaba definida para el plan
  mensual de entrada, y ese plan ya no existe.

### Por qué

El razonamiento del dueño, y conviene entenderlo porque es lo que impide que alguien
reintroduzca límites "por prudencia":

> **Limitar el uso de la inteligencia artificial hace que la gente la use menos y
> desinstale.**

Un usuario que llega a su tope aprende a no abrir la aplicación. Un usuario que aprende a
no abrir la aplicación no renueva. El costo de servir es del orden de un peso y medio por
usuario al mes; el costo de la desinstalación es el cliente completo. La aritmética no
está cerca.

Hay un antecedente concreto detrás: una usuaria de prueba pagó por consumo y aun así se
quedó bloqueada. Ese fue el día que se acabó el modelo por niveles.

### Qué documentos quedaron muertos

Cualquier archivo de `R and D/` o de desarrollo de negocio que hable de:

- Precios de $399 y $799 o $999, niveles Base y Pro, o el hueco entre ellos.
- Límites diarios por nivel (`TIER_DAILY_LIMITS` ya no existe en el proxy).
- Economía de protones, saldos, recargas, impulsos, o funciones premium cobradas por
  transacción.
- La prueba gratis de catorce días.
- La ronda de fundadores, que está cerrada.

El inventario de pendientes tiene un grupo entero, ocho renglones, listados **para
tacharse, no para hacerse**, precisamente porque el pivote los mató.

### Lo que el pivote no cambió

El puente de pago híbrido sigue en pie como decisión: dentro de la aplicación todo pasa
por la tienda; en la web, por pasarela propia. El código de activación es el puente entre
las dos. Esa pieza hay que releerla a la luz del pivote y es parte del alcance nuevo que
menciono en el archivo 04.
