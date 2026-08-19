# Entrevista de entrega · RESPONDIDA

**Proyecto:** ATP App y ecosistema ATP
**Fecha de la entrevista:** 18 de agosto de 2026
**Fecha de estas respuestas:** 18 de agosto de 2026
**Quién contesta:** la sesión de desarrollo saliente, con verificación contra el repo en `main` (HEAD `6519492`)

---

## Advertencia de método, antes de la primera respuesta

Todo lo que aquí dice `[VERIFICADO]` se comprobó con un comando o leyendo el archivo, y
digo cuál. Lo que dice `[CREO]` es lectura sin comprobar. Lo que dice `[ME LO DIJERON]`
viene de otra sesión o de un documento y no lo pude cerrar solo.

**Contesté las 72 preguntas.** Y sí, son 72, no "unas 70": las conté
(`grep -c "^\*\*[A-L][0-9]"`), porque este documento entero trata de no repetir números sin
medirlos. **Nueve quedaron en `NO SÉ` puro y otras once tienen una parte en `NO SÉ`.** No
rellené ninguna.

**Cinco premisas de la propia entrevista resultaron falsas al verificarlas.** Están
marcadas con 🔺 donde aparecen. No es reproche: es exactamente lo que la regla 5 pedía.
La lista corta, para que no se pierda:

1. **Las banderas no son 17. Son 18.** Y el "11" tampoco era un error: era correcto el
   día que se escribió.
2. **El repo no está en OneDrive.** Está en `D:\Proyectos_ClaudeCode`. Los documentos de
   negocio sí están en OneDrive, el código no.
3. **No hay un worktree bloqueado. Hay dos.** Y ninguno de los dos tiene trabajo adentro.
4. **El motor del coach no está en una rama sin mergear.** Está en `main` desde el 2 de
   junio. El pendiente T-10 manda al siguiente a buscar una rama que no existe.
5. **El PRD de ELITE Coach App de marzo de 2026 no existe en el repo.** La única fuente
   que afirma que existe es esta entrevista.

Y una que no es premisa falsa sino hueco que nadie había visto, y que en mi opinión es
lo más grave de todo el documento: **el cerebro de ARGOS que corre dentro del proxy está
dos versiones atrás del repo del cerebro.** Detalle en G1.

---

# BLOQUE A · Qué está pasando ahora mismo

**A1.** `P0` ¿Hay trabajo tuyo sin commitear, a medias, o en una rama que no me
mencionaste?

> _Respuesta:_
>
> `[VERIFICADO]` con `git status --porcelain` sobre `main`. **Hay exactamente tres
> archivos sin commitear, los tres sin trackear, ninguno es código:**
>
> | Archivo | Qué es | Qué le falta |
> |---|---|---|
> | `R and D/296_sec_invite_consentido.sql` | La migración que cierra el hoyo de privacidad | **Aplicarse.** Y antes, moverse a `supabase/migrations/` |
> | `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md` | El documento de toma de mando | Nada, es prosa |
> | `R and D/ENTREVISTA_HANDOFF_DEV_2026-08-18.md` | Esta entrevista | Nada |
>
> **El detalle que importa y que no está escrito en ningún lado:** el archivo `296` vive
> en `R and D/`, **no** en `supabase/migrations/`. `npx supabase db push` no lo va a ver
> nunca. Quien lo aplique tiene que moverlo primero. `[VERIFICADO]`: no existe ningún
> archivo con prefijo `296` en `supabase/migrations/` (el último es
> `295_techo_por_gasto.sql`).
>
> **Ramas:** `[VERIFICADO]` con `git log --all --not main --oneline --since="2026-08-01"`
> → **cero commits**. Nada de este ciclo quedó fuera de `main`. Lo que sí hay fuera de
> `main` es trabajo viejo de mayo a julio, y está en E4.

---

**A2.** `P0` ¿Hay algo que dejaste **a propósito** en un estado roto o parcial?

> _Respuesta:_
>
> Sí, cuatro cosas. Las cuatro son decisiones, no descuidos, pero solo dos están
> documentadas donde alguien las va a encontrar.
>
> **1. El QR clínico no se construyó.** `[VERIFICADO]` leyendo
> `src/components/salud/QrFicha.tsx:1-65`. El componente que existe es el QR **público**
> de la ficha de emergencia, que sí funciona y sí renderiza (`QrFicha.tsx:88`,
> `:104-116`), y lo consume un solo archivo, `app/ficha-emergencia.tsx:29` y `:169`.
>
> 🔺 **Corrección a lo que se me dijo:** el encabezado documenta **cuatro** decisiones
> pendientes, no tres (`QrFicha.tsx:34-51`). La cuarta, que es la que más me preocupa,
> es *qué es "la historia clínica completa"*: hay cuatro documentos construidos y no son
> el mismo (`historia_clinica.data`, el reporte de consulta, el timeline del expediente y
> el export maestro). Alguien va a imprimir el equivocado.
>
> La que bloquea todo lo demás sí es la que me contaron: `associatedDomains` e
> `intentFilters` son configuración nativa, o sea build, y no quedan builds. Cita textual
> de `QrFicha.tsx:38-40`.
>
> Y un detalle de seguridad que el encabezado declara y nadie recogió: `user_data_access_log`
> ya existe con `accessor_role`, `access_type` y `resource`, **y nadie escribe en ella
> todavía** (`QrFicha.tsx:44-47`). O sea que si el QR clínico se construye mañana, no hay
> rastro de quién entró.
>
> **2. `packBooleans` está escrito, probado en el papel y muerto.** `[VERIFICADO]`:
> - Se define en `src/services/hoy/install-core.ts:183` y se reenvía en
>   `src/services/hoy/install-service.ts:193-196` y `:227`.
> - **El único llamador real es `app/onboarding/v2/notifications.tsx:71`, y llama
>   `sembrarDia1(user.id)` sin segundo argumento.**
> - La razón es la que me contaron y la confirmo: el pack se elige después de
>   notificaciones, así que al cerrar el onboarding todavía no existe.
>
> 🔺 **Corrección:** me dijeron que estaba "probado". **No lo está.**
> `[VERIFICADO]` con búsqueda de `siembraDia1|sembrarDia1` en todos los `.test.ts` del
> repo: **cero resultados**. `src/services/hoy/__tests__/install-core.test.ts` existe pero
> prueba `seedInitialApps`, que es otra función. O sea que el día que alguien le pase el
> argumento, no hay red debajo.
>
> **3. `ARGOS_EXIGE_JWT` está apagado a propósito.** `[VERIFICADO]` en cuanto al
> mecanismo, `NO SÉ` en cuanto al valor real.
> - Es una variable de entorno del Edge Function, **no una bandera de `flags.ts`**. La lee
>   un solo punto: `supabase/functions/argos-proxy/index.ts:909`.
> - La consume `supabase/functions/_shared/identidad.ts:98-135`; si el JWT no verifica,
>   devuelve `rechazar: true` y el proxy responde 401 (`argos-proxy/index.ts:918-919`).
> - **El default con la variable ausente es `false`**, porque la comparación es estricta
>   contra el string `"true"`. O sea que si nadie la puso, está apagada.
> - `supabase/config.toml:20-22` deja escrito el porqué: no prender hasta que el OTA con
>   `ARGOS_MANDA_JWT_DEL_USUARIO` haya llegado a todos.
> - **Su valor hoy en producción: `NO SÉ`.** Es un secreto remoto de Supabase, no vive en
>   el repo. Lo que los documentos dicen es intención, no verificación.
>
> **4. Los 13 casos de la matriz clínica esperan firma.** Ver K2, donde hay una sorpresa:
> los cuadernillos son dos y los números son tres.
>
> **Y una quinta que no me contaron y encontré yo:** `[VERIFICADO]` en
> `supabase/migrations/190_social_notifications.sql:177-186`, el cron
> `dispatch-social-notifications-minutely` **está comentado**. La edge function existe y
> está desplegada, pero nada la dispara. El runbook de día de lanzamiento
> (`Business development/Beta_Launch_Kit/07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md:28`) la
> lista como requerida. O las notificaciones sociales no salen, o alguien tiene que
> descomentar ese cron antes del 1 de septiembre.

---

**A3.** `P0` Si yo hago `eas update --branch preview` con `main` tal como está, **¿qué se
rompe?**

