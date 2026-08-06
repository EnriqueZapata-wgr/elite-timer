# RESEARCH W2 — Entrenamiento Cognitivo / Brain Training

**Fecha:** 2026-07-22 · **Contexto:** competitivo para ATP (pilar Mente + N-Back Challenge planeado)
**Fuentes:** búsquedas web 2025-2026. Sin invención. Verificado contra FTC, PubMed/NCBI, Nature, App Store.

---

## TL;DR para Enrique

- **Veredicto N-Back (honesto):** Dual N-Back SÍ sube la puntuación en la propia tarea y en tareas casi idénticas (near transfer). El **far transfer** —que te vuelva "más inteligente", suba IQ fluido o mejore memoria de trabajo en la vida real— **NO está probado**; la evidencia en adultos sanos es negativa o nula. Hay señal positiva acotada en **poblaciones con TDAH** (estudio 2025: 18+ sesiones mejoraron memoria de trabajo en WAIS-IV). Todo lo demás es debate sin resolver.
- **Lección FTC (crítica para compliance ATP):** Lumosity pagó **$2M** (juicio de $50M suspendido) por prometer que sus juegos mejoraban desempeño en trabajo/escuela y prevenían Alzheimer/demencia/TDAH/PTSD **sin ciencia que lo respaldara**. La industria aprendió: **nunca prometas un resultado de vida real; vende el reto, no la cura.** LearningRx cayó después ($200K). La FTC declaró "uptick" de acciones: soporta claims con ciencia sólida o no los hagas.
- **Ruta del archivo:** `R and D/_RESEARCH_W2_COGNITIVO.md`

---

## Por app — condensado

### 1. Brain Workshop (Dual N-Back, open source, EL estándar)
- **Qué es:** app gratuita open-source en Python; la implementación de referencia del Dual N-Back, la que replica el protocolo del estudio original de Jaeggi.
- **Por qué es exitosa:** no por marketing sino por **fidelidad científica** — su "Jaeggi mode" emula el protocolo del paper original (4 matches visuales + 4 auditivos + 2 simultáneos por sesión; sube nivel a ≥90%, mantiene 75-90%). Es la que citan los biohackers/Reddit como "la de verdad".
- **Feature estrella:** Jaeggi mode + modos extendidos (Triple N-Back, Arithmetic N-Back) + gráficas/estadísticas y multi-perfil.
- **Signature de diseño:** minimalista, casi austero — cuadrícula 3x3 + audio. No hay "juego", hay señal pura. Su credibilidad ES su falta de azúcar.
- **Cómo evita claims:** es open source sin fines comerciales, no vende resultado ninguno. Cero superficie legal.
- **ROBA ESTO:** el algoritmo adaptativo exacto de Jaeggi (umbrales 90%/75%) como motor de dificultad honesto y auto-calibrado del N-Back Challenge.

### 2. Lumosity (el gigante caído)
- **Qué es:** la app original de "daily brain training", 40+ juegos sobre 5 áreas (velocidad, memoria, atención, flexibilidad, resolución).
- **Por qué es exitosa:** **+100M usuarios registrados, 8 mil millones de partidas.** Mecanismo: **gamificó tareas neuropsicológicas reales** — toma tests de laboratorio y los convierte en juegos con puntuación, baseline y progreso. Colabora con 40+ investigadores universitarios (halo de autoridad).
- **Feature estrella:** assessment inicial → programa personalizado por edad/meta que sube dificultad con tu progreso. Dashboard de "cognitive profile".
- **Signature de diseño:** juego colorido + puntuación numérica visible + comparación contra tu propio baseline = sensación de mejora medible.
- **Cómo evita claims (AHORA):** después de la multa borró toda promesa de vida real; hoy habla de "desafiar tu cerebro" y "cognitive research", no de curar ni de rendir mejor en el trabajo.
- **ROBA ESTO:** el modelo "test de laboratorio → juego con baseline personal" — pero SOLO comparando al usuario contra sí mismo, nunca prometiendo transferencia a la vida real.

### 3. Elevate (el pulido, App of the Year)
- **Qué es:** brain training enfocado en habilidades de comunicación/productividad (lectura, escritura, matemáticas, foco), 40+ juegos.
- **Por qué es exitosa:** **Apple App of the Year + Top 25 Apps 2025; ~200K descargas y ~$1M ingresos/mes.** Mecanismo: **posicionamiento premium + diseño impecable** y encuadre "mental fitness / metas", no "cura médica".
- **Feature estrella:** programa personalizado que se ajusta con el tiempo + juegos con estética editorial superior.
- **Signature de diseño:** el más bonito del segmento — tipografía, animaciones y sensación de app cara. El diseño ES el diferenciador.
- **Cómo evita claims:** encuadra todo como "mental fitness" y metas personales; los testimonios ("90% reporta mejor vocabulario") son percepción de usuario, no claim clínico.
- **ROBA ESTO:** el listón visual — el N-Back Challenge de ATP debe verse tan editorial como Elevate, no austero como Brain Workshop, pero con la honestidad de este último.

