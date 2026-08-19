# Estado real y trampas del entorno

Primero las trampas, porque son las que te pueden costar horas o romperle el entorno al
dueño en los primeros diez minutos. Después el estado, con la distinción que importa más
que cualquier otra: **qué está verificado y qué solo está escrito.**

---

# Parte I. Las trampas del entorno

## 1. Prohibido `npm install`, `npm ci` y `npx eslint`

**Un agente destruyó el `node_modules` del dueño ejecutando esto.** No es una precaución
teórica, ya pasó.

Los tres son igual de peligrosos por la misma razón: `npx eslint` no está instalado como
binario local en la forma en que se invoca, así que `npx` lo resuelve descargándolo, y esa
descarga dispara un postinstall que reescribe el árbol de dependencias. El resultado es un
`node_modules` inconsistente en la máquina del único desarrollador del proyecto, catorce
días antes del lanzamiento.

El script de linting existe (`npm run lint`, que llama a `expo lint`) y **lo corre el
dueño**, no tú.

Si crees que necesitas instalar una dependencia: no la instales. Escribe qué necesitas y
por qué, y déjaselo al dueño.

## 2. `vitest` no corre en Linux

El `node_modules` del repositorio trae binarios compilados para Windows. Cualquier agente
que trabaje en un entorno Linux (que es donde corren los agentes) **no puede ejecutar las
pruebas**. Ni una.

Hay **347 archivos de prueba sobre 976 archivos de código** en `src/` y `app/` (medido el
18 de agosto de 2026) y **nadie sabe si están verdes**. Esa frase es literal y es el hueco
de verificación más grande del proyecto.

El denominador anterior que traía este documento (1,321) estaba inflado en un tercio y
hacía ver la cobertura peor de lo que es. La proporción real es mejor. Lo que la
proporción **no** te dice es qué miden esas pruebas: eso está en `09_LO_QUE_LA_SUITE_NO_MIDE.md`
y es la lectura que de verdad importa antes de creerle a un número en verde.

**Solo el dueño puede correr `npm test`.** Lo que puedes hacer tú: escribir las pruebas,
dejarlas listas, y decirle explícitamente que la corrida que cuenta es la suya. Nunca
declares algo verificado apoyándote en tests que no viste correr.

Lo mismo aplica en menor grado a `npx tsc --noEmit`: sí se puede correr, pero la que vale
para el push es la de su máquina.

## 3. Un worktree por agente. El checkout principal es del dueño

Nunca escribes en `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer` directamente. Ese es su
espacio de trabajo. Trabajas en un árbol propio con `git worktree` y **él hace el merge**.

Hoy hay trece worktrees vivos bajo `.worktrees/` y una treintena más marcados como
`prunable` en `D:\Proyectos_ClaudeCode\ELITE_Timer\ATP-*`, restos de ciclos anteriores. Dos
están bloqueados a propósito (`ola0-limpieza` y `ola4-tests`). No los limpies sin
preguntar: `prunable` significa que el directorio ya no está, no que la rama sobre.

## 4. `git worktree add` se cuelga sobre este mount

Crear un worktree sobre este montaje se cuelga y deja el worktree **sin índice**, o sea
inutilizable y de una forma que no es obvia: el directorio existe, git responde, y todo
parece bien hasta que un comando falla de manera rara.

**La reparación:**

```powershell
git reset --hard HEAD
```

Dentro del worktree afectado. Reconstruye el índice desde el árbol.

## 5. El evento de los 188 archivos que no habían cambiado

Hubo un episodio en el que git reportó 188 archivos modificados y ninguno lo estaba: la
diferencia era **solo el final de línea**, CRLF de Windows contra LF de Linux. Es lo que
pasa cuando un agente en Linux escribe en un árbol que Windows creó.

Un commit de 188 archivos con cero cambios reales destruye el historial: `git blame`
pierde utilidad, la revisión se vuelve imposible, y los conflictos de merge se multiplican.

**Cómo se detecta:**

```powershell
git diff --ignore-cr-at-eol
```

Si eso sale vacío y `git diff` no, entonces no cambió nada. No lo commitees.

## 6. OneDrive: la trampa es real, pero NO aplica al repositorio

**Corrección del 18 de agosto de 2026. Lee esto antes de mover nada.**

