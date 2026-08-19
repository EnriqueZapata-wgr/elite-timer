# Takeover · Líder de Desarrollo, ATP App y ecosistema ATP

**Fecha:** 18 de agosto de 2026
**Días al 1 de septiembre:** 14
**Alcance que tomo:** ATP App (`EliteTimer`), su base de datos, sus funciones de borde y el proxy de ARGOS

---

## 0 · Lo primero, y no es agradable

Antes de cualquier plan: **hay un hoyo de privacidad abierto hoy en producción que
expone los expedientes de salud de tus usuarios, y se explota sabiendo nada más un
correo electrónico.** Está verificado contra la base real, no contra un documento.
Está en la sección 2 con nombre, archivo y consulta. Si solo vas a leer una cosa de
todo esto, lee esa.

Lo demás sí es buena noticia. El proyecto no está en mal estado: está **mal medido**,
que es distinto y se arregla más rápido.

Encontré unos sesenta documentos de auditoría en `R and D`, un inventario de 83
pendientes escrito el 17 de agosto, y commits del **mismo 17 de agosto** que cierran
cinco de los dieciséis bloqueantes que ese inventario declara abiertos. El documento
nació desactualizado. No por descuido, sino porque nadie tenía el trabajo de mantener
una sola verdad. Ese trabajo es el que tomo.

Verifiqué a mano, contra el código y contra la base remota, cada bloqueante que se
podía verificar sin un teléfono en la mano.

---

## 1 · Los 16 bloqueantes, reconciliados

### Cerrados. Táchalos.

| # | Qué decía el inventario | Estado real | Cómo lo verifiqué |
|---|---|---|---|
| **L-13** | Cuatro migraciones sin aplicar al remoto, y el runbook advierte que al revés la app truena | **Las cuatro están aplicadas:** 275, 276, 290 y 295 | Consulté el historial de migraciones del proyecto `itqkfozqvpwikogggqng` |
| **L-15** | ARGOS puede mandar al usuario a una pantalla que no existe, 10 plantillas con corchetes sin filtrar | **Cerrado.** `argos-nav-dinamicas-core.ts` filtra con `esPlantilla()`, y las plantillas que no se expanden están declaradas con motivo | Leí el archivo. Hay test que exige que toda plantilla esté clasificada |
| **L-16** | El proxy de ARGOS confía en el `userId` del cuerpo de la petición | **Cerrado en el proxy.** Línea 969: "SEG-1: `userId` YA NO se saca del cuerpo. Sale de la identidad resuelta" | Leí `supabase/functions/argos-proxy/index.ts` |
| **L-5** | Los pesos de la Edad ATP son placeholder, o sea el número que vende el producto no usa el algoritmo real | **Nunca fue cierto desde el 8 de junio.** Los pesos reales entraron a las 11:15 de ese día y hay test de regresión que exige el `SF=0.6083`. Lo que estaba mal era un comentario | Leí `edad-atp-v2-model.ts:200` en adelante |

Sobre L-5 vale la pena detenerse, porque es la lección más cara del expediente: **un
comentario que miente cuesta lo mismo que un número que miente.** Ese comentario
convirtió durante dos meses una función correcta en un bloqueante inexistente, y te
tenía a punto de congelar detrás de una bandera el número que vende el producto entero.

### Cerrado en parte

**L-4 · Umbrales de hombre aplicados a mujeres.** De los 98 parámetros definidos, 95
traían el arreglo femenino idéntico al masculino. Los 15 en los que la matriz V6 declara
umbral femenino propio ya se leen de ahí, detrás de la bandera
`UMBRALES_FEMENINOS_EN_EL_SCORE`. Los arreglos viejos se dejaron a propósito como camino
de regreso. **Lo que falta no es código: es que la matriz declare umbral femenino para
los parámetros restantes, y eso lo firma Mariana.**

### Abiertos, verificados hoy en el código

| # | Qué es | Dónde | Tamaño |
|---|---|---|---|
| **L-1** | El aviso de privacidad y los términos no identifican al responsable. Sigue el literal `[RAZÓN SOCIAL, S.A.S. de C.V.]` y `[CALLE, NÚMERO, COLONIA, C.P., QUERÉTARO, MÉXICO]` | `src/constants/legal-texts.ts:39` y `:93` | Trivial en código, **es trámite tuyo** |
| **L-2** | La cláusula Founders promete reembolso prorrateado sobre `[10]` años. Cifra con consecuencia jurídica, escrita como placeholder | `legal-texts.ts:113` | Trivial, **decisión tuya** |
| **L-6** | La app le confiesa al usuario que está a medio hacer: "El modo claro va llegando por partes... mientras terminamos la migración" | `app/settings/experiencia.tsx:104-105` | Trivial |
| **L-7** | Cada navegación en tema claro da un destello negro, porque el contenedor sigue montando `DarkTheme` | `app/_layout.tsx:74` y `:76` | Chico |

