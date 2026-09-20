# ATP Elite · Noche 1 · 20 de septiembre de 2026

Entrega de la primera noche del cierre de dos semanas. Objetivo de la noche
(decisión del dueño): **el día uno del cliente Elite** (Home, evaluación,
suplementos, ARGOS, agenda). Fitness, cardio y timers quedan para la noche dos.

- Punto de retorno: tag `v3.0-pre-elite-noche1` en `f6c25f8`.
- Commits de la noche (en `main`, **sin push**): `03e7ef0` HOY · `561f309`
  ELITE · `646129f` ARGOS · `6305990` SUEÑO · `8cc46c7` FITNESS · `920670e`
  VENTA/copy/orbe. 151 archivos, +9,259 / -878.
- Método: diagnóstico (5 agentes) → plan → 6 constructores en paralelo →
  6 revisores en frío → 6 rondas de arreglo → verificación con contexto →
  commit por bloque. Hallazgos de revisión: **13 bloqueantes y 59 menores;
  los 13 bloqueantes y 43 menores cerrados** (el resto, abajo, con fecha).

---

## 1. DECISIONES QUE TOMÉ SOLO (revisables de un vistazo)

Todas reversibles en una línea o un commit. Si alguna no te gusta, dímelo y
la cambio antes del OTA.

1. **Gate legal restaurado** en `/salud/evaluacion-elite` y `/salud/genetica`
   (`MedicalDisclaimerGate`, migración 155). El bloque lo había quitado con
   un argumento falso (que la 319 lo cubría). Diez pantallas lo conservan;
   no lo quito yo. Si quieres que la evaluación se abra sin ese modal, es
   tu firma.
2. **Etiqueta del peldaño premium: "ATP completo"** (`etiquetaMembresia`).
   "ATP Pro" violaba la regla escrita de cero rastros de venta. Lo ven
   las cuentas premium existentes bajo "Tu membresía" y quien active un código no Elite. Nombre
   tuyo: cámbialo en `tier-logic.ts:104` y en el test.
3. **Icono de "Tu servicio" en Ajustes: `star-outline`** (el `ribbon-outline`
   rompía el censo de glifos).
4. **Rutina del coach gana sobre la propia del mismo día** (decisión tuya
   del 8-sep aplicada a fitness), y el hub dice qué desplazó: "También
   tenías programada: X". Fecha específica sigue ganando sobre semanal.
5. **"intervención" → "práctica"** para lo individual (una práctica de un
   objetivo). "Objetivo" sigue siendo el agrupador.
6. **Sexo desconocido en el perfil = "Sin rango"**, nunca hombre por defecto.
   Antes el hero de labs y "Qué hacer hoy" asumían hombre en silencio y
   pintaban banderas rojas falsas a una mujer sin perfil.
7. **Píldora de electrones oculta al Elite** en Home y en las barras de
   Salud/Yo/Mi ATP (antes solo en Home). Los electrones siguen contando.
8. **"Restaurar compras" siempre alcanzable** en Ajustes (Apple lo exige
   mientras haya suscriptores; una suscriptora sin sincronizar caía sin
   salida).
9. **Estado "Lectura apagada"** en la conexión de salud: Desconectar apaga
   de verdad la importación silenciosa de sueño y la sincronización
   (antes prometía dejar de leer y seguía leyendo). IMPORTAR o Conectar la
   vuelven a encender.
10. **Leyenda de suplementos reescrita** sin "diagnosticada" (palabra roja):
    "Los suplementos no son medicamentos. Si tomas medicamentos, estás
    embarazada o tienes una condición de salud, consulta a tu médico antes
    de empezar." No es la leyenda de la LGS 216 (los comentarios lo decían
    mal); si quieres la textual de la LGS, es un cambio de una constante.
11. **Caché de la evaluación en Home: 60 s con verificación ligera por
    versión** (antes releía el JSON completo de 20 versiones cada 3 s).
