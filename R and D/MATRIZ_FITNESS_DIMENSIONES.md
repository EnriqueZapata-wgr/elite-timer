# 🧬 MATRIZ FITNESS — dimensiones del tag de ejercicio (moat MB-3)

**Fecha:** 2026-07-24 · **Autor de los ejes:** Enrique (Cowork estructura). **Uso:** cada ejercicio de la biblioteca (MoveKit + propios) se taggea en estos ejes → el **algoritmo generador determinista** razona sobre ellos para armar cualquier rutina, rotar día a día y filtrar por equipo disponible. Ver `JOURNEY_FITNESS_MB3.md` y `project_fitness_biblioteca_matriceada`.

## Ejes (v1 — cerrados con Enrique)

### 1 · Patrón de movimiento
`empuje · tracción · bisagra · sentadilla · zancada · rotación · anti-rotación · locomoción`
→ El algoritmo balancea patrones (no 3 empujes seguidos), arma splits y full-body coherentes.

### 2 · Dinámica (tempo/velocidad de ejecución) *(definido por Enrique)*
Espectro de velocidad de la repetición:
- **Explosivo** — máxima velocidad concéntrica (potencia).
- **Normal** — subir/bajar a la velocidad natural y posible.
- **Súper-lento (tempo)** — muuuy lento, de 10 s hasta 2 min por rep *(Enrique lo llamó "isotónico"; se re-etiqueta a "súper-lento/tempo" para no chocar con el término de libro donde isotónico = cualquier contracción dinámica).*
- **Isométrico** — sin movimiento (plancha, silla rumana / wall sit).

→ Modula selección por objetivo (explosivo→potencia; súper-lento→tiempo bajo tensión/control; isométrico→estabilidad).

### 3 · Lateralidad
`unilateral · bilateral`
→ Unilateral dobla tiempo (ambos lados) — entra en el cálculo de duración de sesión.

### 4 · Musculatura *(granularidad intermedia — Enrique 2026-07-24)*
`músculo principal · secundarios · sinergias · grupos`
→ Base la siembra MoveKit. El algoritmo cubre grupos objetivo y evita solapar en exceso.
→ **Regla de granularidad INTERMEDIA:** separar cabezas que se entrenan distinto (deltoides **anterior / medio / posterior**, pec superior/inferior, etc.), NO las que no se aíslan funcionalmente (vasto medial vs externo del cuádriceps, cabezas individuales del isquio). Precisión útil, no precisión falsa.
→ **Habilita el bro-split:** este eje permite el modo de selección "por músculo" (ver Modos de enfoque abajo).

### 5 · Equipo *(el eje que hace la magia "arma con lo que tengo")*
`peso corporal · mancuerna · barra · kettlebell · banda · máquina · TRX · aparatos · banca`
→ Filtro duro: el usuario declara lo que tiene → el generador solo usa ejercicios ejecutables.

### 6 · Objetivo / cualidad *(pills por ejercicio — MANEJA el slotting)*
`fuerza · hipertrofia · potencia · resistencia muscular · capacidad aeróbica · anaeróbica · movilidad · estabilidad · skill`
→ Cada ejercicio lleva **pills de las cualidades que SÍ aplica** — el algoritmo lo mete a un slot de la escalera SOLO si el ejercicio está etiquetado para esa cualidad. No se deriva de "es multiarticular".
→ **Refinamiento (Enrique 2026-07-24):** un multiarticular NO es automáticamente "pesado/fuerza". Ej: flexiones son multiarticulares pero **no cargables** → su cualidad es resistencia/hipertrofia, NO fuerza pesada. Por eso se agrega el atributo **`cargable`** (¿admite carga externa pesada?): el slot "multiarticular pesado" exige `cargable = sí` + pill `fuerza`. Sin equipo de carga, la sesión sesga honestamente a resistencia/metabólico y lo dice.
→ Define además el molde de la rutina (sets/reps/intensidad) y el descanso (ver eje 10).

### 7 · Nivel / capacidad + familia de progresión *(clave para subir/bajar automático)*
`principiante · intermedio · avanzado · **atleta**` (4 niveles — Enrique agregó atleta) + **el ejercicio "más fácil" y "más difícil" de su misma familia**
→ El nivel define el **techo de capacidad** (volumen recuperable) que a su vez capa cuánto trabajo cabe (ver eje 10 / tiempo). El algoritmo regresa o progresa dentro de la familia según el desempeño/nivel. Sin LLM: la familia es un enlace explícito en la matriz.

### 7b · Senior *(META-TAG ortogonal — Enrique 2026-07-24)*
`senior = persona mayor`. **NO es un 5º nivel** — se combina con cualquier nivel (senior-principiante, senior-intermedio, senior-atleta). Modula: selección hacia **variantes amables con articulaciones** (excluye alto impacto/riesgo), baja el techo de volumen (~20%) y sube recovery. Cada ejercicio lleva pill **`senior-apto sí/no`**.

### 8 · Método ATP *(tu capa)*
`3-5 (Galpin) · EMOM Auto · Myo-reps (auto) · estándar · superseries · rest-pause · cluster sets · dropsets`
→ Qué métodos propietarios aplican a ese ejercicio. Conecta con el motor de ejecución unificado. **Ya construidos en código:** `Method35.tsx`, `EMOMAuto.tsx`, `MyoReps.tsx`.
→ **EMOM Auto (Enrique 2026-07-24):** herramienta estrella para **estrés metabólico + hipertrofia + alto volumen en poco tiempo** (acidosis muscular). Arranca el set al inicio de cada minuto, descansa lo que sobra; el auto-ajuste regula la carga según si completaste las reps (completas con margen → sube; fallas → baja). Ej: EMOM 8×8 / 10×10 de prensa, hack, lagartijas, burpees, pull-ups.
→ **`EMOM-apto` graduado por nivel** ("cuidando el vehículo ligado a la experiencia"): **Todos** (máquina/cable/banda/peso corporal — el vehículo más seguro bajo fatiga) · **Intermedio+** (mancuerna/KB/goblet/smith) · **Avanzado** (barra libre no-espinal: sentadilla/press) · **No** (olímpicos/explosivos, bisagra espinal con barra libre = peso muerto/RDL/buenos días, e isométricos/estiramientos). Columna en la matriz auto-taggeada.