**L-3** (tres errores de matriz que dan veredicto de salud equivocado) sigue abierto y no
es de código: es firma clínica. **L-8 a L-12 y L-14** no son verificables desde aquí: son
teléfono, tiendas y secretos.

---

## 2 · Lo que encontré y nadie tenía anotado

Todo verificado contra la base de producción.

### 🔴 S-1 · Cualquiera puede leer el expediente de salud de cualquier usuario sabiendo su correo

Este es el hallazgo grave y es de los que se arreglan hoy, con o sin lanzamiento.

**El mecanismo, en tres piezas que por separado se ven inocentes:**

**Pieza 1.** La función `invite_client_by_email(p_coach_id uuid, p_email text)` es
`SECURITY DEFINER`, o sea que corre con permisos de dueño y se salta toda la seguridad
por renglón. Su cuerpo, tal cual está hoy en producción:

```sql
SELECT id INTO v_client_id FROM profiles WHERE email = p_email;
...
INSERT INTO coach_clients (coach_id, client_id, status)
VALUES (p_coach_id, v_client_id, 'active')
ON CONFLICT (coach_id, client_id) DO UPDATE SET status = 'active';
```

**No verifica nada.** Ni que quien llama sea el coach que dice ser, ni que sea coach
siquiera, ni que la persona invitada haya aceptado. El vínculo nace `'active'`.

**Pieza 2.** Consulté las políticas de seguridad por renglón que dependen de esa tabla:
**44 tablas confían en `coach_clients` con estado `'active'` para dar acceso, y 21 de
ellas lo dan para lectura y escritura.** Entre ellas: estudios clínicos, síntomas
clínicos, historia familiar, diagnóstico funcional, medidas corporales, registros de
comida, check-ins emocionales, ayunos, planes diarios y reportes de inteligencia
artificial.

**Pieza 3.** La función quedó **ejecutable por el rol `anon`**, y la llave anónima viaja
dentro del paquete de la app, o sea que es pública por diseño.

**Junta las tres:** una sola llamada con el correo de la víctima y un identificador de
cuenta propio abre lectura y escritura sobre 44 tablas de datos de salud de esa persona.
Sin su consentimiento y sin que se entere. Verifiqué el mecanismo leyendo la definición
de la función, sus permisos y las 44 políticas. **No lo ejecuté contra datos de nadie**,
y te recomiendo que tampoco: si esto se dispara, se dispara en una cuenta de prueba.

**Y hay un agravante:** la migración `227_sec_revoke_anon_rpc` **ya había revocado `anon`
sobre esta función**. Verifiqué las once funciones de esa lista: diez siguen cerradas y
esta volvió a abrirse. La causa es de las que muerden dos veces: en Supabase un
`CREATE OR REPLACE FUNCTION` posterior restablece los permisos por defecto, y el
predeterminado incluye a `anon`. Cualquier edición futura de una función ya blindada la
vuelve a abrir, en silencio.

**Lo que hay que entender es que aquí hay dos problemas, no uno:**

- El **permiso** (que `anon` pueda llamarla) es un bug y se cierra con una línea.
- El **diseño** (que un vínculo de coach nazca activo sin que el paciente lo acepte) es
  una decisión vieja, de la migración 008, y sigue mal aunque cierres el permiso:
  cualquier usuario con cuenta puede seguir haciéndolo. La app ya tiene el camino
  correcto construido al lado, `connect_to_coach(p_code)`, que exige un código que el
  coach entrega. Ese sí pide consentimiento.

Dejé la migración de cierre escrita y lista, en `296_sec_invite_consentido.sql`. **No la
apliqué:** toca producción y toca tu panel de coach, y esa autorización es tuya. Está en
la sección 5.

### S-2 · Los tests de seguridad están verdes y la base está abierta

`src/services/__tests__/mbsec1-superficie.test.ts` es un guard estático bien pensado que
**lee el texto de los archivos de migración** y fija invariantes sobre él. Pero valida el
SQL escrito, no el estado de la base. Por eso S-1 pasó desapercibido: el archivo 227
sigue diciendo lo correcto, el test sigue pasando, y el permiso real ya se revirtió hace
tiempo.

**Criterio que impongo desde hoy:** un test que lee un archivo de migración verifica
intención. Solo una consulta a `has_function_privilege` contra la base verifica
seguridad. El guard estático se queda, y arriba va uno que le pregunta al servidor.

### S-3 · La superficie completa, para que sepas el tamaño

