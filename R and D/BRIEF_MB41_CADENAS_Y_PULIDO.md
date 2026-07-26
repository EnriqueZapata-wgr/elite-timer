# 🚨 BRIEF · MB-4.1 — Cadenas de descenso (P0) + pulido visual Fitness + perf del mapa

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb41-cadenas-pulido` desde `feat/mb4-checkin-v2` (para que todo cierre en un solo merge). NO merge, tsc + tests verdes, **NO tocar la versión**. Cowork audita.
**Origen:** audit Cowork de MB-4. Pediste revisión semántica de las cadenas — **encontré un problema de fondo, no cosmético.**

---

# 🔴 BLOQUE A · P0 — LAS CADENAS DE DESCENSO LLEVAN A LA ZONA DEPRESIVA

## El hallazgo (medido sobre las 144 reales)
Simulé `buildDescentChain` con la librería completa. **De las 36 emociones de alta·desagradable, así terminan sus cadenas:**

| Destino final | Veces |
|---|---|
| **Sin interés** (apatía) | **11** |
| Con inseguridad | 6 |
| En conflicto | 5 |
| Con confusión | 5 |
| Con fastidio ✅ | 3 |
| Con exclusión | 3 |
| A la defensiva | 2 |

Ejemplos textuales de lo que hoy leería el usuario:
- `Con enojo → Con miedo → A la defensiva → En conflicto`
- `Con estrés → En conflicto → Con inseguridad → Sin interés`
- `Con frustración → A la defensiva → En conflicto → Con inseguridad`
- `Triste → En desconexión`

## Por qué está mal
1. **El descenso cruza de familia emocional.** *Enojo → miedo* no es "una versión más manejable de lo mismo": es **otra emoción**, y discutiblemente peor. La intención del spec era `furia → enojo → frustración → fastidio` (misma familia, menos intensidad).
2. **Bajar energía manteniendo la valencia negativa navega hacia la zona depresiva.** El cuadrante baja·desagradable contiene: *Con depresión · Sin esperanza · Con agotamiento · Con burnout · Con apatía · Sin sentir · Vací@ · En repliegue.* Terminar ahí no es "calmarse", es **anhedonia**.
3. **A alguien enojado le estamos diciendo, literalmente, "¿y si tuvieras menos energía?" para llevarlo a la apatía.** Eso es lo contrario de la intención terapéutica y del contrato del spec §3 ("sentir mal no es un error que arreglar" — pero tampoco lo empeoramos).

*(El algoritmo no está "mal escrito": es determinista y ordenado. El problema es que optimiza sobre energía+intensidad, que son ejes numéricos, sin saber de familias semánticas.)*

## El arreglo
### A.1 · Tag de FAMILIA emocional *(dato nuevo, chico)*
Agregar `family` a las 144 en `emotions-library.ts`. Familias sugeridas para el lado desagradable: **ira · miedo/ansiedad · tristeza · agobio/carga · vergüenza/culpa · desconexión/vacío · rechazo/soledad**. Para el lado agradable: **energía/impulso · foco/claridad · afecto/conexión · calma/serenidad · gratitud/plenitud · curiosidad/apertura**. Enrique revisa el tagging después (igual que la matriz de Fitness).

### A.2 · El descenso NO cambia de familia
`buildDescentChain` filtra además por `family === origin.family`. Si no hay candidato de la misma familia, **la cadena se detiene ahí** (mejor 2 pasos honestos que 4 que mienten).

### A.3 · Lista de exclusión — destinos prohibidos
Ninguna emoción clínicamente adyacente puede ser **destino de descenso**: `depresión · sin esperanza · burnout · apatía · sin sentir · vacío · agotamiento extremo · en repliegue`. Marcarlas con un flag (p. ej. `noDescentTarget: true`). **Siguen existiendo en el mapa** — el usuario puede nombrarlas si es lo que siente, y eso está bien. Lo que NO hacemos es **guiarlo hacia ellas**.

### A.4 · Cadena corta = cadena válida
Si tras los filtros solo hay 1-2 pasos, la UI lo muestra sin drama. Y si no hay descenso posible, **se ofrece directo el volteo** en vez de forzar un camino.

### A.5 · Revisar también el VOLTEO
Mismo problema, menor grado. Hoy el puente se elige por cercanía numérica y salen cosas arbitrarias: `Con frustración → Con asombro`, `Con ansiedad → Con asombro`, `Con enojo → Con vitalidad`. **Default:** puente por familia de destino curada — ira→foco/determinación · miedo/ansiedad→seguridad/calma · tristeza→aceptación/afecto · agobio→claridad. *(Algunos ya salen bien: `Con preocupación → Con esperanza`, `Triste → Perdonando`, `En soledad → En aceptación` — conservar esa calidad como vara.)*

### A.6 · Tests que blinden esto
- Ninguna cadena de descenso termina en la lista de exclusión (barrer las 144).
- Ninguna cadena de descenso cambia de familia.
- Todo destino de volteo es del lado agradable **y** de una familia compatible con el origen.
- Casos guía: `furia → … → fastidio` (o cadena corta), y **nunca** `enojo → miedo`.

---

# 🎨 BLOQUE B · PULIDO VISUAL DE FITNESS *(audit Cowork sobre main)*
| # | Dónde | Arreglo |
|---|---|---|
| 1 | `app/exercise-library.tsx` | **Cero entradas escalonadas** en toda la pantalla (única del pilar sin `entering=`), y es la de lista larga. → `FadeInDown.delay(i*40).springify()` en los items. |
| 2 | `app/fitness-hub.tsx` | **Cero glow.** Abre con la sesión de hoy como protagonista pero el hero no tiene profundidad → agregar `GLOW` selectivo **solo** al hero (uno por pantalla, doctrina de restricción). |
| 3 | `app/fitness-hub.tsx:52` | Hex crudo `'#5B9BD5'` → token de `brand.ts`. |
| 4 | `app/exercise-library.tsx:250` | Hex crudo `'#0a0a0a'` → `ELEVATION`/`BG`. |
| 5 | `app/fitness-strength.tsx:760` | `TEXT.secondary` **+ `opacity: 0.6`** = doble muteo (el design system advierte: se vuelve invisible). → un solo mecanismo: token de color, sin opacity. |
| 6 | `app/log-exercise.tsx:973,1076` | Disabled a `opacity 0.4`/`0.5` → **~0.7 + badge explícito** (patrón del design system). |

---

# ⚡ BLOQUE C · PERF DEL MAPA *(tu riesgo #1, preventivo)*
Marcaste que 144 gradientes en un Android de gama media es el riesgo principal, con plan B listo. **Impleméntalo ahora, no después:** culling por viewport (solo renderizar lo visible + margen), y gradientes simplificados o color plano cuando el nodo está lejos del centro/pequeño. Debe seguirse sintiendo continuo al deslizar. Si tras el culling sigue pesado, fláguealo con números.

---

## Protocolo
`feat/mb41-cadenas-pulido` desde `feat/mb4-checkin-v2`. NO merge, NO tocar versión. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **Delivery con:** el tagging de familias completo (tabla para que Enrique lo revise), las cadenas resultantes de los ~12 casos más comunes (enojo, frustración, ansiedad, estrés, agobio, tristeza, soledad, cansancio, irritación, preocupación, miedo, vergüenza) para revisión semántica, y números de perf del mapa.
