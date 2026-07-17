# 🧠 MEGA-SPRINT E · Pilar Mente consolidado — Delivery

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-e-pilar-mente` (desde `main`) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores · **1733 tests verdes** (172 files · `breath-timer-core` / `mente-hub-core` intactos)
**Estado:** las 3 tasks (#138 + #139 + #140) consolidadas en un paso. Séneca NO tocado (flag abajo).

---

## E1 · #140 — Copy autoridad → mecanismo ✅

Los 3 spots reescritos. **Beneficio conservado, autoridad fuera, mecanismo dentro** (no matar placebo):

| Archivo | Antes | Ahora |
|---|---|---|
| `breathing-library.ts:44` | "Calma y enfoque. **Usado por Navy SEALs**." | "Calma y enfoque. **El ritmo cuadrado ancla el sistema nervioso**." |
| `breathing-library.ts:135` | "El reset más rápido del estrés. **Respaldado por Stanford**." | "El reset más rápido del estrés. **Un doble inhalo reexpande los alvéolos y descarga CO₂**." |
| `ActionContentRenderer.tsx:112` | "**Usado por Navy SEALs**. Baja cortisol en minutos." | "Baja cortisol en minutos. **El exhalo largo activa el nervio vago**." |

Usé la rama `is478` ("El exhalo largo activa el nervio vago → relajación profunda") de molde tonal. **Grep limpio:** cero "Navy SEALs"/"Stanford"/"Harvard"/autoridad en el copy user-facing de Mente.

## E2 · #139 — Matar `/mind-hub` legacy ✅

- **`day-compiler.ts:500`** — la sugerencia de mood bajo (acción "Respiración 5 min") repunta directo a **`/breathing`** (routing granular, doctrina #90), no al hub.
- **`app/_layout.tsx:189`** — `<Stack.Screen name="mind-hub" ...>` eliminado.
- **`app/mind-hub.tsx`** — `git rm` (archivo legacy completo eliminado).
- **Comentarios** en `hoy-cards.ts:29` y `day-compiler.ts:36` actualizados (docs, no código).
- **Grep post-sprint:** cero referencias VIVAS a `/mind-hub`; las 4 restantes son todas comentarios (permitidos por el brief).

## E3 · #138 — Identidad editorial en pantallas de ejecución ✅

Nuevo componente **`src/components/mente/MenteHero.tsx`** (reutilizable): `ImageBackground` MJ + overlay gradiente (≥0.55 abajo, DS §3) + kicker "PILAR MENTE" + título, con el morado del pilar (`CATEGORY_COLORS.mind` = `#7F77DD`) como **acento** (kicker + borde inferior), no como fondo dominante. Slot opcional `rightContent` para acciones (historial/ayuda del journal).

| Pantalla | Hero |
|---|---|
| `app/breathing.tsx` (selector) | `intervenciones/respiracion.jpg` |
| `app/meditation.tsx` (library) | `intervenciones/mente.jpg` |
| `app/journal.tsx` (selector) | `intervenciones/mente.jpg` (reutiliza) — conserva los botones historial + ayuda en el slot derecho |

- El **anillo de respiración** (color por fase: verde inhala / azul retén / naranja exhala) y el **timer de meditación** conservan su lógica de color — `breath-timer-core` **intocado** (tests verdes).
- Las sub-vistas activas (timer, box config, form de journal) mantienen el morado del pilar; el hero editorial va en las vistas de entrada (selector/library), que son las que se veían "borrador".

---

## ⚠️ Flag para Enrique · Séneca (NO tocado, requiere tu firma)

`app/journal.tsx` cita a **Séneca** en:
- `:37` — tipo "Estoico" con `description: 'Reflexión al estilo Séneca'`.
- `:51, :54` (y más) — quotes atribuidas: `'"No es que tengamos poco tiempo..." — Séneca'`, `'"Sufres más en la imaginación que en la realidad." — Séneca'`.
- Hay un tipo de journal completo "Estoico" (`stoic`) + banco de quotes estoicas.

**No lo toqué** (decisión tuya, por brief). La pregunta es si Séneca (filósofo, referencia cultural/filosófica) entra en la doctrina de "nombres propios fuera del copy" (que apunta a **autoridades de salud capturadas** como validación) o es una **referencia cultural legítima** de una práctica reconocida (journaling estoico). Mi lectura: es distinto a "Navy SEALs/Stanford" — no valida un beneficio de salud apelando a autoridad, sino que nombra una tradición filosófica que ES el contenido de la práctica. Pero es tu llamada. Si decides que sale: sería reescribir la descripción del tipo + decidir qué hacer con las quotes atribuidas (¿anónimas? ¿otra fuente?).

## 🐛 Nota / anomalía (fuera de scope, NO tocado)

El working tree tenía **41 PNG de `assets/images/agenda/*` modificados** (binarios) al empezar — cambios ajenos a Mega-Sprint E (probablemente de una corrida previa de `optimize-images.js` en otra sesión). **No los stageé ni commiteé** (invariante quirúrgico) → no entran a esta rama. Si eran intencionales, viven en otra rama/sesión; si no, un `git checkout -- assets/images/agenda/` los restaura. Los dejé como estaban para no pisar trabajo ajeno.

## ⏭️ Dependencia de merge (importante)

E3 usa `respiracion.jpg` + `mente.jpg`, que **nacieron en Mega-Sprint C** (`fix/megasprint-c-cableado-imagenes`), aún **sin mergear a main**. Los traje a esta rama con `git checkout origin/fix/megasprint-c-cableado-imagenes -- <los 2 jpg>`, así que **esta rama es self-contained** (compila y bundlea sola). Al mergear: si C entra primero, los archivos son idénticos (sin conflicto); si E entra primero, los 2 jpg ya vienen incluidos.

## 🗂️ Archivos
**Nuevo:** `src/components/mente/MenteHero.tsx` + 2 jpg (traídos de C).
**Modificados:** `breathing-library.ts`, `ActionContentRenderer.tsx`, `day-compiler.ts`, `_layout.tsx`, `breathing.tsx`, `meditation.tsx`, `journal.tsx`.
**Eliminado:** `app/mind-hub.tsx`.

— Fable 🤖 · pilar Mente: cero legacy, copy por mecanismo, pantallas con cara editorial