Corrí el asesor de seguridad del proyecto. 99 avisos, cero de nivel error, lo cual
explica por qué nadie lo había mirado:

- **37 funciones `SECURITY DEFINER` ejecutables por `anon`.** Además de la de arriba:
  `connect_to_coach`, `assign_routine_to_client`, `clone_from_share`, `report_user`,
  `handle_new_user`, `trigger_lab_parser_worker`. **No las audité una por una.** La
  mayoría probablemente falla sola porque deriva el usuario del token y con `anon` no hay
  token, pero eso hay que comprobarlo función por función. La de arriba es justamente la
  que no lo hace.
- **50 más ejecutables por `authenticated`**, superficie legítima pero sin auditar.
- **9 tablas con seguridad por renglón activa y sin políticas.** Fallan cerrado, así que
  no son fuga, pero tres son de `elite_dx` (`clients`, `intake`, `braverman_results`) y
  hay que confirmar que ninguna pantalla las lea, o son una función rota esperando a que
  alguien la reporte.
- **La protección contra contraseñas filtradas está apagada.** Se enciende con un
  interruptor en Autenticación y es gratis.

### S-4 · Una menor, y una nota para que no rompan algo que está bien

`increment_argos_usage(p_user_id uuid)` también quedó abierta a `anon` y no verifica
nada. **Impacto real: bajo, y quiero ser preciso porque el nombre asusta.** Ese contador
ya no decide nada: el comentario del proxy lo dice claro, "este contador MIDE, ya no
decide", y quien corta es `consume_argos_spend`, en dinero. Verifiqué que las cuatro
funciones nuevas del techo por gasto están correctamente cerradas a `anon` **y** a
`authenticated`. O sea que el trabajo reciente de seguridad está bien hecho: lo que
quedó abierto es la puerta vieja. Alguien puede ensuciar la métrica de uso de otro
usuario, no tumbarle el acceso. Se cierra en la misma migración.

Y una a favor, para que nadie la apague por error: **`get_argos_brain` está abierta a
`anon` a propósito y está bien así.** Exige una llave que vive dentro de la función de
borde, y verifiqué que **no viaja en el paquete de la app**. Esa no se toca.

---

## 3 · La ruta crítica a 14 días

El veredicto anterior era "alcanzable, pero no por el camino que la lista sugiere".
Coincido, y con los cinco bloqueantes que se cayeron la fecha pinta mejor de lo que el
inventario decía. Lo que decide el 1 de septiembre casi no es escribir código.

**Hoy, sin esperar nada:**

0. **Cerrar S-1.** No está en el camino crítico del lanzamiento: está antes. Hay usuarios
   reales con datos reales adentro hoy.
1. **Mandar el cuadernillo de la matriz a firma clínica.** Es lo único con dependencia
   externa y plazo que no controlas. Hoy la app le dice a una mujer con T3 en el piso que
   está en 100 de 100. **Sale hoy o el 1 de septiembre se mueve.**
2. **Correr la app en tu teléfono y `npm test` en tu máquina.** Nada de este ciclo ha
   corrido en un dispositivo, y **no quedan builds**: el binario 2.2.0 es el último. El
   plan de reversión asume que todo se apaga por actualización de JavaScript, lo cual es
   cierto para las **18** banderas y falso para cualquier bug nativo. Un solo problema de
   ese tipo te obliga a compilar, y compilar reinicia la revisión de la tienda.

   > **Corregido el 18 de agosto de 2026.** Este documento decía 11 y
   > `HANDOVER/03_ESTADO_Y_TRAMPAS.md` decía 17: la misma frase copiada con dos
   > números distintos. El real, medido con
   > `grep -c "^export const" src/constants/flags.ts`, es **18**. Ninguno de los
   > dos era mentira el día que se escribió; los dos se copiaron en vez de
   > medirse. **Vuelve a correr el comando antes de citar el número.**

**Esta semana:**

3. **Los datos de la sociedad** (L-1). Sin razón social y domicilio, el aviso de
   privacidad no cumple la ley mexicana. Eso es rechazo en revisión, no un detalle.
4. **Los cuatro secretos y los productos en las tiendas.** Sin RevenueCat no hay compra
   y sin compra no hay app. Súmale el tiempo de revisión de Apple, que tampoco controlas.
5. **El paquete de una tarde**, todo por actualización de JavaScript: L-2, L-6, L-7, el
   disclaimer de ARGOS completo, y el Hba1c con 19 decimales.

---

## 4 · Cómo va a trabajar el equipo desde hoy

Cuatro reglas, todas respuesta directa a lo que encontré.