12. **Precedencia en ARGOS**: el renglón vivo del plan de suplementos manda
    sobre el resumen de la evaluación; la ventana de alimentación que fijas
    manda sobre "12:12 a 16:8".

---

## 2. QUÉ CORRES TÚ, EN ESTE ORDEN

Nada de esto lo hice yo: son las acciones irreversibles y las que necesitan
tu máquina.

**0. Limpieza del repo (PowerShell, una vez).** Mi shell no puede borrar:
quedaron candados y objetos temporales de git.
```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
Remove-Item .git\index.lock, .git\HEAD.lock -ErrorAction SilentlyContinue
Get-ChildItem .git\objects -Recurse -Filter "tmp_obj_*" | Remove-Item
Remove-Item _to_delete\* -Recurse -Force
git status --short
```
`git status` debe mostrar solo tus archivos de `R and D/embudo`, los docs de
agosto y `ATP_Auditoria_flujos_v2.docx` (no los toqué).

**1. Tipos y pruebas.**
```powershell
npx tsc --noEmit -p .
npm test
```
Corrí 30 suites con el runner sin vitest (todas en verde salvo las 4
limitaciones conocidas del shim: `toBeCloseTo`, `vi.mock`, `import.meta`,
`__dirname`). Las que SOLO corren en vitest y no pude verificar:
`argos-consent-gate`, `sueno-unificado-service`, `sleep-services`,
`cardio-core`, `mb27-contratos`, `personalize-interventions`,
`plan-semanal-core` (caso "mutaciones 7/8"). Si algo falla ahí, me lo pegas.
`tsc` es el juez de tipos: los constructores no pudieron correrlo. Puntos
que un tsc podría objetar (los anoté por si acaso): `getHydrationStats` sin
`| null`; `event === 'SIGNED_OUT'` en `onAuthStateChange`; `desplazada` en
`TodayFitnessState`; `useLocalSearchParams<{ seccion?: string }>`.

**2. Base de datos.**
```powershell
npx supabase migration list
npx supabase db push
```
Lo que entra: **324 `elite_cargar_completa`** (probada en Postgres local en
9 escenarios; requiere 318, 321 y 323, que ya están). Antes del push mira la
lista: la **300** (limpieza de noches de 24 h) dice "no aplicada" en su
cabecera pero la 306 afirma que se aplicó el 19-ago. Si aparece pendiente,
decides tú: borra SOLO filas importadas (health_connect/healthkit) con
duración imposible; nunca toca `sleep_cycle`. Si ya está aplicada, no hay
nada que decidir.

**3. Sin edge functions esta noche.** `argos-proxy` no se tocó.

**4. Push y OTA.**
```powershell
git push
$env:SENTRY_AUTH_TOKEN = "<tu token>"
npm run sourcemaps:ota -- --branch preview
```
Siempre `preview` (el binario escucha ese canal; runtime 2.2.0).

**5. Cargar la evaluación de Fabiola** (después del db push, con TU JWT: el
vínculo `coach_clients.coach_id` es quien corre el script).
```powershell
node scripts\elite\preparar-payload.js "R and D\diagnostico\<fabiola>.json"
bash scripts\elite\curl-elite.sh <payload>
```
El script imprime al final un bloque AVISOS (plan pausado, labs respetados,
fichas ya del cliente, metas del cliente respetadas). Léelo. Detalle en
`R and D/diagnostico/CARGAR_ELITE.md`.

**6. QA en el S24 (15 minutos, en este orden).** Con tu cuenta (tiene
evaluación) y con un código de prueba nuevo (sin evaluación).
1. Home con evaluación: hero TU EVALUACIÓN CON ENRIQUE, TU PROGRAMA 2x2,
   TU PLAN, HOY con "Tus suplementos de hoy". Sin píldora de electrones.
   Tocar "Mi alimentación" aterriza en esa sección de la evaluación.
2. Modo avión → Home: "No pudimos leer tu evaluación" + Reintentar (nunca
   "Sube tu primer estudio"). Quitar avión, Reintentar: vuelven hero,
   puertas y terna sin salir de Home.
