# ATP — Sistema de Diseño (criterio UI/UX)

> Guía de diseño viva. Documenta el criterio, los tokens y las reglas aplicadas en el
> rediseño UI/UX de junio 2026. **Léela antes de tocar cualquier pantalla.** El objetivo
> del producto es que la UI/UX sea el argumento de venta: el listón es "wow", no "está bien".
>
> **Valores recomprobados contra el código el 28-ago-2026.** Todo hex y todo conteo de aquí
> lleva fecha; si vas a citar uno, mídelo antes de usarlo. La marca APLICADA y medida vive en
> `docs/MANUAL_DE_MARCA.md`, y **ahí es donde deben vivir los valores**: este documento es el
> criterio (por qué), no la tabla (cuánto).
>
> Fuente del diagnóstico original: `UIUX a corregir con design/INFORME_UIUX_ATP.md`.

---

## ⬆️ Por encima de este documento: el Manual de marca

**`ATP_Manual_de_Marca.pdf`** (carpeta ATP · versión 2 · julio 2026) es la autoridad de
marca: símbolo, variantes del logo, área de respeto, doctrina de color, voz verbal y lo
que la marca nunca hace. **No está en el repositorio**, así que aquí solo se cita.

**`docs/MANUAL_DE_MARCA.md`** es la marca APLICADA y medida contra el código, con archivo y
fecha por cada número. Este documento cubre el **criterio** de aplicación en producto.

**Si el manual y el código se contradicen, gana el manual y el código se corrige.**

### Dos cosas del logo NO coinciden con el producto (pendientes de decisión)

1. **Hay dos limas.** Los seis archivos SVG del logo usan **`#A7C834`**; la app usa
   **`#A8E02A`** (`ATP_BRAND.lime`). Uno de los dos tiene que ceder. Lo natural es
   actualizar el logo al lima del producto, pero **el manual original es de Patricia
   Aguilar y el cambio se decide con ella.**
2. **La firma del logo es de otra época.** `Logo-vertical_*.svg` trae vectorizado
   *"activa tu energía y salud"*, mientras el producto usa *"tu sistema operativo de
   rendimiento"*. **Mientras no se resuelva, usar el ícono sin firma.**

### Deuda medida contra estas reglas (28-ago-2026)

| Qué | Cuánto |
|---|---|
| Hex escritos a mano en `app/` + `src/components/` | **679** ocurrencias, más **594** de `rgb()`/`rgba()` |
| Archivos de `app/` con el kit viejo (`elite-*`) | **119**, contra **132** con el kit nuevo (`@/src/components/ui`) |
| Radios de card distintos en `brand.ts` | 2 (`CARD_STYLE` 12 · `CARD` 16) |
| Los dos rojos | **Ya tienen criterio:** `SEMANTIC.error` `#E8877F` es error de INTERFAZ · `SCORE_COLORS.critical` `#FF3B30` es dato CLÍNICO, y grita más a propósito |
| Modo claro | **Existe.** `THEME_LIGHT`, cuatro modos y tests de contraste |

⚠️ El **1,782** de julio 2026 no se pudo reproducir: no quedó escrito con qué se contó, así
que **679 no es "bajó de 1,782"**, es otra medición. Si se vuelve a contar, que quede el
comando al lado del número.

Fuera de paleta, los más repetidos: `#FBBF24` (53), `#EF4444` (32), `#FB923C` (15),
`#22C55E` (15), `#38BDF8` (14), `#C084FC` (13), `#FB7185` (12). **Estandarizar = cambiarlos
por tokens, por pantalla, no de golpe.** Los cinco de la familia Tailwind ya tienen destino:
`ESCALA_NIVEL` en `brand.ts` es la rampa que los reemplaza.

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

**Los cuatro escalones ya no son hexes escritos a mano.** Salen de `OSCURO`, la rampa única
de `brand.ts`, y `OSCURO` depende de la bandera `ACERO_OSCURO` (`src/constants/flags.ts`).
Hoy la bandera está **encendida**: manda la rampa de acero.

| Nivel | ACERO (vivo hoy) | NEGRO (`ACERO_OSCURO = false`) | Para qué |
|---|---|---|---|
| `ELEVATION[0]` | `#0F1114` · borde `transparent` | `#000000` · borde `transparent` | fondo de pantalla |
| `ELEVATION[1]` | `#1A1D22` · borde `#252931` | `#121212` · borde `#1F1F1F` | card estándar ← el default |
| `ELEVATION[2]` | `#292E36` · borde `#383F4A` | `#232323` · borde `#333333` | card sobre card / sheet / modal |
| `ELEVATION[3]` | `#343A45` · borde `#404854` | `#2F2F2F` · borde `#3D3D3D` | popover / menú flotante |

