# Cómo trabaja el dueño

Este archivo va primero porque es el que más fricción ahorra. Todo lo demás se puede
deducir leyendo código. Esto no.

---

## 1. Habla directo y quiere que le hablen directo

No hay que suavizar, no hay que endulzar, no hay que abrir con un párrafo de cortesía.
Si algo está mal, se dice que está mal y se dice por qué. Si algo salió normal, se dice
que salió normal: felicitar lo normal le quita valor a felicitar lo bueno.

Las analogías de ingeniería funcionan muy bien con él, es ingeniero en automatización.
El orden que le acomoda para explicar cualquier cosa es **dolor, ciencia, acción**.

Lo que sí espera: que le digas lo incómodo. Un hueco declarado se cierra. Un hueco tapado
con una suposición razonable cuesta semanas.

## 2. Odia que le inflen las estimaciones de tiempo

Textual, y conviene leerlo dos veces:

> "tenemos un historial muy largo de que sobreestimas el tiempo de trabajo en una escala
> de tres a cuatro cifras"

Tres a cuatro cifras. No es una queja de matiz, es que las estimaciones estaban fuera de
escala por órdenes de magnitud.

La regla práctica que sale de ahí: **una estimación es una referencia relativa, nunca un
argumento para recortar alcance.** Si dos tareas son una más grande que la otra, dilo. Si
crees que algo "no da tiempo", esa conclusión no es tuya. Presenta el tamaño y deja que él
decida. El tempo lo dicta él.

## 3. Él decide qué va y qué no va

Textual:

> "el que decide qué va y qué no va soy yo"

Esto es literal y aplica al alcance, al orden y a las concesiones. Tu trabajo es traer la
decisión ya tomada con un default razonable y dejarle el veto, no traerle un menú de tres
opciones para que escoja. El formato que mejor le ha funcionado es una tabla de tres
columnas: **qué se decide, cuál es mi default, qué pasa si vetas.**

La razón por la que este formato funciona: él es el único desarrollador y su tiempo es el
recurso escaso del proyecto. Un menú de opciones le transfiere trabajo a él. Un default
con veto le transfiere solo la decisión, que es lo único que no puedes hacer tú.

## 4. Trabaja por peloteo

Prefiere intercambios cortos a soluciones cerradas de una. Volleys, no ensayos. Si le
mandas un documento de cuarenta páginas cuando lo que quería era una idea, perdiste el
turno y perdiste su tiempo.

El patrón que funciona: propones corto, él corrige, propones corregido. Tres o cuatro
vueltas rápidas valen más que un entregable perfecto que nace equivocado. Cuando el
peloteo ya convergió, entonces sí, entrega larga y completa.

Corolario: si te dice dos veces que algo "no se siente bien", deja de parchar y cuestiona
la premisa. La segunda vez que lo dice ya no está hablando de la ejecución.

## 5. Cuando pregunta "¿cómo vamos?" quiere tres cosas

**Cerrado. Falta. Bloqueado.** En ese orden y sin narrativa desde la mitad.

No quiere el recuento de lo que intentaste, ni el orden cronológico, ni el contexto de
por qué fue difícil. Quiere saber qué ya está, qué queda y qué no avanza sin él. Si algo
está bloqueado, quiere saber **quién lo desbloquea y con qué acción exacta.**

Todo lo que declares cerrado necesita evidencia citable: archivo y línea, número de
migración, consulta a la base o captura del teléfono. "Se arregló" no es un estado. Esta
regla nació porque cinco de los dieciséis bloqueantes del inventario del 17 de agosto se
cayeron al día siguiente por el simple acto de ir a leer el código.

## 6. Windows y PowerShell, sin `&&`

Trabaja en Windows 11 con PowerShell. **PowerShell no encadena con `&&`.** Cualquier
comando que le pases con `&&` le va a fallar en la primera línea y es tiempo suyo tirado
a la basura por una tontería.

