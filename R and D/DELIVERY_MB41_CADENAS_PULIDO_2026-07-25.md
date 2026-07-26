# ✅ DELIVERY · MB-4.1 — Cadenas de descenso (P0) + pulido Fitness + perf del mapa

**Rama:** `feat/mb41-cadenas-pulido` (desde `feat/mb4-checkin-v2`). **NO mergeada. Versión intacta. Cowork audita.**
**Verificación:** `npx tsc --noEmit` → **0 errores** · `vitest run` → **2199/2199 verdes** (212 archivos) · `eslint` de los tocados → **0 errores** (5 warnings pre-existentes en `log-exercise.tsx`, ajenos a mis líneas). **Sin migración** en este brief → nada que `db push`.

---

## 🔴 BLOQUE A · P0 — las cadenas ya NO navegan a la zona depresiva

### Antes (medido) → Ahora
Antes: de las 36 emociones de alta·desagradable, **11 cadenas terminaban en "Sin interés" (anhedonia)** y varias cruzaban de familia (enojo → miedo). **Ahora, barriendo las 144: 0 cadenas tocan la lista de exclusión y 0 cambian de familia** (dos tests lo blindan). Los destinos finales de descenso de las 36 alta·desagradable son todos de la misma familia y fuera de la zona depresiva:

`Con irritación ×6 · Con nervios ×9 · En conflicto ×3 · Culpable ×3 · Con fastidio ×2 · Con inquietud ×2 · Con resentimiento ×2 · Con inseguridad ×2 · A la defensiva ×1 · Con preocupación ×1 · Con tensión ×1 · Con envidia ×1 · Con amargura ×1 · Con presión ×1 · Sin salida ×1`

### Cómo quedó implementado
- **A.1 · `family` en las 144** — nuevo campo en `Emotion`, tageado en `FAMILY_MEMBERS` (agrupado por familia, un vistazo para revisar). **No cambia energy/intensity ni posición en el mapa.**
- **A.2 · el descenso NO cambia de familia** — `buildDescentChain` filtra además por `family === origin.family`. Si no hay candidato de la familia, **la cadena se detiene** (2 pasos honestos > 4 que mienten).
- **A.3 · lista de exclusión** — `NO_DESCENT_TARGET_IDS` marca las adyacentes a depresión/anhedonia. **Siguen en el mapa** (se pueden nombrar), pero nunca son destino de descenso.
- **A.4 · cadena corta = válida** — si tras los filtros no hay descenso real, se ofrece **directo el volteo** (no forzamos el paso "bajar", cuyo copy promete "versiones más manejables" que no existirían). 14 de las 36 alta·desagradable caen aquí: ya son la versión más suave de su familia.
- **A.5 · volteo por familia de destino curada** — antes el puente era mera cercanía numérica (salía `frustración → asombro`). Ahora cada familia desagradable apunta a una agradable coherente y el puente se elige DENTRO de esa familia.
- **A.6 · 6 tests nuevos** que blindan: exclusión, no-cambio-de-familia, volteo agradable + una sola familia, caso guía enojo≠miedo, y "sin descenso → volteo directo".

### Mapa de volteo (familia origen → familia destino)
| Origen | Destino | Racional |
|---|---|---|
| ira · agobio | **foco** | canaliza el fuego en determinación/claridad |
| miedo | **calma** | seguridad y presencia frente a la amenaza |
| tristeza · vergüenza · rechazo | **afecto** | calidez y conexión, no juicio |
| desconexión | **calma** | volver a la presencia frente al piloto automático |

### 🔎 Las 13 cadenas para tu revisión semántica
```
[Con furia]     bajar: furia → enojo → exasperación → a la defensiva
                voltear: a la defensiva → con seguridad → con enfoque
[Con enojo]     bajar: enojo → exasperación → a la defensiva → irritación
                voltear: irritación → con enfoque
[Con frustración] bajar: frustración → a la defensiva → irritación
                voltear: irritación → con enfoque
[Con ansiedad]  bajar: ansiedad → nervios
                voltear: nervios → en calma → en equilibrio
[Con estrés]    bajar: estrés → en conflicto
                voltear: en conflicto → con enfoque
[Con agobio]    bajar: agobio → estrés → en conflicto
                voltear: en conflicto → con enfoque
[Triste]        voltear: triste → perdonando → gentil          ← "Triste → Perdonando" que pediste conservar ✅
[En soledad]    voltear: soledad → con nostalgia → gentil
[Con cansancio] voltear: cansancio → apacible → paciente
[Con irritación] voltear: irritación → con enfoque
[Con preocupación] voltear: preocupación → en calma → en equilibrio
[Con miedo]     bajar: miedo → nervios
                voltear: nervios → en calma → en equilibrio
[Con vergüenza] bajar: vergüenza → culpable
                voltear: culpable → con amor → con conexión
```

