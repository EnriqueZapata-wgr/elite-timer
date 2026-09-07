# Entrega de la noche del 4 al 5 de septiembre de 2026: ATP 3.0 construida

## Estado al 7 de septiembre de 2026, después de la sesión de despliegue

Lo de abajo se escribió la noche del 4 al 5 con todo por ejecutar. Esto es lo que ya corrió, para que ninguna sesión lo repita.

- Migraciones: aplicadas en producción. `db push` metió la 314, 315, 316, 317 y 318. Antes hubo que renumerar las tres del Levantamiento DX (los timestamps `20260904203502`, `20260905151702`, `20260906040335` pasaron a `268`, `269` y `270`) y reparar el ledger con `supabase migration repair`, porque el CLI 2.102 ordena local por nombre de archivo y remoto por versión, y con formatos mezclados aborta el push. Verificado por SELECT: las cinco funciones nuevas existen, `generate_activation_codes` trae `search_path=public, extensions`, la tabla `renewal_reminders` está, y los dos crons viven (`tier-expiry-daily` 9:00 UTC, `renewal-reminders-daily` 14:00 UTC).
- Funciones edge: las seis desplegadas (`mente-audio-url`, `argos-voice`, `revenuecat-webhook`, `argos-proxy`, `payment-webhook`, `dispatch-renewal-reminders`).
- Código: en `origin/main`. El tag `v2.2.0-pre-3.0` sigue siendo el botón de pánico; las migraciones solo agregan, así que volver al tag no rompe la base.
- Commit `4387143`: `app-routes.generated.ts` estaba viejo y ARGOS no conocía `/elite`, `/salud/evaluacion-elite`, `/salud/genetica` ni `/edad-atp/comparar`. Regenerado. De paso, el barrido visual ahora captura `/paywall?contexto=` en sus cuatro contextos.
- OTA: el primer intento salió al canal `production` y no le llegó a nadie, porque el binario instalado escucha `preview`. Quedó escrito como regla 9 de `CLAUDE.md`. El bueno salió por `npm run sourcemaps:ota -- --branch preview`.
- Pendiente inmediato: smoke con cuenta nueva y las dos corridas de auditoría visual (`scripts\audit-visual.ps1 -Tema pro-oscuro` y `-Tema free-oscuro`, con `-Espera 2.5`), la segunda después de subirle un estudio a la cuenta Free.

---

Estado: código en `main`, cuatro commits después del tag `v2.2.0-pre-3.0` (`e6f5c39` ola 1, `0861585` olas 2 y 3, `bd6ab13` ola 4, más este informe). Nada se ha ejecutado contra producción: ni migraciones ni deploys. Lo que corres tú está en la sección 2. Si algo no te gusta: `git reset --hard v2.2.0-pre-3.0`.

Cómo se trabajó: 14 agentes en cuatro olas, cada bloque construido por un agente y revisado por otro (uno con contexto del proyecto y uno en frío) antes de commitear; 31 defectos encontrados en revisión y corregidos antes del commit, incluidos cuatro que le habrían quitado algo a un miembro (regla 1) y uno que habría reventado la generación de códigos en producción (pgcrypto vive en `extensions`, no en `public`). Sin em dashes en copy nuevo. `npx tsc` no se pudo correr (45 s de tope): cada archivo pasó el parser de TypeScript y los cores pasaron sus tests ejecutados, pero el type-check del proyecto te toca a ti (sección 2, paso 4).

## 1. Qué hay en la app ahora (por paso de la ruta)

Fase 0. 0.9 hecho: las tres migraciones huérfanas de la sesión de Levantamiento DX (`20260904203502`, `20260905151702`, `20260906040335`) tienen archivo en el repo; la v1 es la reconstrucción fiel del esquema `lev_*` (comparada columna por columna, política por política contra producción); v2 y v3 son solo comentario para cuadrar el ledger. `db push` no las ejecuta (ya están marcadas aplicadas). 0.8 pendiente (medir costo de lectura de labs), ver sección 4.

Fase 1, completa en código. Migraciones 314 (niveles `premium` y `elite` en los tres CHECK, árbitro con rango antes que fuente: un Elite con Pro en tienda se queda Elite), 315 (`generate_activation_codes` con correo, premium y elite), 316 (`chat_count` y `consume_argos_chat`). Cliente: `Tier = free | premium | elite`, `esElite`, `tieneEvaluacionElite`, lectura de nivel con `noSePudoLeer` y fail-open (sin red nunca se cierra nada a un miembro), contador de generación contra cambios de cuenta. Registro con `minTier` por app (14 abiertas para Free, 21 Pro, Genética Elite; Suplementos abierta a quien tenga evaluación Elite aunque Pro venza), `visibleApps` marca `bloqueada` sin ocultar, candado `CandadoNivel` y `CandadoBloque` en launcher, sala, Centro y pantallas. Espejos de servidor: `argos-proxy` (tier de tres estados, tope de 3 chats al día solo para free con 429 `free_chat_limit`, automáticas de free a Gemini, techos en dinero intactos), `argos-voice` (403 `pro_required` a free), `mente-audio-url`, `revenuecat-webhook` (entitlement desconocido ya no degrada a free, nunca escribe un tier menor, guarda `product_id` y `plan` en metadata).

