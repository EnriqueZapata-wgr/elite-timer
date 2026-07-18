# 🎨 BRIEF 3 · Sistema de Diseño ATP — matar lime-brutalist de RAÍZ (2026-07-17)

**Para:** agente Code (CC)
**Doctrina raíz:** memoria `project_design_system_atp_no_lime_brutalist.md` (#23).
**Origen:** `R and D/TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md` · BATCH 3 (#7/#10/#11/#22/#23/#24/#25).
**Regla de oro (rúbrica Enrique):** _comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real._

---

## 1. Resumen ejecutivo

ATP ≠ ELITE Timer. Hoy la app se siente "borrador" por una causa raíz **una**: predomina el
**lime brutalist** (verde plano #A8E02A como fondo/acento en todo, cero jerarquía) heredado de
ELITE. El sistema de diseño ATP correcto es **degradados + imagen editorial + fondos**, con
**3 colores: lime + teal PRINCIPALES, amarillo SECUNDARIO**. La pantalla **"ATP Mis Datos"**
(`app/salud/mis-datos/index.tsx`) + el componente **`EditorialCard`** ya son el **molde** de lo
que sí se siente ATP.

**Insight de palanca:** casi toda la infraestructura de tokens correcta YA EXISTE en
`src/constants/brand.ts` (gradientes de molécula, `PILLAR_GRADIENTS`, `CONCEPT_COLORS`,
`ELEVATION`, `GLOW`, `ACCENT_ROLES`). El problema NO es que falten tokens: es que **(a)** el
amarillo no está formalizado como color de marca, **(b)** el lime plano sigue vivo en botones/pills
legacy, y **(c)** las pantallas de hub/ejecución no usan el molde editorial. Por eso el orden es:
**consolidar tokens → aplicar el molde reutilizable → barrer pantalla-por-pantalla al final.** No
al revés.

Prioridad: **F1 (tokens) + F2 (molde) desbloquean la sensación "se siente ATP" de un golpe.**
F3 (barrido de pantallas) es mecánico una vez existe el molde. F4 (LIGHT) es grande → Fase 2 del
batch, se puede diferir a post-soft-launch sin bloquear beta.

---

## 2. Estado real del código (lo que encontré — anclas)

### Dónde viven los tokens HOY
| Archivo | Rol |
|---|---|
| `src/constants/brand.ts` | **Fuente única de verdad.** `ATP_BRAND` (lime `#A8E02A`, teal `#1ABC9C`, `moleculeGradient` lime→teal), `SURFACES`, `TEXT_COLORS`, `CATEGORY_COLORS`, `SEMANTIC`, `BG`/`BORDER`/`TEXT` canónicos, `ELEVATION`, `GLOW`/`withGlow`, `ACCENT_ROLES`, `SCORE_COLORS`, **`PILLAR_GRADIENTS`** (tinte por pilar → oscuro), `PILL`, `CARD`, `SECTION_TITLE`, `withOpacity`. |
| `constants/theme.ts` | Aliases legacy: `Colors` (incluye `neonGreen: ATP_BRAND.lime`), `Fonts` (Poppins), `FontSizes`, `Spacing`, `Radius`. **Header dice "Sistema de diseño ELITE"** — legacy literal. |
| `src/constants/concept-colors.ts` | `CONCEPT_COLORS` — color+gradient por CONCEPTO cross-app (fitness/nutrición/suplementos/agua/ayuno/sol/mente/sueño/cardio). Ya es la fuente para gradients de cards. |
| `src/components/edad-atp/tokens.ts` | Tokens locales del módulo Edad ATP (revisar que no dupliquen brand.ts). |

### Lo que YA es correcto (no reinventar)
- `ATP_BRAND.moleculeGradient = ['#A8E02A','#6DCC48','#3DBF6E','#2EC28A','#1ABC9C']` → el degradado lime→teal de marca **ya existe**.
- `PILLAR_GRADIENTS` (fitness/nutrition/mind/health/cycle/sleep/…) → degradado tinte→oscuro por pilar, **ya existe**.
- `ELEVATION` (0-3), `GLOW`/`withGlow`, `ACCENT_ROLES` (primary/neutral/category) → doctrina de profundidad + restricción de acento **ya escrita** (solo NO enforced).
- `EditorialCard` (`src/components/hoy/EditorialCard.tsx`) → **el molde componente**: `imageBn` de fondo full-bleed + gradient overlay diagonal + velo inferior + estados (`pending`/`in_window`/`done`/`out_of_hour`) + check circle + electron pill + progress. Cae a placeholder de gradient sólido cuando `imageBn` es undefined.
- `PillarHeader` (`src/components/ui/PillarHeader.tsx`) → header `[←] ATP TÍTULO` con color de pilar. Ya lo usa Mis Datos.

### Lo que está MAL (el lime brutalist a matar)
- **No hay amarillo formal de marca.** El amarillo vive disperso y sin nombre: `SEMANTIC.acceptable = '#EFD54F'`, `SCORE_COLORS.stable = '#fbbf24'`, `CATEGORY_COLORS.optimization = '#EF9F27'` (amber). La doctrina pide amarillo como **3er color secundario nombrado**.
- **Lime plano legacy:** `BUTTON_STYLES.primary.background = ATP_BRAND.lime` (botón lima sólido = brutalist), `PILL.activeBg = '#a8e02a'`, `Colors.neonGreen`. El acento lima se usa como relleno, no como acento restringido (viola `ACCENT_ROLES`).
- **`imageBn` casi siempre undefined** → las cards del HOY caen a placeholder de gradient sólido (por eso #91 "imágenes no se ven"). Las imágenes editoriales existen en `assets/` pero no están cableadas a cada `HoyCardSpec.imageBn`.
- **Pantallas de hub/ejecución sin molde editorial** (#7/#22/#25): `app/mente.tsx`, `app/fitness-hub.tsx` (+ `fitness-*`), `app/nutrition.tsx`, `app/fasting.tsx`, `app/solar.tsx`, `app/checkin.tsx`, `app/health-hub.tsx`.
- **Light mode: cero infraestructura.** `useColorScheme` solo aparece en `app/_layout.tsx`; todo el color está hardcodeado a oscuro (`'#000'`, `'#121212'` literales + tokens sin capa semántica claro/oscuro). No hay `ThemeProvider`.
- `docs/DESIGN_SYSTEM.md` existe → hay que actualizarlo con la doctrina nueva (es lectura obligada antes de tocar pantallas, per CLAUDE.md).

---

## 3. Arquitectura propuesta

### Principio
UNA capa de tokens en `brand.ts` que exprese la doctrina de 3 colores + degradados + editorial;
UN molde componente (`EditorialCard` + un wrapper de pantalla editorial); y un barrido que reemplaza
usos planos de lime por el rol correcto (`ACCENT_ROLES`) + gradientes por pilar.

### 3.1 Consolidar los tokens ATP (una sola vez, en `brand.ts`)
1. **Formalizar el amarillo secundario** dentro de `ATP_BRAND`:
   ```ts
   // amarillo secundario ATP — acento terciario, NUNCA principal (lime+teal mandan)
   amber: '#EFD54F',   // reconciliar contra SEMANTIC.acceptable / SCORE_COLORS.stable
   ```
   Y apuntar los usos dispersos (`SEMANTIC.acceptable`, `SCORE_COLORS.stable`) a este token para que haya **un** amarillo.
2. **Doctrina de degradados como default de superficie de marca.** Documentar en el header de `brand.ts` + `docs/DESIGN_SYSTEM.md`: fondos/cards heroicas = `moleculeGradient` o `PILLAR_GRADIENTS[pilar]`; el color plano solo para micro-acentos. Exponer un helper `brandGradient(pillar?)` que devuelva el degradado correcto (molécula si no hay pilar).
3. **Degradar el lime plano brutalist:**
   - `BUTTON_STYLES.primary` → o gradiente (`moleculeGradient`) o lima con la disciplina de `ACCENT_ROLES.primary` (máx 1 CTA heroico/pantalla). Definir la decisión y aplicarla al `PrimaryButton` compartido, no pantalla por pantalla.
   - `PILL.activeBg` lima plano → mantener pero documentar que es micro-acento (OK), no fondo de sección.
   - Marcar `Colors.neonGreen` como deprecated-alias (no romper imports; solo dejar de usarlo en código nuevo).
4. **Enforcement de `ACCENT_ROLES`:** heurística documentada (>3 elementos lima en una pantalla = sobra acento). CC la usa como checklist del barrido F3.
5. **Corregir el header de `constants/theme.ts`** ("ELITE" → "ATP") y cualquier copy interno que diga ELITE.

> Invariante: **str_replace quirúrgico**. NO reescribir `brand.ts` completo. Cada token nuevo se
> agrega; los existentes se re-apuntan con edits mínimos. `brand.ts` sigue siendo fuente única —
> ningún hex nuevo hardcodeado fuera de aquí / `concept-colors.ts`.

### 3.2 El molde reutilizable (aplicar, no inventar)
El molde ATP = **`Screen` + `PillarHeader` + subtítulo editorial + cards `EditorialCard` (o card
limpia con degradado de pilar)**, tal como `app/salud/mis-datos/index.tsx`. Para pantallas de hub
que hoy son botones planos, el patrón es:
- Header `PillarHeader pillar={...}`.
- Hero: una `EditorialCard size="pillar"` con `imageBn` + `PILLAR_GRADIENTS[pilar]`.
- Lista: cards editoriales por sub-destino (cada una se gana su lugar → si una card no lleva a un
  dato o acción real, se poda; doctrina menú-vs-datos, memoria `project_doctrina_menu_navegacion_vs_consulta_datos.md`).

Si hace falta, extraer un wrapper ligero `EditorialScreen` (header + subtítulo + fondo degradado)
para no repetir el andamiaje en cada pantalla — pero **solo si aparece 3+ veces** (no gold-plating).

### 3.3 Cablear imágenes editoriales (`imageBn`) — arregla #91
- Las cards (`src/constants/hoy-cards.ts` `HoyCardSpec.imageBn`) y las pantallas de hub deben
  recibir su imagen B/N desde `assets/`. Auditar qué assets existen vs cuáles faltan; para las que
  existen, cablear `imageBn: require('@/assets/...')`; para las que faltan, dejar el placeholder
  de gradient (ya soportado) y **listar explícitamente cuáles generar** (prompts MJ) al final del
  sprint. Verificar por qué el swap previo "no aplicó" (#91): probable path/require mal o el spec
  no se está pasando a `EditorialCard`.

---

## 4. Fases

### Fase 1 — TOKENS (raíz, alto impacto, bajo riesgo) · § 3.1
Formaliza amarillo, doctrina de degradados, degrada lime plano, actualiza `docs/DESIGN_SYSTEM.md` +
header de `theme.ts`. **Sin tocar pantallas todavía.** Entregable: `brand.ts` consolidado + doc.

### Fase 2 — MOLDE + cards del HOY (#10, #91) · § 3.2 / 3.3
- **#10 Mis Datos:** solo falta la imagen editorial en el hero (ya está bien estructuralmente) → cablear `imageBn`.
- Cablear `imageBn` de las `HoyCardSpec` que tengan asset; verificar el render en `EditorialCard`.
- Si se extrae `EditorialScreen`, hacerlo aquí.

### Fase 3 — BARRIDO de pantallas sin editorial (#7/#22/#25)
Aplicar el molde a: **Mente** (`app/mente.tsx`), **Fitness** (`app/fitness-hub.tsx` + subs),
**Nutrición** (`app/nutrition.tsx`), **Ayuno** (`app/fasting.tsx`), **ATP Sol** (`app/solar.tsx`),
**Check-in** (`app/checkin.tsx`), y **Salud** (`app/health-hub.tsx`). Una pantalla a la vez, con
checklist `ACCENT_ROLES` (matar lime plano, meter degradado de pilar + imagen editorial + card
limpia). Nota memoria `feedback_no_perder_flujo_pantalla_a_pantalla.md`: el flujo macro es
pantalla-por-pantalla; se pueden hacer en paralelo pero volviendo al flujo.

**#11 Mis Evaluaciones:** reemplazar las cards de emojis por editorial. **Localizar la pantalla
primero** (`grep -rn "Evaluaciones" app/` — probablemente bajo `app/(tabs)/yo.tsx` /
`YoEditorialSection` o el árbol de tests Braverman+quizzes). Reciclar imágenes existentes donde se
pueda; marcar cuáles generar.

### Fase 4 — LIGHT MODE (#24) · GRANDE → diferible a post-soft-launch
No hay infraestructura de tema. Diseño propuesto (NO implementar en beta si aprieta el tiempo):
- Introducir una **capa semántica** sobre `brand.ts`: en vez de `bg: '#000'`, tokens de rol
  (`surface.screen`, `surface.card`, `text.primary`, `border.card`, …) resueltos por esquema.
- `ThemeProvider` + hook `useTheme()` que lee `useColorScheme()` (ya en `_layout.tsx`) y expone
  el set claro u oscuro. Los componentes consumen `useTheme()` en vez de literales.
- Migración incremental: primero los componentes compartidos (`EditorialCard`, `Screen`,
  `PillarHeader`, botones, pills), luego pantallas. Los literales `'#000'`/`'#121212'` sembrados en
  ~89 pantallas son el trabajo pesado → por eso es Fase 2 del batch.
- **Recomendación:** marcar LIGHT como post-blocker (el triage lo permite). El beta lanza en dark.

---

## 5. Archivos clave a tocar

| Archivo | Qué |
|---|---|
| `src/constants/brand.ts` | F1: token `amber`, helper `brandGradient`, degradar `BUTTON_STYLES.primary`, doctrina en header. **str_replace quirúrgico.** |
| `constants/theme.ts` | F1: header "ELITE"→"ATP", `neonGreen` deprecado. |
| `docs/DESIGN_SYSTEM.md` | F1: doctrina 3 colores + degradados + editorial + `ACCENT_ROLES` + molde. |
| `src/components/hoy/EditorialCard.tsx` | F2: verificar render `imageBn`; posible extracción `EditorialScreen`. |
| `src/constants/hoy-cards.ts` | F2/#91: cablear `imageBn` por card. |
| `app/salud/mis-datos/index.tsx` | F2/#10: imagen editorial en hero (referencia del molde — no romper). |
| `app/mente.tsx`, `app/fitness-hub.tsx` (+`fitness-*`), `app/nutrition.tsx`, `app/fasting.tsx`, `app/solar.tsx`, `app/checkin.tsx`, `app/health-hub.tsx` | F3: aplicar molde. |
| Pantalla "Mis Evaluaciones" (localizar) | F3/#11: emojis → editorial. |
| (Fase 4) nuevo `src/contexts/theme-context.tsx` + capa semántica en `brand.ts` | LIGHT. |

---

## 6. Test guards

- Existe `src/constants/__tests__/concept-colors.test.ts` → si se toca `concept-colors.ts`, mantener verde.
- Agregar (vitest, patrón `*-core`) un test de invariantes de tokens: `ATP_BRAND.amber` definido; el amarillo es único (los alias apuntan al mismo hex); `moleculeGradient` empieza en lime y termina en teal; `PILLAR_GRADIENTS` cubre los 7 pilares.
- Si se extrae `brandGradient()`, testear que devuelve molécula sin pilar y el gradient correcto por pilar.
- No hay tests de render de pantallas → el guard real de F3 es **prueba como usuario en device** (rúbrica): cada pantalla debe verse editorial, sin lime plano, con imagen o degradado, y cada card debe llevar a un destino REAL (link válido al lugar correcto; un link al lugar equivocado = roto).

---

## 7. Invariantes (no negociables)

1. **str_replace quirúrgico** — nunca reescribir `brand.ts`, `theme.ts` ni pantallas completas.
2. **Fuente única de color:** todo hex vive en `brand.ts` / `concept-colors.ts`. Cero hex nuevo hardcodeado en pantallas.
3. `npx tsc --noEmit` = 0 errores antes de push (regla #8 CLAUDE.md).
4. Delivery: **OTA** (`eas update --branch preview`) — es JS/TS puro, sin nativo (memoria `feedback_ota_default_no_build.md`).
5. 3 colores: **lime + teal principales, amarillo secundario.** Nada de 4º color de marca.
6. Cada card se gana su lugar (doctrina menú-vs-datos): si no lleva a dato/acción real, se poda.
7. Copy user-facing: español MX, sin nombres propios de personas (memorias de copy).

---

## 8. Doctrina (por qué esto arregla la sensación "borrador")

Cambiar el design system de RAÍZ (tokens + molde) arregla la sensación borrador en TODA la app de un
golpe, porque el 80% del problema es **el mismo lime plano repetido** y **la ausencia del molde
editorial**. No es un problema de 89 pantallas distintas; es un problema de 1 sistema mal aplicado.
Por eso F1+F2 pesan más que F3, y F3 se vuelve mecánico. LIGHT (F4) es real pero es otra bestia
(capa semántica nueva) → no bloquea beta.

Molde de verdad = **"ATP Mis Datos"** + `EditorialCard`. Todo lo que no se sienta como esa pantalla,
está mal.
