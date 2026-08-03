# 🌙 DELIVERY · AWAY RUN NOCTURNO · 2026-08-02

**Rama:** `feat/nocturno` · worktree `../ATP-nocturno` · 16 commits + este reporte.
**Gates:** `tsc` 0 errores, Vitest 238 archivos / 2532 tests, `npm run censo` VERDE — antes de CADA commit.
**Nada quedó rojo. Nada quedó a medias sin documentar.**

⚠️ **Nota de base:** el brief pedía ramificar de `main`, pero A2 exigía el ratchet de
iconos que solo existe en `feat/mb19-2-enchufe` (sin mergear). La rama se ramificó de
`801cab1` (= main + MB-19.2), patrón ya usado en tramos encadenados. **Al mergear:
MB-19.2 entra junto o antes.**

---

## 1 · Qué se hizo, por tramo y por commit

### TRAMO A — Lo que protege todo lo demás (5/5)

| Commit | Pieza | Qué |
|---|---|---|
| fc510d5 | A1 | CI corre `npm test` + `npm run censo` después del typecheck. El job conserva el nombre `tsc` (branch protection). |
| d2413bb | A2 | `GLIFOS_DE_FUNCION` se DERIVA de `app-icon-map.tsx` (con guard anti-rot) + glifos legacy con evidencia git (58ed030) + rellenos pelones ligados a posición. Dedup por par → conteo de USOS (`::xN`). Inventario regenerado: 236 pares → 292 usos. Verificado con sonda: `timer-outline` en archivo nuevo YA NO pasa. |
| a382c43 | A3 | `mente-hub-core` migra a nombres lógicos (muere leaf-outline=Grounding en Respiración) y entra como QUINTO registro a los candados del censo. |
| 19c7120 | A4 | El botón de Ajustes en YO pasa a `<AppIcon name="ajustes">`. |
| 465d832 | A5 | **Imágenes: 56 MB → 10 MB (-82%).** Modo `--webp` en el script existente (129 convertidas, q82, máx 1200px, 40.13 MB ahorrados), 19 huérfanas borradas (5.6 MB, verificadas contra 1031 archivos de código), 179 `require()` recableados en 22 archivos. Guard permanente `assets-references.test.ts` que en su PRIMERA corrida cazó un rompe-builds latente: los 8 wav de N-Back **jamás entraron a git** (vivían sin trackear en una máquina); se commitean (448 KB). |

### TRAMO B — Los bugs del recorrido (6 ejecutadas, 2 skips, 1 rescope)

