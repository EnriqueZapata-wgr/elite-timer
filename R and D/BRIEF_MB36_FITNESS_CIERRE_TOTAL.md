# 🏁 MEGA BRIEF · MB-3.6 — CIERRE TOTAL DE FITNESS (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb36-fitness-cierre` desde `main` (ya trae MB-3 + MB-3.5 + bump 1.6.0). NO merge, tsc + tests verdes, Cowork audita.
**Mandato de Enrique:** *"todo completo de una vez, sin huecos y a tope de calidad."* El batch puede alargarse — **la calidad manda sobre la velocidad**. Encadena los 5 bloques EN ORDEN.
**Cierra en build nativo** (Health Connect / HealthKit son deps nativas). El bump de versión va DESPUÉS, cuando Cowork audite — no lo toques.

## ⚠️ REGLAS DE ESTA CORRIDA
1. **Bloques completos, nunca a medias.** Di al entregar cuáles quedaron 100%.
2. **Sin parches ni stubs.** Doctrina Enrique: si algo no se puede cerrar bien, se flaguea, no se deja a medias.
3. **Nada de hardcodear colores.** Todo sale de `src/constants/brand.ts`.
4. Migraciones **idempotentes + RLS + policy**.

## 📚 FUENTES (leer antes de codear)
- `docs/DESIGN_SYSTEM.md` — **los 4 ejes** (cohesión · jerarquía · profundidad · restricción). Es la vara.
- `R and D/JOURNEY_FITNESS_MB3.md` — los 5 momentos del journey.
- `R and D/MATRIZ_FITNESS_DIMENSIONES.md` · `R and D/METODOS_ATP_AUTOAJUSTABLES.md`.
- Referencia de calidad ya lograda: **Mente V1.5.2** (hub, player, cards). Fitness debe sentirse del mismo sistema.

---

# BLOQUE 1 · ARQUITECTURA DE NAVEGACIÓN

### 1.1 Las 4 fusiones (aprobadas por Enrique)
- **`fitness-strength` + `personal-records` → una sola pantalla.** Hoy ambas giran en PRs/benchmarks = un dato en dos lugares (viola la doctrina navegación-vs-consulta). Conserva lo mejor de las dos.
- **Matar la pantalla `/timer`.** `fitness-hiit` ya trae Tabata/EMOM/AMRAP/30-30 con voz. Retirar la ruta y sus enlaces (o redirigir a HIIT si hay deep links vivos).
- **`training-methods` → dentro de la biblioteca.** La teoría de los 3 métodos vive mejor junto a los ejercicios (sección o tab de la biblioteca), no como destino suelto.
- **Retirar ARGOS de Fitness por completo.** Tu propia lectura fue que hoy genera desde cero ignorando el algoritmo, así que "ARGOS, ajústala" es una promesa a medias. **Se retira** hasta que ARGOS de verdad tome el output del generador. Mejor un botón menos que una promesa incumplida.

### 1.2 El hub abre con LA SESIÓN DE HOY *(Momento 1 del journey — lo más importante del bloque)*
Hoy `fitness-hub` abre con "ESTA SEMANA" + 3 cards de navegación: eso es un **menú**, no un asistente.
**Default (patrón Oura "one big thing"):** el hub abre con **la sesión de hoy** como protagonista único — qué toca, cuánto dura, y **un botón grande para empezar**. Debajo, el progreso de la semana (lo que ya existe) en tamaño secundario. Las 3 cards bajan a navegación terciaria.
- Si no hay rutina generada hoy → CTA "Genera tu sesión" (misma jerarquía, distinto copy).
- Si ya entrenó hoy → estado de completado + qué logró (no ofrecer entrenar de nuevo como si nada).

### 1.3 Nivel del usuario al perfil
Hoy vive en AsyncStorage del generador. **Default:** campo en el perfil (migración idempotente), preguntado en el onboarding de Fitness la primera vez, editable desde ajustes. El generador lo lee de ahí; AsyncStorage queda solo como caché.

---