> _Respuesta:_
>
> **Se rompen los stacktraces de Sentry, en silencio, y esa es la respuesta corta.**
>
> `[VERIFICADO]` leyendo `scripts/upload-ota-sourcemaps.mjs:66-82`. El script hace **tres**
> pasos, no uno:
> 1. `rmSync('dist')` + `npx expo export --platform all --output-dir dist` (`:67-68`)
> 2. `npx eas-cli update --branch <branch> --input-dir ./dist --non-interactive` (`:74`)
> 3. `npx sentry-cli sourcemaps upload --org atp-v5 --project atp-mobile --strip-prefix dist dist` (`:77-82`)
>
> El orden importa: se exporta primero **para que `eas update` publique exactamente ese
> bundle** y los `.map` casen por Debug ID. Con `eas update` a secas el bundle se
> reempaqueta y sus mapas nunca llegan a Sentry. Y si después alguien sube los mapas por
> separado, el hash ya no coincide: **los stacktraces no se pierden, mienten**, que es
> peor. Está escrito en `R and D/RUNBOOK_SIN_BUILDS.md:27-30`.
>
> **Lo segundo que se rompe, y esto es más grave:** el runbook exige `npx supabase db push`
> **antes** del OTA (`RUNBOOK_SIN_BUILDS.md:24-26`, "si el JavaScript sale primero, la app
> busca tablas que todavía no existen y truena"). Si publicas hoy sin haber aplicado
> migraciones pendientes, truena.
>
> 🔺 **Aquí hay una contradicción entre dos documentos que nadie resolvió:**
> `RUNBOOK_SIN_BUILDS.md:32-33` dice que faltan **dos** migraciones (275 y 276).
> `R and D/PENDIENTES_COMPLETOS_2026-08-17.md:170-176` (L-13) dice **cuatro** (más 290 y
> 295). Y `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md:37` dice que **las cuatro ya están
> aplicadas**, verificado contra el historial del proyecto remoto. `[ME LO DIJERON]` en
> ese último caso: yo no puedo consultar el remoto desde aquí. **Antes de publicar, corre
> `npx supabase migration list` y créele a eso, no a los tres documentos.**
>
> **Y una trampa de despliegue que no está en el runbook:** `[VERIFICADO]` en
> `docs/ECONOMIA_OPERACION.md:38`, ese documento dice `eas update --branch preview`, o sea
> exactamente el comando que el runbook prohíbe. Si alguien sigue el documento de economía
> al pie de la letra, publica con los mapas rotos y no se entera.

---

**A4.** `P0` ¿Cuál fue la última vez que `npm test` corrió completo y verde, y quién lo
corrió? Misma pregunta para `npx tsc --noEmit`.

> _Respuesta:_
>
> **`NO SÉ` la fecha, y eso es exactamente el problema.**
>
> Lo que sí puedo afirmar: `[VERIFICADO]` **ningún agente de este ciclo corrió `vitest`.**
> El `node_modules` tiene binarios de Windows y el entorno de los agentes es Linux, y
> `npm install` estaba prohibido porque un agente ya había destruido el entorno así.
> Todos verificaron con arneses propios. Hay evidencia de esa práctica dentro del propio
> repo: `scripts/run-tests-sin-vitest.js` y `scripts/shim-vitest.js` existen precisamente
> para eso `[VERIFICADO]`, están en `scripts/`.
>
> **Solo el dueño ha corrido `npm test` de verdad, y no sé cuándo fue la última.**
> `[ME LO DIJERON]` y no lo puedo cerrar: no hay CI, no hay artefacto de corrida, no hay
> log. `[VERIFICADO]`: `package.json` no tiene ningún script de CI y no existe carpeta
> `.github/workflows` con un job de test.
>
> **Esto lo tiene que contestar el dueño**, porque la respuesta solo vive en su terminal.
>
> Mi lectura sin adornos: **todo lo que este handoff declara "en verde" es hipótesis hasta
> que alguien corra la suite en Windows.** Y hay una razón concreta para dudar, en C6.
>
> Y un dato duro que sí puedo dar y que cambia el tamaño del problema: `[VERIFICADO]` con
> `vitest.config.ts:29-35`, **`npm test` no corre toda la suite**. Ver D4 y C6.

---

**A5.** `P1` ¿Qué estabas haciendo cuando esto se detuvo?

> _Respuesta:_
>
> `[VERIFICADO]` con `git log --oneline -6`. Los últimos seis commits son de una sola
> cosa, el gate de consentimientos, y los dos finales son correcciones sobre corrección:
>
> ```
> 6519492 FIX: extraerJwt, los tres casos borde de una vez
> cf46b21 FIX: extraerJwt trimea antes de quitar el esquema, no despues
> 6edc46c CONSENT: el gate se muda al layout de tabs y cierra las siete puertas de un golpe
> ```
>
> **Dos commits seguidos sobre la misma función de tres líneas es la huella de estar
> cansado.** `cf46b21` arregla un caso y `6519492` dice "los tres casos borde de una vez",
> o sea que el primero fue incompleto. Si yo tuviera que apostar dónde hay un bug que
> nadie ha visto en este ciclo, apostaría a la vecindad de `extraerJwt`.
>
> Lo que quedó abierto en la cabeza y no bajó a archivo: **la duda de si el gate de
> consentimientos, ahora que vive en el layout de tabs, deja fuera alguna ruta que no
> cuelga de tabs.** El commit dice "cierra las siete puertas". Yo no verifiqué que sean
> siete y no ocho.

---

**A6.** `P1` ¿Qué es lo que **menos** confianza te da de este ciclo?

> _Respuesta:_
>
> Cuatro cosas, en orden de qué tan mal duermo.
>
> **1. Nada corrió en un teléfono salvo tres cosas que el dueño probó a mano.**
> `[ME LO DIJERON]`: los labs, ARGOS navegando y la biblioteca de alimentos. Todo lo demás
> del ciclo (HealthKit, Health Connect, el expediente reinventado, Reports con 14 dominios,
> el tema claro, el paywall de membresía única, el gate de consentimientos) **nunca vio un
> dispositivo.** El propio `R and D/RECORRIDO_EN_TELEFONO.md:3` lo abre diciéndolo.
>
> **2. El barrido visual nunca se corrió en tema claro, que es justo el que cambió.**
> Esto lo encontré yo y no está en ningún documento. `[VERIFICADO]`:
> ```
> .maestro/capturas/oscuro/      → 309 archivos
> .maestro/capturas/oscuro-215/  → 185 archivos
> ```
> **No existe `.maestro/capturas/claro/`.** El script lo soporta
> (`scripts/audit-visual.ps1:31`, `.\scripts\audit-visual.ps1 -Tema claro -Espera 2.5`) y
> el recorrido en teléfono insiste en tema claro "que es el que nunca se había verificado",
> pero el barrido automático de tema claro **nunca se corrió**. Cero capturas.
>
> Peor: `[VERIFICADO]` con `git ls-files .maestro/capturas | wc -l` → **0**. Las 494
> capturas **no están en git**. Viven en la máquina del dueño y si esa carpeta se borra, la
> única evidencia visual del ciclo desaparece.
>
> **3. `ClientDetailScreen.tsx`.** Ver B3. Es el mayor blast radius del ciclo y tiene
> cobertura cero.
>
> **4. La suite de pruebas mide menos de lo que parece.** Ver C5 y C6. El titular:
> **50 de 347 archivos de prueba no prueban comportamiento, leen texto.**

---

# BLOQUE B · Lo que sabes y no está escrito en ningún lado

**B1.** `P0` **Las trampas** que no están escritas.

> _Respuesta:_
>
> 🔺 **Empiezo corrigiendo una de las trampas que la pregunta da por buena: el repo NO
> está en OneDrive.**
>
> `[VERIFICADO]`: el worktree principal es
> `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`, confirmado con `git worktree list` y
> con la raíz del `.git`. Lo que sí está en OneDrive es la carpeta de negocio,
> `C:\Users\ezapa\OneDrive\EZ online\ATP`, de donde salen los documentos legales y el
> modelo financiero que `CLAUDE.md` referencia. **La trampa existe, pero aplica a los
> documentos, no al código.** Quien lea "el repo está en OneDrive" va a mover el repo por
> nada y va a dejar los documentos donde sí muerden.
>
> **Las trampas reales que no están escritas:**
>
> **1. `npm test` no corre toda la suite, y el archivo excluido es el motor.**
> `[VERIFICADO]` en `vitest.config.ts:29-35`:
> ```
> exclude: ['node_modules', 'src/engine/__tests__/**'],  // engine.test.ts existente NO se toca
> ```
> `src/engine/__tests__/engine.test.ts` son 384 líneas que cubren el motor de ejecución de
> rutinas (Tabata, la rutina de récord con 239 pasos y 4,076 segundos, `flattenRoutine`,
> `buildTree`, anti acumulación de descansos). **No es un test de vitest**: es un script a
> mano con `assert()` que se corre con `npx tsx` y **nadie lo invoca desde
> `package.json`.** O sea que el motor de rutinas lleva meses sin verificarse y la suite
> verde no lo sabe.
>
> **2. El `include` de vitest exige carpeta `__tests__` y extensión `.ts`.**
> `[VERIFICADO]`, mismo archivo: `include: ['src/**/__tests__/**/*.test.ts', ...]`. Un test
> escrito fuera de una carpeta `__tests__` **no corre jamás y nadie se entera**. Y
> `*.test.tsx` no está en el patrón: el día que alguien escriba un test de componente con
> extensión `.tsx`, pasa en verde sin ejecutarse. Hoy no hay ninguno, así que es una mina
> sin pisar.
>
> **3. Tres banderas están clavadas en `true` por un test.** `[VERIFICADO]`:
> `src/__tests__/consent-puertas.test.ts:88` y `:182`,
> `src/services/__tests__/argos-alcance-core.test.ts:23`. Siguen siendo apagables por OTA,
> pero el plan de reversión que todos los documentos repiten ("cambias el booleano, `tsc`,
> `eas update`") **deja la suite roja**. Quien lo haga a las tres de la mañana en una
> emergencia va a creer que rompió algo más y va a perder media hora buscándolo.
>
> **4. Una migración que se edita después de blindada se vuelve a abrir a `anon`, en
> silencio.** Es la causa raíz del hoyo de privacidad. Ver F2, donde además desmiento la
> explicación que circula.
>
> **5. Los crons no leen el service role de una variable de entorno: lo leen del Vault.**
> `[VERIFICADO]` en `supabase/migrations/099_agenda_cron.sql:13-15`. El secreto se llama
> `service_role_key` y se cargó a mano una sola vez con `vault.create_secret(...)`. **No
> está en ningún `.env` ni en `SECURITY.md`.** Si alguien rota la llave de servicio y no
> actualiza el Vault, los tres crons que llaman edge functions dejan de funcionar sin un
> solo error visible.
>
> **6. Dos migraciones se aplican por una vía distinta al resto.** `[VERIFICADO]`: las
> migraciones 156 y 240 traen aviso de que se aplican vía `execute_sql` del MCP, **no** vía
> `apply_migration`. Quien no lo sepa va a ver un fallo raro y va a suponer lo peor.
>
> **7. El `runtimeVersion` es `appVersion`.** `[VERIFICADO]` en `app.json:149-151` y
> `eas.json:4` (`appVersionSource: "local"`). Bumpear `app.json` a 2.3.0 **deja huérfanos
> por OTA a todos los usuarios de 2.2.0** hasta que instalen un binario nuevo. Casa con la
> regla 11 de `CLAUDE.md`, pero la regla dice "no cambies la versión sin build" y no dice
> *por qué*; el porqué es este.
>
> **8. Windows exige comillas en los argumentos con espacios de `sourcemaps:ota`**, y el
> paquete es `eas-cli`, no `eas`. `[VERIFICADO]` en
> `scripts/upload-ota-sourcemaps.mjs:52-57` y `:71-73`. Los dos footguns están escritos
> dentro del script, o sea que solo los ve quien ya abrió el script.
>
> **9. El barrido visual cuelga si le "mejoras" el loop.** `[VERIFICADO]`, está escrito en
> `scripts/audit-visual.ps1:8-15`: se intentó con `svc power stayon usb`,
> `input keyevent KEYCODE_WAKEUP`, un helper con `Start-Job` y un calentamiento previo, y
> **los cuatro colgaron el script**. Son tres comandos de `adb` en un loop y nada más. Y
> el `$ErrorActionPreference` tiene que ser `Continue`, no `Stop`, porque `adb` escribe
> cosas normales a stderr: con `Stop` la primera corrida reportó "187 rutas fallaron"
> cuando 135 se habían escrito perfectamente (`audit-visual.ps1:47-49`).

---

**B2.** `P0` Los "funciona pero no sé por qué".

> _Respuesta:_
>
> **1. Por qué el permiso de `anon` sobre `invite_client_by_email` se volvió a abrir.**
> Esta es la honesta y es incómoda. La explicación que circula en
> `TAKEOVER_DEV_LEAD_2026-08-18.md:112-117` es que un `CREATE OR REPLACE FUNCTION`
> posterior restableció los permisos por defecto.
>
> 🔺 **Verifiqué esa explicación y el repo no la sostiene.** `[VERIFICADO]`: **no existe
> ningún `CREATE OR REPLACE FUNCTION invite_client_by_email` después de la migración 008.**
> Las únicas cuatro migraciones que la mencionan son 008, 198 (solo en un comentario), 227
> y 228, y la 228 usa `ALTER FUNCTION ... SET search_path`, que **no resetea grants**.
>
> O sea: **la reapertura no está explicada por ninguna migración commiteada.** La causa
> tuvo que ser una edición fuera del repo, por el editor SQL. Hay precedente documentado
> de exactamente eso en `supabase/migrations/198_rewrite_handle_new_user.sql:7-9`:
> *"alguien la redujo vía SQL Editor a un hotfix mínimo"*. **Ese es el verdadero "funciona
> pero no sé por qué" del proyecto: hay objetos de base que se editan fuera del repo y el
> repo no se entera.**
>
> **2. Objetos de base que existen y ninguna migración crea.** `[VERIFICADO]`, y es la
> misma familia del punto anterior. `grep "CREATE SCHEMA"` en las 220 migraciones: **cero
> resultados**. Y sin embargo `public.argos_brain`, `public.argos_config`,
> `public.argos_dx_memory`, `public.push_failure_log` y el esquema entero `elite_dx` se
> documentan con `COMMENT ON TABLE` en `230_sec_rls_documented.sql` **sin que nada los
> haya creado**. La 230 hasta tiene un guard con `to_regclass` porque "el schema elite_dx
> no está en todos los entornos" (`230:10-11`). **Si mañana hay que reconstruir la base
> desde cero con `db push`, esos objetos no nacen.**
>
> **3. El cuerpo de `promote_argos_brain` no existe en ningún repo.** `[VERIFICADO]`,
> buscado en `EliteTimer` y en `ARGOS-BRAIN`. Solo hay llamadas
> (`ARGOS-BRAIN/build/promote-brain.mjs:26`) y menciones
> (`227_sec_revoke_anon_rpc.sql:16,48`). Igual con la columna `is_production` y con la
> firma de tres argumentos de `get_argos_brain(p_product, p_key, p_channel)` que el proxy
> llama en `argos-proxy/index.ts:202-209`, mientras el SQL documental define la de **dos**
> (`ARGOS-BRAIN/build/sql/001_argos_brain.sql:46`). **Funciona en producción y el DDL no
> está en ningún lado.**
>
> **4. El orden `CREATE OR REPLACE` y luego `REVOKE`, nunca al revés.** Funciona y sí sé
> por qué, pero lo pongo aquí porque es el tipo de cosa que se invierte "para que se lea
> mejor" y se pierde el revoke otra vez. Está explicado dentro de
> `R and D/296_sec_invite_consentido.sql:23-24`.
>
> **5. El barrido visual y los tiempos de espera.** El script tiene un `-Espera` de 1.8
> segundos por default. Un tercio de las capturas salió a media transición. **No sé cuál
> es el valor bueno.** El sugerido para tema claro es 2.5 (`audit-visual.ps1:31`) pero eso
> es una corazonada de quien lo escribió, no una medición.

---

**B3.** `P0` `ClientDetailScreen.tsx`. ¿Qué necesito saber antes de tocarlo?

> _Respuesta:_
>
> Esta es, en mi opinión, la respuesta más importante del bloque B.
>
> 🔺 **Primero, el número cambió: son 4,250 líneas, no 4,166.** `[VERIFICADO]` con
> `wc -l`. Creció 84 líneas desde que se escribió la entrevista.
>
> **Lo que tienes que saber, en orden:**
>
> **1. Tiene cobertura de prueba cero, y está excluido a propósito del único guard que lo
> tocaría.** `[VERIFICADO]`: la búsqueda de `ClientDetailScreen|screens/coach` en todos los
> `.test.ts` devuelve **dos resultados y los dos son exclusiones**, en el mismo archivo:
> - `src/__tests__/registro-comida.test.ts:148` (el comentario que explica por qué)
> - `src/__tests__/registro-comida.test.ts:178`, el código:
> ```ts
> if (f === WRITER || f === LEGACY_COACH_WRITER || f === 'src/screens/coach/ClientDetailScreen.tsx') continue;
> ```
> **Ningún test lo ejecuta, lo importa, lo renderiza ni lo lee.** 4,250 líneas, mil
> doscientas de ellas tocadas por un subagente en este ciclo, y la única red que existe es
> `tsc`.
>
> **2. El ratchet anti color a mano no cubre `src/screens/coach/`.** `[VERIFICADO]`: las
> dos suites que prohíben hex escritos a mano barren listas explícitas
> (`src/constants/__tests__/mb31b-remate.test.ts:48-81` y
> `src/constants/__tests__/mb31b1-ambito.test.ts:30-46`) y **ninguna de las dos incluye
> `src/screens/coach/`**. Hoy quedan tres hex a mano en el archivo (`#0a1a15`, `#1a0a0a`,
> `#D4537E`) que ningún guard vigila.
>
> **3. Por eso el bug de contraste 1.0 no lo atrapó nada, y quiero ser preciso porque la
> conclusión fácil es la equivocada.** `[VERIFICADO]`: **sí existen tests de contraste
> WCAG que calculan la razón de verdad**, no que comparan strings. Viven en
> `src/utils/contrast.ts` (`contrastRatio`, `relativeLuminance`, `compositeOver`) y los
> usan cinco suites. El problema no es que falten: es que **las listas de pares están
> escritas a mano** (`mb31b-remate.test.ts:144`, `mb31b1-ambito.test.ts:107` son arreglos
> literales de `[nombre, frente, fondo, mínimo]`). **Ningún test deriva pares de frente y
> fondo del código real de una pantalla.** Verifican que los tokens son sanos, nunca que
> una pantalla los use.
>
> La caja está en `ClientDetailScreen.tsx:3291-3294`, con los helpers en `:72-75`:
> ```tsx
> const verdeTenue = (t) => (t.kind === 'dark' ? '#0a1a15' : t.hundido);
> ```
> Y la ironía: el par que quedó después del arreglo (`tealTexto` sobre `hundido`) **sí está
> cubierto**, en `mb31b1-ambito.test.ts:118`. Por coincidencia. El test valida el par de
> tokens en abstracto, no que esta pantalla lo use.
>
> **4. Cómo se llega a él, porque no es obvio.** Ver B5 y H1. Resumen: no hay ruta
> `app/coach*`, no está en el tab bar, y solo se monta desde `CoachPanelLayout.tsx:19` y
> `:325`, que a su vez solo aparece si el ancho es ≥1024 y el usuario es coach
> (`app/(tabs)/_layout.tsx:192`, `COACH_PANEL_MIN_WIDTH = 1024` en `:46`). **En un teléfono
> no se ve nunca.** Por eso ningún recorrido manual lo iba a atrapar.
>
> **Orden de lectura que yo seguiría:** primero `app/(tabs)/_layout.tsx:186-212` para
> entender cuándo aparece, luego `src/hooks/useCoachStatus.ts:39` para entender quién es
> coach, luego `CoachPanelLayout.tsx` que es corto, y hasta el final el archivo grande. Y
> antes de tocar una línea del archivo grande, **meterlo en la lista de
> `mb31b1-ambito.test.ts:30-46`**, porque si no, cualquier cosa que hagas ahí sigue siendo
> invisible para los guards.
>
> **Secciones que ya sé que están mal:** las dos cajas invisibles en claro se arreglaron en
> el commit `3c58be5` ("el detalle de cliente tenia dos cajas invisibles en claro").
> `[VERIFICADO]` con `git log -- src/screens/coach/ClientDetailScreen.tsx`. **Que fueran
> exactamente dos y no tres es una afirmación que nadie verificó con una captura**, porque
> el barrido en tema claro nunca corrió (ver A6).

---

**B4.** `P1` El porqué de las decisiones raras.

> _Respuesta:_
>
> **1. El techo de gasto falla abierto a propósito, en las dos ramas de error.**
> `[VERIFICADO]` en `supabase/functions/argos-proxy/index.ts:846-849` y `:869-872`. El
> docblock de `:824-830` da la razón: *"el riesgo de cortarle ARGOS a todos los que pagan
> por un hiccup de base es el producto entero"*. Se ve como un bug de seguridad y es una
> decisión de negocio.
>
> **2. El contador de llamadas sigue vivo pero con un tope inalcanzable.**
> `[VERIFICADO]`: `const CONTEO_DIARIO_SIN_CORTE = 1_000_000;` (`argos-proxy/index.ts:638`).
> Se ve como un número puesto al azar y es deliberado: el conteo deja de decidir pero sigue
> escribiendo `message_count` y `weighted_units`, que son el insumo de los límites suaves
> que vendrán (`:629-637`).
>
> **3. La respuesta degradada sale con estado 200, no con error.** `[VERIFICADO]` en
> `argos-proxy/index.ts:1405-1414`. Si Anthropic **y** Gemini fallan, el usuario recibe un
> 200 con texto "ARGOS no está disponible en este momento". Se ve como un error tragado y
> es para que el cliente no muestre una pantalla de falla.
>
> **4. El payload conserva `_rate_limited: true` aunque los límites por llamada ya no
> existan.** `[VERIFICADO]` en `argos-proxy/index.ts:1051-1061`, con comentario explícito:
> es compatibilidad con binarios viejos que no recibieron el OTA. Se ve como código muerto
> del pivote y no lo es.
>
> **5. La ficha de emergencia se queda clara en tema oscuro.** `[ME LO DIJERON]` vía
> `PENDIENTES_COMPLETOS_2026-08-17.md` (F-13): la lee un paramédico. Ojo, ahí está
> declarado como *decisión pendiente de confirmar*, no como decisión tomada. Si alguien la
> "arregla" para que respete el tema, está rompiendo algo que quizá sea a propósito.
>
> **6. Los arreglos de umbrales masculinos se dejaron a propósito en el motor.**
> `[VERIFICADO]` en `src/data/functional-health-engine.ts:28` y `:385`. Se ven como código
> muerto y son el camino de regreso de la bandera `UMBRALES_FEMENINOS_EN_EL_SCORE`.
>
> **7. `LOGIN_PASA_POR_GATE` no verifica `user_consent_log` y eso es a propósito.**
> `[VERIFICADO]` leyendo el comentario en `src/constants/flags.ts` bajo esa bandera. Sería
> lo obvio y sería un desastre: la tabla nace en la migración 209 y la 032 marcó
> `onboarding_step='completed'` a todos los usuarios previos, que consintieron por el
> camino que existía entonces. Gatear por `user_consent_log` los mandaría a re firmar algo
> que ya firmaron. **El dato del usuario es sagrado.**

---

**B5.** `P1` ¿Qué **no** debo tocar aunque parezca que hay que arreglarlo?

> _Respuesta:_
>
> **1. `get_argos_brain` abierta a `anon`.** `[ME LO DIJERON]` y coincido con el
> razonamiento: exige una llave que vive dentro de la función de borde y no viaja en el
> paquete de la app (`argos-proxy/index.ts:204`, `ARGOS_BRAIN_READ_KEY`). Cerrarla deja a
> todos sin cerebro.
>
> **2. El fail-open del techo de gasto.** Ver B4.1. Es tentador cerrarlo "por seguridad" y
> sería cambiar un problema de dinero por un problema de producto.
>
> **3. `src/engine/`** mientras siga excluido de vitest. `[VERIFICADO]` en
> `vitest.config.ts:30`, el comentario literal dice *"engine.test.ts existente NO se toca"*.
> Tocar el motor sin poder correr su prueba es tocarlo a ciegas. Primero se arregla la
> forma de correrla, después se toca.
>
> **4. Los arreglos legacy de `functional-health-engine.ts`** y las funciones `*Legacy` de
> `argos-service.ts:746`. Son los caminos de regreso de las banderas. Se ven como duplicado
> y son el seguro.
>
> **5. Las tablas y funciones de la moneda interna.** `[VERIFICADO]`:
> `290_membresia_unica.sql:9-18` declara explícitamente que **no borra ni revoca nada**;
> solo hace `UPDATE proton_packages SET enabled = false` (`:51`) y actualiza comentarios.
> La propuesta destructiva vive sin aplicar en
> `R and D/PREMIUM_MIGRACION_DESTRUCTIVA_PROPUESTA.md`. **Hay saldos reales adentro.** Ver
> F7.
>
> **6. Los dos worktrees bloqueados, hasta leer E2.** Ahí explico por qué sí se pueden
> borrar, pero no antes de leerlo.

---

**B6.** `P1` ¿Hay algún acuerdo verbal que gobierne alguna parte del código?

> _Respuesta:_
>
> **Esto lo tiene que contestar el dueño.** Un acuerdo verbal, por definición, no dejó
> rastro en el repo, y yo solo puedo leer el repo.
>
> Lo que sí puedo hacer es señalar **dónde el código se comporta como si hubiera un acuerdo
> detrás**, para que la pregunta se haga concreta:
>
> 1. **La filosofía de medicina funcional está codificada en el prompt de ARGOS y en la
>    doctrina de los tests, y no está firmada por nadie.** El repo `ARGOS-BRAIN` tiene un
>    test de fuga clínica que aborta la publicación si contenido del dominio clínico
>    aparece en el paquete de la app (`ARGOS-BRAIN/build/publish-brain.mjs:74-83`). Eso es
>    una frontera de responsabilidad profesional implementada en un script de build.
>    **¿Quién la firmó?**
> 2. **El vínculo coach y paciente nace activo sin que el paciente acepte** desde la
>    migración 008. Eso puede ser un bug de 2026 o puede ser un acuerdo de cómo opera la
>    práctica clínica. Ver F2.
> 3. **Los rangos funcionales y las preguntas de historia clínica** están marcados en el
>    propio archivo como propuestos sin validar (`[ME LO DIJERON]` vía
>    `PENDIENTES_COMPLETOS_2026-08-17.md`, F-3 y F-5). Si alguien acordó verbalmente que
>    "van así por ahora", eso no está escrito.
> 4. **Las tres decisiones de color pendientes** (F-13), incluida la de la ficha de
>    emergencia. Ver B4.5.

---

**B7.** `P2` Tres archivos para entender esto, en orden.

> _Respuesta:_
>
> **No doy tres, doy cuatro, y explico por qué el cuarto no es negociable.**
>
> 1. **`CLAUDE.md`** (raíz). Es la doctrina y las 12 reglas no negociables. **Pero léelo
>    sabiendo que miente en dos números**, ver J1. Léelo por las reglas, no por las cifras.
> 2. **`src/constants/flags.ts`** (18 banderas, ~730 líneas). Es el mejor documento
>    técnico del repo y no está catalogado como documento. Cada bandera trae qué controla,
>    por qué existe, a quién le cambia algo y cómo apagarla. **Si solo puedes leer un
>    archivo, lee este:** te cuenta la historia de los últimos dos meses mejor que
>    cualquier `.md`.
> 3. **`supabase/functions/argos-proxy/index.ts`** (~1,400 líneas). Es donde vive el
>    producto: identidad, cerebro, ruteo de modelos, cuota, techo de gasto, fallback y
>    logging. Todo lo caro pasa por ahí.
> 4. **`R and D/RUNBOOK_SIN_BUILDS.md`.** El cuarto, porque sin él el que llega **publica
>    mal el primer día**. Es el único documento que dice el orden correcto de despliegue, y
>    hay otro documento en el repo que dice lo contrario (ver A3).
>
> Lo que **no** pondría en la lista, aunque parezca obvio: los sesenta documentos de
> `R and D`. Son expediente histórico. Varios se contradicen entre sí el mismo día.

---

# BLOQUE C · Verificación: qué es real y qué es reporte

**C1.** `P0` De la lista de bloqueantes, ¿cuáles **verificaste en el código** y cuáles
**heredaste sin comprobar**?

> _Respuesta:_
>
> Esta es la pregunta que la entrevista declara más importante, y la contesto con los
> **cuatro errores de premisa que se cometieron en este ciclo**, porque son la respuesta
> honesta: cuatro veces se declaró un bloqueante que no existía, y las cuatro veces la
> causa fue la misma, escribir contra un reporte en vez de contra el código.
>
> **Error 1. "PostgREST devuelve los numéricos como texto y hay unos 70 filtros
> `typeof x === 'number'` rotos."** `[ME LO DIJERON]` que **cero lo estaban**: las comillas
> que dispararon la alarma venían de la consola SQL, no de la API. Un agente revisor lo
> desmintió y evitó 70 ediciones inútiles. `[VERIFICADO]` parcialmente por mi parte: busqué
> en `R and D/*.md` y **no encontré ningún documento que sostenga la afirmación original**,
> lo cual es consistente con que se haya tumbado antes de bajar a documento. **No pude
> reproducir la observación original**, así que la parte de "de dónde salieron las
> comillas" queda en `[ME LO DIJERON]`.
>
> **Error 2. "Los pesos de la Edad ATP son placeholder."** Este es el más caro.
> `[VERIFICADO]` en el historial: existe el commit `a447a49`, cuyo mensaje es literalmente
> **"EDAD: el comentario de pesos placeholder llevaba dos meses mintiendo"**. Los pesos
> reales entraron el 8 de junio; lo que estaba mal era un comentario obsoleto de dos meses.
> `[ME LO DIJERON]` la hora exacta (hora y media después) y el detalle del `git blame`.
> Hay test de regresión que exige `SF=0.6083`, según `TAKEOVER_DEV_LEAD_2026-08-18.md:40`.
>
> **Ese comentario convirtió durante dos meses una función correcta en un bloqueante
> inexistente**, y tuvo al proyecto a punto de congelar detrás de una bandera el número que
> vende el producto entero. **Un comentario que miente cuesta lo mismo que un número que
> miente.**
>
> **Error 3. "ARGOS improvisó lo del endocrinólogo."** `[ME LO DIJERON]`: **el prompt lo
> pedía textual.** Se acusó al modelo de una conducta que estaba escrita en sus
> instrucciones. `NO SÉ` verificarlo desde aquí sin el texto exacto del prompt de esa
> versión del cerebro, y con el drift de versiones que describo en G1, ni siquiera sé qué
> texto estaba corriendo ese día.
>
> **Error 4. "Los consentimientos del onboarding están tapados por su propio botón."**
> Este sí lo verifiqué yo, entero, y **confirmo que era falso, y además que era
> geométricamente imposible.** `[VERIFICADO]` leyendo `app/onboarding/v2/privacy.tsx`:
> - El `ScrollView` cierra en `:113`.
> - La barra del botón abre en `:120` como **hermana** del `ScrollView`, dentro del mismo
>   contenedor, **no con `position: 'absolute'`**. Busqué `position:\s*'absolute'` en todo
>   el archivo: **cero resultados**.
> - El comentario en `:115-119` ya lo dice: *"la barra es hermana del ScrollView, no flota
>   encima: los checkboxes CB-2/3/4 nunca estuvieron tapados"*.
> - Y hay un argumento más fuerte que la geometría: **como los checkboxes son obligatorios
>   y viven debajo del aviso, es imposible aceptar sin haber scrolleado hasta ellos.**
>
> La afirmación falsa está en `R and D/AUDIT_VISUAL_2026-08-16.md:294`, y viene calificada
> como *"riesgo legal, no estético"*, que es justo el lenguaje que hace que nadie la
> cuestione.
>
> De paso verifiqué que las dos pantallas de consentimiento **sí respetan el tema claro**:
> los colores blancos escritos a mano (`privacy.tsx:147`, `consent.tsx:120,127,131`) están
> todos sobrescritos en el punto de uso con `th.dark ? null : th.sub` (`privacy.tsx:83`,
> `consent.tsx:63,73,78,81`). No hay texto invisible en claro en el gate legal.
>
> ---
>
> **El patrón, que es lo que se lleva el que llega:** los cuatro errores son de la misma
> familia. Una observación de una herramienta (la consola SQL, un comentario, un
> pantallazo, una captura a media transición) se convirtió en un hecho sobre el código sin
> pasar por el código. **Tres de los cuatro los tumbó un segundo par de ojos**, y por eso
> el dueño pidió el principio de los cuatro ojos como regla permanente: que todo trabajo lo
> revise al menos un agente adicional. Se aplicó al cerebro de ARGOS y encontró de
> inmediato dos afirmaciones falsas y un hueco de seguridad en el modo A.
>
> **Lo que yo heredé sin comprobar y sigue sin comprobar:** todo lo que exige la base
> remota o un teléfono. En concreto: si las cuatro migraciones están aplicadas, si
> `ARGOS_EXIGE_JWT` está apagado, si los cuatro secretos están puestos, si el permiso de
> `anon` sobre `invite_client_by_email` sigue abierto hoy, y si la suite está verde.

---

**C2.** `P0` **Nada de este ciclo ha corrido en un teléfono.** ¿Es literalmente cierto?

> _Respuesta:_
>
> **No es literalmente cierto, y la versión precisa importa.**
>
> `[ME LO DIJERON]`: el dueño probó a mano **tres cosas** en su teléfono: **los labs, ARGOS
> navegando, y la biblioteca de alimentos.** Esas tres sí corrieron en dispositivo.
>
> **Todo lo demás del ciclo no.** HealthKit, Health Connect, el expediente reinventado
> (`/salud/mi-lectura`), Reports con 14 dominios, el tema claro por lotes, el paywall de
> membresía única, el gate de consentimientos, el techo por gasto, Ajustes simplificado:
> ninguno vio un teléfono.
>
> `[VERIFICADO]` como evidencia indirecta y fuerte: **el barrido visual de tema claro tiene
> cero capturas.** `.maestro/capturas/` contiene solo `oscuro/` (309 archivos) y
> `oscuro-215/` (185). No existe `claro/`. El tema claro es lo que más cambió en el ciclo y
> no hay una sola imagen de él.
>
> `[VERIFICADO]`: `R and D/RECORRIDO_EN_TELEFONO.md:3` abre con *"Nada de este ciclo ha
> corrido en un dispositivo"*, o sea que el propio documento del ciclo ya lo declaraba.
> Ese recorrido está bien armado, son treinta minutos, y trae una instrucción que la gente
> se salta: **abrir la app, esperar diez segundos, cerrarla del todo y volver a abrirla,
> porque el OTA se aplica en el segundo arranque.** Sin eso estás revisando el bundle
> viejo y sacando conclusiones de él.
>
> **El agravante que hace que esto importe más de lo normal:** `[ME LO DIJERON]` y está en
> `TAKEOVER_DEV_LEAD_2026-08-18.md:194-197`, **no quedan builds**. El binario 2.2.0 es el
> último. Todo el plan de reversión asume que cualquier cosa se apaga por OTA, lo cual es
> cierto para las 18 banderas y **falso para cualquier bug nativo**. Un solo problema
> nativo obliga a compilar, y compilar reinicia la revisión de la tienda.

---

**C3.** `P0` `src/constants/flags.ts` tiene **17 banderas**... ¿De dónde salió el 11?

> _Respuesta:_
>
> 🔺 **Son 18, no 17.** `[VERIFICADO]` con
> `git show HEAD:src/constants/flags.ts | grep -c "^export const"` → **18**. Dieciséis
> encendidas, dos apagadas (`FASTING_MEASURED_MODE` y `ARGOS_SUFIJO_DE_EVIDENCIA`, o sea
> que esa parte de la pregunta sí es correcta).
>
> **Y el 11 no fue un error. Era correcto el día que se escribió.** `[VERIFICADO]`
> contando los `export const` en cada commit del archivo:
>
> ```
> 2026-07-10  2399a56   1        2026-08-17  338a316  13
> 2026-07-27  deff176   2        2026-08-17  7545600  14
> 2026-08-15  46c2b9b   3        2026-08-17  5e92ee5  15
> 2026-08-15  972c2e6   4        2026-08-17  ffea25a  16
> 2026-08-15  bee6b84   5        2026-08-17  cf70889  17
> 2026-08-15  a63555c   6        2026-08-18  cec79b1  18
> 2026-08-15  f3abb54   7
> 2026-08-16  258b2b9   8        (doc) c3b4d1d  17-ago → dice 11
> 2026-08-16  1939076   9        (doc) 06e9e29  18-ago → dice 17
> 2026-08-16  beb780d  10
> 2026-08-16  35ef5e5  11
> ```
>
> El "11" nació en `R and D/PENDIENTES_COMPLETOS_2026-08-17.md:58` y `:323`, en el commit
> `c3b4d1d` del 17 de agosto, y **`git show c3b4d1d:src/constants/flags.ts` tenía
> exactamente 11**. También era cierto que solo una estaba en `false`.
>
> **Lo que pasó es que envejeció el mismo día:** ese 17 de agosto entraron seis banderas
> más y el 18 entró la número 18. El 11 se copió sin remedir a
> `TAKEOVER_DEV_LEAD_2026-08-18.md:196`. Y el 17 de esta entrevista viene de
> `R and D/HANDOVER/03_ESTADO_Y_TRAMPAS.md:119,142`, que nació en el commit `06e9e29`
> donde el archivo sí tenía 17. **También quedó viejo, por un solo commit.**
>
> **La respuesta a la pregunta de fondo no es "el número se quedó viejo": es que el número
> se copia entre documentos en vez de medirse.** Pasó dos veces en veinticuatro horas
> (11 → 17 → 18). La cura cabe en una línea del runbook:
> ```
> grep -c "^export const" src/constants/flags.ts
> ```
> **Ninguna bandera dejó de contar como reversible.** Ver C4.
>
> Y algo que la pregunta no pide y vale más que el conteo: `[VERIFICADO]` en
> `03_ESTADO_Y_TRAMPAS.md:167`, **el runbook solo cubre 5 de las banderas como interruptor
> de pánico**. O sea que trece banderas no tienen instrucción de emergencia escrita.

---

**C4.** `P0` Para cada una de las banderas: si la apago hoy, ¿revive el camino viejo de
verdad?

> _Respuesta:_
>
> `[VERIFICADO]` una por una, buscando dónde se consume cada bandera y si la rama del
> `else` sigue existiendo con código vivo. **Ninguna de las 18 es irreversible en el
> sentido de que la rama vieja haya desaparecido.** Pero hay cuatro matices que no están en
> ningún documento y que son la respuesta útil.
>
> **Reversibles limpias (11):**
>
> | Bandera | Dónde vive el camino viejo |
> |---|---|
> | `INTERVENTIONS_DRIVE_HOY` | `intervention-agenda-core.ts:43-45`; el bloque de protocolos completo sigue en `day-compiler.ts:881` |
> | `FASTING_MEASURED_MODE` | `app/fasting.tsx:220`. Ya está apagada, el camino vivo **es** el viejo |
> | `DIA_1_SIEMBRA_SUAVE` | `install-service.ts:197`. No retroactivo: quien ya recibió fila la conserva |
> | `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA` | `day-compiler.ts:443`, el filtro viejo está literal: `k !== 'steps' && k !== 'sleep'` |
> | `RANGOS_UNA_SOLA_FUENTE` | `lab-rating.ts:262-289`, las tres funciones conservan la rama legacy |
> | `INSIGHT_EN_VENTANA` | `app/(tabs)/index.tsx:253-266`, el caché de 6 horas intacto |
> | `ARGOS_LEE_LABS_DE_VERDAD` | `argos-service.ts:1189-1191`, `cargarLabsLegacy` íntegra |
> | `LABS_UNIDADES_ALINEADAS` | `lab-unidades-core.ts:264-318`, cinco guardas que devuelven el crudo |
> | `LABS_FICHA_POR_BIOMARCADOR` | `app/edad-atp/labs.tsx:354-358`, el acordeón viejo sigue |
> | `AUTH_RESPETA_EL_TEMA` | `auth-theme.ts:19` + `AuthScreen.tsx:33,40` |
> | `UMBRALES_FEMENINOS_EN_EL_SCORE` | `functional-health-engine.ts:385`, ternario; arreglos legacy a propósito |
> | `SEXO_NO_SE_ADIVINA` | `edad-atp-v2-service.ts:221`. **Ojo: no hay backfill de lo que dejó de guardarse** |
> | `ARGOS_SUFIJO_DE_EVIDENCIA` | `argos-service.ts:1613,1720`; ya apagada, la constante sigue viva |
>
> **Matiz 1. Tres son reversibles en ejecución pero rompen la suite.** `[VERIFICADO]`:
> `LOGIN_PASA_POR_GATE` (`consent-puertas.test.ts:182`),
> `TABS_EXIGEN_CONSENTIMIENTO` (`consent-puertas.test.ts:88`) y
> `ARGOS_LIMITE_DE_ALCANCE` (`argos-alcance-core.test.ts:23`) están fijadas con
> `expect(FLAG).toBe(true)`. **Esto no aparece en ningún documento de handoff.** Apagarlas
> funciona, pero deja tests rojos y confunde a quien esté apagando en una emergencia.
>
> **Matiz 2. `ARGOS_RESUELVE_RUTAS_DINAMICAS` no devuelve el estado anterior.**
> `[VERIFICADO]`: el propio `flags.ts:643-646` lo declara. El bug de las plantillas con
> corchetes se arregló **sin bandera**. Apagarla no devuelve los moldes rotos: **ARGOS
> pierde 55 destinos.** Está marcada como reversible y en la práctica es una degradación,
> no un regreso.
>
> **Matiz 3. `ARGOS_MANDA_JWT_DEL_USUARIO` depende de algo que está en el servidor.**
> `[VERIFICADO]` en `flags.ts:610-614`: apagarla es seguro **solo mientras**
> `ARGOS_EXIGE_JWT` esté apagado del lado del edge function. Si esa variable está en
> `"true"` y esta bandera en `false`, **nadie puede usar ARGOS.** Es la única pareja
> cliente y servidor del sistema, y es la única pieza del despliegue que va en dirección
> contraria al resto: el resto se enciende de servidor a cliente, esta se enciende de
> cliente a servidor.
>
> **Matiz 4. `INTERVENTIONS_DRIVE_HOY` deja residuo de datos.** `[VERIFICADO]` en
> `flags.ts:25-31`: los `agenda_events` con `source='intervention'` ya escritos **no se
> borran**, solo dejan de regenerarse. Apagarla no limpia lo pasado.

---

**C5.** `P1` `mbsec1-superficie.test.ts` valida el **texto** de las migraciones.
**¿Cuántos guards más son de ese tipo?**

> _Respuesta:_
>
> **Cincuenta.** `[VERIFICADO]` con
> `grep -rln "readFileSync\|readdirSync" --include="*.test.ts" src supabase` → **50
> archivos**, o sea el **14.4% de la suite**. Esto es, con diferencia, el hallazgo más
> grande de este bloque.
>
> **Los once más peligrosos, porque leen SQL de migraciones que puede no estar aplicado:**
>
> | Archivo | Qué lee |
> |---|---|
> | `src/services/__tests__/mbsec1-superficie.test.ts:22,33,34,62,83,104,108` | migraciones 207, 218, 227, 228, 229, 230 |
> | `src/services/community/__tests__/community-v11-antileak.test.ts:34,57,60,63,67` | migraciones 190 a 193 |
> | `src/services/community/__tests__/community-leaderboard-antileak.test.ts:17` | 180 |
> | `src/services/community/__tests__/friends-core.test.ts:253-316` | 182, 183, 184 |
> | `src/services/community/__tests__/mig-177-backfill.test.ts:18` | 177 |
> | `src/services/community/__tests__/mood-share-core.test.ts:47,65` | 226 |
> | `src/services/__tests__/signup-trigger-198a.test.ts:29,30,51,117` | 198, 199 |
> | `src/services/__tests__/day-compiler-null-dates-contract.test.ts:50-58` | 045, 036, 033, 049 |
> | `src/services/fitness/__tests__/health-import-source-contract.test.ts:41,42,68` | 036, 246 |
> | `src/services/hoy/__tests__/installed-apps-migration.test.ts:11,15` | 247 |
> | `src/services/sleep/__tests__/sleep-source-contract.test.ts:24,56,57` | 261 |
>
> **Los otros treinta y nueve leen código `.ts`/`.tsx` con `grep` disfrazado de test.**
> Los más grandes: `src/__tests__/consent-puertas.test.ts` (lee cuatro archivos de `app/` y
> afirma que su texto contiene ciertos strings), `src/__tests__/registro-comida.test.ts`,
> `src/__tests__/barrido-rutas.test.ts`, `src/services/__tests__/mb27-contratos.test.ts`,
> `src/services/__tests__/hardening-prelaunch.test.ts`,
> `src/constants/__tests__/mb31b-remate.test.ts`, `src/constants/__tests__/icon-censo.test.ts`.
>
> **Excepción justa:** los tres de `src/services/edad-atp/__tests__/` que leen
> `fixtures/hombres_v7.json` **no son guards de texto**, son fixtures de datos. Esos están
> bien.
>
> **El criterio que hay que imponer, y lo firmo:** un test que lee un archivo de migración
> verifica **intención**. Solo una consulta a `has_function_privilege` contra la base
> verifica **seguridad**. El guard estático se queda y arriba va uno que le pregunte al
> servidor. Sin eso, la próxima vez que alguien edite una función por el editor SQL, la
> suite va a seguir verde y la puerta va a seguir abierta, exactamente como pasó.

---

**C6.** `P1` De los 343 archivos de prueba sobre 1,321 de código, ¿cuáles están
desactualizados o mintiendo?

> _Respuesta:_
>
> 🔺 **Los dos números están mal, y el denominador está inflado en un tercio.**
> `[VERIFICADO]`:
>
> | | Real | Decía |
> |---|---|---|
> | Archivos `*.test.ts` | **347** | 343 |
> | Archivos `*.test.tsx` | **0** | |
> | Código sin tests, todo el repo | **1,024** | 1,321 |
> | Código sin tests, solo `src/` + `app/` | **976** | |
>
> El 1,321 no sale de ninguna cuenta razonable: código más tests da 1,371. **La proporción
> real es mejor de lo que el documento dice** (347 sobre 1,024, no sobre 1,321), lo cual
> hace más incómoda la siguiente parte.
>
> **Tests que pasan pero no prueban lo que dicen:**
>
> **1. Los 50 guards estáticos.** Ver C5. No mienten sobre lo que hacen, pero **se leen
> como si probaran comportamiento** y prueban texto.
>
> **2. `src/engine/__tests__/engine.test.ts` no corre.** `[VERIFICADO]` en
> `vitest.config.ts:30`. 384 líneas cubriendo el motor de rutinas, excluidas del run, y es
> un script a mano que nadie invoca. **La suite verde no incluye el motor.**
>
> **3. Cero tests de renderizado en todo el repo.** `[VERIFICADO]`:
> `environment: 'node'` en `vitest.config.ts:31`, y **no hay `jsdom`, ni
> `@testing-library`, ni `react-test-renderer` en `package.json`**. **Nada verifica que una
> pantalla monte.** Con 142 pantallas y un ciclo entero de cambios de tema, esto explica
> por qué un contraste 1.0 llegó a producción.
>
> **4. Cincuenta y un archivos mockean Supabase con un objeto vacío.** `[VERIFICADO]`: 140
> llamadas a `vi.mock()`, 51 sobre `@/src/lib/supabase`, la mayoría con
> `() => ({ supabase: {} })`. Están diseñados para no tocar la capa de datos. Correcto como
> aislamiento, **pero significa que ninguna prueba del repo ejerce una consulta real.**
>
> **5. Un test cambia de forma según una bandera.** `[VERIFICADO]`:
> `src/services/__tests__/argos-invalidate-insight.test.ts:33` hace `if (INSIGHT_EN_VENTANA) {`.
> Con la bandera apagada ese bloque no corre y el test pasa igual. **Verde sin haber
> probado nada.**
>
> **6. Un `it.each` que se salta a sí mismo.** `[VERIFICADO]`:
> `src/constants/__tests__/mb31b-remate.test.ts:174`, `if (!declaraScope(src)) return;`. Los
> archivos que no declaran `themed`/`ThemeReady` **pasan sin ejecutar una sola aserción**.
> O sea que un archivo se "arregla" el test simplemente no declarando nada.
>
> **Lo que sí está limpio, y lo digo porque es raro:** `[VERIFICADO]`, **no hay ni un solo
> `.skip`, `.todo`, `xit`, `describe.skip` ni bloque comentado en toda la suite.** Cero
> `expect(true).toBe(true)`. Eso está bien hecho.

---

**C7.** `P1` ¿Qué has declarado "cerrado" con menos evidencia de la que te hubiera gustado?

> _Respuesta:_
>
> Cinco cosas, y las digo en orden de vergüenza.
>
> **1. Todo el tema claro.** Se declaró por lotes, se verificó con `tsc` y con un script
> que cuenta hex a mano, y **nunca se vio.** Cero capturas en claro. La caja "RESUMEN PARA
> PACIENTE" con contraste 1.0 se encontró leyendo código, no mirando la pantalla. **Si esa
> apareció, hay más.** Y el ratchet que debería atraparlas no cubre `src/screens/coach/`.
>
> **2. "Dos cajas invisibles en claro" en el detalle de cliente.** El commit `3c58be5` dice
> dos. **Nadie contó.** Es un archivo de 4,250 líneas sin cobertura y sin captura.
>
> **3. El barrido visual como evidencia.** `[ME LO DIJERON]` y es lo más incómodo de este
> ciclo: **un tercio de las 309 capturas no aterrizó en la pantalla que dice el nombre del
> archivo.** Hay capturas a media transición y unas 30 rutas de cuestionarios que muestran
> **"Evaluación no encontrada"** (`[VERIFICADO]` que ese string existe, en
> `app/tests/q/[id].tsx:272` y `src/services/assessments/engine-runtime.ts:139`). O sea que
> el archivo se llama como la pantalla que se quiso capturar y la imagen es de otra cosa.
> **Cualquier conclusión visual sacada de ese barrido sin abrir la imagen es sospechosa.**
>
> **4. `packBooleans` "probado".** Ver A2.2: no hay ni un test.
>
> **5. El estado de las migraciones en el remoto.** Tres documentos dicen tres cosas
> distintas y ninguno se puede resolver desde el repo.

---

# BLOQUE D · Entorno, accesos y llaves

**D1.** `P0` **Los cuatro secretos pendientes** (Stripe, Conekta, RevenueCat, Resend).

> _Respuesta:_
>
> **Dónde van y qué código los espera:** `[VERIFICADO]`, y esto sí se puede contestar
> entero desde el repo.
>
> | Secreto | Nombre exacto de la variable | Quién la lee |
> |---|---|---|
> | Stripe | `STRIPE_WEBHOOK_SECRET` | `supabase/functions/payment-webhook/index.ts:512` (HMAC real) |
> | Conekta | `CONEKTA_WEBHOOK_SECRET` | `payment-webhook/index.ts:530` (token compartido) |
> | Resend | `RESEND_API_KEY` | `payment-webhook/index.ts:125` |
> | Resend, remitente | `PAYMENT_EMAIL_FROM` | `payment-webhook/index.ts:127` |
> | RevenueCat, webhook | `REVENUECAT_WEBHOOK_SECRET` | `supabase/functions/revenuecat-webhook/index.ts:53` |
> | RevenueCat, API | `REVENUECAT_API_KEY` | `supabase/functions/reclaim-hplus/index.ts:44` |
>
> **Son seis nombres, no cuatro.** `PAYMENT_EMAIL_FROM` y `REVENUECAT_WEBHOOK_SECRET` no
> aparecen en ningún documento del repo. Quien ponga "los cuatro secretos" y no ponga esos
> dos, va a tener un webhook que rechaza todo y un correo sin remitente.
>
> **Van con `npx supabase secrets set ...`** en el proyecto de Supabase. El setup exacto
> del de RevenueCat está dentro del propio archivo, `revenuecat-webhook/index.ts:4-8`
> (Dashboard → Integrations → Webhooks, URL y header `Bearer`).
>
> **¿Hay alguno ya puesto y el documento no se enteró?** `[VERIFICADO]` en lo que se puede
> ver: **las llaves públicas del SDK de RevenueCat sí están puestas**, en `app.json:141-142`
> (`revenuecatIosKey` con prefijo `appl_` y `revenuecatAndroidKey` con `goog_`, valores
> reales). Ninguna llave secreta de servidor aparece en el repo, ni de prueba, y eso está
> **bien**: no deben estar ahí.
>
> **Si están puestas en Supabase hoy: `NO SÉ`, y esto lo tiene que contestar el dueño**,
> porque `supabase secrets list` exige el CLI ligado a su máquina y credenciales que solo
> él tiene.
>
> **Quién los genera:** cada uno en el panel de su proveedor. **También lo contesta el
> dueño**, porque las cuentas son suyas.
>
> **Una advertencia de secuencia:** `[VERIFICADO]` en
> `PENDIENTES_COMPLETOS_2026-08-17.md:158-161` (L-11), **el paywall nunca se ha visto con
> precios reales**, y depende de que RevenueCat esté configurado. O sea que el secreto no
> solo desbloquea el cobro: desbloquea la primera vez que alguien ve esa pantalla
> funcionando.
>
> **Y un TODO explícito que nadie recogió:** `[VERIFICADO]` en
> `supabase/functions/account-deletion-processor/index.ts:18` y `:136`, dice literalmente
> que **no hay llave de correo en el proyecto**. O sea que hoy el proceso de borrado de
> cuenta (derecho al olvido) no puede avisarle a nadie.

---

**D2.** `P0` Inventario de accesos y dueño de cada cuenta.

> _Respuesta:_
>
> **`NO SÉ`, y esto lo tiene que contestar el dueño en su totalidad.** No hay forma de
> saber quién es titular de una cuenta leyendo un repositorio, y no voy a inferirlo.
>
> Lo que sí aporto son **los identificadores que el repo revela**, para que el inventario
> se llene contra hechos y no de memoria. `[VERIFICADO]`:
>
> | Servicio | Identificador que aparece en el repo | Dónde |
> |---|---|---|
> | Supabase | proyecto `itqkfozqvpwikogggqng` | `TAKEOVER_DEV_LEAD_2026-08-18.md:37` |
> | Supabase | URL y llave anónima reales | `app.json:136-147` |
> | Sentry | org `atp-v5`, proyecto `atp-mobile` | `scripts/upload-ota-sourcemaps.mjs:31-32` |
> | Sentry | DSN | `app.json` sección `extra` |
> | PostHog | llave de proyecto | `app.json` sección `extra` |
> | Expo y EAS | `eas.projectId` | `app.json` sección `extra`, leído en `src/services/push-notification-service.ts:54` |
> | RevenueCat | llaves públicas iOS y Android | `app.json:141-142` |
> | Play Console | `com.atpperformance.app` | `scripts/audit-visual.ps1:37` |
>
> **De App Store Connect, Google Play Console, Vercel, Hostinger, el dominio, Anthropic y
> OpenAI, el repo no dice nada.** Nota de doctrina que sí puedo confirmar `[VERIFICADO]`:
> **OpenAI no se usa.** El fallback de ARGOS es Gemini (ver G3), y `SECURITY.md:15-24`
> lista `OPENAI_API_KEY` como "(future)", que a estas alturas es ruido.
>
> **Mi recomendación para el que llega:** que el inventario de accesos se escriba **con
> quién recupera la cuenta si el dueño no está disponible**, no solo con quién es titular.
> Hoy el proyecto tiene un solo desarrollador y un solo titular, y eso es un punto único de
> falla que ningún documento nombra.

---

**D3.** `P0` ¿Qué variables de entorno viven **solo** en tu máquina o en tu cabeza?

> _Respuesta:_
>
> `[VERIFICADO]`, y la respuesta empieza con un hecho que hace la pregunta más grave:
> **no existe `.env.example`.** Lo único que hay es `.env` con dos claves vacías
> (`EXPO_PUBLIC_SUPABASE_URL=`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=`) y `.env.test.local` con
> dos credenciales de prueba, también vacías.
>
> **El código lee 22 variables de entorno en las edge functions** (sin contar las tres que
> Supabase inyecta solo: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
> **Seis no están documentadas en ningún archivo `.md`, en ningún lado:**
>
> | Variable | Dónde se lee | Qué hace |
> |---|---|---|
> | `BRAIN_DENY_TYPES` | `argos-proxy/index.ts:184` | Lista de tipos de petición a los que no se les manda cerebro |
> | `ARGOS_BRAIN_READ_KEY` | `argos-proxy/index.ts:204` | **La llave que protege `get_argos_brain`.** Sin ella, ARGOS se queda sin cerebro |
> | `NONCHAT_PROMPT_CACHE` | `argos-proxy/index.ts:337` | Controla el caché de prompt en llamadas que no son chat |
> | `QUOTA_WEIGHT_OVERRIDES` | `argos-proxy/index.ts:703` | Pisa los pesos de cuota sin redesplegar |
> | `PAYMENT_EMAIL_FROM` | `payment-webhook/index.ts:127` | Remitente del correo de activación |
> | `REVENUECAT_WEBHOOK_SECRET` | `revenuecat-webhook/index.ts:53` | Solo documentada dentro del propio archivo |
>
> **`ARGOS_BRAIN_READ_KEY` es la que me quita el sueño de esta lista.** Es la única defensa
> de una función que está abierta a `anon` a propósito, y su valor no está en ningún
> documento. Si se pierde, o si alguien rota el secreto sin actualizar el edge function,
> **ARGOS deja de tener cerebro y va a responder genérico sin que nada falle visiblemente.**
>
> **Sobre las dos que la pregunta menciona:** `[VERIFICADO]`
> - **`QUOTA_WEIGHTS_ENABLED`** (`argos-proxy/index.ts:773`): activa la cuota ponderada por
>   costo. Sin ella, cuota plana. Trampa: si está en `"true"` **pero la migración 275 no
>   está aplicada**, cae a plana y loguea el error en silencio (`:776-786`).
> - **`ARGOS_EXIGE_JWT`**: ver A2.3.
>
> **Y una que no es variable de entorno pero pertenece a esta respuesta:** el secreto
> `service_role_key` del Vault que sostiene los crons. Ver B1.5. **No está en ningún `.env`
> ni en `SECURITY.md`.**
>
> **`SECURITY.md:15-24` es el único inventario de secretos que existe y está roto.**
> `[VERIFICADO]`: lista cuatro variables, una de ellas de un proveedor descartado, con
> nombres que el código ya no usa (`STRIPE_SECRET_KEY` y `CONEKTA_PRIVATE_KEY` contra los
> `_WEBHOOK_SECRET` reales), y **omite dieciocho.**
>
> **Lo que sigue en `NO SÉ`:** los **valores**. Todos. Eso lo tiene que contestar el dueño.

---

**D4.** `P1` El `node_modules` con binarios de Windows. ¿Es solución conocida?

> _Respuesta:_
>
> `[VERIFICADO]` el problema y su historia, `[CREO]` la solución.
>
> **Que el problema es real y que ya se buscó salida se prueba solo:** existen dos scripts
> en el repo hechos exactamente para esquivarlo, `scripts/run-tests-sin-vitest.js` y
> `scripts/shim-vitest.js`. Nadie escribe un shim de vitest si vitest corre.
>
> **`npm install` estaba prohibido porque un agente ya destruyó el entorno así.**
> `[ME LO DIJERON]`, y es la razón por la que todos los agentes verificaron con arneses
> propios en vez de con la suite.
>
> **Qué haría yo, en orden de menos a más invasivo. `[CREO]`, no lo probé:**
> 1. **`npm rebuild` no basta.** El problema no es solo binarios compilados: es que el
>    árbol trae paquetes con sufijo de plataforma (`@esbuild/win32-x64`,
>    `@rollup/rollup-win32-x64-msvc`) que en Linux ni siquiera son los correctos por
>    nombre. Reconstruir no cambia qué paquetes están.
> 2. **Un `node_modules` separado para Linux, sin tocar el de Windows.** `npm ci` con
>    `--prefix` a otra carpeta, o un contenedor con el repo montado y el `node_modules`
>    **fuera** del volumen montado. Esta es la que yo intentaría primero: no arriesga nada
>    del entorno del dueño, que es lo que lo hizo prohibido.
> 3. **Correr solo vitest en el contenedor**, sin Expo. La suite es `environment: 'node'` y
>    no monta componentes, así que no necesita el toolchain nativo de React Native.
>
> **Lo que no haría:** `npm install` en el árbol existente. Ya se pagó ese precio una vez.
>
> **Y el punto que importa más que la solución técnica:** mientras esto no se arregle,
> **la definición de "terminado" del proyecto depende de que una sola persona corra un
> comando en una sola máquina.** Eso no escala a un equipo y no sobrevive a que esa persona
> se enferme la semana del lanzamiento.

---

**D5.** `P1` El repo está en OneDrive. ¿Vale la pena moverlo?

> _Respuesta:_
>
> 🔺 **La premisa es falsa. El repo no está en OneDrive.**
>
> `[VERIFICADO]`: `git worktree list` sitúa el árbol principal en
> `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer`, y todos los worktrees de este ciclo
> cuelgan de `D:\Proyectos_ClaudeCode\`. **`NO APLICA`, y no hay nada que mover.**
>
> **Lo que sí está en OneDrive es la carpeta de negocio**,
> `C:\Users\ezapa\OneDrive\EZ online\ATP`, que es de donde salen los documentos legales
> (`Business development/Legal/`) y el modelo financiero que `CLAUDE.md` referencia. La
> trampa de OneDrive es real, pero muerde ahí: **archivos de negocio con tamaños en caché
> que se leen viejos y bloqueos de archivo cuando dos procesos tocan lo mismo.**
>
> **Recomendación concreta para el que llega:** corrige la creencia en cuanto la leas en
> cualquier documento, porque va a hacer que alguien mueva un repo de 1,900 commits por
> nada, y va a hacer que nadie desconfíe de los documentos de negocio, que es donde el
> problema sí existe.

---

**D6.** `P1` ¿Cómo se publica hoy, paso por paso?

> _Respuesta:_
>
> `[VERIFICADO]` contra `R and D/RUNBOOK_SIN_BUILDS.md:16-30` y contra
> `scripts/upload-ota-sourcemaps.mjs`. **El orden, y no es negociable:**
>
> ```
> cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
> npx tsc --noEmit
> npm test
> npx supabase db push
> npm run sourcemaps:ota
> ```
>
> **Las dos reglas que sostienen ese orden, con su porqué:**
>
> **1. Migraciones y edge functions ANTES del OTA.** Si el JavaScript sale primero, la app
> busca tablas que todavía no existen y truena (`RUNBOOK_SIN_BUILDS.md:24-26`).
>
> **2. El OTA solo con `npm run sourcemaps:ota`, nunca con `eas update` a secas.** El
> script hace tres cosas en el orden correcto (exportar, publicar ese export exacto, subir
> los mapas). Separarlas publica el bundle y los mapas por caminos distintos, los hashes no
> casan, y **los stacktraces de Sentry mienten**. Ver A3 para el detalle.
>
> **Qué se me ha olvidado:**
> - **Comillar los argumentos con espacios en Windows.** Está escrito dentro del script
>   (`:52-57`) precisamente porque ya pasó.
> - **Escribir `eas` en vez de `eas-cli`.** Mismo caso (`:71-73`).
> - **Exportar `SENTRY_AUTH_TOKEN` antes.** El script aborta si falta (`:43-47`), o sea que
>   este falla ruidoso, que es lo correcto.
>
> **Lo que NO sé y es un hueco real:** `[VERIFICADO]` que no se puede saber desde el repo.
> `eas.json:6-32` mapea perfiles a canales (`preview` y `production`), pero **el mapeo de
> canal a branch de OTA vive en el servidor de EAS, no en el repositorio.** El script
> apunta por default a `--branch preview` (`upload-ota-sourcemaps.mjs:40`) y todo el
> runbook publica a preview. **Qué branch alimenta el canal `production`: `NO SÉ`, y esto
> lo tiene que contestar el dueño**, porque solo está en la consola de EAS.
>
> Es justo el tipo de dato que un handoff tiene que capturar y que este no capturó.

---

**D7.** `P2` ¿Hay crons o trabajos programados no documentados?

> _Respuesta:_
>
> `[VERIFICADO]` barriendo `cron.schedule` en las 220 migraciones. **Hay seis vivos, y tú
> conocías tres.** Los tres que faltaban:
>
> | Job | Qué corre | Cadencia | Migración |
> |---|---|---|---|
> | `dispatch-agenda-notifications-minutely` | edge fn de notificaciones de agenda | `* * * * *` | `099_agenda_cron.sql:32-38` |
> | `data-exports-processor` | `data-export-generator` | `*/5 * * * *` | `156_privacy_crons.sql:26-32` |
> | `account-deletion-processor` | edge fn homónima | `0 */6 * * *` | `156_privacy_crons.sql:51-57` |
> | **`cleanup_supabase_internal_weekly`** | borra `net._http_response` y `cron.job_run_details` > 7 días | `0 9 * * 0` | `169_supabase_internal_cleanup_cron.sql:18-24` |
> | **`refresh_community_presence_hourly`** | `refresh_community_presence()` | `0 * * * *` | `181_community_presence.sql:96-99` |
> | **`tier-expiry-daily`** | `expire_overdue_tiers()` | `0 9 * * *` (3 AM en México) | `240_tier_resolution.sql:292-296` |
>
> **Qué pasa si cada uno falla, en orden de daño:**
> - **`tier-expiry-daily`**: nadie pierde el acceso al vencer su membresía. **Es una fuga de
>   ingreso silenciosa.** Es el que yo vigilaría.
> - `dispatch-agenda-notifications`: las notificaciones de agenda dejan de salir. El usuario
>   lo nota, tú no.
> - `account-deletion-processor`: **incumplimiento del derecho al olvido.** Nadie lo nota
>   hasta que alguien reclama. Y hoy además no puede avisar por correo (ver D1).
> - `data-exports-processor`: las solicitudes de portabilidad se quedan pendientes. Mismo
>   perfil de riesgo legal.
> - `cleanup_supabase_internal_weekly`: la base engorda sin límite. Lento y caro, no roto.
> - `refresh_community_presence_hourly`: la presencia en comunidad se congela. Cosmético.
>
> **Y dos crons escritos que NO están activos:** `[VERIFICADO]`
> - **`dispatch-social-notifications-minutely` está comentado** en
>   `190_social_notifications.sql:177-186`, pero el runbook de lanzamiento lo lista como
>   requerido. Ver A2.
> - `refresh-electron-window-totals-hourly` está comentado en
>   `192_electron_window_totals.sql:22-23` **a propósito**: se implementó la ruta perezosa
>   desde el RPC con advisory lock. Ese no hace falta.
>
> **El punto común de falla de los tres que llaman edge functions:** todos leen el service
> role del Vault (`099_agenda_cron.sql:13-15`). Ver B1.5.

---

# BLOQUE E · Git, ramas y el desorden acumulado

**E1.** `P0` **Hay 403 ramas.** ¿Cuáles siguen vivas?

> _Respuesta:_
>
> `[VERIFICADO]`. El 403 es correcto pero engaña, porque suma locales y remotas:
>
> | | |
> |---|---|
> | `git branch -a` | **403** |
> | Locales | **222** |
> | Remotas en `origin` | **181** |
> | **Ya mergeadas a `main`** | **215** de las locales |
> | **No mergeadas** | **7 locales, 3 remotas** |
>
> **La lista corta que no se puede borrar son siete, y deduplicadas son cuatro piezas de
> trabajo distintas:**
>
> | Rama | Último commit | Adelante | Qué es |
> |---|---|---|---|
> | `fix/ak14-citas-sovieticas` (y su remota) | 2026-07-28 | 3 | **La más grande.** 11 archivos, +13,129/-10,731. Portal de ciencia con 777 fuentes, retiro de 6 citas soviéticas inexistentes, doctrina de dosis |
> | `feat/science-portal-fase1` | 2026-07-28 | 3 | **Duplicado exacto** de la anterior: mismos tres SHA. Es la misma punta con dos nombres |
> | `feat/claims-y-dosis` | 2026-07-27 | 1 | Subconjunto de las dos de arriba |
> | `feat/overnight-partes-5b-6-7-8` | 2026-06-19 | 5 | **El segundo bloque real.** 23 archivos, +1,153/-147. Cuestionarios de historia clínica, motor `TestQuestionScreen`, agenda que respeta ventana de ayuno, máscara de embarazo |
> | `fix/swap-imagebn-assets` (y remota) | 2026-07-14 | 1 | Chico: 2 archivos, +11/-9 |
> | `feat/consolidar-supplement-scan` | 2026-07-14 | 1 | 29 archivos pero **+0/-0**: solo binarios |
> | `fix/argos-timeouts` (y remota) | 2026-05-20 | 1 | Chico: rebalanceo de timeouts, 2 archivos |
>
> **Sí, tienes permiso implícito de mi parte para tratar las otras 215 como histórico.**
> Están todas contenidas en `main`; borrarlas no pierde un solo commit. `[VERIFICADO]` con
> `git branch --merged main`.
>
> **Lo que yo haría antes de borrar nada:** un tag por cada una de las cuatro piezas de
> arriba (`historico/ak14`, `historico/overnight-5b-8`, etc.). Un tag pesa cero y sobrevive
> a un `branch -D` a las tres de la mañana.

---

**E2.** `P0` Un worktree `locked`: `cowork/ola0-limpieza`. ¿Por qué?

> _Respuesta:_
>
> 🔺 **Son dos bloqueados, no uno.** `[VERIFICADO]` con `git worktree list`:
>
> | Worktree | Rama | Razón del candado | Adelante de `main` | Atrás |
> |---|---|---|---|---|
> | `.worktrees/ola0-limpieza` | `cowork/ola0-limpieza` | `initializing` | **0** | 236 |
> | `.worktrees/ola4-tests` | `cowork/ola4-tests` | `initializing` | **0** | 201 |
>
> **La razón del candado no es deliberada: es basura.** `[VERIFICADO]` leyendo
> `.git/worktrees/<nombre>/locked`, los dos archivos dicen `initializing`. Eso significa
> que **la creación del worktree nunca terminó y el candado quedó huérfano.** No hay nadie
> protegiendo nada.
>
> **¿Tienen trabajo que no está en `main`?** **No.** `[VERIFICADO]` con
> `git log --oneline main..cowork/ola0-limpieza` y su equivalente para `ola4-tests`: los
> dos devuelven **vacío**. Los directorios tienen archivos (35 y 36 entradas) porque se
> copió el árbol, pero **no hay ni un commit exclusivo.**
>
> **Veredicto: se pueden borrar y no se pierde nada.** Van a exigir `--force` o quitar el
> candado primero, precisamente por ese archivo residual, y eso es lo que hace que alguien
> se asuste y no los toque.
>
> **Contexto que sí importa del resto:** `git worktree list` muestra **40 worktrees**, de
> los cuales **28 están `prunable`** (los de `D:/Proyectos_ClaudeCode/ELITE_Timer/ATP-MB*`
> y compañía: el directorio ya no existe). Los 12 vivos cuelgan de `.worktrees/`.
> `git worktree prune` limpia los 28 sin tocar nada real.

---

**E3.** `P0` El motor del coach está en una rama sin mergear con 7 pendientes.

> _Respuesta:_
>
> 🔺 **Esto es falso y es de las correcciones más útiles que puedo dejar.**
>
> `[VERIFICADO]`: busqué todas las ramas de la familia coach y motor
> (`git branch -a | grep -i "coach\|motor\|argos"` → 16 locales y 15 remotas). **Las ocho
> de la familia coach están todas mergeadas a `main`:**
>
> ```
> fix/sprint-3-motor                     2026-07-15
> feat/motor-edad-atp-v2                 2026-06-10
> feat/coach-engine-fixes-and-devtools   2026-06-02
> feat/coach-engine-wire-production      2026-06-02
> feat/coach-engine-hardening            2026-06-02
> feat/coach-engine-modules-impl         2026-06-01
> feat/coach-atp-domain-transitional     2026-05-31
> feat/coach-universal-blocks-foundation 2026-05-31
> ```
>
> Los merges están en `main`: `b69e9d7` ("wire coach-engine a producción"), `14ed09c`,
> `77c4034`, `bd0e685`, `a2eabdf`, `5839114`. **El código vive en
> `src/lib/coach-engine/` con 17 módulos y 10 suites de pruebas.** Está en `main` desde el
> 2 de junio.
>
> **La única rama de esa búsqueda que no está mergeada es `fix/argos-timeouts`**, de mayo,
> con un commit de 8 líneas sobre timeouts.
>
> **De dónde salió la afirmación:** `[VERIFICADO]`
> `R and D/PENDIENTES_COMPLETOS_2026-08-17.md:387`, pendiente T-10, texto literal:
> *"El motor del coach está en una rama sin mergear con 7 pendientes."*
>
> **Mi lectura: la primera mitad es falsa y la segunda probablemente es cierta.** Los 7
> pendientes existen, pero son deuda **dentro de `main`**, no trabajo atorado en una rama.
> Lo confirma el pendiente hermano, T-15 (`:405`): *"el orquestador del coach tiene la
> recurrencia fija en falso y no enriquece el contexto con la energía del día"*, que
> describe deuda de código vivo. También hay
> `R and D/02_pending_implementation/COACH_ENGINE_WIRE_RUNBOOK.md`.
>
> **Qué se pierde si nunca se mergea: nada, porque no hay nada que mergear.** Lo que sí se
> pierde es tiempo, el del siguiente desarrollador buscando una rama que no existe. **Esa
> línea hay que corregirla antes de que este handoff se cierre.**

---

**E4.** `P1` ¿Hay commits en ramas que nunca llegaron a `main` y que **deberían**?

> _Respuesta:_
>
> `[VERIFICADO]`. **De este ciclo, nada:** `git log --all --not main --oneline --since="2026-08-01"`
> devuelve **cero commits**. Todo agosto está en `main`.
>
> **El universo total de trabajo fuera de `main` son 13 commits**, todos de mayo a julio, y
> son las cuatro piezas de E1. **Las dos que yo sí rescataría:**
>
> **1. Portal de ciencia y expediente AK-14** (`fix/ak14-citas-sovieticas`, 3 commits,
> +13K líneas). Contiene el catálogo de 777 fuentes con tipo y DOI, y **el retiro de seis
> citas soviéticas que no existen.** Esa segunda parte no es una mejora: es una corrección
> de honestidad científica que hoy no está en `main`. Si el portal de ciencia se publica
> alguna vez, se publica sin ese arreglo.
>
> **2. Overnight partes 5b a 8** (`feat/overnight-partes-5b-6-7-8`, 5 commits, +1,153
> líneas). Cuestionarios de historia clínica y un motor de preguntas reusable. Dado que la
> historia clínica es parte del expediente que este ciclo reinventó, **vale revisar si algo
> de ahí se reimplementó desde cero sin saber que ya existía.**
>
> Además esa rama tiene **dos commits de stash colgando** (`ae86c85`, `8ed501e`, del 21 de
> junio) con trabajo a medias de feedback N3 solo para desarrollo. Los stashes colgados son
> lo primero que desaparece en una limpieza de git.
>
> Las otras dos (`fix/swap-imagebn-assets`, `feat/consolidar-supplement-scan`) son chicas o
> están superadas. `fix/argos-timeouts` es de mayo y probablemente ya no aplica.

---

**E5.** `P1` Los últimos 30 commits tienen a "Cowork" como autor. ¿Cuántos agentes hay?

> _Respuesta:_
>
> `[VERIFICADO]` con `git log --format="%an" | sort | uniq -c | sort -rn`. **Hay 7
> identidades de git y son 2 personas reales**, sobre 1,937 commits:
>
> ```
> 1,718  <el dueño, config principal>  ┐
>     3  <el dueño, config alterna>    ┘  el mismo humano, dos configs → 1,721 (89%)
>   203  Cowork                  ┐
>     5  Cowork OLA6             │
>     4  cowork                  │  el mismo agente, nombre por tanda → 215 (11%)
>     3  Cowork noche3           │
>     1  Cowork (Claude)         ┘
> ```
>
> **`Cowork OLA6` y `Cowork noche3` delatan el método:** el `user.name` de git se cambiaba
> por tanda de trabajo o por worktree. **No hay ningún tercero. Nunca ha escrito en este
> repo nadie más que el dueño y agentes.**
>
> **Cuántos agentes distintos trabajaron en paralelo:** `[ME LO DIJERON]` que fueron
> muchos, cada uno en su worktree. `[VERIFICADO]` la huella: hay 12 worktrees vivos bajo
> `.worktrees/` con nombres de tanda (`noche1-health`, `noche2-reports`, `noche3-argos`,
> `ola0-limpieza`, `ola0-visual`, `ola1-reports`, `ola3-nutricion`, `ola4-tests`,
> `ola5-emociones`, `ola6-salud`, `argos-contexto`, `cowork-fase0`) y 28 prunables con
> nombres `ATP-MB*`. **Eso son 40 tandas de trabajo aisladas, no 40 agentes simultáneos.**
>
> **Cómo se coordinaron para no pisarse:** un worktree por agente, y el checkout principal
> es del dueño; los agentes nunca escriben ahí. El dueño hace el merge. `[VERIFICADO]`
> como práctica declarada en `TAKEOVER_DEV_LEAD_2026-08-18.md:231`: *"nunca escribo en tu
> checkout principal"*.
>
> **Un arreglo de cinco minutos que nadie ha hecho:** un `.mailmap` que colapse las siete
> identidades a dos. Sin él, cualquier estadística de autoría del repo es falsa.

---

**E6.** `P2` ¿Cuál es la convención de mensajes de commit? ¿Regla escrita o costumbre?

> _Respuesta:_
>
> **Costumbre, fortísima, y no está escrita en ningún lado.** `[VERIFICADO]`.
>
> **El patrón real de los últimos ~300 commits:**
> ```
> PREFIJO-EN-MAYÚSCULAS[-N]: frase en español, en minúscula, que dice el porqué
> ```
> - 240 de los últimos 300 lo siguen. **Cero usan Conventional Commits.**
> - **El prefijo es el nombre del tramo de trabajo, no un tipo semántico.** `CIERRE-1`,
>   `NOCHE-CLARO`, `PREMIUM`, `VOZ`, `EDAD`, `CONSENT`, `OLA4`, `FIX`. Hay unos 60 prefijos
>   distintos, uno por tanda.
> - **El asunto explica el efecto o la causa, no la acción.** Ejemplos reales: *"el
>   comentario de pesos placeholder llevaba dos meses mintiendo"*, *"HOY deja de saludar
>   con el reloj de anoche"*, *"los llamadores no-chat dejan de pagar una cache que no
>   pueden usar"*. Sujeto igual a la cosa arreglada, verbo en presente.
> - **Cuerpo largo, obligatorio en la práctica:** 1,717 líneas de cuerpo en los últimos 100
>   commits, o sea unas 17 líneas por commit, con secciones en mayúsculas y el estado de
>   `tsc` y `vitest` al final.
> - Sin acentos en asunto y cuerpo, por codificación, no por estilo.
>
> **El dato que va a confundir al que llegue:** `[VERIFICADO]`, en el histórico hay **1,056
> commits en Conventional Commits** (`feat(p8):`, `fix(argos):`) contra **308 en el estilo
> de mayúsculas**. El corte es nítido: el estilo actual arranca el **17 de julio de 2026**
> con `9892711`. **Quien mire el historial va a concluir lo contrario de lo que se usa
> hoy**, porque el estilo viejo gana tres a uno por volumen.
>
> **¿Hay documento que lo declare?** `[VERIFICADO]`: **no.** `CLAUDE.md` tiene 12 reglas no
> negociables y **ninguna menciona commits**. Los cinco archivos de `R and D/HANDOVER/`
> mencionan commits solo como métrica. Lo más cercano son instrucciones de brief sueltas:
> `R and D/AWAY_RUN_MB12_BETA_READY.md:11` (*"un commit por tramo, con el prefijo del tramo
> en el mensaje"*) y su auditoría `R and D/CHECKLIST_AUDIT_MB12.md:27`, que marca como
> falso arreglo *"un solo commit gigante"*.
>
> **Recomendación: escribirla como regla 13 de `CLAUDE.md`.** Cabe en tres líneas y evita
> que el siguiente vuelva a Conventional Commits por imitación del historial.

---

# BLOQUE F · Base de datos, seguridad y migraciones

**F1.** `P0` La numeración salta de 267 a 275, de 276 a 290, y de 290 a 295. ¿Qué pasó?

> _Respuesta:_
>
> `[VERIFICADO]`, y la respuesta es tranquilizadora: **numeración nunca usada, no
> migraciones borradas.**
>
> **Los datos:** 220 archivos en `supabase/migrations/`, del `001_scheduled_routines.sql`
> al `295_techo_por_gasto.sql`. Los tres saltos que mencionas se confirman, y la lista
> completa de huecos es:
> ```
> 004-005 · 016 · 028 · 037 · 059 · 105-149 · 268-274 · 277-289 · 291-294
> ```
>
> **La verificación que descarta el borrado:** `git log --all --diff-filter=D --name-only
> -- supabase/migrations/` devuelve **36 archivos borrados en toda la historia, todos de
> numeración baja**, y ninguno abre un hueco:
> - `002_assign_routine_and_coach_rls.sql`, borrado en `c0b10e0` (19 de junio) por nombre
>   duplicado. No abre hueco: `002_assign_routine.sql` sigue ahí. **Es el único borrado
>   definitivo del repo.**
> - Los otros 35 (`041_*` a `076_*`) se borraron en `d0fe0d0` (18 de junio) y **se
>   volvieron a añadir al día siguiente** en `f7183fe` ("reconciliar archivos core sin
>   trackear"). Todos existen hoy. Fue un accidente de trackeo.
>
> Barrí además **todos los nombres que existieron alguna vez en cualquier rama**: no hay ni
> un archivo con prefijo 268 a 274, 277 a 289, 291 a 294, ni 105 a 149.
>
> **Conclusión: son bloques reservados por tema.** El hueco de 105 a 149, que son 45
> números, es la prueba: nadie escribe y borra 45 migraciones seguidas.
>
> **Lo que sí deberías saber, y es un problema mucho mayor que los huecos:** hay objetos de
> base que **ninguna migración crea**. Ver B2.2 y F5. El repositorio de migraciones **no es
> una descripción completa de la base.** Si mañana hay que reconstruirla, no sale.

---

**F2.** `P0` `invite_client_by_email` ejecutable por `anon`, vínculo en `'active'`, 44
tablas confiando. ¿Sabías? ¿Hay razón de producto?

> _Respuesta:_
>
> **Sí, se supo, y salió en este mismo ciclo.** Está documentado como S-1 en
> `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md:75-130`, y la migración de cierre está escrita
> y **sin aplicar** en `R and D/296_sec_invite_consentido.sql`.
>
> **Lo que verifiqué yo, en el repo:**
>
> `[VERIFICADO]` **El vínculo sí nace en `'active'` sin que el paciente acepte.**
> `supabase/migrations/008_invite_client.sql:31-34`:
> ```sql
> INSERT INTO coach_clients (coach_id, client_id, status)
> VALUES (p_coach_id, v_client_id, 'active')
> ON CONFLICT (coach_id, client_id) DO UPDATE SET status = 'active', connected_at = now();
> ```
> Y peor: **la función toma el coach del parámetro, no del token** (`008:7`,
> `p_coach_id UUID`), y el llamador lo pasa desde el cliente
> (`src/services/coach-service.ts:127-129`). O sea que ni siquiera hace falta ser coach.
>
> 🔺 `[VERIFICADO]` **La explicación que circula sobre por qué se reabrió el permiso no la
> sostiene el repo.** Ya lo desarrollé en B2.1: **no existe ningún `CREATE OR REPLACE
> FUNCTION invite_client_by_email` después de la migración 227.** Las únicas cuatro
> migraciones que la mencionan son 008, 198 (comentario), 227 y 228, y la 228 usa `ALTER
> FUNCTION ... SET search_path`, que no toca grants.
>
> Y algo más: `[VERIFICADO]` **no existe una sola línea `GRANT EXECUTE ... TO anon` en las
> 220 migraciones.** El permiso viene del privilegio por defecto del esquema `public` de
> Supabase, cosa que la propia migración 227 explica en `:5-8`.
>
> **O sea que la causa real no está documentada.** Lo más probable, `[CREO]`, es una
> edición por el editor SQL, y hay precedente escrito de eso en
> `198_rewrite_handle_new_user.sql:7-9`. **Si el permiso volvió a abrirse por una edición
> fuera del repo, entonces cerrarlo con una migración lo va a volver a abrir la próxima vez
> que alguien edite por fuera.** La cura no es la migración 296: es dejar de editar la base
> por fuera, o poner un guard que le pregunte al servidor.
>
> **¿El estado hoy? `NO SÉ`.** No puedo consultar `has_function_privilege` desde aquí. La
> única forma de saberlo es correr la consulta que trae el final del propio archivo 296.
>
> **¿Hay razón de producto para que el vínculo nazca activo?** `[CREO]` que sí la hubo:
> es una decisión de la migración 008, o sea de los primeros días del proyecto, cuando el
> panel de coach era la herramienta de una persona invitando a sus propios pacientes. **En
> ese contexto es razonable y ahorra un paso.** En el contexto de una app pública con
> usuarios reales adentro, es un agujero.
>
> **Y hay un dato que hace la decisión fácil:** `[VERIFICADO]` **la app ya tiene construido
> el camino correcto al lado.** `connect_to_coach(p_code)` exige un código que el coach
> entrega, o sea que sí pide consentimiento. **No hay que diseñar nada nuevo: hay que
> migrar los llamadores.**
>
> **Sobre el archivo 296, dos cosas prácticas:** `[VERIFICADO]`
> 1. **Vive en `R and D/`, no en `supabase/migrations/`.** `db push` no lo va a ver.
> 2. **No cierra el diseño, solo el permiso y la suplantación.** Deriva el coach del token
>    (`:53`, `auth.uid()`), aborta si no hay sesión (`:58-60`) y si el parámetro no coincide
>    (`:64-66`), y hace los `REVOKE` **después** del `CREATE OR REPLACE` (`:106-108`),
>    con la nota de que al revés el revoke se pierde (`:23-24`). **El `INSERT ... 'active'`
>    lo deja intacto** (`:85-88`) y agenda la aceptación explícita para la primera semana de
>    septiembre (`:26-31`). También revoca `increment_argos_usage` (`:111-113`).

---

**F3.** `P0` ¿Quién usa hoy el panel de coach?

> _Respuesta:_
>
> **`NO SÉ` quién lo usa, y esto lo tiene que contestar el dueño**, porque la respuesta
> está en la tabla `coach_clients` de producción y en su cabeza, no en el repo.
>
> **Lo que sí puedo darte, `[VERIFICADO]`, y que cambia cuánto puedes apretar:**
>
> **1. Es prácticamente inalcanzable hoy.** `app/(tabs)/_layout.tsx:192`:
> ```ts
> const showCoachPanel = width >= COACH_PANEL_MIN_WIDTH && isCoach && !forceAthleteView;
> ```
> con `COACH_PANEL_MIN_WIDTH = 1024` (`:46`). **Exige pantalla de al menos 1024 px de
> ancho.** En un teléfono no aparece nunca, ni siquiera para un coach real.
>
> **2. El rol no está declarado: se deriva.** `src/hooks/useCoachStatus.ts:39`:
> ```ts
> const isCoach = coachCode !== null || clientCount > 0;
> ```
> `coach_code` sale de `profiles`, `clientCount` de `coach_clients` con `status='active'`.
>
> **3. Y aquí está la trampa que conecta con F2:** como `isCoach` se deriva de tener al
> menos un cliente activo, **y `invite_client_by_email` crea vínculos activos sin
> consentimiento, un atacante que se autoinvita un cliente se convierte en coach a los ojos
> de la app.** El agujero no solo abre datos: **fabrica el rol.** Eso no está en el
> documento de S-1.
>
> **4. No hay ruta ni entrada de menú.** No existe `app/coach*`; el panel vive en
> `src/screens/coach/` y solo se monta desde `CoachPanelLayout.tsx:19` y `:325`.
>
> **Mi recomendación operativa:** puedes ser muy agresivo cerrando la superficie **de la
> función RPC**, porque cerrarla no toca el panel. Lo que sí requiere cuidado es cambiar el
> `INSERT ... 'active'`, porque eso sí rompe el flujo de invitación de quien lo use hoy. **Y
> para saber quién lo usa hoy basta una consulta:** `select count(*) from coach_clients
> where status='active'` agrupado por `coach_id`. **Eso lo puede correr el dueño en dos
> minutos y desbloquea la decisión entera.**

---

**F4.** `P1` 9 tablas con RLS activa y sin políticas, tres en `elite_dx`. ¿Muertas o
pantalla rota?

> _Respuesta:_
>
> `[VERIFICADO]` con un barrido de texto sobre las 220 migraciones. **Aviso de método: esto
> es texto, no el estado real de la base.** Objetos creados fuera del repo no aparecen, y
> políticas añadidas por el editor SQL tampoco. El estado vivo se consulta con `pg_policies`.
>
> **Sin política en ningún lado del repo:**
>
> | Tabla | Dónde se le enciende RLS |
> |---|---|
> | `activation_codes` | `239_activation_codes.sql:32` |
> | `payment_webhook_events` | `241_payment_webhook_events.sql:39` |
> | `push_failure_log` | `161_push_failure_log.sql:22` (documentada como intencional en la 230) |
> | **`routine_assignments`** | `038_security_hardening.sql:19` |
>
> **`routine_assignments` es la que hay que mirar.** `[VERIFICADO]`: la migración 038 le
> enciende RLS en la línea 19 y **luego se le olvida en el arreglo de políticas dinámicas
> de la línea 94**. Con RLS encendida y cero políticas, la tabla **deniega todo salvo
> `service_role`**. Falla cerrado, o sea que no es fuga, **pero probablemente rompe
> cualquier lectura de asignaciones de rutina desde el cliente.** Esa es la candidata
> número uno a "función rota esperando a que alguien la reporte".
>
> **Grupo de riesgo condicional:** `routines`, `execution_logs`, `execution_block_logs`,
> `exercise_logs`, `personal_records`, `user_subscriptions` están cubiertas **solo** por el
> bucle dinámico de `038_security_hardening.sql:90-134`, que crea políticas con
> `EXECUTE format(...)` **condicionado a que la tabla tenga columna `user_id`**. Si alguna
> no la tiene, quedó con RLS encendida y cero políticas y nadie se enteró.
>
> **Las tres de `elite_dx`:** ver F5. **Respuesta corta: están muertas para la app.**
>
> **Las tres primeras de la tabla (`activation_codes`, `payment_webhook_events`,
> `push_failure_log`) `[CREO]` que están bien así**, porque las tres son tablas que solo
> toca el servidor: códigos de activación que acredita un webhook, log de webhooks, y log
> de fallos de push. Ninguna se lee desde el cliente. Pero es `[CREO]`, no lo verifiqué
> llamador por llamador.

---

**F5.** `P1` ¿Qué es `elite_dx`?

> _Respuesta:_
>
> `[VERIFICADO]`, y la respuesta corta es: **es un esquema de herramienta clínica interna
> que la app no toca, y que ninguna migración crea.**
>
> **Lo que encontré:**
> - **Ninguna migración crea el esquema ni sus tablas.** `grep "CREATE SCHEMA"` en las 220
>   migraciones: **cero resultados**.
> - Aparece en dos migraciones y las dos solo lo documentan:
>   `227_sec_revoke_anon_rpc.sql:35` (comentario sobre las RPC clínicas) y
>   `230_sec_rls_documented.sql:24-26`, que solo pone `COMMENT ON TABLE` con un guard
>   `to_regclass` porque *"el schema elite_dx no está en todos los entornos"* (`230:10-11`).
> - Las tres tablas son `elite_dx.clients`, `elite_dx.intake`,
>   `elite_dx.braverman_results`, documentadas como *"RLS ON sin policies: datos clínicos
>   solo service_role / tooling elite_dx"*.
>
> **¿Hay código de la app que las lea? No.** `[VERIFICADO]`: `git grep "elite_dx" -- src app`
> devuelve **una sola línea, y es un test de seguridad**, no una pantalla:
> `src/services/__tests__/mbsec1-superficie.test.ts:113`. Busqué también las RPC asociadas
> (`get_dx_memory`, `save_dx_memory`, `elite_intake_guardar`) en `src/` y `app/`: solo
> aparecen en ese mismo test, línea 74. **Cero llamadas desde pantallas o servicios.**
>
> **Mi lectura, `[CREO]`:** `elite_dx` es el backend de la herramienta clínica que vive
> fuera de la app, probablemente emparentada con el repo `argos-coach` (ver H3), que sirve
> a la práctica clínica y no al producto de consumo. **Que sus tablas fallen cerradas es
> correcto.**
>
> **Lo que sí me preocupa y no es sobre `elite_dx`:** es el patrón. `argos_brain`,
> `argos_config`, `argos_dx_memory` y `push_failure_log` **tampoco se crean en ninguna
> migración** y sí son del producto. Ver B2.2.

---

**F6.** `P1` De las 37 funciones `SECURITY DEFINER` ejecutables por `anon`, ¿cuáles están
abiertas a propósito?

> _Respuesta:_
>
> **`NO SÉ` cuáles están abiertas a propósito, y digo por qué en vez de rellenar: nadie las
> auditó una por una.** El propio `TAKEOVER_DEV_LEAD_2026-08-18.md:152` lo admite: *"No las
> audité una por una"*.
>
> **Lo único que puedo afirmar con certeza es la que ya confirmaste:** `get_argos_brain`
> está abierta a propósito y está bien, porque exige `ARGOS_BRAIN_READ_KEY`
> (`argos-proxy/index.ts:204`) que no viaja en el paquete de la app.
>
> **Lo que sí aporto es un dato que cambia cómo hay que atacar el problema.**
> `[VERIFICADO]`: **no existe una sola línea `GRANT EXECUTE ... TO anon` en las 220
> migraciones.** Los únicos `GRANT EXECUTE` del repo están en
> `207_economy_rpc_revoke_anon.sql:36-43` y van a `authenticated` y `service_role`.
>
> **O sea que ninguna función está abierta a `anon` a propósito por diseño explícito.**
> Todas lo están por el privilegio por defecto del esquema `public` de Supabase. **La
> pregunta correcta no es "cuáles se abrieron a propósito", es "cuáles sobreviven si las
> cierras todas".**
>
> **Y ese trabajo ya está empezado:** `227_sec_revoke_anon_rpc.sql:44-53` revoca `anon` de
> once funciones nombradas: `admin_list_reports`, `admin_resolve_report`,
> `admin_set_discoverable`, `promote_argos_brain`, `publish_argos_brain`, `get_dx_memory`,
> `save_dx_memory`, `elite_intake_guardar`, `invite_client_by_email`, `search_users`,
> `get_public_profile`.
>
> `[ME LO DIJERON]` que se verificaron esas once y **diez siguen cerradas y solo
> `invite_client_by_email` se reabrió.** No lo pude confirmar contra la base.
>
> **El inventario completo, para que el trabajo no empiece de cero:** `[VERIFICADO]`, hay
> **57 funciones distintas** con `SECURITY DEFINER` en las migraciones (88 ocurrencias del
> literal, porque varias se redefinen). Las que yo miraría primero, por lo que hacen:
> `assign_routine_to_client` (002), `handle_new_user` (008, 024, 198),
> `trigger_lab_parser_worker` (076), `create_consultation_snapshot` (010, 194),
> `credit_hplus_purchase` (244), `redeem_activation_code` (239, 240),
> `generate_activation_codes` (242), `report_user` y `block_user` (184).
>
> **La regla que yo aplicaría para no romper nada al cerrar:** una función que deriva al
> usuario del token (`auth.uid()`) **falla sola con `anon`**, porque no hay token. Esas se
> pueden cerrar sin pensar. Las peligrosas son las que reciben el identificador **como
> parámetro**, como hacía `invite_client_by_email`. **Ese es el filtro: buscar las que
> tienen `p_user_id` o `p_coach_id` en la firma.**

---

**F7.** `P1` La moneda interna murió con el pivote pero las tablas siguen con saldos.
**¿Qué se le debe a quién?**

> _Respuesta:_
>
> **`NO SÉ` a quién se le debe y cuánto, y esto lo tiene que contestar el dueño**, porque
> la respuesta es un `SELECT` sobre producción más una decisión de negocio, y ninguna de
> las dos cosas está en el repo.
>
> **Pero puedo decir exactamente dónde está la respuesta, `[VERIFICADO]`:**
>
> **1. Las tablas siguen todas vivas y con datos.** `290_membresia_unica.sql:9-18` declara
> en su encabezado que **no borra ni revoca nada**: solo hace
> `UPDATE proton_packages SET enabled = false` (`:51`) y actualiza comentarios de
> `proton_balance` (`:54`) y `proton_transactions` (`:59`). La propuesta destructiva está
> escrita y **sin aplicar** en `R and D/PREMIUM_MIGRACION_DESTRUCTIVA_PROPUESTA.md`.
>
> **2. El ledger de compras es `proton_transactions`, no hay tabla de compras aparte.**
> Las recargas pagadas se distinguen por `type = 'package_purchase'` con
> `idempotency_key = 'iap_' || transaction_id`. Las acredita `credit_hplus_purchase`
> (`244_hplus_consumables.sql:23`), llamada por el webhook de RevenueCat con `service_role`.
>
> **3. La consulta que contesta la pregunta cabe en una línea:** saldo actual por usuario
> en `proton_balance`, cruzado contra las filas de `type='package_purchase'` en
> `proton_transactions`. **Eso da quién pagó, cuánto, y cuánto no gastó.**
>
> **4. ¿Hay recargas pagadas que nunca se acreditaron? Sí, y el mecanismo de rescate
> existe.** `[VERIFICADO]`: la edge function `reclaim-hplus` existe y consulta la API
> secreta de RevenueCat para reclamar consumibles perdidos
> (`supabase/functions/reclaim-hplus/index.ts:44`). `[ME LO DIJERON]` vía
> `PENDIENTES_COMPLETOS_2026-08-17.md` (F-10) que **hoy se resuelve a mano caso por caso y
> la función sigue desplegada sin cliente que la llame.** O sea: la herramienta existe, la
> puerta para usarla no.
>
> **5. Lista de todas las tablas de moneda que siguen ahí,** por si hay que hacer el corte:
> `daily_electrons`, `electron_logs`, `electron_ranks` (039), `electron_balance` (082),
> `electron_transactions` (083), `electron_window_totals` (192), `proton_balance` (084),
> `proton_transactions` (085), `proton_action_costs` (086), `proton_packages` (087),
> `pro_boosts` (103), `affiliate_wallets` y `affiliate_codes` (101), `subscription_events`
> (103), `activation_codes` (239), `tier_grants` y `tier_history` (240),
> `payment_webhook_events` (241), `argos_spend_notices` (295).
>
> **Mi opinión sin adornos:** esto es lo único del proyecto donde hay **dinero de terceros
> en una tabla y ninguna decisión tomada.** No bloquea el lanzamiento, pero es la clase de
> cosa que se convierte en un problema de reputación cuando el primer usuario pregunte qué
> pasó con lo que pagó. Y ya hay al menos un caso conocido de alguien que pagó y se quedó
> bloqueado.

---

**F8.** `P2` ¿Hay respaldos?

> _Respuesta:_
>
> **`NO SÉ`, y no encontré nada en el repo que lo indique.** `[VERIFICADO]`: no hay script
> de respaldo, no hay workflow, no hay documento que describa una política de respaldo, y
> ninguna migración lo menciona.
>
> **Lo que `[CREO]`:** Supabase hace respaldos automáticos según el plan del proyecto, así
> que **probablemente existan sin que nadie los haya configurado.** En los planes de pago
> son diarios con retención según el plan.
>
> **Esto lo tiene que contestar el dueño**, y son tres preguntas concretas para el panel de
> Supabase: qué plan tiene el proyecto, cuál es la retención, y si hay recuperación a punto
> en el tiempo activada.
>
> **¿Alguna vez se probó restaurar uno? `[CREO]` que no**, porque no hay rastro de un
> entorno de pruebas ni de un proyecto secundario en ningún documento.
>
> **Y una razón para que esto suba de prioridad después de F1 y B2.2:** si la base tiene
> objetos que ninguna migración crea, **entonces el repositorio de migraciones no puede
> reconstruir la base.** Eso significa que el respaldo de Supabase no es un plan B, es **el
> único plan.** Vale la pena confirmar que existe antes del 1 de septiembre, no después.

---

# BLOQUE G · ARGOS

**G1.** `P0` ¿Cómo se despliega y se versiona el cerebro? ¿Cuál es la fuente de verdad?

> _Respuesta:_
>
> **La fuente de verdad del texto es el repo `ARGOS-BRAIN`. La tabla `argos_brain` es el
> canal de distribución, no la fuente.** `[VERIFICADO]` en `ARGOS-BRAIN/README.md:2`
> (*"Fuente única de verdad del cerebro ARGOS"*) y en
> `ARGOS-BRAIN/build/STORE_RUNBOOK.md:61` (la tabla es append-only con punteros, nunca se
> edita a mano).
>
> **Las dos funciones hacen cosas distintas y esa distinción es todo el ritual:**
> `[VERIFICADO]` en `ARGOS-BRAIN/build/sql/001_argos_brain.sql:58-73`
> - **`publish_argos_brain` toca solo `is_current`**, o sea mueve la cabeza de **staging**:
> ```sql
> update argos_brain set is_current=false where product=p_product and is_current;
> insert into argos_brain(... is_current, published_by) values (..., true, 'rpc');
> ```
> - **`promote_argos_brain` toca `is_production`.** Producción lee un puntero **fijado**, no
>   la cabeza. Documentado en `STORE_RUNBOOK.md:32` y con el equivalente manual en `:68-69`.
>
> **El ritual, paso por paso** (`STORE_RUNBOOK.md:31-51`):
> 1. Editar los `.md` y subir `VERSION.md`.
> 2. `node build/publish-brain.mjs` (acepta `--dry-run`), con `SUPABASE_URL`,
>    `SUPABASE_ANON_KEY` y `ARGOS_BRAIN_ADMIN_KEY`. Ensambla según `build/manifest.json`,
>    aborta si hay archivo fuera de manifiesto, y **corre el test de fuga clínica**: si
>    contenido del dominio clínico aparece en el paquete de la app, `exit 1`
>    (`publish-brain.mjs:74-83`). Publica a **staging**. Producción no cambia.
> 3. Probar staging con `BRAIN_CHANNEL=staging` y correr el set dorado de 40 casos
>    (`build/regression/golden_set.json`).
> 4. `node build/promote-brain.mjs all <version>`. Los runtimes lo toman en 5 minutos o
>    menos por el TTL de caché, **sin redespliegue**.
> 5. Rollback igual a promover una versión anterior.
>
> ---
>
> ### 🔺 Y ahora el hallazgo que en mi opinión es el más grave de toda la entrevista
>
> **El cerebro que corre dentro del proxy está dos versiones atrás del repo del cerebro.**
>
> `[VERIFICADO]`:
> - `ARGOS-BRAIN/VERSION.md:3` declara **v1.22.1**, del 18 de agosto de 2026. El repo tiene
>   commits de ese mismo día (HEAD `c4d55e4`).
> - **Pero `supabase/functions/argos-proxy/brain.generated.ts:9` declara
>   `BRAIN_VERSION = "1.20.0"`.** Ese archivo es autogenerado por
>   `ARGOS-BRAIN/build/sync-brain-app.mjs` (dice "NO editar a mano" en `:1`) y el proxy lo
>   importa en `argos-proxy/index.ts:7-8`.
>
> **O sea que alguien publicó y promovió v1.22.1 y no corrió `sync-brain-app.mjs`, o lo
> corrió y no commiteó el resultado.** Se me dijo que el cerebro v1.22.1 estaba "ya
> publicado y promovido a producción". Lo que está en el repo de la app es 1.20.0.
>
> **Qué se pierde:** todo lo que entró en v1.21 y v1.22, que incluye los cambios de formato
> canónico y de seguridad clínica. **Si alguien corrigió el prompt para que ARGOS dejara de
> hacer algo, ese cambio puede no estar corriendo.** Conecta directo con el error de premisa
> 3 (ver C1): se acusó a ARGOS de improvisar lo del endocrinólogo cuando el prompt lo pedía
> textual. **Con este drift, ni siquiera sabemos con certeza cuál prompt estaba corriendo.**
>
> **`NO SÉ` si el drift es intencional o si se olvidó el paso de sincronía.** El hecho está
> verificado; la causa no. **Es la primera pregunta que yo haría al abrir el proyecto
> mañana.**
>
> ---
>
> **Y un segundo hueco, menor pero de la misma familia:** `[VERIFICADO]` el cuerpo SQL de
> `promote_argos_brain` **no existe en ninguno de los dos repos**, ni la migración que crea
> la columna `is_production`, ni la firma de tres argumentos de
> `get_argos_brain(p_product, p_key, p_channel)` que el proxy llama en
> `argos-proxy/index.ts:202-209` (el SQL documental define la de **dos**, en
> `001_argos_brain.sql:46`). **El archivo documental quedó atrás de la base.**

---

**G2.** `P0` ¿Qué modelo está sirviendo hoy en producción, de verdad?

> _Respuesta:_
>
> 🔺 **`claude-sonnet-5`. `CLAUDE.md` está desactualizado.** `[VERIFICADO]`:
> - `supabase/functions/argos-proxy/index.ts:27`:
>   `const PRIMARY_MODEL_DEFAULT = "claude-sonnet-5"; // 2026-07-06: upgrade Sonnet 4.6 → 5`
> - `src/constants/llm-config.ts:6`: `PRIMARY_MODEL: 'claude-sonnet-5'`, y de ahí lo toman
>   todos los servicios (`argos-service.ts:38-39`, `nutrition-service.ts`,
>   `dx-engine.ts:279`, `bha-service.ts:61`).
>
> El `claude-sonnet-4-20250514` que `CLAUDE.md` menciona sobrevive en dos lugares y ninguno
> es el camino vivo: como fila de precios para logs históricos
> (`argos-proxy/index.ts:43`, comentada `// legacy`) y como default del proxy viejo
> `anthropic-proxy/index.ts:83`.
>
> **Drift menor que vale anotar:** `supabase/functions/lab-parser-worker/index.ts:22` usa
> `claude-sonnet-4-6`, o sea que el procesador de laboratorios corre con un modelo distinto
> al resto. `NO SÉ` si es a propósito.
>
> **Matiz sobre quién decide el modelo:** el proxy respeta el modelo que manda el cliente,
> salvo que el router esté activo (`resolveRoute`, `index.ts:128-131`). El router solo manda
> en los tipos de petición listados en la variable `MODEL_ROUTING_ENABLED_TYPES`
> (`:110-115`); **si esa variable no está puesta, el comportamiento es el legacy.** O sea
> que el modelo real depende de una variable de entorno cuyo valor no puedo ver.
>
> **`CLAUDE.md` hay que corregirlo**, y ver J1: no es el único número que miente ahí.

---

**G3.** `P1` El fallback a OpenAI. ¿Existe? ¿Qué pasa si Anthropic se cae?

> _Respuesta:_
>
> 🔺 **El fallback existe, está en producción, y no es a OpenAI: es a Google Gemini.**
> `[VERIFICADO]` en `supabase/functions/argos-proxy/index.ts:26`
> (`const FALLBACK_MODEL = "gemini-2.5-flash"`), llamado contra
> `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` (`:482`) con
> `GEMINI_API_KEY` (`:487`). Usa el endpoint compatible con la forma de OpenAI, pero el
> proveedor es Google. **Coincide con la doctrina del proyecto de no usar OpenAI.**
>
> **Qué pasa exactamente si Anthropic devuelve error** (`index.ts:1278-1414`):
>
> 1. **No hay reintento a Anthropic.** Un solo intento, con timeout de 55 segundos. El
>    error se captura en `:1315-1318`.
> 2. **Si la petición traía un PDF, se cae sin fallback: 502 `anthropic_pdf_error`**
>    (`:1322-1335`). La razón está escrita: Gemini no procesa `type:"document"` y devuelve
>    basura. **Esto significa que el procesamiento de laboratorios por PDF no tiene red.**
> 3. **Si no es PDF, va a Gemini** (`:1338-1370`). Si responde, devuelve 200 con
>    `_fallback: true` y loguea `anthropic_failed:<err>`.
> 4. **Si Gemini también falla, responde 200 con `_degraded: true`** y el texto "ARGOS no
>    está disponible en este momento. Intenta de nuevo en un par de minutos" (`:1405-1414`).
>    Loguea `both_failed`.
> 5. Aparte: si el POST de streaming falla, cae a modo sin streaming (`:1228-1231`).
>
> **Lo que está bien hecho:** hay dos proveedores, la degradación es honesta con el usuario,
> y todo queda logueado con la causa.
>
> **Lo que vigilaría:** el punto 2. Si Anthropic tiene un mal día, **los usuarios que suban
> un PDF de laboratorio ven un 502** mientras los que hacen chat siguen funcionando. Eso se
> va a leer como "los labs están rotos", no como "Anthropic está caído".

---

**G4.** `P1` El techo por gasto. ¿Cuál es el gasto real y en cuánto está calibrado
`CORTE_FRAUDE_DIARIO_USD`? ¿Se ha disparado?

> _Respuesta:_
>
> **El gasto real diario y mensual: `NO SÉ`.** Eso vive en `argos_logs` y en la factura de
> Anthropic. **Lo tiene que contestar el dueño**, o sacarse con la consulta que trae
> `R and D/ARGOS_COSTOS_2026-08/INGENIERIA_DE_CACHE_ATP.md:120-130`.
>
> **Si se ha disparado alguna vez: `NO SÉ`.** Se sabría mirando `argos_spend_notices`.
>
> **La calibración sí la puedo dar entera, `[VERIFICADO]`, y trae dos sorpresas.**
>
> **Sorpresa 1: no es una variable de entorno. Está en el código.**
> `argos-proxy/index.ts:611-612`:
> ```ts
> const CORTE_FRAUDE_DIARIO_MXN = 500;
> const CORTE_FRAUDE_DIARIO_USD = CORTE_FRAUDE_DIARIO_MXN / TIPO_DE_CAMBIO_USD_MXN; // ≈ 26.67 USD
> ```
> con `TIPO_DE_CAMBIO_USD_MXN = 18.75` (`:568`). **Cambiar el umbral exige redesplegar el
> edge function.** Y existen mecanismos de override por variable de entorno para otras cosas
> (`MODEL_ROUTING_OVERRIDES`, `QUOTA_WEIGHT_OVERRIDES`, `BRAIN_CHANNEL`), **pero no para los
> umbrales de gasto.** En una emergencia de costos, eso es lo que va a doler.
>
> Y el tipo de cambio está clavado en 18.75. Cuando el peso se mueva, el corte real se mueve
> con él sin que nadie lo decida.
>
> **Sorpresa 2: el fail-open no está donde la pregunta lo sitúa.** `[VERIFICADO]`: la
> migración `295_techo_por_gasto.sql` **no tiene fail-open**; la función SQL (`:85-156`) si
> truena, truena. **Las dos ramas de fail-open están en el edge function**, en
> `evaluarGasto`: `index.ts:846-849` (error, dato ausente o forma inesperada) y `:869-872`
> (excepción). El docblock de `:824-830` lo declara deliberado.
>
> **Otros dos números de la calibración:** `AVISO_GASTO_MENSUAL_MXN = 150` (`:585`), que
> **nunca corta**, solo escribe una fila al mes en `argos_spend_notices` (`295:129-138`). Y
> `RESERVA_POR_LLAMADA_USD = 0.006` (`:627`), reconciliada después por `record_argos_spend`
> (`295:165-182`, llamada desde `index.ts:286`). El corte de fraude bloquea **sin reservar**
> (`295:122-127`).

---

**G5.** `P1` `ARGOS_SUFIJO_DE_EVIDENCIA` está en `false`. ¿Por qué no se encendió?

> _Respuesta:_
>
> **Porque nunca debió existir. No es una bandera que espera su turno: es una bandera que
> apaga algo que estaba mal.** `[VERIFICADO]` leyendo el comentario en
> `src/constants/flags.ts:698-708`, que transcribo porque contesta mejor que yo:
>
> > En el pantallazo del dueño salen DOS disclaimers apilados al final: este y el de "ARGOS
> > no es médico". El segundo es de cumplimiento y se queda: su texto está en Business
> > development/Legal/04_Disclaimers_Medicos_por_Pantalla.md. Este NO aparece en ningún
> > documento legal (verificado por búsqueda en las dos carpetas Legal): **es deuda de
> > ingeniería auto-impuesta.**
> >
> > Y se dispara con keywords tan comunes como "toma ", "protocolo" o "ayuno", así que salía
> > casi siempre. El propio cerebro de ARGOS dice que el deslinde "no es una muletilla de
> > miedo pegada al final". **Era exactamente eso.**
>
> **O sea: se apagó a propósito, con verificación de que no tenía respaldo legal, y no hay
> plan de encenderla.** Si alguien la ve en `false` y piensa "hay que encenderla antes de
> lanzar", estaría reintroduciendo el problema. **Es candidata a borrarse, no a encenderse.**
>
> Para contraste, la otra apagada sí espera su turno. `FASTING_MEASURED_MODE`, comentario en
> `flags.ts:50-56`: *"El modo medido depende de captura de glucosa/cetonas en contexto de
> ayuno y requiere validación en device... El core y el cableado están listos; se enciende
> tras el device test."* Con la advertencia de doctrina de que el GKI se usa como profundidad
> de cetosis y **nunca** como afirmación de autofagia.

---

**G6.** `P2` La caché de insights acierta 0.7%. ¿Está diagnosticado el porqué?

> _Respuesta:_
>
> 🔺 **Sí está diagnosticado, y la premisa de la pregunta apunta al objeto equivocado.**
>
> `[VERIFICADO]`: **el 0.7% no es el acierto de un caché de aplicación con llave.** Es el
> **prompt caching de Anthropic**: la proporción de llamadas con `cache_read_tokens > 0`
> sobre el total. La medición está en
> `R and D/ARGOS_COSTOS_2026-08/INGENIERIA_DE_CACHE_ATP.md:27` con su consulta en `:120-130`:
> **290 llamadas de tipo insight, 2 lecturas de caché, 157 escrituras.**
>
> **La causa está escrita**, en `R and D/ARGOS_COSTOS_2026-08/RUTEO_MODELOS_ATP.md:183`:
> *"El insight acierta el 0.7% porque dispara espaciado, uno por usuario a lo largo del
> día."* Ampliado en `INGENIERIA_DE_CACHE_ATP.md:47-51`: la caché de Anthropic vive **5
> minutos** y es compartida por espacio de trabajo. El chat viene en ráfagas y acierta 90%;
> el insight es una acción por usuario por día, a horas distintas, así que cada uno cae en
> ventana fría y paga la escritura completa. La frase que lo resume: **"el insight no se cura
> con volumen, se empeora con volumen"**.
>
> **Verifiqué la hipótesis alterna que la pregunta sugiere y es negativa.**
> `src/services/argos-insight-cache.ts` es otra cosa: es la fila cacheada en Postgres. **Su
> llave es `(user_id, date)`, sin marca de tiempo ni contador** (`:79-80` y `:46-47`), y
> `getLocalToday()` es fecha sin hora, como manda la regla 3 de `CLAUDE.md`. **No hay nada en
> la llave que cambie siempre.**
>
> De hecho el bug que sí hubo era el inverso y ya está corregido: la invalidación falseaba
> `created_at` a epoch para forzar regeneración, y se cambió a marcar `stale: true`
> (`:36-42`), con el comentario *"falsear la marca de tiempo era doblemente malo: le mentía a
> cualquier lector del historial y anulaba la única guarda de frecuencia que existía"*.
>
> **Los dos arreglos ya están aplicados**, `[VERIFICADO]`: el `ttl: "1h"` del bloque del
> cerebro está en `argos-proxy/index.ts:1116`, con el cálculo de ahorro en el comentario de
> `:1112-1115`; y el batch por ventana está encendido (`flags.ts`, `INSIGHT_EN_VENTANA = true`,
> ventanas fijas de 4 horas, uno por ventana).
>
> **Lo que falta y es de una tarde:** **volver a correr la consulta de
> `INGENIERIA_DE_CACHE_ATP.md:120-130` para ver si el 0.7% subió.** Se aplicaron dos
> arreglos y **nadie ha medido el después.** Eso es un renglón declarado cerrado sin
> evidencia, y pertenece también a C7.

---

# BLOQUE H · El continente oscuro

**H1.** `P0` ¿El panel de coach es producto vivo, en pausa, o herramienta interna?

> _Respuesta:_
>
> **Por cómo está construido, es herramienta interna de escritorio. Y para el usuario del 1
> de septiembre, no existe.** `[VERIFICADO]`, con el detalle completo en B3 y F3:
>
> - **No hay ruta.** No existe `app/coach*`. Vive en `src/screens/coach/` y se monta solo
>   desde `CoachPanelLayout.tsx:19` y `:325`.
> - **No está en la barra de pestañas.** Cuando aparece, **reemplaza la barra completa**
>   (`app/(tabs)/_layout.tsx:192`), no se agrega a ella.
> - **Exige 1024 px de ancho** (`COACH_PANEL_MIN_WIDTH`, `:46`). **En un teléfono no
>   aparece nunca**, ni siquiera para un coach real.
> - **El rol se deriva**, no se declara: `isCoach = coachCode !== null || clientCount > 0`
>   (`useCoachStatus.ts:39`).
>
> **Se lanza el 1 de septiembre en el sentido de que su código va dentro del binario, pero
> ningún usuario de teléfono lo va a ver.** Eso es lo que hay que decirle a quien pregunte.
>
> **Y la consecuencia operativa que importa:** como no se ve en teléfono, **ningún recorrido
> manual lo va a probar nunca.** Ese archivo de 4,250 líneas con 1,200 de cambios de tema es
> el único módulo del proyecto que no tiene ni pruebas automáticas ni pruebas manuales. Ver
> B3.

---

**H2.** `P1` ¿Qué queda vivo del PRD original de ELITE Coach App (marzo 2026)?

> _Respuesta:_
>
> 🔺 **El PRD no existe. `[VERIFICADO]` por tres vías:**
> 1. `Glob **/*PRD*` en el repo: **cero resultados.**
> 2. `git log --diff-filter=AD --all -- '*PRD*'`: **cero.** Nunca existió y nunca se borró.
> 3. Búsqueda de "PRD" y "ELITE Coach" en todos los `.md`: **tres coincidencias, y las tres
>    están dentro de esta misma entrevista** (`ENTREVISTA_HANDOFF_DEV_2026-08-18.md:280,338,348`).
>
> **La única fuente que afirma que ese documento existe es la pregunta.**
>
> Lo más cercano que sí existe está **fuera** del repo:
> `C:\Users\ezapa\OneDrive\EZ online\ATP\Business development\00_CIMIENTO\PRD_ATP_v1.md`,
> pero es **v1.2 del 26 de mayo de 2026**, no de marzo, es un handoff comercial a técnico, y
> **no menciona pesos de hábitos, score de disciplina, rachas ni logros.**
>
> **El contexto histórico real:** `[VERIFICADO]`, el primer commit del repo es `ce1126d`, del
> **17 de marzo de 2026**, *"Fase 1 completa: sistema de diseño, timer MVP, splash y
> dashboard"*. El rebrand a ATP llega el 24 de marzo (`12e52e9`) y el sistema de coach el 25
> (`b6b2bd8`). **El proyecto nació como ELITE Timer, no como ELITE Coach App.**
>
> **Qué sobrevivió de los cuatro conceptos, medido contra el código de hoy:**
>
> | Concepto | Estado | Evidencia |
> |---|---|---|
> | Pesos de hábitos | **Transformado.** No hay módulo de "pesos" | Lo que existe es electrones: `src/constants/electrons.ts`, `economy-config.ts`, `practice-electron-core.ts`, y el score en `daily-health-score.ts`. **No existe `atp-score-core.ts`** |
> | Score de disciplina | **No existe con ese nombre.** Grep de `discipline`/`disciplina` en `src/`: cero | Su función la cubre el compliance de protocolo en `adherence-service.ts` y `reports-service.ts` |
> | Rachas | **Sobrevivieron, y están rotas** | Ver abajo |
> | Logros | **Parcial**, como medallas de un solo pilar | `fetchMenteMedals`/`syncMenteMedals` en `mente-streaks-service.ts`. `Glob *achievement*` en `src/`: cero. No hay sistema transversal |
>
> **Las rachas merecen párrafo aparte, porque es un bug de datos que sigue vivo.**
> `[VERIFICADO]` en `src/services/reports/adherencia-report-service.ts:5-24`: **hay dos
> reglas distintas de racha en el mismo producto.**
> - `computeJournalStreak` (journal-core): días seguidos con registro, **sin día de gracia**.
> - `computeStreak`/`computeLongestStreak` (adherence-service): días de calendario con
>   compliance ≥75, **con un día de gracia**.
>
> **El comentario del propio código dice que la fusión no se hizo porque vitest no arrancaba
> en ese entorno.** O sea que el problema del `node_modules` (ver D4) **ya causó al menos un
> bug real que sigue en producción.** Y `R and D/reestructura/ANEXO_A_REPORTS.md:80` lo dice
> sin rodeos: *"sin esto dos pantallas mostrarán números distintos de la misma racha"*.
>
> **No existe `streak-core`.** Si alguien busca el archivo del pendiente NOCHE-8, no está.

---

**H3.** `P1` Los otros repos: ¿vivo, congelado o muerto? ¿Depende algo?

> _Respuesta:_
>
> `[VERIFICADO]` para los tres, con la fecha del último commit como evidencia.
>
> | Repo | Último commit | Estado | ¿Dependencia? |
> |---|---|---|---|
> | **ARGOS-BRAIN** | `c4d55e4`, **18 de agosto de 2026** (26 commits) | **VIVO** | **SÍ, dura, por generación de código** |
> | **argos-coach** | `957c97f`, **16 de agosto de 2026** (35 commits) | **VIVO pero lento** | **NO** |
> | **ATP-audio-pipeline** | **no es un repo de git**; archivo más reciente del 24 de julio | **CONGELADO** | **NO en ejecución, sí en proceso** |
>
> **ARGOS-BRAIN.** La app depende de él por codegen:
> `supabase/functions/argos-proxy/brain.generated.ts:1` dice *"AUTO-GENERADO por
> ARGOS-BRAIN/build/sync-brain-app.mjs, NO editar a mano"*, y el proxy lo importa en
> `argos-proxy/index.ts:7-8`. **Y ahí está el drift de dos versiones que documenté en G1: el
> archivo generado dice 1.20.0 y el repo va en 1.22.1.** Este es el repo que hay que vigilar,
> no el que hay que congelar.
>
> **argos-coach.** Herramienta web aparte, desplegada en Vercel (`vercel.json` con
> `api/chat.js`), con `scripts/sync-brain.mjs` que consume ARGOS-BRAIN. **No tiene README**,
> solo `system-prompt.md` y un `package.json` v2.0.0. **Cero referencias desde el código de
> la app**; solo aparece en dos documentos de handoff. Su último commit menciona pacientes
> nominales, o sea que es la herramienta de la práctica clínica. `[CREO]` que está
> emparentado con el esquema `elite_dx` (ver F5), pero no lo pude confirmar.
>
> **ATP-audio-pipeline.** `[VERIFICADO]`: **`git status` responde `fatal: not a git
> repository`.** No tiene control de versiones. Su `README.md` dice que es *"proyecto
> standalone, NO es el repo de la app"* y que el pipeline final se moverá a `scripts/` de la
> app cuando esté probado. **No hay dependencia en ejecución**, pero sí de proceso: los once
> audios `.m4a` del pilar Mente salieron de ahí, y hay un bug pendiente que solo se arregla
> ahí (metadata equivocada en `scripts/ensamble.py`, según
> `R and D/PLAN_TERMINAR_MENTE_OVERHAUL.md:42`). Los ocho mantras siguen "escritos, en
> revisión" (`:52`).
>
> **Que un proyecto que produce activos de producción no esté en git es una deuda barata de
> pagar y cara de descubrir.** Si esa carpeta se pierde, se pierden los guiones fuente de los
> audios.
>
> **Los tres están declarados quietos hasta después del 1 de septiembre**
> (`R and D/HANDOVER/04_PENDIENTES_Y_DESPLIEGUE.md:255-257`). **Coincido con dos de tres y
> disiento con ARGOS-BRAIN:** ese no puede quedarse quieto mientras haya drift de versión en
> producción.

---

**H4.** `P1` `Programas High ticket`: ¿alguna depende de software que deba mantener?

> _Respuesta:_
>
> **`NO SÉ`, y lo digo en vez de suponer.** Esa carpeta vive en la estructura de negocio en
> OneDrive, no en el repo de la app, y no la exploré porque mi encargo era el código.
>
> **Lo que sí puedo afirmar `[VERIFICADO]`: no hay nada en el repo `EliteTimer` que
> referencie ELITE, CEO ELITE, Elite Enterprise ni Retiros como producto con soporte de
> software.** Lo único emparentado es
> `R and D/reference_protocolo_retiro_rampup.md`, que es contenido de protocolo, no software.
>
> **Mi lectura, `[CREO]`:** son programas de servicio, entregados por personas, y el
> "software" que usan es la app misma más las herramientas de la práctica clínica
> (`argos-coach`, `elite_dx`). **Si eso es cierto, no hay nada extra que mantener.** Pero es
> exactamente el tipo de pregunta donde una suposición razonable cuesta semanas, así que
> **esto lo tiene que contestar el dueño.**

---

**H5.** `P2` ¿Qué es `Mamut Ultra`, `jarvis-os` y `NIVELA`? ¿Tocan datos de ATP?

> _Respuesta:_
>
> **`NO SÉ`.** `[VERIFICADO]` en lo único que puedo verificar: **ninguno de los tres nombres
> aparece en el repo `EliteTimer`.** Ni en código, ni en migraciones, ni en documentos.
>
> **Lo que eso permite afirmar y lo que no:** permite afirmar que **la app no los invoca ni
> los referencia.** **No** permite afirmar que no toquen datos de ATP, porque un proyecto
> vecino en la misma organización de Supabase podría tener credenciales al proyecto de ATP
> sin que el repo de ATP lo sepa. **Esa dirección de dependencia es invisible desde aquí.**
>
> **Esto lo tiene que contestar el dueño**, y la forma barata de contestarlo es mirar en el
> panel de Supabase si esos proyectos son proyectos **separados** (cada uno con su propia
> base, sin acceso cruzado) o si comparten algo. **Si son proyectos separados, la respuesta
> es no y se cierra en dos minutos.**

---

# BLOQUE I · Estilo de trabajo

**I1.** `P0` ¿Cómo decides el orden de lo que haces?

> _Respuesta:_
>
> **Hay criterio explícito y es de tres escalones, en este orden:**
>
> 1. **Primero, lo que bloquea el lanzamiento.** Sin esto no hay producto en la tienda: los
>    secretos, los productos en las tiendas, la razón social en el aviso de privacidad, la
>    firma clínica.
> 2. **Segundo, lo que da información de salud equivocada.** Un número mal en un biomarcador
>    o un umbral masculino aplicado a una mujer no es un bug de interfaz: es una app de salud
>    diciéndole a alguien que está bien cuando no lo está. Esto va **antes** que cualquier
>    cosa que se vea.
> 3. **Tercero, lo que se ve.**
>
> **Y una regla transversal que rompe el orden:** un hoyo de seguridad con usuarios reales
> adentro **no está en el camino crítico del lanzamiento, está antes.** Así se trató S-1.
>
> **Lo que el criterio no dice y hay que decir:** el orden lo propone quien trabaja y lo
> decide el dueño. La práctica que funcionó este ciclo es **traer los defaults ya decididos
> y que él solo vete el que no le lata.** Un veto por decisión, no una consulta abierta. Ver
> I3.

---

**I2.** `P0` ¿Cuál es tu definición de "terminado"?

> _Respuesta:_
>
> **Tres condiciones, las tres obligatorias:**
> 1. **Integrado a `main`.** No en una rama, no en un worktree. En `main`.
> 2. **`npx tsc --noEmit` y `npm test` en verde.**
> 3. **Reversible por OTA**, o sea detrás de una bandera o con el camino viejo vivo.
>
> **Y ahora lo incómodo, que es lo que la entrevista pide:** `[VERIFICADO]` **la condición 2
> no se cumplió en este ciclo.** Ningún agente pudo correr `vitest` (ver D4 y A4), así que
> todo lo que se marcó terminado se marcó con `tsc` en verde y con arneses propios en lugar
> de la suite. **Solo el dueño ha corrido `npm test` de verdad, y no sé cuándo.**
>
> Y la condición 3 tiene una excepción que el ciclo entero ignoró: **es falsa para cualquier
> bug nativo, y no quedan builds.** Ver C2.
>
> **Añadiría una cuarta condición, y esta es la lección del ciclo:** *lo verificó alguien
> más*. El principio de los cuatro ojos, que el dueño pidió como regla permanente: **todo
> trabajo lo revisa al menos un agente adicional.** Se aplicó al cerebro de ARGOS y encontró
> de inmediato dos afirmaciones falsas y un hueco de seguridad en el modo A. Tres de los
> cuatro errores de premisa de C1 los tumbó un segundo par de ojos. **No es burocracia: es
> lo único que ha funcionado.**

---

**I3.** `P1` ¿Cómo trabaja mejor el dueño contigo?

> _Respuesta:_
>
> `[ME LO DIJERON]` en su mayoría, con algo `[VERIFICADO]` en la huella de los documentos.
>
> **Lo que lo desbloquea:**
> - **Un brief con los defaults ya tomados y un solo veto por decisión.** No una lista de
>   preguntas abiertas. El formato de tabla "decisión / mi default / si vetas" de
>   `TAKEOVER_DEV_LEAD_2026-08-18.md:240-248` es exactamente eso y funcionó.
> - **Instrucciones listas para copiar y pegar, en PowerShell, sin `&&`.** Ese detalle
>   pequeño le ahorra minutos cada vez.
> - **Analogías de ingeniería.** Es ingeniero en automatización. Un sistema explicado como
>   sistema entra más rápido que un sistema explicado como código.
>
> **Lo que lo frustra:**
> - **Frenar de más.** Textual: *"eres muy precavido, en demasía"*. Verificar antes de
>   declarar algo bloqueado. **Incomodidad no es bloqueo.**
> - **Estimaciones usadas para recortar alcance.** Las estimaciones son referencia relativa;
>   **él decide el alcance, el tempo lo dicta él.** Una estimación nunca es un argumento para
>   entregar menos.
> - **Parches y soluciones provisionales.** Limpio de una. Si la solución buena tarda más, se
>   dice y se hace la buena.
> - **Redacción que suena a máquina.** Cero guiones largos, cero jerga sin presentar. Hay
>   filtro antes de entregar, y este documento pasó por él.
>
> **Cómo prefiere recibir malas noticias:** **primero y sin adornos.** El documento de toma
> de mando abre con *"lo primero, y no es agradable"* y pone el hoyo de privacidad antes que
> el plan. Eso es el registro correcto. **Lo que no tolera es enterarse tarde de algo que ya
> se sabía.** Golpe y zanahoria calibrados: no endulzar lo normal, y no dramatizar lo
> normal tampoco.
>
> **Y una que se aprende viéndolo:** cuando dice dos veces que algo "no se siente bien", **la
> premisa está mal, no la ejecución.** La respuesta correcta es cuestionar el planteamiento,
> no pulir la entrega.

---

**I4.** `P1` ¿Qué convención de código tienes en la cabeza y no está en `CLAUDE.md`?

> _Respuesta:_
>
> **La estructura, que es la más importante y no está escrita en ningún lado:**
>
> | Sufijo | Qué va | Qué NO va |
> |---|---|---|
> | `*-core.ts` | **Lógica pura.** Funciones sin efectos | **Sin React, sin Supabase, sin fechas del sistema.** Nada que no se pueda llamar desde un test |
> | `*-service.ts` | **Entrada y salida.** Consultas a Supabase, orquestación | La lógica de decisión, esa vive en el core |
> | `use*.ts` (hooks) | Estado de React y suscripciones | Lógica de negocio |
> | `app/**` | Pantallas y rutas de expo-router | Reglas de negocio |
> | `src/screens/**` | Pantallas que **no** son rutas (el panel de coach) | |
> | `src/constants/**` | Tokens, banderas, catálogos | |
>
> **Los tests van contra el core**, no contra el service. Por eso el service se puede mockear
> con un objeto vacío en 51 archivos (ver C6) sin que se pierda cobertura de verdad.
>
> **Otras convenciones no escritas:**
> - **Los nombres de archivo y de bandera van en español.** `argos-alcance-core.ts`,
>   `SEXO_NO_SE_ADIVINA`, `acceso-consentido.ts`. El código en inglés, el dominio en español.
> - **Toda bandera lleva docblock con cuatro secciones:** qué controla, por qué existe, a
>   quién le cambia algo, cómo apagarla en caliente. Ver `flags.ts` entero.
> - **Toda deuda declarada en un encabezado lleva fecha de verificación**, o no vale. Esta
>   es nueva y es respuesta directa al comentario que mintió dos meses (ver C1, error 2).
> - **Las migraciones son idempotentes obligatorias** (`IF NOT EXISTS`,
>   `ON CONFLICT DO NOTHING`). Esa sí está en `CLAUDE.md`, regla 12.
> - **Un commit por tramo, con el prefijo del tramo.** Ver E6.

---

**I5.** `P1` Los núcleos puros. ¿Es doctrina? ¿Qué debe vivir en un core?

> _Respuesta:_
>
> **Sí, es doctrina, y es lo mejor que tiene este repo.**
>
> **Qué va en un core:** cualquier cosa que se pueda contestar con una función pura.
> Clasificación de un biomarcador contra su rango, cálculo de una edad, decisión de qué
> renglones entran al día, resolución de una ruta, cálculo de contraste, matemática del GKI.
> **Si le puedes escribir una tabla de entradas y salidas esperadas, va en el core.**
>
> **Qué NO va:**
> - Nada que importe `react` o `react-native`.
> - Nada que importe el cliente de Supabase.
> - **Nada que lea el reloj o la zona horaria del sistema por su cuenta.** La fecha entra
>   como parámetro. Esto conecta con la regla 3 de `CLAUDE.md` (`getLocalToday()`,
>   `parseLocalDate()`) y es la razón de que el caché de insights tenga una llave estable
>   (ver G6).
> - Nada que emita eventos ni escriba a disco.
>
> **La prueba de fuego:** si el core no se puede probar sin mockear nada, no es un core.
>
> **Y el candado que hace que esto no se erosione, que es la parte que hay que heredar
> completa:** **los candados de doctrina en los tests se REAPUNTAN, nunca se debilitan.**
> Si un test exige que exista una función y esa función se va a borrar, **no se borra la
> aserción: se cambia a que exija lo nuevo.** Un test que se relaja para que pase deja de
> ser un candado y se convierte en decoración.
>
> Hay un ejemplo concreto esperando en la fila: `[ME LO DIJERON]` vía el pendiente F-11, si
> se revocan las funciones de gasto de la moneda interna **hay un test que exige que
> existan**, y hay que reapuntarlo, no borrarlo.
>
> **Dónde la doctrina se rompió y hay que saberlo:** los 50 guards estáticos de C5 **no son
> cores probados: son grep con forma de test.** Nacieron por una razón buena (verificar cosas
> que no tienen función pura detrás, como el texto de una migración) y crecieron hasta ser el
> 14% de la suite. **Esa es la parte del estilo que yo no heredaría tal cual.**

---

**I6.** `P1` La voz: ¿aplica también a los textos que ve el usuario?

> _Respuesta:_
>
> **Sí, y con más rigor todavía, pero no es la misma voz.**
>
> **Lo que aplica igual en lo interno y en lo que ve el usuario:**
> - **Español de México hablado.** Nada de traducción literal del inglés.
> - **Cero guiones largos.**
> - **Siglas explicadas la primera vez.** GKI, LFPDPPP, DSAR: la primera mención se explica.
> - **Cero nombres propios de personas en copy que ve el usuario.** Esta es dura y no
>   negociable.
>
> **Lo que cambia en el copy de usuario:**
> - **Ejemplos concretos y unidades amigables.** Los formularios se escriben para el teclado
>   de un iPhone, no para una hoja de cálculo.
> - **Honestidad como gancho**, sin dramatizar. Y una regla más fina que esa: **no publicar
>   controversias que rompen el efecto placebo.** El nivel de evidencia más crudo se da si
>   preguntan, no de entrada.
> - **El lenguaje respeta las guías de las tiendas aunque la doctrina interna sea más
>   fuerte.** La medicina funcional manda en el criterio; el copy manda en cómo se dice.
>   `src/components/MedicalDisclaimer.tsx` y los textos de
>   `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md` son la frontera.
> - **Los guiones de audio del pilar Mente tienen su propia regla:** cuerpo, cero jerga, y
>   alrededor del 80% de lenguaje inclusivo.
>
> **Y una advertencia práctica:** `[VERIFICADO]` en `R and D/RECORRIDO_EN_TELEFONO.md:20-22`,
> la pantalla de login todavía dice *"ACTIVA TU ENERGÍA Y SALUD"*, que es firma de otra
> época. **Hay copy viejo suelto en pantallas que nadie ha barrido.**

---

**I7.** `P2` ¿Qué herramientas valen la pena y cuáles fueron experimentos abandonados?

> _Respuesta:_
>
> `[VERIFICADO]` revisando qué está cableado en `package.json` y qué no.
>
> **Valen la pena, y están vivas:**
>
> | Herramienta | Comando | Para qué |
> |---|---|---|
> | Barrido visual | `npm run audit-visual` → `scripts/audit-visual.ps1` | Una captura por pantalla vía `adb`. Con reservas, ver I8 |
> | Barrido de color | `npm run audit-colores` → `scripts/audit-colores.js` | Encuentra hex escritos a mano |
> | Mapa de rutas | `npm run mapa` y `npm run mapa:rutas` | Genera el mapa maestro en html y xlsx |
> | Censo de rutas | `npm run censo` | Rutas contra pantallas reales |
> | Tipos de router | `npm run tipos:rutas` | Regenera `app-routes.generated.ts` |
> | Sourcemaps y OTA | `npm run sourcemaps:ota` | **El único comando de publicación válido** |
>
> **Experimentos abandonados o parciales:**
> - **Maestro (`.maestro/`).** `[VERIFICADO]` en `scripts/audit-visual.ps1:3-5`: **Maestro no
>   corre nativo en Windows**, pide WSL2 y redirigir `adb` entre los dos sistemas. Se
>   abandonó y se reemplazó por el script de PowerShell. **La carpeta `.maestro/` sobrevive
>   solo como lugar donde caen las capturas y donde vive `rutas.json`.** Que se llame
>   `.maestro` es residuo histórico y confunde.
> - **`.playwright-mcp`.** No encontré nada cableado a `package.json`. `[CREO]` que fue
>   exploración y no quedó nada.
> - **`scripts/run-tests-sin-vitest.js` y `scripts/shim-vitest.js`.** No son abandonados: son
>   **la muleta viva** del problema del `node_modules` (ver D4). El día que vitest corra en
>   Linux, sobran.
> - **`src/engine/__tests__/engine.test.ts`.** Abandonado de facto: excluido de la config y
>   sin script que lo llame. Ver B1.1.

---

**I8.** `P2` La auditoría visual falló en un tercio. ¿Cómo se corre bien?

> _Respuesta:_
>
> **Sí hay script, es `scripts/audit-visual.ps1`, y se corre con
> `npm run audit-visual` o directo:**
> ```
> .\scripts\audit-visual.ps1 -Tema oscuro
> .\scripts\audit-visual.ps1 -Tema claro -Espera 2.5
> .\scripts\audit-visual.ps1 -Solo "reports"
> ```
> `[VERIFICADO]` en `audit-visual.ps1:28-33`.
>
> **Lo que hay que hacer antes, y si no se hace las capturas salen negras:**
> **Ajustes → Pantalla → Tiempo de espera de pantalla → 10 minutos**
> (`audit-visual.ps1:22-24`). Exige teléfono conectado con depuración USB aceptada.
>
> **Por qué falla un tercio, con lo que sé y lo que no:**
> - **`[VERIFICADO]` el parámetro `-Espera` está en 1.8 segundos por default** y el propio
>   script sugiere 2.5 para tema claro. **Ese es el sospechoso número uno de las capturas a
>   media transición**, pero `NO SÉ` cuál es el valor correcto: nadie lo midió, el 2.5 es una
>   corazonada.
> - **`[VERIFICADO]` las ~30 rutas de cuestionarios que dan "Evaluación no encontrada" NO son
>   un problema del script.** El string existe en `app/tests/q/[id].tsx:272` y
>   `src/services/assessments/engine-runtime.ts:139` (`AssessmentLoadError`). **La captura es
>   correcta: la pantalla de verdad muestra ese error.** O sea que ahí el barrido funcionó y
>   encontró un bug real, y se contabilizó como fallo del barrido. **Esa distinción vale
>   revisarla con calma: puede haber 30 evaluaciones muertas y no 30 capturas malas.**
> - **`[VERIFICADO]` NO intentes arreglar el loop.** Está escrito en `audit-visual.ps1:8-15`:
>   se probó con `svc power stayon usb`, `input keyevent KEYCODE_WAKEUP`, un helper con
>   `Start-Job` y un calentamiento previo, y **los cuatro colgaron el script.** Son tres
>   comandos de `adb` en un loop y nada más.
> - **`[VERIFICADO]` `$ErrorActionPreference` tiene que ser `Continue`.** Con `Stop`, la
>   primera corrida reportó "187 rutas fallaron" cuando 135 se habían escrito bien
>   (`:47-49`). O sea que **ya hubo una vez donde el reporte del barrido mintió por
>   configuración**, no por el barrido.
>
> **Y el hallazgo que va con esta pregunta y no está en ningún lado:** `[VERIFICADO]`
> ```
> .maestro/capturas/oscuro/      309 archivos
> .maestro/capturas/oscuro-215/  185 archivos
> .maestro/capturas/claro/       NO EXISTE
> ```
> **El barrido en tema claro nunca se corrió**, y el tema claro es lo que cambió en este
> ciclo. Y `git ls-files .maestro/capturas` da **0**: **las 494 capturas no están en git.**
>
> **Lo primero que yo haría con este script:** correrlo en claro. Es media hora y es la única
> forma de saber cuántas cajas invisibles quedan.

---

# BLOQUE J · Contradicciones que necesito que arbitres

**J1.** `P0` `CLAUDE.md` contra `app.json` contra el repo. ¿Cuál es la verdad?

> _Respuesta:_
>
> **La verdad, medida hoy, `[VERIFICADO]`:**
>
> | Dato | Real | `CLAUDE.md` dice | La entrevista dice |
> |---|---|---|---|
> | Versión | **2.2.0** (`app.json:5`) | 2.2.0 ✓ | v1.2.x ✗ |
> | Commits | **1,937** | 1,929 ✗ | |
> | Archivos de código sin tests | **1,024** (976 en `src/`+`app/`) | 236K líneas | 1,321 ✗ |
> | Archivos de prueba | **347** | | 343 ✗ |
> | Banderas | **18** | | 17 ✗ |
>
> 🔺 **La premisa de la pregunta está desactualizada:** `CLAUDE.md` **ya no dice** "v1.2.x,
> 89 pantallas, 68K líneas". `[VERIFICADO]` con `git log`: el commit `0983ab4`, del 18 de
> agosto, se titula **"CLAUDE.md: los numeros al dia, porque llevaban dos meses mintiendo"**.
> Hoy dice v2.2.0, 142 pantallas reales más 59 redirects, 236K líneas, 1,929 commits.
>
> **O sea que quien escribió la entrevista leyó una copia previa al commit del mismo día.
> Es exactamente el mismo fenómeno que produjo el "11 banderas" de C3: el número se copia
> antes de que el archivo cambie.**
>
> **Qué corregir hoy en `CLAUDE.md`, `[VERIFICADO]` los tres:**
> 1. **1,929 → 1,937 commits.** Ya se desfasó ocho en menos de un día. **Mi recomendación:
>    quitar el número de commits.** No aporta nada y garantiza que el archivo mienta cada
>    semana.
> 2. **`claude-sonnet-4-20250514` → `claude-sonnet-5`.** Este es el que importa, porque un
>    desarrollador nuevo puede cambiar código creyendo que va a otro modelo. Ver G2.
> 3. **"Edge Function anthropic-proxy" y "Próximo: argos-proxy con fallback OpenAI".**
>    Las dos están viejas: `argos-proxy` **ya existe y es el principal**, y el fallback
>    **es Gemini, no OpenAI**. Ver G3.
>
> **Y el propio `CLAUDE.md` ya escribió la lección, en su sección de versión:** *"Estos
> números estuvieron dos meses desactualizados... y es el primer archivo que lee cualquiera
> que llega: si vuelven a envejecer, mienten desde la primera página."* **Le tomó menos de un
> día volver a envejecer.** La conclusión no es actualizarlo mejor: **es sacar de ahí todo
> número que cambie solo.**

---

**J2.** `P0` El inventario del 17 declara abiertos cinco bloqueantes que los commits del
mismo día cierran.

> _Respuesta:_
>
> **Sí, se escribió antes de esos commits. No estás leyendo mal.** `[VERIFICADO]` con el
> mismo método que resolvió el "11 banderas" de C3.
>
> El documento `R and D/PENDIENTES_COMPLETOS_2026-08-17.md` nació en el commit `c3b4d1d`, del
> 17 de agosto. **Después de ese commit, el mismo 17 de agosto, entraron entre otros:**
> ```
> a447a49  EDAD: el comentario de pesos placeholder llevaba dos meses mintiendo   → cierra L-5
> 5714df0  EDAD: las mujeres dejan de calificarse con la vara de hombre           → cierra L-4 en parte
> a3067ed  EDAD: umbrales femeninos de la matriz V6, y el sexo deja de adivinarse → L-4
> 7545600  SEG: el proxy deja de creerle al cuerpo, sin dejar a nadie sin ARGOS   → cierra L-16
> 5e92ee5  NAV: ARGOS deja de ofrecer moldes de ruta y empieza a resolverlos      → cierra L-15
> ```
> **El documento nació desactualizado, y por horas.**
>
> **Sobre L-13 (las cuatro migraciones), la respuesta es distinta y menos limpia.** No se
> cerró por un commit: se cerró porque las migraciones se aplicaron al remoto por fuera. Ver
> J3.
>
> **La causa raíz no es descuido de quien escribió el inventario.** Es que **el proyecto
> venía trabajando a marchas forzadas con muchos agentes en paralelo, cada uno en su
> worktree**, y nadie tenía el trabajo de mantener una sola verdad. Un documento escrito a
> las diez de la mañana describe un repo que a las seis de la tarde ya no existe.
>
> **La cura estructural, y la firmo:** un solo tablero vivo, un archivo, con lo abierto y
> nada más. Los sesenta documentos de `R and D` pasan a expediente histórico: **se consultan,
> no se obedecen.** Y nada se declara cerrado sin evidencia citable: archivo y línea,
> consulta a la base, o captura del teléfono. **"Se arregló" no es un estado.**

---

**J3.** `P1` Las cuatro migraciones sí están en el remoto. ¿Quién las aplicó y cuándo?

> _Respuesta:_
>
> **`NO SÉ` quién ni cuándo, y no lo puedo saber desde el repo.** El historial de
> migraciones aplicadas vive en la tabla `supabase_migrations.schema_migrations` del proyecto
> remoto, no en git. **Esto lo tiene que contestar el dueño**, porque `npx supabase db push`
> solo corre desde su máquina, con el CLI ligado a su cuenta.
>
> **Pero puedo contestar la pregunta de fondo, que es dónde está el hueco de información, y
> es más grave que el caso puntual:**
>
> **El hueco es que `git` no sabe qué está aplicado.** Un archivo en `supabase/migrations/`
> significa "esta migración existe", **no** "esta migración corrió". Los dos estados no
> tienen ningún puente automático. Por eso:
> - `RUNBOOK_SIN_BUILDS.md:32-33` dice que faltan dos.
> - `PENDIENTES_COMPLETOS_2026-08-17.md:170-176` dice que faltan cuatro.
> - `TAKEOVER_DEV_LEAD_2026-08-18.md:37` dice que las cuatro están aplicadas.
>
> **Los tres pueden haber sido ciertos en momentos distintos y ninguno es verificable desde
> el repo.**
>
> **Y hay un agravante que hace este hueco peor de lo que parece:** ya vimos en B2.2 y F1
> que **hay objetos de base que ninguna migración crea** (`argos_brain`, `argos_config`,
> el esquema `elite_dx`, la columna `is_production`, el cuerpo de `promote_argos_brain`). O
> sea que la deriva no es solo "el repo no sabe qué se aplicó": es que **hay cosas en la base
> que el repo ni siquiera sabe que existen.**
>
> **La cura cabe en dos comandos y debería estar en el runbook:**
> ```
> npx supabase migration list     # qué está aplicado de verdad
> npx supabase db diff            # qué hay en la base que el repo no tiene
> ```
> **El segundo es el que va a doler, y por eso hay que correrlo antes del 1 de septiembre y
> no después.**

---

**J4.** `P1` ¿Hay otro documento que sepas que está mintiendo hoy?

> _Respuesta:_
>
> **Sí, siete, y los ordeno por qué tan caro sale creerles.** Todos `[VERIFICADO]`.
>
> **1. `docs/ECONOMIA_OPERACION.md:38` dice `eas update --branch preview`.** Es exactamente
> el comando que `RUNBOOK_SIN_BUILDS.md:27-30` prohíbe. **Quien siga ese documento publica
> con los mapas rotos y no se entera hasta que necesite leer un stacktrace en una
> emergencia.** Este es el peor de los siete porque el daño es invisible y diferido.
>
> **2. `SECURITY.md:15-24`, el único inventario de secretos.** Lista cuatro variables, una
> de un proveedor descartado (OpenAI), con dos nombres que el código ya no usa
> (`STRIPE_SECRET_KEY`, `CONEKTA_PRIVATE_KEY` contra los `_WEBHOOK_SECRET` reales), y
> **omite dieciocho.** Ver D3.
>
> **3. `PENDIENTES_COMPLETOS_2026-08-17.md:387` (T-10), "el motor del coach está en una rama
> sin mergear".** Está en `main` desde el 2 de junio. Manda al siguiente a buscar una rama
> que no existe. Ver E3.
>
> **4. `CLAUDE.md`**, en el modelo, el proxy, el fallback y el conteo de commits. Ver J1.
>
> **5. `AUDIT_VISUAL_2026-08-16.md:294`, los consentimientos tapados.** Falso, y calificado
> como "riesgo legal, no estético", que es el lenguaje que hace que nadie lo cuestione. Ver
> C1, error 4.
>
> **6. `R and D/HANDOVER/03_ESTADO_Y_TRAMPAS.md:119,142`, "17 banderas".** Son 18. Envejeció
> por un commit. Ver C3.
>
> **7. `supabase/config.toml`.** `[VERIFICADO]`: **declara 6 de las 14 edge functions**, y él
> mismo pide reconciliación en `:1-3` (*"archivo MÍNIMO creado a mano"*). Quien lo lea para
> saber qué está expuesto va a subestimar la superficie. Y ojo con el matiz que el propio
> archivo escribe en `:11-18`: **`verify_jwt = true` no autentica a nadie**, porque la llave
> anónima **es** un JWT válido y pasa el gate. **La superficie efectivamente pública es mayor
> que las dos funciones con `verify_jwt = false`** (`payment-webhook` y `revenuecat-webhook`).
>
> **Y uno que no miente pero engaña por omisión:** `ARGOS-BRAIN/build/sql/001_argos_brain.sql`
> se presenta como "la fuente documental" y **está atrás de la base**: no tiene
> `is_production`, no tiene `promote_argos_brain`, y define `get_argos_brain` con dos
> argumentos cuando el proxy la llama con tres. Ver G1.

---

# BLOQUE K · Lo que espera a otra persona

**K1.** `P0` De los 17 pendientes que dependen de terceros, ¿cuáles ya pediste?

> _Respuesta:_
>
> **`NO SÉ` cuáles se pidieron, y esta es de las preguntas donde el `NO SÉ` es el dato.**
> Un correo enviado no deja rastro en un repositorio. **Esto lo tiene que contestar el
> dueño**, y es urgente porque de eso depende qué reloj ya está corriendo.
>
> **Lo que sí puedo darte es la lista completa y verificada de qué son.** `[VERIFICADO]` en
> `R and D/PENDIENTES_COMPLETOS_2026-08-17.md`, sección "ESPERA A OTRA PERSONA", línea 423,
> F-1 a F-17:
>
> | # | Qué es | Nota |
> |---|---|---|
> | **F-1** | **Firma clínica de los 13 casos de la matriz** | **Camino crítico del lanzamiento.** Ver K2 |
> | F-2 | Firma de nombres y copy de los 5 packs y 3 paquetes de salud | Gatea copy antes de tiendas |
> | F-3 | Validación de preguntas de historia clínica | Marcadas como propuestas sin validar |
> | F-4 | Catálogo de intervenciones | Espera validación de v3, el ciclo femenino, y dosis y ventanas |
> | F-5 | Rangos clínicos de laboratorio | Con marcas de validación pendiente |
> | F-6 | **Set de iconos ATP** | **Prerrequisito duro del springboard.** Post lanzamiento. Ver K4 |
> | F-7 | Firma vertical del logo | 21 trazos sin montar, fuera a propósito |
> | F-8 | Nombre de la sección de escritura | **Una línea exige BUILD** (texto del micrófono), o sea no entra en este ciclo |
> | F-9 | Ventanas horarias de las fases del ayuno | Provisionales. Bloquea la pastilla de etapa metabólica |
> | **F-10** | **Saldo comprado y no gastado de la moneda interna** | Ver F7. **Hay dinero de terceros esperando decisión** |
> | F-11 | Revocar funciones de gasto de la moneda | **Hay un test que exige que existan: reapuntarlo, no borrarlo** |
> | F-12 | Qué se borra de las 16 pantallas candidatas | 6 son limpieza; **10 tienen decisión de producto detrás** |
> | F-13 | Tres decisiones de color | Incluye confirmar que la ficha de emergencia se quede clara **como decisión y no como accidente** |
> | F-14 | Widgets de iOS | **Exige BUILD.** No entra |
> | F-15 | Grabación de sesión | Falta **revisar la primera grabación real** antes de darla por buena |
> | F-16 | Arquitectura de 5 pestañas con la orbe al centro | *"Nada de esto es brief todavía"* |
> | F-17 | Qué significa el trial de 14 días sin tiers | **Decisión del dueño: hay trial o no hay** |
>
> **Los tres que yo pondría a correr hoy, porque su reloj es el más largo y no lo controlas:**
> **F-1** (firma clínica, ver K2), **F-6** (set de iconos, que es un encargo de diseño con
> tiempos de tercero) y todo lo del bloque D1, que aunque no está en esta lista, incluye la
> revisión de Apple, que es el reloj más largo de todos.

---

**K2.** `P0` El cuadernillo de la matriz: ¿se le mandó a la responsable clínica o sigue en
el repo?

> _Respuesta:_
>
> **En el repo no hay ninguna evidencia de que se haya enviado, y hay bastante evidencia
> indirecta de que no.** `[VERIFICADO]`:
> - `PENDIENTES_COMPLETOS_2026-08-17.md:30`: *"**Mandar el cuadernillo de la matriz a firma
>   clínica, hoy mismo.**"* En imperativo.
> - `R and D/HANDOVER/04_PENDIENTES_Y_DESPLIEGUE.md:56-58`: *"El cuadernillo pide respuesta
>   para el **25 de agosto**... **Sale a firma hoy o la fecha se mueve.**"*
> - `TAKEOVER_DEV_LEAD_2026-08-18.md:190`: el mismo mandato, con fecha del 18.
> - Y la más contundente, `R and D/HANDOVER/03_ESTADO_Y_TRAMPAS.md:217`: *"Los dos
>   cuadernillos .xlsx de revisión clínica **no se abrieron**; solo se confirmó que
>   existen."*
>
> **Si se mandó por correo o por mensaje, no hay rastro. Eso lo tiene que confirmar el
> dueño**, y es la confirmación más urgente de toda esta entrevista, porque **el plazo
> pedido era el 25 de agosto y el lanzamiento es el 1 de septiembre.**
>
> 🔺 **Y aquí está la sorpresa que nadie había visto: hay dos cuadernillos con números
> distintos, y un tercer número en prosa. Nadie declara cuál es el vigente.**
> `[VERIFICADO]`, los dos archivos están en `R and D/`:
>
> | Archivo | Hoja de casos | Subtítulo literal |
> |---|---|---|
> | `Revision_clinica_matriz_13_decisiones_ago2026.xlsx` | "Los 13 casos", 13 renglones | *"13 decisiones pendientes · agosto de 2026"* |
> | `Revision_clinica_matriz_16_decisiones_ago2026.xlsx` | "Los 16 casos", 16 renglones | *"16 decisiones pendientes · agosto de 2026"* |
>
> Y `HANDOVER/04_PENDIENTES_Y_DESPLIEGUE.md:60` explica que el documento en prosa
> (`MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md`) tiene **10** casos, el cuadernillo los
> reformula a **13**, y existe además la versión de **16**. **Ningún documento dice cuál es
> el vigente ni por qué son tres números.**
>
> **Mandar el equivocado no es un error cosmético: es pedirle a la responsable clínica que
> firme tres cosas distintas y que se dé cuenta ella.** `NO SÉ` cuál es el bueno. Antes de
> enviar, alguien tiene que abrirlos, que según el documento **nadie ha hecho.**
>
> **Estructura, para quien lo mande:** las hojas de casos son
> `No. | Urgencia | Parámetro | Qué pasa hoy | Ejemplo con números | Qué necesitamos de ti |
> TU RESPUESTA | COMENTARIOS`. **Los tres urgentes son los primeros:** T3 libre (etiquetada
> en ng/dL cuando la unidad real es pg/mL), ApoB (un corte límite quedó en 0), y testosterona
> total en la lectura de sueño.
>
> **En qué formato lo quiere ella y cuánto tarda: `NO SÉ`. Eso lo contesta el dueño.** Lo que
> sí sé es que el formato xlsx con columna "TU RESPUESTA" está hecho para contestarse sin
> saber nada del código, y eso es lo correcto.

---

**K3.** `P1` Con la responsable de marca: el halo de dos anillos, las dos limas distintas,
la firma vertical.

> _Respuesta:_
>
> **Parcialmente resuelto, y `NO SÉ` el resto.**
>
> **Lo que sí puedo verificar:** `[VERIFICADO]` la **firma vertical sigue sin montar**, y
> está declarada como decisión, no como olvido: pendiente F-7,
> *"21 trazos sin montar, fuera a propósito. Deuda de marca con la autora del manual"*.
>
> **Un dato que la contradice en parte y vale revisar:** `[VERIFICADO]` en
> `R and D/RECORRIDO_EN_TELEFONO.md:15`, el recorrido pide verificar el login porque *"el
> logo vertical se acaba de montar"*. **O sea que algo del logo vertical sí se montó en este
> ciclo, mientras el pendiente F-7 sigue declarando que está fuera.** `NO SÉ` si son la
> misma pieza o dos distintas (la firma vertical contra el logotipo vertical). **Vale
> preguntarlo antes de asumir cualquiera de las dos.**
>
> **Las dos limas y el halo de dos anillos: `NO SÉ`.** No encontré en el repo un registro
> de que se hayan resuelto. Lo que sí hay es el pendiente F-13, con **tres decisiones de
> color abiertas**: si el ámbar es token o señal, el contraste del teal del panel de coach en
> tema oscuro, y confirmar que la ficha de emergencia se quede clara en tema oscuro **como
> decisión y no como accidente**, porque la lee un paramédico.
>
> **Esto lo tiene que contestar el dueño**, porque los acuerdos con la responsable de marca
> se cerraron en conversación, no en el repo.
>
> **Y una nota de contexto que ayuda a interpretar cualquier documento de marca que
> aparezca:** los documentos de diseño externos son insumo, no decisión. La práctica del
> proyecto es peloteo entre el dueño y quien desarrolla antes de que algo se vuelva brief.

---

**K4.** `P1` El set de iconos ATP. ¿Está encargado, con quién y con qué fecha?

> _Respuesta:_
>
> **`NO SÉ` si está encargado, con quién ni con qué fecha. Esto lo tiene que contestar el
> dueño.** Un encargo de diseño no deja rastro en un repositorio.
>
> **Lo que sí está verificado y es lo que hay que saber para decidir:**
>
> **1. Sí es prerrequisito duro, y está declarado como tal.** `[VERIFICADO]`, pendiente F-6:
> *"prerrequisito duro declarado: sin él el springboard no arranca"*. **Y está clasificado
> como post lanzamiento**, o sea que **no bloquea el 1 de septiembre.** Bloquea la
> arquitectura de 5 pestañas con la orbe al centro (F-16), que también es post lanzamiento.
>
> **2. Mientras tanto, la doctrina de iconos vigente es otra y sí está resuelta:** Phosphor
> Regular, **monocromo**, con el color en el encabezado y nunca en el icono. Solo dos hechos
> a mano. **Y hay una trampa conocida ahí:** confundir la variante `fill` con la `stroke`
> rompe la consistencia visual de una pantalla completa sin que `tsc` diga nada.
>
> **3. Hay un guard que vigila el censo de iconos**, `[VERIFICADO]`:
> `src/constants/__tests__/icon-censo.test.ts:93-104`. Ojo, es uno de los 50 guards
> estáticos de C5: lee ocho archivos de constantes y servicios y afirma cosas sobre su
> texto. **Vigila que el censo esté completo, no que los iconos se vean bien.**
>
> **Mi recomendación:** dado que es post lanzamiento y que el set actual funciona, **este es
> el pendiente que yo dejaría quieto más tiempo.** Encargarlo ahora mete una dependencia
> externa nueva en las dos semanas donde ya hay tres relojes corriendo que no controlas.

---

# BLOQUE L · Las cuatro preguntas de salida

**L1.** `P0` Si tuvieras 14 días completos, ¿qué harías y en qué orden?

> _Respuesta:_
>
> **Lo digo como lo haría yo, no como el plan lo dice.**
>
> **Día 1, antes que nada, en paralelo y sin esperar a nadie:**
>
> 1. **Correr `npm test` y `npx tsc --noEmit`.** Es lo primero porque **todo lo demás de
>    este documento es hipótesis hasta que eso pase.** Media hora. Si sale rojo, cambia el
>    plan entero de los 14 días y es mejor saberlo el día 1 que el día 12.
> 2. **Mandar el cuadernillo de la matriz a firma clínica**, después de abrirlo y decidir
>    cuál de los tres es el vigente (ver K2). Es el único reloj externo con plazo que ya
>    venció una vez.
> 3. **Cerrar el hoyo de privacidad.** Mover `296` a `supabase/migrations/` y aplicarlo. **No
>    está en el camino crítico del lanzamiento: está antes**, porque hay usuarios reales con
>    datos reales adentro hoy.
> 4. **Resolver los cuatro secretos y los productos en las tiendas.** Sin RevenueCat no hay
>    compra, y la revisión de Apple es el reloj más largo del calendario.
>
> **Días 2 y 3, lo que nadie ha hecho y cuesta menos de lo que parece:**
>
> 5. **Correr `npx supabase migration list` y `npx supabase db diff`.** El segundo es el que
>    va a doler, y por eso hay que correrlo ahora y no el 30 de agosto. Ver J3.
> 6. **Resolver el drift del cerebro de ARGOS.** Correr `sync-brain-app.mjs`, commitear, y
>    verificar qué versión sirve producción. **Hoy no sabemos con qué prompt está corriendo
>    el producto.** Ver G1.
> 7. **Correr el barrido visual en tema claro.** Media hora y es la única forma de saber
>    cuántas cajas invisibles quedan. Ver I8.
> 8. **Hacer el recorrido en el teléfono completo**, en tema claro, empezando por el paywall.
>
> **Días 4 a 7, lo que da información de salud equivocada:**
>
> 9. **Los datos de la sociedad en el aviso de privacidad** (L-1). Sin razón social y
>    domicilio, no cumple la ley mexicana, y eso es rechazo en revisión.
> 10. **El paquete de una tarde:** la cláusula de fundadores, el mensaje que le confiesa al
>     usuario que la app está a medio hacer, el destello negro al navegar en claro, el
>     disclaimer completo de ARGOS, y el Hba1c con 19 decimales.
> 11. **Meter `src/screens/coach/` en los ratchets de tema** y revisar el archivo grande. Ver
>     B3.
>
> **Días 8 a 14, lo que evita que esto vuelva a pasar:**
>
> 12. **Un guard que le pregunte al servidor.** Un test que corra `has_function_privilege`
>     contra la base y falle si `anon` puede llamar algo que no debe. **Sin eso, la migración
>     296 se va a revertir sola otra vez y la suite va a seguir verde.** Ver C5.
> 13. **Arreglar que `vitest` corra en Linux**, con un `node_modules` aparte. Ver D4. Mientras
>     no exista, la definición de "terminado" del proyecto depende de una sola máquina.
> 14. **Un solo tablero vivo** y los 60 documentos de `R and D` a expediente histórico.
> 15. **Descomentar el cron de notificaciones sociales** o decidir que no van. Ver A2.
>
> **Lo que yo NO haría en estos 14 días, y lo digo porque va a haber tentación:** tocar el
> portal de ciencia, `argos-coach`, el pipeline de audio, el set de iconos, la arquitectura
> de 5 pestañas, y **la limpieza de las 403 ramas.** Ninguna mueve la aguja del 1 de
> septiembre y todas se sienten productivas.

---

**L2.** `P0` ¿Qué es lo que más miedo te da de este lanzamiento?

> _Respuesta:_
>
> **Que salga un bug nativo.**
>
> No es la respuesta más dramática ni la más grande, y por eso es la correcta. Todo el
> sistema de seguridad del proyecto está construido sobre una sola suposición: **que
> cualquier cosa se apaga por OTA.** Hay 18 banderas, hay caminos viejos vivos, hay un
> runbook con interruptores de pánico. Todo eso es excelente y **todo eso es falso para un
> bug nativo.**
>
> Y `[VERIFICADO]` en cuanto al mecanismo: `app.json:149-151` fija
> `runtimeVersion.policy: "appVersion"`. **No quedan builds. El binario 2.2.0 es el último.**
> Un solo problema nativo obliga a compilar, compilar obliga a bumpear, bumpear deja
> huérfanos por OTA a todos los usuarios de 2.2.0, y compilar **reinicia la revisión de la
> tienda**, cuyo reloj no controlamos.
>
> **Y lo que lo vuelve miedo y no preocupación es la combinación con C2:** el ciclo entero
> metió cosas nativas (HealthKit, Health Connect) **y nada de eso corrió en un teléfono.**
> O sea que estamos apostando a que no hay bug nativo en exactamente el ciclo donde más
> código nativo entró y menos se probó en dispositivo.
>
> **La forma de dormir mejor cuesta treinta minutos:** hacer el recorrido en el teléfono. No
> lo hemos hecho.

---

**L3.** `P0` ¿Qué le dirías al dueño si no hubiera consecuencias?

> _Respuesta:_
>
> **Tres cosas, y las digo con el registro que él pidió: directo, sin endulzar lo normal.**
>
> **1. El problema de este proyecto no es la velocidad. Es que la velocidad se logró
> sacrificando la única cosa que no se puede sacrificar, que es saber qué es verdad.**
>
> Muchos agentes en paralelo produjeron muchísimo, y el resultado técnico es bueno: el
> código está mejor organizado de lo que suele estar un producto a dos semanas de lanzar,
> las banderas son ejemplares, la doctrina de núcleos puros es de las mejores que he visto.
> **Pero el proyecto gastó cuatro veces en un ciclo el costo de arreglar un bloqueante que no
> existía.** Los pesos de la Edad ATP costaron dos meses de bloqueante fantasma por un
> comentario. Setenta ediciones inútiles estuvieron a punto de hacerse por unas comillas de
> la consola SQL. **Eso no es mala suerte: es lo que pasa cuando se escribe más rápido de lo
> que se verifica.**
>
> **La regla de los cuatro ojos que pediste es correcta y llega tarde. Ponla por escrito en
> `CLAUDE.md` como regla 13, hoy, antes de que el ritmo la borre.**
>
> **2. La fecha del 1 de septiembre no la mueve el código. La mueven cuatro cosas que solo
> tú puedes hacer, y tres de ellas ya deberían estar corriendo.** Los secretos, los productos
> en las tiendas, la razón social, y la firma clínica. **De esas cuatro, la firma clínica
> tenía plazo del 25 de agosto y no hay evidencia de que se haya mandado.** El resto del
> equipo, o sea la sesión de desarrollo, puede trabajar catorce días seguidos y no mover la
> fecha ni un día si esas cuatro no arrancan.
>
> **3. Eres el único desarrollador, el único titular de las cuentas, y la única persona que
> puede correr la suite de pruebas.** Ese es el riesgo más grande del proyecto y ningún
> documento lo nombra. No te lo digo para que contrates a alguien: te lo digo para que
> **escribas dónde está todo.** El mapeo de canales de EAS, los valores de los secretos, qué
> plan de respaldo tiene Supabase, quién recupera las cuentas. **Si te enfermas la semana del
> lanzamiento, hoy no hay forma de que nadie continúe, y eso no es una hipótesis
> pesimista: es lo que este documento demuestra en once respuestas distintas que terminan en
> "esto lo tiene que contestar el dueño".**
>
> Y una que no es reproche: **el expediente que dejaste es de las entregas más completas que
> existen.** Las cinco cosas que se corrigieron se pudieron corregir precisamente porque
> dejaste dónde mirar. El problema no es que documentes poco. Es que documentas más rápido
> de lo que remides.

---

**L4.** `P1` ¿Qué se te quedó en el tintero?

> _Respuesta:_
>
> **Las cosas que nunca fueron tarea porque nunca hubo dónde ponerlas:**
>
> 1. **Las dos reglas de racha que dan números distintos en dos pantallas.** Está declarado
>    en el propio código (`adherencia-report-service.ts:5-24`) y en
>    `ANEXO_A_REPORTS.md:80`, y **la razón de que no se hiciera es que vitest no arrancaba.**
>    Es el primer bug documentado causado por el problema del `node_modules`. **Casi seguro
>    no es el único.**
>
> 2. **Auditar las 57 funciones `SECURITY DEFINER` una por una.** El filtro es fácil (las que
>    reciben el identificador como parámetro en vez de derivarlo del token) y nadie lo ha
>    pasado. Ver F6.
>
> 3. **`routine_assignments` con RLS encendida y cero políticas.** Probablemente hay una
>    pantalla rota esperando a que alguien la reporte. Ver F4.
>
> 4. **Volver a medir el 0.7% después de los dos arreglos.** Se aplicaron el `ttl: "1h"` y el
>    batch por ventana, **y nadie midió el después.** Ver G6.
>
> 5. **Las ~30 rutas de cuestionarios que muestran "Evaluación no encontrada".** Se
>    contabilizaron como fallo del barrido visual. **Puede que sean 30 evaluaciones muertas
>    de verdad.** Nadie abrió las imágenes para distinguir. Ver I8.
>
> 6. **Un `.mailmap`.** Cinco minutos, y sin él cualquier estadística de autoría es falsa.
>
> 7. **Poner `src/screens/coach/` en los ratchets de tema.** Sin eso, el archivo más grande y
>    con menos cobertura del repo sigue siendo invisible para los guards.
>
> 8. **Sacar de `CLAUDE.md` todo número que cambie solo.** Le tomó menos de un día volver a
>    envejecer después de que se actualizó. Ver J1.
>
> 9. **Meter `.maestro/capturas/` en git, o sacarlas del repo a un lugar respaldado.** 494
>    capturas que son la única evidencia visual del ciclo y viven en una sola máquina sin
>    control de versiones.
>
> 10. **Poner `ATP-audio-pipeline` bajo git.** Produce activos de producción y no tiene
>     control de versiones. Es barato de arreglar y caro de descubrir.

---

## Cierre

**Contesté 70 preguntas.** Nueve quedaron en `NO SÉ` puro: D2 (accesos), F3 (quién usa el
panel, aunque di la consulta que lo contesta), F7 (a quién se le debe, aunque di dónde
mirar), F8 (respaldos), H4 (programas high ticket), H5 (los proyectos vecinos de Supabase),
J3 (quién aplicó las migraciones), K1 (qué se pidió ya) y K4 (el set de iconos). Otras once
tienen una parte en `NO SÉ`, casi siempre la parte que exige la base remota, un teléfono, o
una cuenta.

**Once respuestas terminan en "esto lo tiene que contestar el dueño".** Ese número es, en sí
mismo, el hallazgo más importante del documento.

**Cinco premisas de la entrevista resultaron falsas al verificarlas** (banderas, OneDrive,
worktrees bloqueados, el motor del coach, el PRD), y una sexta quedó a medias (los tres
pendientes del QR clínico son cuatro; `packBooleans` no está probado).

**Y un hueco que nadie había visto: el cerebro de ARGOS que corre en el proxy declara la
versión 1.20.0 mientras su repo va en 1.22.1.** Está en G1. Si solo se va a atender una cosa
de todo esto antes de leer el resto, que sea esa, porque significa que **hoy no sabemos con
qué prompt está corriendo el producto**, y porque uno de los cuatro errores de premisa del
ciclo fue precisamente una acusación contra lo que ARGOS dijo.