3. Suplementos: cabecera TU PLAN DE ENRIQUE, "Por qué" en cada ficha,
   deslizar una ficha del coach NO la borra: la pausa; EN PAUSA solo
   ofrece reanudar; ninguna mención a Pro.
4. ARGOS: pregúntale "¿por qué tomo magnesio?" y "¿a qué hora puedo comer?"
   (debe citar tu plan, no "puedes considerar"). Cerrar sesión, entrar con
   el código de prueba: ARGOS no debe saber nada de tu evaluación.
5. Ajustes › Tu servicio con red: SERVICIO CONTRATADO / ATP Elite / vigencia
   / contacto. En modo avión: "No se pudo leer tu servicio" + Reintentar
   (nunca "Sin servicio activo").
6. Abrir ARGOS desde Suplementos con el scroll a media altura, cerrar: el
   scroll no salta al tope.
7. Sueño: la card dice el estado real (Health Connect / permiso / apagado).
   Ajustes › Salud del teléfono › Desconectar → "Lectura apagada"; Sueño
   deja de importar; IMPORTAR la reenciende.
8. Fitness: si te asignas una rutina desde la consola, el hub dice
   "Asignada por Enrique" sin " (copia)" y EMPEZAR abre /session. Sin red,
   EMPEZAR da Alert con Reintentar, no la lista de rutinas.
9. Cardio: sesiones recientes con ritmo m:ss/km. (Que "no calcule" zonas es
   esperado hasta la noche dos: faltan fecha de nacimiento y FC de reposo.)

---

## 3. QUÉ QUEDÓ, BLOQUE POR BLOQUE

### HOY (`03e7ef0`)
- `elite-hoy-core/service`: lectura de la evaluación vigente con caché por
  usuario, TTL 60 s, verificación por versión, evento
  `EVALUACION_ELITE_CHANGED_EVENT`, invalidación al cerrar sesión.
- `HeroEvaluacionElite`, `PuertasElite` (TU PROGRAMA), `QueHacerHoy` (TU
  PLAN, HOY: suplementos del coach + palancas del cierre; la terna vieja
  solo sin evaluación).
- `HeroLaboratorios`: fecha del estudio, ventana de 30 días entre tomas,
  "Sin rango" sin sexo, tope 10 s, "en camino" solo con labs bien leídos.
- `index.tsx`: token de intento contra la carrera del timeout de 30 s;
  `reconciliarSuenoSilencioso` junto a los avisos (montaje, foreground,
  foco).
- Revisión: 1 bloqueante (sexo asumido) + 13 menores; 12 cerrados.

### ELITE (`561f309`)
- Migración **324** (no aplicada): coach_clients, nutrition_plans (pausa el
  activo, no borra), metas solo donde falten, lab_values source='elite'
  sin duplicar ni pisar; SECURITY DEFINER con el gate de admin de la 318;
  atómica (probado: un fallo en labs revierte todo).
- `supplements.tsx`: TU PLAN DE ENRIQUE, pausa-no-borra, "Por qué",
  leyenda nueva, sin alert de Pro al pausar.
- `evaluacion-elite.tsx`: gate legal restaurado, lee `?seccion=`, metas sin
  "undefined", "No se pudo leer tu cuenta" (antes "membresía"), "preparando"
  solo a quien es Elite o tiene evaluación.
- `genetica.tsx`, labs con etiqueta "Evaluación Elite", `curl-elite.sh` con
  bloque AVISOS, `CARGAR_ELITE.md` actualizado (requiere 323; corrección de
  valor con misma fecha no entra; coach = quien corre).
- Revisión: 3 bloqueantes + 10 menores; 3 + 6 cerrados.

### ARGOS (`646129f`)
- Bloque Elite detallado (≤ 6,000 caracteres, prosa) + plan de suplementos
  vivo con dosis, momento y porqué. Contexto de un cliente real: ~10,400
  caracteres; el proxy no recorta.
