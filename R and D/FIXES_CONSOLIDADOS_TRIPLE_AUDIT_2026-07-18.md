# 🔧 Fixes consolidados — Triple audit MB-0..MB-3 (2026-07-18)

Consolidación de los 3 frentes (Cowork visual + Cowork código/doctrina + CC interno) sobre `main @ 9749c85`. Deduplicado, con causa raíz (la de CC es autoritativa). **Cero P0.** Para que CC ejecute como UN batch de fixes. Branch sugerido: `fix/triple-audit-fixes`.

## 🟡 P1 — antes de MB-5
1. **"Configura HOY" miente** (kit/HOY). Con el flag ON, `getEffectiveCardsVisible` ignora la config manual → 7 cards imposibles de ocultar; los toggles escriben una columna que nadie lee. **[DECISIÓN ENRIQUE, ver abajo]** — default recomendado: la config manual actúa como CAPA DE OVERRIDE que el motor SÍ respeta (guiado no prisionero: el user puede ocultar una card prescrita).
2. **Casita tapa "OSISTEMA"** (`kit.tsx:67`) — regresión de HOME-1. Re-ocultar la casita en tabs (`/yo`, `/kit`); dejarla solo en pantallas NO-tab. (El header no era universal de 48px.)
3. **Bottom-sheets invisibles en web** — 3 overlays inline dentro del ScrollView raíz (`supplements`, `checkin`, `profile`) → convertir a `Modal` (los Modal sí funcionan + Escape). Bloquea edición de suplementos.
4. **snake_case leak a ARGOS** — `buildRationalePrompt` manda claves crudas al LLM (45 `PCR_hs` en catálogo) y ARGOS las repite. Legibilizar EN EL PROMPT (el cliente ya legibiliza). displayLabel server-side.
5. **Meet ARGOS copy genérico** (#43) — suena a "asistente humano". Reescribir con el system prompt de `SPEC_ARGOS_JARVIS_v1.md` (ingeniero de la creencia).
6. **Edad ATP delta hand-rolled en 4 superficies (una al revés)** — crear `formatEdadDelta()` ÚNICO (menor=más joven=celebrar) que impida re-inversión. Hardening del número estrella + test.
7. **#64 no cerrado** — 3 casts de ruta escaparon (`index.tsx:75-76`, `programs.tsx:74`) → tipar con Href.

## 🟠 P2
8. **Hueco negro de lazy-load** (todos los hubs 1-3s) — `EditorialCard.tsx:96-106` (placeholder solo si NO hay imagen) + migrar a `expo-image` (ya en deps) + comprimir PNGs 400-800KB. Transversal, sube la percepción de calidad en toda la app.
9. **Morado `#7F77DD` como color de ACCIÓN** (breathing 30, meditation 16, food-scan, journal) — es token oficial (`CATEGORY_COLORS.mind`) pero NO debe usarse como acción. Es el "#138 de verdad" (aquel solo tocó el hero).
10. **Dupes agenda 10:30** — son filas `manual_override` del user (doctrina: NO auto-borrar datos del user) → merge asistido de 1 tap, nunca automático.
11. **Cronotipo destino flaco** — leer `peak_focus_start/end` de `user_chronotype` (ya existen, la pantalla no los lee) para engordarla gratis.

## 🟢 P3
12. Colores hardcoded fuera de `brand.ts` (journal, cycle-*, tabs) → tokens.
13. `as any` residuales (~63, casi todos Ionicons/Supabase) → tipar donde valga.
14. mis-tap edit vs marcar-tomado en suplementos; mensaje ARGOS truncado viejo en historial.
15. Cobertura de tests: regresión para Edad ATP delta + HOY_BASELINE_CARDS (lo que se rompió).

## ⚠️ La única decisión de Enrique (ítem 1)
"Configura HOY": ¿la config manual del user **override** al motor (puede ocultar cards prescritas), o el motor es la única fuente y quitamos/repurposamos los toggles? Recomendación: **override** (doctrina guiado-no-prisionero). Si Enrique no responde, CC procede con override.

## Invariantes
str_replace quirúrgico · tsc verde vía CI · commit agrupado por archivo/tema · delivery doc · NO auto-borrar filas del user (ítem 10).