### 4. Peak (el gamificado)
- **Qué es:** 45+ juegos con toque académico (juego "Wizard" de memoria hecho con Cambridge; colaboraciones Yale/UCL).
- **Por qué es exitosa:** "la experiencia de brain training más entretenida" — su mecanismo es **adherencia por gamificación superior.** Buen juego = más días seguidos = retención.
- **Feature estrella:** "Coach" con IA que personaliza el plan según tus patrones + dashboard visual de perfil cognitivo por categoría.
- **Signature de diseño:** juegos cortos, muy pulidos, con feedback inmediato — pensados para caber en cualquier hueco del día.
- **Cómo evita claims:** apela a nombres de universidades como credibilidad ("developed with Cambridge"), no a promesas de resultado médico.
- **ROBA ESTO:** el "Coach" IA que lee tus patrones y ajusta el reto — encaja perfecto con ARGOS narrando el N-Back Challenge.

### 5. NeuroNation (el clínico-europeo)
- **Qué es:** 60+ ejercicios diseñados con neurocientíficos, muy orientado a personalización por debilidad cognitiva.
- **Por qué es exitosa:** mecanismo = **rigor percibido + personalización quirúrgica** (desarrollado con la Free University of Berlin). Identifica tu área más débil y la ataca.
- **Feature estrella:** assessment inicial que detecta tu punto débil → plan que lo targetea específicamente.
- **Signature de diseño:** más "programa de entrenamiento serio" que juego; progresión estructurada tipo plan de gym.
- **Cómo evita claims:** apoyo académico visible (universidad) y lenguaje de "entrenamiento", esquivando promesas terapéuticas.
- **ROBA ESTO:** la lógica "detecta tu área más débil y prescribe" — casa con el motor Mi Protocolo de ATP (prescribir el reto según el DX del usuario).

### 6. Impulse (el growth machine)
- **Qué es:** brain training mainstream, catálogo amplio de mini-juegos.
- **Por qué es exitoso:** **50M descargas, dice tener 100M usuarios; app #1 de Health & Fitness iOS mundial en 2022-2023** por descargas E ingresos. Mecanismo: **máquina de conversión** — no ganó por ciencia sino por funnel.
- **Feature estrella:** quiz de personalización multi-etapa profundo (hace sentir el programa "hecho para ti") + streaks/reportes de progreso.
- **Signature de diseño:** paywall obligatorio tras el quiz + recompensa gamificada (descuento sorpresa) al completar la primera sesión. Onboarding = motor de venta.
- **Cómo evita claims:** vende "entrenamiento diario" y hábito, no resultados clínicos; el gancho es el ritual, no la cura.
- **ROBA ESTO:** el quiz de personalización profundo como onboarding que hace sentir el programa a la medida — pero ATP ya tiene el Cuestionario Maestro; conectar ESO al reto para que se sienta prescrito, no genérico.

---

## Dual N-Back — profundización

### Qué hace buena la UX de un N-Back
1. **Adaptativo, no fijo:** subir/bajar de nivel automáticamente según desempeño (umbral Jaeggi 90%/75%) — el usuario nunca queda aburrido ni aplastado.
2. **Feedback inmediato y honesto:** aciertos/errores por modalidad (visual vs auditivo) al instante, sin castigar con drama.
3. **Sesión corta y cerrada:** el protocolo original es ~20 min/día; para app consumer, bloques de 5-15 min con inicio y fin claros.
4. **Baseline personal visible:** progreso del usuario contra sí mismo (nivel N alcanzado en el tiempo), no ranking contra otros.
5. **Curva de entrada suave:** empezar en N=1/N=2; el Dual N-Back es brutalmente difícil al inicio y ahí se pierde a la gente — necesita tutorial y rampa.

### Mejor implementación: Brain Workshop
El estándar de oro por **fidelidad al protocolo Jaeggi** (matches exactos por sesión, umbrales de progresión, Jaeggi mode reproducible). Para ATP: robar el **motor** de Brain Workshop pero vestirlo con el **diseño** de Elevate y la **voz** de ARGOS.