- **Las 30 lecturas del contexto distinguen fallo de vacío** (antes 9):
  `if (error) throw` en 16 lecturas, en los 2 `Promise.all`, y variantes
  `Resultado` para PRs e hidratación; sonda para ciclo. El prompt dice "En
  este turno no pude leer: ..." y la regla prohíbe "todavía no te conozco".
- `maybeSingle` en perfil; dosis '-' = sin fijar; precedencias (plan vivo,
  ventana del equipo); vaciado al cerrar sesión; "premium" fuera del
  catálogo de navegación.
- Revisión: 1 bloqueante + 10 menores; 1 + 6 cerrados.

### SUEÑO (`6305990`)
- `sueno-unificado-core/service`: `leerNochesUnificadas` (degradada por
  tabla, `parcial:'telefono'`), `reconciliarSuenoSilencioso` (respiro 2 h
  por cuenta, bandera "apagado", nunca abre diálogos, motivos:
  muy_pronto / sin_usuario / apagado_por_usuario / sin_plataforma /
  sin_permiso / lectura_fallida / escritura_fallida / nada_nuevo /
  importadas).
- Noche parcial se completa si la fila es de máquina y la nueva trae más
  minutos (`decidirEscrituras`, pura, 7 tests); `sleep_cycle` jamás.
- Permisos tri-estado (timeout ≠ sin permiso); iOS "Conectado" alcanzable
  con evidencia; estado "apagado"; pantalla con salida en todos los estados.
- Sin módulos nativos nuevos: **no hace falta build**.
- Revisión: 3 bloqueantes + 11 menores; 3 + 7 cerrados.

### FITNESS (`8cc46c7`)
- `decidirHoy` con estado `asignada`; precedencia coach > propia con
  `desplazada`; nombre sin " (copia)"; lecturas esenciales lanzan y el hub
  muestra "No pudimos leer tu día" + Reintentar; cardio de hoy y rutina
  asignada distinguen error de vacío; nivel declarado solo si se guardó.
- Cardio: sin BETA, ritmo por sesión; tile a `/fitness-cardio`; biblioteca
  con estado de lectura fallida; "validación clínica" fuera del copy.
- Revisión: 0 bloqueantes + 8 menores; 7 cerrados.

### VENTA / COPY / ORBE (`920670e`)
- Ajustes › Tu servicio (dos caras, estado ilegible, fechas ilegibles,
  Restaurar siempre); "ATP completo"; canje con 6 mensajes distintos.
- Copy: intervención → práctica (consola, reportes, tarjetas), Silent →
  Silencio, Random → Al azar, estados vacíos, em dashes.
- 49 + 12 usos de `sinDatos` como tinta → `textoTenue`; `verifica.js` caza
  ahora `tk.`, ternarios y `placeholderTextColor`.
- Orbe: `colchonOrbe`, `paddingBottomConColchon` (max), `useColchonOrbe`,
  `Screen` con colchón por defecto y **llaves estables** (abrir ARGOS ya no
  remonta la pantalla de abajo: era una regresión global).
- Revisión: 5 bloqueantes + 7 menores; 5 + 5 cerrados.

---

## 4. LO QUE NO SE HIZO (fila, con fecha de nacimiento)

Nada de esto lastima a un cliente hoy ni expone datos. Lo que necesita tu
decisión lleva **[dueño]**.

**Nacido esta noche (20-sep)**
- `useSubscription` no cachea a nivel módulo: ahora lo montan también
  GlobalTopBar y TopBannerPersistent (3 lecturas de tier + RevenueCat por
  pantalla). Si pesa, caché por usuario dentro del hook.
- Carga Elite no siembra `client_profiles` (sexo, fecha de nacimiento),
  `profiles.fitness_level` ni FC de reposo: **cardio "no calcula" el día
  uno** aunque la pantalla esté bien. Va en la 325 (noche dos).
- `nutrition_plans`: la 324 pausa cualquier plan activo, aunque el nuevo
  traiga menos que el que armaste en el panel. Avisado en el script.
  **[dueño]**: si prefieres que no pause cuando el activo es más completo.