Fase 2, completa en código. Hoy: hero "Tus laboratorios y tu Edad ATP" con tres estados (sin estudio: "Sube tu primer estudio" y "No tengo estudio" a la Guía de Laboratorios; con estudio: Edad ATP, delta, tres marcadores con semáforo, comparar; no se pudo leer con reintentar) y "Qué hacer hoy" con tres acciones elegidas por marcadores fuera de ventana desde las intervenciones que ya existen, con paloma que registra cumplido y suma electrones. Launcher: fila "PARA EMPEZAR" con Labs, Edad ATP, Hábitos de hoy y Protocolos (ARGOS es la orbe central, no una app; se respeta el orden "Mío"). Tarjeta compartible ampliada (tres marcadores, marca, disclaimer). Comparación de estudios `/edad-atp/comparar` con selector de dos fechas y flecha por marcador. Paywall con `contexto` (segundo_estudio, cuarto_marcador, cuarto_chat, dia7, candado:<app>), sin precio en el bundle, sin enlace a canje (vive en Ajustes como "servicio contratado"), sin "web" ni "Stripe". Contadores Free: segundo estudio, cuarto marcador (los tres abiertos son los mismos de la tarjeta y del hero), cuarto chat (el cliente atrapa el 429 y muestra "Ver Pro"). Aviso del día 7 (notificación local, solo free, se cancela al volverse miembro). Mapa funcional ATP solo para anual, Founders y Elite (anual detectado por `plan` del grant, duración del entitlement o del grant, o nombre del producto como último recurso; fail-open a miembros con origen ilegible). Recordatorio de renovación 5 días antes (LFPC): migración 317, tabla `renewal_reminders`, upsert desde RevenueCat (`INITIAL_PURCHASE`, `RENEWAL`) y Stripe (`invoice.paid`), función nueva `dispatch-renewal-reminders` con Resend y push, cron diario 14:00 UTC. Barrido de copy: cero palabras rojas afirmativas en copy de usuario; ARGOS con reglas de suplementos (leyenda LGS 216, lista negra) y ayuno (12:12 a 16:8, cuatro exclusiones) en la capa dinámica (viaja por OTA).

Fase 3, completa en código. Esquema `elite_v3` (tipos, validador, `resumenParaArgos`, `suplementosAFilas`) con el DX de Omar anonimizado como ejemplo. Migración 318: RPC `elite_cargar_evaluacion` (solo admin con sesión, versión = evaluaciones Elite previas + 1, inserta `functional_dx` con `model='enrique'`, sincroniza el plan de suplementos sin tocar filas manuales ni revivir pausadas, rastro en `tier_history`). Pantalla "Mi evaluación Elite" (15 secciones navegables, tres estados, chips de fuente, escalera de evidencia, versiones, PDF). Genética en el registro (`/salud/genetica`, `minTier: 'elite'`, se abre por existencia de evaluación). Página `/elite` sin precio ni compra, con "Escríbenos" (mailto) y "Ya soy cliente Elite" a Ajustes. Suplementos con "Asignado por Enrique", confirmación al borrar, solo lectura para no miembros. ARGOS con el resumen de la evaluación en el system prompt (flag `ARGOS_LEE_EVALUACION_ELITE`). Herramienta de carga: `scripts/elite/preparar-payload.js`, `scripts/elite/curl-elite.sh` (codigo, cargar, ver, quien), `scripts/elite/obtener-jwt.md`, guía `R and D/diagnostico/CARGAR_ELITE.md`.

Herramientas nuevas: `scripts/verifica.js` (parser TS, em dashes, sinDatos, registros, avisos) y el Postgres local con el esquema fiel de producción en `/home/claude/atp/reset/test/` (en el contenedor de Cowork).

## 2. Lo que corres tú en la mañana, en este orden

Todo en PowerShell, un bloque, desde la raíz. Después de cada paso, si algo sale rojo, para y me lo pegas.

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
Remove-Item .git\HEAD.lock -Force -ErrorAction SilentlyContinue
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
Get-ChildItem .git\objects -Recurse -Filter "tmp_obj_*" | Remove-Item -Force
git status
git log --oneline -6
```

Paso 1, verificación de código (no commitea nada):

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npm run tipos:rutas
npx tsc --noEmit
npm test
node scripts/censo-rutas.js
```

