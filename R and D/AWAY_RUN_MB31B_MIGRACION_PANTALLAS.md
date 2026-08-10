# 🖌️ AWAY RUN MB-31B · La migración de las pantallas

**Un solo brief, TRES ámbitos que corren en paralelo.** Cada sesión toma **uno** y no toca
los otros. El criterio es idéntico para los tres, por eso no hay tres documentos.

| Ámbito | Rama | Qué le toca |
|---|---|---|
| **B1 · El marco y el día** | `feat/mb31b1-marco` | `(tabs)/*`, `_layout.tsx`, `agenda`, `kit`, `centro/*`, `packs/*`, `settings/*`, `onboarding/*` |
| **B2 · Salud** | `feat/mb31b2-salud` | `edad-atp/*`, `salud/*`, `labs*`, `glucose*`, `ketones*`, `solar`, `cycle*`, `reports`, `historia*`, `my-health`, `braverman*` |
| **B3 · Todo lo demás** | `feat/mb31b3-resto` | `mente/*`, `meditation`, `breathing`, `emotion*`, `journal*`, `checkin`, `nback`, `food*`, `nutrition`, `hydration`, `fasting`, `supplement*`, recetas, `lista-compra`, fitness, `comunidad/*`, `afiliados/*`, `economy/*` |

🚨 **Si un archivo no está claramente en tu lista, NO lo toques y repórtalo.** Tres ramas
editando el mismo archivo es el peor escenario posible y ya nos pasó una vez.

⚠️ Las tres tocan `R and D/FIFO_PENDIENTES.md`: **conflicto esperado, NO lo resuelvan.**

**Base:** `main` (con MB-31A adentro) · worktree propio cada una · **sin migración** ·
`tsc`, Vitest y `npm run censo` en verde antes de cada commit.

---

# LA FUENTE

**`R and D/MANUAL_DE_MARCA_ATP.md` está aprobado y trae los valores exactos.**
**`src/constants/brand.ts` trae los tokens que MB-31A construyó.**

**Este run no decide colores: los reemplaza.** Si encuentras un color que no mapea a ningún
token, **repórtalo y déjalo** — no inventes un token nuevo.

---

# PIEZA 1 · La migración

Por cada pantalla de tu ámbito:

1. **Envolverla en el scope del tema** (`<ThemeReady>` o `<Screen themed>`, lo que MB-31A
   dejó — léelo antes de asumir).
2. **Cambiar los hex neutros por tokens**: fondos, superficies, texto, bordes, separadores.
3. **Dejar en paz los colores de marca y de sección.** El lima de fitness, el morado de
   mente, el degradado de la molécula: **son identidad, no tema.**
4. **Poner su barra de estado** según el tema.

## Las tres reglas del manual, que aquí se aplican una por una

🚨 **El lima nunca es color de texto.** Si encuentras `color: '#A8E02A'` en un `Text`,
**eso es un bug de contraste** (1.34): pásalo a relleno con negro encima, o a token de
texto normal. **Repórtalos: cada uno es un hallazgo, no un cambio mecánico.**

🚨 **El teal de marca tampoco es texto.** Enlaces y acentos de texto usan el token
calibrado.

🚨 **Los colores de sección no son letra.** Son relleno, icono, barra o punto. Cuando son
relleno, el texto encima es **negro, salvo ayuno que lleva blanco.**

## La card editorial

🚨 **Se queda OSCURA en los dos modos.** Foto, degradado negro y texto blanco. **Solo su
borde se tematiza.** Si tu ámbito tiene cards editoriales, no las toques por dentro.

---

# PIEZA 2 · Lo que vas a encontrar y no es color

Migrar 111 archivos destapa cosas. **Cuando encuentres algo que no es de este run:**

- **Anótalo en el FIFO y sigue.** No lo arregles.
- **Excepción:** si es un contraste que falla de verdad (texto que no se lee), **arréglalo
  y repórtalo aparte.** Eso sí es de este run, porque es la razón de que exista.

⚠️ **Cero cambios de comportamiento.** Este run cambia cómo se ve, nunca qué hace.

---

# PIEZA 3 · Tests y el ratchet

1. **Ratchet por ámbito:** ningún archivo de TU lista puede tener un hex neutro a mano.
   ⚠️ Los de marca y sección sí pueden quedarse: el ratchet distingue.
2. **Contraste calculado** de los pares nuevos que introduzcas, con la utilidad de MB-31A.
   **Que calcule, no que compare textos.**
3. **La card editorial no cambia entre temas** en tu ámbito.
4. **Ninguna pantalla cambió de comportamiento:** los tests que ya existían siguen verdes
   sin tocarlos. ⚠️ **Si tuviste que modificar un test viejo, eso es señal de que cambiaste
   comportamiento. Repórtalo.**

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 📦 ENTREGA

Commits agrupados por zona, no uno por archivo. En el reporte:

- **Cuántas pantallas migraste** y cuántos hex quitaste.
- **Cuántos casos de lima o teal como texto encontraste** (esos son bugs de contraste que
  llevaban ahí desde siempre).
- **Qué colores no mapearon** a ningún token.
- **Qué encontraste que no era de este run** y anotaste al FIFO.
- El resultado real de las mutaciones.

**Verificación en dispositivo (Enrique):**
1. Recorrer tu ámbito en claro: **todo legible, nada en gris sobre gris.**
2. Recorrerlo en oscuro: **se ve igual que antes de este run.**
3. Las cards editoriales siguen oscuras en los dos modos.
4. Los colores de sección se reconocen igual en los dos.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges.**

⚠️ **Hay otras dos ramas vivas: el orden de merge lo decide Cowork, no tú.**