- Dos rutinas del coach el mismo día: gana la más antigua; no se avisa.
- `assign_routine_to_client` clona con " (copia)": hoy se recorta al pintar;
  el arreglo de raíz es `p_new_name := name` en la migración. **[dueño]**
- ARGOS: costo del contexto (~10k chars) también en el insight diario y en
  los generadores de rutina/receta; `timing` crudo en inglés en el resumen
  de la evaluación ("evening"); si falla el perfil extendido, el ciclo no
  se reporta como no leído; `getUserWaterGoal` con fallback silencioso.
- iOS: `leerEstado()` hace una lectura de 2 días de HealthKit para
  confirmar "Conectado" (hasta 20 s, cubierta con "Consultando…").
- Noches de 24 h se muestran tal cual ("24 h 00 min") hasta que la 300
  las limpie. **[dueño]**
- `help-circle-outline` en salud-conexion: no existe un AppIcon de ayuda.
- `routine-generator.tsx:441` y `settings/salud.tsx:121` ignoran el `{ok}`
  nuevo de `setFitnessLevel` (ya no escriben caché si falla; no avisan).
- Cabecera de suplementos puede contar 5 cuando la evaluación trae 6 si
  una ficha ya era del cliente (`suplementos_ya_del_cliente`): correcto
  por dato sagrado, pero se ve raro.

**Deuda anterior que salió a la luz (con la fecha en que nació)**
- Sexo por defecto a hombre en 10 sitios más (nacido 2025-2026):
  `edad-atp-v2-service.ts:442`, `labs-report-service.ts:119`,
  `lectura-service.ts:51`, `limites-free-service.ts:36`,
  `image-pick-core.ts:73`, `estimacion-inicial-core.ts:230`,
  `edad-bridge-service.ts:108`, `health-score-service.ts:22`,
  `ClientDetailScreen.tsx:572,591,884,1887`. `flags.ts:590-612` ya lo
  documenta con costo medido (+3.2 años de Edad ATP a una mujer de 28).
- `supplements.tsx:893,1079` candado "Editar está en Pro" → `/paywall`
  (código muerto con `VENTA_AL_PUBLICO=false`). **[dueño]**: quitar o dejar
  "apagado, no borrado".
- `medical-disclaimers.ts` glucose/ketones/braverman/interpretation con
  "diagnóstico" (texto de consentimiento versionado: cambiarlo re-pide
  aceptación a todos). **[dueño]**
- ~280 em dashes en `src/constants` (interventions-catalog 28, labs-guide
  8, fasting-protocols 8), `src/data`, `coach-engine` y 10 en
  `src/services/fitness/{edad-bridge,emom,mobility,routine-generator}`.
  `verifica.js` los marca si se le pasan esos archivos.
- `argos-hub.ts`: nombre "-outline" en archivo de registro.
- `app/paywall.tsx` (ruta apagada) sigue diciendo "ATP Pro".
- Censo de rutas: 3 huérfanas (`/onboarding/voice-config`,
  `/settings/comunidad`, `/settings/cuenta`) y 5 sobrantes en la lista
  blanca (`/cardio-import`, `/protocol-explorer`, `/afiliados/*`).
- `R and D/embudo/**` y los docs de agosto siguen modificados sin commit
  (tuyos, no los toqué).

---

## 5. PLAN DE DOS SEMANAS, NOCHE POR NOCHE

Fecha límite tuya: **4 de octubre**. Cada noche: diagnóstico corto → plan →
constructores → revisores en frío → arreglos → entrega. Tú por la mañana:
`tsc`, `npm test`, `db push` si hay migración, `git push`, OTA a `preview`,
QA de 15 minutos, y las decisiones marcadas.