| Commit | Pieza | Qué |
|---|---|---|
| 886b8f2 | B1 | Mig **246**: el CHECK de `cardio_sessions.source` gana `health_connect`/`healthkit`. Smoking gun: 225 declaró el cambio en un comentario y nunca escribió el ALTER. Test de contrato código-vs-CHECK + superset + presencia del DROP. |
| e2d38b9 | B2 | `esImportable` (5 min mínimo; 'other' sin distancia fuera) en el núcleo → el auto-sync lo hereda; checkboxes pre-import (desmarcar ANTES); copy honesto del estado vacío. |
| — | B3 | **SKIP** (ver §2). |
| bfbd041 | B4 | Kicker del hero: NUTRICIÓN → HIDRATACIÓN (con acento, como sus hermanos). |
| c28336a | B5 | ConfigRow gana prop `unit`; la fila Ciclos deja de decir segundos. |
| — | B6 | **SKIP** (ver §2). |
| aca5a80 | B7 | **RESCOPE** (ver §2): receta sin tipo ya no cae siempre en snack_am (default por hora); `defaultMealTypeByHour` consolidado en `meal-times-core` (vivía duplicado); bug colateral cazado: `pre/post_workout` violaban el CHECK de frecuentes en silencio → clamp a 'other' (también en el increment). |
| 8c86988 | B8 | Player de Mente: instancia única a nivel módulo + checks de `cancelled` en la ventana de carrera + `pause()` síncrono en cleanup (el release de Android se difiere). Barra: `pointerEvents="none"` en track/thumb — `locationX` era relativo al thumb agarrado y por eso "reiniciaba". Respiración con guía y binaurales usan el mismo player: arreglados gratis. |
| 7801ed4 | B9 | Amarillos legacy → `ATP_BRAND.amber` en lo OBVIO (Method35 #fbbf24 + rgba, training-methods, BlockCard #F39C12). Lo no obvio, saltado (ver §2). |

### TRAMO C — MB-20, el día (4/4, con alcance V1 documentado)

| Commit | Pieza | Qué |
|---|---|---|
| 49c502f | P1 | **TAREAS y AGENDA, una lista dos lentes.** `tareas-core` puro (bloques mañana/tarde/noche espejo de /agenda, hora canónica por hábito, clasificación de gestos) + `TareaRow` (tap navega; tap largo palomea con llenado 350 ms cancelable + vibración + atenuado; reduce motion degrada) + paloma inteligente (meditar/respirar/cardio registran sesión REAL: mind_sessions / cardio_sessions manual; journal/nback/entrenar navegan a su registro real) + hidratación inline +250 ml + ayuno navega y fin + card de la orbe colapsable con memoria por día + recordatorio contextual (3 idas sin completar → burbuja, máx 1/semana, contador local) + auto-foco en el bloque actual + progreso por bloque y global. El ATP Score sale de HOY; el motor sigue intacto en compileDay. Contrato de escritura extraído a `tarea-actions` (dual write + ledger idempotente + espejo Agenda + emit). |
| 6b7a6f8 | P2 | **Instalar = activar.** Mosaicos con estado (punto lima), tap largo instala/desinstala, `+ agregar` abre modo instalación (tap directo instala). Núcleo puro: apps con toggles / fijas (MANDATORY: journal, cardio) / sin toggle activable (ayuno, sueño, glucosa, cetonas → installed_apps). Desinstalar JAMÁS borra datos. |
| 9582162 | P3 | Mig **247**: `installed_apps TEXT[]` en user_day_preferences (idempotente, RLS heredado, NOTIFY pgrst). Cliente tolera su ausencia (retry de columna fantasma). Lo demás es local a propósito (orbe colapsada, contador del nudge). |
| 27a56b4 | P4 | **Tour de la orbe (12 pasos)** sobre pantallas reales, no-bloqueante (se puede probar el gesto), Terminar tour en todos, retomable desde Ajustes, llave nueva a propósito, guion blindado por test (cero em dash, siglas explicadas), analytics. **4.3:** el disparador de `alerta` ya existe (inbox sin leer → orbe en alerta; jamás roja). **4.4:** nace `ArgosMark` (Svg puro), ArgosAvatar RETIRADO (chat y botón flotante pasan a la orbe; el estado rojo muere: orbe apagada + RateLimitCard con palabras), ojos Ionicons migrados en 5 pantallas, y `brand-palette` es el módulo puro que brand.ts y la orbe comparten (fin del espejo a mano). |

**Lo excluido por el brief se respetó:** la migración de protocolos a packs de hábitos NO se tocó.

---

## 2 · Qué me salté y por qué (la sección que más importa)

### Piezas saltadas completas

**B3 · Copy del conector — premisa FALSA, ejecutarla metería copy falso.**
El brief dice que la pantalla omite Apple Health. Verificado contra el árbol y git: el
consentimiento de `cardio-import` ramifica por OS y en iOS dice "Salud de Apple (Apple
Health)" **desde MB-5 (670745e)**; Ajustes > Conexiones lista "Apple Health · Google
Health · Oura · Garmin · Samsung · Whoop" **desde #137 (517e6bb)**. La única card sin
Apple Health es la del estado `sin_app`, que **solo puede ocurrir en Android** (Health
Connect no instalado): mencionar Apple Health ahí sería factualmente incorrecto. El
brief se escribió contra una versión anterior.

