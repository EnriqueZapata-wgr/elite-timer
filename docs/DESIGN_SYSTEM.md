# ATP — Sistema de Diseño (criterio UI/UX)

> Guía de diseño viva. Documenta el criterio, los tokens y las reglas aplicadas en el
> rediseño UI/UX de junio 2026. **Léela antes de tocar cualquier pantalla.** El objetivo
> del producto es que la UI/UX sea el argumento de venta: el listón es "wow", no "está bien".
>
> Fuente del diagnóstico original: `UIUX a corregir con design/INFORME_UIUX_ATP.md`.

---

## 0. Filosofía (por qué se siente "vivo" o "muerto")

El "wow" es una propiedad **del sistema completo**, no de cada pantalla. Cuatro ejes lo gobiernan;
si uno falla, toda la app se siente genérica:

1. **Cohesión** — un solo lenguaje visual. Una sola treatment de card en TODA la app.
2. **Jerarquía** — cada pantalla tiene UN protagonista y aire alrededor. Nada compite.
3. **Profundidad** — superficies en capas + glow selectivo. Sin esto, todo se ve plano/muerto.
4. **Restricción** — el acento (lima) reservado a lo importante. Si todo es lima, nada destaca.

Regla mental al diseñar cualquier pantalla: **¿hay un protagonista claro? ¿respira? ¿el lima
está solo donde debe? ¿las cards se despegan del fondo?** Si no, falta trabajo.

---

## 1. Tokens (única fuente de verdad: `src/constants/brand.ts`)

**NUNCA hardcodear un color.** Importar de `brand.ts`. Código nuevo usa los tokens canónicos
`BG` / `BORDER` / `TEXT`, no los aliases viejos (`SURFACES`/`TEXT_COLORS`/`Colors.*`, marcados
para deprecación).

### Doctrina de 3 colores (Batch 3 · #23 — ATP ≠ ELITE)
- **Lime (`ATP_BRAND.lime`) + teal (`ATP_BRAND.teal`) son los PRINCIPALES; amber
  (`ATP_BRAND.amber = #EFD54F`) es el SECUNDARIO.** No existe 4º color de marca.
- **Un solo amarillo:** `SEMANTIC.acceptable` y `SCORE_COLORS.stable` son alias de
  `ATP_BRAND.amber`. Cualquier otro amarillo/ámbar en pantallas es deuda.
- **Superficies heroicas = DEGRADADOS, nunca lime plano.** Usar `brandGradient()`
  (molécula lime→teal sin pilar; `[start, end]` del pilar con él) o
  `PILLAR_GRADIENTS`. El lime sólido queda para micro-acentos (pills, checks, CTA
  compacto) bajo la disciplina de `ACCENT_ROLES`.
- **El molde ATP es "Mis Datos" + `EditorialCard`:** imagen editorial de fondo +
  gradient overlay + jerarquía. Todo lo que no se sienta como esa pantalla, está mal
  (lime-brutalist heredado de ELITE = borrador).

