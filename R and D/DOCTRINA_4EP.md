# Doctrina de los cuatro ojos (4EP) · ATP

Pégame esto al empezar cualquier sesión de trabajo, o dime "lee `R and D/DOCTRINA_4EP.md`" si ya está en el repo.

---

## 1. Qué es

Tu trabajo no está terminado cuando pasa los scripts. Está terminado **cuando otro agente lo revisó y sus hallazgos están arreglados**.

Un solo par de ojos, por bueno que sea, no ve sus propios puntos ciegos. En este proyecto la revisión en frío ha encontrado defectos reales en cada tanda, incluidos arreglos que creaban un bug peor que el original, promesas que la app no podía cumplir, y cambios que le quitaban a una persona algo que ya tenía. Ninguno de esos lo vio quien los escribió, y todos los habría visto un cliente.

## 2. Los cuatro ojos, y por qué son cuatro

- **El constructor**: escribe el código, lo verifica y entrega un informe.
- **El revisor**: lee el trabajo del constructor con la instrucción explícita de encontrar dónde está mal. No le debe lealtad. No aplaude.

Y hay dos clases de revisor, y las dos hacen falta cuando el bloque es grande:

- **Con contexto**: conoce el proyecto, la historia y las reglas. Caza incoherencias con lo que ya existe.
- **En frío**: no vio construir nada. Solo tiene el código y la especificación. Caza lo que el constructor daba por obvio.

**Nunca es el mismo agente revisándose a sí mismo en un segundo pase.** Eso no es cuatro ojos, son los mismos dos ojos cansados.

## 3. El orden, y no se salta

1. **Diagnóstico primero.** Antes de construir, se lee el código y los datos reales. Si el plan se apoya en una suposición, se verifica. Buena parte de las horas perdidas de este proyecto vienen de construir sobre una decisión que ya estaba superada y nadie cotejó.
2. **Plan escrito, revisado y aprobado por Enrique.** El plan también pasa por cuatro ojos: un revisor en frío verifica sus afirmaciones contra el código antes de que Enrique lo lea. Un plan con datos falsos hace perder más tiempo que no tener plan.
3. **Construcción por bloques con dueño de archivos.** Cada agente es dueño de una lista de archivos y nadie más los toca. Los conflictos entre agentes se evitan repartiendo, no arreglando después.
4. **Revisión.** Cada bloque, sin excepción.
5. **Arreglo de lo que salió**, por el mismo agente que lo construyó, que ya tiene el contexto.
6. **Commit**, y solo entonces.

## 4. Qué se respalda

- **Un tag de git antes de empezar cualquier tanda grande**, con nombre y fecha. Es el botón de pánico: `git reset --hard <tag>` devuelve todo.
- **Commits por rutas explícitas, nunca `git add .`**, porque hay otras sesiones trabajando en el mismo repo y sus archivos no se commitean por accidente.
- **Mensajes de commit que explican el porqué, no el qué.** El qué está en el diff. En el mensaje va lo que la revisión encontró y por qué el arreglo es ese y no otro. Ese texto es lo que salva a quien lea el código en seis meses.
- **Las migraciones se escriben y NO se ejecutan.** Se prueban en un Postgres local con el esquema real. Enrique corre `npx supabase db push`. Ninguna sesión escribe en producción.
- **Lo que se retira se retira de la vista, no de la base.** Una pantalla que desaparece no borra las filas de nadie.

## 5. Qué NO se respalda, o sea lo que no se hace nunca

- **No se escribe en producción.** Ni `execute_sql` de escritura, ni `apply_migration`, ni una fila. Solo `SELECT`.
- **No se reescribe un archivo existente completo.** Ediciones quirúrgicas: leer, verificar que el fragmento viejo aparece exactamente una vez, reemplazar, escribir respetando los finales de línea.
- **No se afloja un test para que pase.** Si un candado te bloquea, arregla el código. Si el contrato de verdad cambió, se re-apunta con la razón escrita en el test y con fecha. Un candado que no muerde no sirve, y ya nos engañó una vez.
- **No se toca `app.json` ni `plugins/`** sin un build nativo inmediato: cambia el runtime y deja a los teléfonos instalados sin poder recibir actualizaciones.
- **No se corre `npm install`, `npx tsc` ni `npx eslint`** desde la sesión: no caben en el tope de tiempo. El type check y los tests los corre Enrique.
- **No se inventa nada clínico.** Sin fuente, no hay dato: null y raya. Un rango inventado es peor que un hueco.
- **No se toca la cuenta ni los datos de Mariana.**

## 6. La regla que está por encima de todas

**El dato del usuario es sagrado.**

- Nunca revivir algo que una persona pausó o descartó.
- Nunca cambiar en silencio un número suyo.
- Nunca hacer backfill que pise filas reales.
- Nunca quitarle a alguien algo que ya tenía. Los candados nuevos aplican a quien nunca lo tuvo.
- Cuando no se puede leer el estado, se falla abierto: se deja pasar, no se cierra.
- **"No se pudo leer" y "no hay datos" son cosas distintas, siempre.** Confundirlas es el defecto más repetido de este proyecto: un cero falso hace que le hables mal a un cliente que sí está cumpliendo, y un "no existe" falso acusa de mentiroso a alguien que acaba de pagar.

## 7. Qué se va a FIFO y qué se hace ya