**B6 · Emociones, dos puertas — premisa FALSA, el destino ya es distinto.**
"¿Cómo estás?" → `/checkin` (registra). "Explorar el territorio" → `/emotion-exploration`,
que ya ES exactamente lo que el brief pide construir: mismo MoodPlane, mismo zoom,
descripciones, **cero writes** (verificado: el archivo no importa supabase ni electrones;
su único cruce a registro es el CTA explícito "ES LO QUE SIENTO" → checkin con gate
'mapa', deliberado desde MB-10/MB-16). Lo defendible es que las dos pantallas son
**gemelas visuales** y en device pueden SENTIRSE iguales. Corregir eso es decisión de
producto con dos opciones baratas: endurecer el hint de exploración ("Aquí no se
registra nada") o degradar el CTA de cruce — pero ese cruce alimenta el entry_gate
'mapa' (mig 238) y la analítica de puertas. No se decide de noche sin Enrique.

### Rescopes y saltos parciales dentro de piezas

**B7 · Tipo de comida — la pieza briefeada ya existía.** El selector con default por
hora vive en los TRES flujos (food-scan chips, food-text pills, food-register pantalla
completa) y `mealType` llega íntegro al insert. Ejecutar el brief habría DUPLICADO UI.
El rescope honesto que sí se hizo: el único flujo sin elección ni default era registrar
una receta (hardcode `snack_am`) + el bug colateral del CHECK de frecuentes.

**B9 · Amarillos no obvios — el brief lo manda: "no lo inventes".**
- `#fb923c` de EMOMAuto + training-methods (emom_auto): DOS candidatos válidos
  (`ATP_BRAND.amber` por precedente MB-3.6 vs `SEMANTIC.warning` por matiz naranja) y
  además colisión de identidad con el chip del Método 3-5 en log-exercise. Veto de diseño.
- `BLOCK_COLORS.transition #F5A623` (brand.ts): ya ES token; cambiar su valor repinta
  prep/transition en TODOS los timers, no solo HIIT.
- Las pantallas HIIT en sí NO se tocaron: están limpias desde MB-3.6 y su amber visible
  es el token correcto — "corregirlo" habría sido una regresión.

**A2 · `flash-outline` fuera de la lista del brief.** Sin evidencia git de que haya
dibujado una función del registro; hoy es insignia de rango en ELECTRON_RANKS (que el
propio censo documenta como no-función) + chrome de energía en ~18 archivos. Incluirlo
= ~18 entradas de ruido. Documentado en el propio test.

**A5 · assets/backgrounds NO se tocó (35 MB, ~22 MB huérfanos).** Fuera del alcance
del brief ("fotos de assets/images/"). Es el segundo arreglo que más se vería: 6
huérfanas (~21.9 MB) + 5 JPG referenciados enormes (bg-night-low 5.4 MB). Para su
propio run con approve.

**A5 · retiro de huérfanas de HOY pendiente.** Los componentes que TAREAS reemplazó
quedaron desmontados pero NO borrados (AgendaPreviewCard, HoyDayCardEditorial,
HoyEditorialSection, hoy-cards, hero-recommendation-service, score-coaching-core,
AppTour + app-tour-core, HeroAgendaCard). El censo los lista como AVISO (no tumba).
Borrarlos arrastra imágenes, tests e imports: mejor con ojos humanos en el audit.

**MB-20 P1 · alcance V1 documentado:**
- La lente AGENDA muestra la misma lista con horas canónicas y completa con tap largo,
  pero los horarios finos y notificaciones POR EVENTO se editan en `/agenda` (puerta
  "Horarios y notificaciones" en la lente). Embeber ese editor era construcción mayor.
- Los eventos máquina de intervenciones/suplementos siguen viviendo en `/agenda`; a
  TAREAS solo entran los SMART accionables (romper ayuno). Unificación total de las
  dos fuentes (electrones vs agenda_event_logs) = run propio.
- Paloma inteligente con captura real SOLO donde existe writer limpio (meditar,
  respirar, cardio). Journal/N-Back/Entrenar: el SÍ navega a su registro real —
  fabricar un journal o un N-Back desde un modal sería registro deshonesto.
- La línea UV del boceto quedó como chip simple (UV + ventana de vitamina D).

**MB-20 P2 · V1:** instalar usa defaults inteligentes SIN las dos preguntas del brief
(momento/notifica) — "instalar debe sentirse como un gesto" pesó más; la pantalla de
ajustes finos por app (nivel 2) NO existe aún. Los flags `installable` del registry NO
se realinearon a la lista del doc (el registry de MB-19.2 marca más apps; realinearlo
es decisión de producto).

**MB-20 P4 · V1:** el tour NO recorta spotlight sobre el elemento (burbuja anclada
sobre la tab bar que señala con palabras) y NO se pausa si el usuario navega por su
cuenta (la burbuja persiste y Terminar tour siempre está visible). El ojo del CTA de
argos-recipes no migró a ArgosMark: vive sobre fondo lima y un mark lima ahí es
invisible.

**B8 · reproductor en segundo plano con notificación del sistema:** NO es de este run
(cambio nativo + build), tal como marca el brief. Queda escrito: requiere
`shouldPlayInBackground` ya presente + controles de lockscreen ya cableados; lo que
falta es UI de mini-player y decisión de UX al salir.

---

## 3 · El antes y después del peso de imágenes

| | Antes | Después |
|---|---|---|
| `assets/images/` | **56 MB** · 167 png/jpg (96 sobre 300 KB) | **10 MB** · 129 webp + 19 PNG de marca en raíz + 6 svg |
| Conversión | — | 129/129 sin errores, WebP q82, máx 1200 px, **-40.13 MB** |
| Huérfanas borradas | — | 19 archivos, **-5.6 MB** |
| `assets/audio/` | 8 wav de N-Back SIN trackear (builds limpios rotos) | +448 KB commiteados |

Objetivo del brief era "por lo menos a la mitad": quedó en **-82%**.
Pendiente fuera de brief: `assets/backgrounds` (35 MB) — ver §2.

---

## 4 · Qué necesita ojos humanos antes del merge

1. **Device test iOS y Android.** Crítico: (a) WebP en pantallas con `ImageBackground`
   de RN core (ej. fitness-train) — expo-image lo soporta seguro, RN core en iOS 15+
   debería, pero es EL riesgo visual de A5; (b) los 14 puntos de verificación del doc
   MB-20 (tap largo con llenado, paloma inteligente, lentes, instalar/desinstalar
   conservando historial, tour completo, burbuja del nudge); (c) player de Mente: back
   durante "Preparando…", back sonando, doble-tap en card, tap y drag de la barra,
   brincar al final; (d) import de cardio con checkboxes.
2. **db push de 246 + 247 ANTES del OTA** (regla 12). Antes del push: verificar el
   nombre real del constraint de cardio en la DB viva (query en cabecera de 246 — si
   difiere, el DROP es no-op y el fix no surte efecto) y el estado remoto de 238/245
   (query en cabecera de 247).
3. **Merge de MB-19.2**: esta rama lo contiene como base; entra junto.
4. **Audit Cowork** de los 16 commits + decisión sobre los archivos desmontados (§2).
5. **Decisiones de producto pendientes:** color de EMOM, BLOCK_COLORS.transition,
   gemelas visuales de B6, realineación de flags installable, y si el botón flotante
   de ARGOS sobrevive ahora que la orbe del tab bar es presencia permanente (hoy
   pueden verse DOS orbes en pantallas sin tabs).
6. **CI**: primer run en Linux de la suite completa (16 tests leen archivos del repo;
   riesgo bajo de line endings, verificar el primer verde en Actions).
7. **Copy del tour** (12 pasos): es el copy más leído de la app; merece pasada de
   Enrique y Mariana aunque el test blinde las reglas duras.

## 5 · Lo que quedó rojo

Nada. Los tres gates en verde en cada uno de los 16 commits, y la suite terminó en
238 archivos / 2532 tests (arrancó en 232/2483: +49 tests nuevos protegiendo el ratchet,
assets, el contrato de cardio, las reglas de import, TAREAS, instalar y el guion del tour).