### Elevación — da profundidad (no usar bg/borde sueltos)
```ts
ELEVATION[0] = { bg: '#000000', border: 'transparent' }  // fondo de pantalla
ELEVATION[1] = { bg: '#121212', border: '#1F1F1F' }       // card estándar ← el default
ELEVATION[2] = { bg: '#1A1A1A', border: '#2A2A2A' }       // card sobre card / sheet / modal
ELEVATION[3] = { bg: '#222222', border: '#323232' }       // popover / menú flotante
```
- **Cards = `ELEVATION[1]` (#121212).** Se despega del negro puro. (Antes había dos colores
  conviviendo: #0a0a0a invisible y #1a1a1a — unificados aquí.)
- **Inputs = #0a0a0a** (recedidos, leen como "pozo" frente a la card elevada).
- `BG.card`, `CARD.bg`, `SURFACES.card` y `ui/Card.tsx` ya apuntan todos a este valor.

### Glow — el bloom del elemento heroico
```ts
GLOW.accent           // halo lima para el dato/CTA protagonista
withGlow(color)       // halo por categoría
```
- **Máximo 1 uso por pantalla.** Es lo que hace que el protagonista "brille".
- **En anillos SVG (`AnimatedScoreRing`) el glow se hace con arcos translúcidos concéntricos,
  NO con `shadow` de RN** — el shadow no rinde como halo en Android. La prop `glow` (default on)
  dibuja 2 arcos más anchos a baja opacidad.

### Acento — disciplina de lima (`ACCENT_ROLES`)
Nivel acordado con el cliente: **MODERADO.**
- **Lima (`#A8E02A`) solo en:** (a) acción primaria/CTA, (b) dato heroico, (c) estados
  semánticos "hecho" (checkmarks de completado — eso es feedback, no decoración).
- **Todo lo demás → neutro** (`rgba(255,255,255,0.6)` / grises de `TEXT`) **o color de
  categoría desaturado.**
- **Heurística:** si en una captura cuentas **más de ~2-3 elementos lima** que NO sean
  CTA/héroe/estado, sobra acento. Pásalos a gris.
- **NO tocar** el lima cuando es **color de categoría** (Fitness=lima en NavCards) ni el de
  estados semánticos — eso es el sistema funcionando, no exceso.

### Color por categoría / pilar (no inventar colores)
```
fitness #A8E02A · nutrition #5B9BD5 · mind #7F77DD
optimization/protocol #EF9F27 · metrics/health #1D9E75 · cycle #D4537E
```
Para tintes de fondo usar `PILLAR_GRADIENTS` (start tintado → #0a0a0a). Iconos/acentos de
categoría siempre **desaturados**, nunca a tope.

### Score → color semántico (no elegir a mano)
`getScoreColor(score)` y `getScoreLabel(score)`: optimal 85+ (#4ade80) · charged 70+ (lima) ·
stable 55+ (#fbbf24) · low 40+ (#f97316) · critical (#ef4444).

### Tipografía y espaciado
- Familia única: **Poppins** (`Fonts.regular/semiBold/bold/extraBold`). El contraste de PESO
  (heroico vs label vs body) es la herramienta de jerarquía, no meter más familias.
- Espaciado: `Spacing` (4/8/16/24/32/48). Entre secciones usar `Spacing.xl` (32) para que
  respire; título→contenido 12. Section titles: `SECTION_TITLE` (11px, letterSpacing 2, upper).

---

## 2. Componentes

**Hay dos kits conviviendo. Usar SIEMPRE el nuevo.**

### Kit nuevo (preferido) → `src/components/ui/`
Cohesivo, tokens canónicos, spring + haptics. Lo que debes usar y componer:
- `Screen` — wrapper de pantalla (fondo `BG.screen`, safe-area edges configurables).
- `Card` — variantes `elevated` / `glass` / `accent` (todas en `ELEVATION[1]`).
- `GradientCard` — card premium con gradiente por color/categoría + spring al presionar.
- `AnimatedPressable` — **el primitivo táctil estándar**: spring scale (0.97). Es el
  "PressableScale". Llama `haptic.*` aparte donde aplique.
- `AnimatedScoreRing` — anillo de score SVG con número animado + glow (ver §1).
- `PillarHeader` / `ScreenHeader`, `SectionTitle`, `FilterPills`, `StaggerItem`,
  `ExpandableSheet`, `EmptyState`, etc.

### Kit viejo (legacy) → `components/elite-*`
`EliteButton`, `EliteCard`, `EliteText`, `ScreenContainer`… Aún usados en ~11 pantallas
(login, register, ejecución de rutinas). Ya migrados a spring scale y a `ELEVATION[1]`.
**No construir pantallas nuevas con estos**; al tocar una pantalla legacy, preferir migrar
al kit nuevo si el cambio es acotado.

### Movimiento (lo "fluido")
- Todo lo táctil responde con **spring scale + haptic**. Prohibido el `opacity: 0.7` plano.
- Listas entran **escalonadas**: `Animated.View entering={FadeInDown.delay(i*40).springify()}`
  (o `FadeInUp`). Nada aparece de golpe.
- Usar `LayoutAnimation.configureNext(...easeInEaseOut)` al expandir/colapsar.

---

## 3. Patrones de pantalla aprendidos

- **Listas largas → colapsar por contexto.** Ej: suplementos del Home agrupados por momento
  del día (`SUPP_TIMINGS`: morning/with_food/afternoon/evening/bedtime, mismo modelo que
  `app/supplements.tsx` campo `timing`). Default inteligente: **grupo completo arranca
  colapsado, grupo con pendientes arranca abierto.** Header con contador `hechos/total`.
- **Héroe sobre foto** (Home): `ImageBackground` + `BlurView` + `LinearGradient` con overlay
  **fuerte arriba** (≥0.45) para que el texto se lea. Un overlay débil deja el saludo turbio.
- **Markdown en ARGOS** (`react-native-markdown-display`): sus defaults de `fence`/`code_block`/
  `blockquote` son **claros (#f5f5f5) → ilegibles en dark**. Hay que tematizarlos oscuros en el
  prop `style` del `<Markdown>`. Diagramas con flechas → mantener como code block (monoespaciado)
  pero oscuro.
- **Estados disabled/"próximamente":** no apilar `opacity` baja + texto muted (se vuelve
  invisible). Usar opacidad moderada (~0.7) + un badge explícito ("PRONTO").
- **Controles de admin/dev:** siempre detrás de gate (`isAdmin(user?.id)` / `__DEV__`), nunca
  visibles en producción.

---

## 4. Flujo de trabajo (no negociable)

1. **Rama dedicada** para trabajo de UI (`feat/ui-*`), nunca directo en `main`.
2. **Verificar siempre:** `npx tsc --noEmit` (debe dar 0) + `npx eslint <archivos>` (0 errores;
   ignorar warnings preexistentes). Solo después, commit.
3. **Commits atómicos por concern**, en español, con co-author. Facilita rollback selectivo.
4. **Cambios estéticos = verificación visual.** Yo (Claude) no corro la app: el dueño hace
   `eas update --branch preview` **desde la rama (o tras fusionar a main)** y manda pantallazos.
   ⚠️ **`eas update` publica desde donde estás parado.** Trabajo en rama sin fusionar = el
   update NO lo lleva. (Esto causó que un fix "no funcionara" hasta fusionar a main.)
5. **Fusión a `main`** por fast-forward solo tras visto bueno visual.
6. Calibrar primero en UNA pantalla antes de propagar a las demás (no rehacer 5 en la
   dirección equivocada). El exceso de lima estaba SOLO en Home y YO; las de categoría ya
   estaban bien — no inventar cambios sobre lo que ya funciona.

---

## 5. Estado a junio 2026 (qué ya se hizo)

Rediseño base completo en `main` (commits `d1312be`…`42ebe2c`):
- **Tokens**: `ELEVATION`, `GLOW`/`withGlow`, `ACCENT_ROLES` añadidos a `brand.ts`.
- **Profundidad**: cards unificadas a `ELEVATION[1]` (#121212) en kit viejo + nuevo.
- **Motion**: `EliteButton`/`EliteCard` migrados de `opacity:0.7` a spring scale.
- **Contraste**: ARGOS markdown oscuro (blockquote+code+fence); item "Cetonas/PRONTO" legible.
- **Glow**: `AnimatedScoreRing` con bloom cross-platform (Home, YO, Mi Salud).
- **Home**: suplementos colapsables por momento del día; overlay del héroe reforzado;
  acento moderado (brand label + protocol pill neutralizados); más aire entre secciones.
- **YO**: ícono del connect banner neutralizado.

### Deferido / próximos pasos
- Reflow estructural más profundo del Home si se desea (más allá del espaciado).
- Limpiar cards con `#0a0a0a` **hardcodeado inline** (p. ej. burbujas de ARGOS) → migrar a token.
- Entradas escalonadas donde aún falten.
- Mismo tratamiento para las **otras 2 apps** del proyecto (web Next.js + otra Expo).