- **Cards = `ELEVATION[1]`.** Se despega del lienzo, sea acero o negro. **Escribe el nivel,
  nunca el hex:** el hex correcto depende de una bandera que se mueve por OTA.
- **Inputs = `BG.input`** (`OSCURO.campo`: `#0A0C0F` en acero, `#0a0a0a` en negro). Recedidos,
  leen como "pozo" frente a la card elevada.
- `BG.card`, `CARD.bg` y `SURFACES.card` apuntan todos a `OSCURO.card`. **`ui/Card.tsx` ya no:**
  lee `useSurfaceTokens()` y pinta el token del tema, que en claro es `#E9EEF1`.

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
stable 55+ (`ATP_BRAND.amber` #EFD54F, el único amarillo de marca) · low 40+ (#f97316) ·
critical (#FF3B30).

**`critical` es rojo pleno a propósito:** el dato clínico grita MÁS que un error de formulario
(`SEMANTIC.error` #E8877F, coral apagado). Son dos rojos con criterio, no un descuido.

### Estado como TINTA — un token por tema, no un hex de Tailwind

`AppThemeTokens` trae los cuatro estados calibrados por tema (`brand.ts`, `THEME_DARK` y
`THEME_LIGHT`). Se leen con `useSurfaceTokens()`. **Nunca se escriben a mano.**

| Token | Oscuro | Claro | Qué dice |
|---|---|---|---|
| `error` | `#E8877F` | `#B03A2E` | error de INTERFAZ (un campo mal llenado) |
| `exito` | `#A8E02A` | `#4F6B0D` | éxito / óptimo |
| `advertencia` | `#EF9F27` | `#8A5A00` | advertencia |
| `critico` | `#FF3B30` | `#991B1B` | estado CLÍNICO |

**`error` y `critico` son colores distintos a propósito**, y hay test que lo exige.

Para escalas de GRADO (índice UV, grado de deficiencia, nivel de riesgo) no se usan estos
cuatro: se usa `ESCALA_NIVEL` con `colorNivel(paso, kind)`, la rampa de cinco pasos por tema.
Los pasos 0, 1 y 3 del claro SON `exito`, `advertencia` y `critico`; los pasos 2 y 4 son los
intermedios que una escala de cinco necesita y un juego de tres estados no tiene.

⚠️ **Dos reglas que salen de la medición, no del gusto.**
1. En tema claro los tres primeros pasos se separan por TONO, no por luminancia (1.03 y 1.04
   entre vecinos). Una barra de esta rampa en claro SIEMPRE va acompañada de su cifra o su
   etiqueta. El color solo no comunica el grado (WCAG 1.4.1).
2. **La tinta sobre su propio tinte no es la tinta sobre la card.** Un texto de color encima
   de `color + '20'` pierde entre 0.6 y 1.2 puntos de contraste, y varios pares caen bajo AA.
   Al 6% (`+ '10'`) los cuatro tokens aguantan en los dos temas. Mide contra el papel TEÑIDO.

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

Recontado el 28-ago-2026, y el número real es otro: **119 archivos de `app/` importan algo del
kit viejo**, no once. Pero casi todo es un solo componente:

| Componente | Importadores en `app/` | Total en el repo |
|---|---|---|
| `EliteText` | 119 | 246 |
| `EliteToggle` | 5 | 6 |
| `EliteButton` | 3 | 7 |
| `EliteInput` | 3 | 3 |
| `ScreenContainer` | 0 | 1 (`src/components/tests/TestQuestionScreen.tsx`) |
| `EliteCard` | 0 | **0. Nadie lo importa** |

Las **8 pantallas** con kit viejo ESTRUCTURAL (algo que no sea `EliteText`) son: `login`,
`register`, `forgot-password`, `night-filter`, `salud/ficha-emergencia`,
`settings/experiencia`, `settings/salud` y `tutorial`. Ya migrados a spring scale.

**No construir pantallas nuevas con estos**; al tocar una pantalla legacy, preferir migrar al
kit nuevo si el cambio es acotado. La migración de verdad es `EliteText`, y son 119 archivos:
eso es un plan, no un cambio. **`EliteCard` está muerto y se puede borrar.**

### Movimiento (lo "fluido")
- Todo lo táctil responde con **spring scale + haptic**. Prohibido el `opacity: 0.7` plano.
- Listas entran **escalonadas**: `Animated.View entering={FadeInDown.delay(i*40).springify()}`
  (o `FadeInUp`). Nada aparece de golpe. **40 ms es la recomendación y también lo que más se
  usa:** 15 de los 40 escalones contados el 28-ago-2026, contra 7 en 30 ms y 6/6/4 en 50/60/80.
  Para listas ya envueltas está `StaggerItem`, cuyo `delay` por defecto es 50.
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
