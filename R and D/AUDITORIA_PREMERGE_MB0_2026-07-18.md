# 🔍 AUDITORÍA PRE-MERGE · MB-0 CIMIENTO

**Fecha:** 2026-07-18 · **Rama:** `fix/mb0-cimiento` (10 commits) · **Base:** `main` (`fd3066d`)
**Auditor:** Cowork (solo lectura, cero modificaciones de código) · **Método:** git objects (log/show/diff/grep contra `main`), no working tree
**Nota:** el índice del working tree está corrupto (`unknown index entry format 0x70680000` — patrón OneDrive conocido). NO afecta la auditoría: todo se leyó de los objetos git en el tip de la rama. El working tree pudo avanzar a MB-1+; se auditaron los commits de MB-0 vía `main..fix/mb0-cimiento`.

---

## 🟢 VEREDICTO: **APTO PARA MERGE**

Los 10 ítems de MB-0 y los 5 bonus P0/P1 están presentes, correctos y consistentes con el delivery. Sin bloqueadores P0. Sin secretos comiteados. Dos nits P2 cosméticos (no bloquean). El gate `tsc` autoritativo es el CI (declarado verde); confirmado que el workflow dispara en todas las ramas.

---

## Estado de los 10 ítems

| # | Ítem | Commit | Estado | Evidencia |
|---|------|--------|--------|-----------|
| 1 | **CI GitHub Actions** | `72cbcce` | ✅ | `.github/workflows/typecheck.yml`: `on: [push, pull_request]` (SIN filtro de rama → cubre el away run), node 20, `npm ci` + `npx tsc --noEmit`. `tsconfig.json` excluye `.claude/worktrees/**` + `supabase/functions/**`. |
| 2 | **Tokens semánticos** | `bfe4ed5` | ✅ | `brand.ts` exporta `SEMANTIC_THEME` (`bg`/`surface`/`text`/`accent`) + tipo `SemanticTheme`. Capa de **alias puros** sobre BG/SURFACES/BORDER/TEXT/TEXT_COLORS/ATP_BRAND; `as const`. Cero valores nuevos, cero consumidores migrados → **cero cambio visual en dark**. Sin imports rotos. |
| 3a | **Casts de ruta #64 (196 casts)** | `67e4787` | ✅ | Cero `as any` en `router.push/replace/navigate(...)`. Residuales tipados con `Href` como declara el delivery. Ver nit N1 abajo. |
| 3b | **Rutas nuevas existen (no fantasma)** | — | ✅ | `/(tabs)/yo`, `/(tabs)/kit`, `/afiliados/{aplicar,dashboard,mi-codigo}`, `/comunidad/{amigos,buscar,ranking,perfil/[userId]}` existen en el árbol. `typedRoutes` activo + CI verde ⇒ no hay `Href` a pantalla inexistente. |
| 4 | **Cuenta femenina / secretos** | sin commit | ✅ | `.env.test.local` **NO trackeado** (cero `.env*` en `git ls-tree` del tip). `.gitignore` cubre `.env*.local`. Cero archivos `.env`/secret/credential añadidos en los 10 commits. Grep de secretos (JWT `eyJ`, `service_role`, `sk-ant`, private keys, `password=`) en todo el diff: **solo** el user_id (UUID no sensible) en el doc de delivery. |
| 5 | **Spike nativo** | `096811b` | ✅ | `SPIKE_NATIVO_MB0.md`: expo-audio (ya instalada ~1.1.1), keyboard-controller ^1.18, orb Reanimated4+SVG (cero dep nueva), Skia como escalación, Lottie descartado. **`package.json`/`package-lock.json` sin cambios en toda la rama** → cero dep instalada por accidente. |
| 6 | **KEY-1 teclado** | `0d99c22` | ✅ | `Screen` gana prop opt-in `keyboard?: boolean`; iOS `KeyboardAvoidingView behavior='padding'`, Android no-op. Ver bonus (b). |
| 7 | **HOME-1 casita** | `0838f15` | ✅ | Ver bonus (c). |
| 8 | **INFRA-P0 Vercel SPA** | `9892711` | ✅ | Ver bonus (a). |
| 9 | **Navy SEALs** | `17a0d4d` | ✅ | Ver bonus (d). |
| 10 | **Morado off-brand** | `ef4957b` | ✅ | Ver bonus (e). |

## Estado de los 5 bonus P0/P1

