# Pendientes, despliegue y alcance nuevo

---

# Parte I. Los pendientes hasta el lanzamiento

El inventario completo vive en **`R and D/PENDIENTES_COMPLETOS_2026-08-17.md`**, 647
líneas, fechado el 17 de agosto de 2026. Este resumen no lo reemplaza: te dice cómo está
organizado, qué cambió desde entonces y quién puede hacer qué.

**Advertencia primero.** Ese inventario **nació desactualizado**. Commits del mismo 17 de
agosto cerraron cinco de los dieciséis bloqueantes que declara abiertos. La reconciliación
está en **`R and D/TAKEOVER_DEV_LEAD_2026-08-18.md`**, que es más nuevo y gana cuando se
contradigan. No fue descuido: es que nadie tenía el trabajo de mantener una sola verdad.
Si tomas este proyecto, ese trabajo es tuyo, y el formato propuesto es un solo archivo
`ESTADO.md` con lo abierto y nada más, dejando los sesenta documentos de auditoría de
`R and D/` como expediente histórico.

## Cómo está agrupado

| Grupo | Qué es | Cuántos |
|---|---|---|
| 1. Bloquea el lanzamiento | Claves L-1 a L-16 | 16 |
| 2. Duele pero no bloquea | D-1 a D-25 | 25 |
| 3. Deuda | T-1 a T-17 | 17 |
| 4. Espera a otra persona | F-1 a F-17 | 17 |
| 5. Muerto por el pivote | M-1 a M-8, **para tacharse, no para hacerse** | 8 |

Suman 83. El pendiente 84 se agregó al final del mismo documento: la calificación del test
de N-Back dual deja fuera al usuario con un solo error. Va a la cola y no bloquea.

Hay además tres secciones de cierre que no son pendientes numerados y que valen la pena:
cinco contradicciones documentadas entre archivos, seis hallazgos que nadie tenía anotados,
y siete cosas que no se pudieron verificar.

## Los cinco bloqueantes que ya se cayeron

Táchalos. Se cayeron leyendo código, no leyendo reportes.

- **L-13**, cuatro migraciones sin aplicar al remoto. **Las cuatro están aplicadas**
  (275, 276, 290, 295). Verificado contra el historial de migraciones del proyecto.
- **L-15**, ARGOS podía mandar al usuario a una plantilla de ruta sin resolver. **Cerrado**,
  hay filtro y hay test que exige que toda plantilla esté clasificada.
- **L-16**, el proxy confiaba en el identificador de usuario que venía en el cuerpo de la
  petición. **Cerrado**, ahora sale de la identidad resuelta del token.
- **L-5**, los pesos de la Edad ATP eran placeholder. **Nunca fue cierto desde el 8 de
  junio.** Era un comentario. Ver archivo 01.
- **L-4**, umbrales masculinos aplicados a mujeres. **Cerrado en parte:** los 15 parámetros
  donde la matriz declara umbral femenino propio ya se leen de ahí. Lo que falta no es
  código, es que la matriz declare umbral femenino para el resto, y eso lo firma la
  responsable clínica.

## Lo que decide el 1 de septiembre, y casi nada es escribir código

**1. La firma clínica de la matriz.** Es lo único con dependencia externa y plazo que
nadie controla. El cuadernillo pide respuesta para el **25 de agosto**. Hoy la aplicación
le puede decir a una mujer con T3 en el piso que está en 100 de 100. **Sale a firma hoy o
la fecha se mueve.**

Son 13 decisiones (el documento en prosa tiene 10 casos, el cuadernillo de cálculo los
reformula a 13 partiendo los que traían dos preguntas adentro):

1. **T3 libre, unidad de referencia.** Urgente. Confirmar si 3.2 a 4.2 son pg/mL.
2. **Apolipoproteína B, el segundo corte en cero.** Urgente. Dar el número entre 30 y 40
   mg/dL, o declarar la posición vacía.
3. **Testosterona total en la lectura de sueño.** Urgente. Rango propio o el del sistema
   hormonal.
4. **LDH en mujeres, lectura de inflamación.** Alta. Confirmar el rango o dar otro.
5. **Testosterona total en mujeres, umbral de traducción.** Alta. La cifra en ng/dL por
   debajo de la cual ya no es plausible una mujer, hoy en 20.
