# 📦 DELIVERY MB-20.5 · el cierre de HOY

**Rama:** `feat/mb20-1-editorial` · 7 commits (uno por pieza + este reporte)
**Verificación:** `tsc` 0 errores · Vitest **2635 tests en 246 archivos, todos en verde** · `npm run censo` en verde — antes de CADA commit.
**Cero migraciones.**

---

## P1 · Muere el modal (`ce7ce3b`)

`experiencia` desaparece como tipo de gesto. Las seis (meditación, respiración,
cardio, fuerza, journal, N-Back) pasan a **`navegar`**: el tap abre su módulo
directo, como cualquier verificado. Los tres modales sin salida (journal,
N-Back, fuerza) no se arreglaron: **ya no existen**.

### Qué se borró con el modal, y si algo lo seguía usando

Censo previo con grep sobre todo `src/` y `app/` — **nadie fuera del
ecosistema HOY usaba nada de esto**:

| Borrado | Quién lo usaba |
|---|---|
| `SmartCheckModal.tsx` (archivo completo) | Solo `TareasView` (no tenía test propio) |
| `EXPERIENCIA_SOURCES` | `tareas-core` (gestoForBool) + sus tests |
| `EXPERIENCIA_CAPTURA` | `SmartCheckModal` + tests |
| `EXPERIENCIA_REGISTRO` | `TareasView` (handleIrRegistro) + `rutas-pantallas-reales.test` |
| `handleIrRegistro` / `handleRegistrar` / `smartTarea` en TareasView | internos |
| Señal (b) del nudge (descartar la pregunta sin elegir) | muere con el modal; queda la señal del toque accidental |

**Se conservó** `registrarExperiencia` en `tarea-actions` — lo reusa P2.
El tipo queda en dos: **palomear → círculo · navegar → chevron** (y agua, su
caso propio: tres botones capturan, el tap del resto abre Hidratación).

## P2 · El registro manual se muda al módulo (`3ea242a`)

`RegistroManualCard` (nuevo, `src/components/mente/`): card-botón + modal
mínimo (cuántos minutos, guardar).

- **Meditación** → botón **"Ya medité"** (arriba de la biblioteca).
- **Respiración** → botón **"Ya respiré"** (arriba del selector).
- **Cardio**: no necesitó botón nuevo — el tap de la card de HOY abre
  `/log-cardio`, que ES la pantalla "Registrar Cardio" (verificada visible).
- **Fuerza**: `/log-exercise` existe y es visible (Fitness → Entrenar →
  "Registrar ejercicio"; también desde fitness-strength).
- **Journal y N-Back sin botón**: escribir/jugar ES el registro.

⚠️ CRÍTICO cumplido: escribe por `registrarExperiencia` → la **MISMA tabla**
que la sesión real (`mind_sessions`; cardio vía `logCardioSession` →
`cardio_sessions`), y el electrón se otorga por el camino de siempre
(`awardPracticeElectron` dentro del writer / compile del verificado). **Cero
ruta paralela**, y hay test de contrato que prohíbe al botón escribir
sesiones o electrones por su cuenta.

## P3 · Círculo contra chevron (`48cfce2`)

Pendiente palomear → **círculo**. Pendiente navegar/inline → **chevron en el
MISMO slot** (mismo tamaño, misma posición, mismo peso visual — solo cambia
la forma; la columna conserva su alineación). Aplica en la fila compacta
(las dos lentes) y en la card grande. El chevron del borde derecho de la
fila se retiró: la pista vive en un solo lugar. Hecha = paloma pintada
(estado, no gesto).

## P4 · Las tres imágenes (`2da6dda`) — hallazgo honesto

**El cableado ya existía** desde MB-20.1 P1: `tareaImage` ya resuelve
cardio → `pickCardioImage` (cardio-01/02), ciclo → `pickHabitImage('ciclo')`
(ciclo-01/02/03) y `agenda-*` → `ayuno.webp`, con la rotación determinística
por día de siempre. Los assets están en el repo (verificado en disco).

Lo que faltaba era el **amarre**: `tarea-images-contrato.test.ts` verifica
cada `require()` contra el disco (lo que Metro empaqueta), que los 20
hábitos del universo resuelven foto y que la card 21 (romper ayuno) tiene
la suya. Ninguna puede caer al degradado con glifo sin tronar un test.

## P5 · Los dos tests pendientes (`c83c70a`)

**5.1** La tabla del gesto ahora se **instancia**: `tarea-gesto-core.ts` es
la decisión pura (`accionTap` / `accionTapLargo`) y `useTareaGesto` solo
despacha — el contrato vigila que el hook no re-derive nada del gesto.
El test afirma la tabla completa celda por celda (tipo × con/sin ruta),
escrita a mano. **Mutación probada en vivo**: cambiar `palomear` por
`navegar` en el core tumbó 2 tests (el contrato viejo de strings los
dejaba en verde). Exhaustividad a nivel de tipos: un gesto nuevo no
compila sin sumarse a `TAREA_GESTOS`.

**5.2** El copy de la burbuja salió del JSX a `NUDGE_COPY` (en
tarea-gesto-core, junto a la tabla que describe) y quedó amarrado como el
guion del tour.

## P6 · El copy (`a3c76ea`)

Tour paso 2 y burbuja del nudge, en espejo, con la regla de dos tipos:

> *"Un toque palomea los hábitos y abre las funciones. Mantener presionado
> abre el módulo de un hábito que además tiene pantalla."*

Barrido de restos: comentarios de TareaRow/TareaCard/nudge-store/
tarea-actions actualizados. Cero *"¿ya meditaste?"* ni *paloma inteligente*
vivos en código — las únicas menciones restantes son los guards de test que
afirman su muerte.

---

## ✅ Verificación en dispositivo (pendiente, checklist del brief)

1. Solo hay **dos formas**: círculo en las que marcas, chevron en las que abren.
2. **Ningún modal en HOY.** Tocar Meditar abre meditación directo.
3. Dentro de Meditación, **"Ya medité"** guarda y el electrón se otorga
   igual que con una sesión real.
4. **Las 21 cards tienen foto.** Ninguna con degradado y glifo.
5. Tap largo en luz solar abre `/solar`; en baño frío no hace nada.
6. Agua conserva sus tres botones y el `-250` no deja negativos.
7. El tour del paso 2 enseña la regla de dos tipos.

Después del device test: audit Cowork → merge → OTA.