# BLOQUE 2 · MOVILIDAD COMPLETA
Hoy `mobility-assessment` es un placeholder de 50 líneas y la pantalla de movilidad se retiró. El área existe en el scorer pero no tiene casa.
**Default: evaluación + rutinas.**
- **Evaluación:** pantalla real de captura de los **7 tests de movilidad** que el scorer ya lee (`getLastMobilityAssessment` / `mobility_assessments`). Guiada, un test por paso, con explicación y ejemplo visual de cada uno (doctrina: guiar con ejemplos, explicar siglas). Resultado con lectura honesta + comparación contra tu evaluación anterior.
- **Rutinas de movilidad:** el generador debe poder armar sesiones con **objetivo = movilidad**, usando los ejercicios de la matriz taggeados con esa cualidad (estiramientos, movilidad, recovery). Reusa el motor existente — NO escribas un segundo generador.
- Reactivar la entrada de Movilidad en la navegación (ya no es placeholder).

---

# BLOQUE 3 · CARDIO COMPLETO

### 3.1 Registro manual ultra-fácil *(la mitad que se usa a diario)*
Enrique: *"debe poder loguearse manual con mucha facilidad."*
**Default: 2 taps para el caso común.** Disciplina (correr/bici/nadar/remo) + duración → guardado. Todo lo demás (distancia, FC, notas) **opcional y plegado**. Prellenar con la última sesión de esa disciplina como sugerencia. Nada de formularios largos.

### 3.2 Import desde apps de salud *(Strava · Garmin · Samsung · Google, de un jalón)*
**Decisión arquitectónica (bakeada):** NO integrar cada proveedor por separado. **Health Connect (Android) + HealthKit (iOS)** — Strava, Garmin, Samsung Health y Google Fit escriben ahí. Una integración, todas las fuentes.
- Elige la librería compatible con Expo SDK 54 (p. ej. `react-native-health-connect` + un wrapper de HealthKit) y **flaguea en el delivery cuál usaste y si pide config plugin**.
- **Permisos y consentimiento:** pantalla propia explicando **qué datos se leen y para qué** antes de pedir el permiso del sistema. Solo lectura. Solo entrenamientos (tipo, duración, distancia, calorías, FC media) — no leer más de lo necesario (minimización de datos).
- **Import manual primero** (botón "Importar entrenamientos"), con opción de sincronización automática como preferencia opt-in. Nunca sincronizar sin que el usuario lo pida.
- ⚠️ **DEDUPE — footgun crítico:** un entrenamiento importado NO debe duplicar uno registrado a mano (ni al revés). Marca el origen (`fuente: manual | health_connect | healthkit`) + un identificador externo del proveedor, y dedupea por (fecha, disciplina, duración aproximada). **Un test que lo cubra.**
- ⚠️ **ECONOMÍA:** hoy `log-cardio` otorga electrones. Un import masivo NO puede farmear la economía. **Default:** los importados otorgan igual que el manual **pero con el mismo cap diario y sin retroactividad** (solo cuenta el día de hoy). Verifica contra la idempotencia server-side existente. Si hay duda, **no otorgues por importados y fláguealo**.
- Estado vacío honesto: si no hay app conectada, explicarlo sin culpar al usuario.

### 3.3 La sesión unifica
`workout_sessions` debe poder agrupar **fuerza + cardio del mismo día** (hoy solo agrupa fuerza). El cierre de sesión muestra ambos.

---

# BLOQUE 4 · UPGRADE UI/UX — ATP EDITORIAL GRADIENTE *(el que pidió Enrique como "magia pura")*

**La vara son los 4 ejes de `docs/DESIGN_SYSTEM.md`:** cohesión · jerarquía · profundidad · restricción. Pregunta de control en CADA pantalla: *¿hay un protagonista claro? ¿respira? ¿el lima está solo donde debe? ¿las cards se despegan del fondo?*

### 4.1 Alcance: TODAS las pantallas de Fitness
hub · entrenar · generador (auto + explorar) · biblioteca · detalle de ejercicio · strength-session · cierre de sesión · movilidad · cardio (manual + import) · fuerza/records fusionada · HIIT · **y `log-exercise`** (kit viejo — Enrique quiere cero huecos).

### 4.2 Reglas duras
- **Cero hex crudo.** Todo de `brand.ts` (`BG`/`BORDER`/`TEXT`/`ELEVATION`/`ACCENT_ROLES`/`PILLAR_GRADIENTS`).
- **Lima como acento, jamás como bloque plano de fondo.** Doctrina `project_design_system_atp_no_lime_brutalist`. Degradados + fondos editoriales; molde de referencia "Mis Datos" y Mente V1.5.2.
- **Profundidad real:** superficies en capas (`ELEVATION`) + glow selectivo solo en el elemento heroico. Sin esto todo se ve muerto.
- **Un protagonista por pantalla**, con aire alrededor. Si dos elementos compiten, uno baja de jerarquía.
- **Cero huecos negros, cero snake_case crudo, cero texto sin traducir.**