### 9 · Contraindicaciones / banderas *(capa Mariana)*
`articulación en riesgo · embarazo · hipertensión (isométricos largos) · lesiones comunes · hernias`
→ El generador excluye o sustituye según el perfil/padecimientos del usuario (conecta con el cuestionario activo-vs-resuelto y el ciclo/embarazo).

### 10 · Descanso *(alimenta el cálculo de tiempo de sesión)*
**Refinamiento (Cowork, aprobado por Enrique):** hay DOS tipos de descanso distintos y el modelo los separa para que el cálculo de tiempo sea correcto:

**a) Descanso ENTRE series — por objetivo del bloque:**
| Objetivo del bloque | Descanso entre series |
|---|---|
| Fuerza (neural) | **2-4 min** |
| Estrés metabólico | **15-45 s** |

**b) Micro-descanso INTRA-cluster — propiedad del MÉTODO (eje 8), no del objetivo:**
| Uso | Micro-descanso |
|---|---|
| Daño al sarcómero (rest-pause / myo-reps / cluster) | **1-9 s** entre mini-series |

→ El "1-9 s" es el mini-descanso *dentro* de una serie de rest-pause/myo — "llegar al fallo de forma segura y suave" (confirmado Enrique). Va atado al método, no al objetivo.
→ Cálculo de duración: `Σ (sets × (tiempo_trabajo + descanso_entre_series)) + (mini-series × micro-descanso)` para bloques con método de cluster.

### 11 · Benchmark de edad *(conecta con el puente edad↔entrenamiento)*
`Tier A (primaria) · Tier B (secundaria) · no`
→ **Enrique: SÍ, que se conecten.** Un ejercicio marcado como benchmark, al PR-earse, alimenta la Edad ATP (Tier A = puntos sólidos; Tier B = nudge acotado en proyección). Ver `project_puente_edad_atp_entrenamiento`. Los 4 Tier A ya viven en el motor V7/V6; los 6 Tier B están cerrados.

---

## Modos de enfoque / selección (Enrique 2026-07-24)
Dos formas de que el usuario elija qué entrenar (doctrina guiado-no-prisionero: patrón por default, músculo opt-in):
- **Por patrón (simple):** Empuje (tren sup) · Tracción (tren sup) · **Pierna empuje** (sentadilla/zancada = dominante rodilla/cuádriceps) · **Pierna tracción** (bisagra = dominante cadera/isquio-glúteo) · Full body. *(La pierna se separa en empuje/tracción — sale gratis del eje 1 patrón.)*
- **Por músculo (bro-split):** el usuario marca músculos sueltos (hombro+cuádriceps un día, bíceps+pecho+pantorrilla otro...) y el motor arma con ejercicios que impactan esos músculos (eje 4). Para quien entrena a la vieja escuela.

## Decisiones de granularidad y sourcing (Enrique 2026-07-24)
- **Variante por modalidad = fila propia.** Cada versión por equipo es su PROPIA fila con sus pills: Sentadilla barra / goblet / hack / smith / libre / prensa son 6 ejercicios distintos, no uno con "equipo variable". Se repite el nombre pero la accesibilidad por equipo y la intensidad quedan precisas. **Resuelve el hueco de equipo:** al soltar un equipo, el motor cambia a otra VARIANTE ejecutable (hip thrust barra → banda → puente peso corporal), no deja un ejercicio imposible.
- **El tiempo LLENA hasta el techo de capacidad.** El nivel define un techo de volumen recuperable (principiante ~35 min · intermedio ~55 · avanzado ~78 · atleta ~110; senior ×0.8). `tiempo_efectivo = min(tiempo_usuario, techo)`. Si el usuario tiene más tiempo que su techo → el motor lo dice honestamente y manda el excedente a movilidad/recovery (no rellena con volumen basura que lesiona). **Atleta** existe justo para usar sesiones largas.
- **Construir la matriz DESDE MoveKit.** El catálogo licenciado de MoveKit es la base (nombre, músculo, equipo, dificultad, clip); ATP le monta encima las pills propietarias (cualidad, cargable, método ATP, benchmark edad, senior-apto, contraindicaciones). Convierte "inventar 500 ejercicios" en "taggear un catálogo existente". Ver [[project_fitness_biblioteca_matriceada]].

## Notas de diseño / pendientes
- ✅ **Eje 2 (dinámica):** RESUELTO — 4 categorías de tempo (explosivo/normal/súper-lento/isométrico), "isotónico"→"súper-lento".
- ✅ **Eje 6 (cualidad):** RESUELTO — pills por ejercicio + atributo `cargable` manejan el slotting (un multiarticular no cargable no es "pesado").
- ✅ **Eje 7 (nivel):** RESUELTO — 4 niveles (+atleta) + senior como meta-tag ortogonal.
- ✅ **Eje 10 (descanso):** RESUELTO — entre-series (por objetivo) + micro-descanso intra-cluster (por método).
- **Siguiente:** licenciar MoveKit → importar catálogo → taggear pills (semi-automático: su dificultad→nuestro nivel, su equipo→nuestras variantes/equipo, músculo→ejes 1/4). De ahí sale el brief MB-3 de la biblioteca matriceada.