6. **Edad corporal contra edad cronológica.** Alta. Un solo rango en los tres dominios.
7. **Ácido úrico en hombres.** Media. Si la lectura inflamatoria y la renal son criterios
   distintos a propósito, y cuál manda.
8. **LDH, un criterio o dos.** Media. Y si el rango no es demasiado estrecho.
9. **T3 libre por arriba del rango.** Media. Si quiere escalones hacia arriba.
10. **LDH, unidad.** Solo confirmar.
11. **Homocisteína, unidad.** Solo confirmar.
12. **Insulina, unidad.** Solo confirmar.
13. **HbA1c, hematocrito y RDW-CV.** Solo confirmar porcentaje o fracción. No cambia
    ninguna calificación.

Se estima entre 30 y 45 minutos para contestar el cuadernillo entero. Aplicar las
respuestas después es cambiar datos, y eso sale por OTA en minutos.

**2. La razón social y el domicilio.** Sin eso, el aviso de privacidad no identifica al
responsable y eso es rechazo en revisión, no un detalle de forma. Hoy el código trae los
literales `[RAZÓN SOCIAL, S.A.S. de C.V.]` y `[DOMICILIO, QUERÉTARO, MÉXICO]`.

**3. Los cuatro secretos y los productos en las tiendas.** Sin la pasarela de suscripción
no hay compra, y sin compra no hay aplicación. Más el tiempo de revisión de Apple, que
tampoco se controla. Y la **declaración de Health Connect en Play Console**, que es de lo
que más tarda: justificación escrita por cada uno de los cuatro permisos de salud, video
de la funcionalidad y URL de la política.

**4. Que el recorrido en el teléfono no encuentre nada estructural.** No quedan builds. Un
bug nativo obliga a compilar y compilar reinicia la revisión de la tienda.

## Solo puede hacerlo el dueño

- Aplicar la migración **296** de seguridad (y las que vengan). El CLI de Supabase está
  ligado a su máquina.

  > **Estado al 18 de agosto de 2026: escrita, versionada y NO aplicada.** Vive en
  > `R and D/296_sec_invite_consentido.sql`, **fuera** de `supabase/migrations/`, a
  > propósito: moverla ahí la arma para el siguiente `npx supabase db push`, y eso es
  > aplicarla de hecho. El número **296 está libre** (la migración más alta del proyecto es
  > la 295, verificado el 18 de agosto), así que no hay choque cuando se decida promoverla.
  >
  > **Qué cierra:** que con la llave anónima, que viaja dentro del paquete de la app,
  > cualquiera pudiera crear un vínculo coach-cliente en estado `active` contra el correo de
  > otra persona. Ese vínculo es del que cuelgan 44 políticas de acceso a datos de salud, 21
  > de ellas de lectura **y** escritura. Deriva el coach del token en vez del parámetro y
  > revoca `EXECUTE` a `anon`.
  >
  > **Qué hay que sopesar antes de promoverla:** cambia el contrato de
  > `invite_client_by_email` a días del lanzamiento, y su único llamador es el panel de
  > coach (`coach-service.ts`). Si ese llamador alguna vez manda un `p_coach_id` distinto de
  > `auth.uid()`, la invitación empieza a fallar. Es una decisión de riesgo, no una tarea.
  >
  > **Y lo que la migración no cura:** la entrevista de handoff no encontró ninguna
  > migración que reabriera el permiso, así que la reapertura vino casi seguro de una
  > edición por el editor de SQL, fuera del repositorio. Si es así, **volverá a abrirse la
  > próxima vez que alguien edite por fuera.** La cura de fondo es dejar de editar la base
  > fuera del repositorio, o poner un guard que le pregunte al servidor en vez de leer el
  > archivo de migración. Promover la 296 sin eso compra tiempo, no cierre.
  >
  > Promoverla, cuando se decida, es mover el archivo a `supabase/migrations/` y hacer
  > `npx supabase db push`. La consulta de verificación viene al final del propio archivo.
