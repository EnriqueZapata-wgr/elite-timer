# 🎨 Sprint 2 VISUAL · Delivery — "Que se vea"

**Fecha:** 2026-07-15
**Branch:** `fix/sprint-2-visual` (desde main post-merge 1.5, `189f746`)
**Commits:** `4d1e9ee` (A swap) · `b9c1bc1` (A resto) · `2ae616d` (E) · `1992575` (C) · `c445b3b` + `07d74d5` (B/D)
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores en archivos tocados · **1648 tests verdes** (+11 guard de colores)
**Estado:** Sprint 2 done · **pending device test** (yo no corro la app — DS §4: Enrique publica OTA desde la rama tras merge y manda pantallazos)

---

## BLOQUE A · Swap imageBn — los 6 assets cableados ✅

**Causa raíz del "swap que nunca llegó":** el commit `7dda619` existía completo en la
rama `fix/swap-imagebn-assets` (pusheada) pero **nunca se mergeó a main**. Lo
cherry-pickeé como base y completé los 2 que ese commit dejó fuera.

| Asset | Destino | Cómo |
|---|---|---|
| `pillars/comunidad.png` | Card COMUNIDAD (Mi ATP) | cherry-pick `7dda619` |
| `health-hub/diagnostico.png` | Card A "Mi Diagnóstico" | cherry-pick |
| `health-hub/mi-protocolo.png` | Card B "Mi Protocolo" | cherry-pick |
| `health-hub/fitzpatrick.png` | ATP SOL — CTA cuestionario como banner editorial B/N con overlay 0.55 | nuevo (`b9c1bc1`) |
| `health-hub/mente-avanzado.png` | Pilar MENTE en Hábitos | nuevo (`b9c1bc1`) |
| `pillars/comunidad-tribu.png` | — reservado para Feed futuro (sin card aún) | sin cablear a propósito |

Bonus del cherry-pick: historia_clinica / sintomas / padecimientos / labs_guide
dejan de reutilizar B/N vecinos y usan sus assets dedicados (ya existían en disco).

## BLOQUE B · "Widgets fuera de cards" — diagnóstico + el fix real ✅