Esperado: `tsc` limpio (si marca errores, pégamelos completos: son de tipos que el parser no ve); `npm test` verde salvo lo preexistente; el censo reporta 3 huérfanas que ya existían antes de esta noche (`/onboarding/voice-config`, `/settings/comunidad`, `/settings/cuenta`, del commit `31cdd9d` "SIMPLE: Ajustes"): dime si las mando a la lista blanca o si les pongo puerta.

Paso 2, base de datos (después de que el paso 1 esté verde):

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx supabase migration list
npx supabase db push
```

Esperado: `migration list` muestra las tres `2026090...` como aplicadas en ambos lados y 314 a 318 pendientes; `db push` aplica solo 314, 315, 316, 317, 318. Todas tienen BEGIN/COMMIT propio y se probaron dos veces en el Postgres local con el esquema de producción.

Paso 3, funciones (después del db push; el orden importa porque el webhook escribe `premium`/`elite` que exigen el CHECK de la 314):

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx supabase functions deploy mente-audio-url
npx supabase functions deploy argos-voice
npx supabase functions deploy revenuecat-webhook
npx supabase functions deploy argos-proxy
npx supabase functions deploy payment-webhook
npx supabase functions deploy dispatch-renewal-reminders
```

Paso 4, OTA y push: el comando de OTA de siempre (nada tocó `app.json` ni `plugins/`; no hace falta build nativo) y luego `git push`.

Paso 5, smoke (10 minutos, con tu cuenta y una cuenta nueva de prueba): la cuenta nueva ve el hero "Sube tu primer estudio", sube un PDF, ve su Edad ATP y tres marcadores, comparte la tarjeta, toca un cuarto marcador y ve el candado con el paywall; manda cuatro mensajes a ARGOS y en el cuarto ve "Ver Pro"; tu cuenta (pro) no ve ningún candado. Si algo de eso no pasa, me lo dices.

## 3. Decisiones que se tomaron solas esta noche (para que las reviertas si quieres)

- Mientras el nivel carga o no se pudo leer, no hay candados (fail-open); un free ve un parpadeo de abierto a cerrado, un miembro nunca ve un candado.
- La cuarta tarjeta de "PARA EMPEZAR" es Protocolos (ARGOS no es app del registro).
- Elite entra siempre por código (`tier_grants`), nunca por UPDATE a `profiles`; Mi evaluación, Genética, el contexto de ARGOS y Suplementos (solo lectura) se abren por existencia de la evaluación, no por tier, para que sobrevivan al vencimiento de Pro.
- El código de activación se canjea solo desde Ajustes ("Tengo un código de activación", "Para servicios contratados con ATP"); salió del paywall y de `/elite` por Apple 3.1.1.
- La página `/elite` es informativa: sin precio, sin compra; "Escríbenos" abre correo a `CONTACTO_ELITE_EMAIL` (hoy `hola@somosatp.com`, confírmalo en `src/constants/lanzamiento.ts`).
- El precio de lanzamiento se muestra solo si `VENTANA_LANZAMIENTO.activa` es true en `src/constants/lanzamiento.ts` (hoy apagado, sin fechas: tú las pones cuando cierres 0.6 y 0.7).
- Founders y anual: un grant `founder` o un plan anual (por metadata, duración o nombre) abre el Mapa funcional ATP; Pro mensual ve "Incluido en el plan anual".
- Los códigos Elite que genera `curl-elite.sh` vencen a los 30 días si no se canjean (`ATP_CODIGO_VIGENCIA_DIAS`).
- Las llamadas automáticas de Free (insights, resúmenes) van a Gemini; kill switch `FREE_AUTO_GEMINI=false` en el proxy.

## 4. Lo que queda abierto (con quién)

Tuyo:
- Google Play: abrir la prueba cerrada con 12 testers y el build 2.2.0 (aplica a tu cuenta; los 14 días corren desde que los 12 estén inscritos).
- RevenueCat: confirmar el identificador real del entitlement de la membresía; el webhook conoce `atp_pro`, `atp_premium`, `atp_base`, `atp_clinician`; con otro id registra el evento y no escribe tier.
- `CONTACTO_ELITE_EMAIL`, fechas de `VENTANA_LANZAMIENTO`, y programar en App Store Connect la subida a 499 con "preserve price" (0.6).
- Las 3 rutas huérfanas preexistentes (arriba).
- Términos y aviso 3.0 (paso 4.1): el barrido de copy encontró cláusulas que no se arreglan cambiando una palabra: responsable como S.A.S. (el pivote vende como persona física), cláusula 5 con "una sola membresía" y pasarelas web dentro de la app, Founders "vigencia operativa" vs 5 años, genética "en versiones futuras" cuando Elite ya la recibe, `DISCLAIMERS.supplements` que dice que ATP no sugiere suplementos (contradice el plan Elite y ARGOS), y falta la cláusula de Elite como servicio persona a persona y la de renovación LFPC. Te propongo redactarlas la próxima noche con el checklist del informe legal para tu revisión.
- Garantía de 7 días en el paywall: en tienda los reembolsos los da Apple o Google; decide si la promesa se queda solo en web.
- Decisión de producto: la intervención "sardinas 3 días" del catálogo es un ayuno prolongado y choca con la regla 12:12 a 16:8 que ahora rige a ARGOS.