- Correr **`npm test`** y la corrida de `npx tsc --noEmit` que cuenta.
- **El recorrido en el teléfono**, que está escrito y ordenado por riesgo en
  `R and D/RECORRIDO_EN_TELEFONO.md`. Son treinta minutos, empieza por el paywall, se hace
  en tema claro, y hay que abrir y cerrar la aplicación antes porque el OTA se aplica en el
  segundo arranque.
- Dar **razón social y domicilio**, o decidir salir como persona física.
- Fijar la **cifra de la cláusula de fundadores**, hoy escrita como `[10]` años.
- Los **cuatro secretos** en Supabase, crear los **productos en App Store y Play**, el
  programa de pequeños negocios, publicar el aviso en el dominio, y la **declaración de
  Health Connect**.
- Toda **decisión de alcance y de criterio**: si la Edad ATP sale como está o como
  estimación, si se sale con la bandera de umbrales femeninos encendida, si hay prueba
  gratis, cuántas filas trae el día 1, si se pliegan pantallas del onboarding.
- Las verificaciones que **exigen dispositivo físico**: el paywall con precios reales, el
  modo medido del ayuno contra glucosa y cetonas, los umbrales de sueño con una noche real.

## Puede hacerlo un asistente sin decisión previa

Prácticamente todo el grupo 2 completo salvo cinco decisiones de producto: legibilidad,
contraste, encabezados, fugas de idioma, alias duplicados. Además:

- **L-6**, quitar la confesión visible al usuario de que el modo claro "va llegando por
  partes" (`app/settings/experiencia.tsx:104`). Trivial.
- **L-7**, el destello negro en cada navegación en tema claro, porque el contenedor raíz
  sigue montando el tema oscuro (`app/_layout.tsx:74`). Chico.
- **L-9**, el aviso médico de ARGOS que se trunca.
- El valor clínico que sale con 19 decimales y en la escala equivocada.
- Casi toda la deuda del grupo 3.
- **Aplicar los cambios de la matriz una vez firmados.** Son datos, salen por OTA.
- Re-correr la auditoría visual **con espera explícita antes de cada captura**, que es la
  conclusión operativa de la auditoría del 16 de agosto y lo que haría creíble el tercio de
  capturas que hoy no se puede juzgar.

---

# Parte II. El orden de despliegue

