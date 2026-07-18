# 🧠 MEGA-SPRINT E · Pilar Mente consolidado (Fable)

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-e-pilar-mente` desde `main`
**Estimado:** 5-8h
**Consolida 3 tasks en un paso (NO mini-sprints):** #138 (identidad visual) + #139 (matar /mind-hub legacy) + #140 (copy autoridad → mecanismo)

Objetivo: que el Pilar Mente deje de verse "borrador". Hoy las pantallas de ejecución (respiración, meditación, journal) usan morado plano `#7F77DD` sin identidad editorial, hay un hub legacy `/mind-hub` todavía vivo, y el copy cita autoridades ("Navy SEALs", "Stanford") en contra de doctrina.

---

## 📚 Doctrinas obligatorias
1. **`feedback_no_matar_placebo_seguros_no_ingenuos`** — al quitar autoridad NO se quita el beneficio. Se reemplaza autoridad por MECANISMO (honesto + preserva placebo). Nunca dejar la técnica "desnuda".
2. **`feedback_nombres_propios_nunca_en_copy_usuario`** — cero nombres de personas/instituciones como validación en copy user-facing (Braverman es la única excepción histórica).
3. **`project_doctrina_aha_industria_capitalizada_no_es_autoridad`** — autoridades capturadas no son validación.
4. **`feedback_simple_vence_inteligente`** · **`project_doctrina_menu_navegacion_vs_consulta_datos`** — hub = navegación limpia.
5. Sprint 2 visual como referencia de patrón editorial (ImageBackground + concept-color + overlay).

---

## 🔧 E1 · #140 — Copy autoridad → mecanismo (3 spots exactos)

Reemplaza autoridad por mecanismo fisiológico. **Mantén el beneficio** (no matar placebo).

| Archivo:línea | Copy actual | Reescribir a (mecanismo) |
|---|---|---|
| `src/data/breathing-library.ts:44` | `'Calma y enfoque. Usado por Navy SEALs.'` | `'Calma y enfoque. El ritmo cuadrado ancla el sistema nervioso.'` |
| `src/data/breathing-library.ts:135` | `'El reset más rápido del estrés. Respaldado por Stanford.'` | `'El reset más rápido del estrés. Un doble inhalo reexpande los alvéolos y descarga CO₂.'` |
| `src/components/hoy/ActionContentRenderer.tsx:112` | `'Usado por Navy SEALs. Baja cortisol en minutos.'` | `'Baja cortisol en minutos. El exhalo largo activa el nervio vago.'` |

> Nota: en `ActionContentRenderer.tsx` la rama `is478` ya usa copy de mecanismo correcto ("El exhalo largo activa el nervio vago → relajación profunda") — úsalo de molde tonal.

**⚠️ Decisión para Enrique (NO ejecutar sin firma):** `journal.tsx:37` dice `'Reflexión al estilo Séneca'` y hay tipos "Estoico". Séneca es nombre propio (filósofo, no autoridad de salud capturada). ¿Entra en la doctrina o es referencia cultural aceptable? Déjalo como está y **flaggéalo en el delivery** para que Enrique decida — no lo toques por tu cuenta.

---

## 🔧 E2 · #139 — Matar el hub legacy `/mind-hub` (duplicado vivo)

El hub nuevo es `/mente`. El viejo `/mind-hub` sigue **referenciado en producción** pese a los comentarios que dicen "nunca al viejo":

1. **`src/services/day-compiler.ts:500`** — la sugerencia de mood bajo enruta a `/mind-hub`. Como la acción es "Respiración 5 min", repunta directo a **`/breathing`** (routing granular, doctrina #90), no a un hub.
2. **`app/_layout.tsx:189`** — `<Stack.Screen name="mind-hub" .../>` → eliminar.
3. **`app/mind-hub.tsx`** — `git rm` (archivo legacy completo).
4. **Verifica** con grep que no quede ninguna otra referencia a `mind-hub` (los comentarios en `hoy-cards.ts:29` y `day-compiler.ts:36` pueden quedarse o actualizarse — son solo docs).

---

## 🔧 E3 · #138 — Identidad editorial en pantallas de ejecución

Las 3 pantallas de ejecución usan morado plano sin heros editoriales (a diferencia del resto de la app post-Sprint 2). Súbelas al mismo lenguaje visual. **Buenas noticias: Mega-Sprint C ya dejó los assets ideales:**

| Pantalla | Archivo | Hero editorial sugerido |
|---|---|---|
| Respiración | `app/breathing.tsx` | `assets/images/intervenciones/respiracion.jpg` |
| Meditación | `app/meditation.tsx` | `assets/images/intervenciones/mente.jpg` |
| Journal | `app/journal.tsx` | reutiliza `mente.jpg` o marca en delivery si falta asset propio (NO inventes require de archivo inexistente) |

**Qué hacer (patrón Sprint 2):**
- Header con `ImageBackground` + overlay gradiente + título, en vez del bloque de color plano.
- Mantén el morado del pilar (`CATEGORY_COLORS.mind` = `#7F77DD`) como **acento** (anillos, iconos, chips), no como fondo dominante.
- Consistencia con `MenteHubCard` / cards del hub `/mente` (mismo tratamiento de card + concept-color).
- El anillo de respiración y el timer de meditación conservan su lógica de color por fase (no tocar `breath-timer-core`).

> Regla: `require()` ESTÁTICO (Metro). Reutiliza el picker si aplica; si es hero fijo, `require` directo del `.jpg`.

---

## 🧪 Test guards
- `npx tsc --noEmit` limpio · eslint 0.
- Tests existentes de `breath-timer-core` / `mente-hub-core` siguen verdes (no tocar lógica pura).
- Grep post-sprint: cero referencias vivas a `/mind-hub` (solo comentarios permitidos).
- Metro arranca sin asset faltante.
- Copy: cero "Navy SEALs"/"Stanford"/autoridad en copy user-facing de Mente (grep limpio).

## 📤 Delivery
`R and D/FABLE_MEGASPRINT_E_DELIVERY.md` — con: los 3 spots de copy reescritos, confirmación de `/mind-hub` muerto, screenshots-intent de las 3 pantallas editoriales, y **el flag de Séneca para decisión de Enrique**.

## 🔒 Invariantes
- `str_replace` quirúrgico · `require()` estático · lógica pura intacta.
- No matar placebo: beneficio se queda, autoridad se va, mecanismo entra.
- Séneca NO se toca sin firma de Enrique.
- Delivery doc obligatorio.

**Con esto el Pilar Mente pasa de "borrador" a editorial: pantallas con cara, cero legacy, copy que educa por mecanismo en vez de apelar a autoridad.**

— Enrique + Cowork