### 🧮 Tabla completa del tagging (para que la revises — igual que la matriz de Fitness)
**Lado desagradable**
- **ira** (12): Con furia, Con enojo, Con frustración, Con exasperación, Con irritación, Con fastidio, Impaciente, A la defensiva, Hostil, Con asco, Con resentimiento, Con amargura
- **miedo** (12): Con ansiedad, En pánico, Con miedo, Con terror, Con nervios, Con preocupación, Con agitación, Con inquietud, En shock, Fuera de control, Con desesperación, Con exceso de energía
- **agobio** (6): Con agobio, Con estrés, Con tensión, Con presión, Sin salida, En conflicto
- **verguenza** (7): Con humillación, Con vergüenza, Culpable, Con inseguridad `(insecure)`, Con arrepentimiento, **Con celos**, **Con envidia**
- **tristeza** (14): Con depresión, Sin esperanza, Con derrota, Sin defensa, Sin poder, Triste, Con desilusión, Con decepción, Con melancolía, Extrañando, Frágil, Vulnerable, Con inseguridad `(insecure_low)`, Pesimista
- **rechazo** (6): Con abandono, Con rechazo, En soledad, Invisible, Con exclusión, Sin comprensión
- **desconexion** (15): Vací@, Sin sentir, Con burnout, Con agotamiento, Sin energía, Con apatía, En repliegue, Sin interés, Sin motivación, Indiferente, En desconexión, Sin dirección, Con confusión, Sin avance, Con cansancio

**Lado agradable**
- **energia** (13): En éxtasis, Con euforia, Con emoción, Con entusiasmo, Con energía, Con motivación, Con pasión, Con vitalidad, Radiante, Con vigor, Triunfante, Con energía renovada, **Libre**
- **foco** (8): Con determinación, Con poder propio, Con seguridad `(confident)`, Valiente, Con enfoque, En reflexión, En contemplación, Pensativ@
- **afecto** (9): Sintiendo amor, Con amor, Con conexión, Con compasión, Con ternura, Con calidez, Gentil, Perdonando, Con nostalgia
- **calma** (22): En calma, Relajad@, En paz, Con serenidad, Cómod@, En confort, Con seguridad `(safe)`, En equilibrio, En tu centro, Con los pies en la tierra, Presente, Consciente, En aceptación, Apacible, A gusto, En quietud, En pausa, Con alivio, Con confianza, Paciente, Con sueño, Con pereza (a gusto)
- **gratitud** (12): Con orgullo, Con logro, Con esperanza, Optimista, Con gratitud, Alegre, Feliz, Con ánimo, Content@, Con satisfacción, Con plenitud, Con bendición
- **curiosidad** (8): Con inspiración, Con diversión, Con ganas de jugar, Con creatividad, Con curiosidad, Con asombro, Con fascinación, Con grata sorpresa

**Exclusión (`NO_DESCENT_TARGET_IDS`, 9):** Con depresión · Sin esperanza · Con burnout · Con apatía · Sin sentir · Vací@ · Con agotamiento · En repliegue · **Sin interés**

### 🚩 Flags honestos del Bloque A (decisiones que quiero que valides)
1. **Agregué `Sin interés` (bored) a la exclusión** (los 8 del brief + este). Era EL destino de anhedonia reportado (11 cadenas) aunque el brief lo listó como "(apatía)". Sin él, un barrido directo `confusión → sin interés` sobrevivía. Si prefieres solo los 8, quítalo de `NO_DESCENT_TARGET_IDS` (1 línea).
2. **Moví `celos` y `envidia` de ira → vergüenza.** Comparación/inadecuación no es "enojo más manejable": si se quedaban en ira, el descenso del enojo terminaba en celos/envidia (raro). Fuera de ira, el enojo baja limpio a irritación. Es una decisión semántica — revísala.
3. **Moví `Libre` de calma → energia.** Con "Libre" en calma, el volteo de la ansiedad puenteaba por "Libre" (energía alta). Fuera, ansiedad → **En calma** directo. Revisa el tag de "Libre".
4. **`Con furia` corta en "A la defensiva"** (tope de 3 pasos), no llega a fastidio. Todo ira, energía decreciente — el tope es a propósito (no arrastrar 5 pasos). Si quieres que furia llegue más abajo, subo `maxSteps`.
5. **`Con estrés → En conflicto`** — la familia agobio es chica (6) y "En conflicto" es el único paso más bajo. Honesto pero no obvio como "más calmado". Opción: fundir tensión/presión distinto, o dejarlo.
6. **`En soledad → Con nostalgia`** — nostalgia es el afecto más cercano en energía a la soledad; "conexión" sería ideal pero queda lejos en energía. ¿Prefieres forzar soledad → conexión? Es tuneable.