Barrido exhaustivo (subagente): los "7 sistemas funcionales" **solo** se renderizan
en `health-hub.tsx` y ahí el patrón card contenedora (#67, commit `a14c956`) está
**intacto en el código** — la regresión que viste en device era **bundle stale**:
el fix viaja en el OTA del hotfix 1.5 de anoche, re-verifica en el retest.

Lo que SÍ estaba genuinamente suelto en el flujo y quedó arreglado:
- **Mi DX → "HISTORIAL DE VERSIONES"**: filas sin fondo ni borde flotando sobre
  negro → card contenedora `ELEVATION[1]` (mismo patrón #67).

Si tras el nuevo OTA sigues viendo listitas sueltas en Historia Clínica, mándame
pantallazo con la ruta exacta — el barrido no encontró otro renderer.

## BLOQUE C · Imágenes duplicadas ✅ (más chico de lo reportado)

Barrido completo de `require()` en HOY / Mi ATP / Health-hub / Hábitos:
- **Cero duplicados adyacentes intra-pantalla** (el peor caso no existe).
- **2 duplicados cross-screen reales**: Hábitos HIDRATACIÓN compartía
  `hoy-extra/agua.png` con HOY AGUA, y Hábitos ATP SOL compartía
  `electrons/luz-solar.png` con HOY LUZ SOLAR → recableados a variantes del pool
  editorial de agenda (`agenda/hidratacion/hidratacion-02.png`, `agenda/sol-am/sol-am-02.png`).
- El resto de "repetidos" son requires en código de rotación no renderizado
  (`image-rotation.ts` solo se invoca para ciclo) — sin efecto visual.

### 🖼️ Assets que faltan (para MJ, no bloquean)
| Card | Prompt sugerido |
|---|---|
| `habits-portal/hidratacion.png` | B/N editorial, vaso de agua con luz dura lateral, condensación, fondo negro, estilo documental ATP |
| `habits-portal/atp-sol.png` | B/N editorial, persona de espaldas recibiendo sol matutino, alto contraste, grano fino |
| Cards MENTE del HOY (checkin/meditación/breathwork/journal usan electron legacy) | Serie B/N: manos escribiendo journal / silueta meditando / vapor de respiración — misma serie editorial |
| Pilar ATP SOL editorial (HOY usa `electrons/luz-solar.png` icon viejo) | Sol amanecer B/N horizonte, formato 16:9 |

## BLOQUE D · Pilar MENTE ✅

1. **Imagen editorial**: `mente-avanzado.png` cableada (Bloque A).
2. **Botones**: `MenteHubCard` tenía CTA lima full-width por card → 3 bloques lima
   en una pantalla (viola disciplina de acento DS §1 y se veía "gordo"). Ahora:
   **pill translúcida `alignSelf: flex-start`** — patrón exacto del CTA de
   EditorialCard que usan Nutrición/Fitness. El lima queda solo en badge de
   streak y datos vivos.
3. **Copy "En comunidad · verifica pronto"**: no era wiring roto — es el
   placeholder de la regla HONESTA de `CommunityPresence` cuando hay <10 activos
   reales. Fix: bajo el umbral el badge **no se renderiza** (en HOY/Nutrición/
   Fitness/Mente por igual). Reaparece solo con "N personas activas hoy" real.
   La regla honesta (jamás inventar números) queda intacta.

## BLOQUE E · concept-colors.ts ✅

`src/constants/concept-colors.ts` = fuente única. Canónicos alineados a los
colores de categoría del design system (brand.ts §1 — "no inventar colores"):

| Concepto | Antes | Canónico |
|---|---|---|
| SUPLEMENTOS | morado HOY / naranja Hábitos / lima electrón | **#EF9F27** (naranja optimization) |
| FITNESS/FUERZA | rojo HOY / lima Hábitos+electrón | **#A8E02A** (lima fitness) |
| NUTRICIÓN/PROTEÍNA | naranja-rojo HOY / azul Hábitos / azul claro electrón | **#5B9BD5** (azul nutrition) |

Refactorizados: `hoy-cards.ts` (7 cards), `habits-portal.tsx` (9 cards),
`electrons.ts` (5 electrones). Los ya-coherentes (agua/ayuno/sol/mente/sueño/
cardio) migrados también para que TODO lea de la fuente. `health-hub.tsx` no
comparte conceptos con los offenders — sin cambios inventados (DS §4.6).
**Guard:** `concept-colors.test.ts` (11 tests) truena si un consumer vuelve a
hardcodear un hex de concepto canónico.

---

## 🧪 Checklist device test (Enrique)

1. Merge a main → `eas update --branch preview` (⚠️ desde main, no desde la rama — DS §4.4).
2. **Mi ATP**: card COMUNIDAD con imagen (no gradient). HISTORIA CLÍNICA y HÁBITOS ya la tenían.
3. **Historia Clínica (health-hub)**: Card A Diagnóstico + Card B Mi Protocolo con imagen; cards SÍNTOMAS/PADECIMIENTOS/HISTORIA CLÍNICA/GUÍA LABS ya no repiten imagen de vecinas; sistemas funcionales DENTRO de card (si no → pantallazo con ruta).
4. **ATP SOL**: abre "Actualizar tipo de piel" → CTA del cuestionario con foto B/N.
5. **Hábitos**: pilar MENTE con imagen editorial nueva; HIDRATACIÓN y ATP SOL con imagen distinta a las del HOY.
6. **Mente**: botones pill discretos (no bloques lima); sin "En comunidad · verifica pronto".
7. **Mi DX**: historial de versiones dentro de card.
8. **Colores**: SUPLEMENTOS naranja en HOY y Hábitos e ícono electrón; FUERZA lima en HOY; PROTEÍNA azul en HOY.

## Bugs bonus encontrados
- Unescaped quotes en `solar.tsx` (eslint error preexistente) — arreglado de paso.
- `health-hub/protocolos.png` quedó huérfano (la card PROTOCOLOS murió en 1.5-B) — disponible si se necesita.

— Fable 🤖 · Sprint 2 done · pending device test