| Noche | Fecha | Qué cierra | Qué necesito de ti antes |
|---|---|---|---|
| **2** | 21→22 sep | **Fabiola de verdad.** Migración 325: la carga siembra `client_profiles` (sexo, fecha de nacimiento), `fitness_level`, FC de reposo si el DX lo trae. El esquema `elite_v3` crece: `entrenamiento.rutinas[]` estructuradas (importador → `routines` + `scheduled_routines` con `assigned_by`) y `alimentacion.comidas[]` (→ items del plan). Tu decisión "el plan de entrenamiento y alimentación SE CONVIERTEN en rutinas y comidas". Cardio calcula con lo sembrado. | DX de Fabiola en `R and D/diagnostico/` (JSON o texto; si es texto lo estructuro yo y tú lo apruebas). 324 aplicada. Supabase reconectado. |
| **3** | 22→23 sep | **Timers unificados.** RestTimer, EMOMAuto, MyoReps, Method35 y RoutineEngine sobre un solo reloj (`useReloj`), `/session` como único runner, hub de fitness "aterrizado" con la rutina importada de la noche 2. | Nada. |
| **4** | 23→24 sep | **ARGOS con memoria** (episódica por cliente: "lo que hablamos ayer"), insight diario Elite sobre el plan, voz revisada. **Comunidad → Skool** con salida de reemplazo en la app (sin pantalla muerta). | Link de Skool y decisión: ¿la pestaña Comunidad desaparece o lleva a Skool? |
| **5** | 24→25 sep | **UX/UI "poca madre".** Barrido visual completo con `scripts\audit-visual.ps1` (elite-oscuro y elite-claro), colchón del orbe en dispositivo, jerarquía tipográfica, animaciones de entrada, estados vacíos con ilustración, Home y evaluación como "portada". | Correr `audit-visual.ps1 -Tema elite-oscuro -Espera 2.5` y `-Tema elite-claro` la mañana del 24 (las capturas actuales son del 17-ago, pre-pivote). |
| **6** | 25→26 sep | **Tu consola.** Seguimientos semanales (follow-ups) por cliente con notas, recarga de versión de la evaluación desde la consola (sin script), asignar rutina y comidas desde ahí, "qué le pasó esta semana" en una pantalla. Tu propio DX cargado. | Tu DX terminado (o lo que tengas: labs ya están normalizados en `LABS_ENRIQUE_2026-09-09.md`). |
| **7** | 26→27 sep | **Deuda con fecha.** Sexo por defecto ×10, em dashes ×280, paywall muerto, disclaimers con versión, 300, 3 huérfanas, `assign_routine_to_client` con nombre. Segunda pasada de revisión en frío sobre TODO el camino del día uno. | Decisiones [dueño] de la sección 4. |
| **8-9** | 28→30 sep | **Build nativo si hace falta** (hoy no: ningún módulo nuevo). TestFlight / Play interno. Onboarding día uno pulido: registro con código → consentimientos → primera sesión (tú sobrescribes el objetivo) → Home Elite. Notificaciones del plan (suplementos a su hora). | Credenciales EAS listas; 2-3 clientes reales para QA. |
| **10-11** | 1→3 oct | **QA con clientes reales y hotfixes por OTA.** Cada reporte se cierra en la noche. Documento y guion de demo para inversionista (lo que la app hace con Omar/Fabiola de principio a fin). | Feedback de los clientes, en crudo. |
| **12** | 3→4 oct | **Entrega.** Tag `v3.0-elite`, OTA final, documento de estado para el inversionista, lista de lo que queda para después. | Nada. Dormir. |

Si una noche se cae (tú no puedes correr lo tuyo, o un hallazgo cambia el
plan), se corre todo un día; la fecha límite aguanta un día de holgura.

---

## 6. LO QUE TE PIDO HOY

1. Corre la sección 2 (0 → 5) y pégame la salida de `tsc`, `npm test` y
   `db push`.
2. Mira la sección 1 y dime si alguna decisión no va.
3. Deja el DX de Fabiola en `R and D/diagnostico/` y reconecta Supabase.
4. Corre la auditoría visual (`elite-oscuro` y `elite-claro`) cuando el OTA
   esté en tu teléfono, para que la noche 5 arranque con capturas reales.