---

## 🎨 BLOQUE B · pulido visual de Fitness (6/6)
| # | Dónde | Qué hice |
|---|---|---|
| 1 | `app/exercise-library.tsx` | Entrada escalonada en los items: `FadeInDown.delay(min(i,12)*40).springify()`. **Tope en 12** a propósito: es FlatList virtualizada de 214 con index absoluto — sin tope, un item lejano tardaría segundos en aparecer. |
| 2 | `app/fitness-hub.tsx` | GLOW selectivo **solo** al héroe (sesión de hoy). Va en un wrapper porque `heroCard` tiene `overflow:hidden` y cliparía la sombra. Único glow de la pantalla (doctrina de restricción). |
| 3 | `app/fitness-hub.tsx:52` | `'#5B9BD5'` → `SEMANTIC.info` (mismo valor, token honesto para "Biblioteca/referencia"). |
| 4 | `app/exercise-library.tsx` searchWrap | `'#0a0a0a'` → `ELEVATION[1].bg` (coincide con el borde que ya usaba `ELEVATION[1].border`; el negro casi-invisible era justo lo que ELEVATION corrige). |
| 5 | `app/fitness-strength.tsx:760` | `TEXT.secondary` + `opacity:0.6` → **`TEXT.tertiary`, sin opacity** (un solo mecanismo de muteo). |
| 6 | `app/log-exercise.tsx:973,1076` | Disabled `0.5`/`0.4` → **`0.7`**. El de guardar ya explica su estado (label "GUARDANDO..." + reloj). El de la variante ahora trae **badge explícito**: el label cambia a "Falta el nombre" cuando está bloqueado. |

---

## ⚡ BLOQUE C · perf del mapa (plan B, preventivo — implementado, no diferido)
**Dos mecanismos, ambos con helpers puros testeados (`visibleWorldBox` / `isInWorldBox`, 5 tests nuevos):**
1. **Culling por viewport** — solo se renderiza el nodo cuyo centro cae en la caja visible + margen (`3·NODE_SIZE`). La caja se recalcula desde una `useAnimatedReaction` **cuantizada a celdas de 90px** para no cruzar el bridge JS en cada frame del pan. Selección y highlights nunca se cullean (la cámara los persigue).
2. **LOD color plano** — en vista alejada (nodos pequeños) el nodo se dibuja como `View backgroundColor` **sin `LinearGradient`**. Aquí es donde vivían los 144 gradientes simultáneos.

### Números (viewport 400×800, layout real)
| Estado | Gradientes vivos |
|---|---|
| Vista alejada (overview) | **0 / 144** (todo color plano) |
| ZOOM_LANDING · alta·desagradable | **38 / 144** |
| ZOOM_LANDING · alta·agradable | 42 / 144 |
| ZOOM_LANDING · baja·agradable | 58 / 144 |
| ZOOM_LANDING · baja·desagradable | 63 / 144 |
| ZOOM_MAX · alta·desagradable | **32 / 144** |

### 🚩 Flags honestos del Bloque C
- **Pop-in en fling muy rápido:** el culling sigue a la cámara con throttle; el margen de `3·NODE_SIZE` lo absorbe, pero un fling brutal podría asomar un nodo en el borde antes del recálculo. **Confirmar en device de gama media** (era tu riesgo #1 — si sigue pesado con esto, hay que subir el margen o cachear el gradiente como imagen).
- **LOD solo en overview** ("pequeño"). Consideré "lejos del centro → plano" por nodo, pero lo descarté: exige re-render por frame y pelea con el culling.
- **Un frame de montaje** puede pintar los 144 antes del primer cálculo de caja (transitorio, no ocurre al deslizar).

---

## Archivos tocados
`src/data/emotions-library.ts` · `src/services/emotion-navigation-core.ts` · `src/services/emotion-map-core.ts` · `src/components/checkin/EmotionMap2D.tsx` · `app/fitness-hub.tsx` · `app/exercise-library.tsx` · `app/fitness-strength.tsx` · `app/log-exercise.tsx` · tests: `emotion-navigation-core.test.ts` (+6) · `emotion-map-core.test.ts` (+5).
```
tsc: 0 · vitest: 2199/2199 · eslint tocados: 0 errores · sin merge · sin bump de versión · sin migración
```