**1. Un solo tablero vivo.** Un archivo, `ESTADO.md`, con lo abierto y nada más. Los
sesenta documentos de `R and D` pasan a expediente histórico: se consultan, no se
obedecen. Hoy hay contradicciones documentadas entre archivos del mismo día, y cuando dos
documentos se contradicen significa que nadie sabe cuál es la verdad.

**2. Nada se declara cerrado sin evidencia citable.** Archivo y línea, consulta a la
base, o captura del teléfono. "Se arregló" no es un estado. Los cinco bloqueantes que
tumbé hoy se cayeron por leer código, no por leer reportes.

**3. Un comentario que miente se trata como bug de severidad alta.** L-5 costó dos meses
de un bloqueante que no existía. Toda deuda declarada en un encabezado lleva fecha de
verificación o no vale.

**4. Los guards estáticos verifican intención, no estado.** Todo test de seguridad que
lea un archivo necesita un hermano que le pregunte al servidor. S-1 vivió meses debajo de
una suite verde.

Y una operativa que ya estaba y ratifico: **nunca escribo en tu checkout principal.**
Trabajo en árbol propio con `git worktree` y tú haces el merge.

---

## 5 · Lo que necesito de ti, con el default ya decidido

Siete cosas. En cada una traigo la decisión tomada. Tú solo vetas la que no te lata.

| # | Decisión | Mi default | Si vetas |
|---|---|---|---|
| **1** | **S-1, el permiso.** Revocar `anon` sobre `invite_client_by_email` e `increment_argos_usage` | **Se aplica hoy.** Es la intención original de la migración 227, no cambia comportamiento de la app, y cierra la puerta anónima | Aceptas el riesgo por escrito |
| **2** | **S-1, el diseño.** Que un vínculo de coach nazca `'active'` sin que el paciente acepte | **La función deriva el coach del token y no del parámetro, y sin sesión iniciada no invita a nadie.** El vínculo sigue naciendo activo por ahora, para no romper tu panel a 14 días del lanzamiento, y la aceptación explícita entra en la primera semana de septiembre | Te espero para diseñarlo bien antes de tocar nada |
| **3** | Razón social y domicilio | Si la sociedad no está constituida, **sales como persona física** con tu RFC y domicilio fiscal. Cumple la ley y se cambia después por actualización | Esperas a la SAS y la fecha se mueve |
| **4** | Cláusula Founders, vida esperada de referencia | **10 años.** Se quita el corchete y se deja el número | Me das otro número |
| **5** | Edad ATP | **Sale como está, sin llamarle estimación.** Ya se verificó que los pesos son los reales y hay test de regresión que lo exige | La dejas como estimación por prudencia comercial |
| **6** | Umbrales femeninos del score funcional | **Sales con la bandera encendida.** Los parámetros sin umbral femenino declarado en la matriz se documentan como rango de referencia general | Congelas el score funcional hasta tener la matriz completa |
| **7** | El trial de 14 días | **No hay trial en el lanzamiento.** Estaba definido para el plan mensual de entrada, que el pivote a membresía única eliminó | Definimos qué significa un trial sin planes |

La migración de la decisión 1 y 2 está escrita, es idempotente, y viene en el archivo
`296_sec_invite_consentido.sql` que acompaña a este documento. Es un `CREATE OR REPLACE` que
agrega el guard contra el token, seguido de los `REVOKE`. El orden importa y va
explicado adentro: al revés, el revoke se pierde otra vez, que es justo como se
perdió el de la 227. Al aplicarla, `npx supabase
db push` desde tu máquina.

---

## 6 · Lo que no puedo hacer yo

Lo digo en vez de rellenar.

- **`npm test` y `npx tsc --noEmit` en tu máquina.** El `node_modules` tiene binarios de
  Windows y ningún agente los ha podido correr. Hay 343 archivos de prueba sobre 1,321 de
  código y **no sé si están verdes**. Todo lo demás en este documento es hipótesis hasta
  que eso pase.
- **El recorrido en el teléfono.** `R and D/RECORRIDO_EN_TELEFONO.md` está bien armado,
  son treinta minutos, empieza por el paywall y hazlo en tema claro, que es el que nunca
  se verificó.
- **Los cuatro secretos y los productos en las tiendas.** Solo tú.
- **La firma clínica.** Solo Mariana.
- **Aplicar la migración 296.** El CLI de Supabase está ligado a tu máquina.

---

## 7 · Lo que se queda quieto

**Bajo observación, sin trabajo activo hasta después del 1 de septiembre:** el portal de
ciencia (`tools/science-portal`, destino somosatp.com), ARGOS-BRAIN, argos-coach y el
pipeline de audio. Ninguno bloquea el lanzamiento y todos tienen su propio estado
documentado.

Catorce días con un solo desarrollador no dan para dos frentes. Si quieres otro reparto,
dímelo y lo ajusto.