### Evidencia — veredicto honesto (sin exagerar)
- **Near transfer (SÍ):** entrenar N-Back mejora tu N-Back y tareas de memoria de trabajo muy parecidas. Robusto.
- **Far transfer (NO probado):** que suba inteligencia fluida (Gf) o memoria de trabajo generalizada en **adultos sanos** — un RCT comparándolo con processing-speed training concluyó que **no beneficia** WM ni Gf en adultos sanos. Meta-análisis multinivel de estudios n-back: **el asunto sigue sin resolverse**; efectos de transferencia inconsistentes entre estudios y poblaciones.
- **Cambios neurales (SÍ, medibles):** meta-análisis fMRI 2024 confirma que el entrenamiento de WM produce cambios en redes cerebrales — pero cambio neural ≠ mejora funcional de vida.
- **Señal en TDAH (acotada, prometedora):** estudio 2025 (Brain Sciences) — adultos jóvenes con TDAH, Dual N-Back adaptativo ~1 mes (≥18 sesiones) → mejora significativa en WM del WAIS-IV. No generalizable a población sana.

**Cómo debe hablar ATP del N-Back (para no ser Lumosity):** "un reto que mide y entrena tu memoria de trabajo en la propia tarea" — verdadero. NO decir "te hará más inteligente / mejor en el trabajo / prevendrá deterioro" — eso es exactamente lo que multó la FTC.

---

## Lección FTC / claims — para compliance ATP

**El caso:** Lumos Labs (Lumosity) — $2M en redress, juicio de $50M suspendido por finanzas. Cargo: prometer que los juegos mejoraban desempeño en trabajo/escuela/deporte, retrasaban el deterioro cognitivo por edad, y reducían síntomas de Alzheimer, demencia, TDAH, PTSD, Turner, concusiones y stroke — **sin ciencia competente y confiable.**

**Precedente que se repite:** LearningRx pagó $200K después. La FTC declaró un **"uptick"** de acciones contra claims de cognición.

**Reglas que ATP debe grabar (pilar Mente + N-Back + copy ARGOS):**
1. **Nunca prometer un resultado de vida real** (mejor trabajo, más IQ, prevenir demencia). Vende el reto y la métrica en la propia tarea.
2. **Toda afirmación de beneficio necesita ciencia sólida** o no se dice. Si es debatido, se dice que es debatido.
3. **Percepción de usuario ≠ claim clínico** — testimonios están bien encuadrados como experiencia subjetiva.
4. **Encuadre "mental fitness / reto / hábito"**, no "tratamiento / cura / prevención".
5. **Legal + Mariana revisan** cualquier copy de Mente antes de publicar (alinea con doctrina legal-antes-de-firma).

---

## Fuentes
- [FTC — Lumosity $2M settlement (press release)](https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program)
- [FTC — Lumos Labs case file](https://www.ftc.gov/legal-library/browse/cases-proceedings/132-3212-lumos-labs-inc-lumosity-mobile-online-cognitive-game)
- [Science.org — brain game maker fined $2M](https://www.science.org/content/article/brain-game-maker-fined-2-million-lumosity-false-advertising)
- [Lexology — FTC penalizes another brain game app (LearningRx, uptick)](https://www.lexology.com/library/detail.aspx?g=2725775d-5264-48fe-9e87-48c4f64f2fe1)
- [Brain Workshop — sitio oficial (Jaeggi mode)](https://brainworkshop.sourceforge.net/)
- [Brain Workshop — details](http://www.brainworkshop.net/details.html)
- [NCBI PMC12468938 — Dual N-Back + TDAH, WAIS-IV (2025)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12468938/)
- [NCBI PMC4820261 — Dual N-Back vs processing speed en adultos sanos (nulo)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4820261/)
- [Springer — meta-análisis multinivel n-back (sin resolver)](https://link.springer.com/article/10.3758/s13423-016-1217-0)
- [Elevate — App Store](https://apps.apple.com/us/app/elevate-brain-training/id875063456)
- [Lumosity — About](https://www.lumosity.com/en/about/)
- [Peak — expert review (mindtools.io)](https://mindtools.io/programs/peak-brain-training/)
- [NeuroNation — App Store](https://apps.apple.com/us/app/neuronation-brain-training/id821549680)
- [Impulse — App Store](https://apps.apple.com/us/app/impulse-brain-training/id1451295827)
- [Neurosity — best brain training apps 2026 (tested vs science)](https://neurosity.co/guides/best-brain-training-apps-2026)