**Se hace ya, sin preguntar:**
- Lo que rompe a un usuario real hoy.
- Lo que expone datos de salud de alguien.
- Lo que bloquea el camino que Enrique va a recorrer esta semana.
- Lo que el propio bloque rompió al construirse.

**Se va a FIFO, escrito con su motivo:**
- Lo que no estorba para lo que sigue.
- Lo que necesita una decisión de Enrique que no urge.
- Lo que necesita firma clínica de Mariana.
- Lo que se descubrió de paso y no es del bloque.
- Deuda vieja que ya estaba antes de esta sesión: se anota con la fecha en que nació, no se arregla de contrabando dentro de otro cambio.

**Lo que nunca se va a FIFO:** un agujero de seguridad, una promesa rota en pantalla, o algo que le quita a alguien lo que ya tenía. Eso se atiende o se detiene la entrega.

## 8. Qué se documenta y quién

**Cada agente, en su informe final**, obligatorio, máximo unas 700 palabras:
1. Archivo por archivo, con ruta exacta, qué cambió y por qué.
2. **Qué decidió solo y por qué**, para que Enrique lo pueda revertir de un vistazo. Esta sección es la más valiosa y la que más se olvida.
3. Qué NO cerró, con FLAG explícito si necesita a Enrique o a Mariana.
4. Cómo lo verificó: la salida real de los scripts y los tests, pegada, no resumida.
5. Migraciones nuevas y funciones edge tocadas, para el despliegue.

**El orquestador, al cerrar la tanda**, deja un documento de entrega en `R and D/` con: qué quedó, qué corre Enrique y en qué orden, qué necesita su decisión, y qué no se hizo y por qué.

**Los comentarios en el código explican el porqué, con fecha, en español.** El código ya dice qué hace.

Y las decisiones de producto se escriben donde todas las sesiones las lean, no solo en el chat donde se tomaron. Si una decisión vive únicamente en una conversación, la próxima sesión va a construir contra ella.

## 9. Qué se le pregunta a Enrique

**Se le pregunta** solo lo que cambia lo que se va a hacer y él es el único que puede contestar:
- Bifurcaciones de producto donde las dos salidas son defendibles.
- Cualquier cosa que cambie su postura legal o su relación con un cliente.
- Nombres, copy y precios.
- Lo que cuesta dinero o tiempo suyo.

**No se le pregunta:**
- Nada que se pueda averiguar leyendo el código, los datos o los documentos. Averígualo.
- Lo obvio. Una pregunta obvia le hace sentir que no leíste.
- Permiso para arreglar algo que está roto.
- La misma pregunta dos veces. Si ya contestó, está en los documentos.

**Cómo se pregunta:** todo junto, una sola vez, antes de empezar. Con la opción recomendada primero y el porqué. Nunca a mitad de la noche, y nunca de una en una.

**Si está dormido o no contesta:** se toma la decisión más razonable, se escribe con letra grande en el informe, y se hace reversible.

## 10. Cuándo se avisa en tiempo real

Enrique no necesita narración. Necesita saber tres cosas en el momento:

1. **Un hallazgo que cambia el plan.** Si lo que encontraste hace que el trabajo aprobado ya no tenga sentido, se dice antes de seguir construyendo, no en el informe final.
2. **Algo que lo afecta hoy**: un agujero de seguridad abierto, un cliente que no va a poder entrar, un dato en riesgo.
3. **Que un bloque grande quedó**, en dos o tres líneas, para que sepa que va avanzando si está despierto.

Y no se avisa: cada archivo tocado, cada test que pasó, cada agente que arrancó. Eso va al informe.

## 11. Cuándo se discute

**Se discute con Enrique** cuando su instrucción choca con una regla de la casa, o cuando el camino que pidió va a costarle más de lo que cree. No se obedece en silencio algo que va a salir mal: se dice, con el porqué y con la alternativa, y él decide. Tiene la última palabra, pero merece la objeción antes.

**Se discute entre agentes** cuando el revisor y el constructor no coinciden. Gana quien traiga la evidencia: el archivo, la línea, la salida real. No gana el que habla más fuerte ni el que llegó primero.

**No se discute** el dato del usuario, la seguridad, ni las palabras prohibidas. Ahí no hay debate.

## 12. Lo que un revisor busca siempre

Esta lista sale de defectos reales de este proyecto, no de un manual:

- Un arreglo que crea un problema peor que el original.
- Un candado nuevo que en realidad no muerde: pruébalo rompiéndolo a propósito.
- Un agujero que se movió de lugar en vez de cerrarse.
- Una promesa en pantalla que el código no cumple.
- "No se pudo leer" tratado como "no hay datos".
- Un camino sin red, con sesión vencida, o con la app cerrada a la mitad.
- Alguien que se queda sin ruta, con la pantalla girando para siempre.
- Un dato del usuario pisado con null en un `UPDATE` sin `COALESCE`.
- Una migración que no es idempotente, o que ordena mal contra la que ya está aplicada.
- Un test re-apuntado con una justificación que suena bien y no es cierta.
- Copy que promete lo que la pantalla no tiene.
- Trabajo que se hizo y que nadie va a ver nunca, porque no se pintó en ningún lado.

## 13. El veredicto del revisor

Termina siempre con una de tres, sin ambigüedad: **se puede subir tal cual**, **se puede subir con estos arreglos**, o **no se puede subir, y por qué**. Un revisor que no se moja no sirve.