### 4.3 Movimiento — estándares concretos (no "hazlo bonito")
- **Todo lo táctil:** spring scale + haptic en **pointer-down** (`AnimatedPressable`). **Prohibido `opacity: 0.7` plano.**
- **Duraciones:** feedback de botón **100-160 ms** · popovers/tooltips 125-200 ms · dropdowns 150-250 ms · modales/drawers 200-500 ms. **Regla: la UI se queda bajo 300 ms.**
- **Easing:** lo que entra o sale usa **ease-out** (arranca rápido = se siente responsivo). **Nunca ease-in en UI** — retrasa el movimiento justo en el instante que el usuario mira. Movimiento en pantalla = ease-in-out. En Reanimated, curvas fuertes equivalentes a `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Listas entran escalonadas:** `FadeInDown.delay(i*40).springify()`. Nada aparece de golpe.
- **Expandir/colapsar:** `LayoutAnimation.configureNext(...easeInEaseOut)`.
- **Frecuencia manda:** lo que el usuario ve decenas de veces al día se anima **poco o nada**; lo raro o celebratorio (cierre de sesión, PR nuevo) **sí puede tener deleite**.
- **Nada aparece de la nada:** entrar desde `scale(0.95) + opacity 0`, nunca desde `scale(0)`.
- **Respeta reduce-motion** si el sistema lo pide.

### 4.4 Redistribución de elementos DENTRO de cada card + caza de redundancia *(pedido explícito de Enrique)*
La fusión de pantallas (bloque 1) resolvió la redundancia **entre destinos**. Falta la de **dentro de las cards**.
**Default — hazlo en 3 pasos y entrega el resultado para veto:**
1. **Inventario por card.** Para cada card de Fitness (hub, entrenar, generador, resultado de rutina, ejercicio en sesión, biblioteca, detalle, cierre, records, cardio, movilidad) lista **qué información muestra hoy**, dato por dato.
2. **Caza de repetidos.** Marca todo dato que aparezca en **más de un lugar** (doctrina `un dato = un lugar`). Ej. típico: el mismo PR o el mismo contador de series visible en card + header + resumen. Decide **dónde vive** y quítalo del resto.
3. **Jerarquía dentro de la card.** Cada card tiene **UN dato protagonista** (el que motiva el tap), soporte secundario, y **lo que sobra se va**. Criterio duro: *si un dato no cambia la decisión del usuario en esa pantalla, fuera.* Menos densidad, más aire — coherente con el eje de jerarquía del design system.
**Entregable:** tabla `card → dato → veredicto (protagonista / soporte / se va / se mueve a X)` en el delivery, para que Enrique la vete. **Aplica los casos obvios; los dudosos los propones sin ejecutar.**

### 4.5 El clip es el protagonista
Los mp4 del bucket (ya cableados en MB-3.5) deben verse **grandes, en loop, sin costura**: fade del poster al clip sin parpadeo, esquinas y sombra consistentes con el sistema, y **fondo crema del clip integrado deliberadamente** como "placa anatómica" dentro del dark (decisión de Enrique) — que se vea intencional, no accidental: contenedor con su propio tratamiento, no un rectángulo claro flotando.

---

# BLOQUE 5 · CIERRES FINOS
- **Broad jump:** hoy está mapeado pero inerte porque el runner registra reps y su benchmark es distancia. **Default:** agregar captura de **distancia** para ese benchmark y activar su nudge. Si no se puede hacer limpio, déjalo inerte y explica por qué (no lo actives mintiendo).
- **Barrer los huecos que queden** de MB-3.5 (`log-exercise`, HIIT) — ver bloque 4.
- Verificar que **dead-hang** (isométrico, segundos) se registre bien desde el runner.

---

## Protocolo
`feat/mb36-fitness-cierre` desde `main`. NO merge. `npx tsc --noEmit` (0) + tests verdes + `npx eslint` sin errores nuevos. **Delivery con:** bloques al 100%, librería elegida para Health Connect/HealthKit y si pide config plugin, checklist de device-test por bloque, y flags honestos de lo que no se pudo cerrar limpio. Cowork audita código y visual; después va el bump de versión + build nativo.