**El repositorio de código NO está en OneDrive.** Está en
`D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`, verificado con `git worktree list`, y
todos los worktrees de este ciclo cuelgan de `D:\Proyectos_ClaudeCode\`. Si en cualquier
documento lees "el repo está en OneDrive", está mal: **corrígelo en cuanto lo veas**, o
alguien va a mover un repositorio de casi 1,940 commits para nada.

Lo que **sí** vive en OneDrive son los documentos de negocio, en
`C:\Users\ezapa\OneDrive\EZ online\ATP\`: lo legal, el modelo financiero y el material que
`CLAUDE.md` referencia. Sobre esas rutas, y solo sobre esas:

- Un `ls -la` o un `du` te da **tamaños obsoletos**, porque OneDrive presenta el marcador
  del archivo y no el contenido sincronizado. No tomes decisiones sobre esos números.
- Puede haber bloqueos de archivo cuando dos procesos tocan lo mismo.

**Lo que se elimina de este documento:** la receta de `.git/index.lock` más
`git reset --hard`. Nació de la premisa equivocada, y `git reset --hard` como consejo por
defecto sobre el árbol de trabajo del dueño destruye trabajo sin preguntar. Si alguna vez
hace falta, que sea una decisión consciente y no una receta copiada.

(La reparación de `git reset --hard` **dentro de un worktree propio recién creado y sin
índice** sigue siendo válida y está en la trampa 4. Es otro caso y no se toca.)

## 7. Windows y PowerShell, sin `&&`

Ya está en el archivo 01 y lo repito aquí porque es donde se busca. Los comandos que le
entregas al dueño van en PowerShell, una línea por renglón, sin `&&`, con rutas absolutas.

---

# Parte II. El estado real hoy

**Fecha de corte: 18 de agosto de 2026.** Rama `main`, HEAD `f9bd843`.

## Tamaño

| Qué | Cuánto |
|---|---|
**Todo lo de esta tabla se midió el 18 de agosto de 2026.** Si hoy no es ese día, vuelve a
medir antes de citarla. El comando está junto a cada renglón que cambia solo.

| Qué | Cuánto | Cómo se mide |
|---|---|---|
| Commits | 1,938 | `git rev-list --count HEAD` |
| Líneas en `src/` y `app/` | ~231,563 | |
| Archivos de ruta en `app/` | 203 | |
| Pantallas reales | ~145 | |
| Redirects y alias | ~57 | |
| Archivos de código en `src/` y `app/` | 976 | |
| Archivos de prueba | 347 (estado desconocido) | `find src supabase/functions -path "*__tests__*" -name "*.test.ts" \| wc -l` |
| Migraciones SQL | 220 (la más alta es la 295) | `ls supabase/migrations/ \| wc -l` |
| Funciones de borde | 14 más `_shared` | |
| Banderas en `src/constants/flags.ts` | **18** | `grep -c "^export const" src/constants/flags.ts` |

**Aviso sobre `CLAUDE.md`.** Ya fue corregido el 18 de agosto (commit `0983ab4`) y hoy dice
142 pantallas y 236 mil líneas. La versión anterior decía 89 pantallas, 68 mil líneas y 430
commits, y esos números llevaban **dos meses** mintiendo en el primer archivo que lee
cualquiera que llega. El resto de `CLAUDE.md` sigue vigente y es lectura obligatoria.

**Y la lección, que vale más que la tabla:** el número de banderas pasó por tres cifras
distintas (11 → 17 → 18) en veinticuatro horas, y ninguna era un error de quien la
escribió: cada una era correcta el día que se midió. El problema no es que los números
envejezcan, es que **se copian entre documentos en vez de medirse**. Mide y pon la fecha.

## El binario

**2.2.0** (Android versionCode 23, iOS build 5). Es el último build antes del lanzamiento.
Lleva HealthKit, Health Connect, cámara y widgets ya compilados.

Esto tiene una consecuencia que gobierna todo el plan: **todo lo que salga de aquí al 1 de
septiembre viaja por actualización de JavaScript.** El plan de reversión completo asume
eso, y es cierto para las 18 banderas y **falso para cualquier bug nativo**. Un solo
problema nativo obliga a compilar, y compilar reinicia la revisión de la tienda.

Por eso el recorrido en el teléfono no es opcional.

## Las banderas

`src/constants/flags.ts` es el mejor archivo del repositorio. Cada bandera documenta en su
comentario qué hace, qué pasa al apagarla, qué **no** deshace al apagarla, y de qué
migración depende. Léelo entero antes de tocar nada; te ahorra leer veinte documentos.

**18 banderas. 16 encendidas, 2 apagadas.** Medido el 18 de agosto de 2026 con
`grep -c "^export const" src/constants/flags.ts`. **No copies este número: vuelve a
correr el comando.**

Encendidas (16): `INTERVENTIONS_DRIVE_HOY`, `LOGIN_PASA_POR_GATE`,
`TABS_EXIGEN_CONSENTIMIENTO`, `DIA_1_SIEMBRA_SUAVE`, `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA`,
`RANGOS_UNA_SOLA_FUENTE`, `INSIGHT_EN_VENTANA`, `ARGOS_LEE_LABS_DE_VERDAD`,
`LABS_UNIDADES_ALINEADAS`, `LABS_FICHA_POR_BIOMARCADOR`, `AUTH_RESPETA_EL_TEMA`,
`UMBRALES_FEMENINOS_EN_EL_SCORE`, `SEXO_NO_SE_ADIVINA`, `ARGOS_MANDA_JWT_DEL_USUARIO`,
`ARGOS_RESUELVE_RUTAS_DINAMICAS`, `ARGOS_LIMITE_DE_ALCANCE`.

(La que faltaba en la lista anterior de este documento era `TABS_EXIGEN_CONSENTIMIENTO`,
que no es una cualquiera: es la que exige consentimiento para entrar a los tabs.)

**Tres de ellas están clavadas en `true` por un test y esto no está en ningún otro
documento de handoff:** `LOGIN_PASA_POR_GATE` y `TABS_EXIGEN_CONSENTIMIENTO`
(`consent-puertas.test.ts:182` y `:88`) y `ARGOS_LIMITE_DE_ALCANCE`
(`argos-alcance-core.test.ts:23`) están fijadas con `expect(FLAG).toBe(true)`. O sea que
el plan de reversión que todos los documentos repiten (cambias el booleano, `tsc`,
`eas update`) **deja la suite roja**. Apagarlas en una emergencia sigue siendo correcto;
solo que no te sorprenda el rojo, y acuérdate de que nadie puede correr la suite salvo el
dueño (ver `08_PUNTO_UNICO_DE_FALLA.md`).

Apagadas a propósito:

- **`FASTING_MEASURED_MODE`.** Encendida mostraría el estado real de ayuno usando el índice
  glucosa/cetonas en vez de la etapa estimada por tiempo. Nace apagada porque necesita
  leerse contra glucosa y cetonas en un teléfono real, y eso no ha pasado.
- **`ARGOS_SUFIJO_DE_EVIDENCIA`.** Apagada quita el aviso de "esta recomendación no tiene
  nivel de evidencia explícito" al final de las respuestas. **El chequeo y el registro
  siguen corriendo**: se apagó el texto, no la observabilidad. Se apagó por criterio de
  producto, no por un bug.

**La dependencia de orden más peligrosa del proyecto** vive solo en un comentario de este
archivo y no está en el runbook: la variable de entorno `ARGOS_EXIGE_JWT=true` de la
función de borde **no se enciende hasta que `ARGOS_MANDA_JWT_DEL_USUARIO` esté encendida
y el OTA haya llegado a todos**. Bandera apagada más variable encendida es igual a nadie
puede usar ARGOS.

**Nota importante sobre el runbook:** `R and D/RUNBOOK_SIN_BUILDS.md` documenta el
interruptor de pánico para **cinco** de las dieciocho banderas. Es de un ciclo anterior.
Las trece restantes, incluidas las de seguridad y las de laboratorio, tienen su reversión
documentada solo en el comentario de `flags.ts`. Eso hay que unificarlo.

## Migraciones

220 archivos. La numeración no es continua, hay saltos al final: 267, luego 275, 276, 290,
295.

Las cuatro últimas (275, 276, 290, 295) **ya están aplicadas al remoto.** Fue verificado el
18 de agosto consultando el historial de migraciones del proyecto. El inventario de
pendientes dice que faltan: ese renglón está obsoleto.

**La 296 está escrita y NO aplicada.** Ver la sección de seguridad abajo.

## Funciones de borde desplegadas

`anthropic-proxy` (legado), `argos-proxy` (el que manda hoy), `argos-voice`,
`award-electrons`, `payment-webhook`, `revenuecat-webhook`, `reclaim-hplus`,
`settle-challenge`, `lab-parser-worker`, `mente-audio-url`, `data-export-generator`,
`account-deletion-processor`, `dispatch-agenda-notifications`,
`dispatch-social-notifications`. Más `_shared`, que no es una función y contiene
`identidad.ts`, la pieza que resuelve la identidad del token en el proxy.

## Observabilidad

Sentry (errores y sesiones, proyecto `atp-mobile` en la organización `atp-v5`) y PostHog
(eventos y ciclo de vida). Las dos validadas en ejecución real. Los sourcemaps se suben en
cada OTA y esa es la razón del punto 8 del archivo 04.

---

## Lo que se verificó y lo que no

Esta distinción es la más importante de todo el handover.

### Verificado

- **El código.** Cinco de los dieciséis bloqueantes del inventario del 17 de agosto se
  cayeron el 18 leyendo el archivo correspondiente. Están documentados en
  `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md` con archivo y línea.
- **La base de datos remota.** El historial de migraciones, la definición de las funciones
  y sus permisos se consultaron directamente.
- **La auditoría visual del 16 de agosto**, con salvedades grandes que explico abajo.

### No verificado

- **Nada corrió en un teléfono.** Ni una pantalla de este ciclo.
- **Nadie sabe si las pruebas pasan.** Ver la trampa 2.
- **El tema claro está a medio pagar.** 70 archivos migrados sin probar.
- **Los dos cuadernillos `.xlsx` de revisión clínica** no se abrieron; solo se confirmó que
  existen.
- **`ClientDetailScreen.tsx`** es el archivo de mayor riesgo del ciclo: **4,250 líneas**
  (medido el 18 de agosto de 2026 con `wc -l`; creció 84 líneas desde que se escribió la
  primera versión de este documento) con unas 1,200 de diferencia por la migración de
  tema. La caja de resumen clínico llegó a
  tener contraste 1.0 en tema claro, o sea invisible, y ninguna prueba lo detectó. Lo
  encontró un ojo humano mirando una captura.

  **Y ninguna prueba lo iba a detectar, por dos razones que hay que decir completas:**
  primero, el archivo tiene **cobertura cero** y está **excluido explícitamente** del único
  guard que lo barrería (`src/__tests__/registro-comida.test.ts:178`, que lo salta por
  nombre). Segundo, en todo el repositorio **no hay una sola prueba de renderizado**: sin
  `jsdom` ni `@testing-library`, ninguna prueba monta una pantalla. Está desarrollado en
  `09_LO_QUE_LA_SUITE_NO_MIDE.md`, y es lectura obligatoria antes de creerle a la suite.

  Se suma que en un teléfono esta pantalla **no se ve nunca**: solo se monta con ancho
  ≥1024 y usuario coach (`COACH_PANEL_MIN_WIDTH = 1024`). O sea que tampoco la iba a
  atrapar un recorrido manual. Es el único módulo del proyecto sin pruebas automáticas
  **ni** pruebas humanas. Antes de tocarle una línea, métela en la lista de
  `mb31b1-ambito.test.ts`.

### Lo que dice la auditoría visual del 16 de agosto

309 capturas en tema claro contra 185 previas en oscuro. El hallazgo que condiciona todo lo
demás: **cerca de un tercio de la corrida no muestra la pantalla que dice el nombre del
archivo.** Tres causas mezcladas, capturas a mitad de transición, estados de carga que
nunca resuelven, y errores reales. El peor error real: las treinta rutas de evaluaciones
dan todas "Evaluación no encontrada".

Y hay una sospecha que no se ha descartado: como el mismo generador de mapa de rutas
alimenta al script de capturas **y** al navegador de ARGOS, es posible que la orbe esté
mandando gente a la pantalla equivocada. Nueve archivos salen idénticos en las dos
corridas, lo que significa que parte del fallo es determinista y no una carrera del script.

Lo que quedó **sin auditar de verdad**: el pilar MENTE, el motor de cuestionarios y buena
parte de FITNESS, porque sus capturas cayeron en carga o en pantalla equivocada.

Los hallazgos de mayor riesgo de negocio y legal: el paywall renderiza sin un solo precio,
el aviso médico de la orbe se trunca, la orbe flotante tapa contenido en más de cuarenta
capturas (incluyendo el botón de guardar y el de otorgar datos sensibles de salud), y un
valor clínico sale con 19 decimales y en la escala equivocada.

### Los cinco puntos de fuga del día 1

Del análisis de adopción, todos con archivo y línea:

1. El día 1 abre con **doce tareas que el usuario nunca eligió**.
2. El atajo más valioso de la aplicación, el armador de paquetes con 42 salidas, vive en el
   **tercer botón** de la última pantalla del onboarding, en letra chica.
3. **La siembra inicial ni siquiera corre** en la mayoría de los casos: se llama desde un
   solo lugar, dentro del montaje de una pestaña que el usuario puede no abrir nunca.
4. **Nadie sabe que la orbe es el buscador de la aplicación.** La capacidad de explicar
   pantallas está escrita y probada, y **no se llama desde ningún lugar fuera de los
   tests**.
5. **Ajustes es la puerta única de media aplicación** y no hay un solo enlace hacia ella en
   todo el código. El icono sobrevive porque está cableado a mano.

El veredicto del documento merece citarse: **no sobra aplicación, sobra aplicación expuesta
el día uno**, y el mecanismo para dosificarla ya existe apagado.

---

## Lo urgente que no puede esperar al lanzamiento

Hay **un hueco de privacidad abierto hoy en producción.** Verificado contra la base real el
18 de agosto, no contra un documento.

**El mecanismo.** La función `invite_client_by_email` corre con permisos de dueño, se salta
la seguridad por renglón, y **no verifica nada**: ni que quien llama sea el coach que dice
ser, ni que sea coach, ni que la persona invitada haya aceptado. El vínculo nace activo.
Hay 44 tablas cuyas políticas de seguridad confían en ese vínculo para dar acceso, y 21 de
ellas lo dan para lectura y escritura: estudios clínicos, síntomas, historia familiar,
diagnóstico funcional, medidas corporales, registros de comida, check-ins emocionales.
Y la función quedó ejecutable por el rol anónimo, cuya llave viaja dentro del paquete de la
aplicación.

Junta las tres piezas: **una llamada con el correo de la víctima abre lectura y escritura
sobre 44 tablas de sus datos de salud.**

**Lo que hace este caso importante más allá del bug.** La migración `227_sec_revoke_anon_rpc`
ya había cerrado ese permiso. Se volvió a abrir sola, porque en Supabase un
`CREATE OR REPLACE FUNCTION` posterior **restablece los permisos por defecto**, y el
predeterminado incluye al rol anónimo. Cualquier edición futura de una función ya blindada
la vuelve a abrir, en silencio.

Y hay una prueba de seguridad que estaba verde todo el tiempo, porque lee el **texto del
archivo de migración** y el archivo seguía diciendo lo correcto. De ahí sale la regla que
está en el archivo 01: un guard estático verifica intención, solo una consulta al servidor
verifica estado.

**La migración de cierre está escrita, es idempotente, y NO está aplicada:**
`R and D/296_sec_invite_consentido.sql`. No se aplicó porque toca producción y toca el panel
de coach, y esa autorización es del dueño. El orden interno de la migración importa y está
explicado adentro: el `CREATE OR REPLACE` va antes del `REVOKE`, porque al revés el revoke
se pierde otra vez, que es exactamente como se perdió el de la 227.

Hay además 37 funciones con permisos de dueño ejecutables por el rol anónimo que **no se
auditaron una por una**, la protección contra contraseñas filtradas está apagada (se
enciende con un interruptor y es gratis), y 9 tablas tienen seguridad por renglón activa
sin políticas, o sea que fallan cerrado y probablemente hay una pantalla rota esperando.

Una que está bien y que nadie debe apagar por error: `get_argos_brain` está abierta al rol
anónimo **a propósito**. Exige una llave que vive dentro de la función de borde y que se
verificó que no viaja en el paquete de la aplicación.