Mío, próximas noches: 0.8 (medir el costo real de la lectura de labs), términos 3.0 (si me lo pides), consentimiento 3.0 (4.2), dedupe del doble conteo de chat cuando un stream se corta, política de lectura de admin en `functional_dx` para que `curl-elite.sh ver` funcione sin ser coach del cliente, los 28 em dashes viejos del catálogo de intervenciones (citas de papers), y limpiar `ICONO_PROXIMA.genetica` muerto en el Centro.

Ninguna sesión de Cowork debe volver a escribir en producción con `execute_sql`: quedó escrito en CLAUDE.md. La sesión de Levantamiento DX ya tiene sus tres migraciones en el repo; si agrega otra, que la ponga como archivo.

## 5. Tabla de archivos por paso (para auditar)

Migraciones: `supabase/migrations/20260904203502_levantamiento_dx_v1.sql`, `20260905151702_...v2...sql`, `20260906040335_...v3...sql`, `314_niveles_premium_elite.sql`, `315_generate_activation_codes_v2.sql`, `316_argos_chat_count.sql`, `317_renewal_reminders.sql`, `318_elite_cargar_evaluacion.sql`.

Funciones: `supabase/functions/{argos-proxy,argos-voice,mente-audio-url,revenuecat-webhook,payment-webhook}/index.ts`, `supabase/functions/dispatch-renewal-reminders/index.ts` (nueva).

Niveles y gating: `src/services/subscription/{tier-logic,subscription-service,limites-free-core,limites-free-service}.ts` y tests, `src/hooks/useSubscription.ts`, `src/constants/{app-registry,rutas-3-0,lanzamiento}.ts`, `src/constants/__tests__/app-registry-gating.test.ts`, `src/components/ui/{CandadoNivel,CandadoBloque,AnimatedPressable}.tsx`, `src/components/atp/AppTile.tsx`, `app/centro/index.tsx`, `app/(tabs)/kit.tsx`, `app/my-health.tsx`, `app/edad-atp/lab/[key].tsx`, `app/paywall.tsx`, `app/settings/subscription.tsx`, `app/redeem-code.tsx`, `src/services/{argos-errores,anthropic-client,argos-service}.ts`, `app/argos-chat.tsx`, `src/components/argos/chat/VerProRow.tsx`, `src/services/aviso-dia7-{core,service}.ts`, `src/services/{onboarding-v2-service,notification-actions}.ts`, `app/salud/diagnostico/index.tsx`.

Hoy y launcher: `src/components/hoy/{HeroLaboratorios,QueHacerHoy}.tsx`, `src/services/hoy/*`, `app/(tabs)/index.tsx`, `src/services/atp-room-core.ts` y test.

Tarjeta y comparación: `src/components/edad-atp/EdadAtpShareCard.tsx`, `app/edad-atp/{result-preview,comparar,labs,index}.tsx`, `src/services/edad-atp/{comparar-core,lab-values-service}.ts` y test.

Elite: `src/services/elite/*` (core, validador, evaluación, servicio, tests), `app/salud/{evaluacion-elite,genetica}.tsx`, `app/elite.tsx`, `assets/icons/genetica.svg` y el mapa de iconos, `src/services/dx/dx-pdf-service.ts`, `app/supplements.tsx`, `src/services/supplements/adherencia-core.ts` y test, `src/constants/flags.ts`, `src/services/argos-elite-contexto-{core,service}.ts` y test, `src/services/argos-context-core.ts`, `scripts/elite/*`, `R and D/diagnostico/{ESQUEMA_ELITE_V3.md,elite_v3_ejemplo_omar_anonimizado.json,CARGAR_ELITE.md}`.

Copy: `src/services/argos-suplementos-ayuno-core.ts` y test, `src/constants/{historia-clinica-questionnaires,master-quiz-bank,salud-puertas,upload-types,interventions-catalog}.ts`, `src/components/edad-atp/component-meta.ts`, `app/edad-atp/questionnaires/inmunidad.tsx`, `app/centro/[appKey].tsx`, `src/screens/coach/ClientDetailScreen.tsx`, `src/services/{argos-nav-resolver-core,nutrition-service}.ts`.