**Esto es contraintuitivo y si te equivocas rompes producción.** Léelo dos veces.

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx tsc --noEmit
npm test
npx supabase db push
npm run sourcemaps:ota
```

## Por qué las funciones de borde y las migraciones van ANTES del OTA

Porque el OTA es el JavaScript que corre en el teléfono de la gente, y ese JavaScript sabe
de tablas, columnas y funciones que quizá todavía no existen en el servidor.

Si publicas el OTA primero, cada aplicación instalada se actualiza y empieza a pedirle a
la base cosas que no están. El error clásico es el de "columna X no encontrada en el caché
del esquema", y significa exactamente esto: falta el `db push`. La aplicación truena para
todos los usuarios hasta que corras la migración, y no tienes forma de retirar un OTA que
ya salió, solo de publicar otro encima.

Al revés no pasa nada. Una migración aplicada antes de tiempo es una columna que nadie
lee todavía. Por eso el orden es siempre servidor primero, cliente después.

Lo mismo vale para las funciones de borde: si el cliente nuevo llama a un endpoint que
todavía no está desplegado, falla; si el endpoint está desplegado y nadie lo llama, no
pasa nada.

Y hay una excepción con dirección propia, la única que va al revés y ya está en el archivo
03: **la variable `ARGOS_EXIGE_JWT=true` de la función se enciende DESPUÉS de que el OTA
con `ARGOS_MANDA_JWT_DEL_USUARIO` encendida llegó a todos.** Ahí el servidor se endurece
al último, porque endurecerlo antes deja fuera a todo el que no haya recibido el OTA.

## Por qué el OTA solo con `npm run sourcemaps:ota` y nunca con `eas update` a secas

Porque son tres pasos que tienen que ser el mismo paquete, y el script los encadena:

1. Borra `dist/` y corre `npx expo export --platform all --output-dir dist`.
2. Publica **ese export exacto** con `npx eas-cli update --input-dir ./dist`.
3. Sube los sourcemaps de **ese mismo** `dist/` a Sentry.

Si corres `eas update` a secas y después subes los sourcemaps aparte, publicas **dos
exports distintos** y los mapas no corresponden al bundle que la gente está corriendo. El
resultado es peor que no tener sourcemaps: **los stacktraces de Sentry mienten**. Te
señalan un archivo y una línea que no son los que fallaron, y persigues fantasmas en
producción, que es justo el momento en el que menos tiempo tienes.

Dos detalles operativos del script: requiere `SENTRY_AUTH_TOKEN` en el entorno o sale con
error, y el paquete que invoca es `eas-cli`, no `eas`.

Uso con parámetros:

```powershell
npm run sourcemaps:ota -- --branch preview --message "que fue lo que entro"
```

## Cómo se revierte

Dos vías, en este orden de preferencia:

**1. El interruptor de pánico.** Poner la bandera correspondiente en `false` en
`src/constants/flags.ts`, correr `npx tsc --noEmit`, publicar el OTA. Revierte
comportamiento sin tocar datos y sin compilar. Es la razón por la que todo lo riesgoso de
este ciclo nació detrás de una bandera.

Lo que hay que entender bien: **apagar la bandera revierte el comportamiento, no los
efectos.** Los electrones que ya se pagaron no se devuelven, lo que ya se sembró en el día
1 se queda, los valores guardados no se reescriben. Cada bandera declara en su comentario
qué **no** deshace, y esa parte del comentario es la importante.

**2. `git revert <hash>`.** Todos los commits del ciclo son independientes entre sí, a
propósito, para que esto funcione.

Y una advertencia del sistema de diseño que se olvida: **la publicación por OTA sube lo que
esté en la rama donde estás parado.** Trabajo en rama sin fusionar no viaja en la
actualización.

## Reglas de migración que no se rompen

- **Idempotentes obligatorias.** `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`. Una migración
  que no se puede correr dos veces es una bomba.
- **Cada `CREATE TABLE` lleva su `ENABLE ROW LEVEL SECURITY` y su política.** Sin
  excepción.
- El editor de SQL de Supabase es para consultas puntuales y depuración. **Las migraciones
  van por archivo y por `db push`**, para que exista el archivo que las documenta.
- Y la que se aprendió a golpes: **un `CREATE OR REPLACE FUNCTION` restablece los permisos
  por defecto**, que incluyen al rol anónimo. Toda edición de una función blindada tiene
  que volver a revocar, y el revoke va después del replace.

---

# Parte III. Alcance nuevo que todavía no se toca

Dos frentes están escribiéndose en paralelo por otros agentes mientras este handover se
redacta. Aquí solo se nombran y se enlazan; el criterio vive en sus propios documentos.

**1. La pasarela central de alta y el CRM.** Todo lo que pasa entre que alguien decide
pagar y que alguien está adentro y atendido: el cobro, la creación de accesos, los correos
transaccionales, el alta en la comunidad, el CRM y el cuidado del cliente. Es la pieza que
el pivote a membresía única volvió a poner sobre la mesa, porque el puente entre el cobro
en web y el acceso en la aplicación (el código de activación) fue diseñado cuando todavía
había niveles. Su documento aterrizará en `R and D/`.

**2. La experiencia de usuario del onboarding.** Que entrar se sienta rico. Hoy el
onboarding son nueve pantallas y el conteo hasta la primera acción útil es de unos 28
toques sin el tour guiado y unos 40 con él, y los cinco puntos de fuga del día 1 (archivo
03) son en buena medida un problema de onboarding, no de funciones faltantes. Su documento
también aterrizará en `R and D/`.

**No los adelantes.** Si te toca alguno, lee primero el documento correspondiente y
después pelotea con el dueño antes de proponer nada cerrado.

---

## Lo que se queda quieto hasta después del 1 de septiembre

Bajo observación, sin trabajo activo: el portal de ciencia (`tools/science-portal`, destino
somosatp.com), ARGOS-BRAIN, argos-coach y el pipeline de audio. Ninguno bloquea el
lanzamiento y todos tienen su propio estado documentado en su propio repositorio.

Catorce días con un solo desarrollador no dan para dos frentes. Esa es la razón, y si el
dueño quiere otro reparto, lo dice él.