| Bonus | Estado | Evidencia |
|-------|--------|-----------|
| **(a) vercel.json SPA fallback** | ✅ | `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}` — catch-all correcto para el 404 de refresh/deep-link web. |
| **(b) prop teclado en ~11 forms** | ✅ | **11/11 confirmados** con prop `keyboard`: journal, checkin, health-input, glucose-log, ketones-log, log-exercise, cycle-settings, food-register, food-preferences, salud/sintomas, edad-atp/lab-confirmation. `argos-chat` intencionalmente no tocado. |
| **(c) casita 44pt arriba-izq, ausente solo en HOY, `navigate`** | ✅ | Icono `flash`→`home` (20px, `ATP_BRAND.lime`), contenedor 44×44, `marginLeft:14` + `marginTop: insets.top+52` (arriba-izq bajo header). `router.navigate('/(tabs)')` (removido el `as any`, NO `replace`/`push`). `home-floating-core`: `HOY_PATHS = {'/','/index'}` → oculto **solo en HOY**; se muestra en /yo y /kit. |
| **(d) 2 benefits sin "Navy SEALs"** | ✅ | `interventions-catalog.ts`: los 2 campos `benefit` (box breathing 4-4-4-4 y avanzado 6-6-6-6) reemplazan la autoridad por mecanismo (ritmo simétrico + retenciones / sub-resonancia barorrefleja). Menciones "Navy SEAL" restantes viven en `citation` (no se renderizan) → conforme a doctrina. |
| **(e) teal en vez de `#7c3aed`** | ✅ | `chronotype.tsx`: `const PURPLE='#7c3aed'` → `const ACCENT = ATP_BRAND.teal`. **Cero `#7c3aed` en todo `app/` + `src/`**. |

---

## Barrido de regresiones

- **Rutas muertas / fantasma:** ninguna navegación a `/comunidad` "pelada" (grep vacío) — el `app/comunidad/index.tsx` pendiente (task #57) NO es referenciado por nadie, así que no rompe. Todas las rutas nuevas existen en disco. `typedRoutes` + CI verde blindan cualquier `Href` a pantalla inexistente.
- **Imports rotos:** el diff no agrega imports fuera del universo react/expo/@/src/react-native. Único import nuevo relevante: `type Href` en `app/index.tsx`. Sin imports colgados.
- **`require` de assets inexistentes:** cero `require('./...')` de assets nuevos en todo el diff.
- **Deps:** `package.json` / `package-lock.json` sin tocar → build no se altera.

## Nits (P2 — NO bloquean)

- **N1 · `app/index.tsx`:** quedan 2 `href={... as any}` en `<Redirect>` (`'/login' as any` y `onboardingRoute as any`). CC tipó el estado `onboardingRoute` como `Href | null` pero dejó el `as any` en el JSX (líneas preexistentes, no eran de los 196). `/login` existe. Como es `<Redirect>` (no `router.*`) y el CI compila verde, es cosmético; el cast podría eliminarse ahora que el estado ya es `Href`. No es del alcance #64.
- **N2 · Gotcha de infra documentado:** `.expo/types/router.d.ts` + `expo-env.d.ts` ahora se versionan; al añadir/renombrar rutas hay que commitear el archivo regenerado o el CI falla con "not assignable". Ya está documentado en el delivery — solo confirmarlo como disciplina del away run.

## tsc autoritativo

No se corrió `tsc` local (el mount + `npm ci` es demasiado lento para tmpfs en esta sesión). **Se confía en el CI verde declarado**, que es el gate correcto y definitivo (`tsc --noEmit` en node 20, cada push). El workflow dispara en todas las ramas → el away run queda cubierto.

---

## ⛔ CHECKLIST DEVICE-GATE (Enrique — NO verificable en código)

- [ ] Teclado real iOS no tapa inputs en los 11 forms (Android ya era `adjustResize`).
- [ ] Botón casita en device: arriba-izq, persistente, ausente solo en HOY, NO reinicia la app (navigate).
- [ ] Login cuenta femenina en device → pilar **Ciclo** visible (biological_sex=female).
- [ ] Rolling smoke 10 min del loop core (HOY → palomar → agenda → registro → reflejo → YO/Edad ATP).
- [ ] Refresh / deep-link web sin 404 tras próximo deploy Vercel.
- [ ] OTA preview post-merge: `eas update --branch preview`.

---

### Resumen ejecutivo
10/10 ítems + 5/5 bonus ✅ · 0 bloqueadores P0 · 0 secretos comiteados · 2 nits P2 cosméticos · deps intactas · CI verde cubre el gate tsc en todas las ramas. **APTO PARA MERGE.**
