# 📦 DELIVERY · AWAY RUN NOCTURNO-FIX · 2026-08-03

**Rama:** `feat/nocturno` (continuación del run nocturno, se mergea junto).
**Brief:** `R and D/AWAY_RUN_NOCTURNO_FIX.md` (sale del audit `AUDIT_NOCTURNO_2026-08-02.md`).
**7 piezas · 7 commits.** `tsc`, Vitest y `npm run censo` en verde antes de cada uno.

---

## 1 · Lo entregado

| Commit | Pieza | Qué |
|---|---|---|
| 060137e | P1 🚨 | **El copy de instalar dice la verdad (bloqueaba el merge).** Movilidad deja de ser instalable (es evaluación, no hábito). `installCreatesRow()` en install-core: el MISMO cruce de `togglesForApp` decide si hay fila, e `installAlertBody`/`uninstallAlertBody` derivan el copy de ahí — no hay constante a mano que pueda volver a desincronizarse. El paso 7 del tour ya no promete la fila como universal. Test ratchet: toda instalable o crea fila, o es fija, o está declarada sin fila (sueño, ayuno, glucosa, cetonas). El punto lima de las cuatro sin fila NO se tocó: es señal honesta. |
| a517b40 | P2 | **La paloma inteligente ofrece dos opciones siempre.** `EXPERIENCIA_REGISTRO` mapea las experiencias sin captura a su registro real: Entrenar → `/log-exercise` (escribe `exercise_logs`, que es lo que enciende el check verificado), Journal → `/journal`, N-Back → `/mente/nback/sesion`. En el modal el SÍ navega ahí y el NO cierra sin más; test: el modal no puede volver a quedar de un botón. |
| 3c3120c | P3 | **La card de la orbe ya no pierde la carrera.** `refresh()` único que se dispara al enfocar, con `day_changed` y con `ARGOS_INSIGHT_CHANGED_EVENT` (lo emite HOY tras el upsert de la generación). Ya no depende del orden de montaje. Fin del parpadeo: `collapsed` arranca en null y la card no se pinta hasta leer la memoria del día. |
| 5d45bb5 | P4 | **El orden ya no compara strings.** `padStart` en el origen (romper ayuno), `minutesFromMidnight()` en ambos sorts, y el bug de medianoche muerto (`parseInt('00')||12` mandaba las 00:30 a la tarde). |
| 6d709c4 | P5 | **El tour se pausa en vez de secuestrar.** `usePathname` como watcher: si la ruta deja de ser la del paso y no fue el tour quien navegó, la burbuja se esconde y queda una pastilla discreta (Seguir tour + terminar). Volver a la pantalla del paso también reanuda. Nunca se le regresa a la fuerza. Terminar tour intacto en todos los pasos. |
| b1fcb59 | P6 | **La divergencia de Respiración muere donde SÍ se ve.** `CATEGORY_COPY` de mente-streaks-core migrado a nombres lógicos tipados (journal/respirar/meditar/emociones); la pantalla Rachas dibuja con `<AppIcon>`. Censo endurecido: el archivo entra a los candados y el inventario poda sus 3 entradas divergentes. |
| 8015010 | P7 | **Limpieza.** 7.1 test de sol dice la verdad (solo sunlight es activable). 7.2 estado rojo (`unavailable` + cruz + RED) borrado de avatar-core y su test. 7.3 ArgosMark con id determinista (useId producía `:r3:`, inválido en `url(#...)`). 7.4 nudge: el foco arma la evaluación y se decide con el compile fresco; setTimeout con cleanup. 7.5 tres comentarios del tour viejo corregidos + `AppTour.tsx`/`app-tour-core.ts`/su test borrados (censo verifica: nadie los importaba). 7.6 header del censo corregido (la exclusión real es `help-circle-outline`). |

---

## 2 · Corrección al delivery anterior (obligada por el brief)

`DELIVERY_NOCTURNO_2026-08-02.md` afirmaba que en Journal, N-Back y Entrenar
**"el SÍ navega a su registro real"**. Eso NO estaba en el código: el modal
tenía un único botón "IR AHORA" con el mismo destino que el tap simple. Las dos
líneas del reporte (tabla P1 y alcance V1) quedaron corregidas en el propio
documento, y el SÍ que navega al registro real existe desde la Pieza 2 de este
run. Un reporte que describe algo distinto de lo entregado es peor que un bug:
queda anotado para que no se repita.

---

## 3 · Lo que NO se hizo, a conciencia

- **Migración 246 NO aplicada.** Su `DROP CONSTRAINT IF EXISTS` puede ser no-op
  si Postgres autogeneró otro nombre en 036, y el ADD crearía un segundo CHECK
  aditivo con éxito falso. El gate es humano: la query de verificación del
  nombre del constraint corre ANTES del `db push`.
- **`assets/backgrounds` sigue en 35 MB** (más que todo `assets/images` ya
  optimizado) y ningún guard lo cubre. Siguiente bolsa de peso; run propio.
- Borrar AppTour deja algunas imágenes editoriales sin ese consumidor
  (`disciplina-semanal.webp`, etc.); son carpetas compartidas con otros usos y
  el retiro de huérfanas de assets es parte del punto anterior.
- Las 7 huérfanas de HOY que el censo lista como AVISO (AgendaPreviewCard,
  HoyDayCardEditorial, HoyEditorialSection, MyProtocolCard, hoy-cards,
  hero-recommendation-service, score-coaching-core) siguen ahí: el brief de
  este run no las pedía y borrarlas arrastra imágenes y tests (ojos humanos).

## 4 · Suite completa en instalación limpia

`npm ci && npm test` se corrió en Windows (instalación limpia desde lockfile):
**resultado en la sección 6**. Linux limpio sigue pendiente: no hay Linux en
esta máquina; el CI de GitHub Actions (gate tsc bloqueante) lo dirá en el push.

---

## 5 · Verificación en dispositivo, para Enrique

1. Instalar **Sueño, Glucosa o Cetonas** dice lo que de verdad pasa (sin
   prometer fila), y **Movilidad** ya no ofrece instalar.
2. Tap largo en **Entrenar, Journal y N-Back** ofrece **dos** opciones: SÍ va
   al registro real (logger de fuerza / entrada de journal / partida), NO
   cierra.
3. La card de la orbe aparece **la primera vez que abres HOY en el día**.
4. Romper ayuno a las **9:30** aparece en su lugar de la mañana, alineado.
5. Empezar el tour y navegar por tu cuenta: **el tour se pausa** (pastilla
   Seguir tour) y no te regresa; volver a la pantalla del paso lo reanuda.
6. La pantalla **Rachas** dibuja Respiración con su icono, no con la hoja de
   Grounding.
7. El **mark de ARGOS en el chat** se ve con degradado, no en negro (se monta
   muchas veces ahí: es el lugar donde el id inválido dolería).

## 6 · Resultado de `npm ci && npm test`

Corrido el 2026-08-03 en Windows, instalación LIMPIA desde package-lock
(npm ci borra node_modules y reinstala): **exit 0 · 237 test files · 2539
tests · todos en verde** (17.1 s de suite). Lo que sigue sin existir es la
corrida en **Linux limpio**: esta máquina no lo tiene; el primer veredicto
real lo dará el CI de GitHub Actions con el push de esta rama.
