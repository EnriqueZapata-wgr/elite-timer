# ATP 3.0 · Release del binario · guía única

**Fecha:** 21 de septiembre de 2026. **Estado del código:** todo lo de las noches 1 y 2 Elite
está en `main` (último commit de código: `281ac64`). **Nada de esto se ha corrido:** push,
migraciones, cerebro, OTA y build son tuyos.

Por qué hay un binario nuevo: no por cambios nativos (`app.json`/`plugins/` no se tocaron;
el último build nativo, 15-ago, sigue sirviendo). Es la versión: el producto se llama ATP 3.0
y el binario dice 2.2.0. Subir `expo.version` cambia el runtime del OTA (policy `appVersion`),
así que **el bump y el build van juntos y al final**, cuando ya probaste todo por OTA en el
binario que tienes.

Orden general: primero todo lo que llega por OTA al binario 2.2.0 (para probar HOY en el
S24), después el bump a 3.0.0 y el build.

---

## Fase 0 · Limpieza del repo (una vez, PowerShell)

Mi shell no puede borrar: quedaron candados y objetos temporales de git, y una carpeta
`_to_delete/` con basura (incluye `tmp-release-test/`, con la que probé el script de release).

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
git rev-parse --abbrev-ref HEAD
Remove-Item .git\index.lock, .git\HEAD.lock -ErrorAction SilentlyContinue
Remove-Item .git\basura-0921 -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem .git\objects -Recurse -Filter "tmp_obj_*" | Remove-Item
Remove-Item _to_delete -Recurse -Force
git status --short
git log --oneline -8
```

`git status` debe mostrar solo lo tuyo (`R and D/embudo/**`, `MANUAL_DE_MARCA_ATP.md`,
`docs/*.md`, los `ENTREGA_NOCHE_2026-08-2*.md`, `_respaldo_enrique_*`,
`ATP_Auditoria_flujos_v2.docx`). `git log` debe terminar en los commits del 21-sep
(`c17838a` … `281ac64` y el de esta guía).

## Fase 1 · Tipos y pruebas (tu máquina; yo corrí tsc completo EXIT 0)

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
npx tsc --noEmit -p .
npm test
```

Si `npm test` marca algo, pégamelo tal cual. Lo que yo pude correr: 20 suites tocadas
esta noche (más icon-censo 93/93), todas en verde con el runner sin vitest (que ahora entiende `vi.mock`,
`beforeEach`/`afterEach` y `toBeCloseTo`).

## Fase 2 · Base de datos (irreversible; solo tú)

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
npx supabase migration list
npx supabase db push
npx supabase migration list
```

Entran **324** (`elite_cargar_completa`), **325** (`elite_sembrar_y_convertir`: perfil,
rutinas, comidas) y **326** (el tooling del cerebro vuelve a poder publicar: ver fase 4). La 325 lee lo que deja la 324; `db push` las aplica en orden. La 324 y la
325 están probadas en Postgres 16 local (`supabase/pruebas/325_escenarios_local.sql`); la
326 solo mueve permisos y se verifica con la consulta que trae al pie. Si la lista
muestra la **300** como pendiente, la decisión sigue siendo tuya (ver noche 1, sección 2.2).

## Fase 3 · Push de los tres repos

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
git push
cd "D:\Proyectos_ClaudeCode\ARGOS-BRAIN"
git push
cd "D:\Proyectos_ClaudeCode\argos-coach"
git push
```

(ARGOS-BRAIN `072cfc6` v1.24.1 y argos-coach `d916f5f`: salida del nombre. Si esos repos
viven en otra ruta, ajusta el `cd`.)

## Fase 4 · Cerebro de ARGOS en producción y edge function

ARGOS en producción lee la tabla `argos_brain`, no el archivo. Hasta promover v1.24.1, el
prompt en vivo sigue con las frases viejas.

**Publicar exige ahora tu sesión, además de la admin_key** (migración 326, 24-sep: la 227
había dejado a `publish_argos_brain` sin permiso para `anon` suponiendo que el tooling
entraba como service_role, y no era así). Necesitas las cuatro variables en la misma
ventana. El JWT dura una hora: `scripts\elite\obtener-jwt.md`.

```powershell
cd "D:\Proyectos_ClaudeCode\ARGOS-BRAIN"
$env:SUPABASE_URL = "https://itqkfozqvpwikogggqng.supabase.co"
$env:SUPABASE_ANON_KEY = (Select-String -Path build\STORE_RUNBOOK.md -Pattern 'sb_publishable_[A-Za-z0-9_-]+' | Select-Object -First 1).Matches[0].Value
$env:ARGOS_BRAIN_ADMIN_KEY = "<de public.argos_config>"
$env:ARGOS_BRAIN_JWT = "<tu JWT, dura 1 hora>"
node build\publish-brain.mjs
node build\promote-brain.mjs all 1.24.1
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
npx supabase functions deploy argos-proxy
```

Si sale `42501 permission denied for function`, falta el `db push` de la 326 (fase 2).
Si sale `401` con el JWT puesto, el JWT venció.

`publish` sube a staging; `promote` es el acto explícito a producción (regresión antes si
quieres: `build/STORE_RUNBOOK.md`). El deploy de `argos-proxy` lleva el fallback embebido
limpio (`brain.generated.ts` de `066c736`).

**El mismo deploy enciende el ruteo de modelos (21-sep):**

| Clase | Principal | Respaldo |
|---|---|---|
| Extracción (fotos de comida, etiquetas, suplementos) | Gemini 3.8 Flash | Sonnet 5 |
| Clínico (chat, voz, labs, evaluación, insights, recomendaciones) | Sonnet 5 | Gemini 3.8 Flash |
| Navegación (a qué pantalla ir, título de conversación) | Gemini 3.5 Flash-Lite | Haiku 4.5 |

Antes de desplegar, mira los secretos y quita la variable vieja (ya no se lee; así no
queda la duda de qué valor tenía):
```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
npx supabase secrets list
npx supabase secrets unset MODEL_ROUTING_ENABLED_TYPES
```
En la lista debe estar `GEMINI_API_KEY`. Si `unset` dice que no existe, no pasa nada.

Después del deploy, la prueba de humo (cuesta centavos):
```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
$env:ATP_JWT = "<tu JWT>"
node scripts\probar-ruteo.mjs
```
Debe decir `principal` en las cuatro líneas: nav_intent con gemini-3.5-flash-lite,
food_estimate_text y food_estimate_photo con gemini-3.8-flash (la foto de un cuadro rojo
debe contestar "rojo"), chat con claude-sonnet-5.

Gemini 2.5 Pro NO sirve para este proyecto: el 24-sep devolvió 404 "no longer available
to new users". Google cerró los modelos 2.5 a los proyectos sin historial con ellos. Si alguna dice `respaldo`, funciona
pero algo falló: pégame la salida.

Apagado de emergencia, sin redeploy: `npx supabase secrets set MODEL_ROUTING=off`
(vuelve a la conducta de antes). Para regresar: `npx supabase secrets unset MODEL_ROUTING`.

## Fase 5 · OTA al binario que tienes (2.2.0): así pruebas hoy

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
$env:SENTRY_AUTH_TOKEN = "<tu token de 1Password>"
npm run sourcemaps:ota -- --branch preview
```

Siempre `preview`. Este OTA lleva runtime 2.2.0 porque `app.json` todavía dice 2.2.0: es
correcto y es a propósito. Abre la app dos veces (la segunda ya trae el update).

## Fase 6 · Cargar a los tres clientes (después de la fase 2)

Cada JSON vive en `Programas High ticket/ATP DX/Clientes/<X>/04_App/elite_v3_<x>.json`;
antes de cargar, lee su `FUENTES_Y_HUECOS.md` (empieza con "DECISIONES QUE ENRIQUE DEBE
TOMAR ANTES DE CARGAR"). El cliente ya debe tener cuenta en la app con el correo que te dio.

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
$env:ATP_JWT = "<tu JWT, scripts\elite\obtener-jwt.md>"
bash scripts/elite/curl-elite.sh quien fabiola@correo
node scripts\elite\preparar-payload.js "D:\...\Fabiola Mendoza\04_App\elite_v3_fabiola.json" <user_id> --salida "D:\...\04_App\fabiola.payload.json"
bash scripts/elite/curl-elite.sh cargar "D:\...\04_App\fabiola.payload.json"
```

Repites `quien` / `preparar-payload` / `cargar` con Vicente y Víctor. `cargar` encadena la
324 y las tres funciones de la 325; imprime dos bloques AVISOS (léelos: dicen qué se respetó
del cliente y qué no trae el documento). Si la siembra fallara sola:
`bash scripts/elite/curl-elite.sh sembrar <user_id>`. Guía completa:
`R and D/diagnostico/CARGAR_ELITE.md`.

Ojo con las rutinas: se agendan en `scheduled_routines` desde el día en que corras la carga.
Víctor: su Manual dice que el programa nuevo entra en la semana 3; si cargas antes, sus
rutinas aparecen desde ya (ver su decisión 4).

## Fase 7 · QA en el S24 por OTA (antes del build)

Con tu cuenta y con un código de prueba nuevo. Además de los 9 puntos de la noche 1:

1. **Perfil sin sexo** (cuenta de prueba, sin sexo en el perfil): Edad ATP, Mi salud
   (hero), la pantalla `/salud/diagnostico`, ATP Labs, comparar, ficha, Mi lectura, reportes: ningún número
   calificado, aviso "falta tu sexo" y botón "Completar mi perfil" que abre /profile.
   Nunca rangos de hombre. ARGOS: muestra valores sin calificar y lo dice.
2. **Perfil ilegible** (modo avión en las mismas pantallas): aviso "No se pudo leer tu
   perfil" y botón "Reintentar" que relee sin salir (hero, sub-edad, result-preview,
   `/salud/diagnostico`, Mi lectura). Quitar avión, Reintentar: vuelve el número.
3. **Journal** sin sexo: "agradecido/a", "A ti mismo/a". Con sexo: como antes.
4. **Timers**: RestTimer, EMOM, MyoReps, 3-5 y una sesión: pausa, bloquea el teléfono
   1 minuto, vuelve: el tiempo es el de pared (no se "congeló"). Cambia la hora del
   teléfono hacia atrás a media sesión: no descuenta.
5. **Agenda**: bloque TU RUTINA DE HOY con la rutina asignada; tomas del coach con hora
   etiquetadas "Plan de Enrique"; las sin hora se cuentan con aviso a /supplements
   (ninguna aparece a las 08:00 inventadas).
6. **ARGOS memoria**: dos conversaciones: en la primera cuéntale algo concreto (una meta);
   cierra, abre otra y pregúntale por eso: debe recordarlo, citándolo. Cerrar sesión y
   entrar con la cuenta de prueba: no recuerda nada tuyo.
7. **Después de cargar a un cliente (o a ti con una evaluación con rutinas)**: Fitness
   › Mis rutinas trae las de la evaluación ("Asignada por Enrique"), agenda semanal en los
   días declarados; Nutrición muestra "Plan de Enrique" con comidas y metas; Cardio
   calcula zonas (FC reposo "de tu evaluación Elite"); perfil con sexo/fecha/estatura.
   Bloques sin slug corren como tiempo (40 s por serie) sin clip: esperado hasta que
   pongas slugs.

Barrido visual (adb, no Maestro): ajusta el tiempo de pantalla a 10 min y
```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
.\scripts\audit-visual.ps1 -Tema elite-oscuro -Espera 2.5
```
Capturas en `.maestro\capturas\elite-oscuro\`; yo las leo directo del repo.

## Fase 8 · Bump a 3.0.0 y build nativo (cuando la fase 7 quedó bien)

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
.\scripts\release-3.0.ps1 -SoloVer
.\scripts\release-3.0.ps1
```

`-SoloVer` muestra sin tocar. Sin él: verifica rama `main`, `app.json` limpio y tag libre;
corre `npx tsc --noEmit -p .`; sube `expo.version` 2.2.0 → **3.0.0**, `android.versionCode`
23 → **24**, `ios.buildNumber` 5 → **6** (solo esas tres líneas, vía
`scripts/release/bump-app-version.js`); commit de `app.json` y tag `v3.0.0`. Lo probé de
punta a punta en PowerShell 7 sobre una copia del repo. Al terminar imprime lo que sigue:

```powershell
git push
git push origin v3.0.0
eas build -p android --profile preview
eas build -p ios --profile beta
```

Instala el APK. Desde ese momento el OTA a `preview` lleva runtime 3.0.0 y solo lo recibe
el binario nuevo; el 2.2.0 que tengan los testers deja de recibir updates (les pasas el
APK). Para un arreglo urgente a 2.2.0 antes de tener el build: `git checkout v3.0.0~1`,
OTA a preview, `git checkout main`.

```powershell
$env:SENTRY_AUTH_TOKEN = "<tu token>"
npm run sourcemaps:ota -- --branch preview
```

Cuando el binario 3.0.0 esté instalado y probado, actualizo la regla 9 de `CLAUDE.md`
(runtime 3.0.0) y `RUTA_A_ATP_3.0.md`.

---

## Si algo sale mal

- `db push` falla en la 325: la 324 ya quedó (son transacciones separadas). Pégame el error;
  no repitas el push con cambios a mano.
- `cargar` responde 404 en la siembra: falta la 325 en producción; la evaluación sí quedó;
  `sembrar <user_id>` después del push.
- OTA publicado pero no llega: canal `preview` y runtime del binario (2.2.0 hasta la fase
  8; 3.0.0 después). `eas update:list --branch preview` lo dice.
- `release-3.0.ps1` aborta: no tocó nada (cada verificación va antes del bump). Si abortó
  DESPUÉS del bump (commit fallido), `git checkout -- app.json` y me avisas.
