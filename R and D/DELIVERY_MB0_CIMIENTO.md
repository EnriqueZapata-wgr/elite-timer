# 📦 DELIVERY · MB-0 CIMIENTO

**Fecha:** 2026-07-17 · **Branch:** `fix/mb0-cimiento` · **Ejecutó:** CC (Fable) · **Brief:** `R and D/FABLE_MB0_CIMIENTO_2026-07-17.md`
**Corrección de Enrique aplicada:** el repo **NO se movió** (ya vive en SSD local `D:\Proyectos_ClaudeCode\...`, sin sincronización — confirmado). El PASO 0 se sustituyó por el CI de GitHub Actions, que es el desbloqueo real del gate `tsc`.

## Resumen en una línea

CI `tsc` autoritativo en cada push · 196 casts de ruta eliminados con typed routes al día · capa `SEMANTIC_THEME` lista para LIGHT v2.1 · cuenta femenina de smoke operativa · spike nativo decidido · KEY-1/HOME-1/INFRA-P0/NAVY-SEALS/morado resueltos · worktrees podados.

---

## Qué se hizo, por ítem (un commit por ítem)

### (b) CI GitHub Actions — sustituye al PASO 0 · `72cbcce`
- `.github/workflows/typecheck.yml`: `npm ci` + `npx tsc --noEmit` en cada push/PR (node 20, cache npm).
- `tsconfig.json` excluye `.claude/worktrees/**`.
- **El gate `tsc` de todo batch a partir de aquí = CI verde.** Localmente `tsc` también completa ya (SSD): baseline verificado en 0 errores antes de cada commit.

### Higiene — sin commit (estado del repo)
- 4 worktrees `agent-*` podados (`git worktree remove` + `prune`); los 4 estaban limpios y sus ramas ya mergeadas a main. El worktree `EliteTimer-Fable` queda — sigue activo.
- Migraciones 198a/198b: **ya estaban renombradas** a `198_rewrite_handle_new_user.sql` / `199_drop_supplement_protocols.sql` (cero migraciones con sufijo de letra). Nada que hacer.

### (a) Tokens semánticos · `bfe4ed5`
- `src/constants/brand.ts` exporta `SEMANTIC_THEME` (`bg` / `surface` / `text` / `accent`) + tipo `SemanticTheme`: alias puros sobre los tokens dark canónicos (`BG`/`SURFACES`/`BORDER`/`TEXT`/`TEXT_COLORS`/`ATP_BRAND`). **Cero cambio de valores, cero consumidores migrados** (eso es v2.1 LIGHT).

### (c) Casts `as any` de rutas expo-router (#64) · `67e4787`
- Realidad vs brief: no eran ~8 — eran **196 casts en 102 archivos** (`app/` + `src/`).
- `typedRoutes` ya estaba activo pero `.expo/types/router.d.ts` llevaba **desde el 24-jun sin regenerar** (no conocía `/salud/*`, `/comunidad/*`, `/afiliados/*`). Se regeneró (arrancando Metro brevemente).
- Los 196 casts fuera; los residuales tipados en la fuente: `Href` en `day-compiler` (`VERIFIED_ELECTRON_ROUTES`, `ELECTRON_ROUTES`, `pillarRoute`), `hero-recommendation-service`, `onboarding-v2-core/service` (`v2Route`, `resolveOnboardingRoute`, `completeV2Step`), `hoy-cards`, `component-meta`, `data-capture-routes`, `TopBanner`, y ~14 arrays locales de pantallas (`as const` o interfaz `Href`).
- **Decisión de infraestructura:** `.expo/types/router.d.ts` y `expo-env.d.ts` ahora **se versionan** (`.gitignore`: `.expo/*` + `!.expo/types/`) — el CI typechequea estricto sin dev server. ⚠️ **Gotcha nuevo:** al añadir/renombrar rutas, `expo start` regenera el archivo → **commitearlo**; si el CI falla con "not assignable to parameter of type" en un push de rutas nuevas, es esto.
- Casts de **datos** Supabase (`(x as any)?.campo`) intactos — fuera del alcance de #64, como pedía el brief.
- Deep link dinámico de notificaciones (payload del server): único cast `as Href` documentado, con try/catch runtime ya existente.

### (d) Cuenta de test femenina · sin commit (infra remota)
- Creada por SQL en **ELITE-APP-FULLDB** (`itqkfozqvpwikogggqng`): auth.users + identity confirmados, perfil con onboarding `completed`, consentimiento médico, `argos_introduced_at` (no cae en Meet ARGOS ni en backfill de voz — fila en `coach_voice_config`), `client_profiles` con `biological_sex='female'` + `cycle_modality='regular'`.
- **Login verificado por GoTrue REST (access_token OK).**
- 🔐 Credenciales en **`.env.test.local`** (local, cubierto por `.env*.local` en `.gitignore` — verificado con `git check-ignore`). user_id: `d1d42bd9-d2ea-4a0c-b6fd-de14a1c6edae`.
- Pendiente device: abrir la app con esa cuenta y confirmar pilar Ciclo visible (checklist gate).