Los comandos se le entregan listos para copiar y pegar, una línea por renglón:

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx tsc --noEmit
npm test
```

Nunca abreviado, nunca con rutas relativas asumidas, nunca con el `cd` implícito.

---

# El principio de los cuatro ojos

El dueño pidió esto como **regla permanente**, y la pidió después de que le costara caro
no tenerla:

> **Todo trabajo lo revisa al menos un agente adicional antes de darlo por bueno.**

No es burocracia y no es desconfianza. Es que un asistente que produce trabajo y lo
declara bueno está calificando su propio examen, y en este proyecto ese arreglo falló de
formas caras y verificables. Aquí están los casos, y son errores del asistente saliente,
o sea míos.

## Caso 1: los setenta filtros rotos que nunca estuvieron rotos

Se afirmó que PostgREST devuelve los valores numéricos como texto, y que por lo tanto
había alrededor de setenta filtros comparando números contra cadenas en toda la
aplicación. Con esa premisa se dimensionó un trabajo de setenta ediciones quirúrgicas.

**Cero de esos filtros estaban rotos.** Las comillas que se vieron alrededor de los
números venían de cómo la consola de SQL presenta los resultados, no de lo que la base
devuelve por la interfaz. Un revisor fue a verificar contra la base real, lo desmintió, y
con eso evitó setenta ediciones inútiles sobre código que funcionaba.

Lo que se hizo mal: se generalizó desde la presentación de una herramienta hacia el
comportamiento del sistema, sin comprobar el comportamiento del sistema.

## Caso 2: los pesos placeholder que llevaban dos meses mintiendo

Se afirmó que los pesos de la Edad ATP eran placeholder, o sea que el número que vende el
producto entero no usaba el algoritmo real. Ese hallazgo subió a la lista de bloqueantes
del lanzamiento y estuvo a punto de provocar que se congelara la Edad ATP detrás de una
bandera.

**Era un comentario obsoleto de dos meses.** El comentario se escribió el 8 de junio a
las 09:40, en el mismo commit que creó el archivo. Los pesos reales entraron a las 11:15
del mismo día. Hora y media después. Lo probó un `git blame`, y hay un test de regresión
que exige el valor verificado.

La fuente de la afirmación no fue el código: fue un comentario **dentro** del código, que
es una cosa distinta y que nadie mantiene.

De ahí sale una regla que ahora es del proyecto: **un comentario que miente se trata como
bug de severidad alta.** Toda deuda declarada en un encabezado lleva fecha de verificación
o no vale. Un comentario falso cuesta exactamente lo mismo que un número falso, con el
agravante de que nadie lo revisa nunca.

## Caso 3: ARGOS y el endocrinólogo

Se reportó que ARGOS improvisó una recomendación de ver a un endocrinólogo, y se trató
como una alucinación del modelo, con todo lo que eso implica en una aplicación de salud.

**El prompt lo pedía textual.** El modelo hizo exactamente lo que se le indicó. El
problema estaba en el prompt, que es un archivo del repositorio que se puede abrir y leer.

## Caso 4: los consentimientos tapados por su propio botón

Se reportó que en dos pantallas del onboarding el botón flotante tapaba el checkbox de
consentimiento de datos personales, y se clasificó como riesgo legal.

**Era geométricamente imposible.** En las dos pantallas la barra del botón es un `<View>`
hermano posterior al `<ScrollView>`, dentro del mismo contenedor. El `ScrollView` de React
Native trae `flexShrink: 1` y la barra trae `flexShrink: 0`, así que el scroll se encoge y
la barra se queda abajo. No hay `position: absolute` en ninguna de las nueve pantallas del
onboarding. No pueden solaparse. Además, los checkboxes obligatorios viven debajo del
texto que consienten y no se puede continuar sin marcarlos, así que el candado legal
estaba intacto por dos razones independientes.

El diagnóstico venía de mirar una captura de pantalla e interpretar lo que parecía. Nadie
abrió el archivo.

## La lección, en una línea

**Antes de culpar al modelo o al código, lee la fuente.**

La fuente es el archivo, la definición de la función en la base, el commit, el `git
blame`. No es la captura de pantalla, no es el comentario dentro del código, no es el
documento de auditoría de la semana pasada y no es lo que devuelve una consola.

Los cuatro casos comparten forma: una observación real, una inferencia rápida y plausible,
y nadie que fuera a comprobarla. Los cuatro se desmontaron en minutos por alguien que
abrió el archivo. Por eso hay cuatro ojos.

## Cómo se aplica en la práctica

- El agente que escribe no es el que aprueba. Punto.
- El revisor no revisa "si se ve bien": revisa **la premisa**. La pregunta que desmontó
  los cuatro casos siempre fue la misma, "¿de dónde sacaste que eso es cierto?".
- Todo hallazgo se marca con su grado de certeza: **verificado** (lo comprobé y digo
  cómo), **creo** (es mi lectura, no lo comprobé), **me lo dijeron**. Sin marca, se lee
  como "creo".
- Un test que lee un archivo verifica **intención**. Solo una consulta al servidor
  verifica **estado**. Esto no es teoría: un hueco de seguridad real vivió meses debajo de
  una suite de pruebas verde, porque la prueba leía el archivo de migración y el archivo
  seguía diciendo lo correcto mientras el permiso en la base ya se había revertido solo.

---

## Dos hábitos operativos más

**Los candados de doctrina en los tests se reapuntan, no se debilitan.** Si un test que
protege una regla de producto empieza a fallar porque el código cambió de lugar, se
actualiza el test para que apunte al lugar nuevo. Jamás se relaja la aserción ni se
marca como omitido. El test es el que cuida la doctrina cuando nadie está mirando.

**Sin parches ni soluciones provisionales.** La instrucción es explícita: limpio de una.
Un stopgap en este proyecto se queda para siempre porque solo hay un desarrollador y nunca
hay una segunda pasada.
