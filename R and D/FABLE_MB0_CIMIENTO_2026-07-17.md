# 🧱 BRIEF EJECUTABLE · MB-0 · CIMIENTO ENGORDADO (para CC / Code)

**Fecha:** 2026-07-17 · **Autor:** Cowork (dirección técnica) · **Ejecuta:** agente Code · **Plan padre:** `PLAN_MAESTRO_V2_LOCKED_2026-07-17.md` (§2 MB-0).

**Qué es MB-0:** el cimiento del camino a V2. Mata la sensación "roto" a nivel sistema **y** deja instalados 5 destrabadores baratos que ahorran semanas río abajo. **Va primero, sin excepción.** Ningún batch grande abre hasta que MB-0 pase su gate.

**Objetivo de una línea:** repo fuera de OneDrive · CI que hace autoritativo el `tsc` · tokens semánticos que habilitan LIGHT en v2.1 · casts de rutas normalizados · cuenta femenina de test · decisión de stack nativo · + los P0/P1/P2 transversales del tracker.

---

## 0. INVARIANTES (no negociables — aplican a TODO el brief)

1. **`str_replace` quirúrgico.** NUNCA reescribir archivos completos. Cambios mínimos y localizados. (regla técnica #1)
2. **`tsc` limpio.** El gate de tipos ahora corre en **CI** (ítem 2). Antes de cada commit, el árbol debe compilar. 0 errores TS.
3. **Un commit por ítem.** Mensaje claro con el ID del ítem (ej. `MB-0(a): capa de tokens semánticos sobre brand.ts`). Facilita rollback quirúrgico.
4. **Delivery doc obligatorio** al cierre: `DELIVERY_MB0_CIMIENTO.md` (qué se tocó, archivos, decisiones, cómo verificar).
5. **Skills:** usar **superpowers** (disciplina + verificación paso a paso, no asumir) en todo MB-0. Usar **impeccable** en el delivery. Usar **frontend-design** + **apple-design/emil** donde se toque UI (HOME-1, KeyboardAvoidingView, tokens).
6. **NUNCA** `crypto.randomUUID` → `generateUUID`. **SIEMPRE** `getLocalToday()` / `parseLocalDate()` en date queries. (reglas #2, #3)
7. **`Constants.expoConfig.extra`**, no `process.env` directo en cliente. (regla #7)
8. **Deploy default = OTA** (`eas update --branch preview`). MB-0 NO hace build nativo (el build único va post-MB-1). Nativo nuevo, si algo lo requiere: **lazy require**, nunca top-level.

---

## PASO 0 (PRIMERÍSIMO) · SACAR EL REPO DE ONEDRIVE

**Por qué:** el repo vive en `D:\...\OneDrive\...\EliteTimer` (sincronizado). Nos ha corrompido el index ~4 veces (`index.lock` huérfano, index corrupto) y hace que bash reporte tamaños stale/inflados. **Costo único vs impuesto crónico.**

**Approach (instrucciones copy-paste para Enrique, PowerShell, sin `&&`):**
1. Cerrar VS Code / cualquier proceso que tenga el repo abierto. Pausar sincronización de OneDrive.
2. Elegir carpeta local NO sincronizada, ej. `D:\Dev\EliteTimer` (fuera de OneDrive y fuera de rutas escaneadas por OneDrive).
3. Mover el repo completo (incluye `.git`). Preferible `git clone` local a la nueva ruta desde el remoto para evitar arrastrar un index sucio; si se mueve la carpeta, correr después `git status` y, si el index viene corrupto, `Remove-Item .git\index.lock -ErrorAction SilentlyContinue` + `git reset --hard HEAD` (sin pánico — es el fix conocido).
4. Reconfigurar cualquier ruta absoluta local (scripts, `.env` local, config de EAS/Supabase CLI) a la nueva ubicación.
5. Verificar: `git status` limpio, `git log` intacto, remoto correcto (`git remote -v`).

**Rol de CC aquí:** documentar el procedimiento exacto en el delivery + verificar tras el movimiento que el árbol está sano y compila. El movimiento físico de carpeta lo confirma Enrique en su máquina; CC valida el estado resultante.

**Verificación:** repo confirmado fuera de cualquier ruta OneDrive · `git status` limpio · sin `index.lock` huérfano.

---

## LOS 5 DESTRABADORES

### (a) CAPA DE TOKENS SEMÁNTICOS sobre `brand.ts`
**Archivo:** `src/constants/brand.ts` (única fuente de verdad de color; ya tiene los tokens canónicos `BG`, `BORDER`, `TEXT`, `ELEVATION`, `SURFACES`, `TEXT_COLORS`).

**Qué:** agregar una **capa de alias semánticos** (`bg` / `surface` / `text` / `accent`) que apunte a los valores dark actuales. **NO cambia ningún valor dark. Solo agrega indirección** para que en v2.1 se pueda introducir el set light sin repintar pantallas.

**Approach:** al final de `brand.ts`, exportar un objeto de tema semántico, ej.:
```ts
// ═══ CAPA SEMÁNTICA (habilita LIGHT en v2.1 sin repintar) ═══
// Alias sobre los tokens canónicos dark. NO cambia valores; da un punto
// único de indirección para introducir el set light más adelante.
export const SEMANTIC_THEME = {
  bg: { screen: BG.screen, card: BG.card, elevated: BG.cardElevated, input: BG.input },
  surface: { base: SURFACES.base, card: SURFACES.card, border: BORDER.card },
  text: { primary: TEXT.primary, secondary: TEXT.secondary, tertiary: TEXT.tertiary, muted: TEXT.muted, onAccent: TEXT_COLORS.onAccent },
  accent: { primary: ATP_BRAND.lime, teal: ATP_BRAND.teal, amber: ATP_BRAND.amber },
} as const;
```
(Ajustar nombres a los tokens reales del archivo — CC valida contra el contenido actual.) **No hay que migrar consumidores en MB-0**; solo dejar la capa disponible. La migración masiva de hardcodes a esta capa es trabajo de v2.1 (LIGHT), fuera de V2.

**Skill:** frontend-design (coherencia de nomenclatura de tokens).

**Verificación:** `SEMANTIC_THEME` exporta, `tsc` limpio, la app se ve idéntica (cero cambio visual dark).

---

### (b) CI GITHUB ACTIONS · `npx tsc --noEmit` EN CADA PUSH
**Por qué:** el `tsc` masivo NO completa en el sandbox (I/O patológico en OneDrive) y en la máquina de Enrique era un paso manual olvidable. CI lo hace **autoritativo y automático** — mata el problema de raíz y quita el paso manual del gate.

**Archivo:** crear `.github/workflows/typecheck.yml`.

**Approach:**
```yaml
name: typecheck
on: [push, pull_request]
jobs:
  tsc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
```
(Ajustar `node-version` al que use el proyecto; si usa `pnpm`/`yarn`, ajustar install + cache.) Confirmar que `tsconfig.json` **excluye `.claude/worktrees/**`** para que el CI no tarde de más ni falle por worktrees viejos (ver ítem de higiene abajo).

**Verificación:** el workflow corre en el primer push de MB-0 y **queda verde**. A partir de aquí, el gate `tsc` de todo batch = CI verde.

---

### (c) MOVER LOS `as any` DE EXPO-ROUTER (#64) A MB-0
**Por qué:** protegen el gate `tsc` durante las 14+ semanas siguientes. Si quedan sueltos, el `tsc` puede volverse ruidoso o esconder errores reales de ruta. Se normalizan ahora.

**Qué:** hay ~8+ casts de rutas tipo `router.push('/x' as any)` / `router.replace({...} as any)` dispersos (confirmados en `app/`: `argos-chat.tsx`, `argos/meet.tsx`, `argos/conversations.tsx`, `afiliados/*.tsx`, `(tabs)/yo.tsx`, `(tabs)/kit.tsx`, `(tabs)/index.tsx`, etc.). El origen es que los tipos de expo-router no están al día con las rutas.

**Approach:**
1. **Regenerar los tipos de expo-router** (typed routes) para que las rutas existentes sean conocidas por el compilador — así la mayoría de casts sobran.
2. Para cada `router.push/replace/navigate(... as any)` de **ruta**, quitar el `as any` una vez que la ruta es tipada. Si alguna ruta es genuinamente dinámica y no tipable, usar el tipo correcto de expo-router (`Href`) en vez de `as any`, o encapsular en un helper tipado — **no** dejar `as any`.
3. **OJO — distinguir:** los `as any` sobre **datos** (ej. `(user.user_metadata as any)?.full_name`, `(cp as any)?.biological_sex`, `(data as any)?.biological_sex`) **NO son el objetivo de #64** — esos son casts de datos de Supabase, se dejan como están (o se anotan como deuda de tipos aparte). **Solo tocar los casts de RUTA de expo-router.**

**Skill:** superpowers (verificar cada cambio; no romper navegación).

**Verificación:** `tsc` limpio (CI verde) sin los casts de ruta · navegación sigue funcionando en el rolling smoke.

---

### (d) CREAR LA CUENTA DE TEST FEMENINA
**Por qué:** el pilar Ciclo/Embarazo es ciego en la cuenta masculina de Enrique. Crear la cuenta **ahora** habilita el smoke de Ciclo en TODOS los gates del camino (no solo en MB-7).

**Approach:** crear una cuenta de prueba con `biological_sex = 'female'` (y, si aplica, estado de ciclo/embarazo por defecto) en el entorno de Supabase que use la beta. Documentar credenciales en un lugar seguro (no en el repo público / no en el delivery en claro — referenciar dónde viven). Verificar que loguea y que los pilares gated por sexo femenino se muestran.

**Verificación:** login OK · pilar Ciclo visible · queda documentado cómo acceder para los rolling smokes.

---

### (e) SPIKE DE DECISIÓN DE STACK NATIVO
**Por qué:** el plan hace **un solo build nativo** post-MB-1 con TODAS las deps previsibles. El spike decide cuáles y cómo, para no hacer 3 builds reactivos.

**Qué decidir (documento, no código en MB-0):**
- **Audio:** confirmar **`expo-audio`** como reemplazo de `expo-av` (deprecado en SDK54). Definir la config nativa de audio background + lock screen (`UIBackgroundModes` en iOS) que necesitan Mente (MB-5) y voz ARGOS (J5).
- **Teclado:** confirmar **`react-native-keyboard-controller`** para blindar KEY-1 app-wide (KeyboardAvoidingView es frágil).
- **Motion de la presencia ARGOS (orb/waveform):** elegir la lib de animación para el orb idle/pensando/hablando (Reanimated ya presente vs. Skia vs. Lottie — recomendar según el prototipo de J2). **Sin mascota husky** — es orb abstracto.

**Approach:** producir una sección en el delivery (o mini-doc) `SPIKE_NATIVO_MB0.md` con: dep elegida, versión compatible con SDK54, config nativa requerida, y **recordatorio de lazy require** para cada una. **No se instala nada nativo en MB-0** — solo se decide, para que el build único post-MB-1 sea de una sola pasada.

**Verificación:** documento de decisión con las 3 deps + config nativa + versiones + nota de lazy require.

---

## ÍTEMS TRANSVERSALES DEL TRACKER (P0/P1/P2)

### INFRA-P0 · SPA fallback en Vercel
**Archivo:** `vercel.json` (config de deploy, NO código). Rewrites catch-all → `/index.html`. Mata el 404 crudo en refresh/deep-link de rutas internas.
**Verificación:** refresh en una ruta ≠ `/` NO da 404.

### KEY-1 (P0) · KeyboardAvoidingView app-wide
**Approach:** componente `Screen` compartido que envuelva las pantallas con inputs, resolviendo el teclado que tapa inputs en la parte baja. En MB-0 se resuelve con la primitiva actual; el blindaje definitivo (`react-native-keyboard-controller`) entra en el build único post-MB-1 (spike e). Movimiento fluido/interrumpible al aparecer el teclado.
**Skill:** apple-design + emil (interrupción, feel del scroll).
**Verificación:** teclado NO tapa inputs en pantallas bajas (device).

### HOME-1 (P0) · rework de HomeFloatingButton
**Archivo:** `src/components/ui/HomeFloatingButton.tsx` (montado en `app/_layout.tsx:263`). Es un **rework**, no un componente nuevo.
**Cambios:**
- Matar `router.replace('/(tabs)')` que **reinicia la app** → `router.navigate` / `router.push`.
- Icono `flash`/"rayito" → **casita con ícono ATP sin letras**.
- Posición **arriba-izquierda**, **persistente en todas las pantallas MENOS HOY**, tamaño correcto.
**Skill:** apple-design + emil (feel del tap, posición, tamaño).
**Verificación:** botón persistente, no reinicia, casita ATP correcta (device).

### NAVY-SEALS (P1) · quitar autoridad en 2 campos `benefit`
**Archivo:** `interventions-catalog.ts:3320` y `:3541`. Tocar **solo el campo `benefit`** (el `citation` NO se renderiza — no tocarlo). Doctrina no-citar-autoridades / no-matar-placebo.
**Verificación:** el copy user-facing de esos 2 benefits ya no invoca autoridad.

### Morado off-brand (P2) · chronotype
**Archivo:** `chronotype.tsx:29` (`onboarding/v2/`) — `#7c3aed` → token de `brand.ts`.
**Verificación:** sin morado hardcodeado off-brand.

### Higiene
- **Podar `.claude/worktrees/*`** (inflan el `tsc` local y el CI). Confirmar que `tsconfig.json` los excluye.
- **Rename migraciones** `198a→198` / `198b→199` (el Supabase CLI rechaza letras).
**Verificación:** worktrees viejos fuera · migraciones sin sufijo de letra.

---

## 🚦 GATE DE MB-0 (device + CI — obligatorio antes de abrir MB-1)

Además de la checklist específica, correr el **rolling smoke de 10 min del loop core**: abrir HOY → tocar card del palomar → ver agenda → registrar algo → volver a HOY y ver el reflejo → abrir YO y ver Edad ATP.

- [ ] **Repo FUERA de OneDrive**, `git status` limpio, sin `index.lock` huérfano.
- [ ] **CI verde** (`tsc --noEmit` = 0 en cada push) — el gate `tsc` ya es automático.
- [ ] Capa de **tokens semánticos** instalada (`SEMANTIC_THEME`), cero cambio visual dark.
- [ ] `as any` de **rutas** expo-router (#64) eliminados; casts de datos intactos; navegación OK.
- [ ] **Cuenta femenina** existe, loguea, muestra pilar Ciclo.
- [ ] **Spike nativo** documentado (expo-audio + keyboard-controller + lib motion ARGOS, con config y lazy require).
- [ ] Teclado NO tapa inputs en pantallas bajas.
- [ ] Home button persistente, no reinicia, casita ATP arriba-izquierda, ausente solo en HOY.
- [ ] Refresh/deep-link en ruta ≠ `/` NO da 404.
- [ ] NAVY-SEALS: 2 benefits sin autoridad · morado off-brand fuera · worktrees podados · migraciones renombradas.
- [ ] **Rolling smoke 10 min del loop core OK.**

**Entregable:** `DELIVERY_MB0_CIMIENTO.md` (+ `SPIKE_NATIVO_MB0.md` si se separa) + OTA preview. **Commit por ítem.**

---

## Notas de ejecución
- **Migraciones (si alguna aparece):** idempotentes (`IF NOT EXISTS`/`ON CONFLICT`), `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` + policy, Cowork audita branch antes del merge, `npx supabase db push` al remoto. MB-0 no debería necesitar migración salvo el rename 198/199.
- **Electrones/nutrición:** si se toca algo que otorga electrones, emitir `DeviceEventEmitter.emit('electrons_changed')` / `'day_changed'` (reglas #5/#6). MB-0 probablemente no toca esto.
- **PowerShell sin `&&`** para las instrucciones a Enrique (priorizar su tiempo, copy-paste directo).

*Generado por Cowork (dirección técnica) · 2026-07-17 · brief ejecutable MB-0 para CC. Deriva de `PLAN_MAESTRO_V2_LOCKED_2026-07-17.md`.*
