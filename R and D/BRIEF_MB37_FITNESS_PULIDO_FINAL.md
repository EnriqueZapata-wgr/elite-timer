# ✨ BRIEF · MB-3.7 — Pulido final de Fitness (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb37-fitness-pulido` desde `main` (ya trae MB-3.6). NO merge, tsc + tests verdes, Cowork audita.
**Tamaño:** chico. Es el último pase antes del build de cierre de Fitness.
**Contexto:** Enrique revisó la tabla §4.4 del delivery MB-3.6 y dijo: *"no me gustan las redundancias, ¿podemos pulirlas?"* → **se ejecutan las 5 dudosas**, con las resoluciones de abajo. **NO toques la versión** (el bump lo hace Cowork).

---

## 1 · Las 5 redundancias — resoluciones

**Principio rector:** *un dato = un lugar*, y **una sola presentación del mismo dato por pantalla**. Excepción única: si el dato cambia la decisión del usuario justo ahí.

| # | Dónde | Resolución |
|---|---|---|
| 1 | **Fuerza · card de benchmark** (PR + 1RM est.) duplicado con la tabla TUS MARCAS | **Una sola presentación en esa pantalla.** El PR/1RM vive en **UN** lugar: elige el que mejor sirva a la decisión (registrar) y **elimina la otra presentación** — no dejes las dos listas mostrando los mismos números. Si conservas los números en las cards, la tabla se va (o se vuelve historial/comparativa que aporta algo distinto, p. ej. progresión en el tiempo). Documenta la decisión. |
| 2 | **Runner · "EJERCICIO 2 / 6" + barra de progreso** | **Conserva el número** (en el gym se lee más rápido, tenías razón) y la barra queda como **indicador ambiental delgado y sin label propio**. Así refuerza sin duplicar texto. |
| 3 | **Detalle de ejercicio · familia en header + "FAMILIA SENTADILLA · 4 VARIANTES"** | **Aplicar tu propuesta:** la sección dice solo **"4 VARIANTES"**. El nombre de la familia ya está en el header. |
| 4 | **Cardio hub · "Última: 5.2 km en 30:00"** | **Se va.** Aunque viven en pantallas distintas, el hub de cardio es **navegación** y la doctrina ATP es explícita: menú/hub = cards editoriales que llevan a destinos, **cero datos**. El dato vive en log-cardio (como prefill "la última vez… tocar para repetir"), que es donde se usa. |
| 5 | **Hub · kg de hoy (hero) + kg de la semana (card semana)** | **Aplicar tu propia alternativa:** el día que ya entrenó, la card de semana **no compite con el hero** — ocúltala o baja su jerarquía ese día. Los otros días se queda normal. |

---

## 2 · Español — matar el inglés user-facing
- **`app/fitness-strength.tsx` (~línea 88), `MUSCLE_GROUP_DESCRIPTIONS`:** `'UPPER BODY'` / `'LOWER BODY'` / `'CORE'` / `'FULL BODY'` son **visibles al usuario y están en inglés**. → **TREN SUPERIOR · TREN INFERIOR · CORE · CUERPO COMPLETO**. *(Nota: "CORE" se queda — es de uso normal en gym MX. "REPS" y "SEG" también se quedan.)*
- **Barrido:** revisa el resto del pilar Fitness por strings user-facing en inglés (labels, botones, estados vacíos, mensajes de error, títulos de sección) y pásalos a **español MX**. Los comentarios de código y las llaves de DB (`toe_touch_cm`, `knee_to_wall`) **NO se tocan**.
- Si un tecnicismo no tiene traducción natural, se usa el término en español **y se explica entre paréntesis la primera vez** (doctrina: explicar siglas, guiar con ejemplos).

---

## Protocolo
`feat/mb37-fitness-pulido` desde `main`. **NO tocar la versión.** `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. NO merge. Delivery corto: qué resolución tomaste en el #1 y la lista de strings traducidos. Cowork audita → merge → bump + build nativo de cierre de Fitness.