### (e) Spike nativo · `096811b`
- `R and D/SPIKE_NATIVO_MB0.md`: **expo-audio** (ya instalada ~1.1.1; UIBackgroundModes audio; quitar expo-av en el build), **react-native-keyboard-controller ^1.18** (swap interno de la prop `keyboard` de `Screen`, sin tocar pantallas), **orb ARGOS con Reanimated 4 + SVG ya presentes** (cero dep nueva; Skia solo como escalación si J2 lo exige; Lottie descartado). Lazy require en todo. Nada instalado en MB-0.

### INFRA-P0 · SPA fallback Vercel · `9892711`
- `vercel.json` con rewrite catch-all → `/index.html`. Pendiente verificar tras el próximo deploy web: refresh en ruta ≠ `/` sin 404.

### KEY-1 · teclado (P0) · `0d99c22`
- `Screen` gana prop **`keyboard`** (opt-in): iOS `KeyboardAvoidingView behavior='padding'` (curva nativa interrumpible); Android no-op — `adjustResize` (default Expo) ya redimensiona.
- Activada en 11 forms con inputs bajos: journal, checkin, health-input (migrado de SafeAreaView crudo a `Screen`), glucose-log, ketones-log, log-exercise, cycle-settings, salud/sintomas, lab-confirmation, food-register, food-preferences.
- `argos-chat` NO se tocó (layout de chat propio, ya estabilizado en hotfixes).
- El blindaje keyboard-controller post-MB-1 entra cambiando SOLO la implementación interna de la prop.

### HOME-1 · HomeFloatingButton (P0) · `0838f15`
- El `router.replace('/(tabs)')` del brief **ya no existía** (un fix previo lo dejó en `router.navigate`); se conserva navigate y se documenta.
- Icono `flash` → **casita** (`home`) sin letras, lime ATP, 44pt (mínimo táctil HIG), mismo lenguaje de glow que ARGOS.
- **Arriba-izquierda**, bajo la línea del header (`insets.top + 52`) — decisión de diseño: en la esquina exacta taparía el `BackButton` que TODOS los headers pintan arriba-izquierda.
- Visibilidad: ausente **solo en HOY** (antes también en /yo y /kit) + funnel onboarding/auth + chat ARGOS + teclado abierto (criterio compartido con ARGOS). Tests `home-floating-core` actualizados.

### NAVY-SEALS (P1) · `17a0d4d`
- `interventions-catalog.ts` — solo los 2 campos `benefit` (3320/3541): autoridad → mecanismo (ritmo simétrico/retenciones; sub-resonancia barorrefleja). Los `citation` intactos (no se renderizan).

### Morado off-brand (P2) · `ef4957b`
- `onboarding/v2/chronotype.tsx`: `#7c3aed` → `ATP_BRAND.teal` (doctrina 3 colores). Cero `#7c3aed` restante en el archivo.

---

## Verificación (evidencia, no fe)

| Check | Resultado |
|---|---|
| `npx tsc --noEmit` local | **0 errores** (corrido antes de cada commit) |
| `npm test` (vitest) | **178 archivos / 1788 tests verdes** (incl. cores puros tocados: onboarding-v2, day-compiler, hoy-cards, home-floating) |
| Login cuenta femenina | access_token de GoTrue por REST ✓ |
| `.env.test.local` ignorado | `git check-ignore` ✓ |
| Worktrees | `git worktree list` = solo main + Fable |
| CI | ver estado del workflow `typecheck` en el push de esta rama |

## Pendiente para el gate (device — Enrique)

- [ ] Rolling smoke 10 min del loop core (HOY → palomar → agenda → registro → reflejo → YO/Edad ATP).
- [ ] Teclado no tapa inputs en los 11 forms (device iOS — Android ya era resize).
- [ ] Home button: casita arriba-izquierda, persistente, ausente solo en HOY, no reinicia.
- [ ] Login cuenta femenina en device + pilar Ciclo visible.
- [ ] Refresh/deep-link web sin 404 (tras próximo deploy Vercel).
- [ ] OTA preview: `eas update --branch preview` tras merge.

## Skills usadas
superpowers (verificación antes de cada claim — tsc/vitest/REST corridos, no asumidos) · frontend-design + impeccable (KEY-1/HOME-1 dentro del design system ATP; sugerencia: correr `$impeccable init` un día para capturar PRODUCT.md) · brief ejecutado con commit por ítem.
